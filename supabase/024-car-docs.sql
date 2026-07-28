-- ============================================================
-- West Side Car Crew — car document catalogue (service manuals etc.)
-- Admins upload docs per car; members download them. Files live in the private
-- bucket (served via signed URLs, members only).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.car_docs (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid references public.albums(id) on delete cascade,
  title       text not null,
  doc_type    text,                 -- fx Servicemanual / Ejermanual / Andet
  file_path   text not null,        -- object path in the private bucket
  file_name   text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.car_docs enable row level security;
create index if not exists car_docs_album_idx on public.car_docs (album_id);

-- Members can read (download via signed URL); only admins add/remove.
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
