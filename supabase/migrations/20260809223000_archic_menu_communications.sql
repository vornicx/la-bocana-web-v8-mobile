-- Archic restaurant product: managed menu and auditable communication outbox.
-- Additive migration. Public menu reads expose published content only; communication data remains backend-only.

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_type text not null check (menu_type in ('food','wine')),
  slug text not null,
  name_es text not null,
  name_en text,
  eyebrow_es text,
  eyebrow_en text,
  intro_es text,
  intro_en text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (menu_type, slug)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name_es text not null,
  name_en text,
  price_label text not null,
  note_es text,
  note_en text,
  image_path text,
  image_alt_es text,
  image_alt_en text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name_es)
);

create index if not exists menu_categories_public_order_idx on public.menu_categories(menu_type, active, sort_order);
create index if not exists menu_items_public_order_idx on public.menu_items(category_id, active, sort_order);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists menu_categories_public_read on public.menu_categories;
create policy menu_categories_public_read on public.menu_categories for select to anon using (active);
drop policy if exists menu_categories_staff_read on public.menu_categories;
create policy menu_categories_staff_read on public.menu_categories for select to authenticated using (private.is_active_staff());
drop policy if exists menu_categories_staff_write on public.menu_categories;
create policy menu_categories_staff_write on public.menu_categories for all to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]))
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));

drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items for select to anon using (
  active and exists (select 1 from public.menu_categories c where c.id = category_id and c.active)
);
drop policy if exists menu_items_staff_read on public.menu_items;
create policy menu_items_staff_read on public.menu_items for select to authenticated using (private.is_active_staff());
drop policy if exists menu_items_staff_write on public.menu_items;
create policy menu_items_staff_write on public.menu_items for all to authenticated
using (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]))
with check (private.current_staff_role() = any (array['manager'::staff_role, 'editor'::staff_role]));

grant select on public.menu_categories, public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_categories, public.menu_items to authenticated;

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  channel text not null check (channel in ('email','whatsapp')),
  locale text not null check (locale in ('es','en')),
  subject text,
  body text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, channel, locale)
);

