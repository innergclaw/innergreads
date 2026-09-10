create table public.innerg_reads (
  slug text primary key,
  title text not null,
  body jsonb not null check (jsonb_typeof(body) = 'array'),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.innerg_read_purchases (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.innerg_reads(slug),
  access_hash text not null unique check (access_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null,
  session_id text unique,
  status text not null default 'pending' check (status in ('pending','paid','revoked')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index innerg_read_purchases_rate_idx on public.innerg_read_purchases(ip_hash,created_at);
create table public.innerg_read_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null references public.innerg_reads(slug),
  created_at timestamptz not null default now(),
  primary key (user_id,slug)
);
create table public.innerg_read_feedback (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.innerg_reads(slug),
  reader_hash text not null,
  message text not null check (char_length(message) between 3 and 1500),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  submitted_day date not null default (now() at time zone 'UTC')::date,
  unique (slug,reader_hash,submitted_day)
);
create index innerg_read_bookmarks_slug_idx on public.innerg_read_bookmarks(slug);
create index innerg_read_feedback_public_idx on public.innerg_read_feedback(slug,created_at desc) where approved;

alter table public.innerg_reads enable row level security;
alter table public.innerg_read_purchases enable row level security;
alter table public.innerg_read_bookmarks enable row level security;
alter table public.innerg_read_feedback enable row level security;
revoke all on public.innerg_reads, public.innerg_read_purchases, public.innerg_read_bookmarks, public.innerg_read_feedback from public,anon,authenticated;
grant all on public.innerg_reads, public.innerg_read_purchases, public.innerg_read_bookmarks, public.innerg_read_feedback to service_role;
grant select,insert,delete on public.innerg_read_bookmarks to authenticated;
create policy "readers see their own saved reads" on public.innerg_read_bookmarks for select to authenticated using ((select auth.uid()) = user_id);
create policy "readers save their own reads" on public.innerg_read_bookmarks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "readers remove their own saved reads" on public.innerg_read_bookmarks for delete to authenticated using ((select auth.uid()) = user_id);
-- Paid bodies, purchase capabilities and unreviewed feedback have no browser-role policies.
-- The Edge Function verifies identity/payment before returning content.
