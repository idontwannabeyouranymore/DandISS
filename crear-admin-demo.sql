-- =====================================================================
-- DandISS — Crear un ADMIN DE PLATAFORMA de prueba
-- =====================================================================
-- 1) Crea el usuario en el panel:
--    Authentication -> Users -> Add user -> Create new user
--    (correo + contraseña, marca "Auto Confirm User"). NO toques metadata.
-- 2) Cambia el correo de abajo por el que usaste y ejecuta este SQL.
--    El admin de plataforma NO pertenece a ninguna barbería (barbershop_id null).
-- =====================================================================

with u as (
  select id from auth.users where email = 'admin@dandiss.com'  -- <-- cambia esto
)
update profiles p
set role = 'platform_admin',
    barbershop_id = null,
    full_name = 'Admin DandISS'
from u
where p.id = u.id;

-- Después entra en /login con ese correo y serás redirigido a /admin.
