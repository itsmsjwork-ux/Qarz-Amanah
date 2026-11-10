/* Qarz Amanah service worker.
   Cache only the public application shell and same-origin static assets.
   Never cache API/auth requests or user-specific records. */
const CACHE_NAME = "qarz-amanah-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/qarz-amanah-icon.svg",
  "./assets/qarz-amanah-emblem.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // HTML stays network-first so users receive current app code whenever online.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html").then(cached => cached || caches.match("./")))
    );
    return;
  }

  // Cache only known static file types. Do not cache Supabase/API/data requests.
  if (/\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
