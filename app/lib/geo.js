// Turn a free-text place or address into candidate locations using **Photon**
// (photon.komoot.io) — a free, no-key, CORS-open geocoder built on OpenStreetMap
// with far better place/business search than raw Nominatim (finds "McDonald's
// Esbjerg", "Netto Bramming", …). Same OSM data as our Leaflet map/tiles.
//
// Returns an ARRAY of { lat, lng, label } best-match first. One hit = apply it;
// several = the caller shows them as pick-suggestions. Results are cached per
// query and only fetched on blur / a button (never per keystroke).
//
// Photon (like all OSM geocoders) only knows places mapped in OSM, so a store
// that isn't in OSM won't get a pin — for that the caller falls back to a Google
// Maps *search link* built with mapsSearchUrl(), which opens the place directly.
const cache = new Map();

// Bias toward Jutland / the crew's home turf so local places rank first.
const BIAS = "&lat=55.7&lon=9.3";

export async function geocode(query, limit = 6) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const key = q.toLowerCase() + "|" + limit;
  if (cache.has(key)) return cache.get(key);
  try {
    const url = "https://photon.komoot.io/api/?limit=" + limit + BIAS + "&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { cache.set(key, []); return []; }
    const data = await res.json();
    const feats = Array.isArray(data?.features) ? data.features : [];
    const seen = new Set();
    // Danish crew → keep only Danish hits. When a place isn't in OSM, Photon
    // fuzzy-matches wildly abroad ("Bilka Tarp" → Ghana/Poland); dropping non-DK
    // leaves nothing, so the caller cleanly falls back to a Google Maps link.
    const hits = feats
      .map(toHit)
      .filter((h) => h && (h.cc || "").toUpperCase() === "DK" && !seen.has(h.label) && seen.add(h.label));
    cache.set(key, hits);
    return hits;
  } catch {
    return [];
  }
}

// A concise label with the place/street + postcode + town, so businesses and
// ambiguous streets are easy to tell apart, e.g. "McDonald's, 6700 Esbjerg".
function toHit(f) {
  const c = f?.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = c[0], lat = c[1];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const p = f.properties || {};
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const primary = p.name || street || p.street || "";
  const town = p.city || p.town || p.village || p.district || p.county || "";
  const locality = [p.postcode, town].filter(Boolean).join(" ");
  const label = [primary, locality].filter(Boolean).join(", ") || p.name || town;
  if (!label) return null;
  return { lat, lng, label, cc: p.countrycode || "" };
}

// Google Maps search link for free text — opens exactly what a Google Maps
// search would, so members reach businesses ("Ilva Vejle") that OSM has no pin for.
export function mapsSearchUrl(text) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((text || "").trim());
}
