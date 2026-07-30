"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getMembers } from "../lib/admin";

const since = (t) => (t ? new Date(t).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function AdminOverview({ pendingCount = 0, liveCount = 0, onPending }) {
  const [stats, setStats] = useState({ members: 0, events: 0, posts: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let on = true;
    getAdminStats().then((s) => on && setStats(s));
    getMembers().then((m) => on && setRecent(m.slice(0, 5)));
    return () => { on = false; };
  }, []);

  const tiles = [
    { n: pendingCount, l: "Afventer godkendelse", warn: pendingCount > 0 },
    { n: stats.members, l: "Medlemmer" },
    { n: liveCount, l: "Fotos på forsiden" },
    { n: stats.events, l: "Meets" },
    { n: stats.posts, l: "Opslag" },
  ];

  return (
    <section className="member-section ao">
      <span className="overline">Overblik</span>
      <div className="ao-tiles">
        {tiles.map((t) => (
          <div key={t.l} className={`ao-tile${t.warn ? " warn" : ""}`}>
            <b>{t.n}</b><span>{t.l}</span>
          </div>
        ))}
      </div>
      {pendingCount > 0 && (
        onPending
          ? <button type="button" className="ao-cta" onClick={onPending}>→ {pendingCount} billede{pendingCount > 1 ? "r" : ""} afventer godkendelse</button>
          : <a href="#godkendelser" className="ao-cta">→ {pendingCount} billede{pendingCount > 1 ? "r" : ""} afventer godkendelse</a>
      )}
      {recent.length > 0 && (
        <div className="ao-recent">
          <span className="stp-lab">Nyeste medlemmer</span>
          <div className="ao-recent-list">
            {recent.map((m) => (
              <span key={m.id} className="ao-recent-item">{m.username}{m.is_admin ? " · admin" : ""}<i>{since(m.created_at)}</i></span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
