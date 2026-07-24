-- ============================================================
-- West Side Car Crew — news board (opslagstavle)
-- Admin-managed posts shown publicly on the front page.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text,
  image_path text,               -- object path in the public bucket (nullable)
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;

-- Everyone can read the board (it's on the public front page).
drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts for select to anon, authenticated using (true);

-- Only admins can create / edit / delete posts.
drop policy if exists "posts insert admin" on public.posts;
create policy "posts insert admin" on public.posts
  for insert to authenticated with check (
    auth.uid() = author_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "posts update admin" on public.posts;
create policy "posts update admin" on public.posts
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (true);

drop policy if exists "posts delete admin" on public.posts;
create policy "posts delete admin" on public.posts
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
