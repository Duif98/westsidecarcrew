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
import MeetWeather from "./MeetWeather";
import { yrUrl } from "../lib/weather";
import { directionsUrl } from "../lib/geo";
import Linkify from "./Linkify";
import { useT } from "../lib/i18n";

const STATUS = [
  { key: "yes", emoji: "✅" },
  { key: "maybe", emoji: "🤔" },
  { key: "no", emoji: "❌" },
];

// Full details + RSVP for a single meet. Rendered as a portal dialog so it can
// be opened from the calendar (or anywhere).
export default function MeetDetail({ event: initialEvent, onClose, onUpdated, onDeleted }) {
  const { session, user, profile } = useAuth();
  const { t, locale } = useT();
  const fmt = (ts) => new Date(ts).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const [event, setEvent] = useState(initialEvent);
  const [mounted, setMounted] = useState(false);
  const [rsvps, setRsvps] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [lb, setLb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const fileRef = useRef(null);
  const isAdmin = !!profile?.is_admin;
  const canManage = !!user && (event.created_by === user.id || isAdmin);

  const removeMeet = async () => {
    if (!confirm(t("meet.confirmDelete"))) return;
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
      // Reasons are members-only (RLS blocks anon), so only fetch them when logged in.
      const notes = {};
      if (session) {
        const { data: nd } = await supabase
          .from("event_rsvp_notes")
          .select("user_id, note")
          .eq("event_id", event.id);
        (nd || []).forEach((n) => { if (n.note) notes[n.user_id] = n.note; });
      }
      if (active) setRsvps((data || []).map((r) => ({ user_id: r.user_id, status: r.status, username: r.profiles?.username, note: notes[r.user_id] || null })));
    })();
    return () => { active = false; };
  }, [event.id, session]);

  // Keep the reason editor in sync with the member's own saved note.
  useEffect(() => {
    const my = rsvps.find((r) => r.user_id === user?.id);
    setNoteDraft(my?.note || "");
  }, [rsvps, user?.id]);

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
      alert(t("meet.uploadError") + (err.message || err));
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
      await supabase.from("event_rsvp_notes").delete().eq("event_id", event.id).eq("user_id", user.id);
      return;
    }
    setRsvps((p) => {
      const keptNote = p.find((r) => r.user_id === user.id)?.note || null;
      return [...p.filter((r) => r.user_id !== user.id), { user_id: user.id, status, username: profile?.username, note: keptNote }];
    });
    await supabase.from("event_rsvps").upsert({ event_id: event.id, user_id: user.id, status }, { onConflict: "event_id,user_id" });
  };

  // Save (or clear) the member's private reason for their RSVP.
  const saveNote = async () => {
    if (!user) return;
    setNoteSaving(true);
    const note = noteDraft.trim().slice(0, 300) || null;
    if (note) {
      await supabase.from("event_rsvp_notes").upsert({ event_id: event.id, user_id: user.id, note, updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" });
    } else {
      await supabase.from("event_rsvp_notes").delete().eq("event_id", event.id).eq("user_id", user.id);
    }
    setRsvps((p) => p.map((r) => (r.user_id === user.id ? { ...r, note } : r)));
    setNoteSaving(false);
  };

  if (!mounted) return null;

  const yes = rsvps.filter((r) => r.status === "yes");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const no = rsvps.filter((r) => r.status === "no");
  const mine = rsvps.find((r) => r.user_id === user?.id)?.status;

  return createPortal(
    <div className="md" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md-panel">
        <button className="md-close" onClick={onClose} aria-label={t("meet.close")}>✕</button>

        <span className="overline">{t("meet.tag")}</span>
        <h2 className="md-title">{event.title}</h2>
        {canManage && (
          <div className="md-manage">
            <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.35rem 0.8rem" }} onClick={() => setEditing(true)}>{t("meet.edit")}</button>
            <button className="ph-btn del" style={{ flex: "none", width: "auto", padding: "0.35rem 0.8rem" }} onClick={removeMeet}>{t("meet.delete")}</button>
          </div>
        )}
        <p className="md-when">🗓 {fmt(event.starts_at)}</p>
        {event.location && (
          <p className="md-where">📍 {event.location_url
            ? <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="c-link">{event.location}</a>
            : event.location}</p>
        )}
        {directionsUrl(event.lat, event.lng, event.location) && (
          <a className="md-dir" href={directionsUrl(event.lat, event.lng, event.location)} target="_blank" rel="noopener noreferrer">
            🧭 {t("meet.directions")}
          </a>
        )}
        {event.link_url && (
          <a className="md-dir md-link" href={event.link_url} target="_blank" rel="noopener noreferrer">
            🔗 {t("meet.openLink")}
          </a>
        )}
        {event.description && <p className="md-desc"><Linkify text={event.description} /></p>}

        <MeetWeather lat={event.lat} lng={event.lng} startsAt={event.starts_at} />

        {typeof event.lat === "number" && typeof event.lng === "number" && (
          <a
            className="md-yr"
            href={yrUrl(event.lat, event.lng, event.starts_at)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="md-yr-icon">🌦</span>
            <span>{t("meet.yrLink")}</span>
            <span className="md-yr-arrow">↗</span>
          </a>
        )}

        {typeof event.lat === "number" && typeof event.lng === "number" && (
          <div className="md-map">
            <MeetMap events={[event]} onSelect={() => {}} />
          </div>
        )}

        <div className="md-going">
          <span className="cp-label">{t("meet.whoComing")}</span>
          {yes.length === 0 && maybe.length === 0
            ? <p className="md-empty">{t("meet.noneComing")}</p>
            : (
              <div className="md-going-lists">
                {yes.length > 0 && <p><b>{t("meet.comingLabel")}</b> {yes.map((r) => `@${r.username || t("photo.member")}`).join(", ")}</p>}
                {maybe.length > 0 && <p><b>{t("meet.maybeLabel")}</b> {maybe.map((r) => `@${r.username || t("photo.member")}`).join(", ")}</p>}
              </div>
            )}
          {/* "Kommer ikke" + private reasons — members only (RLS also hides the notes from anon). */}
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
        </div>

        {session ? (
          <>
            <div className="rsvp-row md-rsvp">
              {STATUS.map((s) => (
                <button key={s.key} className={`rsvp-btn ${mine === s.key ? "on " + s.key : ""}`} onClick={() => setRsvp(s.key)}>
                  {s.emoji} {t(`rsvp.${s.key}`)}
                </button>
              ))}
            </div>
            {mine === "no" && (
              <div className="md-reason">
                <label className="cp-label md-reason-label" htmlFor="rsvp-reason">{t("meet.reasonLabel")}</label>
                <textarea id="rsvp-reason" rows={2} maxLength={300} value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)} placeholder={t("meet.reasonPh")} />
                <div className="md-reason-actions">
                  <span className="md-reason-hint">{t("meet.reasonHint")}</span>
                  <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.35rem 0.9rem" }} onClick={saveNote} disabled={noteSaving}>
                    {noteSaving ? t("meet.saving") : t("meet.saveReason")}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="muted rsvp-login"><Link href="/login" className="c-link">{t("meet.loginToRsvpLogin")}</Link>{t("meet.loginToRsvpB")}</p>
        )}

        <div className="md-photos">
          <div className="md-photos-head">
            <span className="cp-label" style={{ margin: 0 }}>{t("meet.photosLabel")}{photos.length ? ` (${photos.length})` : ""}</span>
            {session && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
                <button className="ph-btn" style={{ flex: "none", width: "auto", padding: "0.4rem 0.8rem" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? t("meet.uploading") : t("meet.addPhotos")}
                </button>
              </>
            )}
          </div>
          {photos.length === 0 ? (
            <p className="md-empty">{t("meet.noPhotos")}{session ? t("meet.noPhotosMember") : t("meet.period")}</p>
          ) : (
            <div className="md-photo-grid">
              {photos.map((p, i) => (
                <button className="md-photo" key={p.id} onClick={() => setLb({ index: i })} aria-label={t("meet.openPhoto")}>
                  <img src={p.url} alt={p.car || t("meet.photoAlt")} loading="lazy" />
                  {!p.approved && <span className="md-photo-pending" title={t("meet.pendingTitle")}>{t("meet.pending")}</span>}
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
