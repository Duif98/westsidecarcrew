"use client";

// Fire-and-forget toasts from anywhere (components or lib code) without threading
// a hook through the tree — dispatch a window event that <Toaster> renders.
let seq = 0;

export function toast(message, type = "info") {
  if (typeof window === "undefined") return;
  const id = `${++seq}-${Date.now()}`;
  window.dispatchEvent(new CustomEvent("wscc-toast", { detail: { id, message, type } }));
  return id;
}

export const toastSuccess = (m) => toast(m, "success");
export const toastError = (m) => toast(m, "error");
