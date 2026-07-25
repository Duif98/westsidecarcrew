"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { useT } from "../lib/i18n";

const IG = "https://www.instagram.com/westsidecarcrew/";

// Route-based links so they work from any page (not just the front page).
const LINKS = [
  { href: "/#crewet", key: "crew" },
  { href: "/#garagen", key: "garage" },
  { href: "/medlemmer", key: "members" },
  { href: "/events", key: "meets" },
  { href: "/calendar", key: "calendar" },
  { href: "/kort", key: "map" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { session, user, profile } = useAuth();
  const { total } = useUnread(session, user?.id);
  const { t } = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const profileHref = session && profile?.username ? `/profil?u=${encodeURIComponent(profile.username)}` : "/login";
  const profileLabel = session ? t("nav.myProfile") : t("nav.login");

  // The mobile menu lives in the global <NavMenu> (root layout), so it's on
  // every page. Here we only render the desktop links.
  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="wordmark" aria-label={t("nav.toTop")}>
          <span className="dot" />
          <span className="wm-full">West Side Car Crew</span>
          <span className="wm-abbr">WSCC</span>
        </a>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hide-sm">{t(`nav.${l.key}`)}</Link>
          ))}
          <a href={IG} target="_blank" rel="noopener noreferrer" className="hide-sm">{t("nav.instagram")}</a>
          <Link href={profileHref} className="ig nav-member hide-sm">
            {profileLabel}
            {session && total > 0 && <span className="nav-badge">{total > 9 ? "9+" : total}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
