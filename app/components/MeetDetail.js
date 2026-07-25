"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const fmt = (t) =>
  new Date(t).toLocaleString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS = [
  { key: "yes", label: "Kommer", emoji: "✅" },
  { key: "maybe", label: "Måske", emoji: "🤔" },
  { key: "no", label: "Kan ikke", emoji: "❌" },
];

// Full details + RSVP for a single meet. Rendered as a portal dialog so it can
// be opened from the calendar (or anywhere).
export default function MeetDetail({ event, onClose }) {
  const { session, user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [rsvps, setRsvps] = useState([]);

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
        <p className="md-when">🗓 {fmt(event.starts_at)}</p>
        {event.location && (
          <p className="md-where">📍 {event.location_url
            ? <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="c-link">{event.location}</a>
            : event.location}</p>
        )}
        {event.description && <p className="md-desc">{event.description}</p>}

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
      </div>
    </div>,
    document.body
  );
}
