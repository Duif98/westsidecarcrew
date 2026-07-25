-- ============================================================
-- West Side Car Crew — car profiles + build threads (byggetråd)
-- Specs on each album + a timeline of build entries.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- Spec fields on albums ----------
alter table public.albums add column if not exists make        text;
alter table public.albums add column if not exists model       text;
alter table public.albums add column if not exists model_year  int;
alter table public.albums add column if not exists power_hp    int;
alter table public.albums add column if not exists drivetrain  text;   -- fx RWD / AWD
alter table public.albums add column if not exists engine      text;   -- fx 3.0 R6 Twin-Turbo
alter table public.albums add column if not exists mods        text;   -- free text list of modifications

-- Let an album's creator edit its own specs (admins already can via 003).
drop policy if exists "albums update own" on public.albums;
create policy "albums update own" on public.albums
  for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- ---------- Build thread entries ----------
create table if not exists public.build_entries (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid not null references public.albums(id) on delete cascade,
  title      text not null,
  body       text,
  image_path text,               -- object path in the public bucket (nullable)
  entry_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.build_entries enable row level security;

create index if not exists build_entries_album_idx on public.build_entries (album_id, entry_date);

-- Everyone can read build threads (they're on public car profiles).
drop policy if exists "build read" on public.build_entries;
create policy "build read" on public.build_entries for select to anon, authenticated using (true);

-- The album's owner (or an admin) can add entries, as themselves.
drop policy if exists "build insert owner or admin" on public.build_entries;
create policy "build insert owner or admin" on public.build_entries
  for insert to authenticated with check (
    auth.uid() = created_by
    and (
      exists (select 1 from public.albums a where a.id = album_id and a.created_by = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- The entry's author or an admin can delete it.
drop policy if exists "build delete own or admin" on public.build_entries;
create policy "build delete own or admin" on public.build_entries
  for delete to authenticated using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
