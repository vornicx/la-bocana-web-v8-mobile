# La Bocana × Archic — v0.7 · Reservas reales

## Estado
`/admin/reservas` deja de usar mocks y comparte la misma fuente de verdad que `/admin/sala`.

## Incluido
- Snapshot real por fecha desde Supabase.
- Navegación día anterior / siguiente / hoy.
- Filtros por servicio y estado.
- Búsqueda por cliente, teléfono, email, código, UUID o mesa.
- Métricas reales del servicio.
- Deep-link desde Sala a una reserva concreta.
- Refresco periódico del día actual.
- Drawer operativo con cliente, alergias, preferencias, notas e historial.
- Cambio / combinación / desasignación de mesas con validación server-side.
- Transiciones pending → confirmed → seated → completed.
- Cancelación y no-show.
- Creación manual de reservas con disponibilidad real y hold atómico.
- Orígenes: teléfono, recepción/admin, Instagram, Google y otro.
- RPCs de notas y desasignación accesibles solo mediante `service_role`.
- Activity logs en operaciones internas.

## Base de datos
Migración `0006_admin_reservations_real.sql` aplicada al proyecto Supabase remoto.
Smoke test remoto: `ADMIN_RESERVATIONS_V07_DB_OK`.

## QA pendiente
Validar visualmente el build en Vercel y probar el flujo con una reserva real de negocio cuando se decida hacer la prueba operativa completa.
