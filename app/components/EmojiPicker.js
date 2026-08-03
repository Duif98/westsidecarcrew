"use client";

import { useEffect, useRef, useState } from "react";

// A tiny dependency-free emoji picker. Click the button → a grid pops up; clicking
// an emoji inserts it at the caret of the linked field (input/textarea). Handy on
// desktop where there's no on-screen emoji keyboard.
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

export default function EmojiPicker({ targetRef, value, onChange, className = "", title = "Emoji" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
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
    <div className={`emoji-picker ${className}`} ref={wrapRef}>
      <button type="button" className="emoji-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} aria-label={title} title={title}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" />
        </svg>
      </button>
      {open && (
        <div className="emoji-pop" role="menu">
          {EMOJIS.map((e, i) => (
            <button type="button" key={i} className="emoji-cell" onClick={() => pick(e)} aria-label={e} tabIndex={-1}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}
