-- Private temporary media staging for Meta publishing.
-- Apply manually in the Supabase SQL Editor before testing uploads.
-- Do not make this bucket public.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'meta-publish-media',
  'meta-publish-media',
  false,
  4194304,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
