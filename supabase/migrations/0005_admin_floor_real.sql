-- La Bocana × Archic — Sala real / operations
-- Remote production schema already applied on 2026-08-08 through Supabase MCP.
-- This migration records the final intended state for source control and fresh environments.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- If the staff helper functions are still in public on a fresh DB, move them out of the exposed API schema.
do $$
begin
  if to_regprocedure('public.current_staff_role()') is not null then
    execute 'alter function public.current_staff_role() set schema private';
  end if;
  if to_regprocedure('public.is_active_staff()') is not null then
    execute 'alter function public.is_active_staff() set schema private';
  end if;
end $$;

revoke all on function private.current_staff_role() from public, anon;
revoke all on function private.is_active_staff() from public, anon;
grant execute on function private.current_staff_role() to authenticated, service_role;
grant execute on function private.is_active_staff() to authenticated, service_role;

create or replace function public.admin_assign_reservation_tables(
  p_reservation_id uuid,
  p_table_ids uuid[],
  p_actor_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_res public.reservations%rowtype;
  v_capacity integer;
  v_table_count integer;
  v_unique_count integer;
  v_valid_combo boolean;
begin
  if p_table_ids is null or cardinality(p_table_ids) = 0 then
    raise exception 'Selecciona al menos una mesa';
  end if;

  select count(*), count(distinct x) into v_table_count, v_unique_count
  from unnest(p_table_ids) as x;
  if v_table_count <> v_unique_count then
    raise exception 'La selección contiene mesas duplicadas';
  end if;

  select * into v_res
  from public.reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if v_res.status in ('completed','cancelled','no_show') then
    raise exception 'La reserva ya no admite asignación de mesa';
  end if;

  perform id from public.tables
  where id = any(p_table_ids) and active
  order by id
  for update;

  select count(*), coalesce(sum(max_capacity),0)
  into v_table_count, v_capacity
  from public.tables
  where id = any(p_table_ids) and active;

  if v_table_count <> cardinality(p_table_ids) then
    raise exception 'Una de las mesas no existe o está inactiva';
  end if;
  if v_capacity < v_res.party_size then
    raise exception 'Capacidad insuficiente para % comensales', v_res.party_size;
  end if;

  if cardinality(p_table_ids) > 1 then
    select exists (
      select 1
      from public.table_combinations c
      where c.active
        and (
          select array_agg(m.table_id order by m.table_id)
          from public.table_combination_members m
          where m.combination_id = c.id
        ) = (
          select array_agg(x order by x) from unnest(p_table_ids) as x
        )
    ) into v_valid_combo;
    if not v_valid_combo then
      raise exception 'Estas mesas no forman una combinación física permitida';
    end if;
  end if;

  if exists (
    select 1
    from public.reservation_tables rt
    join public.reservations r on r.id = rt.reservation_id
    where rt.table_id = any(p_table_ids)
      and r.id <> p_reservation_id
      and r.status in ('pending','confirmed','seated')
      and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(v_res.starts_at,v_res.ends_at,'[)')
  ) then
    raise exception 'Una de las mesas ya está ocupada durante ese intervalo';
  end if;

  if exists (
    select 1 from public.reservation_holds h
    where h.status = 'active'
      and h.expires_at > now()
      and h.assigned_table_ids && p_table_ids
      and tstzrange(h.starts_at,h.ends_at,'[)') && tstzrange(v_res.starts_at,v_res.ends_at,'[)')
  ) then
    raise exception 'Una de las mesas está temporalmente retenida por otra reserva';
  end if;

  if exists (
    select 1 from public.closures c
    where c.active
      and c.table_id = any(p_table_ids)
      and tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(v_res.starts_at,v_res.ends_at,'[)')
  ) then
    raise exception 'Una de las mesas está bloqueada durante ese intervalo';
  end if;

  delete from public.reservation_tables where reservation_id = p_reservation_id;
  insert into public.reservation_tables(reservation_id,table_id,assigned_by)
  select p_reservation_id,x,p_actor_user_id from unnest(p_table_ids) as x;

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,'floor.assign_tables','reservation',p_reservation_id,
          jsonb_build_object('table_ids',p_table_ids));
  return true;
end;
$$;

revoke all on function public.admin_assign_reservation_tables(uuid,uuid[],uuid) from public, anon, authenticated;
grant execute on function public.admin_assign_reservation_tables(uuid,uuid[],uuid) to service_role;

create or replace function public.admin_transition_reservation(
  p_reservation_id uuid,
  p_status public.reservation_status,
  p_actor_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_old public.reservation_status;
begin
  select status into v_old from public.reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;

  if not (
    (v_old='pending' and p_status in ('confirmed','seated','cancelled','no_show')) or
    (v_old='confirmed' and p_status in ('seated','cancelled','no_show')) or
    (v_old='seated' and p_status='completed') or
    v_old=p_status
  ) then
    raise exception 'Transición no permitida: % → %', v_old, p_status;
  end if;

  update public.reservations
  set status=p_status,
      seated_at=case when p_status='seated' and seated_at is null then now() else seated_at end,
      completed_at=case when p_status='completed' and completed_at is null then now() else completed_at end,
      cancelled_at=case when p_status='cancelled' and cancelled_at is null then now() else cancelled_at end,
      updated_at=now()
  where id=p_reservation_id;

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,'reservation.status','reservation',p_reservation_id,
          jsonb_build_object('from',v_old,'to',p_status));
  return true;
end;
$$;

revoke all on function public.admin_transition_reservation(uuid,public.reservation_status,uuid) from public, anon, authenticated;
grant execute on function public.admin_transition_reservation(uuid,public.reservation_status,uuid) to service_role;

