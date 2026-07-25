"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import MapPicker from "./MapPicker";

const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toTime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Create- or edit-a-meet popup, open to any logged-in member (own meets) and
// admins (any). `presetDate` prefills the date on create; pass `event` to edit.
export default function MeetForm({ presetDate = "", event = null, onClose, onCreated, onSaved }) {
  const { user } = useAuth();
  const editing = !!event;
  const [mounted, setMounted] = useState(false);
  const [f, setF] = useState(editing
    ? { title: event.title || "", date: toDate(event.starts_at), time: toTime(event.starts_at), location: event.location || "", location_url: event.location_url || "", description: event.description || "" }
    : { title: "", date: presetDate, time: "", location: "", location_url: "", description: "" });
  const [pin, setPin] = useState(editing && typeof event.lat === "number" && typeof event.lng === "number" ? { lat: event.lat, lng: event.lng } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.title.trim() || !f.date) { setErr("Titel og dato skal udfyldes."); return; }
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
        <button className="md-close" onClick={onClose} aria-label="Luk">✕</button>
        <span className="overline">{editing ? "Rediger meet" : "Nyt meet"}</span>
        <h2 className="md-title">{editing ? "Rediger meet" : "Planlæg et meet"}</h2>

        <form className="event-form" onSubmit={submit} style={{ background: "none", border: "none", padding: 0, marginTop: "1rem" }}>
          <div className="ef-grid">
            <label className="post-field ef-full"><span>Titel</span>
              <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="fx Søndagscruise til havnen" maxLength={120} /></label>
            <label className="post-field"><span>Dato</span>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="post-field"><span>Tidspunkt</span>
              <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
            <label className="post-field ef-full"><span>Sted</span>
              <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="fx P-plads ved Esbjerg havn" /></label>
            <label className="post-field ef-full"><span>Kort-link (valgfrit)</span>
              <input value={f.location_url} onChange={(e) => setF({ ...f, location_url: e.target.value })} placeholder="https://maps.google.com/…" /></label>
            <label className="post-field ef-full"><span>Beskrivelse</span>
              <textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Hvad sker der?" /></label>
          </div>

          <div className="mf-map">
            <div className="mf-map-head">
              <span className="post-field" style={{ margin: 0 }}><span>Placering på kort (valgfrit)</span></span>
              {pin && <button type="button" className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.3rem 0.7rem" }} onClick={() => setPin(null)}>Ryd nål</button>}
            </div>
            <MapPicker lat={pin?.lat} lng={pin?.lng} onChange={setPin} />
            <p className="mf-map-hint">{pin ? "📍 Nål sat — meetet vises på kortet." : "Klik på kortet for at sætte en nål."}</p>
          </div>

          {err && <p className="ef-err">{err}</p>}
          <div className="post-actions" style={{ marginTop: "0.9rem" }}>
            <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Gemmer…" : editing ? "Gem ændringer" : "Opret meet"}</button>
            <button type="button" className="ph-btn" onClick={onClose}>Annullér</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
