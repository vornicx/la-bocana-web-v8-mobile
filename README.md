# La Bocana × Archic

Proyecto de sustitución completa para La Bocana: experiencia pública premium + sistema propio de reservas + área privada operativa.

## Estado actual

### Fase 2 — motor de reservas

Implementado y preparado para conectar a PostgreSQL/Supabase:

- Flujo cliente: personas → fecha → disponibilidad → hora → datos → confirmación.
- Adultos y niños.
- Servicios y reglas de apertura configurables.
- Duraciones configurables por tamaño del grupo.
- Motor de disponibilidad server-side.
- Mesas individuales y combinaciones explícitas.
- Aforo máximo por servicio.
- Cierres generales, por área o por mesa.
- Holds de 5 minutos.
- Protección de concurrencia mediante transacciones + locking en PostgreSQL.
- Confirmación atómica y asignación de mesas.
- CRM base.
- Modificación sin liberar la reserva anterior hasta asegurar el nuevo inventario.
- Cancelación mediante enlace privado tokenizado.
- Lista de espera.
- Activity logs.
- Rate limiting persistente.
- RLS y acceso sensible únicamente server-side.

### Fase 3 — área privada en desarrollo

Ya existe una base operativa responsive para:

- Dashboard.
- Reservas y búsqueda/filtros.
- Ficha completa de reserva.
- Cambio de estado.
- Notas, alergias y preferencias.
- Creación manual de reservas.
- Calendario.
- Clientes / mini CRM.
- Configuración inicial.
- Plano visual de sala.
- Cola de reservas sin mesa.
- Asignación y movimiento entre mesas.
- Combinaciones de mesas con validación de capacidad.
- Restricción a combinaciones físicas permitidas.
- Walk-ins desde el plano.
- Bloqueo/reactivación temporal de mesas.
- Completar visita y liberar mesa.

Los datos del admin y el plano son actualmente de **QA/desarrollo**. La interfaz está construida para poder sustituir esa capa por Supabase sin rediseñar el producto.

## Estructura principal

- `app/reservar` — experiencia pública de reserva.
- `app/reserva/[token]` — gestión privada de una reserva.
- `app/api/reservations/*` — endpoints server-side.
- `app/admin/*` — área privada.
- `components/admin` — componentes operativos del admin.
- `lib/reservations` — servicio y validación.
- `lib/admin` — tipos y datos de desarrollo del admin.
- `lib/security` — huella de petición, tokens y rate limiting.
- `supabase/migrations/0001_reservation_system.sql` — esquema y motor transaccional.
- `supabase/seed.development.sql` — datos solo de QA/desarrollo.

## Checkpoint pendiente: Supabase

Antes de considerar la Fase 2 cerrada o de llevar el admin a producción hay que:

1. Crear/conectar el proyecto Supabase.
2. Ejecutar `supabase/migrations/0001_reservation_system.sql`.
3. Ejecutar opcionalmente `supabase/seed.development.sql` para QA.
4. Configurar `.env.local` desde `.env.example`.
5. Ejecutar `supabase/tests/phase2_smoke.sql`.
6. Validar concurrencia y prevención de dobles reservas.
7. Sustituir las mutaciones locales del admin por operaciones server-side persistentes.
8. Añadir permisos/roles y activity logs a cada mutación del admin.

## Antes de producción

No publicar con los datos de desarrollo. Hay que validar con La Bocana:

- plano y nombres de mesas;
- capacidades mínimas/máximas;
- combinaciones físicas permitidas;
- áreas reales;
- horarios por día y temporada;
- duración por tamaño de grupo;
- aforo operativo de comida/cena;
- antelación mínima y horizonte;
- tamaño máximo aceptado online;
- cierres/eventos conocidos;
- política exacta de cancelación/modificación.

## Principio de producto

La web pública debe ser emocional, fotográfica y editorial. El admin debe ser sobrio, rápido y extremadamente claro. La automatización puede sugerir y asignar, pero el equipo del restaurante conserva el control manual de la sala.


## Supabase
Consulta `SUPABASE_SETUP.md`. El URL/anon se usan como configuración pública con RLS; las operaciones críticas del motor requieren `SUPABASE_SECRET_KEY` exclusivamente en servidor.
