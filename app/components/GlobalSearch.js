"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSearchIndex } from "../lib/search";

// Global quick-search. Opens on ⌘K / Ctrl+K or the "wscc-open-search" event
// (dispatched from the nav drawer). Loads its index lazily on first open.
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(null);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wscc-open-search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("wscc-open-search", onOpen); };
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); return; }
    if (!index) getSearchIndex().then(setIndex);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, index]);

  const ql = q.trim().toLowerCase();
  const results = !ql || !index
    ? []
    : index.filter((it) => it.label.toLowerCase().includes(ql) || (it.sub && it.sub.toLowerCase().includes(ql))).slice(0, 30);

  const go = (href) => { setOpen(false); router.push(href); };

  if (!open) return null;
  return (
    <div className="gs-overlay" onClick={() => setOpen(false)}>
      <div className="gs-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="gs-input"
          placeholder="Søg biler, medlemmer, meets, opslag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!index && <p className="gs-hint">Indlæser…</p>}
        {index && ql && results.length === 0 && <p className="gs-hint">Ingen resultater for “{q}”.</p>}
        {results.length > 0 && (
          <div className="gs-results">
            {results.map((r, i) => (
              <button key={i} className="gs-item" onClick={() => go(r.href)}>
                <span className="gs-type">{r.type}</span>
                <span className="gs-label">{r.label}</span>
                {r.sub && <span className="gs-sub">{r.sub}</span>}
              </button>
            ))}
          </div>
        )}
        {!ql && index && <p className="gs-hint">Skriv for at søge · Esc lukker</p>}
      </div>
    </div>
  );
}
