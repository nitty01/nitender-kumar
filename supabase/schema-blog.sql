-- Blog drafts, topics, and publish timestamps (safe to re-run).
-- Run this in the Supabase SQL editor after schema.sql and schema-admin.sql.

alter table public.posts
  add column if not exists topics text[] not null default '{}';

alter table public.posts
  alter column published set default false;

alter table public.posts
  alter column published_at drop not null;

create index if not exists posts_topics_gin_idx on public.posts using gin (topics);
create index if not exists posts_published_at_idx on public.posts (published_at desc nulls last);

update public.posts
set topics = array['Platform', 'Leadership']
where slug = 'platforms-over-projects'
  and cardinality(topics) = 0;
