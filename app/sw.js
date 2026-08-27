/* AbhinavOS service worker
   Purpose: the app shell must open with no signal at all — the gym is
   exactly where connectivity is worst, and an app that won't even load is
   how a logging habit dies.

   Strategy:
   - Navigations: network-first, fall back to the cached shell. That way a
     fresh deploy is picked up immediately when online, but a dead
     connection still opens the app.
   - Fonts/static: cache-first, since they never change within a version.
   - Airtable API traffic: never cached and never intercepted. Stale health
     data would be worse than no data, and the app has its own cache layer
     plus an offline write queue for that.
*/
const VERSION = "abhinavos-v9";
const SHELL = VERSION + "-shell";
const STATIC = VERSION + "-static";
const SHELL_URLS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_URLS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never touch Airtable — reads go through the app's own cache layer and
  // writes go through its offline queue. Serving a stale record here could
  // show yesterday's numbers as today's.
  if (url.hostname.endsWith("airtable.com")) return;

  // App shell / navigations: network-first with cache fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./"))
        )
    );
    return;
  }

  // Fonts and other static GETs: cache-first, then fill the cache.
  if (url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com") ||
      url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit)
      )
    );
  }
});
