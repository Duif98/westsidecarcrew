"use client";

// Small icon button in the top-right cluster (next to the notification bell).
// Opens the global search via the shared event. Visible on every page/size.
export default function SearchButton() {
  return (
    <button
      type="button"
      className="search-fab"
      onClick={() => window.dispatchEvent(new Event("wscc-open-search"))}
      aria-label="Søg"
      title="Søg (⌘K)"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    </button>
  );
}
