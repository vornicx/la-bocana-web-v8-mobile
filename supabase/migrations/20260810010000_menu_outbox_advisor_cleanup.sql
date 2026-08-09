-- Advisor cleanup for managed menu and communication outbox.
create index if not exists communication_jobs_customer_idx on public.communication_jobs(customer_id);
create index if not exists communication_jobs_waitlist_idx on public.communication_jobs(waitlist_id);

drop policy if exists menu_categories_staff_write on public.menu_categories;
drop policy if exists menu_categories_staff_insert on public.menu_categories;
create policy menu_categories_staff_insert on public.menu_categories for insert to authenticated
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));
drop policy if exists menu_categories_staff_update on public.menu_categories;
create policy menu_categories_staff_update on public.menu_categories for update to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]))
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));
drop policy if exists menu_categories_staff_delete on public.menu_categories;
create policy menu_categories_staff_delete on public.menu_categories for delete to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));

drop policy if exists menu_items_staff_write on public.menu_items;
drop policy if exists menu_items_staff_insert on public.menu_items;
create policy menu_items_staff_insert on public.menu_items for insert to authenticated
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));
drop policy if exists menu_items_staff_update on public.menu_items;
create policy menu_items_staff_update on public.menu_items for update to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]))
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));
drop policy if exists menu_items_staff_delete on public.menu_items;
create policy menu_items_staff_delete on public.menu_items for delete to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));
