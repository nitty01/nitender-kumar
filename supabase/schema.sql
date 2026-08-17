-- Run this in the Supabase SQL editor (free tier is enough).
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null,
  published boolean not null default true,
  published_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
  on public.posts
  for select
  using (published = true);

insert into public.posts (slug, title, excerpt, body)
values (
  'platforms-over-projects',
  'Platforms over projects',
  'Why reusable platform bets beat one-off delivery.',
  'The highest-leverage work in platform and data organizations is not another dashboard. It is leaving behind infrastructure that the next team can extend without a rewrite.

That means contracts, tenancy, observability, and cost controls as first-class design, not cleanup after a demo works.'
)
on conflict (slug) do nothing;
