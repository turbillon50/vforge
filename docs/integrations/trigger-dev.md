# Integración: Trigger.dev (background jobs durables > 60s)

> *Entra en M9 (Fase 1). Resuelve el techo de 60s del Edge runtime de Vercel: cuando V ejecuta un sub-plan de 5+ pasos o un build largo, el endpoint `/api/forge/run` enqueua un job en Trigger y devuelve un `run_id` para polling/SSE. ADR-009 lo eligió sobre Temporal por DX TS-first.*

---

## Resumen

- **Provider:** [Trigger.dev](https://trigger.dev) — background jobs durables, TS-first, v3
- **Rol en vForge:** runs largos del cerebro (sub-planes multi-step, builds, deploys con verificación) que excedan los timeouts del Edge runtime. El job es durable, sobrevive a redeploys, y reporta estado vía API.
- **Milestone:** M9 — Fase 1
- **Anillo:** 1 (el job ejecuta lo que el orquestador ya validó; no introduce privilegio nuevo)
- **Adapter file (futuro):** `lib/forge/adapters/trigger-bg.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
TRIGGER_API_KEY      tr_pat_...   personal access token del dashboard (server-side encrypted)
TRIGGER_PROJECT_ID   proj_...     ID del proyecto vforge en Trigger.dev
```

Dos variables. El project ID es plain (no sensitive). El API key sí va encrypted.

---

## Cuenta y onboarding

1. Ir a https://cloud.trigger.dev/login — registrarse con GitHub OAuth.
2. Crear organización (default: nombre del usuario) y luego proyecto: "Create new project" → nombrar `vforge` → copiar el `proj_...` ID.
3. Generar PAT en https://cloud.trigger.dev/account/tokens → "New token" → scope `read_write` para el proyecto vforge. Copiar el `tr_pat_...`.
4. Localmente (o en CI), correr `npx trigger.dev@latest init` apuntando al project ID — esto genera `trigger.config.ts` en la raíz del repo y la carpeta `trigger/`.
5. Deployar tasks iniciales con `npx trigger.dev@latest deploy` (después de M9 cuando las tasks existan).
6. Agregar `TRIGGER_API_KEY` (encrypted) y `TRIGGER_PROJECT_ID` (plain) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Trigger.dev v3 se usa via SDK TypeScript. Hay dos lados: **definir tasks** (corren en su infra) y **disparar tasks** (desde nuestro backend).

```ts
// trigger/forge-long-run.ts — definición de la task (corre en Trigger.dev)
import { task } from "@trigger.dev/sdk/v3";

export const forgeLongRun = task({
  id: "forge.long-run",
  maxDuration: 30 * 60, // 30 min hard cap
  run: async (payload: { runId: string; subPlan: PlanStep[] }) => {
    // Ejecuta el sub-plan, emite progress via metadata
    for (const step of payload.subPlan) {
      // ... ejecutar step ...
    }
    return { status: "ok", artifacts: [] };
  },
});

// lib/forge/adapters/trigger-bg.ts — disparar desde vForge
import { tasks } from "@trigger.dev/sdk/v3";

const handle = await tasks.trigger<typeof forgeLongRun>("forge.long-run", {
  runId,
  subPlan,
});
// handle.id es el run_id que devolvemos al cliente
```

Operaciones clave:

| Método | Para qué |
|---|---|
| `tasks.trigger(id, payload)` | Enqueue async, devuelve handle |
| `runs.retrieve(runId)` | Polling de estado |
| `runs.subscribeToRun(runId)` | Stream de updates (SSE-compatible) |
| `runs.cancel(runId)` | Cancelación manual desde el chat |

---

## Runbook (cuando ejecutemos M9)

1. Verificar ambas envs (`TRIGGER_API_KEY`, `TRIGGER_PROJECT_ID`) vía `getOperatorSecret`. Si falta cualquiera, abortar M9.
2. Correr `npx trigger.dev@latest init` en la raíz del repo. Confirmar que crea `trigger.config.ts` y carpeta `trigger/`.
3. Crear las primeras tasks en `trigger/`:
   - `forge-long-run.ts` — ejecuta sub-planes multi-step del cerebro.
   - `health-check.ts` — cron cada 5 min que pinga cada adapter (ver ADR-009 §health check).
4. Crear `lib/forge/adapters/trigger-bg.ts` implementando el contract: capacidades `["background-job", "scheduled"]`. Anillo 1. Métodos `enqueue(taskId, payload)`, `status(runId)`, `cancel(runId)`.
5. Agregar tools al cerebro en `lib/forge/tools.ts`: `bg_enqueue(job_name, payload)` y `bg_status(run_id)`. Ambas Anillo 1.
6. Wire SSE en `/api/forge/run/route.ts`: cuando el run es enqueable, devolver `run_id` inmediato y abrir stream desde `runs.subscribeToRun`.
7. Deploy tasks: `npx trigger.dev@latest deploy --env prod`.
8. Test: trigger un job dummy desde un endpoint admin, verificar que aparece en el dashboard de Trigger.

---

## Caveats / notas operativas

- **v3 only.** v2 está deprecado; toda doc nueva apunta a v3. No mezclar SDKs.
- **maxDuration es hard cap.** Un job que lo excede se mata. Para workflows > 30 min, partir en sub-tasks que se llaman entre sí.
- **Free tier:** 10K runs/mes, suficiente para Fase 1. Pricing escala por run, no por compute time, lo cual es generoso para nuestro caso.
- **Cold starts:** ~1-2s por task la primera vez después de redeploy. Despreciable para nuestros casos de uso.
- **Rotación de key:** dashboard `/account/tokens` → revoke + create new. Redeploy de Vercel para que aplique.
- **Vendor alternatives:** Inngest (overlap completo, perdió por DX), Temporal (overkill para Fase 1, posible migración en M18 si llegan workflows de horas). Migrar implica reescribir las task definitions y el adapter.

---

## Estado de env vars en Vercel

```
TRIGGER_API_KEY      encrypted    PENDIENTE — agregar antes de M9
TRIGGER_PROJECT_ID   plain        PENDIENTE — agregar antes de M9
```

---

## Referencias

- Docs: https://trigger.dev/docs
- SDK: https://github.com/triggerdotdev/trigger.dev
- Dashboard: https://cloud.trigger.dev
