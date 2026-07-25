-- ============================================================
-- West Side Car Crew — events / meets calendar
-- Members plan meets; everyone sees the next one on the front page.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  location     text,
  location_url text,                 -- optional maps / link
  starts_at    timestamptz not null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.events enable row level security;

create index if not exists events_starts_idx on public.events (starts_at);

-- Everyone can read events (the front page shows the next meet).
drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select to anon, authenticated using (true);

-- Any logged-in member can create a meet as themselves.
drop policy if exists "events insert own" on public.events;
create policy "events insert own" on public.events
  for insert to authenticated with check (auth.uid() = created_by);

-- The creator can edit/delete their meet; admins can manage any.
drop policy if exists "events update own or admin" on public.events;
create policy "events update own or admin" on public.events
  for update to authenticated using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (true);

drop policy if exists "events delete own or admin" on public.events;
create policy "events delete own or admin" on public.events
  for delete to authenticated using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------- RSVPs ----------
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null check (status in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.event_rsvps enable row level security;

create index if not exists rsvps_event_idx on public.event_rsvps (event_id);

-- Anyone can read RSVPs (counts + who's coming show publicly).
drop policy if exists "rsvps read" on public.event_rsvps;
create policy "rsvps read" on public.event_rsvps for select to anon, authenticated using (true);

-- Members manage only their own RSVP.
drop policy if exists "rsvps insert own" on public.event_rsvps;
create policy "rsvps insert own" on public.event_rsvps
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "rsvps update own" on public.event_rsvps;
create policy "rsvps update own" on public.event_rsvps
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rsvps delete own" on public.event_rsvps;
create policy "rsvps delete own" on public.event_rsvps
  for delete to authenticated using (auth.uid() = user_id);

-- Live meet updates on the front page (ignore error if already added).
do $$
begin
  alter publication supabase_realtime add table public.events;
  alter publication supabase_realtime add table public.event_rsvps;
exception when duplicate_object then null;
end $$;
