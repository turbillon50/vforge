# vForge

**Build · Deploy · Evolve** — el sistema operativo para crear y controlar tus aplicaciones como una fábrica.

By Luis Humberto de la Torre Herrera · All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.

---

## 📚 Documentación

| Doc | Para qué sirve |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | **Protocolo multi-agente.** Si eres un agente IA entrando a este repo, **léeme primero**. Define roles, capas, anillos de privilegio. |
| [`docs/playbook.md`](./docs/playbook.md) | **Manual operativo de vForge.** Filosofía, sistema de diseño, flujo en 6 fases, modelo de las 3 capas (prompt vs código), patrones de prompt, quality gates, lessons learned. |
| [`docs/architecture.md`](./docs/architecture.md) | **Arquitectura del cerebro Forge.** Cómo está cableado el agente IA detrás de la mascota: routing, adapters, anillos de privilegio, roadmap a Forge funcional. |
| [`docs/decisions/`](./docs/decisions/) | **Architecture Decision Records (ADRs).** Cada decisión arquitectónica significativa como archivo individual con contexto, razón y alternativas consideradas. |
| [`docs/v0-prompt.md`](./docs/v0-prompt.md) | Prompts exactos para pegar en v0.dev: master, screens 1–10, refinements, correctivos, brand consolidado, sistema de tema día/noche, mascota ForgeOrb. |
| [`docs/visual-refs/`](./docs/visual-refs/) | Referencias visuales del proyecto (logos, mascotas, screenshots, moodboards). Memoria visual que cualquier agente puede leer. |

---

## Estado de esta rama

`claude/vforge-frontend-mvp-A4BrL`

Scaffold base de Next.js 14 (TypeScript estricto + Tailwind + App Router) listo para recibir el código exportado de **v0.dev**. Una vez generado en v0, se hará `Sync to GitHub` apuntando a esta rama.

## Stack

- Next.js 14 (App Router)
- TypeScript estricto
- Tailwind CSS 3.4
- shadcn/ui (se agrega cuando v0 genere)
- framer-motion · lucide-react · next-themes
- Geist Sans + Geist Mono

## Comandos

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

## Próximos pasos

1. Leer [`docs/playbook.md`](./docs/playbook.md) para entender el flujo.
2. Ejecutar el prompt maestro de [`docs/v0-prompt.md` §2](./docs/v0-prompt.md) en v0.dev.
3. Iterar las 10 pantallas con los prompts §3.1 → §3.10.
4. Aplicar §5 (brand + íconos), §6 (tema día/noche) y §7 (correctivo de mascota).
5. `Sync to GitHub` desde v0 → rama `claude/vforge-frontend-mvp-A4BrL`.
6. Deploy a Vercel.
7. Validar quality gates del playbook §8 antes de declarar `done`.
8. Fase 2: conectar backend real (Neon, Clerk, Anthropic, GitHub, Vercel APIs).