create or replace function public.admin_set_table_block_for_service(
  p_table_id uuid,
  p_service_id uuid,
  p_date date,
  p_blocked boolean,
  p_reason text default 'Bloqueo manual de sala',
  p_actor_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_open time;
  v_close time;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  select min(open_time), max(close_time)
  into v_open, v_close
  from public.availability_rules
  where service_id=p_service_id
    and day_of_week=extract(dow from p_date)::int
    and active;

  if v_open is null or v_close is null then
    raise exception 'El servicio no tiene horario configurado para esa fecha';
  end if;

  v_starts_at := (p_date + v_open) at time zone 'Europe/Madrid';
  v_ends_at := (p_date + v_close) at time zone 'Europe/Madrid';
  perform id from public.tables where id=p_table_id and active for update;
  if not found then raise exception 'Mesa no encontrada'; end if;

  if p_blocked then
    if exists (
      select 1 from public.reservation_tables rt
      join public.reservations r on r.id=rt.reservation_id
      where rt.table_id=p_table_id
        and r.status in ('pending','confirmed','seated')
        and tstzrange(r.starts_at,r.ends_at,'[)') && tstzrange(v_starts_at,v_ends_at,'[)')
    ) then raise exception 'La mesa tiene una reserva durante ese servicio'; end if;

    if exists (
      select 1 from public.reservation_holds h
      where h.status='active' and h.expires_at>now()
        and p_table_id = any(h.assigned_table_ids)
        and tstzrange(h.starts_at,h.ends_at,'[)') && tstzrange(v_starts_at,v_ends_at,'[)')
    ) then raise exception 'La mesa está retenida temporalmente por una reserva'; end if;

    if not exists (
      select 1 from public.closures c
      where c.table_id=p_table_id and c.service_id=p_service_id and c.active
        and tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(v_starts_at,v_ends_at,'[)')
    ) then
      insert into public.closures(service_id,table_id,starts_at,ends_at,reason,active)
      values(p_service_id,p_table_id,v_starts_at,v_ends_at,coalesce(nullif(trim(p_reason),''),'Bloqueo manual de sala'),true);
    end if;
  else
    update public.closures
    set active=false
    where table_id=p_table_id and service_id=p_service_id and active
      and tstzrange(starts_at,ends_at,'[)') && tstzrange(v_starts_at,v_ends_at,'[)');
  end if;

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,case when p_blocked then 'floor.block_table' else 'floor.unblock_table' end,
          'table',p_table_id,jsonb_build_object('service_id',p_service_id,'date',p_date,'reason',p_reason));
  return true;
end;
$$;

revoke all on function public.admin_set_table_block_for_service(uuid,uuid,date,boolean,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_set_table_block_for_service(uuid,uuid,date,boolean,text,uuid) to service_role;

create or replace function public.admin_create_walk_in(
  p_service_id uuid,
  p_table_ids uuid[],
  p_name text,
  p_party_size integer,
  p_duration_minutes integer,
  p_starts_at timestamptz,
  p_actor_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ends_at timestamptz;
  v_code text;
  v_hash text;
begin
  if p_party_size < 1 or p_party_size > 30 then raise exception 'Número de personas inválido'; end if;
  if p_duration_minutes < 30 or p_duration_minutes > 360 then raise exception 'Duración inválida'; end if;
  if not exists(select 1 from public.services where id=p_service_id and active) then raise exception 'Servicio no encontrado'; end if;

  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);
  v_code := 'LB-W-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  v_hash := encode(digest(gen_random_uuid()::text || clock_timestamp()::text,'sha256'),'hex');

  insert into public.reservations(
    id,service_id,reservation_date,starts_at,ends_at,duration_minutes,adults,children,status,source,
    customer_name,confirmation_code,management_token_hash,created_by,seated_at
  ) values (
    v_id,p_service_id,(p_starts_at at time zone 'Europe/Madrid')::date,p_starts_at,v_ends_at,p_duration_minutes,
    p_party_size,0,'seated','walk_in',coalesce(nullif(trim(p_name),''),'Walk-in'),v_code,v_hash,p_actor_user_id,now()
  );

  perform public.admin_assign_reservation_tables(v_id,p_table_ids,p_actor_user_id);

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,'floor.walk_in','reservation',v_id,
          jsonb_build_object('party_size',p_party_size,'table_ids',p_table_ids));
  return v_id;
end;
$$;

revoke all on function public.admin_create_walk_in(uuid,uuid[],text,integer,integer,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.admin_create_walk_in(uuid,uuid[],text,integer,integer,timestamptz,uuid) to service_role;

-- Query-path indexes surfaced by Supabase Performance Advisor.
create index if not exists closures_area_id_idx on public.closures(area_id) where area_id is not null;
create index if not exists closures_service_id_idx on public.closures(service_id) where service_id is not null;
create index if not exists closures_table_id_idx on public.closures(table_id) where table_id is not null;
create index if not exists reservation_holds_area_preference_idx on public.reservation_holds(area_preference_id) where area_preference_id is not null;
create index if not exists reservations_area_preference_idx on public.reservations(area_preference_id) where area_preference_id is not null;
create index if not exists table_combination_members_table_id_idx on public.table_combination_members(table_id);
create index if not exists table_combinations_area_id_idx on public.table_combinations(area_id);
create index if not exists tables_area_id_idx on public.tables(area_id);
create index if not exists waitlist_converted_reservation_idx on public.waitlist(converted_reservation_id) where converted_reservation_id is not null;
create index if not exists waitlist_customer_id_idx on public.waitlist(customer_id) where customer_id is not null;
create index if not exists waitlist_service_id_idx on public.waitlist(service_id) where service_id is not null;

alter policy users_read_self_or_manager on public.users
using ((id = (select auth.uid())) or (private.current_staff_role() = 'manager'::public.staff_role));

notify pgrst, 'reload schema';
