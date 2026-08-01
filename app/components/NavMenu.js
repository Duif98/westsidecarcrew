"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { useT } from "../lib/i18n";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";

const IG = "https://www.instagram.com/westsidecarcrew/";
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Grouped navigation so the drawer reads as a structured menu, not a flat wall of
// links. On mobile the bottom TabBar owns the primary destinations, so this is
// the full "everything" menu; on desktop it's the complete nav behind the ☰.
const GUEST_SECTIONS = [
  { heading: null, links: [{ href: "/feed", key: "feed" }, { href: "/events", key: "meets" }, { href: "/medlemmer", key: "members" }, { href: "/calendar", key: "calendar" }, { href: "/kort", key: "map" }] },
  { heading: "sectionCrew", links: [{ href: "/#crewet", key: "crew" }, { href: "/#garagen", key: "garage" }] },
];

const MEMBER_SECTIONS = [
  { heading: "sectionSocial", links: [{ href: "/feed", key: "feed" }, { href: "/beskeder", key: "messages" }, { href: "/chat", key: "crewChat" }, { href: "/notifikationer", key: "inbox" }] },
  { heading: "sectionCrew", links: [{ href: "/medlemmer", key: "members" }, { href: "/events", key: "meets" }, { href: "/calendar", key: "calendar" }, { href: "/kort", key: "map" }, { href: "/leaderboard", key: "leaderboard" }, { href: "/dashboard", key: "dashboard" }, { href: "/mine-meets", key: "myMeets" }, { href: "/#crewet", key: "crew" }, { href: "/#garagen", key: "garage" }] },
  { heading: "sectionTools", links: [{ href: "/upload", key: "uploadPhotos" }, { href: "/vask", key: "wash" }, { href: "/reservedelskatalog", key: "parts" }, { href: "/daek", key: "tyres" }, { href: "/undervogn", key: "suspension" }, { href: "/daektryk", key: "tyrePressure" }, { href: "/oktan", key: "octane" }, { href: "/manualer", key: "manuals" }] },
];

// Global mobile menu — a fixed hamburger + slide-over drawer, rendered on every
// page via the root layout so navigation is reachable everywhere.
export default function NavMenu() {
  const router = useRouter();
  const { session, user, profile, isAdmin, signOut } = useAuth();
  const { total } = useUnread(session, user?.id);
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const profileHref = session && profile?.username ? `/profil?u=${encodeURIComponent(profile.username)}` : "/login";
  const close = () => setOpen(false);
  const logout = () => { close(); signOut(); router.replace("/"); };
  const sections = session ? MEMBER_SECTIONS : GUEST_SECTIONS;

  return (
    <>
      <button className="menu-fab" aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
        {session && total > 0 && !open && <span className="nav-badge menu-fab-badge">{total > 9 ? "9+" : total}</span>}
      </button>

      {mounted && open && createPortal(
        <div className="nav-mobile" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="nav-mobile-panel">
            <Link href={profileHref} className="nav-m-profile" onClick={close}>
              <span className="nav-m-avatar">
                {session && profile?.avatar_path
                  ? <img src={avatarUrl(profile.avatar_path)} alt="" />
                  : (session && profile?.username ? profile.username.slice(0, 2).toUpperCase() : "?")}
              </span>
              <span>
                <b>{session ? `@${profile?.username || "member"}` : t("nav.login")}</b>
                <span className="nav-m-sub">{session ? t("nav.viewProfile") : t("nav.joinCrew")}</span>
              </span>
              {session && total > 0 && <span className="nav-badge" style={{ position: "static" }}>{total > 9 ? "9+" : total}</span>}
            </Link>

            {sections.map((sec, i) => (
              <div key={sec.heading || `s${i}`} className="nav-m-group">
                {sec.heading && <div className="nav-m-heading">{t(`nav.${sec.heading}`)}</div>}
                {sec.links.map((l) => (
                  <Link key={l.href} href={l.href} className="nav-m-link" onClick={close}>{t(`nav.${l.key}`)}</Link>
                ))}
              </div>
            ))}

            <div className="nav-m-group">
              <div className="nav-m-heading">{t("nav.sectionAccount")}</div>
              {session && <Link href="/indstillinger" className="nav-m-link" onClick={close}>⚙︎ {t("nav.settings")}</Link>}
              <a href={IG} target="_blank" rel="noopener noreferrer" className="nav-m-link" onClick={close}>{t("nav.instagram")} ↗</a>
              {session && isAdmin && <Link href="/admin" className="nav-m-link" onClick={close}>{t("nav.admin")}</Link>}
              {session
                ? <button className="nav-m-link nav-m-logout" onClick={logout}>{t("nav.logout")}</button>
                : <Link href="/login" className="nav-m-link" onClick={close}>{t("nav.login")}</Link>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
