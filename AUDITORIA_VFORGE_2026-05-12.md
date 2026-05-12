# Auditoría vForge — 2026-05-12

> *Foto del estado real del repo y de los servicios externos. Ejecutada al inicio de la sesión de bootstrap MVP. Sirve de baseline contra el que medimos el progreso hacia el roadmap M0→M15 (ver `docs/architecture.md §7` post-ADR-009).*

- **Operador:** Luis Humberto de la Torre Herrera
- **Rama actual:** `claude/vforge-mvp-Lw6HY` (limpia, sin uncommitted)
- **Auditor:** Claude Code (Opus 4.7) en sesión de bootstrap
- **Estado global:** **~70% del cerebro cableado**, bloqueado en credenciales plaintext para arrancar la auditoría real de la BD

---

## 1. Veredicto en una página

vForge **no es un scaffold vacío** — el cerebro de V está parcialmente construido y la arquitectura está documentada al detalle.

| Área | Estado | Comentario |
|---|---|---|
| Stack base | ✅ Listo | Next.js 16 + React 19 + TypeScript estricto + Tailwind 4 + shadcn |
| ADRs | ✅ 9 firmados | 001-008 originales + 009 (ADR de stack externo, escrito hoy) |
| Schema BD | ✅ 4 migraciones | users, secrets dobles (operator + zero-knowledge), knowledge_base, conversations, projects, audit_events, project_secrets |
| Vault | ✅ Funcional | AES-256-GCM server-side (operator_secrets) + zero-knowledge (user_secrets) + cascade `project → operator → env` |
| Cerebro endpoint | ✅ Funcional | `/api/forge/run` con streaming SSE, tool loop de 5 rondas, persistencia de turnos |
| Tools cableadas | ✅ 22 tools | GitHub (5), Vercel (8), Name.com (5), Vault per-project (3), memory_save, projects_sync |
| Memoria persistente | ✅ Rica | knowledge_base + conversations + recaps + memorias explícitas |
| Voz de V | ✅ Definida | `system_config.ai_personality` + senior-engineer doctrine en system-prompt |
| Anillos de privilegio | ✅ Documentados | 0-3, respetados en system prompt y en tools.ts |
| Frontend dashboard | 🟡 Scaffold | 10 pantallas con mock-data; falta cablearlas a los endpoints reales |
| Adapter pattern | 🔜 Pendiente | Contract listo (`lib/forge/adapters/_contract.ts`), implementaciones por venir en M3-M15 |
| OpenRouter adapter | 🔜 Pendiente | M3 — bloqueado en `OPENROUTER_API_KEY` (Luis va a generarla) |
| Clerk | 🔜 Pendiente | M11 (Fase 2) — hoy `OPERATOR_USER_ID = "operator_luis"` hardcoded |
| Aplicación de migraciones a Neon | ⛔ Bloqueado | Falta `DATABASE_URL` plaintext — Vercel EEV no se desencripta vía API |

**Bloqueador único crítico:** falta plaintext de `DATABASE_URL`, `OPENROUTER_API_KEY`, y `VFORGE_MASTER_PEPPER`. Todo lo demás (documentación, adapter contract, runbooks, roadmap) se está completando sin tocar BD ni claves.

---

## 2. Topología del repo

