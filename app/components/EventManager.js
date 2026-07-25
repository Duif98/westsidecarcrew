"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const pad = (n) => String(n).padStart(2, "0");
const toDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toTime = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmt = (t) => new Date(t).toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const isPast = (t) => new Date(t) < new Date();

const EMPTY = { title: "", date: "", time: "", location: "", location_url: "", description: "", editingId: null };

// Admin tool to create, edit and delete meets. Admins can manage any event (RLS).
export default function EventManager({ userId }) {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({});
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
    const list = data || [];
    setEvents(list);
    if (list.length) {
      const { data: rs } = await supabase.from("event_rsvps").select("event_id, status").in("event_id", list.map((e) => e.id)).eq("status", "yes");
      const c = {};
      (rs || []).forEach((r) => (c[r.event_id] = (c[r.event_id] || 0) + 1));
      setCounts(c);
    }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setF(EMPTY); setMsg(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.date) { setMsg("Titel og dato skal udfyldes."); return; }
    setBusy(true); setMsg("");
    const starts_at = new Date(`${f.date}T${f.time || "12:00"}`).toISOString();
    const payload = {
      title: f.title.trim().slice(0, 120),
      description: f.description.trim() || null,
      location: f.location.trim() || null,
      location_url: f.location_url.trim() || null,
      starts_at,
    };
    try {
      if (f.editingId) {
        const { error } = await supabase.from("events").update(payload).eq("id", f.editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
      reset();
      setMsg("✓ Gemt.");
      await load();
    } catch (e2) { setMsg(e2.message); }
    finally { setBusy(false); }
  };

  const edit = (ev) => {
    setF({
      title: ev.title, date: toDate(ev.starts_at), time: toTime(ev.starts_at),
      location: ev.location || "", location_url: ev.location_url || "", description: ev.description || "", editingId: ev.id,
    });
    setMsg("");
    document.getElementById("event-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const del = async (ev) => {
    if (!confirm("Slet dette meet?")) return;
    await supabase.from("events").delete().eq("id", ev.id);
    if (f.editingId === ev.id) reset();
    await load();
  };

  return (
    <div className="member-section">
      <span className="overline">Meets</span>
      <p className="member-note">Opret og ret crewets meets. De vises på <code>/events</code> og som “næste meet” på forsiden.</p>

      <form id="event-form" className="event-form" onSubmit={submit}>
        <div className="ef-grid">
          <label className="post-field ef-full"><span>Titel</span>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="fx Søndagscruise til havnen" maxLength={120} /></label>
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
        {msg && <div className={`auth-msg ${msg.startsWith("✓") ? "ok" : "err"}`}>{msg}</div>}
        <div className="post-actions">
          <button className="btn-gold" type="submit" disabled={busy}>{busy ? "Gemmer…" : f.editingId ? "Gem ændringer" : "Opret meet"}</button>
          {f.editingId && <button type="button" className="ph-btn" onClick={reset}>Annullér</button>}
        </div>
      </form>

      {events.length > 0 && (
        <div className="post-list">
          {events.map((ev) => (
            <div className={`post-row ${isPast(ev.starts_at) ? "past" : ""}`} key={ev.id}>
              <div className="event-mini-date">
                <b>{new Date(ev.starts_at).toLocaleDateString("da-DK", { day: "numeric" })}</b>
                <span>{new Date(ev.starts_at).toLocaleDateString("da-DK", { month: "short" }).replace(".", "")}</span>
              </div>
              <div className="post-info">
                <b>{ev.title}</b>
                <span>{fmt(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""} · ✅ {counts[ev.id] || 0}{isPast(ev.starts_at) ? " · afholdt" : ""}</span>
              </div>
              <div className="post-row-actions">
                <button className="ph-btn" onClick={() => edit(ev)}>Redigér</button>
                <button className="ph-btn del" onClick={() => del(ev)}>Slet</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
