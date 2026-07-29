import { supabase } from "./supabaseClient";

// Car care & owner notes — the products/fluids an owner runs on a car, plus a
// short owner review (albums.owner_review). Fails soft before migration 030.

export const CARE_CATEGORIES = [
  "Motorolie", "Gearolie/diff", "Bilpleje/voks", "Dæk", "Bremser",
  "Filtre", "Tændrør", "Kølervæske", "Sprinklervæske", "Andet",
];

export async function getCarProducts(albumId) {
  const { data, error } = await supabase
    .from("car_products")
    .select("id, album_id, user_id, category, name, note, created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function addCarProduct({ albumId, userId, category, name, note }) {
  const { data, error } = await supabase
    .from("car_products")
    .insert({ album_id: albumId, user_id: userId, category: category || "Andet", name: name.trim(), note: (note || "").trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCarProduct(id) {
  const { error } = await supabase.from("car_products").delete().eq("id", id);
  if (error) throw error;
}

export async function saveOwnerReview(albumId, text) {
  const { error } = await supabase.from("albums").update({ owner_review: (text || "").trim() || null }).eq("id", albumId);
  if (error) throw error;
}