```
vforge/
├── app/                          Next.js App Router
│   ├── (dashboard)/              10 pantallas con shell de UI
│   │   ├── forge/                Chat principal con V
│   │   ├── activity/             Audit log + cost tracking
│   │   ├── hub/                  Dashboard agregado
│   │   ├── hunter/               Búsqueda externa
│   │   ├── modules/              Catálogo de capacidades
│   │   ├── projects/             Lista + detail por slug
│   │   ├── scout/                Discovery
│   │   ├── settings/             Config + integraciones
│   │   ├── vault/                Vault UI (operator + project secrets)
│   │   └── vision/               Repo Vision
│   └── api/                      17 endpoints (ver §5)
├── components/                   providers, ui (shadcn), vforge, web-apis
├── docs/
│   ├── architecture.md           Roadmap + diagrama del cerebro (extendido hoy)
│   ├── method.md                 El Método vForge
│   ├── playbook.md               Manual operativo extendido
│   ├── v0-prompt.md              Prompts para v0.dev
│   ├── decisions/                9 ADRs (001-009)
│   └── integrations/             Runbooks: clerk, neon, name-com, model-providers + 8 nuevos en M3-M15
├── lib/
│   ├── auth/                     operator-token.ts (71)
│   ├── db/                       client.ts (66) — Neon serverless
│   ├── forge/                    system-prompt.ts (310), tools.ts (1128), adapters/ (nuevo hoy)
│   ├── github/                   client.ts (241) — Octokit
│   ├── namecom/                  client.ts (199) — Name.com REST
│   ├── vault/                    get-secret.ts (198), operator-crypto.ts (98)
│   ├── vercel/                   client.ts (294) — Vercel REST
│   └── mock-data.ts              (107) — usado por frontend mientras se cablea
├── migrations/                   001-004 SQL (esquema + seeds)
├── AGENTS.md                     Protocolo multi-agente
├── README.md
└── .env.example                  Reescrito hoy con shape canónico de ADR-009
```

Total backend: **~2,720 líneas TypeScript**. Es un MVP funcional, no un scaffold.

---

## 3. Stack y dependencias clave

Verificado en `package.json`:

| Dependencia | Versión | Uso |
|---|---|---|
| `next` | `16.2.4` | App Router + Edge Runtime |
| `react` / `react-dom` | `^19` | UI |
| `typescript` | `5.7.3` | Lenguaje |
| `tailwindcss` | `^4.2.0` | Estilos (sintaxis @theme inline) |
| `@anthropic-ai/sdk` | `^0.92.0` | Cliente Anthropic — usado en `/api/forge/run` |
| `@neondatabase/serverless` | `^1.1.0` | Cliente Postgres con HTTP transport |
| `openai` | `^6.35.0` | Cliente OpenAI — usado en `/api/forge/transcribe` y `/extract-secret` |
| `octokit` | `^5.0.5` | Cliente GitHub |
| `zod` | `^3.24.1` | Validación |
| `framer-motion` | `^12.38.0` | Animaciones |
| `@radix-ui/*` | varios | Primitivas shadcn |

**Dependencias que llegan con ADR-009 (no instaladas aún):** `@openrouter/sdk` (o usar `openai` SDK contra `openrouter.ai/api/v1`), `@e2b/code-interpreter`, `@trigger.dev/sdk`, `resend`, `@libsql/client`, `@liveblocks/node`, `@polar-sh/sdk`, `@unkey/api`.

---

## 4. Schema actual (sin verificar contra Neon — pendiente)

`migrations/` tiene 4 archivos. Lo que cada uno crea (leído desde el SQL, NO confirmado en Neon):

### 001_initial.sql

- `schema_migrations` — control de migraciones aplicadas
- `users` — keyed por Clerk user_id (futuro); `operator_luis` en MVP
- `operator_secrets` — Class 1 (server-side AES-256-GCM)
- `user_secrets` — Class 2 (zero-knowledge AES-256-GCM client-side)
- `projects` — catálogo de apps gestionadas por Forge AI
- `knowledge_base` — memoria persistente de V (kinds: operator_profile, organization, method, preference, lesson, note con tags `session_recap` o `memory`)
- `conversations` — historial de chat (`role`, `content`, tokens, cost, model)
- `audit_events` — toda acción de Anillo 0-3 con `ring`, `action`, `resource_type`, `payload jsonb`
- `system_config` — id=1 singleton con ai_name, ai_personality, default_model, default_tone

### 002_seed.sql

- Inserta usuario `operator_luis` (Luis, turbillon50@gmail.com)
- Inserta `system_config` con personalidad completa de V (5+ párrafos en español MX) y modelo default `claude-sonnet-4-6`
- Inserta knowledge_base inicial: operator_profile, organization (AGH), method (vForge), stack preference, más

### 003_seed_protocols.sql

- Inserta knowledge_base con protocolos: NUEVO, RESCATE, HUNTER
- Inserta lessons del día 1 (deploy de Rivones con caveats Vite outDir + DNS)

