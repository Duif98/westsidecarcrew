"use client";

import NotifBell from "./NotifBell";
import GlobalSearch from "./GlobalSearch";

// Top-right cluster: quick search + notifications only. Language and settings
// now live inside the menu drawer, so the top bar stays calm and uncluttered.
export default function LangSwitcher() {
  return (
    <div className="lang-switch">
      <GlobalSearch />
      <NotifBell />
    </div>
  );
}
