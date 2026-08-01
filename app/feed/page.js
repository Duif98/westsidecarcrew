"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { buildFeed } from "../lib/feed";
import { toggleLike } from "../lib/photos";
import { notifyUser } from "../lib/pwa";
import { timeAgo } from "../lib/time";
import { tap } from "../lib/haptics";
import PullToRefresh from "../components/PullToRefresh";
import PhotoReactions from "../components/PhotoReactions";
import PhotoLightbox from "../components/PhotoLightbox";
import PostMenu from "../components/PostMenu";
import EmptyState from "../components/EmptyState";
import { fetchPhotoTags } from "../lib/tags";
import { markSeen } from "../lib/useUnread";
import { supabase, PUBLIC_BUCKET } from "../lib/supabaseClient";

const supabaseAvatar = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
const avatar = (username, path) => path
  ? <img className="fd-av-img" src={supabaseAvatar(path)} alt="" />
  : <span className="fd-av-ini">{(username || "?").slice(0, 2).toUpperCase()}</span>;

// One photo card in the feed, with double-tap-to-like and inline reactions.
function PhotoCard({ item, userId, canLike, onOpen, onNeedLogin }) {
  const { profile, isAdmin } = useAuth();
  const { t, lang } = useT();
  const p = item.photo;
  const [liked, setLiked] = useState(!!p.likedByMe);
  const [count, setCount] = useState(p.likeCount || 0);
  const [burst, setBurst] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [caption, setCaption] = useState(p.caption || "");
  const [editedAt, setEditedAt] = useState(p.edited_at || null);
  const [tags, setTags] = useState(p.tags || []);
  const refreshTags = useCallback(async () => { try { setTags(await fetchPhotoTags(p.id)); } catch {} }, [p.id]);
  const lastTap = useRef(0);
  const busy = useRef(false);

  const like = useCallback(async (force) => {
    if (!canLike) { onNeedLogin?.(); return; }
    if (busy.current) return;
    if (force && liked) { setBurst((b) => b + 1); return; }
    const next = force ? true : !liked;
    busy.current = true;
    setLiked(next); setCount((c) => c + (next ? 1 : -1));
    if (next) { setBurst((b) => b + 1); tap(); }
    try {
      await toggleLike(p.id, userId, liked);
      if (next && p.user_id && p.user_id !== userId) {
        notifyUser(p.user_id, { title: "❤️ Ny like", body: `@${profile?.username || "Et medlem"} kan lide dit billede${p.car ? " · " + p.car : ""}`, url: "/feed", tag: "like-" + p.id });
      }
    } catch { setLiked(liked); setCount(p.likeCount || 0); }
    finally { busy.current = false; }
  }, [canLike, liked, p, userId, profile, onNeedLogin]);

  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) { like(true); lastTap.current = 0; }
    else lastTap.current = now;
  };

  const uname = p.profiles?.username;
  return (
    <article className="fd-card">
      <header className="fd-head">
        <Link href={uname ? `/profil?u=${encodeURIComponent(uname)}` : "/feed"} className="fd-av">{avatar(uname, p.profiles?.avatar_path)}</Link>
        <div className="fd-head-txt">
          <Link href={uname ? `/profil?u=${encodeURIComponent(uname)}` : "/feed"} className="fd-user">@{uname || "medlem"}</Link>
          {p.car && <span className="fd-sub">{p.car}</span>}
        </div>
        <span className="fd-when">{timeAgo(p.created_at, lang)}{editedAt ? ` · ${t("post.edited")}` : ""}</span>
        <PostMenu photo={{ ...p, caption }} userId={userId} isAdmin={isAdmin} onSaved={(cap, at) => { setCaption(cap || ""); setEditedAt(at); }} onClosed={refreshTags} />
      </header>

      <div className={`fd-media${imgLoaded ? " loaded" : ""}`} onClick={tap} onDoubleClick={() => like(true)}>
        <img
          src={p.url}
          alt={p.car || "Bil"}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          ref={(el) => { if (el && el.complete) setImgLoaded(true); }}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        />
        <span key={burst} className={`plb-burst${burst ? " go" : ""}`} aria-hidden="true">
          <svg width="110" height="110" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.6-9.5-9C1 8.5 2.2 5.5 5.2 5.1 7 4.9 8.6 5.9 12 9c3.4-3.1 5-4.1 6.8-3.9 3 .4 4.2 3.4 2.7 5.9C19 15.4 12 20 12 20z" /></svg>
        </span>
      </div>

      <div className="fd-actions">
        <button type="button" className={`like-btn${liked ? " liked" : ""}`} onClick={() => like(false)} aria-pressed={liked}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.6-9.5-9C1 8.5 2.2 5.5 5.2 5.1 7 4.9 8.6 5.9 12 9c3.4-3.1 5-4.1 6.8-3.9 3 .4 4.2 3.4 2.7 5.9C19 15.4 12 20 12 20z" /></svg>
          {count > 0 && <span className="like-count">{count}</span>}
        </button>
        <button type="button" className="plb-cbtn" onClick={onOpen} aria-label="Kommentarer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /></svg>
          {p.commentCount > 0 && <b>{p.commentCount}</b>}
        </button>
      </div>
      {caption && <p className="fd-caption"><b>@{uname || "medlem"}</b> {caption}</p>}
      {tags.length > 0 && (
        <div className="fd-tags">
          <span className="fd-tags-lead">{t("post.taggedWith")}</span>
          {tags.map((tag) => (
            <Link key={tag.id} href={tag.href || "#"} className="fd-tag">
              <span aria-hidden="true">{tag.kind === "user" ? "👤" : "🚗"}</span> {tag.kind === "user" ? "@" : ""}{tag.label}
            </Link>
          ))}
        </div>
      )}
      <div className="fd-react">
        <PhotoReactions photoId={p.id} initial={p.reactions || []} userId={userId} canReact={canLike} onNeedLogin={onNeedLogin} photoOwnerId={p.user_id} photoLabel={p.car} />
      </div>
    </article>
  );
}

