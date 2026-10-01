# MCP maestro del protocolo Unicorn

Un solo MCP — el de VForge — expone el estado de los proyectos y un flujo de
eventos con cursor. Las demás apps del ecosistema (MindContext, Momentum,
Eternime, TRAMA) se conectan a él para **leer** lo que cambia y **publicar** sus
propios cambios. Si VForge publica "se agregó un feature" en el proyecto X,
Momentum lo ve en su siguiente polling.

Código: [`lib/mcp/unicorn.ts`](../lib/mcp/unicorn.ts) (lógica pura, base
inyectada) · registro en [`lib/mcp/registry.ts`](../lib/mcp/registry.ts) ·
política en [`lib/mcp/rbac.ts`](../lib/mcp/rbac.ts) · pruebas en
[`tests/unicorn-mcp.test.ts`](../tests/unicorn-mcp.test.ts) · tabla en
[`migrations/047_unicorn_eventos.sql`](../migrations/047_unicorn_eventos.sql).

## URL

| Endpoint | Uso |
|---|---|
| `POST https://vforge.site/api/mcp` | JSON-RPC 2.0 (MCP `2024-11-05`), Bearer obligatorio. Aquí viven las tools `unicorn_*`. |
| `POST https://vforge.site/api/mcp/public` | Siempre público: **nunca** expone `unicorn_*` (401). |

El origin sale de `MCP_PUBLIC_ORIGIN` → `NEXT_PUBLIC_APP_URL` → `https://vforge.site`.

## Acceso: sólo Owner

Las cinco tools están en `OPERATOR_TOOLS` (rbac.ts) ⇒ `canCallTool` sólo deja
pasar scope `admin` (el `mcp_tokens.scope` `admin` u `operator`).

| Principal | `tools/list` | `tools/call unicorn_*` |
|---|---|---|
| sin token en `/api/mcp` | — | 401 + `WWW-Authenticate` (discovery OAuth) |
| token inválido / caducado | — | 401 `invalid_token` |
| `public` / `/api/mcp/public` | no aparecen | 401 |
| `client` (cualquier usuario no owner) | no aparecen | 401 "requiere un token de Owner" |
| `admin` (owner) | aparecen | ✔ |

`runUnicornTool` vuelve a exigir `scope === "admin"` aunque el handler ya lo
filtró (defensa en profundidad). `tools/list` ahora anuncia exactamente lo que
`canCallTool` permite (`toolsVisibleFor`), así que un `client` ya no ve
anunciadas las tools de operador que de todos modos le rebotaban.

## Cómo sacar un token

El scope lo decide la identidad, no el que pide: si el usuario Clerk tiene un
email de owner (`lib/auth/owner.ts → isOwnerEmail`) el token sale `admin`;
cualquier otro sale `client` (y no podrá usar `unicorn_*`).

1. **Token manual (recomendado para apps servidor-a-servidor).** Con sesión de
   owner en VForge: `/app/settings` → generar token MCP, o directamente
   `POST /api/mcp/token` con la cookie de Clerk. Devuelve `vfmcp_…` **una sola
   vez**; no expira. Guárdalo como secreto de la app que lo use (env en Vercel,
   nunca en el repo).
2. **OAuth 2.1 (clientes MCP como Claude: "Add custom connector").** El 401
   apunta a `/.well-known/oauth-protected-resource`; el cliente descubre el AS,
   se registra (DCR en `/api/mcp/oauth/register`), pasa por
   `/api/mcp/oauth/authorize` (sesión Clerk + consentimiento) y canjea en
   `/api/mcp/oauth/token`. El access token es el mismo formato `vfmcp_`, con
   caducidad de 30 días y `refresh_token`. Scope OAuth `mcp:operator` = admin.

## Herramientas

Todas responden `result.content[0].text` con **JSON** (para que otra app lo
parsee). Los errores de parámetros vuelven con `isError: true` y el mensaje.

### `unicorn_estado` — sin parámetros
Total de proyectos, `en_produccion` (category `produccion`), `live`,
`con_error`, conteos por categoría/estado, `ultima_actualizacion`,
`publicados_unicorn_24h` (`null` si la tabla aún no existe: se declara el
hueco, no se pinta 0), el último evento y `cursor_actual` para empezar a hacer
polling.