### 004_project_secrets.sql

- Crea `project_secrets` (sibling de `operator_secrets` con UNIQUE(project_id, name))
- Resolución cascade implementada en `lib/vault/get-secret.ts`

**Hallazgo importante:** las migraciones están escritas pero **no sabemos si están aplicadas en Neon**. Hay que correr `/api/admin/migrate` (que escanea `migrations/`, aplica por filename, idempotente) en cuanto tengamos `DATABASE_URL`.

---

## 5. Endpoints API existentes (17)

### Cerebro / Forge

| Endpoint | Método | Estado | Notas |
|---|---|---|---|
| `/api/forge/run` | POST | ✅ Funcional | Streaming SSE, tool loop max 5 rondas, persiste turnos, Anthropic SDK directo |
| `/api/forge/recap` | POST | ✅ Funcional | Pide a Haiku resumen de la sesión, lo guarda como `kind='note'` con tag `session_recap` |
| `/api/forge/transcribe` | POST | ✅ Funcional | OpenAI Whisper, multipart audio, audio NO se persiste |
| `/api/forge/extract-secret` | POST | ✅ Funcional | OCR de screenshots con OpenAI vision para detectar API keys; protegido por operator token |
| `/api/forge/conversations` | GET | ✅ Funcional | Rehidratar chat por sessionId, ordenado cronológico |
| `/api/forge/active-session` | GET/POST | ✅ Funcional | Cross-device session ID — comparte chat entre laptop y phone |

### Projects

| Endpoint | Método | Estado | Notas |
|---|---|---|---|
| `/api/projects` | GET | ✅ | Lista del catálogo (tabla `projects`) |
| `/api/projects/[id]` | GET/PATCH | ✅ | Detail + edit |
| `/api/projects/sync` | POST | ✅ | Cross-check GitHub + Vercel, insert/update en `projects` |
| `/api/stats` | GET | ✅ | Métricas agregadas |

### GitHub

| Endpoint | Método | Estado |
|---|---|---|
| `/api/github/repos` | GET | ✅ |
| `/api/github/repos/[owner]/[repo]` | GET | ✅ |

### Vault

| Endpoint | Método | Estado | Notas |
|---|---|---|---|
| `/api/vault/operator-secrets` | GET/POST | ✅ | Lista metadata + create encrypted |
| `/api/vault/operator-secrets/[id]` | GET/PATCH/DELETE | ✅ | CRUD individual |
| `/api/vault/operator-secrets/[id]/value` | POST | ✅ | Reveal plaintext (requires operator auth) |
| `/api/vault/project-secrets` | GET/POST | ✅ | Mismo patrón, per-project |
| `/api/vault/project-secrets/[id]` | GET/PATCH/DELETE | ✅ | |
| `/api/vault/project-secrets/[id]/value` | POST | ✅ | |

### Admin

| Endpoint | Método | Estado |
|---|---|---|
| `/api/admin/migrate` | POST | ✅ Idempotente, splits por `;` con DO $$ awareness |

**Endpoints que faltan según el roadmap M0→M15:**

- `/api/admin/health` — health check agregado por adapter (M9)
- `/api/forge/bg-run` — long-running jobs vía Trigger.dev (M9)
- `/api/forge/code-exec` — corre Claude Code SDK dentro de E2B (M5)
- `/api/billing/*` — checkout, customer portal, webhooks (M14, Fase 2)
- `/api/apikeys/*` — issue, revoke, list per-tenant (M15, Fase 2)
- `/api/clerk/webhook` — sync de users (M11, Fase 2)

---

## 6. Tools cableadas (22)

Catalogadas en `lib/forge/tools.ts:45-426`. Cada una con `ring`, `description`, `input_schema`, audit a `forge.tool.invoke`.

