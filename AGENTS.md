# AGENTS.md

> *Protocolo multi-agente de vForge. Si eres un agente IA (humano o autónomo) y estás entrando a este repo, léeme primero.*

---

## ¿Qué es vForge?

Una fábrica de aplicaciones operada por Luis Humberto de la Torre Herrera (All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.). El objetivo final: que el agente **Forge AI** dentro de la app orqueste a otros agentes para construir, desplegar y mantener aplicaciones de Luis con confirmación humana en las acciones sensibles.

Este repo es el código de la app vForge (la fábrica) y, por dogfooding, también es el primer proyecto que la fábrica construye.

---

## Documentos foundacionales (lee en este orden)

1. [`README.md`](./README.md) — qué es y cómo correrlo
2. [`docs/playbook.md`](./docs/playbook.md) — cómo se construye, fases, modelo de las 3 capas
3. [`docs/architecture.md`](./docs/architecture.md) — cómo funciona el cerebro Forge cuando esté autónomo
4. [`docs/v0-prompt.md`](./docs/v0-prompt.md) — prompts exactos para v0.dev
5. [`docs/decisions/`](./docs/decisions/) — Architecture Decision Records (ADRs)

---

## Roles del cast actual

| Agente | Su rol | Cuándo entra |
|---|---|---|
| **Luis (humano)** | Director de producto, decisiones finales, criterio visual, aprueba acciones de Anillo 2/3 | Siempre. Es el operador. |
| **ChatGPT image gen** (manual, vía Luis) | Generación de mockups y referencias visuales (logos, mascotas) | Cuando se necesita una imagen original |
| **Claude Planner** (claude.ai, manual) | Sistemas thinking, briefs largos, prompts maestros, prosa de planning | Al inicio de cada proyecto, cuando haga falta replanteamiento |
| **Claude Code** (este agente) | Edición de repo, git ops, GitHub, docs, prompts refinados, audits, configs, CI | Capa 3 del playbook. Cualquier cosa que sea código no-UI |
| **v0.dev** | Generación visual del frontend | Capa 1 del playbook. Layouts, screens, copy |
| **Vercel** | Deploy, hosting, edge runtime | Cuando hay código en main o feature branch |
| **GitHub** | Repo, issues, PRs, CI | Siempre, host del estado canónico |
| **Forge AI (futuro)** | Agente autónomo que orquesta todos los anteriores | Después de M11 (ver `architecture.md` §7) |

---

## Reglas duras para cualquier agente entrando

### 1. Nunca operes fuera de tu capa

Las capas vienen del playbook §6:
- **Capa 1** (descriptive prompt to v0): para layout, copy, microinteracciones comunes.
- **Capa 2** (literal JSX/CSS in prompt): para componentes icónicos donde la geometría debe ser exacta.
- **Capa 3** (direct code in repo): para configs, refactors cross-file, CI, docs, git ops.

Si eres v0, no toques `docs/` ni `.github/`. Si eres Claude Code, no inventes UI nueva sin que pase por v0 primero (salvo bug fix puntual).

### 2. Anillos de privilegio

Antes de ejecutar acciones, clasifícalas y respeta el anillo:

| Anillo | Acción | Confirmación |
|---|---|---|
| 0 | Solo lectura (search, query, docs) | Auto |
| 1 | Repo write (commit, PR, branch) | Auto si la rama es de feature |
| 2 | Infra write (Vercel deploy, env vars, dominios, Actions) | **Humana en chat** |
| 3 | Vault + financiero (rotar key, billing, borrar proyecto) | **Humana + 2FA** |

Si vas a hacer algo de Anillo 2 o 3, **pregunta primero**. No asumas que el "sí, dale todas las mejoras" cubre todo.

### 3. Conventional Commits + ramas con prefijo

- Ramas: `claude/<slug>-<feature>-<id>` para Claude Code · `v0-sync` (única rama de v0) · `forge/<feature>` (cuando Forge AI exista)
- Commits: `feat:` / `fix:` / `docs:` / `refactor:` / `chore:` / `test:`
- PR siempre como **draft** primero. Marcar "Ready for review" solo cuando los quality gates del playbook §8 estén verdes.

### 4. Stack obligatorio (no negociar sin ADR)

- Next.js 14 App Router · TypeScript estricto · Tailwind 3.4 · shadcn/ui
- framer-motion · lucide-react · next-themes · Geist Sans + Geist Mono
- Anthropic SDK + OpenAI SDK (lado backend)
- Vercel deploy · GitHub repos bajo `turbillon50/`
- DB: Neon (Postgres serverless)

Cambiar cualquiera de estos requiere abrir un ADR en `docs/decisions/` y aprobación de Luis.

### 5. Tokens, no hex

Ningún color hardcoded en código de producción. Siempre `var(--green)`, `var(--bg)`, etc. Si necesitas un nuevo color, abre un PR que lo agregue al token system primero.

### 6. Una pantalla / un fix por turno

No mezclar 3 cambios cross-cutting en un solo commit. Atomicidad arriba.

### 7. Leer la documentación antes de proponer

Si vas a sugerir un cambio arquitectónico, busca primero si ya hay un ADR en `docs/decisions/` que lo cubra. Si lo hay, respétalo o abre uno nuevo que lo supersede.

### 8. Audit trail

Cualquier acción que afecte al usuario final (deploy, rotación de key, edición de secret) debe quedar registrada en el audit log. Cuando el backend exista, será una tabla en Neon. Por ahora, queda en el chat de Forge.

---

## Handoff entre agentes

### Luis → Claude Code (esto es lo que estás viendo ahora)
Mensaje en chat. Claude Code edita repo, commitea, pushea, abre/actualiza PR.

### Luis → v0.dev
Pegando prompt de `docs/v0-prompt.md` o lenguaje natural. v0 genera. Sync a GitHub via su botón.

### v0 → Claude Code (handoff de Fase 6 del playbook)
v0 sincroniza a la rama `v0-sync`. Luis avisa en chat. Claude Code hace `git fetch origin v0-sync`, audit, merge curado a la rama de feature.

### Claude Code → Forge AI (futuro)
Cuando Forge AI esté funcional, leerá `AGENTS.md` y `architecture.md`, conocerá su rol, y podrá ejecutar capas 1–3 con confirmación humana en Anillos 2/3.

---

## ¿No sabes qué eres ni qué hacer?

Si llegaste aquí sin contexto y no sabes qué agente eres ni qué te tocaría hacer, **detente y pregunta a Luis** vía chat o issue. Mejor un turno extra de aclaración que una acción equivocada.
