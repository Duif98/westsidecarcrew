"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LikeButton from "./LikeButton";

export default function PhotoLightbox({ photos, index, onClose, userId, canLike, onNeedLogin }) {
  const [i, setI] = useState(index);
  const touchX = useRef(null);
  const n = photos.length;
  const p = photos[i];

  const go = useCallback((d) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <div className="plb" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="plb-close" onClick={onClose} aria-label="Luk">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>

      <div className="plb-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {n > 1 && (
          <button className="plb-nav prev" onClick={() => go(-1)} aria-label="Forrige">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
        {p?.url && <img key={i} src={p.url} alt={p.car || "Bil"} />}
        {n > 1 && (
          <button className="plb-nav next" onClick={() => go(1)} aria-label="Næste">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      <div className="plb-bar">
        <div className="plb-meta">
          <div className="plb-car">{p?.car || "Uden titel"}</div>
          <div className="plb-owner">
            @{p?.profiles?.username || "medlem"}
            {p?.caption ? <span className="plb-cap"> · {p.caption}</span> : null}
            {n > 1 ? <span className="plb-idx"> · {i + 1}/{n}</span> : null}
          </div>
        </div>
        {p && <LikeButton photo={p} userId={userId} canLike={canLike} onNeedLogin={onNeedLogin} />}
      </div>
    </div>
  );
}
