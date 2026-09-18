create table public.home_base_supports (
id uuid primary key default gen_random_uuid(),
slug text not null default 'home-base' check (slug = 'home-base'),
intent_hash text not null unique check (intent_hash ~ '^[a-f0-9]{64}$'),
ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
amount_cents integer not null check (amount_cents between 100 and 500 and amount_cents % 100 = 0),
session_id text unique,
status text not null default 'pending' check (status in ('pending','paid','refunded')),
created_at timestamptz not null default now(),
confirmed_at timestamptz
);
create index home_base_supports_rate_idx on public.home_base_supports(ip_hash,created_at);
alter table public.home_base_supports enable row level security;
revoke all on public.home_base_supports from public,anon,authenticated;
grant all on public.home_base_supports to service_role;
