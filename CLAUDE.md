# VForge — Contexto de proyecto para Claude Code
# Stack: Next.js 16.2.4 | Neon Postgres | Clerk | Stripe | Vercel
# Repo: turbillon50/vforge | Dominio: vforge.site

## ESTADO ACTUAL (junio 2026)
- Landing: hero rediseñado (neon.tech pattern), scroll desktop fixeado
- /forge + /v: WorkspaceShell aplicado, tokens vf-* definidos
- brain-relay: online en Hetzner 178.105.135.26:9000
- Pendiente: secciones de landing (ProductCarousel, Metodo, Integraciones) — mismo patrón neon

## ARQUITECTURA
```
app/
  (dashboard)/     ← WorkspaceShell envuelve TODAS estas rutas
    layout.tsx     ← CRÍTICO: sin esto no hay sidebar/topbar
    forge/         ← /forge — chat con V
    v/             ← /v — workspace chat
    app/           ← cockpit, projects, settings, integrations
  (marketing)/     ← páginas públicas sin shell
    page.tsx       ← landing
  api/             ← endpoints Next.js
components/
  marketing/       ← Hero, MarketingHeader, ProductCarousel, etc.
  workspace/       ← WorkspaceShell, ChatStream, Composer
```

## VARIABLES DE ENTORNO REQUERIDAS
- `DATABASE_URL` — Neon connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`
- `HETZNER_URL=http://178.105.135.26`

## TOKENS TAILWIND CUSTOM (todos definidos en tailwind.config.ts)
vf-bg, vf-bg-1, vf-bg-2, vf-bg-3 → surfaces
vf-fg, vf-fg-1, vf-fg-2 → texto
vf-border, vf-border-1, vf-border-2 → bordes
vf-green (#22c55e), vf-error (#ef4444)
pb-safe → env(safe-area-inset-bottom)

## PATRONES DE DISEÑO
- Referencia visual: neon.tech (Technical Dark Premium)
- Fondo base: #0a0a0f
- Grid sutil: 60px, violet/10
- Glow: un solo blur radial por sección
- Hero height: NO min-h-screen — contenido define altura
- Nav contraste: text-white/65 mínimo
- html: solo overflow-x:clip | body: overflow-y:auto (scroll fix)

## ERRORES CONOCIDOS EN ESTE REPO
1. WorkspaceShell overflow: /forge y /v necesitan overflow-y:hidden (no auto)
2. vf-* tokens: si algo se ve invisible, verificar tailwind.config.ts
3. CloudFront imgs: agregar onError fallback en todos los <img>
4. min-h-[100svh] en hero causaba landscape enorme — eliminado

## COMANDOS ÚTILES
```bash
# Dev local
npm run dev

# Push con token
git remote set-url origin "https://TOKEN@github.com/turbillon50/vforge.git"
git push origin main

# Ver logs Vercel (via MCP vercel)
# Ver brain-relay
curl http://178.105.135.26/brain/query -X POST -H "Content-Type: application/json" -d '{"message":"ping"}'
```
