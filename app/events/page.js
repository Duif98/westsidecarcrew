"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import { yrUrl } from "../lib/weather";
import MeetForm from "../components/MeetForm";
import MeetWeather from "../components/MeetWeather";

const fmt = (t) =>
  new Date(t).toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayNum = (t) => new Date(t).toLocaleDateString("da-DK", { day: "numeric" });
const monShort = (t) => new Date(t).toLocaleDateString("da-DK", { month: "short" }).replace(".", "");

const STATUS = [
  { key: "yes", label: "Kommer", emoji: "✅" },
  { key: "maybe", label: "Måske", emoji: "🤔" },
  { key: "no", label: "Kan ikke", emoji: "❌" },
];

export default function EventsPage() {
  const { session, user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({}); // { [eventId]: [{user_id, status, username}] }
  const [ready, setReady] = useState(false);
  const [formOpen, setFormOpen] = useState(null); // null | { event? }

  const load = async () => {
    const { data: evs } = await supabase
      .from("events")
      .select("*")
      .gte("starts_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true });
    const list = evs || [];
    setEvents(list);
    if (list.length) {
      const { data: rs } = await supabase
        .from("event_rsvps")
        .select("event_id, user_id, status, profiles!event_rsvps_user_id_fkey(username)")
        .in("event_id", list.map((e) => e.id));
      const grouped = {};
      (rs || []).forEach((r) => {
        grouped[r.event_id] = [...(grouped[r.event_id] || []), { user_id: r.user_id, status: r.status, username: r.profiles?.username }];
      });
      setRsvps(grouped);
    } else {
      setRsvps({});
    }
    setReady(true);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (ready && session) markSeen("events"); }, [ready, session]);

  const setRsvp = async (eventId, status) => {
    if (!user) return;
    const cur = rsvps[eventId] || [];
    const mine = cur.find((r) => r.user_id === user.id);
    // Toggle off if clicking the same status again.
    if (mine && mine.status === status) {
      setRsvps((p) => ({ ...p, [eventId]: cur.filter((r) => r.user_id !== user.id) }));
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      return;
    }
    setRsvps((p) => ({
      ...p,
      [eventId]: [...cur.filter((r) => r.user_id !== user.id), { user_id: user.id, status, username: profile?.username }],
    }));
    await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: "event_id,user_id" });
  };

  const removeEvent = async (id) => {
    if (!confirm("Slet dette meet?")) return;
    setEvents((p) => p.filter((e) => e.id !== id));
    await supabase.from("events").delete().eq("id", id);
  };

  const isAdmin = !!profile?.is_admin;

  return (
    <main className="member events-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/calendar" className="mlink">📅 Kalender</Link>
            <Link href="/kort" className="mlink">🗺️ Kort</Link>
            {session ? <Link href="/medlem" className="mlink">‹ Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>

      <div className="wrap events-body">
        <div className="events-head">
          <div>
            <span className="overline">Meets & events</span>
            <h1 className="member-title">Kommende meets</h1>
          </div>
          {session && (
            <button className="btn-gold" onClick={() => setFormOpen({})}>+ Nyt meet</button>
          )}
        </div>

        {ready && events.length === 0 && (
          <div className="events-empty">
            <p>Ingen meets planlagt endnu.</p>
            {session ? <p className="muted">Vær den første til at planlægge et — tryk “Nyt meet”.</p>
              : <p className="muted"><Link href="/login" className="c-link">Log ind</Link> for at planlægge et meet.</p>}
          </div>
        )}

        <div className="events-list">
          {events.map((ev) => {
            const rs = rsvps[ev.id] || [];
            const yes = rs.filter((r) => r.status === "yes");
            const maybe = rs.filter((r) => r.status === "maybe");
            const mine = rs.find((r) => r.user_id === user?.id)?.status;
            const canManage = user && (ev.created_by === user.id || isAdmin);
            return (
              <article className="event-card" key={ev.id}>
                <div className="event-date">
                  <b>{dayNum(ev.starts_at)}</b>
                  <span>{monShort(ev.starts_at)}</span>
                </div>
                <div className="event-main">
                  <div className="event-top">
                    <h2>{ev.title}</h2>
                    {canManage && (
                      <div className="event-actions">
                        <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.3rem 0.7rem" }} onClick={() => setFormOpen({ event: ev })}>✎ Rediger</button>
                        <button className="event-del" onClick={() => removeEvent(ev.id)} aria-label="Slet meet">✕</button>
                      </div>
                    )}
                  </div>
                  <p className="event-when">🗓 {fmt(ev.starts_at)}</p>
                  {ev.location && (
                    <p className="event-where">📍 {ev.location_url
                      ? <a href={ev.location_url} target="_blank" rel="noopener noreferrer" className="c-link">{ev.location}</a>
                      : ev.location}</p>
                  )}
                  {ev.description && <p className="event-desc">{ev.description}</p>}

                  <MeetWeather lat={ev.lat} lng={ev.lng} startsAt={ev.starts_at} />
                  {typeof ev.lat === "number" && typeof ev.lng === "number" && (
                    <a className="md-yr" href={yrUrl(ev.lat, ev.lng, ev.starts_at)} target="_blank" rel="noopener noreferrer">
                      <span className="md-yr-icon">🌦</span>
                      <span>Se timevejr for dagen på yr.no</span>
                      <span className="md-yr-arrow">↗</span>
                    </a>
                  )}

                  <div className="event-going">
                    <span className="eg-count">✅ {yes.length} kommer{maybe.length ? ` · 🤔 ${maybe.length} måske` : ""}</span>
                    {yes.length > 0 && <span className="eg-names">{yes.map((r) => `@${r.username || "medlem"}`).join(", ")}</span>}
                  </div>

                  {session ? (
                    <div className="rsvp-row">
                      {STATUS.map((s) => (
                        <button key={s.key} className={`rsvp-btn ${mine === s.key ? "on " + s.key : ""}`} onClick={() => setRsvp(ev.id, s.key)}>
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted rsvp-login"><Link href="/login" className="c-link">Log ind</Link> for at svare.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {formOpen && (
        <MeetForm
          event={formOpen.event}
          onClose={() => setFormOpen(null)}
          onCreated={() => load()}
          onSaved={() => load()}
        />
      )}
    </main>
  );
}
