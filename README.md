# vForge

**Build · Deploy · Evolve** — el sistema operativo para crear y controlar tus aplicaciones como una fábrica.

By Luis Humberto de la Torre Herrera · All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.

---

## Estado de esta rama

`claude/vforge-frontend-mvp-A4BrL`

Esta rama contiene el **scaffold base de Next.js 14** (TypeScript estricto + Tailwind + App Router) listo para recibir el código exportado de **v0.dev**.

El frontend MVP se está construyendo en v0.dev usando el prompt maestro guardado en [`docs/v0-prompt.md`](./docs/v0-prompt.md). Una vez generado en v0, se hará `Sync to GitHub` apuntando a esta rama.

## Stack

- Next.js 14 (App Router)
- TypeScript estricto
- Tailwind CSS 3.4
- shadcn/ui (se agrega cuando v0 genere)
- framer-motion
- lucide-react
- Geist Sans + Geist Mono

## Comandos

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

## Próximos pasos

1. Ejecutar el prompt maestro en v0.dev (ver `docs/v0-prompt.md`).
2. Iterar las 10 pantallas con los prompts de pantalla.
3. `Sync to GitHub` desde v0 → rama `claude/vforge-frontend-mvp-A4BrL`.
4. Deploy a Vercel (URL temporal `vforge-mvp.vercel.app`).
5. Fase 2: conectar backend real (Neon, Clerk, Anthropic, GitHub, Vercel APIs).
