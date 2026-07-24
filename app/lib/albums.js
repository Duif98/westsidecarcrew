import { supabase } from "./supabaseClient";

export async function getAlbums() {
  const { data } = await supabase
    .from("albums")
    .select("*")
    .order("is_curated", { ascending: false })
    .order("sort", { ascending: true })
    .order("title", { ascending: true });
  return data || [];
}

export async function createAlbum({ title, owner, userId }) {
  const slug = "album-" + crypto.randomUUID().slice(0, 8);
  const { data, error } = await supabase
    .from("albums")
    .insert({ slug, title: title.trim(), owner_name: owner?.trim() || null, created_by: userId, is_curated: false, sort: 100 })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setAlbumCover(albumId, photoId) {
  const { error } = await supabase.from("albums").update({ cover_photo_id: photoId }).eq("id", albumId);
  if (error) throw new Error(error.message);
}

// Move an existing photo into an album (or out of one, with albumId = null).
// RLS lets the photo's owner or an admin do this.
export async function setPhotoAlbum(photoId, albumId) {
  const { error } = await supabase.from("photos").update({ album_id: albumId || null }).eq("id", photoId);
  if (error) throw new Error(error.message);
}
