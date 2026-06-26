create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  meta_user_id text,
  meta_user_name text,
  access_token text not null,
  token_type text,
  expires_at timestamptz,
  scopes text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_connections enable row level security;

create index if not exists meta_connections_clerk_user_id_idx
  on public.meta_connections (clerk_user_id);
