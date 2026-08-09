-- Fix reservation email column used by the communication outbox trigger.
create or replace function private.enqueue_reservation_communications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_email text;
  v_reminder_at timestamptz;
begin
  v_email := nullif(trim(new.customer_email), '');
  if v_email is null then return new; end if;

  if tg_op = 'INSERT' then
    insert into public.communication_jobs(reservation_id, customer_id, event_key, channel, recipient, scheduled_for, payload, dedupe_key)
    values (new.id, new.customer_id, 'reservation_confirmation', 'email', v_email, now(),
      jsonb_build_object('confirmation_code', new.confirmation_code, 'starts_at', new.starts_at, 'party_size', new.party_size),
      new.id::text || ':confirmation')
    on conflict (dedupe_key) do nothing;

    v_reminder_at := greatest(now(), new.starts_at - interval '24 hours');
    insert into public.communication_jobs(reservation_id, customer_id, event_key, channel, recipient, scheduled_for, payload, dedupe_key)
    values (new.id, new.customer_id, 'reservation_reminder', 'email', v_email, v_reminder_at,
      jsonb_build_object('confirmation_code', new.confirmation_code, 'starts_at', new.starts_at, 'party_size', new.party_size),
      new.id::text || ':reminder:' || extract(epoch from new.starts_at)::bigint)
    on conflict (dedupe_key) do nothing;
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'cancelled' then
    update public.communication_jobs set status = 'cancelled'
      where reservation_id = new.id and event_key = 'reservation_reminder' and status = 'pending';
    insert into public.communication_jobs(reservation_id, customer_id, event_key, channel, recipient, payload, dedupe_key)
    values (new.id, new.customer_id, 'reservation_cancellation', 'email', v_email,
      jsonb_build_object('confirmation_code', new.confirmation_code, 'starts_at', new.starts_at),
      new.id::text || ':cancellation')
    on conflict (dedupe_key) do nothing;
  elsif old.starts_at is distinct from new.starts_at
     or old.party_size is distinct from new.party_size
     or old.adults is distinct from new.adults
     or old.children is distinct from new.children then
    update public.communication_jobs set status = 'cancelled'
      where reservation_id = new.id and event_key = 'reservation_reminder' and status = 'pending';
    insert into public.communication_jobs(reservation_id, customer_id, event_key, channel, recipient, payload, dedupe_key)
    values (new.id, new.customer_id, 'reservation_modification', 'email', v_email,
      jsonb_build_object('confirmation_code', new.confirmation_code, 'starts_at', new.starts_at, 'party_size', new.party_size),
      new.id::text || ':modification:' || extract(epoch from new.updated_at)::bigint)
    on conflict (dedupe_key) do nothing;
    v_reminder_at := greatest(now(), new.starts_at - interval '24 hours');
    insert into public.communication_jobs(reservation_id, customer_id, event_key, channel, recipient, scheduled_for, payload, dedupe_key)
    values (new.id, new.customer_id, 'reservation_reminder', 'email', v_email, v_reminder_at,
      jsonb_build_object('confirmation_code', new.confirmation_code, 'starts_at', new.starts_at, 'party_size', new.party_size),
      new.id::text || ':reminder:' || extract(epoch from new.starts_at)::bigint)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_reservation_communications() from public, anon, authenticated;
