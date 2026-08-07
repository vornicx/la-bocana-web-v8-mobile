# La Bocana × Archic — Fase 3.4

## Añadido
- Precision pass visual del admin.
- Supabase SSR/browser client preparado.
- Compatibilidad con anon/publishable key pública.
- Secret key mantenida solo server-side para motor crítico.
- Migración `0002_staff_auth.sql` con usuarios, roles y RLS.
- Guía `SUPABASE_SETUP.md`.

## Pendiente antes de producción
- Añadir `SUPABASE_SECRET_KEY` al entorno seguro.
- Ejecutar migraciones 0001 y 0002.
- Seed de desarrollo.
- Crear primer usuario `manager`.
- Smoke tests y prueba real de concurrencia.
- Sustituir plano/aforo/horarios QA por datos reales de La Bocana.
