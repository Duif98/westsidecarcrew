// Tracks whether the last navigation was a "back" (pop) or a "forward" (push), so
// the route transition (app/template.js) can slide the incoming page in from the
// correct side: forward → in from the right, back → in from the left. This makes
// entering and leaving move in opposite directions (a native push/pop feel).
//
// SwipeBack (and any back trigger) calls markBack() right before history.back();
// template.js consumes the flag on mount. If no navigation consumes it (e.g. an
// overlay close that isn't a route change), it self-expires so a later forward
// navigation isn't mistaken for a back.

let backFlag = false;
let timer = null;

export function markBack() {
  backFlag = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { backFlag = false; }, 500);
}

// Read and reset. Returns true if the current navigation is a back/pop.
export function consumeBack() {
  const b = backFlag;
  backFlag = false;
  if (timer) { clearTimeout(timer); timer = null; }
  return b;
}
