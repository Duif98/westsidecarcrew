"use client";

import { useState } from "react";
import { consumeBack } from "./lib/navDirection";

// A template re-mounts on EVERY navigation (unlike layout), so the enter animation
// replays every time — fixing "smooth first time, hard after". The direction comes
// from navDirection: forward navigations slide in from the right, back navigations
// slide in from the left, so entering and leaving mirror each other.
export default function Template({ children }) {
  const [dir] = useState(() => (consumeBack() ? "back" : "fwd"));
  return <div className={`route-tx route-tx-${dir}`}>{children}</div>;
}
