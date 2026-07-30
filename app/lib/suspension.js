import { supabase } from "./supabaseClient";

// Saved suspension setups (/undervogn). Two tiers:
//  • local presets  → localStorage, works for everyone incl. logged-out
//  • profile setups → Supabase table `suspension_setups` (members, migration 031)
// All Supabase calls fail soft so the page works before 031 is run.

const LS_KEY = "wscc_uv_presets";

// ---- local presets (localStorage) ------------------------------------
export function getLocalPresets() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

export function saveLocalPreset({ name, car, notes, data }) {
  const list = getLocalPresets();
  const row = { id: `l_${Date.now()}`, name, car: car || "", notes: notes || "", data, at: new Date().toISOString() };
  list.unshift(row);
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 40))); } catch {}
  return row;
}

export function deleteLocalPreset(id) {
  const list = getLocalPresets().filter((p) => p.id !== id);
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

// ---- profile setups (Supabase) ---------------------------------------
export async function getProfileSetups() {
  const { data, error } = await supabase
    .from("suspension_setups")
    .select("id, name, car, notes, data, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function saveProfileSetup({ userId, name, car, notes, data }) {
  const { data: row, error } = await supabase
    .from("suspension_setups")
    .insert({ user_id: userId, name, car: car || null, notes: notes || null, data })
    .select("id, name, car, notes, data, updated_at")
    .single();
  if (error) return { error };
  return { row };
}

export async function deleteProfileSetup(id) {
  const { error } = await supabase.from("suspension_setups").delete().eq("id", id);
  return { error };
}
