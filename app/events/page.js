"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { markSeen } from "../lib/useUnread";
import { yrUrl } from "../lib/weather";
import { directionsUrl } from "../lib/geo";
import Linkify from "../components/Linkify";
import { useT } from "../lib/i18n";
import MeetForm from "../components/MeetForm";
import MeetWeather from "../components/MeetWeather";

const STATUS = [
  { key: "yes", emoji: "✅" },
  { key: "maybe", emoji: "🤔" },
  { key: "no", emoji: "❌" },
];

export default function EventsPage() {
  const { session, user, profile } = useAuth();
  const { t, locale } = useT();
  const fmt = (ts) => new Date(ts).toLocaleString(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const dayNum = (ts) => new Date(ts).toLocaleDateString(locale, { day: "numeric" });
  const monShort = (ts) => new Date(ts).toLocaleDateString(locale, { month: "short" }).replace(".", "");
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({}); // { [eventId]: [{user_id, status, username, note}] }
  const [ready, setReady] = useState(false);
  const [formOpen, setFormOpen] = useState(null); // null | { event? }
  const [noteDrafts, setNoteDrafts] = useState({}); // { [eventId]: string } — own reason editor
  const [savingNote, setSavingNote] = useState(null); // eventId currently saving

  const load = async () => {
    const { data: evs } = await supabase
      .from("events")
      .select("*")
      .gte("starts_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true });
    const list = evs || [];
    setEvents(list);
    if (list.length) {
      const ids = list.map((e) => e.id);
      const { data: rs } = await supabase
        .from("event_rsvps")
        .select("event_id, user_id, status, profiles!event_rsvps_user_id_fkey(username)")
        .in("event_id", ids);
      // Private reasons — members only (RLS blocks anon).
      const notes = {}; // { [eventId]: { [userId]: note } }
      if (session) {
        const { data: nd } = await supabase
          .from("event_rsvp_notes")
          .select("event_id, user_id, note")
          .in("event_id", ids);
        (nd || []).forEach((n) => { if (n.note) (notes[n.event_id] ||= {})[n.user_id] = n.note; });
      }
      const grouped = {};
      (rs || []).forEach((r) => {
        grouped[r.event_id] = [...(grouped[r.event_id] || []), { user_id: r.user_id, status: r.status, username: r.profiles?.username, note: notes[r.event_id]?.[r.user_id] || null }];
      });
      setRsvps(grouped);
      const drafts = {};
      if (user) Object.entries(notes).forEach(([eid, byUser]) => { if (byUser[user.id]) drafts[eid] = byUser[user.id]; });
      setNoteDrafts(drafts);
    } else {
      setRsvps({});
    }
    setReady(true);
  };

  useEffect(() => { load(); }, [session]);
  useEffect(() => { if (ready && session) markSeen("events"); }, [ready, session]);

  const setRsvp = async (eventId, status) => {
    if (!user) return;
    const cur = rsvps[eventId] || [];
    const mine = cur.find((r) => r.user_id === user.id);
    // Toggle off if clicking the same status again.
    if (mine && mine.status === status) {
      setRsvps((p) => ({ ...p, [eventId]: cur.filter((r) => r.user_id !== user.id) }));
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id);
      await supabase.from("event_rsvp_notes").delete().eq("event_id", eventId).eq("user_id", user.id);
      return;
    }
    const keptNote = mine?.note || null;
    setRsvps((p) => ({
      ...p,
      [eventId]: [...cur.filter((r) => r.user_id !== user.id), { user_id: user.id, status, username: profile?.username, note: keptNote }],
    }));
    await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: "event_id,user_id" });
  };

  // Save (or clear) the member's private reason for a meet.
  const saveNote = async (eventId) => {
    if (!user) return;
    setSavingNote(eventId);
    const note = (noteDrafts[eventId] || "").trim().slice(0, 300) || null;
    if (note) await supabase.from("event_rsvp_notes").upsert({ event_id: eventId, user_id: user.id, note, updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" });
    else await supabase.from("event_rsvp_notes").delete().eq("event_id", eventId).eq("user_id", user.id);
    setRsvps((p) => ({ ...p, [eventId]: (p[eventId] || []).map((r) => (r.user_id === user.id ? { ...r, note } : r)) }));
    setSavingNote(null);
  };

  const removeEvent = async (id) => {
    if (!confirm(t("events.confirmDelete"))) return;
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
            <Link href="/calendar" className="mlink">📅 {t("nav.calendar")}</Link>
            <Link href="/kort" className="mlink">🗺️ {t("nav.map")}</Link>
            {session ? <Link href="/medlem" className="mlink">{t("common.back")}</Link> : <Link href="/login" className="mlink">{t("common.loginShort")}</Link>}
          </div>
        </div>
      </div>

      <div className="wrap events-body">
        <div className="events-head">
          <div>
            <span className="overline">{t("events.overline")}</span>
            <h1 className="member-title">{t("events.title")}</h1>
          </div>
          {session && (
            <button className="btn-gold" onClick={() => setFormOpen({})}>{t("events.newMeet")}</button>
          )}
        </div>

        {ready && events.length === 0 && (
          <div className="events-empty">
            <p>{t("events.emptyTitle")}</p>
            {session ? <p className="muted">{t("events.emptyMember")}</p>
              : <p className="muted"><Link href="/login" className="c-link">{t("events.emptyGuestLogin")}</Link>{t("events.emptyGuestB")}</p>}
          </div>
        )}

        <div className="events-list">
          {events.map((ev) => {
            const rs = rsvps[ev.id] || [];
            const yes = rs.filter((r) => r.status === "yes");
            const maybe = rs.filter((r) => r.status === "maybe");
            const no = rs.filter((r) => r.status === "no");
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
                        <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.3rem 0.7rem" }} onClick={() => setFormOpen({ event: ev })}>{t("events.edit")}</button>
                        <button className="event-del" onClick={() => removeEvent(ev.id)} aria-label={t("events.deleteMeet")}>✕</button>
                      </div>
                    )}
                  </div>
                  <p className="event-when">🗓 {fmt(ev.starts_at)}</p>
                  {ev.location && (
                    <p className="event-where">📍 {ev.location_url
                      ? <a href={ev.location_url} target="_blank" rel="noopener noreferrer" className="c-link">{ev.location}</a>
                      : ev.location}</p>
                  )}
                  {directionsUrl(ev.lat, ev.lng, ev.location) && (
                    <a className="md-dir" href={directionsUrl(ev.lat, ev.lng, ev.location)} target="_blank" rel="noopener noreferrer">
                      🧭 {t("meet.directions")}
                    </a>
                  )}
                  {ev.link_url && (
                    <a className="md-dir md-link" href={ev.link_url} target="_blank" rel="noopener noreferrer">
                      🔗 {t("meet.openLink")}
                    </a>
                  )}
                  {ev.description && <p className="event-desc"><Linkify text={ev.description} /></p>}

                  <MeetWeather lat={ev.lat} lng={ev.lng} startsAt={ev.starts_at} />
                  {typeof ev.lat === "number" && typeof ev.lng === "number" && (
                    <a className="md-yr" href={yrUrl(ev.lat, ev.lng, ev.starts_at)} target="_blank" rel="noopener noreferrer">
                      <span className="md-yr-icon">🌦</span>
                      <span>{t("events.yrLink")}</span>
                      <span className="md-yr-arrow">↗</span>
                    </a>
                  )}

                  <div className="event-going">
                    <span className="eg-count">✅ {t("events.comingN", { n: yes.length })}{maybe.length ? ` · 🤔 ${t("events.maybeN", { n: maybe.length })}` : ""}</span>
                    {yes.length > 0 && <span className="eg-names">{yes.map((r) => `@${r.username || t("photo.member")}`).join(", ")}</span>}
                  </div>

                  {/* "Kommer ikke" + private reasons — members only (RLS also hides notes from anon). */}
                  {session && no.length > 0 && (
                    <div className="md-not-coming">
                      <p className="md-nc-head"><b>{t("meet.notComingLabel")}</b></p>
                      <ul className="md-nc-list">
                        {no.map((r) => (
                          <li key={r.user_id}>
                            <span className="md-nc-name">@{r.username || t("photo.member")}</span>
                            {r.note
                              ? <span className="md-nc-reason">„{r.note}"</span>
                              : <span className="md-nc-noreason">{t("meet.noReason")}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session ? (
                    <>
                      <div className="rsvp-row">
                        {STATUS.map((s) => (
                          <button key={s.key} className={`rsvp-btn ${mine === s.key ? "on " + s.key : ""}`} onClick={() => setRsvp(ev.id, s.key)}>
                            {s.emoji} {t(`rsvp.${s.key}`)}
                          </button>
                        ))}
                      </div>
                      {mine === "no" && (
                        <div className="md-reason">
                          <label className="cp-label md-reason-label" htmlFor={`reason-${ev.id}`}>{t("meet.reasonLabel")}</label>
                          <textarea id={`reason-${ev.id}`} rows={2} maxLength={300} value={noteDrafts[ev.id] || ""}
                            onChange={(e) => setNoteDrafts((p) => ({ ...p, [ev.id]: e.target.value }))} placeholder={t("meet.reasonPh")} />
                          <div className="md-reason-actions">
                            <span className="md-reason-hint">{t("meet.reasonHint")}</span>
                            <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.35rem 0.9rem" }} onClick={() => saveNote(ev.id)} disabled={savingNote === ev.id}>
                              {savingNote === ev.id ? t("meet.saving") : t("meet.saveReason")}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="muted rsvp-login"><Link href="/login" className="c-link">{t("events.loginToRsvpLogin")}</Link>{t("events.loginToRsvpB")}</p>
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
