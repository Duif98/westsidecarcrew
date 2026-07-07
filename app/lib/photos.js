import { supabase, PUBLIC_BUCKET, PRIVATE_BUCKET } from "./supabaseClient";

// Upload a file to the right bucket and record it in the photos table.
export async function uploadPhoto({ file, isPublic, car, caption, userId }) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const bucket = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const up = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (up.error) throw new Error("Upload fejlede: " + up.error.message);

  const { error } = await supabase.from("photos").insert({
    user_id: userId,
    bucket,
    path,
    visibility: isPublic ? "public" : "private",
    approved: false,
    car: car?.trim() || null,
    caption: caption?.trim() || null,
  });
  if (error) {
    // roll back the orphaned file
    await supabase.storage.from(bucket).remove([path]);
    throw new Error("Kunne ikke gemme billedet: " + error.message);
  }
}

// Attach a displayable URL to each photo row (signed for private files).
export async function withUrls(rows) {
  return Promise.all(
    rows.map(async (r) => {
      if (r.bucket === PUBLIC_BUCKET) {
        return { ...r, url: supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(r.path).data.publicUrl };
      }
      const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(r.path, 3600);
      return { ...r, url: data?.signedUrl || null };
    })
  );
}

export async function deletePhoto(photo) {
  await supabase.storage.from(photo.bucket).remove([photo.path]);
  await supabase.from("photos").delete().eq("id", photo.id);
}

export async function setApproved(id, approved) {
  const { error } = await supabase.from("photos").update({ approved }).eq("id", id);
  if (error) throw new Error(error.message);
}
