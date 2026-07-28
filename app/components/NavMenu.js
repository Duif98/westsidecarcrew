"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { useT } from "../lib/i18n";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";
import { usePwa } from "./PwaProvider";
import { pushState, subscribePush, unsubscribePush } from "../lib/pwa";

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
  const { canInstall, isIOS, installed, promptInstall } = usePwa();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [push, setPush] = useState("loading"); // pushState() result | "loading" | "busy"

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reflect the theme that the no-flash script (or a previous toggle) applied.
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("wscc_theme", next); } catch {}
  };

  // Load the current push state whenever the drawer opens while logged in.
  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    (async () => { const s = await pushState(); if (active) setPush(s); })();
    return () => { active = false; };
  }, [open, session]);

  const togglePush = async () => {
    if (push === "busy") return;
    setPush("busy");
    if (push === "granted-on") { await unsubscribePush(); setPush("granted-off"); return; }
    const ok = await subscribePush(user?.id);
    setPush(ok ? "granted-on" : (Notification.permission === "denied" ? "denied" : "granted-off"));
  };

  const pushLabel = {
    "granted-on": t("nav.notifOn"),
    "granted-off": t("nav.notifOff"),
    "default": t("nav.notifOff"),
    "denied": t("nav.notifDenied"),
    "unsupported": t("nav.notifUnsupported"),
    "busy": t("nav.notifWorking"),
    "loading": t("nav.notifWorking"),
  }[push];

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

            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-m-link" onClick={close}>{t(`nav.${l.key}`)}</Link>
            ))}

            {session && (
              <>
                <div className="nav-m-sep" />
                <Link href="/chat" className="nav-m-link" onClick={close}>{t("nav.crewChat")}</Link>
                <Link href="/upload" className="nav-m-link" onClick={close}>{t("nav.uploadPhotos")}</Link>
                <Link href="/reservedelskatalog" className="nav-m-link" onClick={close}>{t("nav.parts")}</Link>
                <Link href="/dashboard" className="nav-m-link" onClick={close}>{t("nav.dashboard")}</Link>
                <Link href="/leaderboard" className="nav-m-link" onClick={close}>{t("nav.leaderboard")}</Link>
                {isAdmin && <Link href="/admin" className="nav-m-link" onClick={close}>{t("nav.admin")}</Link>}
              </>
            )}

            <a href={IG} target="_blank" rel="noopener noreferrer" className="nav-m-link" onClick={close}>{t("nav.instagram")} ↗</a>

            <div className="nav-m-sep" />
            <span className="nav-m-heading">{t("nav.settings")}</span>

            <button className="nav-m-link nav-m-tool" onClick={toggleTheme}>
              <span>{theme === "light" ? "🌙" : "☀️"} {t(theme === "light" ? "nav.themeDark" : "nav.themeLight")}</span>
            </button>

            {installed
              ? <span className="nav-m-link nav-m-static">📲 {t("nav.installed")}</span>
              : canInstall
                ? <button className="nav-m-link nav-m-tool" onClick={promptInstall}><span>📲 {t("nav.install")}</span></button>
                : isIOS
                  ? <span className="nav-m-hint">📲 {t("nav.iosHint")}</span>
                  : null}

            {session && push !== "unsupported" && (
              <button className="nav-m-link nav-m-tool" onClick={togglePush} disabled={push === "denied" || push === "busy" || push === "loading"}>
                <span>{push === "granted-on" ? "🔔" : "🔕"} {pushLabel}</span>
              </button>
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
