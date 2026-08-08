# La Bocana × Archic — Sala real (v0.6)

## Estado

La Sala ya no usa `lib/admin/mock-data.ts`. Lee y opera contra Supabase real.

### Datos en vivo
- Mesas y posiciones: `tables` + `areas`
- Servicios y horarios: `services` + `availability_rules`
- Reservas: `reservations`
- Asignaciones: `reservation_tables`
- Bloqueos: `closures`
- Combinaciones: `table_combinations` + `table_combination_members`
- Historial básico: `reservations.customer_id`

### Operaciones persistentes
- Asignar / mover una reserva entre mesas.
- Combinar mesas únicamente cuando existe una combinación física configurada.
- Confirmar reserva.
- Sentar mesa.
- Completar y liberar.
- Bloquear / reactivar mesa por servicio.
- Crear walk-in real, sentado y con mesa asignada.

Las operaciones críticas se ejecutan mediante RPC `SECURITY DEFINER` revocadas para `anon` y `authenticated`; solo `service_role` puede invocarlas. Los endpoints Next.js verifican primero sesión Supabase Auth y rol de staff.

## Acceso al admin

`/admin` está protegido. El usuario debe existir en Supabase Auth **y** tener una fila activa en `public.users`.

Roles:
- `manager`: operación + administración.
- `host`: operación de sala.
- `editor`: lectura de sala; pensado para contenidos.
- `viewer`: solo consulta.

No se habilita signup público desde `/admin-login`.

## Importante: datos QA

La distribución actual (T01–T08), capacidades, combinación T03+T04 y horarios son datos de QA/desarrollo. No se consideran datos reales de La Bocana hasta validarlos con el restaurante.

## Validación remota realizada

- RLS: 0 tablas públicas sin RLS.
- `FLOOR_OPS_OK`: walk-in → completar → bloquear → reactivar, dentro de una transacción con rollback.
- `FLOOR_COMBINATION_OK`: combinación T03+T04 validada dentro de una transacción con rollback.
- RPC de Sala: `anon=false`, `authenticated=false`, `service_role=true`.
- Supabase Security Advisor: sin WARN después de mover helpers de staff al esquema `private`; quedan solo INFO intencionales para tablas backend-only sin políticas de usuario.

## Pendiente para cerrar Sala con datos reales del restaurante

Validar físicamente con La Bocana: zonas, número de mesas, capacidades, formas, posiciones, combinaciones permitidas, horarios, duración y aforo por servicio.
