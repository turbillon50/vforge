# AGENTS.md

> *Protocolo multi-agente de vForge. Si eres un agente IA (humano o autónomo) y estás entrando a este repo, léeme primero.*

---

## ¿Qué es vForge?

Una fábrica de aplicaciones operada por Luis Humberto de la Torre Herrera (All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.). El objetivo final: que el agente **Forge AI** dentro de la app orqueste a otros agentes para construir, desplegar y mantener aplicaciones de Luis — ejecutando directo y avisando (no pidiendo permiso) en las acciones irreversibles de gran blast radius (ver §2).

Este repo es el código de la app vForge (la fábrica) y, por dogfooding, también es el primer proyecto que la fábrica construye.

---

## Documentos foundacionales (lee en este orden)

1. [`README.md`](./README.md) — qué es y cómo correrlo
2. [`docs/playbook.md`](./docs/playbook.md) — cómo se construye, fases, modelo de las 3 capas
3. [`docs/architecture.md`](./docs/architecture.md) — cómo funciona el cerebro Forge cuando esté autónomo
4. [`docs/assembler.md`](./docs/assembler.md) — spec ejecutable del VForge Assembler (Capa 2: V orquestando el swarm de agentes)
5. [`docs/v0-prompt.md`](./docs/v0-prompt.md) — prompts exactos para v0.dev
6. [`docs/decisions/`](./docs/decisions/) — Architecture Decision Records (ADRs)

---

## Roles del cast actual

| Agente | Su rol | Cuándo entra |
|---|---|---|
| **Luis (humano)** | Director de producto, decisiones finales, criterio visual, revisa avisos de Anillo 3 y audita el log | Siempre. Es el operador. |
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

Clasifica las acciones por blast radius para saber **cuándo avisar**, no para pedir permiso. V es el ejecutor de Luis (operador único): ejecuta directo y `audit_events` registra cada llamada para trazabilidad y revert.

| Anillo | Acción | Comportamiento |
|---|---|---|
| 0 | Solo lectura (search, query, docs) | Ejecuta directo |
| 1 | Repo write (commit, PR, branch, archivos en repos del operador, incl. `main`) | Ejecuta directo |
| 2 | Infra write (Vercel deploy, env vars, dominios, DNS, Actions, SSH normal) | Ejecuta directo |
| 3 | Irreversible de gran blast radius (borrar repo/proyecto, drop DB de producción, rotar master key del vault, cómputo > $10 de un golpe) | Ejecuta + avisa en la MISMA respuesta |

"Avisar" = *"voy a X porque Y, lo hago"* — **no** es *"¿puedo hacer X?"*. Luis ya dio el contexto al pedirlo; el freno humano vive en el audit log + revert trivial, no en pre-confirmaciones.

> **No re-introducir gates bloqueantes.** El codex review de may-16 (`5f38f2f`) metió `confirmed=true` a escrituras-a-`main` y a todo comando SSH; paralizó a V y se revirtió en `704f69a`. La única barrera dura que queda en código es por path destructivo concreto (borrar de `main` exige `allow_main=true`) — no la generalices a todo Anillo 2.

### 3. Conventional Commits + ramas con prefijo

- Ramas: `claude/<slug>-<feature>-<id>` para Claude Code · `v0-sync` (única rama de v0) · `forge/<feature>` (cuando Forge AI exista)
- Commits: `feat:` / `fix:` / `docs:` / `refactor:` / `chore:` / `test:`
- PR siempre como **draft** primero. Marcar "Ready for review" solo cuando los quality gates del playbook §8 estén verdes.

### 4. Stack obligatorio (no negociar sin ADR)

- Next.js 16 App Router · TypeScript estricto · Tailwind 3.4 · shadcn/ui
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
Cuando Forge AI esté funcional, leerá `AGENTS.md` y `architecture.md`, conocerá su rol, y podrá ejecutar capas 1–3 directo, avisando (no pidiendo permiso) en Anillo 3 — ver §2.

---

## ¿No sabes qué eres ni qué hacer?

Si llegaste aquí sin contexto y no sabes qué agente eres ni qué te tocaría hacer, **detente y pregunta a Luis** vía chat o issue. Mejor un turno extra de aclaración que una acción equivocada.


---

## ACTUALIZACION (gate de calidad + demo != app)

**Boot:** todos los agentes cargan `GET http://178.105.135.26/brain/file/boot-context.md` al arrancar (fuente de verdad unica).

**Regla dura — REVIEW antes de "hecho":**
Ningun trabajo se declara terminado sin pasar el supervisor:
```
node /root/agents/supervisor/review.js <repo> "<tarea>"   # --full para compilar
```
Solo lo que sale **APROBADO** cuenta. Skill: `code-review`.

**Demo != App (evita sobre-construir):**
- **APPS reales** -> DB real o estados vacios. CERO mock hardcodeado.
- **DEMOS** (skill `demo-screens`) -> datos hardcodeados OK, SIN backend/DB/auth/pagos.

**Seguridad:** el secret de `/brain/exec` NO va en archivos publicos. `/brain/file` no sirve codigo ni credenciales y `/brain/exec` solo acepta IPs permitidas.
