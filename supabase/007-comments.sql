-- ============================================================
-- West Side Car Crew — photo comments
-- Members can comment on photos; comments show in the lightbox.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

create index if not exists comments_photo_idx on public.comments (photo_id, created_at);

-- Comments sit on public photos, so anyone can read them (like the photos).
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select to anon, authenticated using (true);

-- Only logged-in members can post, and only as themselves.
drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);

-- A member can delete their own comment; an admin can delete any.
drop policy if exists "comments delete own or admin" on public.comments;
create policy "comments delete own or admin" on public.comments
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Live comments in the lightbox (ignore error if already in the publication).
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;
