-- La Bocana / Archic — RLS hardening
-- Ejecutar después de 0001_reservation_system.sql y 0002_staff_auth.sql.
-- Objetivo: ninguna tabla operativa del esquema público queda expuesta sin RLS.

-- 1) Activar RLS en TODAS las tablas públicas existentes.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- 1b) Auto-enable RLS para TODAS las futuras tablas creadas en public.
-- Supabase soporta event triggers con el usuario postgres mediante Supautils.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'rls_auto_enable: failed on %: %', cmd.object_identity, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();

-- 2) Privilegios base: nunca dar acceso implícito a anon sobre tablas internas.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- 3) Helpers de autorización.
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid() AND u.active
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

-- 4) Limpiar políticas heredadas y aplicar una matriz explícita por dominio.
-- Usuarios: cada miembro se ve a sí mismo; manager gestiona equipo.
DROP POLICY IF EXISTS users_read_self_or_manager ON public.users;
DROP POLICY IF EXISTS users_manager_write ON public.users;
DROP POLICY IF EXISTS users_manager_insert ON public.users;
DROP POLICY IF EXISTS users_manager_update ON public.users;
DROP POLICY IF EXISTS users_manager_delete ON public.users;
CREATE POLICY users_read_self_or_manager
ON public.users FOR SELECT TO authenticated
USING (id = auth.uid() OR public.current_staff_role() = 'manager');
CREATE POLICY users_manager_insert
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.current_staff_role() = 'manager');
CREATE POLICY users_manager_update
ON public.users FOR UPDATE TO authenticated
USING (public.current_staff_role() = 'manager')
WITH CHECK (public.current_staff_role() = 'manager');
CREATE POLICY users_manager_delete
ON public.users FOR DELETE TO authenticated
USING (public.current_staff_role() = 'manager');

-- Configuración estructural: cualquier staff activo puede leer; solo manager escribe.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'areas','services','availability_rules','reservation_duration_rules',
    'tables','table_combinations','table_combination_members','closures'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_access ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_config_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_config_write ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_config_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_config_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_config_delete ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY staff_config_read ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff())', t
    );
    EXECUTE format(
      'CREATE POLICY staff_config_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_staff_role() = ''manager'')', t
    );
    EXECUTE format(
      'CREATE POLICY staff_config_update ON public.%I FOR UPDATE TO authenticated USING (public.current_staff_role() = ''manager'') WITH CHECK (public.current_staff_role() = ''manager'')', t
    );
    EXECUTE format(
      'CREATE POLICY staff_config_delete ON public.%I FOR DELETE TO authenticated USING (public.current_staff_role() = ''manager'')', t
    );

    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Operativa diaria: manager y host escriben; viewer puede leer; editor no toca reservas.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','reservations','reservation_tables','waitlist'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_access ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_ops_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_ops_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_ops_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_ops_delete ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY staff_ops_read ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff())', t
    );
    EXECUTE format(
      'CREATE POLICY staff_ops_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_staff_role() = ANY (ARRAY[''manager'',''host'']::staff_role[]))', t
    );
    EXECUTE format(
      'CREATE POLICY staff_ops_update ON public.%I FOR UPDATE TO authenticated USING (public.current_staff_role() = ANY (ARRAY[''manager'',''host'']::staff_role[])) WITH CHECK (public.current_staff_role() = ANY (ARRAY[''manager'',''host'']::staff_role[]))', t
    );
    EXECUTE format(
      'CREATE POLICY staff_ops_delete ON public.%I FOR DELETE TO authenticated USING (public.current_staff_role() = ''manager'')', t
    );

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Logs: staff activo puede leer; escrituras solo backend/funciones privilegiadas.
DROP POLICY IF EXISTS staff_access ON public.activity_logs;
DROP POLICY IF EXISTS staff_logs_read ON public.activity_logs;
CREATE POLICY staff_logs_read
ON public.activity_logs FOR SELECT TO authenticated
USING (public.is_active_staff());
GRANT SELECT ON public.activity_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.activity_logs FROM authenticated;

-- Tablas estrictamente internas: ni anon ni authenticated acceden directamente.
REVOKE ALL ON public.reservation_holds FROM anon, authenticated;
REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;

-- Secuencias: activity_logs/rate_limit_events se escriben por backend; no exponer secuencias al cliente.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 5) Auditoría: lista de tablas públicas y estado RLS.
CREATE OR REPLACE VIEW public.rls_audit
WITH (security_invoker = true)
AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

REVOKE ALL ON public.rls_audit FROM PUBLIC, anon;
GRANT SELECT ON public.rls_audit TO authenticated;

-- 6) Guard rail de despliegue: función de test que falla si alguna tabla pública carece de RLS.
CREATE OR REPLACE FUNCTION public.assert_all_public_tables_have_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS_DISABLED_ON: %', missing;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_all_public_tables_have_rls() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_all_public_tables_have_rls() TO service_role;

-- El propio migration debe terminar verificando la invariantes.
SELECT public.assert_all_public_tables_have_rls();
