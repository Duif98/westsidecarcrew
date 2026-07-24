import { supabase, PUBLIC_BUCKET } from "./supabaseClient";

export async function getPosts() {
  const { data } = await supabase
    .from("posts")
    .select("*, profiles!posts_author_id_fkey(username)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  return (data || []).map((p) => ({
    ...p,
    author: p.profiles?.username || null,
    imageUrl: p.image_path ? supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(p.image_path).data.publicUrl : null,
  }));
}

async function uploadPostImage(file, userId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/post-${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || "image/jpeg",
  });
  if (up.error) throw new Error("Billede-upload fejlede: " + up.error.message);
  return path;
}

export async function createPost({ title, body, imageFile, pinned, userId }) {
  let image_path = null;
  if (imageFile) image_path = await uploadPostImage(imageFile, userId);
  const { error } = await supabase.from("posts").insert({
    author_id: userId, title: title.trim(), body: body?.trim() || null, image_path, pinned: !!pinned,
  });
  if (error) {
    if (image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([image_path]);
    throw new Error(error.message);
  }
}

export async function updatePost(id, { title, body, pinned, imageFile, removeImage, oldImagePath, userId }) {
  const patch = { title: title.trim(), body: body?.trim() || null, pinned: !!pinned };
  if (imageFile) {
    patch.image_path = await uploadPostImage(imageFile, userId);
    if (oldImagePath) await supabase.storage.from(PUBLIC_BUCKET).remove([oldImagePath]);
  } else if (removeImage && oldImagePath) {
    patch.image_path = null;
    await supabase.storage.from(PUBLIC_BUCKET).remove([oldImagePath]);
  }
  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePost(post) {
  if (post.image_path) await supabase.storage.from(PUBLIC_BUCKET).remove([post.image_path]);
  const { error } = await supabase.from("posts").delete().eq("id", post.id);
  if (error) throw new Error(error.message);
}

export async function togglePin(id, pinned) {
  const { error } = await supabase.from("posts").update({ pinned }).eq("id", id);
  if (error) throw new Error(error.message);
}
