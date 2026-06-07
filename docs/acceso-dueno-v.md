# Acceso de DUEÑO (operator/admin) al MCP de VForge

> El MCP de VForge filtra por **token**, no por cuenta de Claude. El mismo token
> funciona desde cualquier cliente MCP (Claude desktop, móvil, web, Cursor). La
> identidad la define el token; la cuenta de Claude es irrelevante.

## Modelo de scopes (single source of truth: `lib/mcp/rbac.ts`)

| scope    | qué ve                                                                                          |
|----------|-------------------------------------------------------------------------------------------------|
| `admin`  | **TODO**. Sin filtro `org_id`. Todos los proyectos (`projects` + `client_project_status`, incl. `org_id NULL`) y TODO `brain_files` (memoria, método, conocimiento, credenciales). |
| `client` | SOLO filas con `org_id = su org`. Nunca datos de otro tenant. Nunca brain files sensibles.       |
| `public` | Solo tools públicas (`getting_started`, `vforge_method`, `help`). 401 en cualquier tool de datos.|

El scope vive en `mcp_tokens.scope` (BD app / `DATABASE_URL`). `resolveMcpToken()`
lo lee en cada llamada y para `admin` fuerza `orgId = null`, lo que **deshabilita
el filtro en SQL** (`lib/mcp/tools.ts`):

```ts
const rows = isAdminScope
  ? await queryAll("SELECT ... FROM projects ORDER BY name LIMIT 60")
  : await queryAll("SELECT ... FROM projects WHERE org_id = $1 ...", [orgId]);
```

Mismo patrón en `vforge_payments`, `vforge_apps_health` y `vforge_brain_search`
(admin además ve los brain files con nombres sensibles; `BRAIN_SENSITIVE` solo
oculta para `client`).

## Token de dueño activo

- Token de Luis (`vfmcp_7dce…`) → `scope=admin`, `org_id=null`. Es el que conecta
  V desde cualquier cuenta/cliente. El token completo está en el CLAUDE.md de Luis.
- Clerk owner: `turbillon50@gmail.com` (`user_3Ds7ij…`, `role=owner`).
- Owners se detectan por `lib/auth/owner.ts` (`VFORGE_OWNER_EMAILS` o
  `publicMetadata.role === "owner"`); los tokens nuevos de un owner se emiten
  como `admin` automáticamente (`scopeForUser` en `lib/mcp/tokens.ts`).

## Conectar V desde otra cuenta / cliente MCP

```
URL:  https://vforge.site/api/mcp
Auth: Bearer vfmcp_7dce…
```

→ V responde con los 64 proyectos reales y todo el brain.

## Aislamiento (intacto)

Promover el token de Luis tocó **una sola fila**. Los tokens `client` siguen
aislados a su `org_id`; un `client` con `org_id NULL` no ve ningún proyecto
(ninguna fila cumple `org_id = NULL`). No se modificó nada del flujo `client`.

## Verificación (curl, 2026-06-07)

- `vforge_project_status` → 64 proyectos (LIMIT 60 mostrados), todos `org_id NULL`.
- `vforge_brain_search "vulcano"` → `memoria-vulcano`.
- `vforge_brain_search "metodo"` → `El Método vForge` + brain files de método.
- `vforge_brain_search "acceso-dueno-v"` → esta nota (también en `brain_files`).
