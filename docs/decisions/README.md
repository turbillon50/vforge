# Architecture Decision Records (ADRs)

> *Cada decisión arquitectónica significativa de vForge vive aquí como un archivo individual. Cuando una decisión deja de aplicar, no se borra: se agrega un nuevo ADR que la **supersede**.*

---

## Formato de un ADR

```
# ADR-XXX: Título corto y declarativo

- **Estado:** Proposed | Accepted | Deprecated | Superseded by ADR-YYY
- **Fecha:** YYYY-MM-DD
- **Decisores:** Luis, Claude Code (o quien aplique)
- **Contexto técnico:** vForge v1 / Forge brain / etc.

## Contexto
[Por qué surge la decisión, qué problema resuelve.]

## Decisión
[Qué decidimos hacer, en una frase.]

## Razón
[Por qué esta opción y no las alternativas.]

## Consecuencias
[Qué se vuelve fácil, qué se vuelve difícil, qué deuda asume.]

## Alternativas consideradas
[Qué otras opciones se evaluaron y por qué se descartaron.]
```

---

## Catálogo

| ADR | Estado | Decisión |
|---|---|---|
| [001](./001-self-hosted-brain.md) | Accepted | Brain self-hosted en Next API Route |
| [002](./002-claude-code-via-agent-sdk.md) | Accepted | Ejecución de código vía Anthropic Agent SDK + Claude Code |
| [003](./003-server-side-encrypted-keys.md) | Accepted | API keys server-side cifradas en Vault (AES-256-GCM) |
| [004](./004-stream-first-ux.md) | Accepted | Stream-first en el chat de Forge, plan visible en línea (gate de confirmación Anillo 2/3 superseded por 010) |
| [005](./005-multi-model-from-day-one.md) | Accepted | Multi-modelo desde el día uno (Anthropic + OpenAI mínimo) |
| [006](./006-operator-paid-billing-mvp.md) | Accepted | Billing en cuenta de operador en MVP, pass-through en v2 |
| [007](./007-adopt-next-16-tailwind-4.md) | Accepted (Tailwind corregido) | Adoptar Next 16 + React 19; Tailwind quedó en 3.4 (la migración v4 no se completó — ver corrección 2026-05-29) |
| [008](./008-zero-knowledge-vault.md) | Accepted | Zero-Knowledge Vault con Vault Master Password separado del Clerk password |
| [009](./009-external-service-stack.md) | Accepted | Stack de servicios externos: OpenRouter, E2B, Trigger.dev, Turso, Liveblocks, Polar.sh, Unkey, Resend |
| [010](./010-execute-first-doctrine.md) | Accepted | V ejecuta directo — sin gates de pre-confirmación; anillos = clasificación de blast radius (supersede en parte ADR-004) |

---

## Cuándo abrir un ADR nuevo

- Cambias de stack (ej. Postgres → Mongo).
- Cambias el patrón de routing del cerebro.
- Cambias el modelo de permisos (anillos).
- Agregas un nuevo proveedor crítico (ej. OpenRouter, Replicate).
- Cambias el deploy target (Vercel → Cloudflare Workers).

Si dudas si un cambio merece ADR: probablemente sí. **Mejor un ADR de más que una decisión perdida.**
