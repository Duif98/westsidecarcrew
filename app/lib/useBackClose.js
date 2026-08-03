"use client";

import { useEffect, useRef } from "react";

// Make the hardware / browser Back button close an open overlay (drawer, modal,
// action sheet, lightbox) instead of navigating the whole page away — the
// behaviour Android users expect ("Back should undo the last thing I opened,
// not jump to the front page").
//
// A shared stack lets nested overlays (e.g. a photo lightbox opened from inside
// a meet dialog) close one layer per Back press, top-most first.

let stack = [];            // { close, byBack } for every open overlay, in order
let listening = false;
let suppressNext = false;  // skip the popstate we cause when unwinding ourselves

function onPop() {
  if (suppressNext) { suppressNext = false; return; }
  const top = stack[stack.length - 1];
  if (top) { top.byBack = true; top.close(); }
}

function ensureListener() {
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
    listening = true;
  }
}

export function useBackClose(open, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const entry = { close: () => onCloseRef.current?.(), byBack: false };
    ensureListener();
    stack.push(entry);
    window.history.pushState({ __wsccOverlay: true }, "");

    return () => {
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
      // Only unwind our history entry when the overlay was closed by the UI (a ✕
      // / backdrop tap) AND our marker is still the current entry — so we never
      // fight a Back press (byBack) or an in-overlay navigation (marker gone).
      if (!entry.byBack && window.history.state && window.history.state.__wsccOverlay) {
        suppressNext = true;
        window.history.back();
      }
    };
  }, [open]);
}
