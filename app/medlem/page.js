"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";

export default function MedlemHub() {
  const router = useRouter();
  const { session, profile, loading, isAdmin, signOut } = useAuth();

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
        </div>
      </div>
    </main>
  );
}
