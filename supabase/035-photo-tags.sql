-- ============================================================
-- West Side Car Crew — tag members and cars in photos
-- A photo can tag people (profiles) and/or cars (albums). Shown as chips in the
-- lightbox that link to the profile / car page.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.photo_tags (
  id              uuid primary key default gen_random_uuid(),
  photo_id        uuid not null references public.photos(id) on delete cascade,
  tagged_user_id  uuid references public.profiles(id) on delete cascade,
  tagged_album_id uuid references public.albums(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  -- exactly one of user / album per row
  check ((tagged_user_id is not null)::int + (tagged_album_id is not null)::int = 1)
);
alter table public.photo_tags enable row level security;

create index if not exists photo_tags_photo_idx on public.photo_tags (photo_id);
create unique index if not exists photo_tags_uniq_user on public.photo_tags (photo_id, tagged_user_id) where tagged_user_id is not null;
create unique index if not exists photo_tags_uniq_album on public.photo_tags (photo_id, tagged_album_id) where tagged_album_id is not null;

-- Tags are public (photos are public); writing is limited to the photo's owner
-- or an admin.
drop policy if exists "photo tags read" on public.photo_tags;
create policy "photo tags read" on public.photo_tags for select using (true);

drop policy if exists "photo tags insert" on public.photo_tags;
create policy "photo tags insert" on public.photo_tags
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and (
      exists (select 1 from public.photos p where p.id = photo_id and p.user_id = auth.uid())
      or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
    )
  );

drop policy if exists "photo tags delete" on public.photo_tags;
create policy "photo tags delete" on public.photo_tags
  for delete to authenticated
  using (
    auth.uid() = created_by
    or exists (select 1 from public.photos p where p.id = photo_id and p.user_id = auth.uid())
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  );
