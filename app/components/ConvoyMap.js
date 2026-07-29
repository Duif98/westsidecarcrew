"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Live convoy map. Markers are keyed by user_id and moved in place as positions
// arrive (no full redraw), so the map doesn't flicker. The view only auto-fits
// when the SET of members changes — not on every position tick — so a member can
// pan/zoom freely while the convoy drives.
export default function ConvoyMap({ positions, meId }) {
  const el = useRef(null);
  const map = useRef(null);
  const markers = useRef({}); // user_id -> L.marker
  const knownIds = useRef("");
  const Lref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      Lref.current = L;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true }).setView([55.52, 8.9], 7);
      map.current = m;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      setTimeout(() => m.invalidateSize(), 120);
      sync();
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; markers.current = {}; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const L = Lref.current;
    const m = map.current;
    if (!L || !m) return;
    const pts = (positions || []).filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
    const ids = pts.map((p) => p.user_id).sort().join(",");

    // Add / move markers.
    const seen = new Set();
    pts.forEach((p) => {
      seen.add(p.user_id);
      const me = p.user_id === meId;
      const name = p.profile?.username || "medlem";
      let mk = markers.current[p.user_id];
      if (!mk) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="convoy-pin${me ? " me" : ""}"><span>${name[0]?.toUpperCase() || "?"}</span></div>`,
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        mk = L.marker([p.lat, p.lng], { icon }).addTo(m);
        mk.bindTooltip(me ? `${name} (dig)` : name, { direction: "top", offset: [0, -16] });
        markers.current[p.user_id] = mk;
      } else {
        mk.setLatLng([p.lat, p.lng]);
      }
    });

    // Remove markers for members who stopped sharing.
    Object.keys(markers.current).forEach((id) => {
      if (!seen.has(id)) { m.removeLayer(markers.current[id]); delete markers.current[id]; }
    });

    // Only re-fit when the member set changed.
    if (ids !== knownIds.current) {
      knownIds.current = ids;
      const bounds = pts.map((p) => [p.lat, p.lng]);
      if (bounds.length === 1) m.setView(bounds[0], 14);
      else if (bounds.length > 1) m.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  useEffect(() => { sync(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [positions, meId]);

  return <div ref={el} className="convoy-map" />;
}
