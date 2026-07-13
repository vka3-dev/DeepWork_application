const CACHE_VERSION = "deepwork-pwa-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/auth.html",
  "/calendar.html",
  "/focus-timer.html",
  "/manifest.json",
  "/js/config.js",
  "/js/api.js",
  "/js/auth.js",
  "/js/storage.js",
  "/js/navigation.js",
  "/js/calendar.js",
  "/js/timer.js",
  "/js/pwa.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

const STATIC_EXTERNAL_HOSTS = new Set([
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticExternal = STATIC_EXTERNAL_HOSTS.has(url.hostname);

  // Never intercept API/auth traffic to the separately deployed backend.
  if (!isSameOrigin && !isStaticExternal) return;

  if (request.mode === "navigate" && isSameOrigin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match("/index.html"));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
