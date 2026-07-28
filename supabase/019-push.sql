-- ============================================================
-- West Side Car Crew — Web Push subscriptions
-- Stores each member's browser push subscription so an Edge Function
-- can notify the crew about new meets / posts.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.push_subscriptions (
  endpoint    text primary key,           -- the subscription endpoint (unique per browser)
  user_id     uuid not null references public.profiles(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create index if not exists push_sub_user_idx on public.push_subscriptions (user_id);

-- A member manages only their own subscriptions. The Edge Function reads them
-- with the service-role key, which bypasses RLS — so no public/anon read policy.
drop policy if exists "push insert own" on public.push_subscriptions;
create policy "push insert own" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push update own" on public.push_subscriptions;
create policy "push update own" on public.push_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push delete own" on public.push_subscriptions;
create policy "push delete own" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "push read own" on public.push_subscriptions;
create policy "push read own" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- The VAPID PUBLIC key is not secret; store it in app_secrets (from 016) so the
-- client can fetch it. Run this INSERT separately with your generated key:
--   insert into public.app_secrets(key, value)
--   values ('vapid_public_key', 'BQ...your-public-key...')
--   on conflict (key) do update set value = excluded.value;
