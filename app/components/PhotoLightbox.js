"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LikeButton from "./LikeButton";
import Comments from "./Comments";
import { useT } from "../lib/i18n";

export default function PhotoLightbox({ photos, index, onClose, userId, canLike, onNeedLogin }) {
  const { t } = useT();
  const [i, setI] = useState(index);
  const [mounted, setMounted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [counts, setCounts] = useState({});
  const touchX = useRef(null);
  const closeRef = useRef(null);
  const n = photos.length;
  const p = photos[i];
  const commentCount = counts[p?.id] ?? p?.commentCount ?? 0;

  const go = useCallback((d) => setI((v) => (v + d + n) % n), [n]);

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

  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  if (!mounted) return null;

  // Rendered on <body> via a portal so it escapes any section stacking context
  // and always sits above the sticky nav.
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
        {p?.url && <img key={i} src={p.url} alt={p.car || t("photo.car")} />}
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
          {p && <LikeButton photo={p} userId={userId} canLike={canLike} onNeedLogin={onNeedLogin} />}
        </div>
      </div>

      {showComments && p && (
        <div className="plb-comments">
          <Comments
            key={p.id}
            photoId={p.id}
            onNeedLogin={onNeedLogin}
            onCountChange={(c) => setCounts((prev) => ({ ...prev, [p.id]: c }))}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
