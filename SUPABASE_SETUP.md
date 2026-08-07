# Supabase — puesta en marcha de La Bocana × Archic

## Lo que ya tenemos
- Project URL recibido y preparado para `NEXT_PUBLIC_SUPABASE_URL`.
- Clave pública `anon` recibida y compatible con `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Código preparado para cliente navegador/SSR con `@supabase/ssr`.
- Motor crítico de reservas mantiene una clave **secreta solo servidor**.

## Lo único que debes hacer ahora

### 1. Añadir variables de entorno
En local crea `.env.local` (está ignorado por Git). En Vercel: Project → Settings → Environment Variables.

```env
NEXT_PUBLIC_SUPABASE_URL=<tu Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon public>
SUPABASE_SECRET_KEY=<tu sb_secret_... o legacy service_role>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESERVATION_TIMEZONE=Europe/Madrid
```

**No pegues `SUPABASE_SECRET_KEY` en GitHub, código cliente ni variables `NEXT_PUBLIC_*`.**

### 2. Crear la base
Supabase → SQL Editor → New query. Ejecutar en este orden:
1. `supabase/migrations/0001_reservation_system.sql`
2. `supabase/migrations/0002_staff_auth.sql`

### 3. Cargar datos de desarrollo
Solo mientras construimos/probamos:
- ejecutar `supabase/seed.development.sql`

No usar ese seed como datos definitivos de La Bocana. Horarios, aforo y plano deben validarse con el restaurante.

### 4. Crear el primer usuario del admin
Supabase → Authentication → Users → Add user.
Crea el usuario del responsable del sistema. Copia su UUID y ejecuta:

```sql
insert into public.users (id, full_name, role)
values ('UUID_DEL_USUARIO', 'Administrador La Bocana', 'manager');
```

### 5. Probar el motor
SQL Editor → ejecutar `supabase/tests/phase2_smoke.sql`.
Después haremos la prueba de concurrencia real desde la app antes de marcar la Fase 2 como cerrada.

### 6. Vercel
Añadir las mismas variables al proyecto Vercel (Production + Preview, según convenga) y redeploy.
`SUPABASE_SECRET_KEY` debe existir únicamente como variable de servidor.

## Qué NO hacer
- No desactivar RLS para “hacer que funcione”.
- No meter `service_role`/secret en `NEXT_PUBLIC_*`.
- No subir `.env.local` a GitHub.
- No usar el seed QA como plano/horario real del restaurante.

## RLS hardening

Después de `0001_reservation_system.sql` y `0002_staff_auth.sql`, ejecutar:

```text
supabase/migrations/0003_rls_hardening.sql
```

Esta migración:
- activa RLS en todas las tablas públicas existentes;
- revoca acceso directo de `anon`;
- separa permisos de configuración y operación por rol;
- mantiene `reservation_holds` y `rate_limit_events` exclusivamente server-side;
- crea `public.rls_audit`;
- aborta si detecta una tabla pública sin RLS.

Después ejecutar `supabase/tests/rls_audit.sql`.
