"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";

export default function MedlemHub() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const unread = useUnread(session, user?.id);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  return (
    <main className="member hub-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <span className="mlink muted">@{profile?.username}</span>
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap hub-body">
        <span className="overline">Medlem</span>
        <h1 className="hub-title">Hej @{profile?.username} 👋<br />Hvad vil du?</h1>

        <div className="hub-grid">
          <Link href="/chat" className="hub-card chat">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></svg>
            </span>
            {unread.chat > 0 && <span className="hub-badge">{unread.chat > 9 ? "9+" : unread.chat} ny{unread.chat > 1 ? "e" : ""}</span>}
            <span className="hub-card-title">Crew chat</span>
            <span className="hub-card-sub">Snak sammen og se hvem der er online</span>
            <span className="hub-go">Åbn chat →</span>
          </Link>

          <Link href="/upload" className="hub-card garage">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v9h14v-9" /><path d="M8 19v-5h8v5" /><circle cx="12" cy="12" r="1" /></svg>
            </span>
            <span className="hub-card-title">Min garage</span>
            <span className="hub-card-sub">Upload billeder af bilerne og se crewets galleri</span>
            <span className="hub-go">Til upload →</span>
          </Link>

          <Link href="/events" className="hub-card events">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /><path d="M8 13h3v3H8z" /></svg>
            </span>
            {unread.events > 0 && <span className="hub-badge">{unread.events > 9 ? "9+" : unread.events} ny{unread.events > 1 ? "e" : ""}</span>}
            <span className="hub-card-title">Meets</span>
            <span className="hub-card-sub">Planlæg cruises og se hvem der kommer</span>
            <span className="hub-go">Til meets →</span>
          </Link>

          <Link href="/leaderboard" className="hub-card board">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
            </span>
            <span className="hub-card-title">Leaderboard</span>
            <span className="hub-card-sub">Se hvem der fører på likes og aktivitet</span>
            <span className="hub-go">Se ranglisten →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
