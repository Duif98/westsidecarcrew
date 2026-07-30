"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchIndex } from "../lib/search";

// Inline expanding search that lives in the top-right cluster (next to the
// notification bell). Clicking the magnifier expands a search bar in place —
// no full-screen overlay. The input is always mounted so focus() fired inside
// the tap gesture reliably brings up the keyboard on iOS.
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const router = useRouter();

  const loadIndex = () => { if (!index) getSearchIndex().then(setIndex); };
  const close = () => { setOpen(false); setQ(""); };

  // Called straight from the tap — focus synchronously so iOS shows the keyboard.
  const openSearch = () => {
    loadIndex();
    setOpen(true);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) { close(); return; }
        loadIndex();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 20);
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) close(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const ql = q.trim().toLowerCase();
  const results = !ql || !index
    ? []
    : index.filter((it) => it.label.toLowerCase().includes(ql) || (it.sub && it.sub.toLowerCase().includes(ql))).slice(0, 30);

  const go = (href) => { close(); router.push(href); };

  return (
    <div className={`gs ${open ? "gs-open" : ""}`} ref={rootRef}>
      <button type="button" className="search-fab" onClick={openSearch} aria-label="Søg" title="Søg (⌘K)">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      <div className="gs-bar">
        <svg className="gs-bar-ico" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          className="gs-bar-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg biler, medlemmer, meets…"
          aria-label="Søg"
          enterKeyHint="search"
        />
        <button type="button" className="gs-bar-x" onClick={close} aria-label="Luk søgning">✕</button>
      </div>

      {open && ql && (
        <div className="gs-drop">
          {!index && <p className="gs-hint">Indlæser…</p>}
          {index && results.length === 0 && <p className="gs-hint">Ingen resultater for “{q}”.</p>}
          {results.map((r, i) => (
            <button key={i} type="button" className="gs-item" onClick={() => go(r.href)}>
              <span className="gs-type">{r.type}</span>
              <span className="gs-label">{r.label}</span>
              {r.sub && <span className="gs-sub">{r.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
