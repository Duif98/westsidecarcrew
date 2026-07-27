-- ============================================================
-- West Side Car Crew — optional event link on a meet
-- A place for a Facebook event (or any link) so it shows as a clickable button
-- on the meet instead of raw text.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

alter table public.events add column if not exists link_url text;
