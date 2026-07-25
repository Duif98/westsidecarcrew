"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";

const IG = "https://www.instagram.com/westsidecarcrew/";

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
  const { session, user, profile } = useAuth();
  const { total } = useUnread(session, user?.id);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const profileHref = session && profile?.username ? `/profil?u=${encodeURIComponent(profile.username)}` : "/login";
  const profileLabel = session ? "Min profil" : "Log in";

  // The mobile menu lives in the global <NavMenu> (root layout), so it's on
  // every page. Here we only render the desktop links.
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
        </nav>
      </div>
    </header>
  );
}
