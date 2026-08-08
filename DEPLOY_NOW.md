# Deploy La Bocana × Archic v0.6

## Vercel

Este ZIP está preparado con `package.json` en la raíz.

- Framework: Next.js
- Root Directory: `./`
- Build Command: default (`next build`)
- Output Directory: default

Variables requeridas en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL=https://labocana.vercel.app`
- `RESERVATION_TIMEZONE=Europe/Madrid`

El `.env` privado se incluye por petición del propietario para pruebas, pero el despliegue de Vercel debe usar Environment Variables.

## Supabase

El esquema remoto del proyecto `La bocana` ya está actualizado. No hace falta volver a ejecutar las migraciones para este despliegue.

## Primer acceso a /admin

El admin ahora está protegido. Consulta `ADMIN_ACCESS.md`.

## Sala v0.6

`/admin/sala` usa datos reales de Supabase y las acciones persisten. Las mesas/horarios/capacidades actuales siguen siendo QA hasta validar la operativa física de La Bocana.
