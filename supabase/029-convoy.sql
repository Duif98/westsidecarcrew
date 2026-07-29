-- ============================================================
-- West Side Car Crew — convoy live tracker (live_positions)
-- While a group cruise is running, opted-in members share their live position so
-- the convoy can see each other on a map. One row per member (upserted), deleted
-- when they stop. Only the current position is kept — no history.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.live_positions (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  updated_at timestamptz not null default now()
);
alter table public.live_positions enable row level security;

-- Members-only: any logged-in member sees the convoy; each member writes/clears
-- only their own row.
drop policy if exists "live read" on public.live_positions;
create policy "live read" on public.live_positions
  for select to authenticated using (true);

drop policy if exists "live insert own" on public.live_positions;
create policy "live insert own" on public.live_positions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "live update own" on public.live_positions;
create policy "live update own" on public.live_positions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "live delete own" on public.live_positions;
create policy "live delete own" on public.live_positions
  for delete to authenticated using (auth.uid() = user_id);

-- Live updates.
do $$
begin
  alter publication supabase_realtime add table public.live_positions;
exception when duplicate_object then null;
end $$;
