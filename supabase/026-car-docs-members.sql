-- ============================================================
-- West Side Car Crew — let any member add car documents (not just admins)
-- Members can add a file/link to any car; the uploader (or an admin) can delete.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- Insert: any logged-in member, attributed to themselves (no spoofing).
drop policy if exists "car_docs insert admin" on public.car_docs;
drop policy if exists "car_docs insert member" on public.car_docs;
create policy "car_docs insert member" on public.car_docs
  for insert to authenticated with check (auth.uid() = uploaded_by);

-- Delete: the uploader or an admin.
drop policy if exists "car_docs delete admin" on public.car_docs;
drop policy if exists "car_docs delete own or admin" on public.car_docs;
create policy "car_docs delete own or admin" on public.car_docs
  for delete to authenticated using (
    auth.uid() = uploaded_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

notify pgrst, 'reload schema';
