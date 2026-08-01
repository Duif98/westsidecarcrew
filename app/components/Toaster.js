"use client";

import { useCallback, useEffect, useState } from "react";

const ICONS = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
};

// Global toast host — listens for `wscc-toast` events (see lib/toast.js) and
// renders a bottom-centre stack that auto-dismisses. Mounted once in the layout.
export default function Toaster() {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail;
      if (!t?.id) return;
      setItems((l) => [...l, t]);
      setTimeout(() => remove(t.id), 2800);
    };
    window.addEventListener("wscc-toast", onToast);
    return () => window.removeEventListener("wscc-toast", onToast);
  }, [remove]);

  if (items.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} type="button" className={`toast toast-${t.type || "info"}`} onClick={() => remove(t.id)}>
          <span className="toast-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[t.type] || ICONS.info}
            </svg>
          </span>
          <span className="toast-msg">{t.message}</span>
        </button>
      ))}
    </div>
  );
}
