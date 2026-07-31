import { supabase } from "./supabaseClient";

// Edit a post's caption and log the change to photo_edits so the history can be
// viewed later. Owner-only (enforced by RLS + the calling UI).
export async function updateCaption({ photoId, oldCaption, newCaption, editorId }) {
  const clean = (newCaption || "").trim() || null;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("photos")
    .update({ caption: clean, edited_at: now })
    .eq("id", photoId);
  if (error) throw new Error(error.message);
  // Log history (best-effort — a missing table shouldn't block the edit itself).
  try {
    await supabase.from("photo_edits").insert({
      photo_id: photoId,
      editor_id: editorId,
      old_caption: oldCaption || null,
      new_caption: clean,
    });
  } catch {}
  return { caption: clean, edited_at: now };
}

// Edit history, newest first. Fail-safe: returns [] before 036 is run.
export async function fetchEditHistory(photoId) {
  try {
    const { data, error } = await supabase
      .from("photo_edits")
      .select("id, old_caption, new_caption, created_at, editor:profiles!photo_edits_editor_id_fkey(username)")
      .eq("photo_id", photoId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}
