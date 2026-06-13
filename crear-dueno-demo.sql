-- =====================================================================
-- DandISS — Crear un DUEÑO de prueba para "The Classic Barber"
-- =====================================================================
-- 1) Primero crea el usuario en el panel:
--    Authentication -> Users -> Add user -> Create new user
--    (correo + contraseña, marca "Auto Confirm User"). NO toques metadata.
-- 2) Luego cambia el correo de abajo por el que usaste y ejecuta este SQL
--    en SQL Editor. Asigna rol de dueño, lo liga a la barbería demo y lo
--    marca como owner_id de la barbería.
-- =====================================================================

with u as (
  select id from auth.users where email = 'dueno@dandiss.com'  -- <-- cambia esto
)
update profiles p
set role = 'owner',
    barbershop_id = '11111111-1111-1111-1111-111111111111',
    full_name = 'Dueño Demo'
from u
where p.id = u.id;

update barbershops
set owner_id = (select id from auth.users where email = 'dueno@dandiss.com')  -- <-- cambia esto
where id = '11111111-1111-1111-1111-111111111111';

-- Después entra en /login con ese correo y verás Servicios y Estilistas.
