-- =====================================================================
-- DandISS — Fase 3: Supabase Storage + políticas para imágenes y redes
-- =====================================================================
-- Ejecuta este archivo UNA vez en el SQL Editor de Supabase, DESPUÉS de
-- haber corrido schema.sql. Crea el bucket de imágenes, sus políticas de
-- acceso y una política para que cada estilista gestione sus redes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bucket público "media"
--    Estructura de rutas:
--      stylists/<stylist_id>/avatar-<ts>.<ext>   -> foto de perfil
--      gallery/<stylist_id>/<uuid>.<ext>          -> galería de trabajos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Políticas de Storage (sobre storage.objects)
--    Lectura pública; escritura solo del estilista dueño de la carpeta.
-- ---------------------------------------------------------------------

-- Lectura pública de todo el bucket media
drop policy if exists "media lectura publica" on storage.objects;
create policy "media lectura publica" on storage.objects
  for select
  using (bucket_id = 'media');

-- El estilista sube archivos solo dentro de SU carpeta (por stylist_id)
drop policy if exists "media estilista sube" on storage.objects;
create policy "media estilista sube" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] in ('stylists', 'gallery')
    and exists (
      select 1 from public.stylists s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  );

-- El estilista reemplaza (update) archivos de su carpeta
drop policy if exists "media estilista actualiza" on storage.objects;
create policy "media estilista actualiza" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.stylists s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  )
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.stylists s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  );

-- El estilista borra archivos de su carpeta
drop policy if exists "media estilista borra" on storage.objects;
create policy "media estilista borra" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.stylists s
      where s.user_id = auth.uid()
        and s.id::text = (storage.foldername(name))[2]
    )
  );

-- ---------------------------------------------------------------------
-- 3. RLS: el estilista gestiona SUS redes sociales (social_links)
--    El esquema base solo permitía al dueño; aquí habilitamos al estilista
--    sobre las filas cuyo stylist_id es suyo.
-- ---------------------------------------------------------------------
drop policy if exists "estilista gestiona sus redes" on social_links;
create policy "estilista gestiona sus redes" on social_links
  for all
  using (
    exists (
      select 1 from stylists s
      where s.id = stylist_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from stylists s
      where s.id = stylist_id and s.user_id = auth.uid()
    )
  );
