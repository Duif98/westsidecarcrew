-- ============================================================
-- West Side Car Crew — meet photo albums + map coordinates
-- Tie photos to a meet, and give meets an optional map pin.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- Photos can belong to a meet ----------
alter table public.photos add column if not exists event_id uuid references public.events(id) on delete set null;
create index if not exists photos_event_idx on public.photos (event_id);

-- ---------- Meets can have a map pin ----------
alter table public.events add column if not exists lat double precision;
alter table public.events add column if not exists lng double precision;

-- No new RLS needed: photos already use "members read all / anon read approved
-- public", and events are world-readable.