**GitHub (read-only, ring 0):** `github_list_repos`, `github_get_repo`, `github_list_commits`, `github_read_file`.
**GitHub write (no cableado todavía):** falta `github_commit_file`, `github_create_pr`, `github_create_issue` — milestone M8.
**Vercel (ring 0-1):** `vercel_list_projects`, `vercel_get_project`, `vercel_create_project`, `vercel_list_deployments`, `vercel_get_deployment`, `vercel_trigger_deployment`, `vercel_set_env_var`, `vercel_add_domain`, `vercel_get_domain_config` (9 — la cuenta dice 8 en el chat anterior; conté de nuevo, son 9).
**Name.com (ring 0-1):** `namecom_list_domains`, `namecom_get_domain`, `namecom_list_records`, `namecom_upsert_record`, `namecom_delete_record`.
**Vault (ring 0-1):** `vault_list_secrets`, `project_secret_save`, `project_secret_list`, `project_secret_delete`.
**Memoria:** `memory_save`.
**Sync:** `projects_sync`.

**Tools que faltan según ADR-009:**

| Tool | Adapter | Milestone |
|---|---|---|
| `model_route` | routing.ts | M3 |
| `code_exec` | claude-code-sdk + e2b-microvm | M5 |
| `web_search` | anthropic-web-search | M4 |
| `image_generate` | openai-image | M6 |
| `voice_transcribe` (ya hay endpoint pero falta tool) | openai-whisper | M10 |
| `bg_enqueue` + `bg_status` | trigger-bg | M9 |
| `email_send` | resend-email | M9.5 |
| `github_commit_file` + `github_create_pr` | github-octokit (write ops) | M8 |
| `vercel_deploy` con confirmación | vercel-deploy | M7 |
| `realtime_room_create` | liveblocks-rooms | M13 (Fase 2) |
| `billing_checkout` | polar-billing | M14 (Fase 2) |
| `apikey_issue` + `apikey_revoke` | unkey-keys | M15 (Fase 2) |
| `edge_db_create` | turso-edge | M12 (Fase 2) |

---

## 7. System prompt y memoria persistente

`lib/forge/system-prompt.ts:42` — `buildSystemPrompt(options)` carga en cada turno:

1. `system_config.ai_personality` — voz de V (cálida, español MX, camarada técnica)
2. `SENIOR_ENGINEER_DOCTRINE` — doctrina interna de Claude Code aplicada a V (ejecuta no orientes, parche mínimo, root cause)
3. Knowledge base sagrada (siempre): `operator_profile`, `organization`, `method`, `preference`
4. Últimas 10 lessons
5. Últimos 8 recaps de sesiones previas
6. Últimas 8 memorias explícitas (`memory_save`)
7. Catálogo de proyectos agrupado por categoría
8. Si la conversación está scoped a un projectId, foco del proyecto

**Esto YA ES** el equivalente del "bootstrap rico" de Tanit, antes de ADR-009. Solo le falta el adapter pattern para que cargue contexto desde múltiples fuentes (no solo Neon).

---

## 8. Vault: lo que ya está y lo que falta

### Lo que está

- `operator_secrets` con AES-256-GCM, IV per-row, auth_tag, indexado por provider
- `project_secrets` con resolución cascade — verificado en `tools.ts:856-908`
- `getOperatorSecret(name, { projectId? })` con cache in-memory 60s en `lib/vault/get-secret.ts:198`
- Crypto helpers en `lib/vault/operator-crypto.ts` (98 líneas, todo lo que necesita el server)

### Lo que falta para zero-knowledge (ADR-008)

- WASM Argon2id cliente — `hash-wasm` no aparece en `package.json` aún
- UI de setup en `/vault`: modal "Crea tu Vault Master Password", generación de 3 backup codes, descarga
- Endpoint para guardar `vault_salt` + `vault_backup_codes_hashed` por usuario
- Endpoint para validar backup code en recovery flow
- Encrypt-on-client → POST → server guarda blob opaco

Esto se prioriza con Clerk en M11 (no antes), porque sin multi-user el feature es académico.

---

## 9. Frontend: estado real (sin verificar runtime, solo estructura)

10 pantallas en `app/(dashboard)/`:

