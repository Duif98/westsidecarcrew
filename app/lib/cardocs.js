import { supabase, PRIVATE_BUCKET } from "./supabaseClient";

// Service manuals & other car documents. Files live in the private bucket and
// are served via short-lived signed URLs (members only). Admin-only writes.

export async function getCarDocs() {
  const { data, error } = await supabase.from("car_docs").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function uploadCarDoc({ file, title, docType, albumId, userId }) {
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${userId}/docs/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (up.error) throw new Error("Upload fejlede: " + up.error.message);

  const { data, error } = await supabase.from("car_docs").insert({
    album_id: albumId,
    title: title.trim().slice(0, 120),
    doc_type: docType || null,
    file_path: path,
    file_name: file.name.slice(0, 160),
    uploaded_by: userId,
  }).select().single();
  if (error) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([path]);
    throw new Error("Kunne ikke gemme: " + error.message);
  }
  return data;
}

export async function deleteCarDoc(doc) {
  await supabase.storage.from(PRIVATE_BUCKET).remove([doc.file_path]);
  await supabase.from("car_docs").delete().eq("id", doc.id);
}

export async function docUrl(path) {
  const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
