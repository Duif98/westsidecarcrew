import { supabase } from "./supabaseClient";

// Emoji reactions on photos (separate from the plain heart "like", which still
// drives the leaderboard). Mirrors the chat's message_reactions flow.
export const PHOTO_EMOJIS = ["🔥", "❤️", "😍", "😮", "👏", "😂"];

// Attach reaction rows to photos. Fail-safe: if 033 isn't run yet, photos render
// with no reactions.
export async function withReactions(rows, userId) {
  if (!rows.length) return rows;
  try {
    const ids = rows.map((r) => r.id);
    const { data, error } = await supabase
      .from("photo_reactions")
      .select("id, photo_id, user_id, emoji")
      .in("photo_id", ids);
    if (error) throw error;
    const byPhoto = {};
    (data || []).forEach((r) => {
      (byPhoto[r.photo_id] = byPhoto[r.photo_id] || []).push(r);
    });
    return rows.map((r) => ({ ...r, reactions: byPhoto[r.id] || [] }));
  } catch {
    return rows.map((r) => ({ ...r, reactions: [] }));
  }
}

export async function fetchReactions(photoId) {
  const { data, error } = await supabase
    .from("photo_reactions")
    .select("id, photo_id, user_id, emoji")
    .eq("photo_id", photoId);
  if (error) throw new Error(error.message);
  return data || [];
}

// Toggle one emoji for the current user. Returns the inserted row (or null on
// removal) so callers can update state without a refetch.
export async function togglePhotoReaction({ photoId, userId, emoji, existingId }) {
  if (existingId) {
    const { error } = await supabase.from("photo_reactions").delete().eq("id", existingId);
    if (error) throw new Error(error.message);
    return null;
  }
  const { data, error } = await supabase
    .from("photo_reactions")
    .insert({ photo_id: photoId, user_id: userId, emoji })
    .select("id, photo_id, user_id, emoji")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Collapse a reaction list into { emoji: {count, mine, myId} } for rendering.
export function groupReactions(list, userId) {
  const g = {};
  (list || []).forEach((r) => {
    g[r.emoji] = g[r.emoji] || { count: 0, mine: false, myId: null };
    g[r.emoji].count++;
    if (r.user_id === userId) { g[r.emoji].mine = true; g[r.emoji].myId = r.id; }
  });
  return g;
}
