"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, useT } from "../lib/i18n";

// Globe pill that sits just left of the global menu hamburger — visible on every
// page at every size. Click to open a small popover and switch DA / EN / DE.
export default function LangSwitcher() {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const pick = (code) => { setLang(code); setOpen(false); };

  return (
    <div className="lang-switch" ref={ref}>
      <button
        className="lang-fab"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.switch")}
        title={t("lang.current", { name: current.native })}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z" />
        </svg>
        <span className="lang-code">{current.label}</span>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t("lang.switch")}>
          {LANGS.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                className={`lang-opt ${l.code === lang ? "on" : ""}`}
                onClick={() => pick(l.code)}
              >
                <span className="lang-opt-code">{l.label}</span>
                <span className="lang-opt-name">{l.native}</span>
                {l.code === lang && <span className="lang-opt-check" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
