-- Hot-path indexes for La Bocana Control.
-- These match the filters/order used by Resumen, Reservas and Sala.

create index if not exists reservations_date_starts_at_idx
  on public.reservations (reservation_date, starts_at);

create index if not exists waitlist_date_status_created_idx
  on public.waitlist (desired_date, status, created_at)
  where status in ('waiting', 'offered');