### `unicorn_proyectos`
| Parámetro | Tipo | Nota |
|---|---|---|
| `categoria` | `produccion\|activo\|en_revision\|en_pausa\|archivo\|pendiente_borrado` | opcional |
| `estado` | `live\|building\|error\|idle\|unknown` | opcional |
| `q` | string | busca en `id` o `name` |
| `limit` | number | 1-300, default 100 |

Campos (columnas reales de `projects`, lista blanca): `id, name, description,
category, status, github_repo, github_url, github_default_branch, vercel_url,
domain, desktop_url, mobile_url, admin_url, client_name, progress_pct,
due_date, last_audit_score, last_audit_at, created_at, updated_at` + `repos`
(de `project_repositories`, o `github_repo` como respaldo). **Nunca** `org_id`
ni montos (`contract_amount`, `paid_amount`).

### `unicorn_expediente`
`proyecto` (requerido), `limit_eventos` (1-100, default 20). Devuelve el
proyecto, todos sus repos, un bloque `urls` y `ultimos_eventos` de todas las
fuentes filtrados por ese proyecto, con `cursor_eventos`.

### `unicorn_eventos` — el "tiempo real"
| Parámetro | Tipo | Nota |
|---|---|---|
| `cursor` | string | opaco, el que devolvió la llamada anterior |
| `desde` | fecha ISO 8601 | alternativa al cursor (no ambos) |
| `proyecto` | string | filtra por id de proyecto |
| `fuentes` | `["unicorn","auditoria","actividad","salud"]` | default todas |
| `limit` | number | 1-200, default 50 |

Fuentes que mezcla (todas existen hoy en el repo):

| Fuente | Tabla | Base | Qué es |
|---|---|---|---|
| `unicorn` | `unicorn_eventos` | `DATABASE_URL` | lo publicado con `unicorn_publicar_evento` |
| `auditoria` | `audit_events` | `DATABASE_URL` | lo que muestra `/app/activity` (acciones de V/operador) |
| `actividad` | `v_project_activity` | `DATABASE_URL` | bitácora de avance del portafolio |
| `salud` | `project_events` | `NERVOUS_DATABASE_URL` → `BRAIN_DATABASE_URL` → `DATABASE_URL` | `/api/webhooks/project-health` |

Semántica:
- **Sin cursor:** los `limit` más recientes, entregados en orden ascendente, y
  `cursor` = el más nuevo.
- **Con cursor:** sólo lo **posterior** al cursor, ascendente. Orden total
  `(ts, "fuente:id")` con microsegundos y `COLLATE "C"`, así que eventos con el
  mismo instante no se pierden ni se duplican. `hay_mas: true` ⇒ llama otra vez
  enseguida con el cursor nuevo. Sin novedades: `eventos: []` y el cursor no se mueve.
- Una fuente caída o sin base aparece en `fuentes_no_disponibles` (no tumba la respuesta).
- El detalle de eventos de credenciales (`secret|vault|token|password|credential|api_key`)
  se omite; detalles grandes se truncan a un preview.
- `siguiente_llamada` trae los `arguments` exactos para la próxima llamada.

### `unicorn_publicar_evento` (escribe)
| Parámetro | Tipo | Nota |
|---|---|---|
| `proyecto` | string | **debe existir** en `projects` (no se publican eventos huérfanos) |
| `tipo` | slug | `^[a-z0-9][a-z0-9_.:-]{0,59}$` — p. ej. `feature`, `valor`, `deploy`, `precio` |
| `titulo` | string | 1-200 |
| `detalle` | texto u objeto | ≤ 8000 caracteres serializado; un texto se guarda como `{ "texto": … }` |
| `origen` | slug | app que publica; default `vforge` |

`autor` = `clerk_user_id` del token (no se acepta por parámetro). Devuelve el
evento con su `cursor`.

## Ejemplos JSON-RPC

```bash
URL=https://vforge.site/api/mcp
TOKEN=vfmcp_...   # token de owner, desde el gestor de secretos

# handshake
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# resumen + cursor para empezar
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"unicorn_estado","arguments":{}}}'

# proyectos en producción
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"unicorn_proyectos","arguments":{"categoria":"produccion"}}}'

# expediente
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"unicorn_expediente","arguments":{"proyecto":"vforge"}}}'

# publicar un cambio (VForge → resto del ecosistema)
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"unicorn_publicar_evento","arguments":{"proyecto":"vforge","tipo":"feature","titulo":"Nuevo tablero de proyectos","detalle":{"ruta":"/app/projects"},"origen":"vforge"}}}'

# polling: siempre con el último cursor recibido
curl -s $URL -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"unicorn_eventos","arguments":{"cursor":"<cursor>","limit":100}}}'
```

