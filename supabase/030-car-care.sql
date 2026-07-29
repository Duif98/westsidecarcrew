-- ============================================================
-- West Side Car Crew — car care & owner notes
-- Owners can note the products/fluids they run on a car (oil, wax, tyres, pads…)
-- plus a short owner's-word review. Shown on the car's public page + profile.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- A short "sådan er den at eje" note straight on the album.
alter table public.albums add column if not exists owner_review text;

-- Itemized products / fluids the owner uses on this car.
create table if not exists public.car_products (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid not null references public.albums(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null default 'Andet',
  name       text not null,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.car_products enable row level security;

create index if not exists car_products_album_idx on public.car_products (album_id, created_at);

-- Public read (shown on the public car page, like specs); the car's owner (or an
-- admin) manages the rows.
drop policy if exists "car_products read" on public.car_products;
create policy "car_products read" on public.car_products
  for select to anon, authenticated using (true);

drop policy if exists "car_products insert own" on public.car_products;
create policy "car_products insert own" on public.car_products
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "car_products update own or admin" on public.car_products;
create policy "car_products update own or admin" on public.car_products
  for update to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "car_products delete own or admin" on public.car_products;
create policy "car_products delete own or admin" on public.car_products
  for delete to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
