"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Small click-to-drop-a-pin map for the create-a-meet form. Leaflet is imported
// lazily inside the effect so it never runs during SSR / static export.
export default function MapPicker({ lat, lng, onChange }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const icon = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 22] });
      const hasPin = typeof lat === "number" && typeof lng === "number";
      const m = L.map(el.current, { scrollWheelZoom: false }).setView(hasPin ? [lat, lng] : [55.52, 8.9], hasPin ? 13 : 8);
      map.current = m;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      if (hasPin) marker.current = L.marker([lat, lng], { icon }).addTo(m);
      m.on("click", (e) => {
        const { lat: la, lng: ln } = e.latlng;
        if (marker.current) marker.current.setLatLng([la, ln]);
        else marker.current = L.marker([la, ln], { icon }).addTo(m);
        onChangeRef.current?.({ lat: la, lng: ln });
      });
      setTimeout(() => m.invalidateSize(), 120);
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; marker.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={el} className="map-picker" />;
}
