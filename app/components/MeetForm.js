"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

// Create-a-meet popup, open to any logged-in member. `presetDate` (YYYY-MM-DD)
// prefills the date, e.g. when opened by clicking a day in the calendar.
export default function MeetForm({ presetDate = "", onClose, onCreated }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [f, setF] = useState({ title: "", date: presetDate, time: "", location: "", location_url: "", description: "" });
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
    const { data, error } = await supabase.from("events").insert({
      title: f.title.trim().slice(0, 120),
      description: f.description.trim() || null,
      location: f.location.trim() || null,
      location_url: f.location_url.trim() || null,
      starts_at,
      created_by: user.id,
    }).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated?.(data);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="md" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md-panel">
        <button className="md-close" onClick={onClose} aria-label="Luk">✕</button>
        <span className="overline">Nyt meet</span>
        <h2 className="md-title">Planlæg et meet</h2>

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
          {err && <p className="ef-err">{err}</p>}
          <div className="post-actions" style={{ marginTop: "0.9rem" }}>
            <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Gemmer…" : "Opret meet"}</button>
            <button type="button" className="ph-btn" onClick={onClose}>Annullér</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