export default function FeedPage() {
  const { session, user, loading } = useAuth();
  const { t, lang } = useT();
  const [items, setItems] = useState(null);
  const [lb, setLb] = useState(null); // { photos, index }
  const userId = user?.id || null;
  const canLike = !!session;

  const load = useCallback(async () => {
    const data = await buildFeed(userId);
    setItems(data);
  }, [userId]);

  useEffect(() => { if (!loading) load(); }, [loading, load]);
  useEffect(() => { if (session) markSeen("chat"); }, [session]); // keep general badges honest

  const photoItems = (items || []).filter((it) => it.kind === "photo");
  const openLightbox = (photoId) => {
    const list = photoItems.map((it) => it.photo);
    const idx = list.findIndex((p) => p.id === photoId);
    if (idx >= 0) setLb({ photos: list, index: idx });
  };

  return (
    <main className="member feed-main">
      <div className="member-bar">
        <div className="wrap member-bar-inner">
          <Link href="/" className="wordmark"><span className="dot" /> West Side Car Crew</Link>
          <div className="member-actions">
            <Link href="/" className="mlink">‹ {t("feed.home")}</Link>
            {session ? <Link href="/medlem" className="mlink gold">{t("feed.member")}</Link> : <Link href="/login" className="mlink gold">{t("nav.login")}</Link>}
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={load} label={t("feed.pull")} releaseLabel={t("feed.release")} busyLabel={t("feed.refreshing")}>
        <div className="wrap feed-wrap">
          <span className="overline">{t("feed.overline")}</span>
          <h1 className="member-title">{t("feed.title")}</h1>

          {items == null ? (
            <div className="feed-list">
              {[0, 1, 2].map((k) => <div key={k} className="fd-skel" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-4 4 3 3-2 4 3" /></svg>}
              title={t("feed.emptyTitle")}
              sub={t("feed.empty")}
              actionHref={session ? "/upload" : "/login"}
              actionLabel={session ? t("nav.uploadPhotos") : t("nav.login")}
            />
          ) : (
            <div className="feed-list">
              {items.map((it) => {
                if (it.kind === "photo") return <PhotoCard key={it.key} item={it} userId={userId} canLike={canLike} onOpen={() => openLightbox(it.photo.id)} onNeedLogin={() => { window.location.href = "/login"; }} />;
                if (it.kind === "meet") return (
                  <Link key={it.key} href="/events" className="fd-mini fd-meet">
                    <span className="fd-mini-ico">🏁</span>
                    <span className="fd-mini-txt"><b>{it.meet.title}</b><span>@{it.meet.creator?.username || "medlem"} · {t("feed.newMeet")}</span></span>
                    <span className="fd-when">{timeAgo(it.when, lang)}</span>
                  </Link>
                );
                if (it.kind === "post") return (
                  <Link key={it.key} href="/" className="fd-mini fd-post">
                    <span className="fd-mini-ico">📣</span>
                    <span className="fd-mini-txt"><b>{it.post.title}</b><span>{t("feed.newPost")}</span></span>
                    <span className="fd-when">{timeAgo(it.when, lang)}</span>
                  </Link>
                );
                if (it.kind === "member") return (
                  <Link key={it.key} href={`/profil?u=${encodeURIComponent(it.member.username)}`} className="fd-mini fd-member">
                    <span className="fd-mini-ico">👋</span>
                    <span className="fd-mini-txt"><b>@{it.member.username}</b><span>{t("feed.newMember")}</span></span>
                    <span className="fd-when">{timeAgo(it.when, lang)}</span>
                  </Link>
                );
                return null;
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      {lb && <PhotoLightbox photos={lb.photos} index={lb.index} onClose={() => setLb(null)} userId={userId} canLike={canLike} onNeedLogin={() => { window.location.href = "/login"; }} />}
    </main>
  );
}
