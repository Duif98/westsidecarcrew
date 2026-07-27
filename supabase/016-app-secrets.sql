-- ============================================================
-- West Side Car Crew — members-only client config (app_secrets)
-- Holds keys that must reach the browser but should NOT be handed to the public
-- (e.g. the Google Maps API key). Only LOGGED-IN members can read it, so anon
-- visitors and bots on the public site never receive it. Combined with the
-- key's own domain restriction + quota cap in Google Cloud, that keeps abuse
-- bounded even though a client-side Maps key is, by design, visible to whoever
-- loads it.
--
-- The key VALUE is never committed — run this file to create the table, then
-- insert the value separately in the SQL editor (kept out of GitHub).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

-- Read: logged-in members only. No insert/update/delete policies exist, so only
-- the SQL editor / service role can write the values.
drop policy if exists "app secrets read" on public.app_secrets;
create policy "app secrets read" on public.app_secrets
  for select to authenticated using (true);
