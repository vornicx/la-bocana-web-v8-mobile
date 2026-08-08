# Informe de calidad — La Bocana v0.8

Fecha de cierre técnico: 8 de agosto de 2026.

## Resultado

La v0.8 convierte el prototipo anterior en un producto conectado y demostrable: la web pública, el motor de reservas y las superficies principales del área privada utilizan la misma fuente de verdad en Supabase. La compilación, el tipado, las rutas públicas, la protección del admin, la seguridad HTTP y la concurrencia han sido verificados.

## Revisión realizada

### Dependencias y compilación

- Corregido `typescript@5.9.0`, una versión inexistente, por `5.9.3`.
- Actualizados Next.js y React a versiones corregidas para eliminar vulnerabilidades conocidas.
- Generado `package-lock.json` reproducible.
- Corregida la firma de sincronización de cookies de `@supabase/ssr` en `proxy.ts`.
- Resultado: `npm run typecheck` y `npm run build` correctos; 25 páginas generadas por Next.js.
- Resultado: `npm audit --omit=dev` informa de 0 vulnerabilidades.

### Supabase y seguridad de datos

- Verificadas las seis migraciones remotas y el estado saludable del proyecto.
- Confirmado RLS en todas las tablas públicas expuestas.
- Confirmado que `anon` no tiene privilegios directos sobre tablas públicas.
- Confirmado que las RPC sensibles de reservas, rate limiting y sala solo son ejecutables con la clave de servidor.
- Ejecutado el smoke SQL transaccional con rollback.
- Revisados logs y asesores de seguridad/rendimiento.
- Se mantienen dos avisos informativos intencionales: tablas internas con RLS sin políticas públicas y algunos índices todavía sin uso por falta de tráfico real.
- Pendiente de consola: activar la protección de contraseñas filtradas de Supabase Auth.

### Motor de reservas

- Verificada disponibilidad, bloqueo de cinco minutos, confirmación, modificación, cancelación y lista de espera.
- Eliminada la restricción artificial que obligaba a reservar desde mañana; ahora se ofrece el día actual y el motor aplica la antelación configurada.
- Las fechas iniciales se calculan en servidor con zona `Europe/Madrid`, evitando diferencias por navegador o zona horaria.
- Sanitizados los errores de base de datos: el cliente recibe mensajes operativos y nunca detalles internos de PostgreSQL/Supabase.
- Corregida la clasificación de conflictos normales: una mesa agotada vuelve a responder 409, mientras un fallo real responde 503.
- La prueba de concurrencia ya es autónoma, aísla su rate limit, verifica las mesas asignadas y limpia sus holds.
- Último resultado: 6 intentos simultáneos, 2 aceptados, 4 rechazados, 3 mesas únicas, 0 holds de prueba activos al finalizar.

### Área privada

- Sustituidos dashboard, clientes, calendario y configuración simulados por consultas reales.
- Verificada la carga real de reservas y servicio en el plano de sala.
- Mantenidas las mutaciones server-side para crear reservas, walk-ins, asignar, mover, bloquear y cambiar estados.
- Añadida comprobación de sesión cerca de cada fuente de datos, además del layout protegido.
- `/admin` redirige correctamente al acceso privado cuando no existe sesión.

### Web pública y conversión

- Añadida navegación móvil completa, accesible por teclado y con estado de página activa.
- Unificados header y footer para evitar divergencias entre páginas.
- Integradas cinco fotografías reales entregadas por el cliente en portada, cocina y galería.
- Los dos vídeos no se incluyen en esta versión: pesan 20–21 MB cada uno, son verticales y ralentizarían la experiencia. Se conservan como material para una fase de vídeo optimizado/CDN.
- Añadida página de privacidad por capas y enlace desde el formulario y el footer.
- El texto legal se mantiene explícitamente pendiente de razón social, NIF y correo: no se han inventado datos.
- Añadidos metadatos por página, Open Graph, JSON-LD de restaurante, sitemap, robots y 404 editorial.
- Añadidas cabeceras CSP, anti-clickjacking, `nosniff`, política de referencia y permisos restringidos.

### Prueba HTTP

El smoke test autónomo comprueba:

- 8 rutas públicas;
- 3 rutas de sistema (`admin-login`, robots y sitemap);
- redirección del admin sin sesión;
- 404 personalizada;
- rechazo de entrada inválida;
- cabeceras de seguridad.

Resultado final: `HTTP_SMOKE_OK`.

## Incidencias encontradas y solución

1. Dependencias imposibles o vulnerables: versiones corregidas y lockfile regenerado.
2. Cookies SSR incompatibles: adaptada la API al contrato actual de Supabase.
3. Datos mock en admin: sustituidos por lecturas reales.
4. Posible filtrado de errores SQL: logs internos en servidor y mensajes públicos sanitizados.
5. Reservas del mismo día bloqueadas en interfaz: calendario alineado con las reglas reales.
6. Menú móvil ausente: añadido panel responsive con Escape, ARIA y navegación completa.
7. Privacidad sin enlace ni información: añadida primera y segunda capa; identidad legal marcada para revisión.
8. Seguridad web incompleta: añadidas cabeceras defensivas.
9. SEO técnico mínimo: añadidos metadatos, datos estructurados, sitemap y robots.
10. Prueba de concurrencia dependía de un servidor externo: ahora arranca y se limpia sola.
11. Conflictos de inventario tratados como caída técnica: separados 409 y 503.
12. ZIP anterior con `.env` y `.env.local`: la v0.8 los excluye y añade `.env.example` sin secretos.

## Checkpoint que necesita al propietario

La siguiente revisión ya no es “un detalle pequeño”; define el comportamiento real del restaurante:

1. Validar plano, mesas, capacidades y combinaciones físicas.
2. Validar horarios/temporadas, aforo, duración y antelación.
3. Facilitar razón social, NIF y correo de privacidad.
4. Entregar carta y precios definitivos.
5. Aprobar política de cancelación/modificación y textos de comunicación.
6. Configurar SMTP/SMS y hacer una reserva real completa con el equipo.
7. Activar protección de contraseñas filtradas y rotar la clave secreta usada en entregables anteriores.
8. Revisar visualmente la URL desplegada en móvil y escritorio. El entorno de revisión automatizada no pudo abrir esta aplicación Next.js, aunque build, render HTTP y pruebas funcionales sí finalizaron correctamente.

Hasta completar esos puntos, el sistema debe considerarse una versión de venta/QA conectada, no producción pública definitiva.
