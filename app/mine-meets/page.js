"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import MeetDetail from "../components/MeetDetail";

// Members-only: the meets this member has said yes/maybe to, upcoming first.
export default function MineMeets() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const { t, locale } = useT();
  const fmt = (ts) => new Date(ts).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  const load = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("event_rsvps")
      .select("status, events!event_rsvps_event_id_fkey(*, creator:profiles!events_created_by_fkey(username))")
      .eq("user_id", user.id)
      .in("status", ["yes", "maybe"]);
    const cutoff = Date.now() - 6 * 3600 * 1000; // keep meets until ~6h after start
    const list = (data || [])
      .map((r) => ({ status: r.status, event: r.events }))
      .filter((r) => r.event && new Date(r.event.starts_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at));
    setRows(list);
  };
  useEffect(() => { if (session) load(); }, [session, user?.id]);

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  return (
    <main className="member mm-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/events" className="mlink">{t("common.meetsList")}</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap mm-body">
        <span className="overline">{t("mine.overline")}</span>
        <h1 className="member-title">{t("mine.title")}</h1>
        <p className="mm-intro">{t("mine.intro")}</p>

        {rows == null ? (
          <p className="muted">{t("mine.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="mm-empty">{t("mine.empty")} <Link href="/events" className="c-link">{t("mine.emptyLink")}</Link></p>
        ) : (
          <div className="mm-list">
            {rows.map(({ event, status }) => (
              <button className="mm-row" key={event.id} onClick={() => setOpen(event)}>
                <div className="mm-date">
                  <b>{new Date(event.starts_at).toLocaleDateString(locale, { day: "numeric" })}</b>
                  <span>{new Date(event.starts_at).toLocaleDateString(locale, { month: "short" }).replace(".", "")}</span>
                </div>
                <div className="mm-info">
                  <span className="mm-title">{event.title}</span>
                  <span className="mm-when">🗓 {fmt(event.starts_at)}</span>
                  {event.location && <span className="mm-where">📍 {event.location}</span>}
                </div>
                <span className={`mm-status ${status}`}>{status === "yes" ? t("rsvp.yes") : t("rsvp.maybe")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && <MeetDetail event={open} onClose={() => setOpen(null)} onUpdated={load} onDeleted={load} />}
    </main>
  );
}
