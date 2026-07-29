import { supabase } from "./supabaseClient";

// Convoy live tracker. Members upsert their own position while sharing; others
// read every position updated recently. Fails soft so the page renders before
// migration 029 is run.

export const CONVOY_STALE_MS = 120000; // hide a member 2 min after their last fix

export async function updateMyPosition({ userId, lat, lng }) {
  const { error } = await supabase
    .from("live_positions")
    .upsert({ user_id: userId, lat, lng, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function clearMyPosition(userId) {
  try { await supabase.from("live_positions").delete().eq("user_id", userId); } catch {}
}

// Everyone sharing within the freshness window, with name + avatar.
export async function getLivePositions() {
  const since = new Date(Date.now() - CONVOY_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from("live_positions")
    .select("user_id, lat, lng, updated_at, profile:profiles!live_positions_user_id_fkey(username, avatar_path)")
    .gt("updated_at", since);
  if (error) return [];
  return data || [];
}
