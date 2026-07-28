"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";

const SEEN_KEY = "wscc_inbox_seen";
const ICON = { like: "❤️", comment: "💬", meet: "🏁", post: "📣" };
const ago = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "nu";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} t`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} d`;
  return new Date(ts).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
};

// Bell next to the language switcher. Opens a dropdown (like the burger menu)
// with recent activity — likes/comments on your photos, new meets, new posts —
// derived from existing data. Unread = newer than the last time it was opened.
export default function NotifBell() {
  const { session, user } = useAuth();
  const { t } = useT();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!session || !user?.id) { setItems([]); setCount(0); return; }
    let active = true;
    (async () => {
      let seen = 0;
      try { seen = Number(localStorage.getItem(SEEN_KEY) || 0); } catch {}
      const me = user.id;
      const safe = async (fn) => { try { return await fn(); } catch { return { data: [] }; } };
      const out = [];

      const { data: myPhotos } = await safe(() => supabase.from("photos").select("id, car").eq("user_id", me));
      const ids = (myPhotos || []).map((p) => p.id);
      const carById = Object.fromEntries((myPhotos || []).map((p) => [p.id, p.car]));
      if (ids.length) {
        const { data: likes } = await safe(() => supabase.from("likes").select("created_at, user_id, photo_id, profiles!likes_user_id_fkey(username)").in("photo_id", ids).neq("user_id", me).order("created_at", { ascending: false }).limit(30));
        (likes || []).forEach((l) => out.push({ key: `like-${l.photo_id}-${l.user_id}`, when: l.created_at, type: "like", text: `@${l.profiles?.username || "Et medlem"} kan lide dit billede${carById[l.photo_id] ? " · " + carById[l.photo_id] : ""}`, link: "/" }));
        const { data: cmts } = await safe(() => supabase.from("comments").select("id, created_at, user_id, photo_id, body, profiles!comments_user_id_fkey(username)").in("photo_id", ids).neq("user_id", me).order("created_at", { ascending: false }).limit(30));
        (cmts || []).forEach((c) => out.push({ key: `cmt-${c.id}`, when: c.created_at, type: "comment", text: `@${c.profiles?.username || "Et medlem"} kommenterede: „${(c.body || "").slice(0, 50)}"`, link: "/" }));
      }
      const { data: evs } = await safe(() => supabase.from("events").select("id, title, created_at, created_by, creator:profiles!events_created_by_fkey(username)").neq("created_by", me).order("created_at", { ascending: false }).limit(12));
      (evs || []).forEach((e) => out.push({ key: `meet-${e.id}`, when: e.created_at, type: "meet", text: `@${e.creator?.username || "Et medlem"} oprettede et meet: ${e.title}`, link: "/events/" }));
      const { data: posts } = await safe(() => supabase.from("posts").select("id, title, created_at").order("created_at", { ascending: false }).limit(8));
      (posts || []).forEach((p) => out.push({ key: `post-${p.id}`, when: p.created_at, type: "post", text: `Nyt opslag: ${p.title}`, link: "/" }));

      out.sort((a, b) => new Date(b.when) - new Date(a.when));
      const list = out.slice(0, 40).map((it) => ({ ...it, unread: new Date(it.when).getTime() > seen }));
      if (!active) return;
      setItems(list);
      setCount(list.filter((it) => it.unread).length);
    })();
    return () => { active = false; };
  }, [session, user?.id]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Opening marks everything read.
      try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
      setCount(0);
      setItems((list) => list.map((it) => ({ ...it, unread: false })));
    }
  };

  if (!session) return null;

  return (
    <>
      <button ref={btnRef} className="notif-bell" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`${t("nav.inbox")}${count ? ` (${count})` : ""}`} title={t("nav.inbox")}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && <span className="nav-badge notif-bell-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {mounted && open && createPortal(
        <div className="notif-pop" ref={popRef} role="menu">
          <div className="notif-pop-head">{t("nav.inbox")}</div>
          <div className="notif-pop-list">
            {items.length === 0 ? (
              <p className="notif-pop-empty">Ingen notifikationer endnu.</p>
            ) : items.map((it) => (
              <Link key={it.key} href={it.link} className={`notif-pop-row${it.unread ? " unread" : ""}`} onClick={() => setOpen(false)}>
                <span className="notif-pop-ico" aria-hidden="true">{ICON[it.type]}</span>
                <span className="notif-pop-text">{it.text}</span>
                <span className="notif-pop-when">{ago(it.when)}</span>
              </Link>
            ))}
          </div>
          <Link href="/notifikationer" className="notif-pop-all" onClick={() => setOpen(false)}>Se alle →</Link>
        </div>,
        document.body
      )}
    </>
  );
}
