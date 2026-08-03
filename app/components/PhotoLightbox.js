"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Comments from "./Comments";
import PhotoReactions from "./PhotoReactions";
import PhotoTags from "./PhotoTags";
import { toggleLike } from "../lib/photos";
import { notifyUser } from "../lib/pwa";
import { useAuth } from "../lib/AuthProvider";
import { useT } from "../lib/i18n";
import { useBackClose } from "../lib/useBackClose";

export default function PhotoLightbox({ photos, index, onClose, userId, canLike, onNeedLogin }) {
  const { t } = useT();
  const { profile, isAdmin } = useAuth();
  const [i, setI] = useState(index);
  const [mounted, setMounted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [counts, setCounts] = useState({});
  const [likes, setLikes] = useState({}); // { [photoId]: { liked, count } }
  const [burst, setBurst] = useState(0);   // bumping this replays the heart pop
  const touchX = useRef(null);
  const lastTap = useRef(0);
  const busyLike = useRef(false);
  const closeRef = useRef(null);
  const n = photos.length;
  const p = photos[i];
  const commentCount = counts[p?.id] ?? p?.commentCount ?? 0;
  const canEditTags = !!(userId && p && (p.user_id === userId || isAdmin));

  const likeState = p ? (likes[p.id] || { liked: !!p.likedByMe, count: p.likeCount || 0 }) : { liked: false, count: 0 };

  const go = useCallback((d) => { setI((v) => (v + d + n) % n); setShowComments(false); }, [n]);

  // Hardware Back closes the photo viewer instead of navigating the page.
  useBackClose(true, onClose);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  // Like the current photo. `force` (from double-tap) only ever likes, never
  // unlikes — matching Instagram. The heart button toggles.
  const doLike = useCallback(async (force = false) => {
    if (!p) return;
    if (!canLike) { onNeedLogin?.(); return; }
    if (busyLike.current) return;
    const cur = likes[p.id] || { liked: !!p.likedByMe, count: p.likeCount || 0 };
    if (force && cur.liked) { setBurst((b) => b + 1); return; } // already liked → just replay heart
    const next = force ? true : !cur.liked;
    busyLike.current = true;
    setLikes((m) => ({ ...m, [p.id]: { liked: next, count: cur.count + (next ? 1 : -1) } }));
    if (next) setBurst((b) => b + 1);
    try {
      await toggleLike(p.id, userId, cur.liked);
      if (next && p.user_id && p.user_id !== userId) {
        notifyUser(p.user_id, {
          title: "❤️ Ny like",
          body: `@${profile?.username || "Et medlem"} kan lide dit billede${p.car ? " · " + p.car : ""}`,
          url: "/", tag: "like-" + p.id,
        });
      }
    } catch {
      setLikes((m) => ({ ...m, [p.id]: cur })); // revert
    } finally {
      busyLike.current = false;
    }
  }, [p, canLike, onNeedLogin, likes, userId, profile]);

  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  // Double-tap / double-click the image to like.
  const onImgTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) { doLike(true); lastTap.current = 0; }
    else lastTap.current = now;
  };

  if (!mounted) return null;

  return createPortal(
    <div className="plb" role="dialog" aria-modal="true" aria-label={t("photo.gallery")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button ref={closeRef} className="plb-close" onClick={onClose} aria-label={t("photo.close")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>

      <div className="plb-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {n > 1 && (
          <button className="plb-nav prev" onClick={() => go(-1)} aria-label={t("photo.prev")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
        <div className="plb-imgwrap" onClick={onImgTap} onDoubleClick={() => doLike(true)}>
          {p?.url && <img key={i} src={p.url} alt={p.car || t("photo.car")} />}
          <span key={burst} className={`plb-burst${burst ? " go" : ""}`} aria-hidden="true">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.6-9.5-9C1 8.5 2.2 5.5 5.2 5.1 7 4.9 8.6 5.9 12 9c3.4-3.1 5-4.1 6.8-3.9 3 .4 4.2 3.4 2.7 5.9C19 15.4 12 20 12 20z" /></svg>
          </span>
        </div>
        {n > 1 && (
          <button className="plb-nav next" onClick={() => go(1)} aria-label={t("photo.next")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      <div className="plb-bar">
        <div className="plb-meta">
          <div className="plb-car">{p?.car || t("photo.untitled")}</div>
          <div className="plb-owner">
            @{p?.profiles?.username || t("photo.member")}
            {p?.caption ? <span className="plb-cap"> · {p.caption}</span> : null}
            {n > 1 ? <span className="plb-idx"> · {i + 1}/{n}</span> : null}
          </div>
          {p && <PhotoTags photoId={p.id} canEdit={canEditTags} userId={userId} />}
        </div>
        <div className="plb-actions">
          <button
            className={`plb-cbtn ${showComments ? "on" : ""}`}
            onClick={() => setShowComments((s) => !s)}
            aria-pressed={showComments}
            aria-label={t("photo.comments")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" /></svg>
            {commentCount > 0 && <b>{commentCount}</b>}
          </button>
          <button
            type="button"
            className={`like-btn${likeState.liked ? " liked" : ""}`}
            onClick={() => doLike(false)}
            aria-pressed={likeState.liked}
            aria-label={likeState.liked ? t("like.remove") : t("like.add")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={likeState.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20s-7-4.6-9.5-9C1 8.5 2.2 5.5 5.2 5.1 7 4.9 8.6 5.9 12 9c3.4-3.1 5-4.1 6.8-3.9 3 .4 4.2 3.4 2.7 5.9C19 15.4 12 20 12 20z" />
            </svg>
            {likeState.count > 0 && <span className="like-count">{likeState.count}</span>}
          </button>
        </div>
      </div>

      {p && (
        <div className="plb-reactions">
          <PhotoReactions
            key={p.id}
            photoId={p.id}
            autoLoad
            userId={userId}
            canReact={canLike}
            onNeedLogin={onNeedLogin}
            photoOwnerId={p.user_id}
            photoLabel={p.car}
          />
        </div>
      )}

      {showComments && p && (
        <div className="plb-comments">
          <Comments
            key={p.id}
            photoId={p.id}
            photoOwnerId={p.user_id}
            photoLabel={p.car}
            onNeedLogin={onNeedLogin}
            onCountChange={(c) => setCounts((prev) => ({ ...prev, [p.id]: c }))}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
