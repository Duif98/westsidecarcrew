"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CarProfile from "./CarProfile";
import { useT } from "../lib/i18n";

// Generic gallery lightbox. `items` is [{ full, thumb, alt }] with URLs already
// resolved by the caller, so it works for both repo and uploaded photos.
export default function Lightbox({ items, title, subtitle, startIndex = 0, onClose, album, curated }) {
  const { t } = useT();
  const [i, setI] = useState(startIndex);
  const [mounted, setMounted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const closeRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchX = useRef(null);
  const n = items.length;

  const go = useCallback((dir) => setI((p) => (p + dir + n) % n), [n]);

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

  useEffect(() => {
    const active = thumbsRef.current?.querySelector(".lb-thumb.active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  const neighbours = useMemo(() => {
    if (n < 2) return [];
    return [items[(i + 1) % n], items[(i - 1 + n) % n]];
  }, [i, n, items]);

  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  if (!mounted || !n) return null;

  return createPortal(
    <div className="lb" role="dialog" aria-modal="true" aria-label={t("lightbox.gallery", { title })}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lb-top">
        <div className="lb-title">
          <div className="make">{title}</div>
          {subtitle && <div className="meta">{subtitle}</div>}
        </div>
        <div className="lb-top-actions">
          {album && (
            <button className="lb-info" onClick={() => setShowProfile(true)} aria-label={t("lightbox.profileAria")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></svg>
              <span className="lb-info-txt">{t("lightbox.profile")}</span>
            </button>
          )}
          <button ref={closeRef} className="lb-close" onClick={onClose} aria-label={t("lightbox.close")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {showProfile && album && <CarProfile album={album} curated={curated} onClose={() => setShowProfile(false)} />}

      <div className="lb-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {n > 1 && (
          <button className="lb-nav prev" onClick={() => go(-1)} aria-label={t("lightbox.prev")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <img key={i} src={items[i].full} alt={items[i].alt || title} />
        {n > 1 && (
          <button className="lb-nav next" onClick={() => go(1)} aria-label={t("lightbox.next")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>

      <div className="lb-bottom">
        <div className="lb-counter"><b>{String(i + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}</div>
        {n > 1 && (
          <div className="lb-thumbs" ref={thumbsRef}>
            {items.map((it, idx) => (
              <button key={idx} className={`lb-thumb ${idx === i ? "active" : ""}`} onClick={() => setI(idx)} aria-label={t("lightbox.goTo", { n: idx + 1 })} aria-current={idx === i}>
                <img src={it.thumb || it.full} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "none" }} aria-hidden="true">
        {neighbours.map((p, k) => <img key={k} src={p.full} alt="" />)}
      </div>
    </div>,
    document.body
  );
}
