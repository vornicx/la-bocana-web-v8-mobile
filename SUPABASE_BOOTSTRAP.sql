-- La Bocana / Archic — SUPABASE BOOTSTRAP (schema + auth + RLS hardening)
-- No incluye seed de datos de QA.

-- La Bocana / Archic — Fase 2: motor de reservas
-- PostgreSQL / Supabase. Zona horaria operativa: Europe/Madrid.

create extension if not exists pgcrypto;

DO $$ BEGIN
  create type reservation_status as enum ('pending','confirmed','seated','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  create type reservation_source as enum ('website','phone','walk_in','admin','instagram','google','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  create type hold_status as enum ('active','consumed','expired','released');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  create type waitlist_status as enum ('waiting','offered','converted','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  auto_confirm boolean not null default true,
  default_duration_minutes integer not null default 105 check (default_duration_minutes between 30 and 360),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (5,10,15,20,30,60)),
  max_covers integer check (max_covers is null or max_covers > 0),
  min_notice_minutes integer not null default 60 check (min_notice_minutes >= 0),
  booking_horizon_days integer not null default 90 check (booking_horizon_days between 1 and 730),
  min_party_size integer not null default 1 check (min_party_size > 0),
  max_party_size integer not null default 12 check (max_party_size >= min_party_size),
  active boolean not null default true,
  check (close_time > open_time),
  unique(service_id, day_of_week, open_time, close_time)
);

create table if not exists reservation_duration_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  min_party_size integer not null check (min_party_size > 0),
  max_party_size integer not null check (max_party_size >= min_party_size),
  duration_minutes integer not null check (duration_minutes between 30 and 360),
  unique(service_id, min_party_size, max_party_size)
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id),
  name text not null unique,
  min_capacity integer not null default 1 check (min_capacity > 0),
  max_capacity integer not null check (max_capacity >= min_capacity),
  active boolean not null default true,
  position_x numeric(7,3),
  position_y numeric(7,3),
  shape text not null default 'round' check (shape in ('round','square','rectangle','oval')),
  created_at timestamptz not null default now()
);

create table if not exists table_combinations (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id),
  name text not null unique,
  min_capacity integer not null check (min_capacity > 0),
  max_capacity integer not null check (max_capacity >= min_capacity),
  active boolean not null default true
);

