-- ============================================================
-- West Side Car Crew — Supabase setup
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).
-- ============================================================

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values ('private', 'private', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('public', 'public', true)
on conflict (id) do nothing;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles read (auth)" on public.profiles;
create policy "profiles read (auth)" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles read (anon)" on public.profiles;
create policy "profiles read (anon)" on public.profiles
  for select to anon using (true);  -- usernames shown next to public photos

-- NB: no client-side UPDATE policy on profiles on purpose — otherwise a member
-- could set is_admin = true on their own row. Admin is granted only via SQL:
--   update public.profiles set is_admin = true where username = '...';
drop policy if exists "profiles update own" on public.profiles;

-- ---------- Photos ----------
create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  bucket     text not null check (bucket in ('public', 'private')),
  path       text not null,
  visibility text not null check (visibility in ('public', 'private')),
  approved   boolean not null default false,
  caption    text,
  car        text,
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

-- Logged-in members can see every photo row (private + public).
drop policy if exists "photos read (members)" on public.photos;
create policy "photos read (members)" on public.photos
  for select to authenticated using (true);

-- Anonymous visitors (home page) see only approved public photos.
drop policy if exists "photos read (anon approved public)" on public.photos;
create policy "photos read (anon approved public)" on public.photos
  for select to anon using (visibility = 'public' and approved = true);

-- Users can add their own photo rows.
drop policy if exists "photos insert own" on public.photos;
create policy "photos insert own" on public.photos
  for insert to authenticated with check (auth.uid() = user_id);

-- Owners can update their own rows; admins can update any (approval).
drop policy if exists "photos update own or admin" on public.photos;
create policy "photos update own or admin" on public.photos
  for update to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (true);

-- Owners can delete their own; admins can delete any.
drop policy if exists "photos delete own or admin" on public.photos;
create policy "photos delete own or admin" on public.photos
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------- Signup code (kept server-side, never sent to the browser) ----------
create table if not exists public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;  -- no policies -> clients cannot read it

insert into public.app_config (key, value) values ('signup_code', '!!westside!!')
on conflict (key) do update set value = excluded.value;

-- Returns true if the code matches. Callable anonymously so the signup page
-- can validate before creating an account. Does NOT reveal the code.
create or replace function public.check_signup_code(code text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.app_config where key = 'signup_code' and value = code);
$$;
grant execute on function public.check_signup_code(text) to anon, authenticated;

-- Creates the caller's profile, gated by the signup code. Called right after
-- auth.signUp() while the new user is authenticated.
create or replace function public.create_profile(p_username text, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.app_config where key = 'signup_code' and value = p_code) then
    raise exception 'Ugyldig kode';
  end if;
  insert into public.profiles (id, username) values (auth.uid(), p_username);
end; $$;
grant execute on function public.create_profile(text, text) to authenticated;

-- ---------- Storage access policies ----------
-- Read private objects: any logged-in member (served via signed URLs).
drop policy if exists "private read (members)" on storage.objects;
create policy "private read (members)" on storage.objects
  for select to authenticated using (bucket_id = 'private');

-- Upload only into your own folder ("<uid>/..."), in either bucket.
drop policy if exists "upload own folder" on storage.objects;
create policy "upload own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('private', 'public')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete your own objects; admins can delete any.
drop policy if exists "delete own or admin (storage)" on storage.objects;
create policy "delete own or admin (storage)" on storage.objects
  for delete to authenticated using (
    bucket_id in ('private', 'public')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );
-- (Reading the 'public' bucket needs no policy — the bucket is public.)
