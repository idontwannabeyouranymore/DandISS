-- =====================================================================
-- DandISS — Endurecimiento del RPC público de reserva
-- =====================================================================
-- Reemplaza book_appointment con validaciones reforzadas y rate-limiting
-- a nivel de base de datos (sin servicios externos). Ejecuta UNA vez en el
-- SQL Editor, después de schema.sql. Es CREATE OR REPLACE: seguro de re-ejecutar.
--
-- Cambios respecto a la versión original:
--  - Valida longitud de nombre (2–80) y comentario (<=300).
--  - Normaliza el WhatsApp a solo dígitos y exige 10–15.
--  - Bloquea reservas en horarios pasados.
--  - Rate-limit: máx. 3 reservas del mismo WhatsApp en 10 minutos.
--  - Tope: máx. 5 citas confirmadas próximas por WhatsApp.
--  - Guarda el WhatsApp normalizado (solo dígitos) para consistencia.
-- =====================================================================

create or replace function book_appointment(
  p_stylist_id   uuid,
  p_service_id   uuid,
  p_starts_at    timestamptz,
  p_client_name  text,
  p_whatsapp     text,
  p_comment      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id   uuid;
  v_duration  int;
  v_ends_at   timestamptz;
  v_new_id    uuid;
  v_name      text;
  v_wa        text;
  v_comment   text;
  v_recent    int;
  v_upcoming  int;
begin
  v_name    := trim(coalesce(p_client_name, ''));
  v_comment := nullif(trim(coalesce(p_comment, '')), '');
  -- WhatsApp normalizado a solo dígitos
  v_wa      := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');

  -- --- Validaciones de entrada ---
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  if char_length(v_wa) < 10 or char_length(v_wa) > 15 then
    raise exception 'WhatsApp inválido: debe tener entre 10 y 15 dígitos';
  end if;

  if v_comment is not null and char_length(v_comment) > 300 then
    raise exception 'El comentario es demasiado largo (máx. 300 caracteres)';
  end if;

  -- No permitir reservar en el pasado
  if p_starts_at < now() then
    raise exception 'No puedes reservar en un horario que ya pasó';
  end if;

  -- --- Servicio/estilista/barbería válidos y activos ---
  select s.barbershop_id, s.duration_minutes
    into v_shop_id, v_duration
  from services s
  join stylists st on st.id = p_stylist_id
  join barbershops b on b.id = s.barbershop_id
  where s.id = p_service_id
    and s.is_active
    and st.is_active
    and st.barbershop_id = s.barbershop_id
    and b.status = 'active';

  if v_shop_id is null then
    raise exception 'Servicio o estilista no disponible';
  end if;

  -- --- Rate-limit: ráfaga de reservas del mismo WhatsApp ---
  select count(*) into v_recent
  from appointments
  where client_whatsapp = v_wa
    and created_at > now() - interval '10 minutes';
  if v_recent >= 3 then
    raise exception 'Demasiadas reservas seguidas. Intenta de nuevo en unos minutos';
  end if;

  -- --- Tope: citas activas próximas por WhatsApp ---
  select count(*) into v_upcoming
  from appointments
  where client_whatsapp = v_wa
    and status = 'confirmed'
    and starts_at > now();
  if v_upcoming >= 5 then
    raise exception 'Tienes demasiadas citas activas. Cancela alguna antes de reservar otra';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  -- La restricción EXCLUDE bloquea traslapes; capturamos el error.
  begin
    insert into appointments (
      barbershop_id, stylist_id, service_id,
      client_name, client_whatsapp, client_comment,
      starts_at, ends_at, status
    ) values (
      v_shop_id, p_stylist_id, p_service_id,
      v_name, v_wa, v_comment,
      p_starts_at, v_ends_at, 'confirmed'
    )
    returning id into v_new_id;
  exception when exclusion_violation then
    raise exception 'Ese horario ya fue reservado, elige otro';
  end;

  return v_new_id;
end;
$$;

-- Re-asegura los permisos de ejecución (CREATE OR REPLACE los conserva,
-- pero lo dejamos explícito).
grant execute on function book_appointment(uuid, uuid, timestamptz, text, text, text)
  to anon, authenticated;
