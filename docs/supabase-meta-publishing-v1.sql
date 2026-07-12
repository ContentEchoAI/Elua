alter table public.meta_connections
  add column if not exists facebook_page_id text,
  add column if not exists facebook_page_name text,
  add column if not exists page_access_token text,
  add column if not exists page_token_type text,
  add column if not exists page_token_expires_at timestamptz,
  add column if not exists instagram_account_id text,
  add column if not exists instagram_username text,
  add column if not exists publishing_enabled boolean not null default false;

create index if not exists meta_connections_facebook_page_id_idx
  on public.meta_connections (facebook_page_id);

create index if not exists meta_connections_instagram_account_id_idx
  on public.meta_connections (instagram_account_id);

create table if not exists public.meta_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  approved_post_id text not null,
  platform text not null
    check (platform in ('facebook', 'instagram')),
  status text not null default 'pending'
    check (status in ('pending', 'publishing', 'published', 'failed')),
  caption_hash text not null,
  meta_post_id text,
  permalink_url text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (clerk_user_id, approved_post_id, platform)
);

alter table public.meta_publish_attempts enable row level security;

create index if not exists meta_publish_attempts_clerk_user_id_idx
  on public.meta_publish_attempts (clerk_user_id);

create index if not exists meta_publish_attempts_status_idx
  on public.meta_publish_attempts (status);

grant select, insert, update, delete
on table public.meta_publish_attempts
to service_role;
