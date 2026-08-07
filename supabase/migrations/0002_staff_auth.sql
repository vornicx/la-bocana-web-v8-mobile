-- La Bocana / Archic — Fase 3: identidad de equipo y permisos base
-- Ejecutar DESPUÉS de 0001_reservation_system.sql.

DO $$ BEGIN
  create type staff_role as enum ('manager','host','editor','viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role staff_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.users u where u.id = auth.uid() and u.active);
$$;

create or replace function public.has_staff_role(p_roles staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.users u where u.id = auth.uid() and u.active and u.role = any(p_roles));
$$;

revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.has_staff_role(staff_role[]) from public, anon;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.has_staff_role(staff_role[]) to authenticated;

drop policy if exists users_read_self_or_manager on public.users;
create policy users_read_self_or_manager on public.users for select to authenticated
using (id = auth.uid() or public.has_staff_role(array['manager']::staff_role[]));

drop policy if exists users_manager_write on public.users;
create policy users_manager_write on public.users for all to authenticated
using (public.has_staff_role(array['manager']::staff_role[]))
with check (public.has_staff_role(array['manager']::staff_role[]));

-- El área privada accede como usuario autenticado y RLS decide qué puede hacer.
-- El anon NO recibe acceso directo a estas tablas.
DO $$
declare t text;
begin
  foreach t in array array['areas','services','availability_rules','reservation_duration_rules','tables','table_combinations','table_combination_members','customers','reservations','reservation_tables','closures','waitlist','activity_logs'] loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('drop policy if exists staff_access on public.%I', t);
    execute format('create policy staff_access on public.%I for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff())', t);
  end loop;
end $$;

-- Holds y rate limiting siguen siendo internos del motor server-side.
revoke all on table public.reservation_holds from anon, authenticated;
revoke all on table public.rate_limit_events from anon, authenticated;

-- Configuración sensible: solo manager puede escribir. Host puede leer para operar.
DO $$
declare t text;
begin
  foreach t in array array['areas','services','availability_rules','reservation_duration_rules','tables','table_combinations','table_combination_members','closures'] loop
    execute format('drop policy if exists staff_access on public.%I', t);
    execute format('drop policy if exists staff_config_read on public.%I', t);
    execute format('drop policy if exists staff_config_write on public.%I', t);
    execute format('create policy staff_config_read on public.%I for select to authenticated using (public.is_active_staff())', t);
    execute format('create policy staff_config_write on public.%I for all to authenticated using (public.has_staff_role(array[''manager'']::staff_role[])) with check (public.has_staff_role(array[''manager'']::staff_role[]))', t);
  end loop;
end $$;
