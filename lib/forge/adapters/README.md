# `lib/forge/adapters/`

Canonical home of every external capability the Forge brain (V) can invoke.

## Contract

All adapters implement `ForgeAdapter<Input, Output>` from
[`_contract.ts`](./_contract.ts). The interface is small on purpose: `name`,
`ring`, `capabilities`, `costPerCall`, `health`, `execute`. See
[`docs/architecture.md §3.1`](../../../docs/architecture.md) for the design.

## Rules

1. **Never** read `process.env` directly. Use `ctx.vault.getOperatorSecret(...)`
   or `ctx.vault.getProjectSecret(...)`. Local dev falls through to env via
   `lib/vault/get-secret.ts`.
2. **Declare your `ring` correctly** — it's blast-radius *classification*, not a
   gate. The brain executes directly and logs every call to `audit_events`; it
   only surfaces an *aviso* (not a confirmation prompt) for Anillo 3 irreversible
   actions. Don't build pre-confirmation gates into adapters — see ADR-010.
3. **Emit progress** for anything that takes >500ms. The SSE stream needs the
   feedback to keep the chat alive.
4. **Return normalized errors** via `AdapterError(adapter, message, cause)` so
   the brain handles all failures the same way.

## Catalog

| File | Status | Adapter | Milestone | ADR |
|---|---|---|---|---|
| `_contract.ts` | ✅ ready | — | M3 | — |
| `anthropic.ts` | 🔜 M3 | `anthropic-claude` | M3 | ADR-002, ADR-005 |
| `openrouter.ts` | ✅ ready | `openrouter-gateway` | M3 | ADR-005, ADR-009 |
| `mesh.ts` | ✅ ready | `mesh-router` — IA propia (Cerebras + GPUs). **Preferida** para inferencia nueva | M3 | ADR-005 |
| `openai-image.ts` | 🔜 M6 | `openai-image` | M6 | ADR-005 |
| `e2b-sandbox.ts` | 🔜 M5 | `e2b-microvm` | M5 | ADR-009 |
| `claude-code-sdk.ts` | 🔜 M5 | `claude-code-sdk` (runs in `e2b-microvm`) | M5 | ADR-002, ADR-009 |
| `openai-whisper.ts` | 🔜 M10 | `openai-whisper` | M10 | ADR-005 |
| `anthropic-web-search.ts` | 🔜 M4 | `anthropic-web-search` | M4 | ADR-002 |
| `vercel-deploy.ts` | 🟡 partial | `vercel-deploy` (today lives in `lib/vercel/client.ts`, will move here) | M7 | — |
| `github-octokit.ts` | 🟡 partial | `github-octokit` (today in `lib/github/client.ts`) | M8 | — |
| `namecom-dns.ts` | 🟡 partial | `namecom-dns` (today in `lib/namecom/client.ts`) | M7 | — |
| `trigger-bg.ts` | 🔜 M9 | `trigger-bg` (Trigger.dev) | M9 | ADR-009 |
| `resend-email.ts` | 🔜 M9.5 | `resend-email` | M9.5 | ADR-009 |
| `turso-edge.ts` | 🔜 Fase 2 | `turso-edge` (per-tenant SQLite) | M12 | ADR-009 |
| `liveblocks-rooms.ts` | 🔜 Fase 2 | `liveblocks-rooms` | M13 | ADR-009 |
| `polar-billing.ts` | 🔜 Fase 2 | `polar-billing` | M14 | ADR-006, ADR-009 |
| `unkey-keys.ts` | 🔜 Fase 2 | `unkey-keys` | M15 | ADR-008, ADR-009 |

> `🟡 partial` means the capability already exists as a `lib/<x>/client.ts`
> module from before ADR-009. The eventual M-task is to wrap it in the
> ForgeAdapter shape so the routing policy can treat it uniformly with the
> rest. No behavior change to the existing code until that move happens.

## Mesh vs OpenRouter (jun 2026)

Para **features nuevas** de inferencia (sugerir/generar copy, clasificación,
side-tasks) usar el adapter `mesh-router`, **no** `openrouter-gateway`. Luis
dejó de construir sobre OpenRouter; la capa de IA preferida es su Mesh propio
(Cerebras + GPUs en Hetzner/Vast.ai), enrutado por `policy` (`fast`/`local`/`v`/
`auto`). `openrouter-gateway` se mantiene para lo que ya lo usa (no se quita
`OPENROUTER_API_KEY`), pero no se construye nada nuevo encima.

## Adding a new adapter

1. Create `lib/forge/adapters/<service>.ts`. Implement `ForgeAdapter<Input, Output>`.
2. Add an entry to `lib/forge/models.ts` (or the relevant registry) so the
   routing policy can pick it.
3. Add the credential names to `.env.example`, the runbook to
   `docs/integrations/<service>.md`, and the audit `ring` to ADR-009 if new.
4. Add one test in `lib/forge/adapters/__tests__/<service>.test.ts` covering
   the happy path and the `missing-key` health state.
