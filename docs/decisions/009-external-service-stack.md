# ADR-009: External service stack — OpenRouter, E2B, Trigger.dev, Turso, Liveblocks, Polar.sh, Unkey, Resend

- **Estado:** Accepted
- **Fecha:** 2026-05-12
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Fase 1 (MVP single-tenant para Luis) y Fase 2 (multi-tenant SaaS para terceros)
- **Relaciona:** enriquece ADR-002, ADR-003, ADR-005, ADR-006, ADR-008. No supersede ninguno.

## Contexto

vForge se construye en dos fases:

1. **Fase 1 — MVP single-tenant para Luis.** El cerebro `V` opera contra Anthropic + OpenAI + las tools ya cableadas (GitHub, Vercel, Name.com, Vault). Roadmap M0→M11 en `architecture.md §7`.
2. **Fase 2 — SaaS multi-tenant.** Terceros llegan, conectan sus propias credenciales (GitHub, Vercel, v0), reciben su API key per-tenant, y vForge orquesta la fábrica de aplicaciones para ellos con billing pass-through.

A medida que crece el alcance, varias capacidades exigen servicios externos especializados en vez de implementación casera:

- Ejecución segura de código (M5: adapter `claude-code-sdk`) no puede correr en el server de vForge — riesgo de RCE y de timeouts. Necesita sandbox real.
- Runs largos del cerebro (un proyecto entero generado en 1 sola sesión) exceden los timeouts del Edge runtime de Vercel (300s en Enterprise, 60s default). Necesitan background jobs durables.
- Multi-tenant exige API keys per-cliente con revocation, rate limiting, analytics. Reescribirlo en casa es 2-3 sprints perdidos.
- Notificaciones (deploy listo, confirmación Ring 2/3, recap diario) no caben todas en el chat — algunas viven mejor en email.
- Cobro por uso (pass-through del costo de Anthropic + margen) exige sistema de billing. Stripe directo es trabajo; un wrapper SaaS-developer-first es más rápido.
- Colaboración tiempo real (Fase 3: 2 personas viendo el mismo proyecto en `/forge` al mismo tiempo) requiere infraestructura de CRDT que no vale la pena construir.
- Edge DB per-tenant (sessions, caches, telemetría) complementa el Postgres central de Neon sin saturarlo.

La pregunta no es "¿usamos servicios externos?" sino "¿cuáles, en qué orden, y con qué contrato?".

## Decisión

Adoptar el siguiente stack canónico de servicios externos para vForge. Cada uno tiene rol fijo, anillo de privilegio asignado, y fase de adopción declarada.

| Servicio | Rol único | Anillo | Fase | ADRs relacionados |
|---|---|---|---|---|
| **OpenRouter** | Gateway secundario a LLMs no-Anthropic (Gemini, Mistral, Llama, etc.) — adapter de cost optimization y fallback. **No** reemplaza el adapter Anthropic directo. | 0-1 | Fase 1 (M3) | ADR-005 |
| **E2B** | Sandbox aislado donde corre el adapter `claude-code-sdk` (M5). Cada sesión de Claude Code se levanta en un microVM de E2B, no en el server de vForge. | 1-2 | Fase 1 (M5) | ADR-002 |
| **Trigger.dev** | Background jobs durables para runs del cerebro que excedan 60s. El endpoint `/api/forge/run` puede enqueuar un `forge.long-run` job y devolver un `run_id`; el cliente hace polling SSE o se suscribe a updates. | 1 | Fase 1 (M9) | ADR-001, ADR-004 |
| **Neon** | Postgres central — source of truth. Ya en uso. Branching como Git para previews por feature branch. | n/a | Fase 1 (ya) | ADR-003, ADR-008 |
| **Turso** | SQLite distribuido edge **per-tenant** para session caches, telemetría de routing, y future per-tenant local DBs cuando vForge sirva apps de clientes. **No** reemplaza Neon. | 1 | Fase 2 | — |
| **Liveblocks** | Presencia + colab tiempo real en `/forge` (Luis y un colaborador viendo el mismo proyecto), en `/projects/[id]` (cursors compartidos), y eventualmente en el editor de prompts. | 0-1 | Fase 2-3 | — |
| **Polar.sh** | Billing y monetización pass-through. Wrappea Stripe con DX para SaaS de developer tools (subscriptions, usage-based, customer portal). Reemplaza el "Stripe directo" mencionado en ADR-006. | 2-3 | Fase 2 | ADR-006 |
| **Unkey** | API keys per-tenant cuando terceros usen vForge desde sus propias apps. Reemplaza el `VFORGE_OPERATOR_TOKEN` actual (token único hardcodeado) con keys gestionadas, revocables, rate-limited, con analytics. | 3 | Fase 2 | ADR-008 |
| **Resend** | Email transaccional con dominio propio (`@vforge.site`). Confirmaciones Ring 2/3, recaps diarios, alerts de deploys fallidos, magic links si llegan. | 1 | Fase 1 (M9.5 — opcional) | — |

