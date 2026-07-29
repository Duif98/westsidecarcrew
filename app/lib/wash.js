import { supabase } from "./supabaseClient";

// "Vask bil" sessions — a lightweight, ephemeral beacon: a member says they're
// washing now / soon and where, others can join in. Everything fails soft so the
// page still renders before migration 028 is run (returns empty / throws on write).

const WASH_HOURS = 4; // a session drops off the list this long after it starts

// Active sessions (not yet expired), soonest first, with creator + who's joining.
export async function getActiveWashes() {
  const { data, error } = await supabase
    .from("wash_sessions")
    .select(
      "*, creator:profiles!wash_sessions_user_id_fkey(username, avatar_path), " +
      "joins:wash_joins(user_id, joiner:profiles!wash_joins_user_id_fkey(username))"
    )
    .gt("expires_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function startWash({ userId, status, location, note, startsAt }) {
  const start = status === "soon" && startsAt ? new Date(startsAt) : new Date();
  const expires = new Date(start.getTime() + WASH_HOURS * 3600 * 1000);
  const { data, error } = await supabase
    .from("wash_sessions")
    .insert({
      user_id: userId,
      status,
      location: (location || "").trim() || null,
      note: (note || "").trim() || null,
      starts_at: start.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endWash(id) {
  const { error } = await supabase.from("wash_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function joinWash(washId, userId) {
  const { error } = await supabase.from("wash_joins").insert({ wash_id: washId, user_id: userId });
  if (error && error.code !== "23505") throw error; // ignore "already joined"
}

export async function leaveWash(washId, userId) {
  const { error } = await supabase.from("wash_joins").delete().eq("wash_id", washId).eq("user_id", userId);
  if (error) throw error;
}
