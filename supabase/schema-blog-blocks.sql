-- Block canvas for posts (safe to re-run).
alter table public.posts
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.posts
  add column if not exists hero_url text;
