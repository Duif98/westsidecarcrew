-- ============================================================
-- West Side Car Crew — editable posts + edit history (Facebook-style)
-- A post's caption can be edited by its owner. Every change is logged so an
-- admin (and the owner) can see the edit history. Editing is owner-only at the
-- UI level; admins keep their existing photos-update rights for approval, but
-- the feed only offers "edit" on your own posts.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- Marks a post as edited so the feed can show a "· redigeret" label.
alter table public.photos add column if not exists edited_at timestamptz;

create table if not exists public.photo_edits (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.photos(id) on delete cascade,
  editor_id   uuid not null references public.profiles(id) on delete cascade,
  old_caption text,
  new_caption text,
  created_at  timestamptz not null default now()
);
alter table public.photo_edits enable row level security;

create index if not exists photo_edits_photo_idx on public.photo_edits (photo_id, created_at desc);

-- History is visible to the post's owner and to admins (not the public).
drop policy if exists "photo edits read" on public.photo_edits;
create policy "photo edits read" on public.photo_edits
  for select to authenticated using (
    exists (select 1 from public.photos p where p.id = photo_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  );

-- Only the owner of the post can log an edit (editing is owner-only).
drop policy if exists "photo edits insert own" on public.photo_edits;
create policy "photo edits insert own" on public.photo_edits
  for insert to authenticated with check (
    auth.uid() = editor_id
    and exists (select 1 from public.photos p where p.id = photo_id and p.user_id = auth.uid())
  );