create table if not exists public.communication_jobs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete set null,
  waitlist_id uuid references public.waitlist(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  event_key text not null,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  locale text not null default 'es' check (locale in ('es','en')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists communication_jobs_dispatch_idx on public.communication_jobs(status, scheduled_for) where status = 'pending';
create index if not exists communication_jobs_reservation_idx on public.communication_jobs(reservation_id, created_at desc);
alter table public.communication_templates enable row level security;
alter table public.communication_jobs enable row level security;
revoke all on public.communication_templates, public.communication_jobs from anon, authenticated;
grant all on public.communication_templates, public.communication_jobs to service_role;

create or replace function private.archic_set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public, private, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.archic_set_updated_at() from public, anon, authenticated;

drop trigger if exists menu_categories_touch_updated_at on public.menu_categories;
create trigger menu_categories_touch_updated_at before update on public.menu_categories for each row execute function private.archic_set_updated_at();
drop trigger if exists menu_items_touch_updated_at on public.menu_items;
create trigger menu_items_touch_updated_at before update on public.menu_items for each row execute function private.archic_set_updated_at();
drop trigger if exists communication_templates_touch_updated_at on public.communication_templates;
create trigger communication_templates_touch_updated_at before update on public.communication_templates for each row execute function private.archic_set_updated_at();
drop trigger if exists communication_jobs_touch_updated_at on public.communication_jobs;
create trigger communication_jobs_touch_updated_at before update on public.communication_jobs for each row execute function private.archic_set_updated_at();

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
  v_email := nullif(trim(new.customer_email_snapshot), '');
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

drop trigger if exists reservation_communications_outbox on public.reservations;
create trigger reservation_communications_outbox after insert or update on public.reservations
for each row execute function private.enqueue_reservation_communications();

create or replace function private.enqueue_waitlist_communications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare v_email text;
begin
  if new.status = 'offered' and old.status is distinct from new.status then
    select nullif(trim(email), '') into v_email from public.customers where id = new.customer_id;
    if v_email is not null then
      insert into public.communication_jobs(waitlist_id, customer_id, event_key, channel, recipient, scheduled_for, payload, dedupe_key)
      values (new.id, new.customer_id, 'waitlist_offer', 'email', v_email, now(),
        jsonb_build_object('desired_date', new.desired_date, 'preferred_time', new.preferred_time, 'party_size', new.party_size, 'offer_expires_at', new.offer_expires_at),
        new.id::text || ':offer:' || extract(epoch from coalesce(new.offered_at, now()))::bigint)
      on conflict (dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_waitlist_communications() from public, anon, authenticated;

drop trigger if exists waitlist_communications_outbox on public.waitlist;
create trigger waitlist_communications_outbox after update on public.waitlist
for each row execute function private.enqueue_waitlist_communications();

insert into public.communication_templates(event_key, channel, locale, subject, body)
values
('reservation_confirmation','email','es','Tu reserva en La Bocana','Reserva confirmada. Te esperamos junto al Mediterráneo.'),
('reservation_reminder','email','es','Mañana nos vemos en La Bocana','Este es el recordatorio de tu reserva.'),
('reservation_modification','email','es','Tu reserva se ha actualizado','Hemos actualizado los datos de tu reserva.'),
('reservation_cancellation','email','es','Tu reserva ha sido cancelada','La reserva ha quedado cancelada.'),
('waitlist_offer','email','es','Se ha liberado una mesa','Tenemos un hueco disponible durante un tiempo limitado.'),
('reservation_confirmation','email','en','Your booking at La Bocana','Your booking is confirmed. We look forward to welcoming you by the Mediterranean.'),
('reservation_reminder','email','en','See you tomorrow at La Bocana','This is a reminder of your booking.'),
('reservation_modification','email','en','Your booking has been updated','Your booking details have been updated.'),
('reservation_cancellation','email','en','Your booking has been cancelled','Your booking has been cancelled.'),
('waitlist_offer','email','en','A table has become available','A table is available for a limited time.')
on conflict (event_key, channel, locale) do update set subject = excluded.subject, body = excluded.body;

insert into public.menu_categories(menu_type,slug,name_es,name_en,eyebrow_es,eyebrow_en,intro_es,intro_en,sort_order,active)
values
('food','para-empezar','Para empezar','To begin','Frescos, clásicos y para compartir',null,null,null,1,true),
('food','ibericos','Ibéricos','Iberian charcuterie','Producto español',null,null,null,2,true),
('food','especialidades','Especialidades','Specialities','El sabor de Málaga y del mar',null,null,null,3,true),
('food','pastas','Pastas','Pasta','Recetas de la casa',null,null,null,4,true),
('food','arroces','Arroces y paellas','Rice and paella','El centro de la mesa',null,'Los arroces se pueden preparar en paella o caldosos en cazuela. Mínimo dos personas; precio indicado para dos personas.',null,5,true),
('food','pescados','Pescados y mariscos','Fish and seafood','Mediterráneo, plancha y producto',null,null,null,6,true),
('food','carnes','Carnes','Meat','Plancha y brasa',null,null,null,7,true),
('food','acompanamientos','Guarniciones y salsas','Sides and sauces','Para completar el plato',null,null,null,8,true),
('wine','blancos','Vinos blancos','White wines','Atlánticos, mediterráneos y de interior',null,null,null,1,true),
('wine','rosados','Vinos rosados','Rosé wines','Ligeros y gastronómicos',null,null,null,2,true),
('wine','tintos','Vinos tintos','Red wines','Rioja, Ribera y otras procedencias',null,null,null,3,true),
('wine','espumosos','Cavas y champagne','Cava and champagne','Para brindar frente al mar',null,null,null,4,true)
on conflict (menu_type,slug) do update set
  name_es=excluded.name_es,name_en=excluded.name_en,eyebrow_es=excluded.eyebrow_es,intro_es=excluded.intro_es,
  sort_order=excluded.sort_order,active=excluded.active;
with source(menu_type,category_slug,name_es,name_en,price_label,note_es,note_en,image_path,image_alt_es,image_alt_en,sort_order,active) as (
  values
  ('food','para-empezar','Carpaccio de ternera',null,'22,00 €',null,null,null,null,null,1,true),
  ('food','para-empezar','Gazpacho andaluz',null,'13,00 €',null,null,null,null,null,2,true),
  ('food','para-empezar','Salmorejo',null,'14,50 €',null,null,null,null,null,3,true),
  ('food','para-empezar','Aguacate con gambas',null,'18,50 €',null,null,'/images/menu-official/aguacate-gambas.webp','Aguacate con gambas servido en La Bocana',null,4,true),
  ('food','para-empezar','Ensaladilla rusa',null,'16,50 €',null,null,null,null,null,5,true),
  ('food','para-empezar','Ensalada mixta',null,'12,00 €',null,null,null,null,null,6,true),
  ('food','para-empezar','Ensalada de pimientos asados',null,'15,00 €',null,null,null,null,null,7,true),
  ('food','para-empezar','Ensalada César',null,'18,00 €',null,null,null,null,null,8,true),
  ('food','para-empezar','Ensalada tropical',null,'19,00 €',null,null,'/images/menu-official/ensalada-tropical.webp','Ensalada tropical servida en La Bocana',null,9,true),
  ('food','para-empezar','Boquerones en vinagre',null,'15,00 €',null,null,null,null,null,10,true),
  ('food','para-empezar','Salpicón de marisco',null,'15,00 €',null,null,null,null,null,11,true),
  ('food','para-empezar','Croquetas caseras',null,'15,00 €',null,null,'/images/menu-official/croquetas.webp','Croquetas caseras de La Bocana',null,12,true),
  ('food','para-empezar','Albóndigas caseras',null,'16,00 €',null,null,null,null,null,13,true),
  ('food','para-empezar','Berenjenas con miel de caña',null,'15,00 €',null,null,'/images/menu-official/berenjenas-miel.webp','Berenjenas con miel de caña servidas en La Bocana',null,14,true),
  ('food','ibericos','Jamón ibérico',null,'28,50 €',null,null,null,null,null,1,true),
  ('food','ibericos','Caña de lomo ibérico',null,'19,50 €',null,null,null,null,null,2,true),
  ('food','ibericos','Salchichón ibérico',null,'19,00 €',null,null,null,null,null,3,true),
  ('food','ibericos','Chorizo ibérico',null,'19,00 €',null,null,null,null,null,4,true),
  ('food','ibericos','Surtido ibérico',null,'24,00 €',null,null,null,null,null,5,true),
  ('food','ibericos','Queso manchego',null,'19,00 €',null,null,null,null,null,6,true),
  ('food','especialidades','Fritura malagueña',null,'22,00 €',null,null,null,null,null,1,true),
  ('food','especialidades','Boquerones fritos',null,'18,00 €',null,null,null,null,null,2,true),
  ('food','especialidades','Calamares fritos',null,'19,00 €',null,null,'/images/menu-official/calamares-fritos.webp','Calamares fritos de La Bocana',null,3,true),
  ('food','especialidades','Rosada frita',null,'19,00 €',null,null,null,null,null,4,true),
  ('food','especialidades','Puntillitas fritas',null,'19,00 €',null,null,null,null,null,5,true),
  ('food','especialidades','Gambas a la plancha o cocidas',null,'22,50 €',null,null,null,null,null,6,true),
  ('food','especialidades','Almejas salteadas o a la marinera',null,'19,00 €',null,null,'/images/menu-official/almejas-marina.webp','Almejas a la marinera servidas en La Bocana',null,7,true),
  ('food','especialidades','Mejillones al vapor',null,'15,00 €',null,null,null,null,null,8,true),
  ('food','especialidades','Pulpo a la gallega',null,'22,50 €',null,null,'/images/menu-official/pulpo-gallega.webp','Pulpo a la gallega de La Bocana',null,9,true),
  ('food','especialidades','Gambas al pilpil',null,'19,50 €',null,null,'/images/menu-official/gambas-pilpil.webp','Gambas al pilpil servidas en La Bocana',null,10,true),
  ('food','pastas','Espaguetis boloñesa de carne o atún',null,'19,00 €',null,null,null,null,null,1,true),
  ('food','pastas','Espaguetis a la marinera',null,'23,00 €',null,null,'/images/menu-official/espaguetis-marinera.webp','Espaguetis a la marinera de La Bocana',null,2,true),
  ('food','pastas','Espaguetis carbonara',null,'21,00 €',null,null,'/images/menu-official/espaguetis-carbonara.webp','Espaguetis carbonara de La Bocana',null,3,true),
  ('food','pastas','Espaguetis La Bocana con gambas picantes',null,'24,00 €',null,null,null,null,null,4,true),
  ('food','arroces','Paella de bogavante',null,'74,00 €',null,null,null,null,null,1,true),
  ('food','arroces','Paella mixta de carne y marisco',null,'46,00 €',null,null,null,null,null,2,true),
  ('food','arroces','Paella vegetariana',null,'39,50 €',null,null,null,null,null,3,true),
  ('food','arroces','Paella especial de marisco',null,'49,00 €',null,null,'/images/menu-official/paella-marisco.webp','Paella especial de marisco de La Bocana',null,4,true),
  ('food','arroces','Paella de pollo y verduras',null,'42,00 €',null,null,null,null,null,5,true),
  ('food','pescados','Brocheta de rape y gambas',null,'29,00 €',null,null,null,null,null,1,true),
  ('food','pescados','Carabineros',null,'S/M','Según mercado',null,null,null,null,2,true),
  ('food','pescados','Parrillada de marisco',null,'43,00 €',null,null,null,null,null,3,true),
  ('food','pescados','Parrillada especial de marisco',null,'99,00 €',null,null,null,null,null,4,true),
  ('food','pescados','Lenguado a la plancha',null,'29,00 €','Aprox. 400 g',null,null,null,null,5,true),
  ('food','pescados','Dorada a la plancha',null,'25,00 €',null,null,null,null,null,6,true),
  ('food','pescados','Salmón a la plancha',null,'25,00 €',null,null,'/images/menu-official/salmon.webp','Salmón a la plancha servido en La Bocana',null,7,true),
  ('food','pescados','Calamar a la plancha',null,'23,00 €','Aprox. 400 g',null,null,null,null,8,true),
  ('food','pescados','Lubina',null,'7,50 €','Por 100 g',null,'/images/menu-official/lubina.webp','Lubina servida en La Bocana',null,9,true),
  ('food','pescados','Pargo',null,'8,50 €','Por 100 g',null,null,null,null,10,true),
  ('food','pescados','Rodaballo',null,'8,00 €','Por 100 g',null,null,null,null,11,true),
  ('food','pescados','Ostras',null,'6,00 €','Unidad',null,null,null,null,12,true),
  ('food','pescados','Conchas finas',null,'4,00 €','Unidad',null,null,null,null,13,true),
  ('food','pescados','Pescado del día',null,'Consultar','Precio y disponibilidad según mercado',null,null,null,null,14,true),
  ('food','carnes','Filete de pollo',null,'23,00 €',null,null,null,null,null,1,true),
  ('food','carnes','Entrecot de ternera',null,'27,50 €','300 g',null,null,null,null,2,true),
  ('food','carnes','Solomillo de ternera',null,'30,00 €','250 g',null,'/images/menu-official/solomillo-pimienta.webp','Solomillo de ternera servido en La Bocana',null,3,true),
  ('food','carnes','Brocheta de solomillo de ternera',null,'31,00 €',null,null,null,null,null,4,true),
  ('food','carnes','Chuletas de cordero',null,'24,00 €',null,null,null,null,null,5,true),
  ('food','carnes','Brocheta de pollo',null,'26,00 €',null,null,'/images/menu-official/brocheta-pollo.webp','Brocheta de pollo de La Bocana',null,6,true),
  ('food','carnes','Pollo al limón',null,'19,50 €',null,null,'/images/menu-official/pollo-limon.webp','Pollo al limón servido en La Bocana',null,7,true),
  ('food','acompanamientos','Ración de patatas fritas',null,'8,00 €',null,null,null,null,null,1,true),
  ('food','acompanamientos','Ensalada',null,'7,00 €',null,null,null,null,null,2,true),
  ('food','acompanamientos','Arroz cocido',null,'7,00 €',null,null,null,null,null,3,true),
  ('food','acompanamientos','Salsa a la pimienta',null,'2,50 €',null,null,null,null,null,4,true),
  ('food','acompanamientos','Alioli',null,'2,50 €',null,null,null,null,null,5,true),
  ('food','acompanamientos','Salsa rosa',null,'2,50 €',null,null,null,null,null,6,true),
  ('wine','blancos','Louis Latour La Chanfleure',null,'65,00 €','D.O. Chablis',null,null,null,null,1,true),
  ('wine','blancos','Mar de Frades Albariño',null,'41,00 €','D.O. Rías Baixas',null,null,null,null,2,true),
  ('wine','blancos','José Pariente Verdejo',null,'36,00 €','D.O. Rueda',null,null,null,null,3,true),
  ('wine','blancos','Isabel Arranz Verdejo',null,'35,00 €','D.O. Rueda',null,null,null,null,4,true),
  ('wine','blancos','Pago de los Capellanes Godello',null,'34,00 €','D.O. Valdeorras',null,null,null,null,5,true),
  ('wine','blancos','Martín Códax Albariño',null,'33,00 €','D.O. Rías Baixas',null,null,null,null,6,true),
  ('wine','blancos','Coral do Mar Albariño',null,'29,50 €','D.O. Rías Baixas',null,null,null,null,7,true),
  ('wine','blancos','Marqués de Riscal Sauvignon',null,'33,00 €','D.O. Rueda',null,null,null,null,8,true),
  ('wine','blancos','Enate Chardonnay 234',null,'31,50 €','D.O. Somontano',null,null,null,null,9,true),
  ('wine','blancos','Cloe Chardonnay',null,'33,00 €','D.O. Sierras de Málaga',null,null,null,null,10,true),
  ('wine','blancos','Viña Sol',null,'25,50 €','D.O. Catalunya',null,null,null,null,11,true),
  ('wine','blancos','Tierra Blanca',null,'24,50 €','D.O. Cádiz',null,null,null,null,12,true),
  ('wine','blancos','La Bocana',null,'24,50 €','D.O. Rueda',null,null,null,null,13,true),
  ('wine','blancos','Media botella Tierra Blanca',null,'14,00 €','D.O. Cádiz',null,null,null,null,14,true),
  ('wine','blancos','Copa de Coral do Mar Albariño',null,'5,50 €','D.O. Rías Baixas',null,null,null,null,15,true),
  ('wine','blancos','Copa de Tierra Blanca',null,'5,00 €','D.O. Cádiz',null,null,null,null,16,true),
  ('wine','blancos','Copa de La Bocana',null,'5,00 €','D.O. Rueda',null,null,null,null,17,true),
  ('wine','rosados','Barton & Guestier',null,'42,00 €','D.O. Côtes de Provence',null,null,null,null,1,true),
  ('wine','rosados','Cloe Rosé',null,'33,00 €','D.O. Sierras de Málaga',null,null,null,null,2,true),
  ('wine','rosados','Marqués de Riscal Rosado',null,'29,00 €','D.O. Rioja',null,null,null,null,3,true),
  ('wine','rosados','De Casta Torres',null,'26,00 €','D.O. Catalunya',null,null,null,null,4,true),
  ('wine','rosados','Media botella De Casta Torres',null,'14,00 €','D.O. Catalunya',null,null,null,null,5,true),
  ('wine','rosados','La Bocana',null,'24,50 €','D.O. Huelva',null,null,null,null,6,true),
  ('wine','rosados','Copa de La Bocana',null,'5,00 €','D.O. Huelva',null,null,null,null,7,true),
  ('wine','tintos','Flor de Pingus',null,'300,00 €','D.O. Ribera del Duero',null,null,null,null,1,true),
  ('wine','tintos','Pago de Carraovejas Crianza',null,'85,00 €','D.O. Ribera del Duero',null,null,null,null,2,true),
  ('wine','tintos','Roda I Reserva',null,'88,00 €','D.O. Rioja',null,null,null,null,3,true),
  ('wine','tintos','Carmelo Rodero Reserva',null,'67,00 €','D.O. Ribera del Duero',null,null,null,null,4,true),
  ('wine','tintos','Viña Ardanza Reserva',null,'50,00 €','D.O. Rioja',null,null,null,null,5,true),
  ('wine','tintos','Entrechuelo Premium',null,'42,00 €','D.O. Cádiz',null,null,null,null,6,true),
  ('wine','tintos','Emilio Moro Crianza',null,'44,50 €','D.O. Ribera del Duero',null,null,null,null,7,true),
  ('wine','tintos','Pesquera Crianza',null,'42,50 €','D.O. Ribera del Duero',null,null,null,null,8,true),
  ('wine','tintos','Viña Sastre Crianza',null,'40,00 €','D.O. Ribera del Duero',null,null,null,null,9,true),
  ('wine','tintos','Marqués de Riscal Reserva',null,'39,00 €','D.O. Rioja',null,null,null,null,10,true),
  ('wine','tintos','Media botella Marqués de Riscal Reserva',null,'21,00 €','D.O. Rioja',null,null,null,null,11,true),
  ('wine','tintos','Marqués de Cáceres',null,'26,50 €','D.O. Rioja',null,null,null,null,12,true),
  ('wine','tintos','Fuentespina',null,'29,50 €','D.O. Ribera del Duero',null,null,null,null,13,true),
  ('wine','tintos','La Bocana',null,'24,50 €','D.O. Rioja',null,null,null,null,14,true),
  ('wine','tintos','Copa de Fuentespina',null,'5,50 €','D.O. Ribera del Duero',null,null,null,null,15,true),
  ('wine','tintos','Copa de La Bocana',null,'5,00 €','D.O. Rioja',null,null,null,null,16,true),
  ('wine','espumosos','Dom Pérignon',null,'380,00 €','Champagne',null,null,null,null,1,true),
  ('wine','espumosos','Laurent-Perrier Cuvée Rosé Brut',null,'200,00 €','Champagne',null,null,null,null,2,true),
  ('wine','espumosos','Moët & Chandon Impérial',null,'130,00 €','Champagne',null,null,null,null,3,true),
  ('wine','espumosos','Anna de Codorníu',null,'34,00 €','Cava',null,null,null,null,4,true),
  ('wine','espumosos','Cinzano',null,'33,50 €','Prosecco',null,null,null,null,5,true),
  ('wine','espumosos','Anna de Codorníu Brut Rosé',null,'32,00 €','Cava',null,null,null,null,6,true),
  ('wine','espumosos','Benjamín de Codorníu',null,'9,00 €',null,null,null,null,null,7,true)
)
insert into public.menu_items(category_id,name_es,name_en,price_label,note_es,note_en,image_path,image_alt_es,image_alt_en,sort_order,active)
select c.id,s.name_es,s.name_en,s.price_label,s.note_es,s.note_en,s.image_path,s.image_alt_es,s.image_alt_en,s.sort_order,s.active
from source s join public.menu_categories c on c.menu_type=s.menu_type and c.slug=s.category_slug
on conflict (category_id,name_es) do update set
  price_label=excluded.price_label,note_es=excluded.note_es,image_path=excluded.image_path,image_alt_es=excluded.image_alt_es,
  sort_order=excluded.sort_order,active=excluded.active;