Respuesta típica de `unicorn_eventos` (dentro de `result.content[0].text`):

```json
{
  "eventos": [
    { "fuente": "unicorn", "id": "42", "proyecto": "vforge", "tipo": "feature",
      "titulo": "Nuevo tablero de proyectos", "detalle": { "ruta": "/app/projects" },
      "origen": "vforge", "severidad": null, "ts": "2026-09-30T18:04:11.123456Z",
      "cursor": "eyJ0Ijoi..." }
  ],
  "cursor": "eyJ0Ijoi...",
  "hay_mas": false,
  "fuentes_leidas": ["actividad", "auditoria", "salud", "unicorn"],
  "fuentes_no_disponibles": [],
  "siguiente_llamada": { "name": "unicorn_eventos", "arguments": { "cursor": "eyJ0Ijoi..." } }
}
```

## Tiempo real: polling, no SSE (todavía)

El handler actual (`lib/mcp/handler.ts`) es JSON-RPC sobre HTTP POST que
responde `application/json`; declara `capabilities: { tools: {} }`, no soporta
`resources/subscribe`, notificaciones ni stream SSE, y el `GET /api/mcp` sólo
devuelve un JSON de descubrimiento. Por eso **no hay suscripción push**: el
tiempo real es polling con cursor.

Patrón recomendado para cada app:
1. Al arrancar: `unicorn_estado` → guardar `eventos.cursor_actual` (persistido, p. ej. en su Neon).
2. Cada 15-60 s (cron de Vercel o worker): `unicorn_eventos { cursor }`.
3. Aplicar los eventos, guardar el `cursor` nuevo; si `hay_mas`, repetir de inmediato.
4. Idempotencia: usar `fuente + id` como llave al aplicar un evento.

Para push real habría que agregar al handler el transporte Streamable HTTP con
SSE (respuesta `text/event-stream` en `GET /api/mcp` + `notifications/*`) o un
webhook saliente al publicar; queda fuera de esta versión.

## Qué falta para conectar cada app

Nada de esto existe aún en este repo; lo que sí existe se cita.

| App | Qué hay hoy en el repo | Qué falta |
|---|---|---|
| **MindContext** | Login OAuth VForge→MindContext (`/api/auth/mindcontext/*`, base `MINDCONTEXT_BASE` o `https://mindcontextia.one`) y el adaptador del mesh (`lib/forge/adapters/mesh.ts`). Ninguno usa el MCP. | En el repo de MindContext: un cliente MCP (JSON-RPC por `fetch`) con token owner `vfmcp_` en su env, el loop de polling del cursor y, si debe escribir, llamadas a `unicorn_publicar_evento` con `origen: "mindcontext"`. |
| **Momentum** | Sólo aparece como proyecto sembrado (`migrations/002_seed.sql`: `vmomentum`, `vmomentum_backend`); el seed no garantiza la URL vigente. | Confirmar su `projects.id` real con `unicorn_proyectos { q: "momentum" }`; en su repo: token owner en env, polling y render de los eventos ("si cambia un valor en VForge se ve en Momentum"). |
| **Eternime** | Nada en este repo. | Registrarlo en `projects` (si no está) para poder publicar eventos con su id; cliente MCP + token + polling en su repo. |
| **TRAMA** | Nada en este repo. | Igual que Eternime: alta en `projects`, cliente MCP + token + polling. |

Pendientes transversales:
- **Tokens por app**: hoy un token owner da acceso total (incluye `vulcano_brain_exec`, SQL, deploy). Lo correcto es un scope nuevo `unicorn` (solo `unicorn_*`) emitido por app; requiere tocar `mcp_tokens.scope`, `resolveMcpToken` y `canCallTool`.
- **Push** (SSE/notificaciones o webhook al publicar), ver arriba.
- **Publicación automática desde VForge**: hoy los eventos `unicorn` sólo entran por la tool; falta llamar a la misma inserción cuando VForge cambia un proyecto (p. ej. en `vulcano_update_project` o en los endpoints de `projects`).
- Aplicar `migrations/047_unicorn_eventos.sql` en Neon (también la crea el auto-heal en el primer request y la tool al publicar).
