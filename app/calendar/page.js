"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import MeetDetail from "../components/MeetDetail";
import MeetForm from "../components/MeetForm";
import WeatherIcon from "../components/WeatherIcon";
import { fetchMeetWeather } from "../lib/weather";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const eventKey = (iso) => dateKey(new Date(iso));

// Short weekday names (Mon-first) and full month names for the active locale.
const weekdayNames = (locale) => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 2024-01-01 is a Monday.
  return Array.from({ length: 7 }, (_, i) => {
    const s = fmt.format(new Date(2024, 0, 1 + i));
    return s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");
  });
};
const monthName = (locale, month) => {
  const s = new Date(2024, month, 1).toLocaleDateString(locale, { month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function CalendarPage() {
  const { session } = useAuth();
  const { t, locale } = useT();
  const WEEKDAYS = weekdayNames(locale);
  const hm = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
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
            <Link href="/events" className="mlink">{t("common.meetsList")}</Link>
            {session ? <Link href="/medlem" className="mlink">{t("common.member")}</Link> : <Link href="/login" className="mlink">{t("common.loginShort")}</Link>}
          </div>
        </div>
      </div>

      <div className="wrap cal-body">
        <span className="overline">{t("calendar.overline")}</span>
        <div className="cal-head">
          <h1 className="member-title">{monthName(locale, cursor.getMonth())} {cursor.getFullYear()}</h1>
          <div className="cal-nav">
            <button className="cal-arrow" onClick={() => move(-1)} aria-label={t("calendar.prevMonth")}>‹</button>
            <button className="cal-today" onClick={goToday}>{t("calendar.today")}</button>
            <button className="cal-arrow" onClick={() => move(1)} aria-label={t("calendar.nextMonth")}>›</button>
            {session && <button className="btn-gold cal-new" onClick={() => setCreating({ date: "" })}>{t("calendar.newMeet")}</button>}
          </div>
        </div>
        {session && <p className="cal-hint">{t("calendar.hint")}</p>}

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
                aria-label={session ? t("calendar.planAria", { day: d.getDate() }) : undefined}
              >
                <span className="cal-daynum">{d.getDate()}</span>
                {session && <span className="cal-add" aria-hidden="true">+</span>}
                {wx && (
                  <div className="cal-wx" title={`${t("weather." + (wx.labelKey || "unknown"))}${wx.temp != null ? ` · ${wx.temp}°` : ""}`}>
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
          <p className="cal-note">{t("calendar.emptyA")}{session ? t("calendar.emptyMember") : <> <Link href="/login" className="c-link">{t("calendar.emptyGuestLogin")}</Link>{t("calendar.emptyGuestB")}</>}</p>
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
