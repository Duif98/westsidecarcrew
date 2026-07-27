// Turn a free-text place or address into candidate locations using **Photon**
// (photon.komoot.io) — a free, no-key, CORS-open geocoder on OpenStreetMap data
// (same data as our Leaflet map/tiles), far better at places/businesses than raw
// Nominatim.
//
// Smart "brand near town" search: for a query like "Ilva Vejle" a plain search
// only returns the single closest-named ILVA (in the wrong town). Instead we
// split off the last word as a town ("Vejle"), find its centre, then search the
// rest ("Ilva") sorted by distance to that town — so the caller can offer the 5
// nearest ILVA stores to Vejle to pick from. Falls back to a plain search when
// the last word isn't a town (e.g. "Padborg Park").
//
// Returns { hits, near }: `hits` is [{ lat, lng, label, dist? }] best/nearest
// first; `near` is the town name when the brand-near-town path was used (else
// null). Results cached per query; only fetched on blur / a button.
//
// A place not in OSM won't get a pin at all — for that the caller falls back to
// a Google Maps search link via mapsSearchUrl().
const cache = new Map();
const BIAS = { lat: 55.7, lon: 9.3 }; // Jutland / crew home turf

export async function geocode(query) {
  const q = (query || "").trim();
  if (q.length < 3) return { hits: [], near: null, center: null };
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let result = { hits: [], near: null, center: null };
  try {
    const tokens = q.split(/\s+/);
    // Pass 1: "<brand> <town>" → nearest brand stores to that town. We also keep
    // the town centre so the caller can offer "pin the town + Google link" when
    // the exact place isn't in OSM (e.g. "Ilva Vejle" — no ILVA is mapped in Vejle).
    // Skip this for anything with a digit — that's a street address (house number
    // / postcode), which OSM has precisely, so a plain lookup pins it exactly.
    if (!/\d/.test(q) && tokens.length >= 2) {
      const brand = tokens.slice(0, -1).join(" ");
      const center = await townCenter(tokens[tokens.length - 1]);
      if (center && brand.length >= 2) {
        const near = (await photonRaw(brand, center.lat, center.lon, 12))
          .map((h) => ({ ...h, dist: Math.round(havKm(center.lat, center.lon, h.lat, h.lng)) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 5);
        result = { hits: near, near: center.name, center: { lat: center.lat, lng: center.lon } };
      }
    }
    // Pass 2: plain search of the whole query (only if the town path found nothing to anchor on).
    if (!result.hits.length && !result.center) {
      result = { hits: await photonRaw(q, BIAS.lat, BIAS.lon, 6), near: null, center: null };
    }
  } catch {
    result = { hits: [], near: null, center: null };
  }
  cache.set(key, result);
  return result;
}

// Danish town/city centre for a name, or null if it isn't a place.
async function townCenter(name) {
  if (!name || name.length < 3) return null;
  try {
    const url = `https://photon.komoot.io/api/?limit=1&osm_tag=place&lat=${BIAS.lat}&lon=${BIAS.lon}&q=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const f = ((await res.json())?.features || [])[0];
    if (!f || f.properties?.countrycode !== "DK") return null;
    const c = f.geometry?.coordinates;
    if (!Array.isArray(c)) return null;
    return { name: f.properties.name || name, lat: c[1], lon: c[0] };
  } catch {
    return null;
  }
}

// Danish-only, deduped Photon hits for a query, biased around lat/lon.
async function photonRaw(q, lat, lon, limit) {
  const url = `https://photon.komoot.io/api/?limit=${limit}&lat=${lat}&lon=${lon}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  const feats = Array.isArray(data?.features) ? data.features : [];
  const seen = new Set();
  return feats
    .map(toHit)
    .filter((h) => h && h.cc === "DK" && !seen.has(h.label) && seen.add(h.label));
}

// Google Maps search link for free text — opens exactly what a Google Maps
// search would, so members reach businesses ("Ilva Vejle") OSM has no pin for.
export function mapsSearchUrl(text) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((text || "").trim());
}

// Google Maps *directions* link (free Maps URL — no API key/quota). Opens the
// Maps app/site with a route from the user's current location to the meet.
// Uses coords when we have them, else the location text.
export function directionsUrl(lat, lng, fallbackText) {
  const dest = typeof lat === "number" && typeof lng === "number" ? `${lat},${lng}` : (fallbackText || "").trim();
  if (!dest) return null;
  return "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(dest);
}

// Distance in km between two lat/lng points (haversine).
function havKm(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const x = (c - a) * r, y = (d - b) * r;
  const s = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// A concise label: place/street + postcode + town, e.g. "McDonald's, 6700 Esbjerg".
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
  return { lat, lng, label, cc: (p.countrycode || "").toUpperCase() };
}
