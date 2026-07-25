"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Full map of every meet that has a pin. Clicking a marker calls onSelect(event).
export default function MeetMap({ events, onSelect }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current).setView([55.52, 8.9], 7);
      map.current = m;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      setTimeout(() => m.invalidateSize(), 120);
      draw(L);
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; layer.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = async (Lmod) => {
    const L = Lmod || (await import("leaflet")).default;
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const pts = (events || []).filter((e) => typeof e.lat === "number" && typeof e.lng === "number");
    const icon = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 22] });
    const bounds = [];
    pts.forEach((e) => {
      const mk = L.marker([e.lat, e.lng], { icon }).addTo(layer.current);
      const when = new Date(e.starts_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      mk.bindTooltip(`${e.title} · ${when}`, { direction: "top", offset: [0, -18] });
      mk.on("click", () => onSelectRef.current?.(e));
      bounds.push([e.lat, e.lng]);
    });
    if (bounds.length === 1) map.current.setView(bounds[0], 13);
    else if (bounds.length > 1) map.current.fitBounds(bounds, { padding: [40, 40] });
  };

  useEffect(() => { draw(); /* redraw when events change */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return <div ref={el} className="meet-map" />;
}
