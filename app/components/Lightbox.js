"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asset } from "../lib/asset";

export default function Lightbox({ car, startIndex = 0, onClose }) {
  const [i, setI] = useState(startIndex);
  const closeRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchX = useRef(null);

  const photos = car.photos;
  const n = photos.length;

  const go = useCallback(
    (dir) => setI((p) => (p + dir + n) % n),
    [n]
  );

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock body scroll + focus close button
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep active thumbnail in view
  useEffect(() => {
    const strip = thumbsRef.current;
    const active = strip?.querySelector(".lb-thumb.active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  // Preload neighbours
  const neighbours = useMemo(() => {
    if (n < 2) return [];
    return [photos[(i + 1) % n], photos[(i - 1 + n) % n]];
  }, [i, n, photos]);

  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const full = (p) => asset(`/cars/${car.slug}/${p.src}`);
  const thumb = (p) => asset(`/cars/${car.slug}/thumb/${p.src}`);

  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label={`${car.make} ${car.model} gallery`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lb-top">
        <div className="lb-title">
          <div className="make">
            {car.make} <span style={{ color: "var(--muted)" }}>{car.model}</span>
          </div>
          <div className="meta">
            {car.owner && <span className="owner">{car.owner}</span>}
            {car.owner && " · "}
            {car.spec}
          </div>
        </div>
        <button ref={closeRef} className="lb-close" onClick={onClose} aria-label="Close gallery">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="lb-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {n > 1 && (
          <button className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous image">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <img key={i} src={full(photos[i])} alt={`${car.make} ${car.model} — image ${i + 1}`} />

        {n > 1 && (
          <button className="lb-nav next" onClick={() => go(1)} aria-label="Next image">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="lb-bottom">
        <div className="lb-counter">
          <b>{String(i + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
        </div>
        {n > 1 && (
          <div className="lb-thumbs" ref={thumbsRef}>
            {photos.map((p, idx) => (
              <button
                key={p.src}
                className={`lb-thumb ${idx === i ? "active" : ""}`}
                onClick={() => setI(idx)}
                aria-label={`Go to image ${idx + 1}`}
                aria-current={idx === i}
              >
                <img src={thumb(p)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* hidden preloads */}
      <div style={{ display: "none" }} aria-hidden="true">
        {neighbours.map((p) => (
          <img key={p.src} src={full(p)} alt="" />
        ))}
      </div>
    </div>
  );
}
