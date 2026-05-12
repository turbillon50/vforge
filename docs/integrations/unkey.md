# Integración: Unkey (API keys per-tenant)

> *Entra en M15 (Fase 2). Reemplaza el `VFORGE_OPERATOR_TOKEN` actual (token único hardcodeado) con keys gestionadas, revocables, rate-limited, con analytics por tenant. ADR-009 lo eligió sobre implementación casera porque rebuilding key management es 1-2 sprints + mantenimiento perpetuo.*

---

## Resumen

- **Provider:** [Unkey](https://unkey.com) — API key management as a service
- **Rol en vForge:** API keys per-cliente cuando terceros usen vForge desde sus propias apps. Issuance, revocation, rotation, rate limiting, analytics y scoping a endpoints específicos.
- **Milestone:** M15 — Fase 2
- **Anillo:** 3 (emite y revoca credenciales reales con poder sobre el agente)
- **Adapter file (futuro):** `lib/forge/adapters/unkey-keys.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
UNKEY_ROOT_KEY    unkey_...   root key con permisos de admin, server-side encrypted
UNKEY_API_ID      api_...     ID del "API" en Unkey contra el que se emiten keys (plain)
```

Dos variables. Root key va encrypted con prioridad Class 1 (rotation periódica). API ID es plain.

---

## Cuenta y onboarding

1. Ir a https://app.unkey.com/auth/sign-up — sign up con GitHub OAuth.
2. Crear workspace (free tier por default). Nombrarlo `vforge`.
3. Crear un "API" desde dashboard → APIs → "Create new API" → nombrar `vforge-public`. Copiar el `api_...` ID.
4. Generar root key: dashboard → Settings → Root Keys → "Create Root Key" → permissions: `*` (full admin para Fase 2 inicial; restringir a `api.*.create_key`, `api.*.revoke_key`, `api.*.read_key` en hardening posterior). Copiar el `unkey_...`.
5. (Opcional) configurar rate limit defaults para todas las keys emitidas: dashboard → APIs → vforge-public → Settings → Rate Limit → `100 req/min` default. Sobreescribible por key.
6. Agregar `UNKEY_ROOT_KEY` (encrypted) y `UNKEY_API_ID` (plain) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Unkey tiene SDK TypeScript oficial. Dos operaciones principales: **issuance** (cuando un tenant se onboardea o pide key) y **verification** (en cada request entrante a la API pública de vForge).

```ts
import { Unkey, verifyKey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

// 1. Emitir key per-tenant
const { result } = await unkey.keys.create({
  apiId: process.env.UNKEY_API_ID!,
  prefix: "vfk", // vForge Key — visible en la key emitida
  ownerId: tenantId,
  meta: { tenantId, planId, createdAt: new Date().toISOString() },
  ratelimit: { type: "fast", limit: 1000, refillInterval: 60_000, refillRate: 100 },
  expires: null, // sin expiración por default; rotación manual
});
// result.key es lo que se devuelve UNA VEZ al cliente. Nunca se vuelve a mostrar.

// 2. Verificar key en cada request entrante
const { result: v } = await verifyKey({
  key: req.headers.get("authorization")?.replace("Bearer ", "") ?? "",
  apiId: process.env.UNKEY_API_ID!,
});
if (!v.valid) return new Response("unauthorized", { status: 401 });
const tenantId = v.ownerId;
```

Endpoints relevantes (bajo `https://api.unkey.dev/v1`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/keys.createKey` | POST | Emitir nueva key |
| `/keys.verifyKey` | POST | Verificar key entrante (también vía SDK helper) |
| `/keys.deleteKey` | POST | Revocar key (Anillo 3) |
| `/keys.updateKey` | POST | Actualizar rate limit, scopes, metadata |
| `/apis.listKeys` | GET | Listar keys de un API (paginado) |

---

## Runbook (cuando ejecutemos M15)

1. Verificar `UNKEY_ROOT_KEY` y `UNKEY_API_ID` vía `getOperatorSecret`. Si falta, abortar M15.
2. Crear `lib/forge/adapters/unkey-keys.ts` implementando el contract. Capacidades: `["key-issuance", "key-verification", "rate-limiting"]`. Anillo 3 default (issuance y revoke); verification es Anillo 0.
3. Métodos del adapter: `issueKey(tenantId, scopes, ratelimit?)`, `verifyKey(rawKey)`, `revokeKey(keyId)` (Anillo 3 — humano confirma).
4. Crear middleware `lib/api/auth.ts` que use `verifyKey` en cada request a `/api/public/*`. Cachear verificaciones positivas 60s en memoria para reducir round-trips.
5. Reemplazar `VFORGE_OPERATOR_TOKEN` check en endpoints existentes con el nuevo middleware. Migration path: aceptar ambos durante 1 semana, deprecar el viejo.
6. Agregar tools al cerebro en `lib/forge/tools.ts`: `apikey_issue(tenant_id, scopes)` y `apikey_revoke(key_id)`. Ambas Anillo 3.
7. UI: añadir sección "API Keys" en `/settings/tenant` que liste keys del tenant (sin mostrar el secret — solo prefix + last 4 chars + meta), permita revocar, y issue nuevas.
8. Test mínimo: emitir key, verificarla (200), revocarla, verificarla again (401).

---

## Caveats / notas operativas

- **La key se muestra UNA VEZ.** En `keys.createKey` el `result.key` solo viene en la respuesta de creación; después solo se puede ver el hash. Si el tenant la pierde, hay que emitir una nueva (no recover).
- **Free tier:** 150 monthly active keys, 2500 verifications/mes. Suficiente para Fase 2 con 50-150 tenants ligeros. Verificaciones se cobran por uso después.
- **Rate limit por key.** Configurar default conservador (100 req/min); escalable por plan via `keys.updateKey`. Para clientes enterprise, override individual.
- **Owner ID** debe mapear 1:1 a nuestro `tenants.id`. Sirve para listar keys de un tenant y para extraer tenantId desde `verifyKey`.
- **Meta payload** se puede usar para guardar `planId`, `createdBy`, `lastRotated`. Útil para analytics; no usar para secrets.
- **Rotación del root key:** dashboard `/settings/root-keys` → revoke + create. CRITICO: todas las keys emitidas siguen vivas (no dependen del root key específico); el root key solo controla quién puede emitir/revocar.
- **Vendor alternatives:** Clerk Machine Tokens (sin rate limiting ni analytics — ADR-009 lo descartó), implementación casera con Neon + bcrypt (1-2 sprints), AWS API Gateway keys (overkill). Migrar a Unkey alternativo implica reescribir el adapter; las keys mismas se rotan al migrar.

---

## Estado de env vars en Vercel

```
UNKEY_ROOT_KEY    encrypted    PENDIENTE — agregar antes de M15
UNKEY_API_ID      plain        PENDIENTE — agregar antes de M15
```

---

## Referencias

- Docs: https://www.unkey.com/docs
- SDK: https://github.com/unkeyed/unkey
- Dashboard: https://app.unkey.com
