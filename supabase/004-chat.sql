-- ============================================================
-- West Side Car Crew — Phase 2: shared crew chat
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

-- Members-only: any logged-in member can read the chat and post as themselves.
drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select to authenticated using (true);

drop policy if exists "messages insert own" on public.messages;
create policy "messages insert own" on public.messages
  for insert to authenticated with check (auth.uid() = user_id);

-- A member can delete their own messages; an admin can delete any.
drop policy if exists "messages delete own or admin" on public.messages;
create policy "messages delete own or admin" on public.messages
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Enable realtime for the chat (ignore error if it is already in the publication).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
