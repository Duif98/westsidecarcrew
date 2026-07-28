-- ============================================================
-- West Side Car Crew — car documents that can be a LINK instead of a file
-- (e.g. a big PDF hosted on Google Drive, above Supabase's 50 MB limit).
-- Supersedes 024: run this and you're covered whether or not 024 ran.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.car_docs (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid references public.albums(id) on delete cascade,
  title       text not null,
  doc_type    text,
  file_path   text,                 -- object path in the private bucket (for uploads)
  link_url    text,                 -- external link (for hotlinked docs)
  file_name   text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.car_docs enable row level security;
create index if not exists car_docs_album_idx on public.car_docs (album_id);

-- If 024 already made file_path NOT NULL, relax it (links have no file).
alter table public.car_docs add column if not exists link_url text;
alter table public.car_docs alter column file_path drop not null;

-- Members read (download/open); only admins add/remove.
drop policy if exists "car_docs read" on public.car_docs;
create policy "car_docs read" on public.car_docs for select to authenticated using (true);

drop policy if exists "car_docs insert admin" on public.car_docs;
create policy "car_docs insert admin" on public.car_docs
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "car_docs delete admin" on public.car_docs;
create policy "car_docs delete admin" on public.car_docs
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

notify pgrst, 'reload schema';
