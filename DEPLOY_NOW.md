# La Bocana × Archic — despliegue de prueba

## Rutas incluidas
- `/` — web pública premium
- `/cocina`
- `/la-casa`
- `/galeria`
- `/carta`
- `/contacto`
- `/reservar` — flujo de reservas con calendario propio
- `/reserva/[token]` — gestión de reserva
- `/admin` — área privada
- `/admin/reservas`
- `/admin/calendario`
- `/admin/sala`
- `/admin/clientes`
- `/admin/configuracion`

## Supabase
Las variables están incluidas en `.env` y `.env.local` para esta copia privada de prueba.
En Vercel se recomienda mantener las mismas variables en Project Settings → Environment Variables.

Para activar el motor PostgreSQL completo, ejecutar una vez `SUPABASE_BOOTSTRAP.sql` en Supabase SQL Editor.
El código tiene un rate limit local temporal únicamente cuando PostgREST devuelve PGRST202 porque `consume_rate_limit` aún no existe. Producción debe usar la función PostgreSQL.

Si acabas de crear/reemplazar funciones y PostgREST no las detecta, el bootstrap termina con `NOTIFY pgrst, 'reload schema';`.
