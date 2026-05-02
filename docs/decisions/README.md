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
| [004](./004-stream-first-ux.md) | Accepted | Stream-first en el chat de Forge, plan visible en línea |
| [005](./005-multi-model-from-day-one.md) | Accepted | Multi-modelo desde el día uno (Anthropic + OpenAI mínimo) |
| [006](./006-operator-paid-billing-mvp.md) | Accepted | Billing en cuenta de operador en MVP, pass-through en v2 |

---

## Cuándo abrir un ADR nuevo

- Cambias de stack (ej. Postgres → Mongo).
- Cambias el patrón de routing del cerebro.
- Cambias el modelo de permisos (anillos).
- Agregas un nuevo proveedor crítico (ej. OpenRouter, Replicate).
- Cambias el deploy target (Vercel → Cloudflare Workers).

Si dudas si un cambio merece ADR: probablemente sí. **Mejor un ADR de más que una decisión perdida.**
