import { supabase } from "./supabaseClient";

// Admin member management. All writes go through security-definer RPCs
// (migration 032) that verify the caller is an admin. Fail soft before 032.

export async function getMembers() {
  // Try with created_at ordering; fall back if the column select/order fails.
  let { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_admin, avatar_path, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    const r = await supabase.from("profiles").select("*");
    data = r.data;
  }
  return data || [];
}

export async function setMemberRole(targetId, makeAdmin) {
  const { error } = await supabase.rpc("admin_set_role", { p_target: targetId, p_admin: makeAdmin });
  return { error };
}

export async function renameMember(targetId, username) {
  const { error } = await supabase.rpc("admin_update_username", { p_target: targetId, p_username: username });
  return { error };
}

export async function deleteMember(targetId) {
  const { error } = await supabase.rpc("admin_delete_member", { p_target: targetId });
  return { error };
}

// Lightweight counts for the admin overview. Each is fail-safe (missing table
// or policy → 0) so the panel always renders.
async function count(table, filter) {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c || 0;
  } catch { return 0; }
}

export async function getAdminStats() {
  const [members, events, posts] = await Promise.all([
    count("profiles"),
    count("events"),
    count("posts"),
  ]);
  return { members, events, posts };
}
