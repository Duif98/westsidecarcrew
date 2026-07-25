"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useT } from "../lib/i18n";
import Reveal from "./Reveal";

// Public teaser for the next upcoming meet. Renders nothing if there is none
// or if the events table isn't set up yet (fail-safe).
export default function EventTeaser() {
  const { t, locale } = useT();
  const fmt = (ts) => new Date(ts).toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const dayNum = (ts) => new Date(ts).toLocaleDateString(locale, { day: "numeric" });
  const monShort = (ts) => new Date(ts).toLocaleDateString(locale, { month: "short" }).replace(".", "");
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
    <section className="next-meet" aria-label={t("teaser.overline")}>
      <div className="wrap">
        <Reveal className="next-meet-card" as="div">
          <div className="nm-date">
            <b>{dayNum(ev.starts_at)}</b>
            <span>{monShort(ev.starts_at)}</span>
          </div>
          <div className="nm-body">
            <span className="overline">{t("teaser.overline")}</span>
            <h3>{ev.title}</h3>
            <p className="nm-when">{fmt(ev.starts_at)}{ev.location ? ` · ${ev.location}` : ""}</p>
            {count > 0 && <p className="nm-going">✅ {t("teaser.coming", { n: count })}</p>}
          </div>
          <Link href="/events" className="btn-gold nm-cta">{t("teaser.cta")}</Link>
        </Reveal>
      </div>
    </section>
  );
}