create table if not exists table_combination_members (
  combination_id uuid not null references table_combinations(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  primary key (combination_id, table_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  preferences text,
  allergies text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists customers_email_idx on customers(lower(email)) where email is not null;
create index if not exists customers_phone_idx on customers(phone) where phone is not null;

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  service_id uuid not null references services(id),
  reservation_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 30 and 360),
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  party_size integer generated always as (adults + children) stored,
  status reservation_status not null default 'pending',
  source reservation_source not null default 'website',
  customer_name text not null,
  customer_email text,
  customer_phone text,
  allergies text,
  preferences text,
  notes text,
  internal_notes text,
  area_preference_id uuid references areas(id),
  confirmation_code text not null unique,
  management_token_hash text not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz,
  check (ends_at > starts_at)
);
create index if not exists reservations_service_interval_idx on reservations(service_id, starts_at, ends_at);
create index if not exists reservations_customer_idx on reservations(customer_id, created_at desc);
create index if not exists reservations_date_status_idx on reservations(reservation_date, status);

create table if not exists reservation_tables (
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id uuid not null references tables(id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid,
  primary key (reservation_id, table_id)
);
create index if not exists reservation_tables_table_idx on reservation_tables(table_id, reservation_id);

create table if not exists reservation_holds (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null,
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  party_size integer generated always as (adults + children) stored,
  area_preference_id uuid references areas(id),
  assigned_table_ids uuid[] not null,
  session_id text not null,
  status hold_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (cardinality(assigned_table_ids) > 0)
);
create index if not exists reservation_holds_active_idx on reservation_holds(service_id, starts_at, ends_at, expires_at) where status = 'active';
create index if not exists reservation_holds_session_idx on reservation_holds(session_id, status);

create table if not exists closures (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  area_id uuid references areas(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (not (area_id is not null and table_id is not null))
);
create index if not exists closures_interval_idx on closures(starts_at, ends_at) where active = true;

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  service_id uuid references services(id),
  desired_date date not null,
  adults integer not null check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  party_size integer generated always as (adults + children) stored,
  preferred_time time,
  flexible_from time,
  flexible_to time,
  status waitlist_status not null default 'waiting',
  offered_at timestamptz,
  offer_expires_at timestamptz,
  converted_reservation_id uuid references reservations(id),
  created_at timestamptz not null default now()
);
create index if not exists waitlist_match_idx on waitlist(desired_date, service_id, status, party_size);

create table if not exists activity_logs (
  id bigserial primary key,
  actor_type text not null check (actor_type in ('customer','staff','system')),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_entity_idx on activity_logs(entity_type, entity_id, created_at desc);

create table if not exists rate_limit_events (
  id bigserial primary key,
  key_hash text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_lookup_idx on rate_limit_events(key_hash, action, created_at desc);

-- Duración efectiva según servicio + tamaño del grupo.
create or replace function effective_duration_minutes(p_service_id uuid, p_party_size integer)
returns integer language sql stable as $$
  select coalesce(
    (select d.duration_minutes
       from reservation_duration_rules d
      where d.service_id = p_service_id
        and p_party_size between d.min_party_size and d.max_party_size
      order by d.min_party_size desc
      limit 1),
    (select s.default_duration_minutes from services s where s.id = p_service_id)
  );
$$;

-- Comprueba que un conjunto concreto de mesas no tenga reservas, holds o cierres solapados.
create or replace function tables_are_free(
  p_table_ids uuid[],
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_reservation_id uuid default null,
  p_exclude_hold_id uuid default null
) returns boolean language sql stable as $$
  select
    not exists (
      select 1
      from reservation_tables rt
      join reservations r on r.id = rt.reservation_id
      where rt.table_id = any(p_table_ids)
        and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
        and r.status in ('pending','confirmed','seated')
        and r.starts_at < p_end and r.ends_at > p_start
    )
    and not exists (
      select 1 from reservation_holds h
      where h.status = 'active' and h.expires_at > now()
        and (p_exclude_hold_id is null or h.id <> p_exclude_hold_id)
        and h.assigned_table_ids && p_table_ids
        and h.starts_at < p_end and h.ends_at > p_start
    )
    and not exists (
      select 1 from closures c
      where c.active
        and c.starts_at < p_end and c.ends_at > p_start
        and (
          c.table_id = any(p_table_ids)
          or (c.area_id is not null and exists(select 1 from tables t where t.id = any(p_table_ids) and t.area_id = c.area_id))
        )
    );
$$;

-- Elige primero la mesa con menor desperdicio y luego combinaciones explícitamente permitidas.
create or replace function find_table_allocation(
  p_start timestamptz,
  p_end timestamptz,
  p_party_size integer,
  p_area_preference_id uuid default null,
  p_exclude_reservation_id uuid default null,
  p_exclude_hold_id uuid default null
) returns uuid[] language plpgsql stable as $$
declare
  v_ids uuid[];
begin
  select array[t.id] into v_ids
  from tables t
  where t.active
    and p_party_size between t.min_capacity and t.max_capacity
    and tables_are_free(array[t.id], p_start, p_end, p_exclude_reservation_id, p_exclude_hold_id)
  order by (case when p_area_preference_id is not null and t.area_id = p_area_preference_id then 0 else 1 end),
           (t.max_capacity - p_party_size), t.name
  limit 1;
  if v_ids is not null then return v_ids; end if;

  with candidates as (
    select c.id, c.area_id, c.max_capacity,
           array_agg(m.table_id order by t.name) as table_ids
    from table_combinations c
    join table_combination_members m on m.combination_id = c.id
    join tables t on t.id = m.table_id and t.active
    where c.active and p_party_size between c.min_capacity and c.max_capacity
    group by c.id, c.area_id, c.max_capacity
  )
  select table_ids into v_ids
  from candidates c
  where tables_are_free(c.table_ids, p_start, p_end, p_exclude_reservation_id, p_exclude_hold_id)
  order by (case when p_area_preference_id is not null and c.area_id = p_area_preference_id then 0 else 1 end),
           (c.max_capacity - p_party_size)
  limit 1;
  return v_ids;
end;
$$;

create or replace function covers_are_available(
  p_service_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_party_size integer,
  p_max_covers integer,
  p_exclude_reservation_id uuid default null,
  p_exclude_hold_id uuid default null
) returns boolean language sql stable as $$
  select p_max_covers is null or (
    coalesce((select sum(r.party_size) from reservations r
      where r.service_id = p_service_id
        and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
        and r.status in ('pending','confirmed','seated')
        and r.starts_at < p_end and r.ends_at > p_start), 0)
    + coalesce((select sum(h.party_size) from reservation_holds h
      where h.service_id = p_service_id
        and h.status = 'active' and h.expires_at > now()
        and (p_exclude_hold_id is null or h.id <> p_exclude_hold_id)
        and h.starts_at < p_end and h.ends_at > p_start), 0)
    + p_party_size
  ) <= p_max_covers;
$$;

-- Disponibilidad de lectura. La garantía definitiva ocurre al crear el hold.
create or replace function get_available_slots(
  p_date date,
  p_adults integer,
  p_children integer default 0,
  p_area_preference_id uuid default null
) returns table(
  service_id uuid,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer
) language plpgsql stable as $$
declare
  v_party integer := p_adults + p_children;
  v_rule availability_rules%rowtype;
  v_service services%rowtype;
  v_local timestamp;
  v_start timestamptz;
  v_end timestamptz;
  v_duration integer;
  v_allocation uuid[];
  v_zone text := 'Europe/Madrid';
begin
  if p_adults < 1 or p_children < 0 then return; end if;

  for v_rule in
    select ar.* from availability_rules ar
    where ar.active and ar.day_of_week = extract(dow from p_date)::int
    order by ar.open_time
  loop
    select * into v_service from services s where s.id = v_rule.service_id and s.active;
    if not found then continue; end if;
    if v_party < v_rule.min_party_size or v_party > v_rule.max_party_size then continue; end if;
    if p_date > ((now() at time zone v_zone)::date + v_rule.booking_horizon_days) then continue; end if;

    v_duration := effective_duration_minutes(v_rule.service_id, v_party);
    if v_duration is null then continue; end if;

    for v_local in
      select generate_series(
        (p_date + v_rule.open_time)::timestamp,
        (p_date + v_rule.close_time)::timestamp - make_interval(mins => v_duration),
        make_interval(mins => v_rule.slot_interval_minutes)
      )
    loop
      v_start := v_local at time zone v_zone;
      v_end := v_start + make_interval(mins => v_duration);
      if v_start < now() + make_interval(mins => v_rule.min_notice_minutes) then continue; end if;

      if exists(select 1 from closures c where c.active
        and (c.service_id is null or c.service_id = v_rule.service_id)
        and c.area_id is null and c.table_id is null
        and c.starts_at < v_end and c.ends_at > v_start) then continue; end if;

      if not covers_are_available(v_rule.service_id, v_start, v_end, v_party, v_rule.max_covers) then continue; end if;
      v_allocation := find_table_allocation(v_start, v_end, v_party, p_area_preference_id);
      if v_allocation is null then continue; end if;

      service_id := v_service.id; service_name := v_service.name;
      starts_at := v_start; ends_at := v_end; duration_minutes := v_duration;
      return next;
    end loop;
  end loop;
end;
$$;

-- Hold atómico. Serializamos por servicio + fecha local para impedir carreras entre slots solapados.
create or replace function create_reservation_hold_atomic(
  p_service_id uuid,
  p_starts_at timestamptz,
  p_adults integer,
  p_children integer,
  p_session_id text,
  p_area_preference_id uuid default null,
  p_exclude_reservation_id uuid default null
) returns table(hold_id uuid, expires_at timestamptz, starts_at timestamptz, ends_at timestamptz, assigned_table_ids uuid[])
language plpgsql as $$
declare
  v_party integer := p_adults + p_children;
  v_rule availability_rules%rowtype;
  v_local timestamp;
  v_local_time time;
  v_local_date date;
  v_duration integer;
  v_end timestamptz;
  v_ids uuid[];
  v_hold reservation_holds%rowtype;
  v_zone text := 'Europe/Madrid';
  v_offset_seconds integer;
begin
  if p_adults < 1 or p_children < 0 or v_party < 1 then raise exception 'INVALID_PARTY_SIZE'; end if;
  v_local := p_starts_at at time zone v_zone;
  v_local_date := v_local::date; v_local_time := v_local::time;

  perform pg_advisory_xact_lock(hashtextextended('reservation-inventory:' || v_local_date::text, 0));
  update reservation_holds set status = 'expired' where status = 'active' and expires_at <= now();
  update reservation_holds set status = 'released' where session_id = p_session_id and status = 'active';

  select ar.* into v_rule from availability_rules ar
   where ar.service_id = p_service_id and ar.active
     and ar.day_of_week = extract(dow from v_local_date)::int
     and v_local_time >= ar.open_time and v_local_time < ar.close_time
   order by ar.open_time limit 1;
  if not found then raise exception 'SERVICE_NOT_AVAILABLE'; end if;
  if v_party < v_rule.min_party_size or v_party > v_rule.max_party_size then raise exception 'PARTY_SIZE_NOT_ALLOWED'; end if;
  if p_starts_at < now() + make_interval(mins => v_rule.min_notice_minutes) then raise exception 'MINIMUM_NOTICE'; end if;
  if v_local_date > ((now() at time zone v_zone)::date + v_rule.booking_horizon_days) then raise exception 'OUTSIDE_BOOKING_HORIZON'; end if;

  v_offset_seconds := extract(epoch from (v_local_time - v_rule.open_time))::int;
  if v_offset_seconds < 0 or mod(v_offset_seconds, v_rule.slot_interval_minutes * 60) <> 0 then raise exception 'INVALID_SLOT'; end if;

  v_duration := effective_duration_minutes(p_service_id, v_party);
  v_end := p_starts_at + make_interval(mins => v_duration);
  if (v_end at time zone v_zone)::time > v_rule.close_time then raise exception 'SERVICE_END_EXCEEDED'; end if;

  if exists(select 1 from closures c where c.active
    and (c.service_id is null or c.service_id = p_service_id)
    and c.area_id is null and c.table_id is null
    and c.starts_at < v_end and c.ends_at > p_starts_at) then raise exception 'CLOSED'; end if;

  if not covers_are_available(p_service_id, p_starts_at, v_end, v_party, v_rule.max_covers, p_exclude_reservation_id, null) then
    raise exception 'CAPACITY_FULL';
  end if;

  v_ids := find_table_allocation(p_starts_at, v_end, v_party, p_area_preference_id, p_exclude_reservation_id, null);
  if v_ids is null then raise exception 'NO_TABLE_ALLOCATION'; end if;

  insert into reservation_holds(service_id, starts_at, ends_at, duration_minutes, adults, children, area_preference_id, assigned_table_ids, session_id, expires_at)
  values(p_service_id, p_starts_at, v_end, v_duration, p_adults, p_children, p_area_preference_id, v_ids, p_session_id, now() + interval '5 minutes')
  returning * into v_hold;

  hold_id := v_hold.id; expires_at := v_hold.expires_at; starts_at := v_hold.starts_at; ends_at := v_hold.ends_at; assigned_table_ids := v_hold.assigned_table_ids;
  return next;
end;
$$;

create or replace function upsert_reservation_customer(
  p_first_name text, p_last_name text, p_email text, p_phone text, p_allergies text, p_preferences text
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select c.id into v_id from customers c
  where (p_email is not null and c.email is not null and lower(c.email)=lower(p_email))
     or (p_phone is not null and c.phone=p_phone)
  order by c.updated_at desc limit 1;
  if v_id is null then
    insert into customers(first_name,last_name,email,phone,allergies,preferences,last_seen_at)
    values(p_first_name,p_last_name,p_email,p_phone,p_allergies,p_preferences,now()) returning id into v_id;
  else
    update customers set first_name=p_first_name,last_name=p_last_name,email=coalesce(p_email,email),phone=coalesce(p_phone,phone),
      allergies=coalesce(nullif(p_allergies,''),allergies),preferences=coalesce(nullif(p_preferences,''),preferences),updated_at=now(),last_seen_at=now()
    where id=v_id;
  end if;
  return v_id;
end;
$$;

create or replace function confirm_reservation_from_hold_atomic(
  p_hold_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_allergies text,
  p_preferences text,
  p_notes text,
  p_management_token_hash text,
  p_confirmation_code text,
  p_source reservation_source default 'website'
) returns table(reservation_id uuid, confirmation_code text, status reservation_status)
language plpgsql as $$
declare
  v_hold reservation_holds%rowtype;
  v_service services%rowtype;
  v_rule availability_rules%rowtype;
  v_customer_id uuid;
  v_res reservations%rowtype;
  v_table_id uuid;
  v_local_date date;
  v_zone text := 'Europe/Madrid';
begin
  select * into v_hold from reservation_holds where id=p_hold_id for update;
  if not found then raise exception 'HOLD_NOT_FOUND'; end if;
  if v_hold.status <> 'active' or v_hold.expires_at <= now() then
    if v_hold.status='active' then update reservation_holds set status='expired' where id=p_hold_id; end if;
    raise exception 'HOLD_EXPIRED';
  end if;
  v_local_date := (v_hold.starts_at at time zone v_zone)::date;
  perform pg_advisory_xact_lock(hashtextextended('reservation-inventory:' || v_local_date::text, 0));

  select * into v_service from services where id=v_hold.service_id and active;
  select ar.* into v_rule from availability_rules ar
   where ar.service_id=v_hold.service_id and ar.active
     and ar.day_of_week=extract(dow from v_local_date)::int
     and (v_hold.starts_at at time zone v_zone)::time >= ar.open_time
     and (v_hold.starts_at at time zone v_zone)::time < ar.close_time
   order by ar.open_time limit 1;
  if not found then raise exception 'SERVICE_NOT_AVAILABLE'; end if;

  if not tables_are_free(v_hold.assigned_table_ids,v_hold.starts_at,v_hold.ends_at,null,v_hold.id) then raise exception 'TABLE_CONFLICT'; end if;
  if not covers_are_available(v_hold.service_id,v_hold.starts_at,v_hold.ends_at,v_hold.party_size,v_rule.max_covers,null,v_hold.id) then raise exception 'CAPACITY_FULL'; end if;

  v_customer_id := upsert_reservation_customer(p_first_name,p_last_name,p_email,p_phone,p_allergies,p_preferences);
  insert into reservations(customer_id,service_id,reservation_date,starts_at,ends_at,duration_minutes,adults,children,status,source,
    customer_name,customer_email,customer_phone,allergies,preferences,notes,area_preference_id,confirmation_code,management_token_hash)
  values(v_customer_id,v_hold.service_id,v_local_date,v_hold.starts_at,v_hold.ends_at,v_hold.duration_minutes,v_hold.adults,v_hold.children,
    case when v_service.auto_confirm then 'confirmed'::reservation_status else 'pending'::reservation_status end,p_source,
    trim(p_first_name || ' ' || p_last_name),p_email,p_phone,p_allergies,p_preferences,p_notes,v_hold.area_preference_id,p_confirmation_code,p_management_token_hash)
  returning * into v_res;

  foreach v_table_id in array v_hold.assigned_table_ids loop
    insert into reservation_tables(reservation_id,table_id) values(v_res.id,v_table_id);
  end loop;
  update reservation_holds set status='consumed' where id=v_hold.id;
  insert into activity_logs(actor_type,action,entity_type,entity_id,metadata)
    values('customer','reservation.created','reservation',v_res.id,jsonb_build_object('source',p_source,'hold_id',v_hold.id));

  reservation_id:=v_res.id; confirmation_code:=v_res.confirmation_code; status:=v_res.status; return next;
end;
$$;

create or replace function get_reservation_by_management_token(p_management_token_hash text)
returns table(
  id uuid, confirmation_code text, status text, reservation_date date, starts_at timestamptz, ends_at timestamptz,
  adults integer, children integer, party_size integer, service_id uuid, service_name text, customer_name text
) language sql stable as $$
  select r.id,r.confirmation_code,r.status::text,r.reservation_date,r.starts_at,r.ends_at,r.adults,r.children,r.party_size,s.id,s.name,r.customer_name
  from reservations r join services s on s.id=r.service_id
  where r.management_token_hash=p_management_token_hash limit 1;
$$;

create or replace function cancel_reservation_by_management_token(p_management_token_hash text, p_reason text default null)
returns boolean language plpgsql as $$
declare v_res reservations%rowtype;
begin
  select * into v_res from reservations where management_token_hash=p_management_token_hash for update;
  if not found or v_res.status not in ('pending','confirmed') then return false; end if;
  update reservations set status='cancelled',cancelled_at=now(),updated_at=now(),internal_notes=case when p_reason is null or p_reason='' then internal_notes else concat_ws(E'\n',internal_notes,'Cancelación cliente: '||p_reason) end where id=v_res.id;
  insert into activity_logs(actor_type,action,entity_type,entity_id,metadata) values('customer','reservation.cancelled','reservation',v_res.id,jsonb_build_object('reason',p_reason));
  return true;
end;
$$;

-- Modificación: el nuevo inventario ya está protegido por un hold; la reserva antigua no se toca hasta este commit.
create or replace function modify_reservation_from_hold_atomic(p_management_token_hash text, p_hold_id uuid)
returns boolean language plpgsql as $$
declare
  v_res reservations%rowtype;
  v_hold reservation_holds%rowtype;
  v_rule availability_rules%rowtype;
  v_table_id uuid;
  v_old jsonb;
  v_zone text := 'Europe/Madrid';
  v_local_date date;
begin
  select * into v_res from reservations where management_token_hash=p_management_token_hash for update;
  if not found or v_res.status not in ('pending','confirmed') then raise exception 'RESERVATION_NOT_MODIFIABLE'; end if;
  select * into v_hold from reservation_holds where id=p_hold_id for update;
  if not found or v_hold.status<>'active' or v_hold.expires_at<=now() then raise exception 'HOLD_EXPIRED'; end if;
  v_local_date := (v_hold.starts_at at time zone v_zone)::date;
  perform pg_advisory_xact_lock(hashtextextended('reservation-inventory:' || v_local_date::text,0));

  select ar.* into v_rule from availability_rules ar where ar.service_id=v_hold.service_id and ar.active
    and ar.day_of_week=extract(dow from v_local_date)::int
    and (v_hold.starts_at at time zone v_zone)::time >= ar.open_time and (v_hold.starts_at at time zone v_zone)::time < ar.close_time
    order by ar.open_time limit 1;
  if not found then raise exception 'SERVICE_NOT_AVAILABLE'; end if;
  if not tables_are_free(v_hold.assigned_table_ids,v_hold.starts_at,v_hold.ends_at,v_res.id,v_hold.id) then raise exception 'TABLE_CONFLICT'; end if;
  if not covers_are_available(v_hold.service_id,v_hold.starts_at,v_hold.ends_at,v_hold.party_size,v_rule.max_covers,v_res.id,v_hold.id) then raise exception 'CAPACITY_FULL'; end if;

  v_old := jsonb_build_object('service_id',v_res.service_id,'starts_at',v_res.starts_at,'ends_at',v_res.ends_at,'party_size',v_res.party_size);
  delete from reservation_tables where reservation_id=v_res.id;
  update reservations set service_id=v_hold.service_id,reservation_date=v_local_date,starts_at=v_hold.starts_at,ends_at=v_hold.ends_at,
    duration_minutes=v_hold.duration_minutes,adults=v_hold.adults,children=v_hold.children,area_preference_id=v_hold.area_preference_id,updated_at=now()
    where id=v_res.id;
  foreach v_table_id in array v_hold.assigned_table_ids loop insert into reservation_tables(reservation_id,table_id) values(v_res.id,v_table_id); end loop;
  update reservation_holds set status='consumed' where id=v_hold.id;
  insert into activity_logs(actor_type,action,entity_type,entity_id,metadata)
    values('customer','reservation.modified','reservation',v_res.id,jsonb_build_object('before',v_old,'after',jsonb_build_object('service_id',v_hold.service_id,'starts_at',v_hold.starts_at,'ends_at',v_hold.ends_at,'party_size',v_hold.party_size)));
  return true;
end;
$$;

create or replace function join_waitlist(
  p_date date, p_service_id uuid, p_adults integer, p_children integer,
  p_preferred_time time, p_flexible_from time, p_flexible_to time,
  p_first_name text, p_last_name text, p_email text, p_phone text
) returns uuid language plpgsql as $$
declare v_customer uuid; v_id uuid;
begin
  if p_adults<1 or p_children<0 then raise exception 'INVALID_PARTY_SIZE'; end if;
  v_customer:=upsert_reservation_customer(p_first_name,p_last_name,p_email,p_phone,null,null);
  insert into waitlist(customer_id,service_id,desired_date,adults,children,preferred_time,flexible_from,flexible_to)
  values(v_customer,p_service_id,p_date,p_adults,p_children,p_preferred_time,p_flexible_from,p_flexible_to) returning id into v_id;
  insert into activity_logs(actor_type,action,entity_type,entity_id) values('customer','waitlist.joined','waitlist',v_id);
  return v_id;
end;
$$;

create or replace function consume_rate_limit(p_key_hash text,p_action text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql as $$
declare v_count integer;
begin
  if p_limit<1 or p_window_seconds<1 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key_hash||':'||p_action,0));
  delete from rate_limit_events where created_at < now()-interval '1 day';
  select count(*) into v_count from rate_limit_events where key_hash=p_key_hash and action=p_action and created_at >= now()-make_interval(secs=>p_window_seconds);
  if v_count>=p_limit then return false; end if;
  insert into rate_limit_events(key_hash,action) values(p_key_hash,p_action); return true;
end;
$$;

-- RLS: navegador sin acceso directo. La app pública usa exclusivamente el cliente server-side con secret key.
DO $$
declare t text;
begin
  foreach t in array array['areas','services','availability_rules','reservation_duration_rules','tables','table_combinations','table_combination_members','customers','reservations','reservation_tables','reservation_holds','closures','waitlist','activity_logs','rate_limit_events'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

revoke execute on function get_available_slots(date,integer,integer,uuid) from public, anon, authenticated;
revoke execute on function create_reservation_hold_atomic(uuid,timestamptz,integer,integer,text,uuid,uuid) from public, anon, authenticated;
revoke execute on function confirm_reservation_from_hold_atomic(uuid,text,text,text,text,text,text,text,text,text,reservation_source) from public, anon, authenticated;
revoke execute on function get_reservation_by_management_token(text) from public, anon, authenticated;
revoke execute on function cancel_reservation_by_management_token(text,text) from public, anon, authenticated;
revoke execute on function modify_reservation_from_hold_atomic(text,uuid) from public, anon, authenticated;
revoke execute on function join_waitlist(date,uuid,integer,integer,time,time,time,text,text,text,text) from public, anon, authenticated;
revoke execute on function consume_rate_limit(text,text,integer,integer) from public, anon, authenticated;

grant execute on function get_available_slots(date,integer,integer,uuid) to service_role;
grant execute on function create_reservation_hold_atomic(uuid,timestamptz,integer,integer,text,uuid,uuid) to service_role;
grant execute on function confirm_reservation_from_hold_atomic(uuid,text,text,text,text,text,text,text,text,text,reservation_source) to service_role;
grant execute on function get_reservation_by_management_token(text) to service_role;
grant execute on function cancel_reservation_by_management_token(text,text) to service_role;
grant execute on function modify_reservation_from_hold_atomic(text,uuid) to service_role;
grant execute on function join_waitlist(date,uuid,integer,integer,time,time,time,text,text,text,text) to service_role;
grant execute on function consume_rate_limit(text,text,integer,integer) to service_role;

-- Liberación explícita cuando el usuario retrocede/cambia de hora.
create or replace function release_reservation_hold(p_hold_id uuid, p_session_id text)
returns boolean language plpgsql as $$
declare v_updated integer;
begin
  update reservation_holds set status='released'
  where id=p_hold_id and session_id=p_session_id and status='active';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
revoke execute on function release_reservation_hold(uuid,text) from public, anon, authenticated;
grant execute on function release_reservation_hold(uuid,text) to service_role;

-- Invariantes de configuración: evitamos reglas ambiguas antes de que lleguen al motor.
create or replace function validate_availability_rule_overlap()
returns trigger language plpgsql as $$
begin
  if new.active and exists(
    select 1 from availability_rules ar
    where ar.service_id=new.service_id and ar.day_of_week=new.day_of_week and ar.active
      and ar.id<>new.id and new.open_time < ar.close_time and new.close_time > ar.open_time
  ) then raise exception 'OVERLAPPING_AVAILABILITY_RULE'; end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_availability_rule_overlap on availability_rules;
create trigger trg_validate_availability_rule_overlap before insert or update on availability_rules
for each row execute function validate_availability_rule_overlap();

create or replace function validate_duration_rule_overlap()
returns trigger language plpgsql as $$
begin
  if exists(
    select 1 from reservation_duration_rules d
    where d.service_id=new.service_id and d.id<>new.id
      and new.min_party_size <= d.max_party_size and new.max_party_size >= d.min_party_size
  ) then raise exception 'OVERLAPPING_DURATION_RULE'; end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_duration_rule_overlap on reservation_duration_rules;
create trigger trg_validate_duration_rule_overlap before insert or update on reservation_duration_rules
for each row execute function validate_duration_rule_overlap();

create or replace function validate_combination_member_area()
returns trigger language plpgsql as $$
declare v_combo_area uuid; v_table_area uuid;
begin
  select area_id into v_combo_area from table_combinations where id=new.combination_id;
  select area_id into v_table_area from tables where id=new.table_id;
  if v_combo_area is distinct from v_table_area then raise exception 'COMBINATION_MEMBER_AREA_MISMATCH'; end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_combination_member_area on table_combination_members;
create trigger trg_validate_combination_member_area before insert or update on table_combination_members
for each row execute function validate_combination_member_area();

-- Máquina de estados para el futuro admin. Solo service_role hasta definir roles en Fase 3.
create or replace function transition_reservation_status(
  p_reservation_id uuid,
  p_new_status reservation_status,
  p_actor_user_id uuid default null,
  p_reason text default null
) returns boolean language plpgsql as $$
declare v_res reservations%rowtype; v_allowed boolean := false;
begin
  select * into v_res from reservations where id=p_reservation_id for update;
  if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;

  v_allowed := case
    when v_res.status='pending' and p_new_status in ('confirmed','cancelled') then true
    when v_res.status='confirmed' and p_new_status in ('seated','cancelled','no_show') then true
    when v_res.status='seated' and p_new_status='completed' then true
    else false end;
  if not v_allowed then raise exception 'INVALID_STATUS_TRANSITION: % -> %',v_res.status,p_new_status; end if;

  update reservations set status=p_new_status,updated_at=now(),
    cancelled_at=case when p_new_status='cancelled' then now() else cancelled_at end,
    seated_at=case when p_new_status='seated' then now() else seated_at end,
    completed_at=case when p_new_status='completed' then now() else completed_at end
  where id=p_reservation_id;
  insert into activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values(case when p_actor_user_id is null then 'system' else 'staff' end,p_actor_user_id,'reservation.status_changed','reservation',p_reservation_id,
    jsonb_build_object('from',v_res.status,'to',p_new_status,'reason',p_reason));
  return true;
end;
$$;
revoke execute on function transition_reservation_status(uuid,reservation_status,uuid,text) from public, anon, authenticated;
grant execute on function transition_reservation_status(uuid,reservation_status,uuid,text) to service_role;

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
