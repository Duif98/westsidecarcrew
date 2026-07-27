// Turn a free-text address into candidate locations via OpenStreetMap
// Nominatim — free, no API key, CORS-open (same OSM ecosystem as our Leaflet
// map + tiles). Browsers can't set User-Agent, but Nominatim accepts the
// default browser Referer, so we don't touch headers (same as weather.js/MET).
//
// Returns an ARRAY of { lat, lng, label, display } best-match first. One hit =
// unambiguous; several = the caller shows them as suggestions (e.g. "Langgade"
// → different towns/postcodes). Results are cached per query so re-typing the
// same address never re-hits the server, and we only query on blur / a button,
// never per keystroke, to stay under Nominatim's 1 req/sec limit.
const cache = new Map();

export async function geocode(query, limit = 5) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const key = q.toLowerCase() + "|" + limit;
  if (cache.has(key)) return cache.get(key);
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=" +
      limit + "&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { cache.set(key, []); return []; }
    const data = await res.json();
    const seen = new Set();
    const out = (Array.isArray(data) ? data : [])
      .map(toHit)
      .filter((h) => h && !seen.has(h.label) && seen.add(h.label));
    cache.set(key, out);
    return out;
  } catch {
    return [];
  }
}

// A concise, human label with town + postcode so ambiguous searches are easy
// to tell apart, e.g. "Langgade, 6700 Esbjerg".
function toHit(item) {
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const a = item.address || {};
  // Prefer the place's own name (e.g. "Padborg Park") so POIs stay recognisable;
  // fall back to the street for plain address searches.
  const primary = item.name || a.road || a.pedestrian || a.footway || a.neighbourhood || "";
  const city = a.city || a.town || a.village || a.municipality || a.county || "";
  const pc = a.postcode || "";
  const label = [primary, [pc, city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || item.display_name;
  return { lat, lng, label, display: item.display_name };
}

// Google Maps deep-link for a coordinate — so members never paste a link by hand.
export function mapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
