"use client";

import { supabase } from "./supabaseClient";

// Google Places (New) autocomplete — used only when a key is available (members
// only, fetched from Supabase). EVERY path fails soft to null so the meet form
// always falls back to the free OSM/Photon search and can never break.

let mapsPromise = null;

// Site-side hard cap: once this many billable Google events (autocomplete +
// place details) happen in a month across all members, the site stops calling
// Google and falls back to OSM. Set far above realistic use (~hundreds/month)
// but safely under Google's 10k/month free tier, so it can never cost money.
const MONTHLY_LIMIT = 5000;
const usage = { count: null }; // cached running total for the current month

// Current month's total, cached after first read (kept fresh by bump()).
async function currentCount() {
  if (usage.count !== null) return usage.count;
  try {
    const { data } = await supabase.rpc("google_usage_count");
    usage.count = typeof data === "number" ? data : 0;
  } catch {
    usage.count = 0; // fail open on read error — the domain-lock + free tier still protect us
  }
  return usage.count;
}

// Record n billable events; the RPC returns the authoritative new total so the
// cap stays correct even across members. Best-effort (never blocks the UI).
async function bump(n) {
  try {
    const { data } = await supabase.rpc("bump_google_usage", { n });
    if (typeof data === "number") usage.count = data;
    else if (usage.count !== null) usage.count += n;
  } catch {
    if (usage.count !== null) usage.count += n;
  }
}

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

// Denmark-biased autocomplete. Returns { status, hits }:
//   'ok'          → hits: [{ label, prediction }]
//   'blocked'     → monthly site cap reached (caller falls back to OSM + warns)
//   'unavailable' → no key / not a member / load error (caller falls back to OSM)
export async function googleSearch(input, sessionToken) {
  const places = await loadPlaces();
  if (!places) return { status: "unavailable", hits: [] };
  if ((await currentCount()) >= MONTHLY_LIMIT) return { status: "blocked", hits: [] };
  try {
    const req = { input, includedRegionCodes: ["dk"], language: "da" };
    if (sessionToken) req.sessionToken = sessionToken;
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    bump(1); // one billable autocomplete event
    const hits = (suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({
        label: p.text?.text || [p.mainText?.text, p.secondaryText?.text].filter(Boolean).join(", "),
        prediction: p,
      }))
      .filter((x) => x.label);
    return { status: "ok", hits };
  } catch {
    return { status: "unavailable", hits: [] };
  }
}

// Resolve a picked prediction to { lat, lng, label, url } (one Place Details
// call), or null on failure. url is the exact Google Maps link to the place.
export async function resolvePlace(prediction) {
  try {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress", "displayName", "googleMapsURI"] });
    bump(1); // one billable place-details event
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
