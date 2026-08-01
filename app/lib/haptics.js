// Tiny haptic helpers. The Vibration API is honoured on Android/Chrome and
// silently ignored on iOS Safari, so these are always safe to call. Kept short
// and subtle so interactions feel like a native "tick", never a buzz.
const can = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export const tap = () => { try { if (can()) navigator.vibrate(8); } catch {} };
export const impact = () => { try { if (can()) navigator.vibrate(16); } catch {} };
export const success = () => { try { if (can()) navigator.vibrate([10, 40, 16]); } catch {} };