**Servicios explícitamente descartados** (y por qué) van en *Alternativas consideradas*.

## Razón

Cada elección sigue un mismo principio: **no construyas lo que ya es un servicio maduro con SLA**. Y la división de fases protege el MVP de complejidad prematura.

**OpenRouter como secundario, no primario**: ADR-005 ya estableció que tener una única gateway añade latencia y un single-point-of-failure. Anthropic SDK directo sigue siendo el adapter primario para Claude (lo que ya está cableado en `app/api/forge/run/route.ts:78`). OpenRouter entra como adapter paralelo cuando V necesita un modelo distinto (Gemini para tareas baratas de clasificación, Mistral para resúmenes, Llama para experimentos) o cuando hay degradación de Anthropic.

**E2B sobre code execution casero**: ejecutar código que un LLM genera en el mismo proceso que sirve la app es RCE-by-design. Containers de E2B son microVMs Firecracker — aislamiento real, snapshots, persistencia opcional, SDK JS nativo. La alternativa (Docker-in-Docker propio o subprocess sandboxing con seccomp) es 1-2 semanas de operacional ininterrumpido. ADR-002 dijo "ejecución vía Claude Code SDK"; E2B es el "dónde" de esa ejecución.

**Trigger.dev sobre Temporal**: ambos hacen workflows durables. Temporal es enterprise-grade (necesita worker process, statefulness explícita en código, Temporal Cloud o cluster propio). Trigger.dev v3 es JS-nativo, deploy via npm, DX más simple, suficiente para "ejecutar un sub-plan de 5 pasos con retry". Si en Fase 3 aparece un caso de uso que exige Temporal (workflows de horas con compensaciones complejas, multi-region replication de estado), se evalúa migrar entonces. El costo de migrar de Trigger→Temporal después es contenido si los workflows son cortos; el costo de empezar con Temporal hoy es alto y se paga aunque no se use su potencia.

**Neon + Turso conviven**: Neon es Postgres central — schemas relacionales, joins complejos, transacciones ACID, branching como Git. Turso es SQLite distribuido edge — lectura baja latencia desde cualquier región, bases libres per-tenant. **No es uno o el otro**: Neon mantiene knowledge_base, conversations, audit_events, projects, operator_secrets. Turso entra en Fase 2 para session_state per-tenant (qué proyecto está activo, qué tool corrió por último, cache de embeddings), y eventualmente para "vForge gestiona la DB que la app del cliente usa" (un Turso DB libre por cada app que Forge AI deploye).

**Polar.sh sobre Stripe directo**: Stripe es excelente pero requiere construir el customer portal, los planes, la facturación de usage-based, los webhooks, la reconciliación. Polar abstrae todo eso con primitivas pensadas para "SaaS para developers". ADR-006 dijo "pass-through en v2" — Polar es el vehículo concreto. Si Polar cambia precios drásticamente, migrar a Stripe directo es 2 semanas (todos los datos siguen siendo de Stripe under the hood).

**Unkey sobre API keys caseras**: gestión de API keys (creación, revocation, rotation, rate limiting, analytics, scoping a endpoints específicos) es un producto entero. Implementarlo en casa significa 1-2 sprints + mantenimiento perpetuo. Unkey es el equivalente de Clerk pero para machine credentials.

**Resend desde Fase 1**: email transaccional NO es un nice-to-have. Cuando V deployea algo a producción a las 3 AM y algo falla, mejor recibir un email que descubrirlo en el dashboard al día siguiente. Resend tiene DX de developer (TypeScript SDK, React Email para templates), dominio propio con DKIM/SPF automatizado.

**Liveblocks en Fase 2-3**: hoy Luis es el único usuario. Colab tiempo real no aporta valor hasta que haya 2+ personas en el mismo workspace. Cuando ocurra, Liveblocks es la única opción razonable (Yjs casero es viable pero requiere infra de WebSocket/sync, mantenida 24/7).

## Consecuencias

**Fácil:**
- Cada adapter es un archivo en `lib/forge/adapters/<servicio>.ts` que implementa el contract `ForgeAdapter<Input, Output>` definido en `architecture.md §3.1`. Onboarding de un nuevo proveedor: 1 archivo + 1 entry en model registry + 1 runbook en `docs/integrations/`.
- Las credenciales de cada servicio viven en `operator_secrets` (Class 1, server-side encrypted con `VFORGE_MASTER_PEPPER`). Resolución cascade `project_secrets → operator_secrets → process.env` ya implementada en `lib/vault/get-secret.ts`.
- Multi-tenant en Fase 2 hereda gratis el modelo: cada tenant trae sus propias keys de OpenRouter, E2B, Polar, etc. vía el vault zero-knowledge (ADR-008).
- Cost optimization vía OpenRouter → Gemini para tareas baratas reduce el costo de razonamiento de baja prioridad ~80%.

**Difícil:**
- 8 servicios externos = 8 SLAs distintos que monitorear. Necesitamos un health check endpoint (`/api/admin/health`) que pingue cada uno y reporte status agregado.
- Onboarding inicial: hay que crear cuentas en 8 servicios, configurar billing en cada uno, generar keys, agregarlas a `operator_secrets`. Se mitiga: runbook por servicio en `docs/integrations/` con pasos exactos.
- Vendor lock-in moderado por servicio. Mitigación: cada adapter expone una interfaz neutra; migrar a un competidor es reescribir un archivo.
- Costos múltiples corrientes. Mitigación: tag de costo en `audit_events` por tool call, reporte mensual agregado.

**Deuda técnica asumida:**
- Cada SDK cambia con el tiempo. Necesitamos dependabot + tests de adapter por servicio.
- Trigger.dev → Temporal migration si llega Fase 3 con workflows de horas.
- Liveblocks free tier tiene cap (suficiente para Fase 2 con 5-10 usuarios; renegociar a paid en Fase 3).

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Solo Anthropic SDK directo + cero servicios externos** | Funciona para Fase 1 hello-world pero no escala a M5 (sandbox), M9 (jobs largos), Fase 2 (multi-tenant). Imposible para SaaS. |
| **Temporal.io como engine único de workflows** | Overhead operacional alto, statefulness explícita, requiere infra dedicada. Trigger.dev cubre 95% de los casos con 20% del esfuerzo. Evaluar Temporal en Fase 3 si los workflows del agente crecen a horas. |
| **Inngest** | Buen producto pero overlap completo con Trigger.dev (event-driven workflows). Trigger.dev ganó por mejor DX TS-first y deploy más simple. |
| **Browserbase** | Headless browser para que V navegue UIs. Considerado, descartado por ahora — la combinación de `anthropic-web-search` (Anthropic Web Search tool) + tools dedicadas (`vercel_*`, `github_*`, `namecom_*`) cubre 90% de los casos sin requerir browser real. Reevaluar si V necesita interactuar con dashboards de terceros sin API (ej. Squarespace, Wix). |
| **Stripe directo** | Polar es Stripe with developer DX. Si Polar se cae como empresa, migración a Stripe directo es 2 semanas (data ya está en Stripe). |
| **Clerk Machine Tokens** | Clerk + Unkey son complementarios: Clerk para usuarios humanos, Unkey para machines. Clerk's machine tokens existen pero no tienen rate limiting ni analytics que Unkey sí. |
| **Convex / Supabase como replacement de Neon** | Neon ya en uso, branching como Git encaja con el flow de vForge ("cada feature branch tiene su propia DB preview"). Migrar a Convex/Supabase rompe ADR-003 (auth + DB nativo) sin upside claro. |
| **Implementación casera de cada uno** | Cada uno son 1-3 sprints de construir y mantener. Total ~5-8 sprints solo en plumbing — costo de oportunidad enorme. |

## Implementación

### Estructura del codebase

```
lib/forge/
├── adapters/                     ← NUEVO en M3
│   ├── _contract.ts              ← ForgeAdapter<I,O>, Ring, Capability types
│   ├── anthropic.ts              ← M3 — Anthropic SDK directo (ya parcialmente cableado en run/route.ts)
│   ├── openrouter.ts             ← M3 — OpenAI-compatible SDK contra api.openrouter.ai
│   ├── openai-image.ts           ← M6 — gpt-image-1
│   ├── openai-whisper.ts         ← M10 — Whisper para mic input
│   ├── e2b-sandbox.ts            ← M5 — wraps E2B SDK
│   ├── claude-code-sdk.ts        ← M5 — corre dentro de e2b-sandbox.ts
│   ├── trigger-bg.ts             ← M9 — enqueue + status check
│   ├── resend-email.ts           ← M9.5 — confirmaciones + alerts
│   ├── unkey-keys.ts             ← Fase 2 — API key issuance
│   ├── polar-billing.ts          ← Fase 2 — subscriptions, usage
│   ├── liveblocks-rooms.ts       ← Fase 2 — presence, cursors
│   └── turso-edge.ts             ← Fase 2 — per-tenant edge DBs
├── models.ts                     ← model registry — agrega rows por proveedor
├── routing.ts                    ← routing policy v1 (heurística) — extiende switch a OpenRouter
├── system-prompt.ts              ← ya existe
└── tools.ts                      ← ya existe, agrega tools de cada nuevo adapter
```

### Resolución de credenciales

Mismo modelo que el actual:

```ts
// Cada adapter al inicializar:
const apiKey = await getOperatorSecret("OPENROUTER_API_KEY", { auditUserId: ctx.userId });
if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured in vault or env");
```

Variables de entorno canónicas (todas en `.env.example` y eventualmente en `operator_secrets`):

```
# LLMs
OPENROUTER_API_KEY            sk-or-v1-...
# Code execution
E2B_API_KEY                   e2b_...
# Background jobs
TRIGGER_API_KEY               tr_pat_...
TRIGGER_PROJECT_ID            proj_...
# Edge DB (Fase 2)
TURSO_AUTH_TOKEN              eyJ...
TURSO_ORG_SLUG                vforge
# Realtime collab (Fase 2)
LIVEBLOCKS_SECRET_KEY         sk_prod_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY pk_prod_...
# Billing (Fase 2)
POLAR_ACCESS_TOKEN            polar_oat_...
POLAR_ORGANIZATION_ID         org_...
POLAR_WEBHOOK_SECRET          whsec_...
# API key gateway (Fase 2)
UNKEY_ROOT_KEY                unkey_...
UNKEY_API_ID                  api_...
# Email
RESEND_API_KEY                re_...
RESEND_FROM_ADDRESS           noreply@vforge.site
```

### Tools que se agregan al cerebro

Por ahora `lib/forge/tools.ts` tiene 22 tools. ADR-009 introduce estas adicionales (en sus respectivos milestones):

- `model_route(task, hint?)` — devuelve `{adapter, model}` segun routing policy.
- `code_exec(repo_url, sub_plan)` — corre Claude Code SDK dentro de E2B, devuelve diff + logs.
- `bg_enqueue(job_name, payload)` + `bg_status(run_id)` — Trigger.dev.
- `email_send(to, subject, body)` — Resend.
- `realtime_room_create(project_id)` — Liveblocks (Fase 2).
- `billing_create_checkout(plan_id, user_id)` — Polar (Fase 2).
- `apikey_issue(tenant_id, scopes)` + `apikey_revoke(key_id)` — Unkey (Fase 2).
- `edge_db_create(tenant_id)` — Turso (Fase 2).

Cada una respeta su anillo (declarado arriba). Tools de Anillo 2-3 disparan el flujo de confirmación humana ya cableado en el frontend (`<ConfirmActionPill>`).

### Orden de adopción (ver `architecture.md §7` para detalles)

1. **M3** — Anthropic adapter (oficializar lo ya cableado) + **OpenRouter** adapter (nuevo).
2. **M5** — **E2B** + **Claude Code SDK** adapter (sandbox + code exec).
3. **M9** — **Trigger.dev** adapter (background jobs) + audit log persistente.
4. **M9.5** — **Resend** adapter (emails). Opcional pero recomendado.
5. **M11-M15 (Fase 2)** — **Turso**, **Liveblocks**, **Polar**, **Unkey** en este orden.

### Health check endpoint

```
GET /api/admin/health
→ { 
    db: "ok",                     // Neon
    vault: "ok",                  // operator_secrets readable
    adapters: {
      anthropic: "ok",
      openrouter: "missing-key" | "ok" | "401",
      e2b: "ok",
      ...
    }
  }
```

Disparado por cron de Trigger.dev cada 5 min, alert vía Resend si algo está rojo > 15 min.

## Lo que esto significa para el operador (Luis)

**En Fase 1 (próximas 4-6 semanas):**

1. Crear cuenta en **OpenRouter**, generar API key, agregar a `operator_secrets` como `OPENROUTER_API_KEY`. (M3)
2. Crear cuenta en **E2B**, generar API key, mismo lugar como `E2B_API_KEY`. (M5)
3. Crear cuenta en **Trigger.dev**, crear proyecto vforge, generar key, mismo lugar. (M9)
4. Crear cuenta en **Resend**, verificar dominio `vforge.site` (records DNS via Name.com tool), generar key. (M9.5)

**En Fase 2 (después de M11):**

5. **Turso**: cuenta, org slug, auth token.
6. **Liveblocks**: cuenta, public + secret keys.
7. **Polar.sh**: cuenta organization, products, webhook secret.
8. **Unkey**: cuenta, root key, API.

Cada paso tiene su runbook en `docs/integrations/<servicio>.md` con pasos exactos.

## Referencias

- OpenRouter: https://openrouter.ai/docs
- E2B: https://e2b.dev/docs
- Trigger.dev v3: https://trigger.dev/docs
- Temporal (referencia, no adoptado todavía): https://docs.temporal.io
- Turso: https://docs.turso.tech
- Liveblocks: https://liveblocks.io/docs
- Polar.sh: https://docs.polar.sh
- Unkey: https://www.unkey.com/docs
- Resend: https://resend.com/docs
