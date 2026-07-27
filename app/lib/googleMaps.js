"use client";

import { supabase } from "./supabaseClient";

// Google Places (New) autocomplete — used only when a key is available (members
// only, fetched from Supabase). EVERY path fails soft to null so the meet form
// always falls back to the free OSM/Photon search and can never break.

let mapsPromise = null;

async function fetchKey() {
  try {
    const { data } = await supabase.from("app_secrets").select("value").eq("key", "google_maps_key").maybeSingle();
    return data?.value || null;
  } catch {
    return null;
  }
}

// Install Google's dynamic-library bootstrap: defines google.maps.importLibrary,
// which lazily loads the JS API with a callback (a plain <script loading=async>
// injection does NOT expose importLibrary — verified). Clean rewrite of Google's
// official inline loader snippet.
function installBootstrap(key) {
  const g = window.google || (window.google = {});
  const maps = g.maps || (g.maps = {});
  if (maps.importLibrary) return;
  let scriptPromise = null;
  const libs = new Set();
  const startLoad = () => {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      const params = new URLSearchParams();
      params.set("key", key);
      params.set("v", "weekly");
      params.set("libraries", [...libs].join(","));
      params.set("callback", "google.maps.__ib__");
      maps.__ib__ = resolve;
      const s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
      s.onerror = () => reject(new Error("google maps failed to load"));
      document.head.appendChild(s);
    });
    return scriptPromise;
  };
  maps.importLibrary = (name) => { libs.add(name); return startLoad().then(() => maps.importLibrary(name)); };
}

// Load the Places library once. Returns it, or null if there's no key (anon /
// not stored) or loading fails.
export function loadPlaces() {
  if (mapsPromise) return mapsPromise;
  mapsPromise = (async () => {
    if (typeof window === "undefined") return null;
    const key = await fetchKey();
    if (!key) return null;
    if (!window.google?.maps?.importLibrary) installBootstrap(key);
    return await window.google.maps.importLibrary("places");
  })().catch(() => null);
  return mapsPromise;
}

export async function newSessionToken() {
  const places = await loadPlaces();
  if (!places) return null;
  try {
    return new places.AutocompleteSessionToken();
  } catch {
    return null;
  }
}

// Denmark-biased autocomplete predictions for `input`, or null if Google isn't
// available (→ caller uses the OSM fallback). Each item: { label, prediction }.
export async function googleAutocomplete(input, sessionToken) {
  const places = await loadPlaces();
  if (!places) return null;
  try {
    const req = { input, includedRegionCodes: ["dk"], language: "da" };
    if (sessionToken) req.sessionToken = sessionToken;
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    return (suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({
        label: p.text?.text || [p.mainText?.text, p.secondaryText?.text].filter(Boolean).join(", "),
        prediction: p,
      }))
      .filter((x) => x.label);
  } catch {
    return null;
  }
}

// Resolve a picked prediction to { lat, lng, label, url } (one Place Details
// call), or null on failure. url is the exact Google Maps link to the place.
export async function resolvePlace(prediction) {
  try {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress", "displayName", "googleMapsURI"] });
    const loc = place.location;
    if (!loc) return null;
    const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    const name = place.displayName?.text || place.displayName || "";
    const addr = place.formattedAddress || "";
    const label = [name, addr].filter(Boolean).join(", ") || addr || name;
    return { lat, lng, label, url: place.googleMapsURI || null };
  } catch {
    return null;
  }
}
