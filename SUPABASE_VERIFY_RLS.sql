-- La Bocana / Archic — test de seguridad RLS
-- Debe devolver cero filas en la primera consulta y finalizar sin excepción.

select table_name, rls_enabled
from public.rls_audit
where not rls_enabled;

select public.assert_all_public_tables_have_rls();

-- anon no debe recibir privilegios directos sobre las tablas sensibles.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee='anon'
order by table_name, privilege_type;
