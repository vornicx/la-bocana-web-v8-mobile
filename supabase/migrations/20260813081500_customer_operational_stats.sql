-- Compact statistics for the Control customer directory.
-- The full reservation history is loaded only after opening one customer.

create or replace view public.customer_operational_stats
with (security_invoker = true)
as
select
  customer_id,
  count(*)::integer as total_reservations,
  count(*) filter (where status = 'completed')::integer as completed_visits,
  count(*) filter (where status = 'cancelled')::integer as cancellations,
  count(*) filter (where status = 'no_show')::integer as no_shows,
  count(*) filter (where status in ('pending', 'confirmed', 'seated'))::integer as active_reservations,
  coalesce(sum(party_size) filter (where status = 'completed'), 0)::integer as total_covers,
  coalesce(
    mode() within group (order by party_size) filter (where status = 'completed'),
    mode() within group (order by party_size)
  )::integer as typical_party_size,
  min(starts_at) filter (where status = 'completed') as first_visit,
  max(starts_at) filter (where status = 'completed') as last_visit
from public.reservations
where customer_id is not null
group by customer_id;

grant select on public.customer_operational_stats to service_role;
