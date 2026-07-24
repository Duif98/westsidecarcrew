-- ============================================================
-- West Side Car Crew — realtime for the chat member roster
-- Lets the online/offline list update automatically when someone new signs up.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
