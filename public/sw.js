// VForge minimal service worker — offline shell + network-first for documents
// Bump VERSION on every deploy where you want forced cache invalidation
// (Luis: "se ve de la verga todavía" → asset cache pegado).
const VERSION = "vforge-v6-2026-05-20-stable";
const SHELL = ["/", "/app/chat", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NUNCA cachear /api/* — siempre red (los datos reales son críticos)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first para HTML/navigation — siempre intenta versión nueva
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/offline")))
    );
    return;
  }

  // Stale-while-revalidate para assets estáticos — sirve del cache pero
  // refresca en background para que la próxima vez sea versión nueva.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkPromise = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      });
      return cached || networkPromise;
    })
  );
});
