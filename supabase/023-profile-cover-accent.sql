-- ============================================================
-- West Side Car Crew — profile cover image + personal accent colour
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists cover_path   text;
alter table public.profiles add column if not exists accent_color text;  -- #rrggbb

-- Extend the self-service profile RPC with the two new fields. The 5-arg version
-- with defaults also satisfies the old 3-arg calls, so nothing breaks. Members
-- still have no direct UPDATE policy (is_admin stays safe).
drop function if exists public.update_my_profile(text, text, text);

create or replace function public.update_my_profile(
  p_bio text,
  p_location text,
  p_avatar_path text,
  p_cover_path text default null,
  p_accent_color text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set bio          = nullif(btrim(coalesce(p_bio, '')), ''),
         location     = nullif(btrim(coalesce(p_location, '')), ''),
         avatar_path  = nullif(btrim(coalesce(p_avatar_path, '')), ''),
         cover_path   = nullif(btrim(coalesce(p_cover_path, '')), ''),
         accent_color = case when p_accent_color ~ '^#[0-9a-fA-F]{6}$' then p_accent_color else null end
   where id = auth.uid();
end; $$;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
