"use client";

import { useRef, useState } from "react";

// Touch pull-to-refresh, like a native app. Only engages when the page is
// scrolled to the very top and the user drags down; on desktop it's inert.
// Wrap a scrollable region and pass an async onRefresh.
export default function PullToRefresh({ onRefresh, children, label = "Trækker…", releaseLabel = "Slip for at opdatere", busyLabel = "Opdaterer…" }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const THRESHOLD = 70;

  const onTouchStart = (e) => {
    if (busy) return;
    const top = window.scrollY || document.documentElement.scrollTop || 0;
    startY.current = top <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (startY.current == null || busy) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 90));
  };
  const onTouchEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !busy) {
      setBusy(true);
      setPull(46);
      try { await onRefresh?.(); } catch {}
      setBusy(false);
    }
    setPull(0);
  };

  const armed = pull >= THRESHOLD;
  return (
    <div className="ptr" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="ptr-indicator" style={{ height: pull, opacity: pull > 8 ? 1 : 0 }} aria-hidden={pull === 0}>
        <span className={`ptr-spin${busy ? " on" : ""}`} style={{ transform: `rotate(${pull * 3}deg)` }} />
        <span className="ptr-text">{busy ? busyLabel : armed ? releaseLabel : label}</span>
      </div>
      <div style={{ transform: pull ? `translateY(${pull}px)` : "", transition: pull ? "none" : "transform .25s ease" }}>
        {children}
      </div>
    </div>
  );
}
