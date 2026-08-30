# Live embed + CSP checklist

## Modo embed

- URL: `/live/[projectId]?embed=1` (o detección iframe en LivePortal).
- Objetivo: preview embebible en Studio / demos sin chrome completo.
- Sandbox iframe recomendado en el host:
  ```
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
  ```
- Mobile shell ya usa sandbox restringido en previews (`allow-scripts allow-same-origin`).

## CSP (producción Vercel / headers)

Verificar en `next.config` / Vercel headers:

1. **frame-ancestors** — si quieres que terceros embebban VForge live:
   - Restringir a dominios conocidos (Studio, clientes VIP), no `*`.
2. **frame-src / child-src** — URLs de preview de proyectos (Vercel, custom domains).
3. **connect-src** — `/api/live/*`, SSE events, Clerk, Neon no aplica en browser.
4. **No** abrir `unsafe-eval` salvo necesidad real de un runtime.

## Owner-only

- Accept → task solo si `isOwnerEmail` / `isPlatformOwner` o role `owner` del proyecto.
- Guests / observers: solo comentan y ven previews.
- No shell privilegiado a invitados (sin `hetzner_exec`, sin tools write).

## Checklist rápido pre-merge

- [ ] Accept en desktop CommentsPanel
- [ ] Accept en mobile ChatSheet (botones grandes)
- [ ] Cola global en `/app/chat` (TaskQueuePanel)
- [ ] PendingTaskRunner ejecuta SSE y marca done
- [ ] `live_list_*` tools registradas en `tools.ts` (módulo listo en `lib/forge/live-tools.ts`)
- [ ] Embed `?embed=1` no rompe layout móvil
- [ ] Headers CSP no bloquean previews de proyectos del owner
