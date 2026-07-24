-- ============================================================
-- West Side Car Crew — add-on: likes + member invite links
-- Run once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run.
-- ============================================================

-- ---------- Likes ----------
create table if not exists public.likes (
  photo_id   uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
alter table public.likes enable row level security;

-- Anyone may read likes (only opaque uuids; used for counts).
drop policy if exists "likes read" on public.likes;
create policy "likes read" on public.likes for select to anon, authenticated using (true);

-- A member may like/unlike only as themselves.
drop policy if exists "likes insert own" on public.likes;
create policy "likes insert own" on public.likes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "likes delete own" on public.likes;
create policy "likes delete own" on public.likes
  for delete to authenticated using (auth.uid() = user_id);

-- ---------- Invite: let logged-in members read the crew code ----------
-- Used to build invite links (…/login?code=…). Not callable anonymously,
-- so the code still never reaches non-members or the public site source.
create or replace function public.crew_code()
returns text language sql security definer set search_path = public as $$
  select value from public.app_config where key = 'signup_code';
$$;
grant execute on function public.crew_code() to authenticated;
