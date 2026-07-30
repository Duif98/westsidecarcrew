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

const LINKS = [
  { href: "/#crewet", key: "crew" },
  { href: "/#garagen", key: "garage" },
  { href: "/medlemmer", key: "members" },
  { href: "/events", key: "meets" },
  { href: "/calendar", key: "calendar" },
  { href: "/kort", key: "map" },
];

// Global mobile menu — a fixed hamburger + slide-over drawer, rendered on every
// page via the root layout so navigation is reachable everywhere on mobile.
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

  const profileHref = session && profile?.username ? `/profil?u=${encodeURIComponent(profile.username)}` : "/login";
  const close = () => setOpen(false);
  const logout = () => { close(); signOut(); router.replace("/"); };

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

            <button
              type="button"
              className="nav-m-link nav-m-search"
              onClick={() => { close(); window.dispatchEvent(new Event("wscc-open-search")); }}
            >
              <span>🔍 {t("nav.search")}</span>
              <kbd className="nav-m-kbd">⌘K</kbd>
            </button>

            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-m-link" onClick={close}>{t(`nav.${l.key}`)}</Link>
            ))}

            {session && (
              <>
                <div className="nav-m-sep" />
                <Link href="/notifikationer" className="nav-m-link" onClick={close}>{t("nav.inbox")}</Link>
                <Link href="/chat" className="nav-m-link" onClick={close}>{t("nav.crewChat")}</Link>
                <Link href="/vask" className="nav-m-link" onClick={close}>{t("nav.wash")}</Link>
                <Link href="/upload" className="nav-m-link" onClick={close}>{t("nav.uploadPhotos")}</Link>
                <Link href="/mine-meets" className="nav-m-link" onClick={close}>{t("nav.myMeets")}</Link>
                <Link href="/reservedelskatalog" className="nav-m-link" onClick={close}>{t("nav.parts")}</Link>
                <Link href="/daek" className="nav-m-link" onClick={close}>{t("nav.tyres")}</Link>
                <Link href="/undervogn" className="nav-m-link" onClick={close}>{t("nav.suspension")}</Link>
                <Link href="/daektryk" className="nav-m-link" onClick={close}>{t("nav.tyrePressure")}</Link>
                <Link href="/manualer" className="nav-m-link" onClick={close}>{t("nav.manuals")}</Link>
                <Link href="/dashboard" className="nav-m-link" onClick={close}>{t("nav.dashboard")}</Link>
                <Link href="/leaderboard" className="nav-m-link" onClick={close}>{t("nav.leaderboard")}</Link>
                {isAdmin && <Link href="/admin" className="nav-m-link" onClick={close}>{t("nav.admin")}</Link>}
              </>
            )}

            <a href={IG} target="_blank" rel="noopener noreferrer" className="nav-m-link" onClick={close}>{t("nav.instagram")} ↗</a>

            {session && (
              <>
                <div className="nav-m-sep" />
                <Link href="/indstillinger" className="nav-m-link" onClick={close}>⚙︎ {t("nav.settings")}</Link>
              </>
            )}

            <div className="nav-m-sep" />

            {session
              ? <button className="nav-m-link nav-m-logout" onClick={logout}>{t("nav.logout")}</button>
              : <Link href="/login" className="nav-m-link" onClick={close}>{t("nav.login")}</Link>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
