-- ============================================================
-- SwiftLoop — Journal (blog) schema for Supabase / Postgres
-- Run this once in the Supabase SQL editor before seeding.
-- ============================================================

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- articles
-- ------------------------------------------------------------
create table if not exists public.swiftloop_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,                       -- meta description / card excerpt
  body         text not null,              -- markdown (hero image + H1 stripped; rendered client-side)
  category     text not null,
  keywords     text[] not null default '{}',
  read_time    text,                       -- e.g. "3 min"
  image        text,                       -- hero image URL
  image_alt    text,
  published    boolean not null default true,
  featured     boolean not null default false,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists swiftloop_articles_published_at_idx on public.swiftloop_articles (published_at desc);
create index if not exists swiftloop_articles_category_idx     on public.swiftloop_articles (category);
create index if not exists swiftloop_articles_published_idx    on public.swiftloop_articles (published);

-- ------------------------------------------------------------
-- keep updated_at fresh on every write
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists swiftloop_articles_set_updated_at on public.swiftloop_articles;
create trigger swiftloop_articles_set_updated_at
  before update on public.swiftloop_articles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security: the public (anon key) may READ published
-- articles whose publish date has arrived. Future-dated rows
-- (scheduled posts) stay hidden until published_at passes —
-- this is how scheduling works with no cron. Writes are
-- reserved for the service role.
-- ------------------------------------------------------------
alter table public.swiftloop_articles enable row level security;

drop policy if exists "Public read published articles" on public.swiftloop_articles;
create policy "Public read published articles"
  on public.swiftloop_articles
  for select
  to anon, authenticated
  using (published = true and published_at <= now());
