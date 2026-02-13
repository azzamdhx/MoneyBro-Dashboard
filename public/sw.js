const CACHE_NAME = "moneybro-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/primary-logo.png",
];

// Install — precache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests (mutations, POST, etc.)
  if (request.method !== "GET") return;

  // Skip API routes and GraphQL — these should not be cached by SW
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  // For navigation requests (HTML pages) — network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // For static assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetching = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
      return cached || fetching;
    })
  );
});
