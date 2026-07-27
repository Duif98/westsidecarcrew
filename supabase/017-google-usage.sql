-- ============================================================
-- West Side Car Crew — site-side hard cap on Google Places usage
-- A shared monthly counter so the SITE itself stops making Google requests once
-- a safety ceiling is reached (then it falls back to the free OSM search). This
-- guards against our own bugs / runaway loops and total member usage — it can't
-- stop someone who extracted the key (only the key's domain-lock does that), but
-- it gives a hard, site-enforced ceiling. The counter resets each month (period
-- = 'YYYY-MM'), matching Google's monthly free tier.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.google_usage (
  period text primary key,            -- 'YYYY-MM' (UTC)
  count  bigint not null default 0
);
alter table public.google_usage enable row level security;

-- Members may read current usage; writes go only through the RPC below.
drop policy if exists "google usage read" on public.google_usage;
create policy "google usage read" on public.google_usage
  for select to authenticated using (true);

-- Current month's count (0 if none yet).
create or replace function public.google_usage_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce((select count from public.google_usage where period = to_char(now(), 'YYYY-MM')), 0);
$$;

-- Atomically add n to this month's count and return the new total. security
-- definer so members never write the table directly (avoids tampering).
create or replace function public.bump_google_usage(n int default 1)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  p text := to_char(now(), 'YYYY-MM');
  c bigint;
begin
  insert into public.google_usage (period, count)
  values (p, greatest(coalesce(n, 0), 0))
  on conflict (period) do update set count = google_usage.count + greatest(coalesce(n, 0), 0)
  returning count into c;
  return c;
end;
$$;

grant execute on function public.google_usage_count() to authenticated;
grant execute on function public.bump_google_usage(int) to authenticated;
