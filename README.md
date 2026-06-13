# DandISS

Plataforma SaaS multi-tenant de agendación de citas para barberías y estéticas.
Frontend **Next.js (App Router)** sobre **Supabase** (Postgres + Auth + Storage),
pensado para desplegarse en **Vercel**.

Estética minimalista en blanco y negro. El cliente final reserva **sin cuenta**;
estilistas y dueños acceden con usuario/contraseña.

---

## Qué incluye esta entrega (Fases 2 + inicio de Fase 3)

**Fase 2 — Flujo público del cliente, cableado a Supabase real**

- Home con las barberías **activas** (`/`).
- Página de barbería con info, horarios, redes y estilistas (`/b/<barberia>`).
- Perfil de estilista con **enlace único compartible** y reserva
  (`/b/<barberia>/<estilista>`).
- Reserva en 4 pasos (servicio → fecha → hora → datos) que llama al RPC
  `book_appointment` (el cliente anónimo **no** inserta directo en la tabla).
- **Slots dinámicos**: se calculan desde `stylist_availability` (o, si no hay,
  `business_hours`) menos las citas ya tomadas. La lectura de citas se hace en el
  servidor con la `service_role` para no exponer datos de clientes: al navegador
  solo viajan las horas libres.

**Fase 3 (inicio) — Auth + dashboard del estilista**

- Login con Supabase Auth (`/login`) y cierre de sesión.
- `middleware.ts` protege `/dashboard` (requiere sesión). La autorización fina
  por rol/barbería la aplica **RLS** en la base de datos.
- Agenda diaria del estilista con navegación por fecha (`/dashboard`).
- Marcar citas como **completada / no asistió / cancelada** (update optimista,
  validado por RLS). Enlace directo a WhatsApp del cliente.
- **Mi perfil** (`/dashboard/perfil`): el estilista edita nombre, título y bio;
  sube su **foto** y su **galería de trabajos** a **Supabase Storage**; y gestiona
  sus **redes sociales**. Las imágenes se suben al bucket `media` y se guarda la
  URL pública en la base; el borrado también limpia el archivo en Storage.

**Fase 4 — Dashboard del dueño**

- **Mi barbería** (`/dashboard/barberia`): edita datos públicos (nombre, eslogan,
  descripción, dirección), sube la **portada** a Supabase Storage y configura los
  **horarios de atención** por día.
- **Servicios** (`/dashboard/servicios`): crea, edita, activa/desactiva y borra
  servicios (nombre, precio, duración).
- **Estilistas** (`/dashboard/estilistas`): CRUD del equipo y **alta de
  credenciales de acceso** para cada estilista. Las credenciales se crean con la
  `service_role` en el servidor (`admin.auth.admin.createUser`) y el estilista
  queda vinculado automáticamente; el trigger crea su `profile`.
- **Estadísticas** (`/dashboard/estadisticas`): citas por estado, ingresos,
  servicios más vendidos y ranking de estilistas, con filtro de periodo (7/30/90
  días).
- El header del dashboard muestra estas secciones solo a los dueños.

**Fase 5 (parcial) — Admin de plataforma**

- **Resumen** (`/admin`): métricas globales (barberías por estado, estilistas,
  ingresos de los últimos 30 días) y ranking de barberías por ingresos.
- **Barberías** (`/admin/barberias`): lista todas las barberías de la plataforma
  y permite **activar / suspender / marcar pendiente**. Suspender la oculta del
  catálogo público (RLS solo muestra `status = 'active'`).
- Acceso restringido al rol `platform_admin`; el login redirige al admin a
  `/admin` automáticamente.

> Pendiente (cuando integres pagos): gestión de planes y **suscripciones con
> cobro automático** (p. ej. Mercado Pago o Stripe). El esquema ya guarda
> `plan` y `plan_renews_at`.

### Probar como admin de plataforma

1. Crea un usuario en **Authentication → Users → Add user** (correo + contraseña,
   *Auto Confirm User*).
2. Ejecuta **`crear-admin-demo.sql`** (cambia el correo). Le da rol
   `platform_admin` (sin barbería).
3. Entra en `/login` → serás redirigido a `/admin`.

### Probar como dueño

1. Crea un usuario en **Authentication → Users → Add user** (correo + contraseña,
   *Auto Confirm User*).
2. Ejecuta **`crear-dueno-demo.sql`** (cambia el correo por el que usaste). Le da
   rol `owner` y lo liga a "The Classic Barber".
3. Entra en `/login` → verás las secciones **Servicios** y **Estilistas**. Desde
   ahí puedes crear estilistas y generar sus accesos sin tocar SQL.

---

## Requisitos

- Node.js 18.17+ (recomendado 20+).
- Un proyecto de Supabase con el `schema.sql` ya ejecutado.

---

## Puesta en marcha (local)

1. **Instala dependencias**

   ```bash
   npm install
   ```

