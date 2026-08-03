import { supabase, PUBLIC_BUCKET, PRIVATE_BUCKET } from "./supabaseClient";
import { shrinkImage } from "./imageResize";
import { uuid } from "./uuid";

// A small preview lives next to every original at a derived path (no DB column
// needed): `uid/uuid.jpg` → `uid/uuid_thumb.jpg`. Feeds/grids load the thumb for
// speed; tapping in loads the full-quality original. Older photos have no thumb
// yet, so the UI falls back to the original on a 404 (see onError handlers).
export const thumbPathFor = (path) => (path || "").replace(/\.[^.]+$/, "") + "_thumb.jpg";

// Best-effort: generate + upload a ~1000px preview beside an original. Never
// throws — if it fails, rendering just falls back to the full image.
export async function uploadThumb(bucket, path, file) {
  try {
    const thumb = await shrinkImage(file, { maxDim: 1000, quality: 0.72 });
    if (thumb && thumb !== file) {
      await supabase.storage.from(bucket).upload(thumbPathFor(path), thumb, {
        cacheControl: "31536000", upsert: true, contentType: "image/jpeg",
      });
    }
  } catch {}
}

// Upload a file to the right bucket and record it in the photos table.
// `userId` is always the actual uploader (used for the storage folder, which RLS
// ties to auth.uid()). `ownerId` lets an admin attribute the row to another
// member (their car showcase); it defaults to the uploader. `approved` lets an
// admin publish straight away.
export async function uploadPhoto({ file, isPublic, car, caption, userId, albumId, eventId, ownerId, approved = false }) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const bucket = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
  const path = `${userId}/${uuid()}.${ext}`;

  // Store the full-quality original untouched…
  const up = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (up.error) throw new Error("Upload fejlede: " + up.error.message);
  // …and a small preview beside it for fast feeds/grids.
  await uploadThumb(bucket, path, file);

  const { data, error } = await supabase.from("photos").insert({
    user_id: ownerId || userId,
    bucket,
    path,
    visibility: isPublic ? "public" : "private",
    approved: !!approved,
    car: car?.trim() || null,
    caption: caption?.trim() || null,
    album_id: albumId || null,
    event_id: eventId || null,
  }).select("id, path").single();
  if (error) {
    // roll back the orphaned file
    await supabase.storage.from(bucket).remove([path]);
    throw new Error("Kunne ikke gemme billedet: " + error.message);
  }
  return data;
}

// Attach a displayable URL to each photo row (signed for private files).
export async function withUrls(rows) {
  return Promise.all(
    rows.map(async (r) => {
      if (r.bucket === PUBLIC_BUCKET) {
        const pub = (p) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(p).data.publicUrl;
        return { ...r, url: pub(r.path), thumbUrl: pub(thumbPathFor(r.path)) };
      }
      const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(r.path, 3600);
      let thumbUrl = null;
      try {
        const { data: td } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(thumbPathFor(r.path), 3600);
        thumbUrl = td?.signedUrl || null;
      } catch {}
      return { ...r, url: data?.signedUrl || null, thumbUrl };
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

// Attach like counts + whether the current user liked. Fail-safe: if the likes
// table isn't set up yet, photos still render with zero likes.
export async function withLikes(rows, userId) {
  if (!rows.length) return rows;
  try {
    const ids = rows.map((r) => r.id);
    const { data, error } = await supabase.from("likes").select("photo_id, user_id").in("photo_id", ids);
    if (error) throw error;
    const counts = {}, mine = new Set();
    (data || []).forEach((l) => {
      counts[l.photo_id] = (counts[l.photo_id] || 0) + 1;
      if (userId && l.user_id === userId) mine.add(l.photo_id);
    });
    return rows.map((r) => ({ ...r, likeCount: counts[r.id] || 0, likedByMe: mine.has(r.id) }));
  } catch {
    return rows.map((r) => ({ ...r, likeCount: 0, likedByMe: false }));
  }
}

// Attach comment counts. Fail-safe: if the comments table isn't set up yet,
// photos still render with zero comments.
export async function withCommentCounts(rows) {
  if (!rows.length) return rows;
  try {
    const ids = rows.map((r) => r.id);
    const { data, error } = await supabase.from("comments").select("photo_id").in("photo_id", ids);
    if (error) throw error;
    const counts = {};
    (data || []).forEach((c) => (counts[c.photo_id] = (counts[c.photo_id] || 0) + 1));
    return rows.map((r) => ({ ...r, commentCount: counts[r.id] || 0 }));
  } catch {
    return rows.map((r) => ({ ...r, commentCount: 0 }));
  }
}

// Resolve URLs, likes and comment counts in one call.
export async function enrichPhotos(rows, userId) {
  return withCommentCounts(await withLikes(await withUrls(rows), userId));
}

export async function toggleLike(photoId, userId, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase.from("likes").delete().eq("photo_id", photoId).eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("likes").insert({ photo_id: photoId, user_id: userId });
    if (error) throw new Error(error.message);
  }
}

export async function getCrewCode() {
  const { data, error } = await supabase.rpc("crew_code");
  if (error) throw new Error(error.message);
  return data;
}
