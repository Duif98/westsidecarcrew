-- ============================================================
-- West Side Car Crew — meet comments (discussion thread per meet)
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.meet_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table public.meet_comments enable row level security;

create index if not exists meet_comments_event_idx on public.meet_comments (event_id, created_at);

-- Everyone can read (meets are public); members post; author or admin deletes.
drop policy if exists "meet_comments read" on public.meet_comments;
create policy "meet_comments read" on public.meet_comments
  for select to anon, authenticated using (true);

drop policy if exists "meet_comments insert own" on public.meet_comments;
create policy "meet_comments insert own" on public.meet_comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "meet_comments delete own or admin" on public.meet_comments;
create policy "meet_comments delete own or admin" on public.meet_comments
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Live updates.
do $$
begin
  alter publication supabase_realtime add table public.meet_comments;
exception when duplicate_object then null;
end $$;
