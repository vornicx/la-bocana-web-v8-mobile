# Primer acceso al admin

El admin está protegido con Supabase Auth. No hay signup público.

1. En Supabase → Authentication → Users, crea el primer usuario con email y contraseña.
2. Copia su UUID.
3. Añádelo a `public.users` como `manager`:

```sql
insert into public.users (id, full_name, role, active)
values ('UUID_DEL_USUARIO', 'Administrador La Bocana', 'manager', true)
on conflict (id) do update
set full_name = excluded.full_name, role = excluded.role, active = true, updated_at = now();
```

Después entra en `/admin-login`.

Si estás trabajando con ChatGPT conectado a este Supabase, basta con crear el usuario Auth y pedirle que lo convierta en manager; no hace falta ejecutar el SQL manualmente.
