# La Bocana × Archic

Web pública editorial, motor propio de reservas y área privada de operaciones para La Bocana, Puerto Banús.

## Estado: v0.8

La aplicación ya trabaja contra el proyecto real de Supabase y está preparada para una revisión de negocio. No utiliza datos simulados en las superficies operativas principales.

Incluye:

- web pública responsive: inicio, cocina, historia, galería, carta, contacto y privacidad;
- reserva en tiempo real con adultos/niños, calendario, disponibilidad, bloqueo temporal, confirmación, modificación, cancelación y lista de espera;
- protección frente a dobles reservas mediante transacciones, advisory locks y asignación atómica de mesas;
- acceso privado de equipo con roles;
- dashboard, reservas, clientes, calendario, configuración y plano de sala conectados a Supabase;
- creación manual, walk-ins, asignación/movimiento de mesas, bloqueos y cambios de estado;
- RLS, RPC sensibles restringidas a servidor, rate limiting persistente y cabeceras HTTP de seguridad;
- SEO técnico con metadatos, datos estructurados, `robots.txt`, sitemap y página 404 propia.

## Desarrollo

Requiere Node.js 20.9 o superior.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Nunca expongas `SUPABASE_SECRET_KEY` en el navegador ni la incluyas en un ZIP. El proyecto solo la usa en módulos `server-only`.

## Verificación

```bash
npm run typecheck
npm run build
npm run test:http
npm run test:concurrency
npm audit --omit=dev
```

`test:http` arranca la web por sí solo y comprueba rutas públicas, acceso privado, 404, validación y cabeceras. `test:concurrency` arranca la web si hace falta, dispara intentos simultáneos contra Supabase, verifica que ninguna mesa se duplica y libera todos los bloqueos de prueba.

## Estructura

- `app/` — páginas y endpoints Next.js.
- `components/` — navegación pública y componentes operativos.
- `lib/reservations/` — servicio, contratos y validación de reservas.
- `lib/admin/` — autenticación y lectura operativa real.
- `lib/security/` — huella de petición, tokens y rate limiting.
- `supabase/migrations/` — esquema, autenticación, RLS y operaciones de sala/reservas.
- `scripts/` — smoke test HTTP y prueba de concurrencia.
- `QUALITY_REPORT_V08.md` — auditoría, incidencias corregidas y checkpoint pendiente.

## Lo que debe validar La Bocana antes de producción

- razón social, NIF y correo de privacidad;
- plano, nombres, capacidades y combinaciones de mesas;
- horarios, cierres, duración, aforos y antelación mínima;
- carta y precios definitivos;
- política exacta de cancelación/modificación;
- remitente, plantillas y proveedor de email/SMS;
- dominio final y una reserva real completa con el equipo.

Consulta `SUPABASE_SETUP.md` para configuración técnica y `QUALITY_REPORT_V08.md` para el estado exacto de calidad.
