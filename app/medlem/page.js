"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { usePresence } from "../components/PresenceProvider";

export default function MedlemHub() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const unread = useUnread(session, user?.id);
  const { online } = usePresence();

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

        {online.length > 0 && (
          <div className="hub-online">
            <span className="online-dot" />
            <span className="hub-online-count">{online.length} online nu</span>
            <span className="hub-online-names">
              {online.map((m) => `@${m.username}${m.id === user?.id ? " (dig)" : ""}`).join(" · ")}
            </span>
          </div>
        )}

        <div className="hub-grid">
          <Link href="/notifikationer" className="hub-card board">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
            </span>
            <span className="hub-card-title">Notifikationer</span>
            <span className="hub-card-sub">Likes, kommentarer, nye meets og opslag — samlet</span>
            <span className="hub-go">Åbn inbox →</span>
          </Link>

          <Link href="/chat" className="hub-card chat">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></svg>
            </span>
            {unread.chat > 0 && <span className="hub-badge">{unread.chat > 9 ? "9+" : unread.chat} ny{unread.chat > 1 ? "e" : ""}</span>}
            <span className="hub-card-title">Crew chat</span>
            <span className="hub-card-sub">Snak sammen og se hvem der er online</span>
            <span className="hub-go">Åbn chat →</span>
          </Link>

          <Link href="/vask" className="hub-card garage">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20V10l2-5h6l2 5v10" /><path d="M7 15h10" /><circle cx="9.5" cy="17.5" r="1" /><circle cx="14.5" cy="17.5" r="1" /><path d="M6 6c0 1-1 1.5-1 2.5M9.5 5c0 1-1 1.5-1 2.5M13 6c0 1-1 1.5-1 2.5" /></svg>
            </span>
            <span className="hub-card-title">Vask bil 🧽</span>
            <span className="hub-card-sub">Sig til når du vasker — så kan de andre komme og vaske med</span>
            <span className="hub-go">Til vask →</span>
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

          <Link href="/reservedelskatalog" className="hub-card parts">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 0 0 2.1 2.1l6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.1-2.1z" /></svg>
            </span>
            <span className="hub-card-title">Reservedelskatalog</span>
            <span className="hub-card-sub">Slå originale reservedele op til din bil via VIN</span>
            <span className="hub-go">Åbn katalog →</span>
          </Link>

          <Link href="/daek" className="hub-card parts">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" /></svg>
            </span>
            <span className="hub-card-title">Dæk & fælge</span>
            <span className="hub-card-sub">Regn på dækstørrelser og rullediameter — også til Quattro</span>
            <span className="hub-go">Åbn værktøj →</span>
          </Link>

          <Link href="/undervogn" className="hub-card parts">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M9 17h6M6 14V8l4 3h5l3 3M10 8V5" /></svg>
            </span>
            <span className="hub-card-title">Undervogn & geometri</span>
            <span className="hub-card-sub">Mål og regn på camber, toe, caster, hjørnevægt og offset</span>
            <span className="hub-go">Åbn værktøj →</span>
          </Link>

          <Link href="/manualer" className="hub-card parts">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z" /><path d="M14 4v6h6" /><path d="M8 14h8M8 17h5" /></svg>
            </span>
            <span className="hub-card-title">Manualer</span>
            <span className="hub-card-sub">Service- og ejermanualer pr. bil til download</span>
            <span className="hub-go">Åbn manualer →</span>
          </Link>

          <Link href="/dashboard" className="hub-card dash">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
            </span>
            <span className="hub-card-title">Dashboard</span>
            <span className="hub-card-sub">Crewet i tal — biler, hestekræfter, mærker og meets</span>
            <span className="hub-go">Se tallene →</span>
          </Link>

          <Link href="/mine-meets" className="hub-card events">
            <span className="hub-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /><path d="m9 14 2 2 4-4" /></svg>
            </span>
            <span className="hub-card-title">Mine meets</span>
            <span className="hub-card-sub">De meets du har sagt ja til, samlet ét sted</span>
            <span className="hub-go">Se dine meets →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
