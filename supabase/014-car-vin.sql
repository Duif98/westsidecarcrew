-- ============================================================
-- West Side Car Crew — VIN on cars (for parts-catalog deep links)
-- Adds a VIN/stelnummer to each album so a car profile can deep-link
-- into an external OEM parts catalog (PartSouq VIN search, RealOEM for BMW).
-- We only store the VIN + link out — we never rehost catalog data.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- VIN field on albums ----------
-- 17-char vehicle identification number. Nullable; filled in per car by the
-- owner or an admin. Existing UPDATE policies already cover who may write it:
--   "albums update own"   (010) — the car's owner (created_by)
--   "albums update admin" (003) — any admin
alter table public.albums add column if not exists vin text;

notify pgrst, 'reload schema';
