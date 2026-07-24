-- ============================================================
-- West Side Car Crew — add-on: car albums + admin-chosen covers
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- Albums ----------
create table if not exists public.albums (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique,
  title          text not null,
  owner_name     text,
  created_by     uuid references public.profiles(id) on delete set null,
  cover_photo_id uuid,            -- id of a photo chosen as the card cover (no FK on purpose)
  is_curated     boolean not null default false,
  sort           int not null default 100,
  created_at     timestamptz not null default now()
);
alter table public.albums enable row level security;

drop policy if exists "albums read" on public.albums;
create policy "albums read" on public.albums for select to anon, authenticated using (true);

-- Any logged-in member can create a new album.
drop policy if exists "albums insert" on public.albums;
create policy "albums insert" on public.albums
  for insert to authenticated with check (auth.uid() = created_by);

-- Only admins can edit an album (e.g. set the cover) or delete it.
drop policy if exists "albums update admin" on public.albums;
create policy "albums update admin" on public.albums
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (true);

drop policy if exists "albums delete admin" on public.albums;
create policy "albums delete admin" on public.albums
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------- Link photos to an album ----------
alter table public.photos add column if not exists album_id uuid references public.albums(id) on delete set null;

-- ---------- Seed the existing curated cars as albums ----------
insert into public.albums (slug, title, owner_name, is_curated, sort) values
  ('mark-gtr',         'Nissan GT-R',        'Mark',     true, 1),
  ('duif-m4',          'BMW M4',             'Duif',     true, 2),
  ('c63s',             'Mercedes-AMG C63 S', 'Sneff',    true, 3),
  ('corvette',         'Chevrolet Corvette', 'Duif',     true, 4),
  ('lukas-m4',         'BMW M4',             'Lukas',    true, 5),
  ('hausmann-lincoln', 'Lincoln Continental','Hausmann', true, 6),
  ('s8',               'Audi S8',            'Thomas',   true, 7),
  ('nic-leon',         'SEAT Leon Cupra',    'Nic',      true, 8),
  ('panamera',         'Porsche Panamera',   'Dennis',   true, 9)
on conflict (slug) do nothing;
