import { supabase } from "./supabaseClient";

// Tag members (profiles) and cars (albums) in a photo. Public read; only the
// photo owner or an admin may add/remove tags (enforced by RLS in 035).

// Resolve tags for a single photo into display-ready chips.
export async function fetchPhotoTags(photoId) {
  try {
    const { data, error } = await supabase
      .from("photo_tags")
      .select("id, tagged_user_id, tagged_album_id, user:profiles!photo_tags_tagged_user_id_fkey(username), album:albums!photo_tags_tagged_album_id_fkey(slug, title)")
      .eq("photo_id", photoId);
    if (error) throw error;
    return (data || []).map((t) => t.tagged_user_id
      ? { id: t.id, kind: "user", label: t.user?.username || "medlem", href: t.user?.username ? `/profil?u=${encodeURIComponent(t.user.username)}` : null }
      : { id: t.id, kind: "album", label: t.album?.title || "bil", href: t.album?.slug ? `/bil/${t.album.slug}/` : null });
  } catch {
    return [];
  }
}

// Map a raw photo_tags row (with embeds) into a display chip.
function toChip(t) {
  return t.tagged_user_id
    ? { id: t.id, kind: "user", label: t.user?.username || "medlem", href: t.user?.username ? `/profil?u=${encodeURIComponent(t.user.username)}` : null }
    : { id: t.id, kind: "album", label: t.album?.title || "bil", href: t.album?.slug ? `/bil/${t.album.slug}/` : null };
}

// Batch-attach tag chips to many photos in one query (feed/gallery). Fail-safe:
// before 035 is run each photo gets an empty tags array.
export async function withTags(rows) {
  if (!rows.length) return rows;
  try {
    const ids = rows.map((r) => r.id);
    const { data, error } = await supabase
      .from("photo_tags")
      .select("id, photo_id, tagged_user_id, tagged_album_id, user:profiles!photo_tags_tagged_user_id_fkey(username), album:albums!photo_tags_tagged_album_id_fkey(slug, title)")
      .in("photo_id", ids);
    if (error) throw error;
    const byPhoto = {};
    (data || []).forEach((t) => { (byPhoto[t.photo_id] = byPhoto[t.photo_id] || []).push(toChip(t)); });
    return rows.map((r) => ({ ...r, tags: byPhoto[r.id] || [] }));
  } catch {
    return rows.map((r) => ({ ...r, tags: [] }));
  }
}

export async function addUserTag({ photoId, userId, createdBy }) {
  const { data, error } = await supabase
    .from("photo_tags")
    .insert({ photo_id: photoId, tagged_user_id: userId, created_by: createdBy })
    .select("id, tagged_user_id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addAlbumTag({ photoId, albumId, createdBy }) {
  const { data, error } = await supabase
    .from("photo_tags")
    .insert({ photo_id: photoId, tagged_album_id: albumId, created_by: createdBy })
    .select("id, tagged_album_id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeTag(id) {
  const { error } = await supabase.from("photo_tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Lists for the tag picker.
export async function fetchTaggableMembers() {
  const { data } = await supabase.from("profiles").select("id, username").order("username");
  return data || [];
}
export async function fetchTaggableCars() {
  const { data } = await supabase.from("albums").select("id, slug, title").order("title");
  return data || [];
}
