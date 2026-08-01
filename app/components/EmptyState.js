"use client";

import Link from "next/link";

// A designed empty state — icon + line + a way forward — instead of a bare
// "nothing here yet" sentence. Pass an inline <svg> as `icon`.
export default function EmptyState({ icon, title, sub, actionHref, actionLabel, onAction }) {
  return (
    <div className="empty">
      {icon && <span className="empty-ico" aria-hidden="true">{icon}</span>}
      {title && <p className="empty-title">{title}</p>}
      {sub && <p className="empty-sub">{sub}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="empty-action">{actionLabel} →</Link>
      )}
      {onAction && actionLabel && (
        <button type="button" className="empty-action" onClick={onAction}>{actionLabel} →</button>
      )}
    </div>
  );
}
