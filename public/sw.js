/* West Side Car Crew — service worker.
 * Gives the site offline support + installability (PWA) and handles Web Push.
 * Conservative on purpose: only same-origin GET requests are cached, so the
 * dynamic Supabase/Google calls always go straight to the network.
 */

const VERSION = "wscc-v1";
const STATIC_CACHE = `${VERSION}-static`;

// The scope the SW controls (e.g. "/" on the custom domain). Used to build the
// offline fallback URL so it works whether or not there's a base path.
const SCOPE = new URL(self.registration.scope).pathname; // ends with "/"
const OFFLINE_URL = SCOPE; // the home page is our offline fallback

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin. Supabase, Google Maps, tiles etc. pass through.
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first, fall back to cache, then offline home.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets (_next, images, fonts, icons): cache-first, then fill cache.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});

/* ---------- Web Push ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }

  const title = data.title || "West Side Car Crew";
  const options = {
    body: data.body || "",
    icon: data.icon || `${SCOPE}icon-192.png`,
    badge: data.badge || `${SCOPE}icon-192.png`,
    tag: data.tag || "wscc",
    data: { url: data.url || SCOPE },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || SCOPE;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { c.navigate(target); return c.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