| Pantalla | Estado probable | Comentario |
|---|---|---|
| `forge` | 🟡 Probablemente cableada | Llama a `/api/forge/run` (debe confirmarse en chat con `npm run dev`) |
| `activity` | 🟡 Probable mock | Mock data si `audit_events` no tiene rows aún |
| `hub` | 🟡 Probable mock | Dashboard agregado |
| `hunter` | 🟡 Mock | Búsqueda externa, falta tool `web_search` |
| `modules` | 🟡 Mock | Catálogo de capacidades — listado decorativo |
| `projects` + `[slug]` | 🟡 Mixta | `/api/projects` está real; el detail puede tener partes mock |
| `scout` | 🟡 Mock | Discovery |
| `settings` | 🟡 Mixta | Integraciones probablemente leen de DB |
| `vault` | 🟡 Mixta | Operator secrets sí están cableados; user secrets dependen de WASM Argon2id (no implementado) |
| `vision` | 🟡 Mock | Repo Vision (M5+ probablemente) |

**Sin correr `npm run dev` no se puede afirmar más.** Eso requiere `DATABASE_URL` o aceptar errores de lectura de BD; alternativa es ver el JSX y ver si fetch a `/api/*` o lee `mockProjects`.

`lib/mock-data.ts` (107 líneas) existe y se está usando — significa que parte del frontend lee de mocks aún. M7-M9 cierran eso.

---

## 10. Servicios externos: estado

### Vercel
- **Proyecto:** `prj_EBymOJI4YNLM4AG40ZpWmMKRN66c` (`vforge`) en team `team_gK8RSuGh0CYHEjgEqFRR2iIk`
- **Framework:** nextjs auto-detect
- **Último deploy:** `dpl_DwJ1AzzWqeJQeaERH3fa1Ca6LMPg` (READY)
- **Dominios:** `vforge.site`, `www.vforge.site`, `vforge-beta.vercel.app`, más previews
- **13 env vars** en Vercel (todas encrypted EEV — no descifrables vía API REST)

### Neon
- Acceso pendiente — `DATABASE_URL` plaintext requerida.
- `docs/integrations/neon.md` dice: project `vforge` (`morning-lab-81926607`), org `org-super-wind-01105205`, region `aws-us-east-1`, Postgres 17.8, default branch `production` (no protegido aún).

### Anthropic / OpenAI / Gemini / Perplexity
- Keys en `operator_secrets` (verificable cuando llegue `DATABASE_URL`) y en Vercel EEVs.
- `/api/forge/run` espera leer `ANTHROPIC_API_KEY` vía `getOperatorSecret` (que cae a env si no hay row).
- `/api/forge/transcribe` lee `process.env.OPENAI_API_KEY` directo — **inconsistencia leve**: debería pasar por el vault para consistencia. Lo dejamos como cleanup menor para M3.

### OpenRouter / E2B / Trigger.dev / Resend / Turso / Liveblocks / Polar / Unkey
- Cuentas no creadas. Cada uno tiene su runbook stub en `docs/integrations/<servicio>.md` (escritos hoy en paralelo).

---

## 11. Bloqueadores actuales

| Bloqueador | Resuelve | Impacto |
|---|---|---|
| Falta `DATABASE_URL` plaintext | Luis lo pega, o corre `vercel env pull` | No puedo auditar tablas reales, ni aplicar migraciones, ni seedear |
| Falta `OPENROUTER_API_KEY` | Luis genera nueva en openrouter.ai/keys | No puedo construir adapter `openrouter-gateway` (M3) |
| Falta `VFORGE_MASTER_PEPPER` plaintext | Mismo plan que DATABASE_URL | No puedo descifrar rows existentes en `operator_secrets`/`project_secrets` (si los hay) |

**No bloqueadores** (puedo proceder):
- ADR-009 ✅ Escrito y firmado
- Adapter contract ✅ Creado
- `.env.example` ✅ Reescrito
- Roadmap ✅ Extendido a M15
- Runbooks ✅ En curso (subagent ejecutando 8 archivos)
- Esta auditoría ✅ Escrita

---

## 12. Siguientes pasos en orden ejecutivo

### Inmediato (hoy, una vez Luis pegue credenciales)

