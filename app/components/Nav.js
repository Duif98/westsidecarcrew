"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";

const IG = "https://www.instagram.com/westsidecarcrew/";
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Route-based links so they work from any page (not just the front page).
const LINKS = [
  { href: "/#crewet", label: "The Crew" },
  { href: "/#garagen", label: "The Garage" },
  { href: "/medlemmer", label: "Medlemmer" },
  { href: "/events", label: "Meets" },
  { href: "/calendar", label: "Calendar" },
  { href: "/kort", label: "Kort" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { session, user, profile } = useAuth();
  const { total } = useUnread(session, user?.id);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const profileHref = session && profile?.username ? `/profil?u=${encodeURIComponent(profile.username)}` : "/login";
  const profileLabel = session ? "Min profil" : "Log in";
  const close = () => setMenuOpen(false);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="wordmark" aria-label="West Side Car Crew — to top">
          <span className="dot" />
          <span className="wm-full">West Side Car Crew</span>
          <span className="wm-abbr">WSCC</span>
        </a>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hide-sm">{l.label}</Link>
          ))}
          <a href={IG} target="_blank" rel="noopener noreferrer" className="hide-sm">Instagram</a>
          <Link href={profileHref} className="ig nav-member hide-sm">
            {profileLabel}
            {session && total > 0 && <span className="nav-badge">{total > 9 ? "9+" : total}</span>}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="nav-burger"
            aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
            {session && total > 0 && !menuOpen && <span className="nav-badge burger-badge">{total > 9 ? "9+" : total}</span>}
          </button>
        </nav>
      </div>

      {mounted && menuOpen && createPortal(
        <div className="nav-mobile" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="nav-mobile-panel">
            <Link href={profileHref} className="nav-m-profile" onClick={close}>
              <span className="nav-m-avatar">
                {session && profile?.avatar_path
                  ? <img src={avatarUrl(profile.avatar_path)} alt="" />
                  : (session && profile?.username ? profile.username.slice(0, 2).toUpperCase() : "?")}
              </span>
              <span>
                <b>{session ? `@${profile?.username || "medlem"}` : "Log ind"}</b>
                <span className="nav-m-sub">{session ? "Se din profil" : "Bliv en del af crewet"}</span>
              </span>
              {session && total > 0 && <span className="nav-badge" style={{ position: "static" }}>{total > 9 ? "9+" : total}</span>}
            </Link>

            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-m-link" onClick={close}>{l.label}</Link>
            ))}
            {session && <Link href="/chat" className="nav-m-link" onClick={close}>Crew chat</Link>}
            {session && <Link href="/upload" className="nav-m-link" onClick={close}>Upload billeder</Link>}
            <a href={IG} target="_blank" rel="noopener noreferrer" className="nav-m-link" onClick={close}>Instagram ↗</a>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
