"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

const SEEN_KEY = "wscc_inbox_seen";
const ICON = { like: "❤️", comment: "💬", meet: "🏁", post: "📣" };

const ago = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "lige nu";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} t siden`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} d siden`;
  return new Date(ts).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
};

// Members-only notification inbox. Derived from existing data (likes/comments on
// your photos, new meets, new posts) — no notifications table needed. "Read" is
// a per-browser last-seen timestamp, so visiting marks everything read.
export default function Inbox() {
  const router = useRouter();
  const { session, user, profile, loading, isAdmin, signOut } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => { if (!loading && !session) router.replace("/login"); }, [loading, session, router]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      const me = user.id;
      let seen = 0;
      try { seen = Number(localStorage.getItem(SEEN_KEY) || 0); } catch {}
      const out = [];
      const safe = async (fn) => { try { return await fn(); } catch { return null; } };

      const { data: myPhotos } = await safe(() => supabase.from("photos").select("id, car").eq("user_id", me)) || {};
      const ids = (myPhotos || []).map((p) => p.id);
      const carById = Object.fromEntries((myPhotos || []).map((p) => [p.id, p.car]));

      if (ids.length) {
        const { data: likes } = await safe(() => supabase.from("likes")
          .select("created_at, user_id, photo_id, profiles!likes_user_id_fkey(username)")
          .in("photo_id", ids).neq("user_id", me).order("created_at", { ascending: false }).limit(40)) || {};
        (likes || []).forEach((l) => out.push({ key: `like-${l.photo_id}-${l.user_id}`, when: l.created_at, type: "like",
          text: `@${l.profiles?.username || "Et medlem"} kan lide dit billede${carById[l.photo_id] ? " · " + carById[l.photo_id] : ""}`, link: "/" }));

        const { data: cmts } = await safe(() => supabase.from("comments")
          .select("id, created_at, user_id, photo_id, body, profiles!comments_user_id_fkey(username)")
          .in("photo_id", ids).neq("user_id", me).order("created_at", { ascending: false }).limit(40)) || {};
        (cmts || []).forEach((c) => out.push({ key: `cmt-${c.id}`, when: c.created_at, type: "comment",
          text: `@${c.profiles?.username || "Et medlem"} kommenterede: „${(c.body || "").slice(0, 60)}"`, link: "/" }));
      }

      const { data: evs } = await safe(() => supabase.from("events")
        .select("id, title, created_at, created_by, creator:profiles!events_created_by_fkey(username)")
        .neq("created_by", me).order("created_at", { ascending: false }).limit(15)) || {};
      (evs || []).forEach((e) => out.push({ key: `meet-${e.id}`, when: e.created_at, type: "meet",
        text: `@${e.creator?.username || "Et medlem"} oprettede et meet: ${e.title}`, link: "/events/" }));

      const { data: posts } = await safe(() => supabase.from("posts")
        .select("id, title, created_at").order("created_at", { ascending: false }).limit(10)) || {};
      (posts || []).forEach((p) => out.push({ key: `post-${p.id}`, when: p.created_at, type: "post",
        text: `Nyt opslag: ${p.title}`, link: "/" }));

      out.sort((a, b) => new Date(b.when) - new Date(a.when));
      const list = out.slice(0, 60).map((it) => ({ ...it, unread: new Date(it.when).getTime() > seen }));
      if (!active) return;
      setItems(list);
      try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
    })();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || !session) return <main className="member"><div className="wrap" style={{ paddingTop: 120 }}>Indlæser…</div></main>;

  return (
    <main className="member inbox-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/medlem" className="mlink">‹ Medlem</Link>
            {isAdmin && <Link href="/admin" className="mlink gold">Admin</Link>}
            <button className="mlink" onClick={() => { signOut(); router.replace("/"); }}>Log ud</button>
          </div>
        </div>
      </div>

      <div className="wrap inbox-body">
        <span className="overline">Notifikationer</span>
        <h1 className="member-title">Din inbox</h1>
        <p className="inbox-intro">Likes og kommentarer på dine billeder, nye meets og opslag — samlet ét sted.</p>

        {items == null ? (
          <p className="muted" style={{ marginTop: "1.5rem" }}>Indlæser…</p>
        ) : items.length === 0 ? (
          <p className="inbox-empty">Ingen notifikationer endnu. Når nogen liker eller kommenterer dine billeder, dukker det op her.</p>
        ) : (
          <div className="inbox-list">
            {items.map((it) => (
              <Link href={it.link} className={`inbox-row${it.unread ? " unread" : ""}`} key={it.key}>
                <span className="inbox-ico" aria-hidden="true">{ICON[it.type]}</span>
                <span className="inbox-text">{it.text}</span>
                <span className="inbox-when">{ago(it.when)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
