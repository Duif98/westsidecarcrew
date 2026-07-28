"use client";

import { supabase } from "./supabaseClient";
import { asset, BASE_PATH } from "./asset";

// Service-worker registration + Web Push helpers. All functions fail soft so a
// missing SW / denied permission / un-run migration never breaks the app.

export const swSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator;
export const pushSupported = () =>
  swSupported() && typeof window !== "undefined" && "PushManager" in window && "Notification" in window;

export async function registerSW() {
  if (!swSupported()) return null;
  try {
    return await navigator.serviceWorker.register(asset("/sw.js"), { scope: `${BASE_PATH}/` });
  } catch {
    return null;
  }
}

// VAPID public key lives in app_secrets (016) — not secret, but keeps config in
// one place. Returns null if the row/table isn't there yet.
async function getVapidPublicKey() {
  try {
    const { data } = await supabase.from("app_secrets").select("value").eq("key", "vapid_public_key").maybeSingle();
    return data?.value || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Current push state: "unsupported" | "denied" | "granted-on" | "granted-off" | "default"
export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
  if (Notification.permission === "granted") return sub ? "granted-on" : "granted-off";
  return "default";
}

// Subscribe this browser and store it against the member. Returns true on success.
export async function subscribePush(userId) {
  if (!pushSupported() || !userId) return false;
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return false;

  const key = await getVapidPublicKey();
  if (!key) return false; // migration / key not set up yet

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      user_id: userId,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  return !error;
}

// Fan a notification out to the crew via the send-push Edge Function. Fail-soft:
// if the function isn't deployed yet (or the call errors) nothing breaks.
export async function notifyCrew({ title, body, url, tag }) {
  try {
    await supabase.functions.invoke("send-push", { body: { title, body, url, tag } });
  } catch {
    /* function not deployed / offline — ignore */
  }
}

export async function unsubscribePush() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  return true;
}
