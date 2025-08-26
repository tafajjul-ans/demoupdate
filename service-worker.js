// Basic cache + instant update SW
const CACHE = "app-cache-v1-1-0";

const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/main.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  // Cache-first for app shell
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const resp = await fetch(event.request);
      const cache = await caches.open(CACHE);
      cache.put(event.request, resp.clone());
      return resp;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "checkForUpdate") {
    self.registration.update();
  }
});
