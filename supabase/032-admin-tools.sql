-- ============================================================
-- West Side Car Crew — admin: medlems-administration
-- Giv/fjern admin, omdøb, og fjern et medlem — alt via security-definer
-- RPC'er der SELV tjekker at KALDEREN er admin (medlemmer har ingen direkte
-- UPDATE-policy på profiles, så ingen kan gøre sig selv til admin).
-- Kør én gang i Supabase → SQL Editor. Sikker at køre igen.
-- ============================================================

-- Er den nuværende bruger admin?
create or replace function public.admin_is()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;
grant execute on function public.admin_is() to authenticated;

-- Sæt/fjern admin-rollen på et medlem.
create or replace function public.admin_set_role(p_target uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is() then raise exception 'Kun admins kan ændre roller'; end if;
  update public.profiles set is_admin = coalesce(p_admin, false) where id = p_target;
end; $$;
grant execute on function public.admin_set_role(uuid, boolean) to authenticated;

-- Omdøb et medlem (unikt brugernavn håndhæves af kolonnens unique-constraint).
create or replace function public.admin_update_username(p_target uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := nullif(btrim(coalesce(p_username, '')), '');
begin
  if not public.admin_is() then raise exception 'Kun admins kan omdøbe'; end if;
  if v is null then raise exception 'Brugernavn må ikke være tomt'; end if;
  update public.profiles set username = v where id = p_target;
end; $$;
grant execute on function public.admin_update_username(uuid, text) to authenticated;

-- Fjern et medlem (sletter profil-rækken; deres biler/fotos m.m. fjernes via
-- on delete cascade). Auth-kontoen i auth.users kan kun slettes fra Supabase-
-- dashboardet (kræver service-role) — men uden profil kan de ikke bruge sitet.
create or replace function public.admin_delete_member(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_is() then raise exception 'Kun admins kan fjerne medlemmer'; end if;
  if p_target = auth.uid() then raise exception 'Du kan ikke fjerne dig selv'; end if;
  delete from public.profiles where id = p_target;
end; $$;
grant execute on function public.admin_delete_member(uuid) to authenticated;
