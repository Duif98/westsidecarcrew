"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useT, LANGS } from "../lib/i18n";
import { usePwa } from "../components/PwaProvider";
import { pushState, subscribePush, unsubscribePush } from "../lib/pwa";

// One place for the member's settings: theme, notifications, language, install
// and a link to their profile — previously scattered across the nav drawer.
export default function Indstillinger() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useT();
  const { canInstall, isIOS, installed, promptInstall } = usePwa();
  const [theme, setTheme] = useState("dark");
  const [push, setPush] = useState("loading");

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => { setTheme(document.documentElement.getAttribute("data-theme") || "dark"); }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => { const s = await pushState(); if (active) setPush(s); })();
    return () => { active = false; };
  }, [session]);

  const setThemeTo = (next) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("wscc_theme", next); } catch {}
  };

  const togglePush = async () => {
    if (push === "busy") return;
    setPush("busy");
    if (push === "granted-on") { await unsubscribePush(); setPush("granted-off"); return; }
    const ok = await subscribePush(user?.id);
    setPush(ok ? "granted-on" : (typeof Notification !== "undefined" && Notification.permission === "denied" ? "denied" : "granted-off"));
  };

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  const pushLabel = {
    "granted-on": t("nav.notifOn"), "granted-off": t("nav.notifOff"), "default": t("nav.notifOff"),
    "denied": t("nav.notifDenied"), "unsupported": t("nav.notifUnsupported"),
    "busy": t("nav.notifWorking"), "loading": t("nav.notifWorking"),
  }[push];

  return (
    <main className="member set-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">{t("common.back")}</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
          </div>
        </div>
      </div>

      <div className="wrap set-body">
        <span className="overline">{t("settings.overline")}</span>
        <h1 className="member-title">{t("nav.settings")}</h1>

        {/* Theme */}
        <div className="set-section">
          <div className="set-label">{t("settings.theme")}</div>
          <div className="set-seg">
            <button className={theme === "dark" ? "on" : ""} onClick={() => setThemeTo("dark")}>🌙 {t("settings.dark")}</button>
            <button className={theme === "light" ? "on" : ""} onClick={() => setThemeTo("light")}>☀️ {t("settings.light")}</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="set-section">
          <div className="set-label">{t("settings.notifications")}</div>
          <button className="set-btn" onClick={togglePush} disabled={push === "denied" || push === "busy" || push === "loading" || push === "unsupported"}>
            {push === "granted-on" ? "🔔" : "🔕"} {pushLabel}
          </button>
          <p className="set-hint">{t("settings.notifHint")}</p>
        </div>

        {/* Language */}
        <div className="set-section">
          <div className="set-label">{t("settings.language")}</div>
          <div className="set-seg">
            {LANGS.map((l) => (
              <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.native}</button>
            ))}
          </div>
        </div>

        {/* Install */}
        {!installed && (canInstall || isIOS) && (
          <div className="set-section">
            <div className="set-label">{t("settings.app")}</div>
            {canInstall
              ? <button className="set-btn" onClick={promptInstall}>📲 {t("nav.install")}</button>
              : <p className="set-hint">📲 {t("nav.iosHint")}</p>}
          </div>
        )}
        {installed && (
          <div className="set-section">
            <div className="set-label">{t("settings.app")}</div>
            <p className="set-hint">📲 {t("nav.installed")}</p>
          </div>
        )}

        {/* Profile + logout */}
        <div className="set-section">
          <div className="set-label">{t("settings.account")}</div>
          <div className="set-links">
            <Link href={`/profil?u=${encodeURIComponent(profile?.username || "")}`} className="set-btn">👤 {t("settings.myProfile")}</Link>
            <button className="set-btn danger" onClick={() => { signOut(); router.replace("/"); }}>{t("nav.logout")}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
