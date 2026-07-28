-- ============================================================
-- West Side Car Crew — mark a car as sold
-- Sold cars are shown in a separate "Solgte biler" section on the owner's
-- profile and are kept out of the front-page garage. Owners edit it via the
-- existing "albums update own" policy.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

alter table public.albums add column if not exists sold boolean not null default false;

notify pgrst, 'reload schema';
