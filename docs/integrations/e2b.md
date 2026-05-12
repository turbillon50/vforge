# Integración: E2B (sandbox microVM para code execution)

> *Entra en M5 (Fase 1). Es el "dónde" del adapter `claude-code-sdk`: cada sesión de Claude Code se levanta dentro de un microVM Firecracker de E2B, no en el server de vForge. ADR-009 lo declara obligatorio para evitar RCE-by-design.*

---

## Resumen

- **Provider:** [E2B](https://e2b.dev) — sandboxes microVM (Firecracker) on-demand, SDK JS nativo
- **Rol en vForge:** sandbox aislado donde corre el adapter `claude-code-sdk` (M5). Cada sesión arranca un microVM dedicado con su propio filesystem y red controlada.
- **Milestone:** M5 — Fase 1
- **Anillo:** 1-2 (1 cuando opera sobre repos de feature branch; 2 cuando toca main o env real)
- **Adapter file (futuro):** `lib/forge/adapters/e2b-sandbox.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
E2B_API_KEY    e2b_...   key del dashboard E2B, server-side encrypted
```

Una sola variable. La región y el template del sandbox se eligen por request via SDK.

---

## Cuenta y onboarding

1. Ir a https://e2b.dev/dashboard/sign-in — registrarse con GitHub OAuth (recomendado, alinea con la identidad de los repos de Luis).
2. Configurar billing en https://e2b.dev/dashboard/billing — free tier de 100 horas de sandbox/mes; suficiente para Fase 1. Cargar tarjeta si se espera superarlo.
3. Generar key en https://e2b.dev/dashboard/keys → "Create API Key" → nombrar `vforge-prod`. Copiar el `e2b_...`.
4. (Opcional) crear un template custom con dependencias precargadas (Node 22, pnpm, git, tsx) en https://e2b.dev/dashboard/templates. Para Fase 1 el template default `base` es suficiente; el custom acelera cold starts ~5s.
5. Agregar la key a `operator_secrets` como `E2B_API_KEY` (o a Vercel env vars encrypted, production + preview + development).

---

## Endpoints / SDK usados

E2B se consume vía SDK TypeScript oficial. No tocar la REST API directa salvo para diagnostics.

```ts
import { Sandbox } from "@e2b/code-interpreter";

const sbx = await Sandbox.create({
  apiKey: process.env.E2B_API_KEY,
  timeoutMs: 5 * 60 * 1000, // 5 min default; ampliar para builds largos
});

await sbx.files.write("/home/user/hello.ts", `console.log("hi");`);
const result = await sbx.commands.run("tsx /home/user/hello.ts");
console.log(result.stdout);

await sbx.kill();
```

Operaciones clave:

| Método | Para qué |
|---|---|
| `Sandbox.create()` | Spin up de un microVM |
| `sbx.files.write/read/list` | Filesystem ops dentro del VM |
| `sbx.commands.run()` | Ejecutar comandos shell |
| `sbx.uploadFile()` / `sbx.downloadFile()` | Transferir blobs grandes |
| `sbx.kill()` | Apagar el VM (libera billing) |

---

## Runbook (cuando ejecutemos M5)

1. Verificar `E2B_API_KEY` vía `getOperatorSecret("E2B_API_KEY", { auditUserId: ctx.userId })`. Si falta, abortar M5 con mensaje al operador.
2. Crear `lib/forge/adapters/e2b-sandbox.ts` implementando el contract de `lib/forge/adapters/_contract.ts`. Capacidades: `["sandbox", "code-exec", "fs-write"]`. Anillo 1.
3. Crear `lib/forge/adapters/claude-code-sdk.ts` que internamente recibe un sandbox de E2B como dependencia inyectada. La pareja es indivisible: code-exec sin sandbox = RCE.
4. Agregar helper `spawnSandboxForRun(runId, repoUrl)` que clona el repo dentro del VM con un PAT de scope mínimo (read-only para el repo target + write para el branch claude/*).
5. Wire `sbx.kill()` al `signal: AbortSignal` del contract — si el usuario cancela el run, el sandbox muere y se deja de cobrar.
6. Test mínimo en `__tests__/e2b-sandbox.test.ts`: happy path (crear sandbox, escribir archivo, leerlo, matarlo) + missing-key + timeout.
7. Update a `lib/forge/system-prompt.ts`: V debe saber que **todo `code_exec` corre en un VM efímero**, que el filesystem se borra al final del run salvo que se haga commit/push explícito, y que la red outbound está restringida a allowlist (npm registry, github, vercel, neon).

---

## Caveats / notas operativas

- **Cold start ~2-5s** con template base; ~500ms con template custom precargado. Vale la pena el template custom desde M5.
- **Timeout default 5 min.** Builds largos (Next.js producción) pueden tardar más; subir `timeoutMs` por request o enqueuar en Trigger.dev (M9) si excede.
- **Free tier:** 100 horas/mes de sandbox. Cada `Sandbox.create()` que no se mate sigue contando hasta el timeout. **Siempre llamar `sbx.kill()` en `finally`**.
- **Red outbound:** por default abierta. Restringir vía template config si se necesita aislamiento más estricto (Fase 2 multi-tenant).
- **Rotación de key:** dashboard `/keys` → revoke + create. Sandboxes activos con la key vieja siguen vivos hasta su timeout.
- **Vendor alternatives:** Modal, Daytona, GitHub Codespaces API. Migrar implica reescribir el adapter — pero Claude Code SDK es agnóstico al sandbox subyacente.

---

## Estado de env vars en Vercel

```
E2B_API_KEY    encrypted    PENDIENTE — agregar antes de M5
```

---

## Referencias

- Docs: https://e2b.dev/docs
- SDK: https://github.com/e2b-dev/E2B
- Dashboard: https://e2b.dev/dashboard
