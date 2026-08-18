-- Article layout for posts (safe to re-run).
alter table public.posts
  add column if not exists layout text not null default 'flow';
