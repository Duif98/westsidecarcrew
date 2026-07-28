-- ============================================================
-- West Side Car Crew — let admins upload photos on a member's behalf
-- Broadens the photos INSERT policy so an admin can add a photo row with any
-- user_id (e.g. to fill a member's car showcase). Members are unchanged: they
-- can still only insert their own rows.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

drop policy if exists "photos insert own" on public.photos;
drop policy if exists "photos insert own or admin" on public.photos;

create policy "photos insert own or admin" on public.photos
  for insert to authenticated with check (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
