import { supabase } from "./supabaseClient";
import { enrichPhotos } from "./photos";
import { withReactions } from "./reactions";
import { withTags } from "./tags";

// Builds one unified, chronological feed from data that already exists — public
// photos, new meets, news posts and new members — so the home feed feels like a
// real social app without any new tables. Every query is fail-safe: a missing
// table just contributes nothing.
export async function buildFeed(userId) {
  const safe = async (fn) => { try { return await fn(); } catch { return null; } };
  const items = [];

  // --- Photos (the main content) ---
  const { data: photos } = await safe(() => supabase
    .from("photos")
    .select("*, profiles!photos_user_id_fkey(username, avatar_path)")
    .eq("visibility", "public").eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(40)) || {};
  if (photos?.length) {
    const enriched = await withTags(await withReactions(await enrichPhotos(photos, userId), userId));
    enriched.forEach((p) => items.push({ kind: "photo", key: `photo-${p.id}`, when: p.created_at, photo: p }));
  }

  // --- New meets ---
  const { data: events } = await safe(() => supabase
    .from("events")
    .select("id, title, description, starts_at, location, created_at, created_by, creator:profiles!events_created_by_fkey(username)")
    .order("created_at", { ascending: false }).limit(10)) || {};
  (events || []).forEach((e) => items.push({ kind: "meet", key: `meet-${e.id}`, when: e.created_at, meet: e }));

  // --- News posts ---
  const { data: posts } = await safe(() => supabase
    .from("posts")
    .select("id, title, body, image_path, created_at")
    .order("created_at", { ascending: false }).limit(8)) || {};
  (posts || []).forEach((p) => items.push({ kind: "post", key: `post-${p.id}`, when: p.created_at, post: p }));

  // --- New members ---
  const { data: members } = await safe(() => supabase
    .from("profiles")
    .select("id, username, avatar_path, created_at")
    .order("created_at", { ascending: false }).limit(6)) || {};
  (members || []).forEach((m) => {
    if (m.created_at) items.push({ kind: "member", key: `member-${m.id}`, when: m.created_at, member: m });
  });

  items.sort((a, b) => new Date(b.when) - new Date(a.when));
  return items;
}
