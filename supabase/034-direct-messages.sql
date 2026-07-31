-- ============================================================
-- West Side Car Crew — 1:1 direct messages
-- Private member-to-member chat (separate from the shared crew room).
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.dm_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content      text not null default '',
  image_path   text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
alter table public.dm_messages enable row level security;

create index if not exists dm_pair_idx on public.dm_messages (sender_id, recipient_id, created_at);
create index if not exists dm_recipient_idx on public.dm_messages (recipient_id, created_at);

-- Only the two parties can read a message. Realtime honours RLS, so members
-- only ever receive rows from their own conversations.
drop policy if exists "dm read own" on public.dm_messages;
create policy "dm read own" on public.dm_messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "dm insert own" on public.dm_messages;
create policy "dm insert own" on public.dm_messages
  for insert to authenticated with check (auth.uid() = sender_id);

-- Only the recipient may mark a message read (set read_at); nothing else changes.
drop policy if exists "dm mark read" on public.dm_messages;
create policy "dm mark read" on public.dm_messages
  for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- You can delete (unsend) your own messages.
drop policy if exists "dm delete own" on public.dm_messages;
create policy "dm delete own" on public.dm_messages
  for delete to authenticated using (auth.uid() = sender_id);

do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception when duplicate_object then null;
end $$;
