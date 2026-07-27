"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Small click-to-drop-a-pin map for the create-a-meet form. Leaflet is imported
// lazily inside the effect so it never runs during SSR / static export. The
// pin also follows `lat`/`lng` when the parent sets them (e.g. after the
// address is geocoded from the Sted field).
export default function MapPicker({ lat, lng, onChange }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const L = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const coord = useRef({ lat, lng });
  coord.current = { lat, lng };

  // Place / move the marker (needs Leaflet + a live map).
  const place = (la, ln) => {
    const m = map.current;
    if (!m || !L.current) return;
    if (marker.current) {
      marker.current.setLatLng([la, ln]);
    } else {
      const icon = L.current.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 22] });
      marker.current = L.current.marker([la, ln], { icon }).addTo(m);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      L.current = lib;
      const { lat: la, lng: ln } = coord.current;
      const hasPin = typeof la === "number" && typeof ln === "number";
      const m = lib.map(el.current, { scrollWheelZoom: false }).setView(hasPin ? [la, ln] : [55.52, 8.9], hasPin ? 13 : 8);
      map.current = m;
      lib.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
      if (hasPin) place(la, ln);
      m.on("click", (e) => {
        const { lat: a, lng: b } = e.latlng;
        place(a, b);
        onChangeRef.current?.({ lat: a, lng: b });
      });
      setTimeout(() => m.invalidateSize(), 120);
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; marker.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow externally-set coords (address geocoding) and handle a cleared pin.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const hasPin = typeof lat === "number" && typeof lng === "number";
    if (hasPin) {
      place(lat, lng);
      m.setView([lat, lng], Math.max(m.getZoom(), 13));
    } else if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return <div ref={el} className="map-picker" />;
}
