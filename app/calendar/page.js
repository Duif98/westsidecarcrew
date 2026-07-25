"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import MeetDetail from "../components/MeetDetail";
import MeetForm from "../components/MeetForm";
import WeatherIcon from "../components/WeatherIcon";
import { fetchMeetWeather } from "../lib/weather";

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const MONTHS = ["Januar", "Februar", "Marts", "April", "Maj", "Juni", "Juli", "August", "September", "Oktober", "November", "December"];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const eventKey = (iso) => dateKey(new Date(iso));
const hm = (iso) => new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

export default function CalendarPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(null); // null | { date }

  const loadEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
    setEvents(data || []);
  };

  useEffect(() => { loadEvents(); }, []);

  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => { (map[eventKey(e.starts_at)] ||= []).push(e); });
    return map;
  }, [events]);

  // Fetch a forecast for each day that has a meet with coordinates (within the
  // ~9-day window). Keyed by dateKey; weather.js caches per coord so repeats are
  // cheap. Days that are past / too far out just never get an entry.
  const [wxByDay, setWxByDay] = useState({});
  useEffect(() => {
    let active = true;
    (async () => {
      const results = {};
      for (const [day, evs] of Object.entries(byDay)) {
        const e = evs.find((x) => typeof x.lat === "number" && typeof x.lng === "number");
        if (!e) continue;
        try {
          const wx = await fetchMeetWeather(e.lat, e.lng, e.starts_at);
          if (wx && !wx.past && !wx.tooFar) results[day] = wx;
        } catch {}
      }
      if (active) setWxByDay(results);
    })();
    return () => { active = false; };
  }, [byDay]);

  // Build a Monday-first grid covering the visible month (with spillover days).
  const weeks = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
    const start = new Date(year, month, 1 - startOffset);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      cells.push(d);
    }
    // Trim trailing empty week if the month fits in 5 rows.
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows.filter((row) => row.some((d) => d.getMonth() === month) || rows.indexOf(row) < 5);
  }, [cursor]);

  const todayKey = dateKey(new Date());
  const move = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); };

  return (
    <main className="member cal-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/events" className="mlink">Meets-liste</Link>
            {session ? <Link href="/medlem" className="mlink">Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>

      <div className="wrap cal-body">
        <span className="overline">Kalender</span>
        <div className="cal-head">
          <h1 className="member-title">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h1>
          <div className="cal-nav">
            <button className="cal-arrow" onClick={() => move(-1)} aria-label="Forrige måned">‹</button>
            <button className="cal-today" onClick={goToday}>I dag</button>
            <button className="cal-arrow" onClick={() => move(1)} aria-label="Næste måned">›</button>
            {session && <button className="btn-gold cal-new" onClick={() => setCreating({ date: "" })}>+ Nyt meet</button>}
          </div>
        </div>
        {session && <p className="cal-hint">Tip: klik på en dag for at planlægge et meet den dato.</p>}

        <div className="cal-grid">
          {WEEKDAYS.map((w) => <div className="cal-wd" key={w}>{w}</div>)}
          {weeks.flat().map((d) => {
            const key = dateKey(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayEvents = byDay[key] || [];
            const wx = wxByDay[key];
            return (
              <div
                className={`cal-cell ${inMonth ? "" : "out"} ${key === todayKey ? "today" : ""} ${dayEvents.length ? "has" : ""} ${wx ? "wx-cell wx-" + wx.category : ""} ${session ? "clickable" : ""}`}
                key={key}
                onClick={session ? () => setCreating({ date: key }) : undefined}
                role={session ? "button" : undefined}
                aria-label={session ? `Planlæg meet den ${d.getDate()}.` : undefined}
              >
                <span className="cal-daynum">{d.getDate()}</span>
                {session && <span className="cal-add" aria-hidden="true">+</span>}
                {wx && (
                  <div className="cal-wx" title={`${wx.label}${wx.temp != null ? ` · ${wx.temp}°` : ""}`}>
                    <div className="cal-wx-top">
                      <WeatherIcon category={wx.category} size={26} />
                      {wx.temp != null && <span className="cal-wx-temp">{wx.temp}°</span>}
                    </div>
                    <div className="cal-wx-stats">
                      {wx.precipProb != null && <span>💧 {wx.precipProb}%</span>}
                      {wx.precip != null && wx.precip > 0 && <span>{wx.precip} mm</span>}
                      {wx.wind != null && <span>💨 {wx.wind} m/s</span>}
                    </div>
                  </div>
                )}
                <div className="cal-events">
                  {dayEvents.map((e) => (
                    <button key={e.id} className="cal-chip" onClick={(ev) => { ev.stopPropagation(); setOpen(e); }} title={e.title}>
                      <span className="cal-chip-time">{hm(e.starts_at)}</span>
                      <span className="cal-chip-title">{e.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {events.length === 0 && (
          <p className="cal-note">Ingen meets i kalenderen endnu.{session ? " Klik på en dag eller “+ Nyt meet” for at planlægge det første." : <> <Link href="/login" className="c-link">Log ind</Link> for at planlægge et.</>}</p>
        )}
      </div>

      {open && <MeetDetail event={open} onClose={() => setOpen(null)} onUpdated={loadEvents} onDeleted={loadEvents} />}
      {creating && (
        <MeetForm
          presetDate={creating.date}
          onClose={() => setCreating(null)}
          onCreated={(ev) => { loadEvents(); setCursor(new Date(new Date(ev.starts_at).getFullYear(), new Date(ev.starts_at).getMonth(), 1)); }}
        />
      )}
    </main>
  );
}
