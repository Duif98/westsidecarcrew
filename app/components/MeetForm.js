"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { geocode, mapsSearchUrl } from "../lib/geo";
import MapPicker from "./MapPicker";

const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toTime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Create- or edit-a-meet popup, open to any logged-in member (own meets) and
// admins (any). `presetDate` prefills the date on create; pass `event` to edit.
export default function MeetForm({ presetDate = "", event = null, onClose, onCreated, onSaved }) {
  const { user } = useAuth();
  const { t } = useT();
  const editing = !!event;
  const [mounted, setMounted] = useState(false);
  const [f, setF] = useState(editing
    ? { title: event.title || "", date: toDate(event.starts_at), time: toTime(event.starts_at), location: event.location || "", location_url: event.location_url || "", description: event.description || "" }
    : { title: "", date: presetDate, time: "", location: "", location_url: "", description: "" });
  const [pin, setPin] = useState(editing && typeof event.lat === "number" && typeof event.lng === "number" ? { lat: event.lat, lng: event.lng } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [geo, setGeo] = useState("idle"); // idle | searching | found | notfound | ambiguous | linkset
  const [suggests, setSuggests] = useState([]);
  // Whether the map-link field is ours to fill. True until the member types
  // their own link — then we never overwrite it.
  const [linkAuto, setLinkAuto] = useState(!(editing && (event.location_url || "").trim()));
  const lastGeo = useRef("");
  const rawQuery = useRef(""); // exactly what the member typed (for the Google fallback)

  useEffect(() => setMounted(true), []);

  const fillLink = (text) => setF((prev) => (linkAuto || !prev.location_url.trim()) ? { ...prev, location_url: mapsSearchUrl(text) } : prev);

  // Apply a chosen place: drop the pin (which turns the weather on, here and in
  // the calendar), snap the Sted text to the tidy label, and auto-fill the
  // Google Maps link (unless the member set their own).
  const apply = (hit) => {
    setPin({ lat: hit.lat, lng: hit.lng });
    setF((prev) => {
      const next = { ...prev, location: hit.label };
      if (linkAuto || !prev.location_url.trim()) next.location_url = mapsSearchUrl(hit.label);
      return next;
    });
    setLinkAuto(true);
    setSuggests([]);
    setGeo("found");
    lastGeo.current = hit.label.trim();
  };

  // Fallback: no matching pin (or none is right) — just point the map link at a
  // Google Maps search of exactly what the member typed, so it still opens the place.
  const useGoogleSearch = () => {
    const q = rawQuery.current || f.location.trim();
    if (!q) return;
    setF((prev) => ({ ...prev, location_url: mapsSearchUrl(q) }));
    setLinkAuto(true);
    setSuggests([]);
    setGeo("linkset");
  };

  // Look the Sted place up: one hit → apply it; several → offer them as
  // suggestions; none → keep a Google Maps link for the query. Runs on blur and
  // from the "Find adresse" button; skips repeat lookups of the same text.
  const findAddress = async (force = false) => {
    const q = f.location.trim();
    if (q.length < 3) return;
    if (!force && q === lastGeo.current) return;
    lastGeo.current = q;
    rawQuery.current = q;
    setSuggests([]);
    setGeo("searching");
    const hits = await geocode(q, 6);
    if (!hits.length) { fillLink(q); setLinkAuto(true); setGeo("notfound"); return; }
    if (hits.length === 1) { apply(hits[0]); return; }
    setSuggests(hits);
    setGeo("ambiguous");
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.title.trim() || !f.date) { setErr(t("meet.errRequired")); return; }
    setBusy(true);
    const starts_at = new Date(`${f.date}T${f.time || "12:00"}`).toISOString();
    const payload = {
      title: f.title.trim().slice(0, 120),
      description: f.description.trim() || null,
      location: f.location.trim() || null,
      location_url: f.location_url.trim() || null,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      starts_at,
    };
    const q = editing
      ? supabase.from("events").update(payload).eq("id", event.id).select().single()
      : supabase.from("events").insert({ ...payload, created_by: user.id }).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (editing) onSaved?.(data); else onCreated?.(data);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="md" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md-panel">
        <button className="md-close" onClick={onClose} aria-label={t("meet.close")}>✕</button>
        <span className="overline">{editing ? t("meet.formEditOverline") : t("meet.formNewOverline")}</span>
        <h2 className="md-title">{editing ? t("meet.formEditTitle") : t("meet.formNewTitle")}</h2>

        <form className="event-form" onSubmit={submit} style={{ background: "none", border: "none", padding: 0, marginTop: "1rem" }}>
          <div className="ef-grid">
            <label className="post-field ef-full"><span>{t("meet.fTitle")}</span>
              <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t("meet.fTitlePh")} maxLength={120} /></label>
            <label className="post-field"><span>{t("meet.fDate")}</span>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="post-field"><span>{t("meet.fTime")}</span>
              <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
            <label className="post-field ef-full"><span>{t("meet.fLocation")}</span>
              <div className="mf-addr">
                <input value={f.location}
                  onChange={(e) => { setF({ ...f, location: e.target.value }); setSuggests([]); if (geo !== "idle") setGeo("idle"); }}
                  onBlur={() => findAddress()}
                  placeholder={t("meet.fLocationPh")} />
                <button type="button" className="ph-btn mf-addr-btn" onClick={() => findAddress(true)} disabled={geo === "searching" || f.location.trim().length < 3}>
                  {geo === "searching" ? t("meet.geoSearching") : t("meet.geoFind")}
                </button>
              </div>
              {geo === "found" && <span className="mf-addr-msg ok">{t("meet.geoFound")}</span>}
              {geo === "linkset" && <span className="mf-addr-msg ok">{t("meet.geoLinkSet")}</span>}
              {geo === "notfound" && <span className="mf-addr-msg no">{t("meet.geoNotFound")}</span>}
              {geo === "ambiguous" && suggests.length > 0 && (
                <div className="mf-suggests">
                  <span className="mf-suggests-head">{t("meet.geoPick")}</span>
                  {suggests.map((s, i) => (
                    <button type="button" key={i} className="mf-suggest" onClick={() => apply(s)}>📍 {s.label}</button>
                  ))}
                </div>
              )}
              {(geo === "found" || geo === "ambiguous" || geo === "notfound") && (
                <button type="button" className="mf-gmaps" onClick={useGoogleSearch}>{t("meet.geoGoogle")}</button>
              )}
            </label>
            <label className="post-field ef-full"><span>{t("meet.fMapLink")}</span>
              <input value={f.location_url} onChange={(e) => { setF({ ...f, location_url: e.target.value }); setLinkAuto(false); }} placeholder="https://maps.google.com/…" /></label>
            <label className="post-field ef-full"><span>{t("meet.fDesc")}</span>
              <textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t("meet.fDescPh")} /></label>
          </div>

          <div className="mf-map">
            <div className="mf-map-head">
              <span className="post-field" style={{ margin: 0 }}><span>{t("meet.fMapPlace")}</span></span>
              {pin && <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.3rem 0.7rem" }} onClick={() => setPin(null)}>{t("meet.clearPin")}</button>}
            </div>
            <MapPicker lat={pin?.lat} lng={pin?.lng} onChange={setPin} />
            <p className="mf-map-hint">{pin ? t("meet.pinSet") : t("meet.pinHint")}</p>
          </div>

          {err && <p className="ef-err">{err}</p>}
          <div className="post-actions" style={{ marginTop: "0.9rem" }}>
            <button className="btn-gold" type="submit" disabled={busy}>{busy ? t("meet.saving") : editing ? t("meet.saveChanges") : t("meet.createMeet")}</button>
            <button type="button" className="ph-btn" onClick={onClose}>{t("meet.cancel")}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
