-- Private media bucket for menu photography managed through La Bocana Control.
-- Objects are written with the service-role server client and served through
-- /api/menu-media/* so direct Storage access remains closed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-media',
  'menu-media',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
