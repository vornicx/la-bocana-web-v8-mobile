-- La Bocana × Archic — Reservas real / admin operations

create or replace function public.admin_clear_reservation_tables(
  p_reservation_id uuid,
  p_actor_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_status public.reservation_status;
  v_previous uuid[];
begin
  select status into v_status
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then raise exception 'Reserva no encontrada'; end if;
  if v_status in ('completed','cancelled','no_show') then
    raise exception 'La reserva ya no admite cambios de mesa';
  end if;

  select coalesce(array_agg(table_id order by table_id), '{}'::uuid[])
  into v_previous
  from public.reservation_tables
  where reservation_id = p_reservation_id;

  delete from public.reservation_tables where reservation_id = p_reservation_id;

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,'reservation.clear_tables','reservation',p_reservation_id,
          jsonb_build_object('previous_table_ids',v_previous));
  return true;
end;
$$;

revoke all on function public.admin_clear_reservation_tables(uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_clear_reservation_tables(uuid,uuid) to service_role;

create or replace function public.admin_update_reservation_notes(
  p_reservation_id uuid,
  p_notes text,
  p_preferences text,
  p_allergies text,
  p_internal_notes text,
  p_actor_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.reservations
  set notes = nullif(trim(coalesce(p_notes,'')),''),
      preferences = nullif(trim(coalesce(p_preferences,'')),''),
      allergies = nullif(trim(coalesce(p_allergies,'')),''),
      internal_notes = nullif(trim(coalesce(p_internal_notes,'')),''),
      updated_at = now()
  where id = p_reservation_id;

  if not found then raise exception 'Reserva no encontrada'; end if;

  insert into public.activity_logs(actor_type,actor_user_id,action,entity_type,entity_id,metadata)
  values ('staff',p_actor_user_id,'reservation.update_notes','reservation',p_reservation_id,
          jsonb_build_object('has_notes',nullif(trim(coalesce(p_notes,'')),'') is not null,
                             'has_preferences',nullif(trim(coalesce(p_preferences,'')),'') is not null,
                             'has_allergies',nullif(trim(coalesce(p_allergies,'')),'') is not null,
                             'has_internal_notes',nullif(trim(coalesce(p_internal_notes,'')),'') is not null));
  return true;
end;
$$;

revoke all on function public.admin_update_reservation_notes(uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_update_reservation_notes(uuid,text,text,text,text,uuid) to service_role;

notify pgrst, 'reload schema';
