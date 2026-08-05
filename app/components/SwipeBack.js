"use client";

import { useEffect } from "react";
import { overlayCount, overlayTop } from "../lib/useBackClose";

// Facebook/iOS-style interactive "swipe to go back": the whole page content
// follows your finger to the right, and on release past the threshold it slides
// the rest of the way out and navigates back (history.back → useBackClose closes
// the top overlay, or the router goes to the previous page). Released early, it
// snaps back. Works from ANYWHERE on screen, not just the edge.
//
// The page content lives in #app-shell (a wrapper around the route's children);
// the fixed bars sit outside it so transforming the shell never triggers the
// transform+position:fixed containing-block bug.
//
// If an overlay is open we don't slide the page (the overlay sits on top and is
// portaled outside the shell) — a commit just closes it via history.back().
export default function SwipeBack() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const ARM = 10;
    const threshold = () => Math.min(120, window.innerWidth * 0.3);

    let sx = 0, sy = 0;
    let tracking = false, decided = false, dragging = false, ignore = false;
    let mode = "slide"; // "slide" (page back) | "close" (overlay open)
    let animating = false;

    const shell = () => document.getElementById("app-shell");

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

    const drag = (dx) => {
      const el = shell();
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = dx > 0 ? `translateX(${dx}px)` : "";
      el.style.boxShadow = dx > 0 ? "-24px 0 48px rgba(0,0,0,.5)" : "";
      el.style.willChange = "transform";
    };

    const clearStyles = () => {
      const el = shell();
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      el.style.boxShadow = "";
      el.style.willChange = "";
    };

    const onceTransitionEnd = (el, cb, fallbackMs) => {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", fire);
        cb();
      };
      el.addEventListener("transitionend", fire);
      setTimeout(fire, fallbackMs);
    };

    const commit = () => {
      // Overlay open, or reduced motion, or no shell → just go back.
      const el = shell();
      if (mode === "close" || reduce || !el) {
        clearStyles();
        window.history.back();
        return;
      }
      animating = true;
      el.style.transition = "transform .24s cubic-bezier(.4,0,.2,1)";
      el.style.transform = `translateX(${window.innerWidth}px)`;
      onceTransitionEnd(el, () => {
        el.style.transition = "none";
        window.history.back();
        // Let the previous route paint before dropping the transform, so the new
        // page doesn't flash in at the wrong position.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => { clearStyles(); animating = false; })
        );
      }, 360);
    };

    const cancel = () => {
      const el = shell();
      if (!el) return;
      animating = true;
      el.style.transition = "transform .22s cubic-bezier(.33,1,.68,1)";
      el.style.transform = "";
      el.style.boxShadow = "";
      onceTransitionEnd(el, () => { clearStyles(); animating = false; }, 300);
    };

    const onStart = (e) => {
      if (animating || e.touches.length !== 1) { tracking = false; return; }
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      ignore = inIgnoreZone(e.target) || (!standalone && sx < 24);
      // No overlay → page slide. An in-shell sub-view (slide:true, e.g. an open DM
      // conversation) also slides. A portalled overlay (drawer/lightbox) just closes.
      const oc = overlayCount();
      mode = oc === 0 ? "slide" : (overlayTop()?.slide ? "slide" : "close");
      tracking = true; decided = false; dragging = false;
    };

    const onMove = (e) => {
      if (!tracking || ignore || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (!decided) {
        if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { tracking = false; return; }
        if (dx > ARM && dx > Math.abs(dy)) { decided = true; dragging = true; }
        else return;
      }
      // We own this gesture now → stop the page from scrolling under it.
      if (e.cancelable) e.preventDefault();
      if (mode === "slide") drag(Math.max(0, dx));
    };

    const onEnd = (e) => {
      if (!tracking || ignore) { tracking = false; return; }
      tracking = false;
      const t = e.changedTouches && e.changedTouches[0];
      const dx = t ? t.clientX - sx : 0;
      if (dragging && dx >= threshold()) commit();
      else if (mode === "slide") cancel();
      dragging = false;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      clearStyles();
    };
  }, []);

  return null;
}
