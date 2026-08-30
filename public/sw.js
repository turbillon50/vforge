// VForge minimal service worker — offline shell + network-first for documents
// Bump VERSION on every deploy where you want forced cache invalidation
const VERSION = "vforge-scoped-workspace-2026-08-30-1";
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

// El cliente (RegisterSW) puede pedir activación inmediata al tocar "Actualizar".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Datos, bundles y respuestas RSC siempre pasan por red. Next.js ya publica
  // sus assets con hashes; guardarlos aquí puede mezclar dos releases.
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isRscRequest = url.searchParams.has("_rsc") || req.headers.get("RSC") === "1";
  if (url.pathname.startsWith("/api/") || isNextAsset || isRscRequest) {
    return;
  }

  // Network-first para HTML/navigation — siempre intenta versión nueva.
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

  // Stale-while-revalidate sólo para assets propios no versionados.
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

// ── Push notifications (VAPID) ──
self.addEventListener("push", (event) => {
  let data = { title: "VForge", body: "Tienes una novedad.", url: "/app" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/app" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ("focus" in w) { w.navigate(url); return w.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
