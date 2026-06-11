# Burbuja V (launcher) + Cache-bust PWA — Estado

**Commit:** e086914 — `feat(burbuja): launcher fijo en la burbuja V (Taller primero) + cache-bust PWA`
**Deploy Vercel:** READY (prod) — dpl_H8MA7FKsYbrX8ji3j5RyXp9WR166
**Fecha:** 2026-06-11

## TAREA 1 — Burbuja V como launcher (Taller fijo)
La burbuja flotante real es **VOrb** (components/workspace/VOrb.tsx), montada en WorkspaceShell.
Las VPresence de hero/scope/aside/nav son decorativas — NO se tocaron (siguen igual).

- Menú de accesos **FIJOS** (antes cambiaban según la ruta): mismos en toda la app.
- **Taller primero y destacado** (badge LIVE, borde/gradiente violeta-cyan, IconCpu) → /app/taller
- Hablar con V (voz, IconMic) → /app/chat?voice=1
- Conversación (IconChats) → /app/chat
- Navegador (IconGlobe) → /app/vulcano
- (+ Blueprint, agregado en línea por el daemon) → /app/blueprint
- Entrada/salida con **Framer Motion** (AnimatePresence + stagger), VFIcons, dark premium.
- Se conservan: pulso de presencia del orbe, drag, touch (mobile) y desktop, colisión con MobileNav.

## TAREA 2 — Matar cache viejo del SW para siempre
- **public/sw.js**: bump CACHE_VERSION v13 → v14 (`vforge-v14-2026-06-11-burbuja-taller`).
  skipWaiting() en install + clients.claim() en activate + borrado de caches != versión actual
  (ya presentes) + nuevo handler `message` SKIP_WAITING para activación on-demand.
- **components/pwa/RegisterSW.tsx**: registra el SW, escucha `updatefound` → toast on-brand
  "Nueva versión disponible / Actualizar" que postea SKIP_WAITING al SW nuevo y recarga
  (controllerchange → reload una sola vez). Re-chequea updates en focus/visibilitychange
  (clave para PWA en celular). Resultado: Luis y sus clientes reciben updates **sin desinstalar**.

## Verificación (screenshots mobile 390x844, en repo .taller-shots/)
- orb-menu-open-390.png → burbuja abierta con **Taller fijo, primero y destacado** + los accesos.
- taller-mobile-390.png → Taller en tiempo real cargado fresco y responsive ("4 esferas
  construyendo ahora", stats activos, nav inferior con Taller activo).

## Notas
- Durante la sesión, un proceso paralelo (daemon/nucleo) estaba editando otras secciones
  (cockpit/flujos/automatizaciones/blueprint/settings/WorkspaceShell/next.config). NO se tocaron:
  el commit incluye SOLO VOrb.tsx, RegisterSW.tsx, public/sw.js y los screenshots.
- /app/taller es owner-only (Clerk); el screenshot autenticado se tomó en sesión local con
  middleware en modo passthrough (sin claves Clerk), restaurando .env.local al terminar.
