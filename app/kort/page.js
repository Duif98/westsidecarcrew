"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import MeetMap from "../components/MeetMap";
import MeetDetail from "../components/MeetDetail";

const fmt = (t) => new Date(t).toLocaleString("da-DK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function KortPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(null);

  const loadEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
    setEvents(data || []);
    setReady(true);
  };
  useEffect(() => { loadEvents(); }, []);

  const pinned = events.filter((e) => typeof e.lat === "number" && typeof e.lng === "number");
  const noPin = events.filter((e) => !(typeof e.lat === "number" && typeof e.lng === "number"));

  return (
    <main className="member kort-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/calendar" className="mlink">📅 Kalender</Link>
            <Link href="/events" className="mlink">Meets-liste</Link>
            {session ? <Link href="/medlem" className="mlink">Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>

      <div className="wrap kort-body">
        <span className="overline">Kort</span>
        <h1 className="member-title">Hvor holder vi meets?</h1>
        <p className="kort-intro">Klik på en markør for at se detaljer og tilmelde dig. Sæt en nål på et meet når du opretter det.</p>

        <div className="kort-wrap">
          {ready && pinned.length === 0
            ? <div className="kort-empty">Ingen meets med kort-placering endnu.{session ? " Sæt en nål når du opretter et meet i kalenderen." : ""}</div>
            : <MeetMap events={pinned} onSelect={(e) => setOpen(e)} />}
        </div>

        {noPin.length > 0 && (
          <div className="kort-nopin">
            <span className="cp-label">Meets uden kort-placering</span>
            {noPin.map((e) => (
              <button className="kort-nopin-row" key={e.id} onClick={() => setOpen(e)}>
                <b>{e.title}</b><span>{fmt(e.starts_at)}{e.location ? ` · ${e.location}` : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && <MeetDetail event={open} onClose={() => setOpen(null)} onUpdated={(u) => { setOpen(u); loadEvents(); }} onDeleted={loadEvents} />}
    </main>
  );
}
