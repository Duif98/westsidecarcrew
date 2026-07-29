-- ============================================================
-- West Side Car Crew — "Vask bil" sessions (spontaneous car-wash beacon)
-- A member announces they're washing their car now / in a couple of hours and
-- where; others can join in ("vasker med"). Sessions auto-expire from the list.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.wash_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'now' check (status in ('now', 'soon')),
  location   text,
  note       text,
  starts_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);
alter table public.wash_sessions enable row level security;

create index if not exists wash_sessions_active_idx on public.wash_sessions (expires_at, starts_at);

-- Members-only feature: only logged-in members read; author inserts own; author
-- or admin deletes (to end early).
drop policy if exists "wash read" on public.wash_sessions;
create policy "wash read" on public.wash_sessions
  for select to authenticated using (true);

drop policy if exists "wash insert own" on public.wash_sessions;
create policy "wash insert own" on public.wash_sessions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "wash delete own or admin" on public.wash_sessions;
create policy "wash delete own or admin" on public.wash_sessions
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Who's washing along.
create table if not exists public.wash_joins (
  wash_id    uuid not null references public.wash_sessions(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wash_id, user_id)
);
alter table public.wash_joins enable row level security;

drop policy if exists "wash_joins read" on public.wash_joins;
create policy "wash_joins read" on public.wash_joins
  for select to authenticated using (true);

drop policy if exists "wash_joins insert own" on public.wash_joins;
create policy "wash_joins insert own" on public.wash_joins
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "wash_joins delete own" on public.wash_joins;
create policy "wash_joins delete own" on public.wash_joins
  for delete to authenticated using (auth.uid() = user_id);

-- Live updates for both tables.
do $$
begin
  alter publication supabase_realtime add table public.wash_sessions;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.wash_joins;
exception when duplicate_object then null;
end $$;
