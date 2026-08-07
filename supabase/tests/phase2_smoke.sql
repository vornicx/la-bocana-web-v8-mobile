-- Ejecutar DESPUÉS de 0001_reservation_system.sql + seed.development.sql.
-- Todo ocurre dentro de una transacción y termina con ROLLBACK.
begin;

do $$
declare
  v_date date;
  v_service_id uuid;
  v_start timestamptz;
  v_hold uuid;
  v_reservation uuid;
  v_status reservation_status;
  v_code text := 'TEST-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
  v_token_hash text := encode(digest('phase2-smoke-' || gen_random_uuid()::text,'sha256'),'hex');
  v_found integer;
begin
  select d::date into v_date
  from generate_series(current_date + 2, current_date + 8, interval '1 day') d
  where extract(dow from d) between 1 and 6
  order by d limit 1;

  select a.service_id,a.starts_at into v_service_id,v_start
  from get_available_slots(v_date,2,0,null) a
  order by a.starts_at limit 1;
  if v_service_id is null then raise exception 'SMOKE_FAIL: no available slots'; end if;

  select h.hold_id into v_hold
  from create_reservation_hold_atomic(v_service_id,v_start,2,0,'phase2-smoke',null,null) h;
  if v_hold is null then raise exception 'SMOKE_FAIL: hold not created'; end if;

  select c.reservation_id,c.status into v_reservation,v_status
  from confirm_reservation_from_hold_atomic(
    v_hold,'Archic','Smoke','smoke@example.invalid','+34900000000',null,null,'QA automático',v_token_hash,v_code,'website'
  ) c;
  if v_reservation is null or v_status not in ('pending','confirmed') then raise exception 'SMOKE_FAIL: reservation not confirmed'; end if;

  select count(*) into v_found from get_reservation_by_management_token(v_token_hash);
  if v_found <> 1 then raise exception 'SMOKE_FAIL: management token lookup'; end if;

  if not cancel_reservation_by_management_token(v_token_hash,'smoke test') then raise exception 'SMOKE_FAIL: cancellation'; end if;
  select count(*) into v_found from reservations where id=v_reservation and status='cancelled';
  if v_found <> 1 then raise exception 'SMOKE_FAIL: cancelled status not persisted in tx'; end if;

  raise notice 'PHASE2_SMOKE_OK date=% start=% reservation=%',v_date,v_start,v_reservation;
end $$;

rollback;
