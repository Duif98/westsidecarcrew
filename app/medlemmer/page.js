"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const MEDALS = ["🥇", "🥈", "🥉"];
const scoreOf = (r) => r.likes_received * 3 + r.photos * 2 + r.comments;

export default function MembersPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profs }, { data: albums }, { data: board }] = await Promise.all([
        supabase.from("profiles").select("id, username, created_at, is_admin"),
        supabase.from("albums").select("id, created_by").not("created_by", "is", null),
        supabase.rpc("leaderboard"),
      ]);
      if (!active) return;
      const carCount = {};
      (albums || []).forEach((a) => { carCount[a.created_by] = (carCount[a.created_by] || 0) + 1; });

      // Rank for medals (same score as leaderboard).
      const ranked = (board || []).map((r) => ({ ...r, score: scoreOf(r) })).sort((a, b) => b.score - a.score);
      const rankById = {};
      ranked.forEach((r, i) => { if (r.score > 0) rankById[r.user_id] = i; });
      const statById = Object.fromEntries((board || []).map((r) => [r.user_id, r]));

      const list = (profs || []).map((p) => ({
        ...p,
        cars: carCount[p.id] || 0,
        rank: rankById[p.id],
        likes: statById[p.id]?.likes_received || 0,
        photos: statById[p.id]?.photos || 0,
      })).sort((a, b) => {
        const ra = a.rank ?? 999, rb = b.rank ?? 999;
        if (ra !== rb) return ra - rb;
        return a.username.localeCompare(b.username, "da");
      });
      setMembers(list);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="member members-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/leaderboard" className="mlink">🏆 Leaderboard</Link>
            {session ? <Link href="/medlem" className="mlink">Medlem</Link> : <Link href="/login" className="mlink">Log ind</Link>}
          </div>
        </div>
      </div>

      <div className="wrap members-body">
        <span className="overline">Crewet</span>
        <h1 className="member-title">Medlemmer</h1>
        <p className="members-intro">{members.length} medlemmer. Klik ind på en profil for at se biler, byggetråde og badges.</p>

        {ready && members.length === 0 && <p className="muted">Ingen medlemmer endnu.</p>}

        <div className="members-grid">
          {members.map((m) => (
            <Link href={`/profil?u=${encodeURIComponent(m.username)}`} className="mcard" key={m.id}>
              <div className="mcard-avatar">{m.username.slice(0, 2).toUpperCase()}</div>
              <div className="mcard-info">
                <span className="mcard-name">@{m.username}{typeof m.rank === "number" && m.rank < 3 ? ` ${MEDALS[m.rank]}` : ""}</span>
                <span className="mcard-meta">
                  {m.cars > 0 ? `${m.cars} bil${m.cars > 1 ? "er" : ""}` : "Ingen biler endnu"}
                  {m.likes > 0 ? ` · ❤️ ${m.likes}` : ""}
                  {m.is_admin ? " · 🛠 admin" : ""}
                </span>
              </div>
              <span className="mcard-go">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
