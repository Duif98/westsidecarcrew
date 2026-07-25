"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { enrichPhotos, uploadPhoto } from "../lib/photos";
import PhotoLightbox from "./PhotoLightbox";
import MeetMap from "./MeetMap";
import MeetForm from "./MeetForm";

const fmt = (t) =>
  new Date(t).toLocaleString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS = [
  { key: "yes", label: "Kommer", emoji: "✅" },
  { key: "maybe", label: "Måske", emoji: "🤔" },
  { key: "no", label: "Kan ikke", emoji: "❌" },
];

// Full details + RSVP for a single meet. Rendered as a portal dialog so it can
// be opened from the calendar (or anywhere).
export default function MeetDetail({ event: initialEvent, onClose, onUpdated, onDeleted }) {
  const { session, user, profile } = useAuth();
  const [event, setEvent] = useState(initialEvent);
  const [mounted, setMounted] = useState(false);
  const [rsvps, setRsvps] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [lb, setLb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef(null);
  const isAdmin = !!profile?.is_admin;
  const canManage = !!user && (event.created_by === user.id || isAdmin);

  const removeMeet = async () => {
    if (!confirm("Slet dette meet?")) return;
    await supabase.from("events").delete().eq("id", event.id);
    onDeleted?.(event.id);
    onClose();
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("event_rsvps")
        .select("user_id, status, profiles!event_rsvps_user_id_fkey(username)")
        .eq("event_id", event.id);
      if (active) setRsvps((data || []).map((r) => ({ user_id: r.user_id, status: r.status, username: r.profiles?.username })));
    })();
    return () => { active = false; };
  }, [event.id]);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("photos")
      .select("*, profiles!photos_user_id_fkey(username)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });
    setPhotos(await enrichPhotos(data || [], user?.id));
  };
  useEffect(() => { loadPhotos(); }, [event.id, user?.id]);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        await uploadPhoto({ file, isPublic: true, car: event.title, userId: user.id, eventId: event.id });
      }
      await loadPhotos();
    } catch (err) {
      alert("Kunne ikke uploade: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const setRsvp = async (status) => {
    if (!user) return;
    const mine = rsvps.find((r) => r.user_id === user.id);
    if (mine && mine.status === status) {
      setRsvps((p) => p.filter((r) => r.user_id !== user.id));
      await supabase.from("event_rsvps").delete().eq("event_id", event.id).eq("user_id", user.id);
      return;
    }
    setRsvps((p) => [...p.filter((r) => r.user_id !== user.id), { user_id: user.id, status, username: profile?.username }]);
    await supabase.from("event_rsvps").upsert({ event_id: event.id, user_id: user.id, status }, { onConflict: "event_id,user_id" });
  };

  if (!mounted) return null;

  const yes = rsvps.filter((r) => r.status === "yes");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const mine = rsvps.find((r) => r.user_id === user?.id)?.status;

  return createPortal(
    <div className="md" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md-panel">
        <button className="md-close" onClick={onClose} aria-label="Luk">✕</button>

        <span className="overline">Meet</span>
        <h2 className="md-title">{event.title}</h2>
        {canManage && (
          <div className="md-manage">
            <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.35rem 0.8rem" }} onClick={() => setEditing(true)}>✎ Rediger</button>
            <button className="ph-btn del" style={{ flex: "none", width: "auto", padding: "0.35rem 0.8rem" }} onClick={removeMeet}>Slet</button>
          </div>
        )}
        <p className="md-when">🗓 {fmt(event.starts_at)}</p>
        {event.location && (
          <p className="md-where">📍 {event.location_url
            ? <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="c-link">{event.location}</a>
            : event.location}</p>
        )}
        {event.description && <p className="md-desc">{event.description}</p>}

        {typeof event.lat === "number" && typeof event.lng === "number" && (
          <div className="md-map">
            <MeetMap events={[event]} onSelect={() => {}} />
          </div>
        )}

        <div className="md-going">
          <span className="cp-label">Hvem kommer</span>
          {yes.length === 0 && maybe.length === 0
            ? <p className="md-empty">Ingen tilmeldte endnu.</p>
            : (
              <div className="md-going-lists">
                {yes.length > 0 && <p><b>✅ Kommer:</b> {yes.map((r) => `@${r.username || "medlem"}`).join(", ")}</p>}
                {maybe.length > 0 && <p><b>🤔 Måske:</b> {maybe.map((r) => `@${r.username || "medlem"}`).join(", ")}</p>}
              </div>
            )}
        </div>

        {session ? (
          <div className="rsvp-row md-rsvp">
            {STATUS.map((s) => (
              <button key={s.key} className={`rsvp-btn ${mine === s.key ? "on " + s.key : ""}`} onClick={() => setRsvp(s.key)}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted rsvp-login"><Link href="/login" className="c-link">Log ind</Link> for at tilmelde dig.</p>
        )}

        <div className="md-photos">
          <div className="md-photos-head">
            <span className="cp-label" style={{ margin: 0 }}>Billeder fra meet{photos.length ? ` (${photos.length})` : ""}</span>
            {session && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
                <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.4rem 0.8rem" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploader…" : "+ Tilføj billeder"}
                </button>
              </>
            )}
          </div>
          {photos.length === 0 ? (
            <p className="md-empty">Ingen billeder endnu{session ? " — del dine fra dagen 📸" : "."}</p>
          ) : (
            <div className="md-photo-grid">
              {photos.map((p, i) => (
                <button className="md-photo" key={p.id} onClick={() => setLb({ index: i })} aria-label="Åbn billede">
                  <img src={p.url} alt={p.car || "Meet-billede"} loading="lazy" />
                  {!p.approved && <span className="md-photo-pending" title="Afventer godkendelse til offentlig visning">Afventer</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lb && <PhotoLightbox photos={photos} index={lb.index} onClose={() => setLb(null)} userId={user?.id} canLike={!!session} onNeedLogin={() => { window.location.href = "/login"; }} />}
      {editing && (
        <MeetForm
          event={event}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { setEvent(updated); onUpdated?.(updated); }}
        />
      )}
    </div>,
    document.body
  );
}
