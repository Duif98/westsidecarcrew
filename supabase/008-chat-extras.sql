-- ============================================================
-- West Side Car Crew — chat reactions + image sharing
-- Emoji reactions on messages and inline images in the crew chat.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- ============================================================

-- ---------- Inline images in chat ----------
-- Path to an object in the public bucket (nullable). Content may be '' when a
-- message is image-only.
alter table public.messages add column if not exists image_path text;

-- ---------- Reactions ----------
create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;

create index if not exists reactions_message_idx on public.message_reactions (message_id);

-- Members-only, same as the chat itself.
drop policy if exists "reactions read" on public.message_reactions;
create policy "reactions read" on public.message_reactions for select to authenticated using (true);

drop policy if exists "reactions insert own" on public.message_reactions;
create policy "reactions insert own" on public.message_reactions
  for insert to authenticated with check (auth.uid() = user_id);

-- You can only remove your own reaction.
drop policy if exists "reactions delete own" on public.message_reactions;
create policy "reactions delete own" on public.message_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- Live reactions (ignore error if already in the publication).
do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;
