"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { useDMUnread } from "../lib/dm";
import { useBackClose } from "../lib/useBackClose";
import { useT } from "../lib/i18n";
import { tap } from "../lib/haptics";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";

const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// Routes that own the bottom of the screen (message composers) or are
// full-screen flows — the bar would fight them, so hide it there.
const HIDDEN = ["/login", "/reset", "/chat", "/beskeder"];
const under = (pathname, base) => pathname === base || pathname.startsWith(base + "/");

const Icon = ({ d, fill }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill={fill ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

// Global bottom navigation for mobile — five fixed anchors so the core of the
// app is always one tap away, the way a native app feels. Desktop hides it (CSS)
// in favour of the top nav. Rendered once from the root layout.
export default function TabBar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { session, user, profile } = useAuth();
  const { events } = useUnread(session, user?.id);
  const dmUnread = useDMUnread(session, user?.id);
  const { t } = useT();
  const [createOpen, setCreateOpen] = useState(false);

  // Hardware Back closes the create sheet instead of leaving the page.
  useBackClose(createOpen, () => setCreateOpen(false));

  const hidden = HIDDEN.some((h) => under(pathname, h));

  // Reserve space at the bottom of every page so content never hides behind the
  // bar (only on mobile — the class is a no-op on desktop via the media query).
  useEffect(() => {
    document.body.classList.toggle("has-tabbar", !hidden);
    return () => document.body.classList.remove("has-tabbar");
  }, [hidden]);

  if (hidden) return null;

  const profileHref = session && profile?.username
    ? `/profil?u=${encodeURIComponent(profile.username)}`
    : "/login";

  const tabs = [
    {
      key: "feed", href: "/feed", label: t("nav.feed"), active: under(pathname, "/feed"),
      icon: <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>} />,
    },
    {
      key: "meets", href: "/events", label: t("nav.meets"),
      active: under(pathname, "/events") || under(pathname, "/calendar") || under(pathname, "/mine-meets"),
      badge: events, icon: <Icon d={<><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></>} />,
    },
    { key: "create", create: true, label: t("nav.create") },
    {
      key: "messages", href: session ? "/beskeder" : "/login", label: t("nav.messages"),
      active: under(pathname, "/beskeder"), badge: dmUnread,
      icon: <Icon d={<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>} />,
    },
    {
      key: "profile", href: profileHref, label: t("nav.profileTab"),
      active: under(pathname, "/profil") || under(pathname, "/medlem") || under(pathname, "/indstillinger"),
      icon: session && profile?.avatar_path
        ? <img className="tb-avatar" src={avatarUrl(profile.avatar_path)} alt="" />
        : <Icon d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />,
    },
  ];

  const go = (href) => { tap(); setCreateOpen(false); router.push(href); };

  return (
    <>
      <nav className="tabbar" aria-label="Primær navigation">
        {tabs.map((tab) => {
          if (tab.create) {
            return (
              <button
                key={tab.key}
                type="button"
                className="tb-item tb-create"
                aria-label={tab.label}
                aria-expanded={createOpen}
                onClick={() => { tap(); session ? setCreateOpen((o) => !o) : router.push("/login"); }}
              >
                <span className={`tb-plus${createOpen ? " open" : ""}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </span>
              </button>
            );
          }
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`tb-item${tab.active ? " active" : ""}`}
              aria-current={tab.active ? "page" : undefined}
              onClick={tap}
            >
              <span className="tb-ico">
                {tab.icon}
                {tab.badge > 0 && <span className="tb-badge">{tab.badge > 9 ? "9+" : tab.badge}</span>}
              </span>
              <span className="tb-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {createOpen && (
        <div className="tb-sheet-overlay" onClick={() => setCreateOpen(false)}>
          <div className="tb-sheet" onClick={(e) => e.stopPropagation()} role="menu">
            <button type="button" className="tb-sheet-item" role="menuitem" onClick={() => go("/upload")}>
              <span className="tb-sheet-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
              </span>
              <span><b>{t("nav.createPhoto")}</b></span>
            </button>
            <button type="button" className="tb-sheet-item" role="menuitem" onClick={() => go("/events")}>
              <span className="tb-sheet-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3M12 12v5M9.5 14.5h5" /></svg>
              </span>
              <span><b>{t("nav.createMeet")}</b></span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
