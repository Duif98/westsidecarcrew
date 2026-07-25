"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

const MEDALS = ["🥇", "🥈", "🥉"];
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
const scoreOf = (r) => r.likes_received * 3 + r.photos * 2 + r.comments;

export default function MembersPage() {
  const { session } = useAuth();
  const { t } = useT();
  const [members, setMembers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profs }, { data: albums }, { data: board }] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("albums").select("id, created_by, is_curated, owner_name"),
        supabase.rpc("leaderboard"),
      ]);
      if (!active) return;
      // A member's cars = albums they created + curated cars whose owner matches
      // their username (same rule the profile page uses, so the counts agree).
      const byName = {};
      (profs || []).forEach((p) => (byName[p.username] = p.id));
      const carCount = {};
      (albums || []).forEach((a) => {
        const ownerId = a.created_by || (a.is_curated && a.owner_name ? byName[a.owner_name] : null);
        if (ownerId) carCount[ownerId] = (carCount[ownerId] || 0) + 1;
      });

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
            <Link href="/leaderboard" className="mlink">🏆 {t("nav.leaderboard")}</Link>
            {session ? <Link href="/medlem" className="mlink">{t("common.member")}</Link> : <Link href="/login" className="mlink">{t("common.loginShort")}</Link>}
          </div>
        </div>
      </div>

      <div className="wrap members-body">
        <span className="overline">{t("members.overline")}</span>
        <h1 className="member-title">{t("members.title")}</h1>
        <p className="members-intro">{t("members.intro", { n: members.length })}</p>

        {ready && members.length === 0 && <p className="muted">{t("members.empty")}</p>}

        <div className="members-grid">
          {members.map((m) => (
            <Link href={`/profil?u=${encodeURIComponent(m.username)}`} className="mcard" key={m.id}>
              <div className="mcard-avatar">{m.avatar_path ? <img src={avatarUrl(m.avatar_path)} alt="" /> : m.username.slice(0, 2).toUpperCase()}</div>
              <div className="mcard-info">
                <span className="mcard-name">@{m.username}{typeof m.rank === "number" && m.rank < 3 ? ` ${MEDALS[m.rank]}` : ""}</span>
                <span className="mcard-meta">
                  {m.cars > 0 ? t(m.cars > 1 ? "members.carsMany" : "members.carsOne", { n: m.cars }) : t("members.noCars")}
                  {m.likes > 0 ? ` · ❤️ ${m.likes}` : ""}
                  {m.is_admin ? ` · 🛠 ${t("members.admin")}` : ""}
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