2. **Ejecuta el esquema en Supabase**

   En el Dashboard de Supabase → **SQL Editor → New query**, pega el contenido de
   `schema.sql` y ejecútalo una sola vez. Esto crea tablas, RLS, el RPC
   `book_appointment`, el trigger de `profiles` y los datos demo
   ("The Classic Barber" con 4 estilistas y 5 servicios).

   Luego, en otra query, pega y ejecuta **`phase3-setup.sql`**. Esto crea el
   bucket público **`media`** para imágenes, sus políticas de Storage (cada
   estilista gestiona solo su carpeta) y la política para que el estilista
   administre sus redes sociales. Ejecútalo también una sola vez.

   Finalmente ejecuta **`phase4-setup.sql`**, que añade las políticas de Storage
   para que el dueño suba la portada/logo de su barbería (carpeta `shops/`).

   Y ejecuta **`hardening.sql`**, que refuerza el RPC público de reserva con
   validaciones (nombre 2–80, WhatsApp 10–15 dígitos, comentario ≤300), bloqueo
   de horarios pasados y rate-limiting anti-spam (máx. 3 reservas por WhatsApp en
   10 minutos y máx. 5 citas activas próximas). Es `create or replace`: seguro de
   re-ejecutar.

3. **Configura las variables de entorno**

   Copia el ejemplo y rellénalo con los valores de tu proyecto
   (**Project Settings → API**):

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Dónde se usa |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor (RLS protege los datos) |
   | `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor**: cálculo de slots libres y, en fases posteriores, alta de usuarios. **Nunca** se expone al navegador. |
   | `NEXT_PUBLIC_SHOP_TIMEZONE` | zona horaria del negocio (def. `America/Mexico_City`) |
   | `NEXT_PUBLIC_SITE_URL` | (opcional) base para el enlace único compartible |

4. **Arranca**

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>. Con los datos demo verás "The Classic Barber".

### Probar el dashboard

El cliente reserva sin cuenta, pero el dashboard requiere un usuario estilista.
El seed crea estilistas **sin** `user_id`. Para probar:

1. En Supabase → **Authentication → Users → Add user**, crea un usuario con
   correo y contraseña. En **User Metadata** añade:

   ```json
   { "role": "stylist", "barbershop_id": "11111111-1111-1111-1111-111111111111", "full_name": "Juan Pérez" }
   ```

   El trigger `handle_new_user` creará su `profile` automáticamente.

2. Vincula ese usuario a un estilista del seed (SQL Editor):

   ```sql
   update stylists
   set user_id = '<UUID-del-usuario-auth>'
   where slug = 'juan-perez';
   ```

3. Entra en `/login` con esas credenciales → verás `/dashboard` con la agenda.

---

## Despliegue en Vercel

1. Sube el repositorio a GitHub/GitLab.
2. En Vercel → **New Project** → importa el repo (equipo **Pro**; Hobby no permite
   uso comercial).
3. En **Settings → Environment Variables** añade las mismas variables del
   `.env.local` (marca `SUPABASE_SERVICE_ROLE_KEY` como sensible / solo servidor).
4. Deploy. Vercel detecta Next.js automáticamente.

   ```bash
   # alternativamente, desde la CLI:
   npm i -g vercel
   vercel
   vercel --prod
   ```

---

## Arquitectura (resumen)

```
app/
  page.tsx                       Home: barberías activas
  b/[shop]/page.tsx              Barbería: info + estilistas
  b/[shop]/[stylist]/
    page.tsx                     Perfil + monta el flujo de reserva
    actions.ts                   getSlots (service_role) + book_appointment (RPC)
  login/                         Auth (Supabase) con server action
  dashboard/                     Agenda del estilista + marcar estados
  auth/signout/route.ts          Cierre de sesión
components/
  BookingFlow.tsx                Stepper de reserva (client)
  AppointmentCard.tsx            Tarjeta de cita con acciones (client)
  Header.tsx, ui.tsx             UI compartida
lib/
  supabase/                      Clientes browser / server / admin / middleware
  queries.ts                     Lecturas del catálogo público (anon + RLS)
  slots.ts                       Generación de horarios disponibles
  format.ts                      Precio, duración, fechas/horas (zona del negocio)
  types.ts                       Tipos que reflejan schema.sql
middleware.ts                    Refresco de sesión + protección de /dashboard
```

### Decisiones clave

- **Multi-tenant con RLS.** Una sola base; cada tabla lleva `barbershop_id` y las
  políticas de `schema.sql` aíslan a cada barbería. El front confía en RLS: usa la
  clave anon para lecturas públicas y la sesión del usuario para el dashboard.
- **Reserva sin cuenta vía RPC.** `book_appointment` (SECURITY DEFINER) valida,
  calcula la duración automática del servicio y previene traslapes (restricción
  EXCLUDE como red de seguridad).
- **Zonas horarias.** Todo se guarda en `timestamptz` (UTC) y se formatea en la
  zona del negocio (`NEXT_PUBLIC_SHOP_TIMEZONE`) con `date-fns-tz`.

### Riesgos / pendientes técnicos

- **Spam de reservas anónimas:** añadir rate limiting / hCaptcha al RPC.
- **Slots y `service_role`:** hoy se calculan en el servidor leyendo citas con la
  clave de servicio. Alternativa más escalable: un RPC `available_slots`
  (SECURITY DEFINER) que devuelva solo horas libres, sin tocar `service_role`.
- **Costos Supabase:** servir imágenes vía CDN/Vercel y vigilar ancho de banda.
