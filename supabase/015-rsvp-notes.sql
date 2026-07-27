-- ============================================================
-- West Side Car Crew — private RSVP reasons ("kommer ikke" begrundelse)
-- A member who can't (or maybe won't) make a meet may leave a short reason.
-- Kept in its own table so it is readable by MEMBERS ONLY, never the public
-- (event_rsvps stays public for counts; column-level privacy isn't possible
-- with row-level security, so a separate authenticated-only table is cleanest).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.event_rsvp_notes (
  event_id   uuid not null references public.events(id)   on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  note       text,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_rsvp_notes enable row level security;

-- Read: logged-in members only (this is the "not public" part).
drop policy if exists "rsvp notes read" on public.event_rsvp_notes;
create policy "rsvp notes read" on public.event_rsvp_notes
  for select to authenticated using (true);

-- Each member writes/edits/removes only their own reason.
drop policy if exists "rsvp notes insert own" on public.event_rsvp_notes;
create policy "rsvp notes insert own" on public.event_rsvp_notes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "rsvp notes update own" on public.event_rsvp_notes;
create policy "rsvp notes update own" on public.event_rsvp_notes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rsvp notes delete own" on public.event_rsvp_notes;
create policy "rsvp notes delete own" on public.event_rsvp_notes
  for delete to authenticated using (auth.uid() = user_id);

-- Live updates so a reason appears for other members without a reload.
do $$
begin
  alter publication supabase_realtime add table public.event_rsvp_notes;
exception when duplicate_object then null;
end $$;
