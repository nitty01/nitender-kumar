-- Admin + blog extensions (safe to re-run)

alter table public.posts
  add column if not exists archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_posts_updated_at();

-- Public may only see live published posts (not archived)
drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
  on public.posts
  for select
  using (published = true and archived = false);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Public may only read non-secret settings (never admin credentials)
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Public can read public site settings" on public.site_settings;
create policy "Public can read public site settings"
  on public.site_settings
  for select
  using (
    key in (
      'site_mode',
      'theme',
      'show_blog',
      'show_playground',
      'show_about',
      'show_contact',
      'show_experience'
    )
  );

insert into public.site_settings (key, value)
values
  ('site_mode', 'cto'),
  ('theme', 'ocean'),
  ('show_blog', 'true'),
  ('show_playground', 'true'),
  ('show_about', 'true'),
  ('show_contact', 'true'),
  ('show_experience', 'true')
on conflict (key) do nothing;

-- Encrypted admin identity (email) + hashed password. No public access.
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email_lookup text not null unique,
  email_cipher text not null,
  password_hash text not null,
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_accounts
  add column if not exists session_version integer not null default 1;

alter table public.admin_accounts enable row level security;

-- Intentionally no public policies: only service role / postgres can read/write.
drop policy if exists "Service role can manage admin accounts" on public.admin_accounts;
create policy "Service role can manage admin accounts"
  on public.admin_accounts
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.set_admin_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_accounts_set_updated_at on public.admin_accounts;
create trigger admin_accounts_set_updated_at
  before update on public.admin_accounts
  for each row execute function public.set_admin_accounts_updated_at();

-- Email recovery codes (hashed). No public access.
create table if not exists public.admin_recovery_challenges (
  id uuid primary key default gen_random_uuid(),
  email_lookup text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  attempt_count integer not null default 0
);

alter table public.admin_recovery_challenges
  add column if not exists attempt_count integer not null default 0;

create index if not exists admin_recovery_challenges_lookup_idx
  on public.admin_recovery_challenges (email_lookup, created_at desc);

alter table public.admin_recovery_challenges enable row level security;
drop policy if exists "Service role can manage recovery challenges" on public.admin_recovery_challenges;
create policy "Service role can manage recovery challenges"
  on public.admin_recovery_challenges
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subject text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_security_events_kind_subject_idx
  on public.admin_security_events (kind, subject, created_at desc);

alter table public.admin_security_events enable row level security;
drop policy if exists "Service role can manage security events" on public.admin_security_events;
create policy "Service role can manage security events"
  on public.admin_security_events
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Drop legacy plaintext credential keys if present
delete from public.site_settings where key in ('admin_username', 'admin_password_hash');

-- Keep seed post body as markdown-friendly text
update public.posts
set body = $md$The highest-leverage work in platform and data organizations is not another dashboard. It is leaving behind infrastructure that the next team can extend without a rewrite.

That means contracts, tenancy, observability, and cost controls as first-class design, not cleanup after a demo works.

## Example architecture

```mermaid
flowchart LR
  A[Product bet] --> B[Platform contract]
  B --> C[Reusable services]
  C --> D[Measurable outcomes]
```
$md$
where slug = 'platforms-over-projects';

-- Blog drafts + topics (also in schema-blog.sql for existing projects)
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

alter table public.posts
  add column if not exists blocks jsonb not null default '[]'::jsonb;

alter table public.posts
  add column if not exists hero_url text;
