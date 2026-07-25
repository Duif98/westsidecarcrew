"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import { useUnread } from "../lib/useUnread";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";

const IG = "https://www.instagram.com/westsidecarcrew/";
const avatarUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

const LINKS = [
  { href: "/#crewet", label: "The Crew" },
  { href: "/#garagen", label: "The Garage" },
  { href: "/medlemmer", label: "Medlemmer" },
  { href: "/events", label: "Meets" },
  { href: "/calendar", label: "Calendar" },
  { href: "/kort", label: "Kort" },
];

// Global mobile menu — a fixed hamburger + slide-over drawer, rendered on every
// page via the root layout so navigation is reachable everywhere on mobile.
export default function NavMenu() {
  const router = useRouter();
  const { session, user, profile, isAdmin, signOut } = useAuth();
  const { total } = useUnread(session, user?.id);
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
      <button className="menu-fab" aria-label={open ? "Luk menu" : "Åbn menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
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
                <b>{session ? `@${profile?.username || "medlem"}` : "Log ind"}</b>
                <span className="nav-m-sub">{session ? "Se din profil" : "Bliv en del af crewet"}</span>
              </span>
              {session && total > 0 && <span className="nav-badge" style={{ position: "static" }}>{total > 9 ? "9+" : total}</span>}
            </Link>

            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="nav-m-link" onClick={close}>{l.label}</Link>
            ))}

            {session && (
              <>
                <div className="nav-m-sep" />
                <Link href="/chat" className="nav-m-link" onClick={close}>Crew chat</Link>
                <Link href="/upload" className="nav-m-link" onClick={close}>Upload billeder</Link>
                <Link href="/leaderboard" className="nav-m-link" onClick={close}>Leaderboard</Link>
                {isAdmin && <Link href="/admin" className="nav-m-link" onClick={close}>Admin</Link>}
              </>
            )}

            <a href={IG} target="_blank" rel="noopener noreferrer" className="nav-m-link" onClick={close}>Instagram ↗</a>

            {session
              ? <button className="nav-m-link nav-m-logout" onClick={logout}>Log ud</button>
              : <Link href="/login" className="nav-m-link" onClick={close}>Log ind</Link>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
