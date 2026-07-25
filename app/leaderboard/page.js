"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const score = (r) => r.likes_received * 3 + r.photos * 2 + r.comments;
const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { session, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("leaderboard");
      if (!active) return;
      if (error) { setMissing(true); setReady(true); return; }
      const list = (data || []).map((r) => ({ ...r, score: score(r) }));
      list.sort((a, b) => b.score - a.score || b.likes_received - a.likes_received);
      setRows(list);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  // Award badges to the current single leader in each category (min 1).
  const active = rows.filter((r) => r.score > 0);
  const topBy = (key) => {
    const best = active.reduce((m, r) => (r[key] > (m?.[key] ?? 0) ? r : m), null);
    return best && best[key] > 0 ? best.user_id : null;
  };
  const badges = {
    likes: topBy("likes_received"),
    photos: topBy("photos"),
    comments: topBy("comments"),
  };
  const badgeFor = (id) => {
    const b = [];
    if (badges.likes === id) b.push({ e: "👑", t: "Mest liket" });
    if (badges.photos === id) b.push({ e: "📸", t: "Top fotograf" });
    if (badges.comments === id) b.push({ e: "💬", t: "Mest aktiv" });
    return b;
  };

  return (
    <main className="member lb-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            {session ? <Link href="/medlem" className="mlink">‹ Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>

      <div className="wrap lb-body">
        <span className="overline">Rangliste</span>
        <h1 className="member-title">Leaderboard</h1>
        <p className="lb-intro">Point = likes ×3 + billeder ×2 + kommentarer. Bliv aktiv og kravl op ad listen 🏁</p>

        {missing && <p className="lb-note">Ranglisten er ikke sat op endnu (kør <code>011-leaderboard.sql</code> i Supabase).</p>}
        {ready && !missing && active.length === 0 && <p className="lb-note">Ingen aktivitet endnu — upload billeder og giv likes for at komme på tavlen.</p>}

        {active.length > 0 && (
          <div className="lb-list">
            {active.map((r, i) => (
              <div className={`lb-row ${r.user_id === user?.id ? "me" : ""} ${i < 3 ? "podium" : ""}`} key={r.user_id}>
                <div className="lb-rank">{i < 3 ? MEDALS[i] : <span className="lb-num">{i + 1}</span>}</div>
                <div className="lb-who">
                  <div className="lb-name">@{r.username}{r.user_id === user?.id ? <span className="lb-you"> dig</span> : null}</div>
                  <div className="lb-badges">
                    {badgeFor(r.user_id).map((b) => <span key={b.t} className="lb-badge" title={b.t}>{b.e} {b.t}</span>)}
                  </div>
                </div>
                <div className="lb-stats">
                  <span title="Likes modtaget">❤️ {r.likes_received}</span>
                  <span title="Billeder">📸 {r.photos}</span>
                  <span title="Kommentarer">💬 {r.comments}</span>
                </div>
                <div className="lb-score"><b>{r.score}</b><span>point</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
