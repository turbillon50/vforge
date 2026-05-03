# Integración: Neon (Postgres serverless)

> *Provisión y conexión de la base de datos vForge a Vercel. Runbook ejecutado por Claude Code (Fase 7 del playbook). El schema real se crea en M0 (Vault) y M9 (audit log) — esta integración solo establece conectividad y secrets.*

---

## Resumen

- **Provider:** [Neon](https://neon.tech) — Postgres serverless, escala a cero, branching gratis
- **Postgres version:** 17.8
- **Project:** `vforge` (`morning-lab-81926607`)
- **Org:** `org-super-wind-01105205` (Turbillon, plan free)
- **Region:** `aws-us-east-1`
- **Default branch:** `production` (`br-flat-rain-anarihi8`, no protegido aún)
- **Endpoint:** `ep-empty-frost-anstbj07` con pooler habilitado al host `-pooler` (pgbouncer)
- **Implementado en:** vForge MVP · 2026-05-02

---

## Inputs requeridos del operador

```
DATABASE_URL    connection string completa con sslmode=require
NEON_API_KEY    token "napi_..." de https://console.neon.tech/app/settings/api-keys
NEON_ORG_ID     "org-..." si la cuenta tiene organizaciones
```

> Nota: cuando una cuenta Neon tiene organizaciones, los endpoints de proyectos requieren `?org_id=...`. Cuentas personales puras lo omiten.

## Endpoints usados

### Neon API v2 (auth: `Authorization: Bearer <token>`)

| Endpoint | Método | Para qué |
|---|---|---|
| `/api/v2/users/me/organizations` | GET | Discover org_id |
| `/api/v2/projects?org_id={org}` | GET | Listar proyectos del org |
| `/api/v2/projects/{id}` | GET | Detalle del proyecto (region, pg_version, storage) |
| `/api/v2/projects/{id}/branches` | GET | Listar branches (default + PR-scoped) |
| `/api/v2/projects/{id}/endpoints` | GET | Listar endpoints (read_write, read_replica, etc.) |
| `/api/v2/projects/{id}/branches` | POST | Crear branch (uno por PR cuando llegue M9+) |

### Neon SQL HTTP API (alternativa al TCP 5432)

```
POST https://{endpoint}.{region}.aws.neon.tech/sql
Headers:
  Neon-Connection-String: <DATABASE_URL>
  Content-Type: application/json
Body:
  { "query": "SELECT $1::int", "params": [42] }
```

Útil cuando el entorno bloquea TCP outbound (sandboxes, edge runtimes con `@neondatabase/serverless`).

### Vercel API (auth: `Authorization: Bearer <token>`)

| Endpoint | Método | Para qué |
|---|---|---|
| `/v10/projects/{id}/env?teamId={team}` | POST | Crear env var (encrypted o plain) |
| `/v9/projects/{id}/env?teamId={team}` | GET | Listar env vars existentes |
| `/v9/projects/{id}/env/{envId}?teamId={team}` | PATCH | Actualizar valor o targets |

---

## Runbook ejecutado

### Paso 1 — Stash de credenciales

```bash
umask 077
cat > /tmp/.neon-env <<EOF
export DATABASE_URL='postgresql://...'
export NEON_API_KEY='napi_...'
export VERCEL_TOKEN='...'
export PROJECT_ID='prj_...'
export VERCEL_TEAM_ID='team_...'
EOF
chmod 600 /tmp/.neon-env
```

### Paso 2 — Discovery del org y proyecto

```bash
# org_id
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/users/me/organizations"

# proyectos del org
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects?org_id=org-super-wind-01105205"
```

Confirmar que el proyecto `vforge` existe y la región coincide con el host de la `DATABASE_URL`.

### Paso 3 — Verificar conectividad

**Opción A: psql (requiere TCP 5432 abierto)**

```bash
psql "$DATABASE_URL" -c "SELECT 1, current_database(), version();"
```

**Opción B: SQL over HTTPS (siempre funciona)**

```bash
ENDPOINT=$(echo "$DATABASE_URL" | sed -E 's|.*@([^/?]+).*|\1|' | sed 's/-pooler//')
curl -s -X POST "https://$ENDPOINT/sql" \
  -H "Neon-Connection-String: $DATABASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT 1 AS ok, version() AS v","params":[]}'
```

Esperar `{"rows":[{"ok":1,"v":"PostgreSQL 17.x ..."}]}`.

### Paso 4 — Configurar Vercel env vars

Cuatro variables, dos sensibles, dos plain:

```bash
# DATABASE_URL — encrypted, prod + preview + development
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
  -d '{"key":"DATABASE_URL","value":"...","type":"encrypted","target":["production","preview","development"]}'

# NEON_API_KEY — encrypted, prod + preview (development local del dev)
# NEON_ORG_ID — plain
# NEON_PROJECT_ID — plain
```

### Paso 5 — Trigger redeploy para que el env aplique

```bash
LATEST_SHA=$(git rev-parse main)
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments?teamId=$VERCEL_TEAM_ID&forceNew=1" \
  -d "{...gitSource: ref:main, sha:$LATEST_SHA, repoId:1227515177}"
```

### Paso 6 — Cleanup

```bash
rm -f /tmp/.neon-env
```

---

## Schema inicial: NO se crea en este paso

La integración solo establece conectividad y secrets. El schema real se crea en estos hitos:

| Hito | Tabla | Razón de esperar |
|---|---|---|
| **M0** | `users`, `secrets`, `projects` | Diseño dependiente del Vault encryption design |
| **M9** | `forge_runs`, `activity_events` | Diseño dependiente del adapter contract final |
| **M11** | `routing_decisions` | Diseño dependiente del clasificador entrenado |

Crear tablas antes de tener la spec completa lleva a migraciones destructivas. Mejor esperar.

---

## Branching estratégico (cuando arranquemos M0)

Neon permite **una branch por PR** sin costo extra (en plan Free hasta 10 branches concurrentes; ilimitado en Pro). Esto se cablea en CI:

```yaml
# .github/workflows/preview-db.yml (futuro)
on: pull_request
jobs:
  branch:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST -H "Authorization: Bearer $NEON_API_KEY" \
            "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
            -d '{"branch":{"name":"pr-${{ github.event.pull_request.number }}"}}'
      # Inject branch's connection string into the Vercel preview env
```

Resultado: cada PR tiene **su propia DB con copy-on-write del estado de production**. Cero contaminación de datos. Si el PR se cierra, la branch de Neon se destruye.

---

## Caveats observados

1. **`org_id` requerido.** Cuando la cuenta tiene organizaciones, los endpoints `/v2/projects` rechazan sin el parámetro. Discovery via `/v2/users/me/organizations` es obligatorio.
2. **TCP 5432 frecuentemente bloqueado.** Sandboxes (Docker default, GitHub Codespaces sin port forwarding, algunos CI) bloquean outbound 5432. La SQL HTTP API es el fallback universal.
3. **Pooler suffix.** El host `-pooler.{region}` usa pgbouncer; el host sin sufijo va directo. Pooler es preferido para serverless (Vercel functions, edge). Direct es preferido para migraciones largas.
4. **Storage size 0 al inicio.** Recién creado un proyecto, `synthetic_storage_size: 0`. Después de inserts queda en KB-MB.
5. **Default branch no protegido.** El branch `production` viene desprotegido; al ir a producción real, hacer `PATCH /branches/{id}` con `{"protected": true}` para evitar drops accidentales.

---

## Cuando Forge AI lo ejecute (M0+)

Adapter `lib/forge/adapters/neon.ts`:

```ts
type NeonAdapter = {
  provisionProject(input: { name: string; region: NeonRegion }): Promise<Project>;
  createBranch(input: { projectId: string; branchName: string }): Promise<Branch>;
  runMigration(input: { connectionString: string; sql: string }): Promise<void>;
  query<T>(input: { connectionString: string; sql: string; params: unknown[] }): Promise<T[]>;
};
```

Forge AI llama `runMigration` durante M0 con el SQL del Vault, durante M9 con el SQL del audit log, etc.

---

## Estado actual de env vars en Vercel

```
DATABASE_URL       encrypted   production + preview + development
NEON_API_KEY       encrypted   production + preview
NEON_ORG_ID        plain       production + preview
NEON_PROJECT_ID    plain       production + preview
NEXT_PUBLIC_SITE_URL  plain    production + preview     (https://vforge.site)
```

---

## Referencias

- Neon API docs: https://api-docs.neon.tech/reference
- Neon serverless driver: https://github.com/neondatabase/serverless
- SQL over HTTPS: https://neon.tech/docs/serverless/serverless-driver
- Neon branching: https://neon.tech/docs/introduction/branching
