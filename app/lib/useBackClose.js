"use client";

import { useEffect, useRef } from "react";

// Make the hardware / browser Back button close an open overlay (drawer, modal,
// action sheet, lightbox) instead of navigating the whole page away — the
// behaviour Android users expect ("Back should undo the last thing I opened,
// not jump to the front page").
//
// A shared stack lets nested overlays (e.g. a photo lightbox opened from inside
// a meet dialog) close one layer per Back press, top-most first.
//
// IMPORTANT: we NEVER call history.back() ourselves. An overlay often closes at
// the same moment it triggers a navigation (a drawer link, the create sheet's
// "Upload" button). Popping history during that teardown races the router and
// can throw the user back to the front page. So opening only ever PUSHES a
// marker entry; hardware Back pops it and closes the top overlay. Closing via
// the UI simply leaves the marker — a later Back harmlessly consumes it.

let stack = [];        // { close } for every open overlay, in order opened
let listening = false;

// How many overlays are currently open. SwipeBack uses this to decide whether a
// back-gesture should slide the page (no overlay) or just close the top overlay.
export function overlayCount() {
  return stack.length;
}

// The top-most open overlay (or null). `slide: true` marks an in-shell sub-view
// (e.g. an open DM conversation) that should get the same gliding page-slide as a
// real navigation, rather than the instant close used for portalled overlays.
export function overlayTop() {
  return stack[stack.length - 1] || null;
}

function onPop() {
  // The browser already popped our marker entry; close the top-most overlay.
  const top = stack[stack.length - 1];
  if (top) top.close();
}

function ensureListener() {
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
    listening = true;
  }
}

export function useBackClose(open, onClose, opts = {}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const slide = !!opts.slide;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const entry = { close: () => onCloseRef.current?.(), slide };
    ensureListener();
    stack.push(entry);
    window.history.pushState({ __wsccOverlay: true }, "");

    return () => {
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }, [open]);
}
