# La Bocana × Archic — Fase 3 (en progreso)

## Construido sin Supabase
- Shell `/admin` responsive.
- Dashboard operativo.
- Reservas con búsqueda y filtros por servicio/estado.
- Resumen operativo de comensales, pendientes, sentados y reservas sin mesa.
- Ficha lateral / bottom sheet de reserva con información priorizada para sala.
- Cambio local de estado: pendiente → confirmada → sentada → completada.
- Marcado local de no-show y cancelación con confirmación.
- Asignación/reasignación local de mesa, zona y duración.
- Notas internas privadas, alergias, preferencias e historial visible.
- Alta manual de reservas para teléfono, recepción, walk-in o admin.
- Calendario semanal de capacidad.
- Plano visual de mesas con inspector.
- Mini CRM de clientes.
- Configuración con checkpoints pendientes.
- Capa de datos mock separada en `lib/admin/` para sustituirla por repositorio Supabase.

## Pendiente antes de considerar Fase 2 cerrada / producción
- Conectar proyecto Supabase.
- Ejecutar migración de reservas.
- Sustituir seed QA por horarios, mesas, aforo y combinaciones reales.
- Ejecutar smoke tests.
- Probar concurrencia real y doble reserva.

## Pendiente de Fase 3
- Supabase Auth.
- Roles/permissions reales.
- Persistencia CRUD de reservas en PostgreSQL.
- Drag & drop persistente en plano de mesas.
- Lista de espera editable y asignación desde huecos liberados.
- Activity logs visibles.
- Disponibilidad editable.
- Validación real de conflictos de mesa desde el admin.

## QA actual
- Sintaxis TypeScript/TSX validada con el compilador de TypeScript.
- Imports internos validados.
- `next build` pendiente de entorno con dependencias npm disponibles; el registro de paquetes del entorno actual no contiene `@supabase/supabase-js`.

## Floor operations pass

Implemented in `/admin/sala`:

- Lunch / dinner service switcher and live service status.
- Operational metrics: seated covers, free seats, unassigned reservations and next arrival.
- Queue for reservations that still require a table.
- Interactive table inspector with reservation context, preferences and allergy visibility.
- Seat confirmed reservations directly from the floor.
- Complete visits and release the occupied table(s).
- Assignment mode that keeps the original table protected until the replacement is confirmed.
- Multi-table assignment with capacity validation.
- Physical combination restrictions using QA combinations, ready to map to `table_combinations` in Supabase.
- Walk-in creation directly from a free table.
- Temporary table blocking / reactivation.
- Responsive mobile floor operation UI.
- Explicit QA disclaimer: floor geometry, capacities and combinations are placeholders until validated with La Bocana.

### Pending backend hookup

All floor mutations currently use the development data adapter/local client state. When Supabase is connected these actions must call the server-side reservation/table operations and activity logging rather than mutate client state directly.
