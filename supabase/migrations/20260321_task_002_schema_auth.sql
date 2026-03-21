-- TASK-002: sessions/content_assets schema + RLS

create extension if not exists "pgcrypto";

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('topic', 'upload')),
  input_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  asset_type text not null,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
alter table public.content_assets enable row level security;

drop policy if exists sessions_select_own on public.sessions;
drop policy if exists sessions_insert_own on public.sessions;
drop policy if exists sessions_update_own on public.sessions;

create policy sessions_select_own
  on public.sessions
  for select
  using (user_id = auth.uid());

create policy sessions_insert_own
  on public.sessions
  for insert
  with check (user_id = auth.uid());

create policy sessions_update_own
  on public.sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists content_assets_select_own on public.content_assets;
drop policy if exists content_assets_insert_own on public.content_assets;
drop policy if exists content_assets_update_own on public.content_assets;

create policy content_assets_select_own
  on public.content_assets
  for select
  using (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

create policy content_assets_insert_own
  on public.content_assets
  for insert
  with check (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

create policy content_assets_update_own
  on public.content_assets
  for update
  using (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );
