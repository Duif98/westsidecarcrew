"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import Reveal from "./Reveal";

const fmt = (t) =>
  new Date(t).toLocaleString("da-DK", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const dayNum = (t) => new Date(t).toLocaleDateString("da-DK", { day: "numeric" });
const monShort = (t) => new Date(t).toLocaleDateString("da-DK", { month: "short" }).replace(".", "");

// Public teaser for the next upcoming meet. Renders nothing if there is none
// or if the events table isn't set up yet (fail-safe).
export default function EventTeaser() {
  const [ev, setEv] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("starts_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(1);
      if (!active || error || !data?.length) return;
      const next = data[0];
      setEv(next);
      const { count: c } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", next.id)
        .eq("status", "yes");
      if (active) setCount(c || 0);
    })();
    return () => { active = false; };
  }, []);

  if (!ev) return null;

  return (
    <section className="next-meet" aria-label="Næste meet">
      <div className="wrap">
        <Reveal className="next-meet-card" as="div">
          <div className="nm-date">
            <b>{dayNum(ev.starts_at)}</b>
            <span>{monShort(ev.starts_at)}</span>
          </div>
          <div className="nm-body">
            <span className="overline">Næste meet</span>
            <h3>{ev.title}</h3>
            <p className="nm-when">{fmt(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""}</p>
            {count > 0 && <p className="nm-going">✅ {count} kommer</p>}
          </div>
          <Link href="/events" className="btn-gold nm-cta">Se & tilmeld →</Link>
        </Reveal>
      </div>
    </section>
  );
}
