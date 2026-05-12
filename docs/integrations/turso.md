# Integración: Turso (SQLite distribuido edge per-tenant)

> *Entra en M12 (Fase 2). Complementa a Neon, no lo reemplaza: Neon sigue siendo source of truth central; Turso entra para session state per-tenant, telemetría de routing baja latencia, y eventualmente "vForge gestiona la DB que la app del cliente usa" (un Turso DB libre por cada app que Forge AI deploye).*

---

## Resumen

- **Provider:** [Turso](https://turso.tech) — SQLite distribuido sobre libSQL, edge replicas globales
- **Rol en vForge:** SQLite distribuido edge per-tenant para session caches, telemetría de routing, y future per-tenant local DBs cuando vForge sirva apps de clientes. No reemplaza Neon — convive con él (ADR-009).
- **Milestone:** M12 — Fase 2
- **Anillo:** 1 (read/write a DBs aisladas per-tenant; no acción destructiva cross-tenant sin escalation)
- **Adapter file (futuro):** `lib/forge/adapters/turso-edge.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
TURSO_AUTH_TOKEN    eyJ...        token de admin de la org (server-side encrypted)
TURSO_ORG_SLUG      vforge        slug de la organización en Turso (plain)
```

Dos variables. El token de admin permite crear DBs nuevas per-tenant via API; los tokens per-DB se generan dinámicamente por el adapter al provisionar cada DB.

---

## Cuenta y onboarding

1. Ir a https://turso.tech — sign up con GitHub OAuth (recomendado).
2. Instalar Turso CLI local: `curl -sSfL https://get.tur.so/install.sh | bash` (opcional, útil para debugging; no requerido en runtime).
3. Crear organización con slug `vforge` desde https://app.turso.tech/account → "Create Organization". Si ya existe una personal con el username, usar esa y nombrar el slug `vforge` después en settings.
4. Generar group/region default desde https://app.turso.tech/{org}/groups → "Create Group" → nombrar `default`, region: configurable, ver docs para la región más cercana a CDMX (probablemente `iad` o `lax`).
5. Generar admin token en https://app.turso.tech/{org}/settings → "API Tokens" → "Create Token" → scope full-access. Copiar el `eyJ...` (JWT).
6. Agregar `TURSO_AUTH_TOKEN` (encrypted) y `TURSO_ORG_SLUG` (plain, valor `vforge`) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Turso tiene dos APIs separadas: **Platform API** (CRUD de DBs) y **libSQL client** (queries dentro de una DB). El adapter usa ambas.

```ts
// Platform API — crear DB per-tenant (admin only)
const res = await fetch(
  `https://api.turso.tech/v1/organizations/${process.env.TURSO_ORG_SLUG}/databases`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `tenant-${tenantId}`,
      group: "default",
    }),
  },
);
const { database } = await res.json();

// libSQL client — queries dentro de la DB
import { createClient } from "@libsql/client";

const db = createClient({
  url: `libsql://${database.Hostname}`,
  authToken: tenantToken, // generado por separado via /databases/{name}/auth/tokens
});

await db.execute({
  sql: "INSERT INTO sessions (id, project_id, state) VALUES (?, ?, ?)",
  args: [sessionId, projectId, JSON.stringify(state)],
});
```

Endpoints Platform API (bajo `https://api.turso.tech/v1`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/organizations/{org}/databases` | POST/GET | Crear/listar DBs |
| `/organizations/{org}/databases/{name}` | DELETE | Borrar DB (Anillo 3) |
| `/organizations/{org}/databases/{name}/auth/tokens` | POST | Generar token per-DB |
| `/organizations/{org}/groups` | GET | Listar regiones/grupos |

---

## Runbook (cuando ejecutemos M12)

1. Verificar `TURSO_AUTH_TOKEN` y `TURSO_ORG_SLUG` vía `getOperatorSecret`. Si falta, abortar M12.
2. Crear `lib/forge/adapters/turso-edge.ts` implementando el contract. Capacidades: `["edge-db", "kv", "sql"]`. Anillo 1 para queries; Anillo 3 para `dropDatabase`.
3. Métodos del adapter: `provisionTenantDb(tenantId)`, `getClient(tenantId)`, `dropDatabase(tenantId)` (último requiere confirmación humana).
4. Cachear el `@libsql/client` por tenantId en memoria del proceso para evitar handshake repetido.
5. Agregar tool al cerebro en `lib/forge/tools.ts`: `edge_db_create(tenant_id)` (Anillo 2 — provisión real). Queries internas no son tools, son helpers.
6. Migration runner: cada DB per-tenant arranca con un schema base (`sessions`, `routing_log`, `embeddings_cache`). Definir en `lib/turso/schema.sql` y aplicar en `provisionTenantDb` antes de devolver.
7. Test mínimo: provisionar una DB sandbox, escribir/leer una row, dropearla.

---

## Caveats / notas operativas

- **Free tier:** 500 DBs, 9 GB total storage, 1B row-reads/mes. Suficiente para Fase 2 con 50-100 tenants activos.
- **Cold start de DB nueva:** ~1-2s la primera vez. Despreciable para nuestro caso (provisión es one-time per tenant).
- **Region:** configurable por grupo. Crear el grupo `default` en la región más cercana al edge donde corren las Vercel functions del cliente. Para CDMX probablemente `iad` (us-east-1) o `lax`. Ver docs para detalles.
- **Token per-DB scoping:** cada tenant debe recibir solo el token de SU DB, jamás el admin token. El adapter genera el token en `provisionTenantDb` y lo guarda encrypted en `operator_secrets` con key `TURSO_TOKEN_TENANT_{id}`.
- **Rotación del admin token:** dashboard `/settings` → revoke + create new. Los tokens per-DB son independientes y siguen vivos.
- **Vendor alternatives:** Cloudflare D1, Neon (con schema per-tenant), Litestream propio. Migrar implica reescribir el adapter; el SQL en sí es portable.

---

## Estado de env vars en Vercel

```
TURSO_AUTH_TOKEN    encrypted    PENDIENTE — agregar antes de M12
TURSO_ORG_SLUG      plain        PENDIENTE — agregar antes de M12 (valor: vforge)
```

---

## Referencias

- Docs: https://docs.turso.tech
- libSQL client: https://github.com/tursodatabase/libsql-client-ts
- Platform API: https://docs.turso.tech/api-reference/introduction
- Dashboard: https://app.turso.tech
