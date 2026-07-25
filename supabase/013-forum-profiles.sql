-- ============================================================
-- West Side Car Crew — forum-style profiles
-- Profile fields (avatar/bio/location), claim curated cars, personal wall.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- Profile fields ----------
alter table public.profiles add column if not exists bio         text;
alter table public.profiles add column if not exists location    text;
alter table public.profiles add column if not exists avatar_path text;   -- object path in the public bucket

-- Members still have NO direct UPDATE policy on profiles (so nobody can set
-- is_admin on themselves). Editing avatar/bio/location goes through this RPC,
-- which only ever touches those three columns for the caller's own row.
create or replace function public.update_my_profile(p_bio text, p_location text, p_avatar_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set bio         = nullif(btrim(coalesce(p_bio, '')), ''),
         location    = nullif(btrim(coalesce(p_location, '')), ''),
         avatar_path = nullif(btrim(coalesce(p_avatar_path, '')), '')
   where id = auth.uid();
end; $$;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- ---------- Claim a curated car ----------
-- Attaches an unclaimed curated album (created_by is null) to the caller, so
-- the car shows on their profile. Admins can reassign via SQL if needed.
create or replace function public.claim_album(p_album_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.albums set created_by = auth.uid()
   where id = p_album_id and created_by is null;
  if not found then
    raise exception 'Bilen kan ikke claimes (allerede taget)';
  end if;
end; $$;
grant execute on function public.claim_album(uuid) to authenticated;

-- Release a car you claimed (curated cars only, so seeded cars can be re-claimed).
create or replace function public.release_album(p_album_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.albums set created_by = null
   where id = p_album_id and created_by = auth.uid() and is_curated;
end; $$;
grant execute on function public.release_album(uuid) to authenticated;

-- ---------- Personal wall (opslagstavle) ----------
create table if not exists public.wall_posts (
  id            uuid primary key default gen_random_uuid(),
  wall_owner_id uuid not null references public.profiles(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text,
  image_path    text,
  created_at    timestamptz not null default now()
);
alter table public.wall_posts enable row level security;
create index if not exists wall_posts_owner_idx on public.wall_posts (wall_owner_id, created_at);

-- Everyone can read walls (profiles are public).
drop policy if exists "wall read" on public.wall_posts;
create policy "wall read" on public.wall_posts for select to anon, authenticated using (true);

-- Any member can post (on their own wall or as a guest on someone else's).
drop policy if exists "wall insert" on public.wall_posts;
create policy "wall insert" on public.wall_posts
  for insert to authenticated with check (auth.uid() = author_id);

-- The author, the wall owner, or an admin can delete a post.
drop policy if exists "wall delete" on public.wall_posts;
create policy "wall delete" on public.wall_posts
  for delete to authenticated using (
    auth.uid() = author_id
    or auth.uid() = wall_owner_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

notify pgrst, 'reload schema';
