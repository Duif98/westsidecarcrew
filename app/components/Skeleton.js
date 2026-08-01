"use client";

// Shimmer placeholders for lists while data loads — the same treatment the feed
// already uses, extended so "Indlæser…" text never shows on a loading list.
export default function Skeleton({ count = 3, variant = "row" }) {
  return (
    <div className="skel-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skel skel-${variant}`} />
      ))}
    </div>
  );
}
