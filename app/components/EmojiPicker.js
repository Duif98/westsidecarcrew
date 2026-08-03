"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A tiny dependency-free emoji picker. Click the button → a grid pops up; clicking
// an emoji inserts it at the caret of the linked field (input/textarea). Handy on
// desktop where there's no on-screen emoji keyboard.
//
// The grid is rendered in a portal with FIXED positioning measured from the
// button, so it's never clipped by an ancestor's `overflow: hidden` (e.g. the
// profile editor card) — the bug where it couldn't fully open.
//
// Usage: keep a ref on your input and pass the controlled value + setter:
//   const ref = useRef(null);
//   <input ref={ref} value={text} onChange={e=>setText(e.target.value)} />
//   <EmojiPicker targetRef={ref} value={text} onChange={setText} />

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","🙂","😉","😍","🥰","😘","😎","🤩",
  "🥳","😏","😌","😔","😞","😢","😭","😤","😠","🤬","🤯","😳","🥵","🥶","🤔","🤗",
  "🤭","🙄","😬","😴","🤤","😷","🤒","🤕","🤠","👀","🫶","👍","👎","👊","✊","🤝",
  "🙌","👏","🙏","💪","🤙","✌️","🤟","👌","❤️","🧡","💛","💚","💙","💜","🖤","💯",
  "🔥","✨","⭐","🎉","🥂","💥","⚡","🏆","🎯","💨","💦","🚗","🏎️","🚘","🛞","🔧",
  "🔩","🛠️","⛽","🏁","🧽","🪣","🔊","📷","📸","🎶","🤌","😇","🫡","💩","👑","😱",
];

const POP_W = 300;
const POP_H = 240;

export default function EmojiPicker({ targetRef, value, onChange, className = "", title = "Emoji" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null); // { top, left, width }
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      const width = Math.min(POP_W, window.innerWidth - 16);
      let left = b.right - width;                       // right-align to the button
      left = Math.max(8, Math.min(left, window.innerWidth - 8 - width));
      // Prefer below the button; flip above when there isn't room.
      const spaceBelow = window.innerHeight - b.bottom;
      const top = (spaceBelow < POP_H + 16 && b.top > POP_H + 16) ? b.top - 8 - POP_H : b.bottom + 8;
      setPos({ top, left, width });
    };
    place();

    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const pick = (emo) => {
    const el = targetRef?.current;
    if (el && typeof el.selectionStart === "number") {
      const s = el.selectionStart, e = el.selectionEnd;
      const next = (value || "").slice(0, s) + emo + (value || "").slice(e);
      onChange(next);
      requestAnimationFrame(() => {
        try { el.focus(); const p = s + emo.length; el.setSelectionRange(p, p); } catch {}
      });
    } else {
      onChange((value || "") + emo);
    }
  };

  return (
    <span className={`emoji-picker ${className}`}>
      <button ref={btnRef} type="button" className="emoji-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} aria-label={title} title={title}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" />
        </svg>
      </button>
      {mounted && open && pos && createPortal(
        <div
          ref={popRef}
          className="emoji-pop"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          role="menu"
          // Don't let clicking inside blur the text field, so the caret survives.
          onMouseDown={(e) => e.preventDefault()}
        >
          {EMOJIS.map((e, i) => (
            <button type="button" key={i} className="emoji-cell" onClick={() => pick(e)} aria-label={e} tabIndex={-1}>{e}</button>
          ))}
        </div>,
        document.body
      )}
    </span>
  );
}
