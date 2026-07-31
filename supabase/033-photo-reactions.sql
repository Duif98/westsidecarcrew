-- ============================================================
-- West Side Car Crew — emoji reactions on photos
-- Mirrors message_reactions (008) but for the photos table, so members can
-- react with 🔥❤️😮👍 etc. on any photo — not only the plain heart like.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.photo_reactions (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (photo_id, user_id, emoji)
);
alter table public.photo_reactions enable row level security;

create index if not exists photo_reactions_photo_idx on public.photo_reactions (photo_id);

-- Reaction counts are shown publicly (like like-counts on the community grid),
-- so select is open to everyone; writes stay members-only.
drop policy if exists "photo reactions read" on public.photo_reactions;
create policy "photo reactions read" on public.photo_reactions for select using (true);

drop policy if exists "photo reactions insert own" on public.photo_reactions;
create policy "photo reactions insert own" on public.photo_reactions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "photo reactions delete own" on public.photo_reactions;
create policy "photo reactions delete own" on public.photo_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- Live reactions (ignore error if already in the publication).
do $$
begin
  alter publication supabase_realtime add table public.photo_reactions;
exception when duplicate_object then null;
end $$;
