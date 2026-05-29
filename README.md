# vForge

**Build · Deploy · Evolve** — el sistema operativo para crear y controlar tus aplicaciones como una fábrica.

By Luis Humberto de la Torre Herrera · All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.

---

## 📚 Documentación

| Doc | Para qué sirve |
|---|---|
| [`docs/method.md`](./docs/method.md) | **El Método vForge — manual ejecutivo.** Para alguien que pregunta "¿cómo construyes apps?". 1-2 páginas, scanneable. **Empieza por aquí.** |
| [`AGENTS.md`](./AGENTS.md) | **Protocolo multi-agente.** Si eres un agente IA entrando a este repo, léeme. Define roles, capas, anillos de privilegio. |
| [`docs/playbook.md`](./docs/playbook.md) | **Manual operativo extendido.** Filosofía, sistema de diseño, flujo en 7 fases, modelo de las 3 capas, quality gates, lessons learned, pasos manuales del operador. |
| [`docs/architecture.md`](./docs/architecture.md) | **Arquitectura del cerebro Forge.** Cómo está cableado el agente IA detrás de la mascota: routing, adapters, anillos de privilegio, roadmap a Forge funcional. |
| [`docs/decisions/`](./docs/decisions/) | **Architecture Decision Records (ADRs).** 8 decisiones arquitectónicas estructurales documentadas. |
| [`docs/integrations/`](./docs/integrations/) | **Runbooks por proveedor.** Name.com (dominio), Neon (DB), Clerk (auth), Model Providers (Anthropic/OpenAI/Gemini/Perplexity). |
| [`docs/v0-prompt.md`](./docs/v0-prompt.md) | Prompts exactos para pegar en v0.dev. |
| [`docs/visual-refs/`](./docs/visual-refs/) | Referencias visuales del proyecto. Memoria visual que cualquier agente puede leer. |

---

## Estado de esta rama

`claude/vforge-frontend-mvp-A4BrL`

Scaffold base de Next.js 16 (TypeScript estricto + Tailwind + App Router) listo para recibir el código exportado de **v0.dev**. Una vez generado en v0, se hará `Sync to GitHub` apuntando a esta rama.

## Stack

- Next.js 16 (App Router)
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
