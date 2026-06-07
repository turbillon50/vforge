# MCP RBAC + Multi-tenant (`/api/mcp`)

El MCP server de VForge es público pero seguro: multi-tenant con RBAC por token.
La política vive en un solo lugar — [`lib/mcp/rbac.ts`](../lib/mcp/rbac.ts) — y
tanto `/api/mcp` como `/api/mcp/public` la importan, así el gate no puede divergir.

## Scopes (`mcp_tokens.scope`)

| Scope    | Ve                                   | org_id |
|----------|--------------------------------------|--------|
| `admin`  | TODO (operador, Luis)                | `NULL` → filtro deshabilitado |
| `client` | SOLO filas con `org_id` = el suyo    | su forge (Clerk user_id) |
| `public` | nada privado · 401 en tools de datos | `NULL` |

La **ausencia de token** equivale a `public`. Un token presentado pero inválido → **401 duro**.

`mcp_tokens`: `token_hash` (sha256), `clerk_user_id`, `scope`, `org_id`, `label`, timestamps.

## Tools

**Públicas** (sin datos privados; cualquier scope, incluso sin auth):
`getting_started`, `vforge_method`, `help`.

**De datos** (exigen `admin|client`; aisladas por tenant):
`vforge_project_status`, `vforge_payments`, `vforge_apps_health`,
`vforge_brain_search`, `vforge_skill_list`, `vforge_integration_plan`,
`vforge_recommend_stack`, `vforge_create_repo`, `vforge_deploy`,
`vforge_scaffold_project`, `vforge_execute_skill`.

Cualquier tool no clasificada es **fail-closed**: se trata como `data` (auth requerida).

## Aislamiento real

- El filtro `org_id` se aplica en **SQL** (`WHERE org_id = $1`), nunca trayendo filas
  de otro tenant para filtrarlas en memoria.
- `org_id IS NULL` = operator-only: el `admin` lo ve, el `client` nunca (su `org_id`
  jamás iguala `NULL`).
- `vforge_brain_search` para `client`: SOLO `kind` público (method/runbook/example/adr),
  nunca `operator_profile`, nunca títulos con credencial/secret/token/password/api key,
  y **sin** recall semántico (que cruza conversaciones de otros tenants).

## Endpoints

| Endpoint              | Auth                    | Expone |
|-----------------------|-------------------------|--------|
| `POST /api/mcp`       | Bearer opcional         | público sin token; datos con token `admin\|client` |
| `POST /api/mcp/public`| ninguna (siempre público) | sólo las 3 tools públicas; 401 en datos aun con token admin |
| `POST /api/mcp/token` | Clerk                   | emite token: owner → `admin`, resto → `client` |

## Verificación (curl)

```
# pública sin token → 200
curl -s -XPOST $URL/api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getting_started","arguments":{}}}'
# datos sin token → 401
curl -s -XPOST $URL/api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"vforge_project_status","arguments":{}}}'
# client → solo su org
curl -s -XPOST $URL/api/mcp -H "Authorization: Bearer $CLIENT" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"vforge_project_status","arguments":{}}}'
```

El modelo también queda documentado en `brain_files name=v-mcp-rbac`.
