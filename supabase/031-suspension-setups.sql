-- ============================================================
-- West Side Car Crew — gemte undervogns-setups (/undervogn)
-- Et medlem kan gemme sine indtastede geometri-målinger (camber/toe/caster/
-- hjørnevægt/fjeder/offset) som et navngivet setup på sin profil og hente det
-- frem igen på tværs af enheder. Alt indhold er den enkelte brugers eget.
-- Kør én gang i Supabase → SQL Editor. Sikker at køre igen.
-- ============================================================

create table if not exists public.suspension_setups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  car        text,            -- fri-tekst bil/label, fx "Duif M4 – bane"
  notes      text,
  data       jsonb not null,  -- hele input-snapshot fra siden
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suspension_setups enable row level security;

create index if not exists suspension_setups_user_idx
  on public.suspension_setups (user_id, updated_at desc);

-- Kun ejeren kan læse/skrive sine egne setups.
drop policy if exists "susp read own" on public.suspension_setups;
create policy "susp read own" on public.suspension_setups
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "susp insert own" on public.suspension_setups;
create policy "susp insert own" on public.suspension_setups
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "susp update own" on public.suspension_setups;
create policy "susp update own" on public.suspension_setups
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "susp delete own" on public.suspension_setups;
create policy "susp delete own" on public.suspension_setups
  for delete to authenticated using (auth.uid() = user_id);
