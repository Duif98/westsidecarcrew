// Turn a free-text address into { lat, lng, display } via OpenStreetMap
// Nominatim — free, no API key, CORS-open (same OSM ecosystem as our Leaflet
// map + tiles). Browsers can't set User-Agent, but Nominatim accepts the
// default browser Referer, so we don't touch headers (same as weather.js/MET).
//
// Usage rules honored: results cached per query (so re-typing the same address
// never re-hits the server) and we only query on an explicit action / blur,
// never on every keystroke, to stay under the 1 req/sec limit.
const cache = new Map();

export async function geocode(query) {
  const q = (query || "").trim();
  if (q.length < 3) return null;
  if (cache.has(q)) return cache.get(q);
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { cache.set(q, null); return null; }
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) { cache.set(q, null); return null; }
    const hit = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name,
    };
    if (Number.isNaN(hit.lat) || Number.isNaN(hit.lng)) { cache.set(q, null); return null; }
    cache.set(q, hit);
    return hit;
  } catch {
    return null;
  }
}
