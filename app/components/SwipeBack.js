"use client";

import { useEffect, useRef } from "react";

// iOS-agtig "swipe for at gå tilbage" — men uden at man skal ramme skærmkanten
// præcist, og virksom på hele sitet. En vandret højre-swipe (venstre→højre) kalder
// history.back(), som opfører sig som Androids tilbage-knap: lukker øverste overlay
// (via useBackClose's history-mærke) hvis der er ét, ellers går én side tilbage.
//
// Vigtigt i en installeret iOS-PWA (standalone) findes Safaris kant-swipe slet
// ikke, så uden det her har iOS-brugere INGEN tilbage-gestus.
//
// Vi ignorerer swipes der starter i noget der selv bruger vandret bevægelse
// (billed-lightbox, kort, slidere, vandret-scrollende rækker), så vi ikke stjæler
// deres gestus.
export default function SwipeBack() {
  const indRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Ikke relevant uden touch (peger-mus). Rører aldrig desktop.
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const THRESH = 80;      // px vandret før swipen udløser tilbage
    const ARM_FROM = 14;    // px før indikatoren begynder at vise sig
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    let sx = 0, sy = 0, tracking = false, armed = false, ignore = false, decided = false;

    // Starter berøringen et sted hvor vandret bevægelse betyder noget andet?
    const inIgnoreZone = (el) => {
      if (!el || !el.closest) return false;
      if (el.closest(".lb, .plb, .leaflet-container, [data-swipe-ignore]")) return true;
      let n = el;
      while (n && n.nodeType === 1 && n !== document.body) {
        if (n.tagName === "INPUT" && n.type === "range") return true;
        const cs = getComputedStyle(n);
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") &&
            n.scrollWidth > n.clientWidth + 4) return true;
        n = n.parentElement;
      }
      return false;
    };

    const paint = (dx) => {
      const el = indRef.current;
      if (!el) return;
      const p = Math.max(0, (dx - ARM_FROM)) / (THRESH - ARM_FROM);
      el.style.opacity = p > 0 ? String(Math.min(p, 1)) : "0";
      el.style.transform =
        `translateY(-50%) translateX(${Math.min(dx * 0.4, 52)}px) scale(${0.7 + 0.3 * Math.min(p, 1)})`;
      el.classList.toggle("armed", dx >= THRESH);
    };

    const reset = () => {
      tracking = false; armed = false; ignore = false; decided = false;
      paint(0);
    };

    const onStart = (e) => {
      if (e.touches.length !== 1) { reset(); return; }
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      // I en almindelig browser (ikke standalone) overlader vi den yderste
      // venstre kant til Safaris egen kant-swipe, så vi ikke går dobbelt tilbage.
      ignore = inIgnoreZone(e.target) || (!standalone && sx < 24);
      tracking = true; armed = false; decided = false;
    };

    const onMove = (e) => {
      if (!tracking || ignore || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (!decided) {
        // Afgør tidligt om det er en lodret scroll (så slipper vi) eller en
        // vandret højre-swipe (så overtager vi).
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { tracking = false; paint(0); return; }
        if (dx > 12 && dx > Math.abs(dy)) decided = true;
        else return;
      }
      if (dx <= 0) { armed = false; paint(0); return; }
      armed = dx >= THRESH;
      paint(dx);
    };

    const onEnd = () => {
      const go = tracking && armed && !ignore;
      reset();
      if (go) window.history.back();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div ref={indRef} className="swipe-back-ind" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </div>
  );
}