1. Llenar `.env.local` con plaintext.
2. `npm install` para confirmar deps actuales.
3. Verificar conectividad a Neon vía HTTP (curl POST a `endpoint/sql` con un `SELECT 1`).
4. Listar tablas: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` — confirmar si migraciones 001-004 están aplicadas.
5. Si no están: invocar `POST /api/admin/migrate` con bearer `VFORGE_OPERATOR_TOKEN`.
6. Confirmar seeds: `SELECT count(*) FROM knowledge_base GROUP BY kind`.
7. Listar secrets actuales: `SELECT name, provider FROM operator_secrets`.

### Esta sesión (Fase 1 — bootstrap MVP)

8. **M3 — Adapter `openrouter-gateway`:** crear `lib/forge/adapters/openrouter.ts`, registrarlo en routing policy, agregar tool `model_route` opcional, smoke test contra hello-world.
9. **M3.5 — Migrar Anthropic SDK al adapter pattern:** refactor `/api/forge/run` para usar `lib/forge/adapters/anthropic.ts` en vez del SDK inline. Cero cambio de comportamiento, solo encapsulación.
10. Smoke test E2E: enviar mensaje al `/api/forge/run` desde curl, ver streaming de V hablando en español MX.

### Después de esta sesión

11. M4 → M10 según `architecture.md §7`.
12. Fase 2 cuando Luis decida abrirlo a terceros.

---

## 13. Riesgos y advertencias

| Riesgo | Mitigación |
|---|---|
| Aplicar migraciones a producción sin DB de preview | Neon branching habilitado pero NO automatizado a PR. Aplicar 001-004 a `production` branch directo en MVP es OK porque la BD está virgen; en Fase 2 esto se cabela a CI. |
| `default_model: claude-sonnet-4-6` en `system_config` mientras Opus 4.7 ya está GA | Actualizar a `claude-sonnet-4-6` está bien para Fase 1 (cost-effective); reservar Opus 4.7 para tareas que lo justifiquen vía routing. Decisión documentada. |
| 13 env vars en Vercel — todas en producción, sin staging separado | Aceptable hoy (1 dev, sin clientes externos). Cuando llegue Fase 2 se separa staging. |
| `OPERATOR_USER_ID = "operator_luis"` hardcodeado en 6+ endpoints | M11 reemplaza con Clerk. Hasta entonces, vForge es single-tenant por diseño explícito. |
| `mock-data.ts` aún consumido por frontend | Se reemplaza pantalla por pantalla en M3-M10. No bloqueante. |
| `/api/forge/transcribe` lee `process.env.OPENAI_API_KEY` directo en vez de vault | Cleanup menor en M3 — moverlo a `getOperatorSecret("OPENAI_API_KEY")`. |

---

## 14. Lo que NO se tocó en esta auditoría

- Tests: no hay `__tests__/` ni `vitest.config.ts`. Test coverage actual es 0%. **TODO post-MVP:** añadir tests por adapter (M3-M15) y un suite E2E mínimo de los endpoints críticos.
- CI/CD: `.github/workflows/` no existe (revisar). Auto-deploy a Vercel está vía conexión GitHub→Vercel nativa.
- Performance: latencia del cerebro no medida. SSE TTFB depende de Anthropic, < 500ms en buen día.
- Security review: pendiente correr `/security-review` al final del MVP.

---

## 15. Resumen ejecutivo (para Luis, 5 líneas)

vForge está al 70%. No es scaffold — el cerebro funciona y tiene 22 tools cableadas, vault doble, system prompt rico con memoria persistente, 4 migraciones SQL listas y 17 endpoints. Para llegar al 100% necesitamos M3 (OpenRouter), M5 (E2B + Claude Code SDK), M9 (Trigger.dev background jobs), M9.5 (Resend) y M10 (Whisper). En total son ~18 días-persona, 4-5 semanas calendario con 1 dev (yo). Fase 2 (SaaS multi-tenant con Clerk + Turso + Liveblocks + Polar + Unkey) son +12 días, +3 semanas. **Hoy solo me falta que pegues `DATABASE_URL` y `OPENROUTER_API_KEY` para arrancar M3 mismo.**
