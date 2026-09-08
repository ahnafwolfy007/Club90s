// CLUB 90s service worker.
//
// Scope, deliberately: installability + fast repeat loads (SRS §21). This is
// NOT an offline-first app — no write queuing, no background sync. API
// requests always go to the network; only static assets and the app shell
// are cached, so a dropped connection never risks showing stale RSVP,
// finance, or election data.

const STATIC_CACHE = "club90s-static-v1";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = ["/", OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — always hit the network for live data.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, falling back to a cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res ?? Response.error())),
    );
    return;
  }

  // Static assets (hashed Next.js bundles, icons, fonts): cache-first, populated on first fetch.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
