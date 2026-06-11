/**
 * Conexión al PLANO DE CONTROL de VForge Esferas.
 *
 * DB SEPARADA del Brain personal y de la DB de la app: usa
 * CONTROL_PLANE_DATABASE_URL. Solo si esa env no existe cae a DATABASE_URL
 * (para no romper build/dev). En producción multi-tenant SIEMPRE usar la
 * separada — idealmente con un rol NO-owner para que RLS muerda (ver 017).
 *
 * Lazy-init: nunca conecta en build-time.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
let _migrated = false;

export function controlUrl(): string | null {
  return (
    process.env.CONTROL_PLANE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null
  );
}

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = controlUrl();
  if (!url) throw new Error("CONTROL_PLANE_DATABASE_URL / DATABASE_URL no configurada");
  _sql = neon(url);
  return _sql;
}

/** Tagged-template SQL del plano de control. Solo en request-time. */
export const csql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSql() as any)(...args);
    },
    get(_t, prop: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSql() as any)[prop];
    },
  },
);

/**
 * Aplica la migración 017 de forma idempotente (CREATE ... IF NOT EXISTS).
 * Se dispara una vez por proceso, perezosa, desde los handlers de /api/forja
 * y /api/esfera. Tolerante: si falla, lo registra y deja que la query real
 * arroje el error claro.
 */
export async function ensureControlSchema(): Promise<void> {
  if (_migrated) return;
  _migrated = true;
  const s = getSql();
  try {
    await s`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await s`
      CREATE TABLE IF NOT EXISTS tenants (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id text UNIQUE NOT NULL,
        email         text,
        display_name  text,
        dek_wrapped   bytea NOT NULL,
        dek_iv        bytea NOT NULL,
        dek_tag       bytea NOT NULL,
        plan          text  NOT NULL DEFAULT 'forja_libre',
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )`;
    await s`
      CREATE TABLE IF NOT EXISTS spheres (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name         text NOT NULL DEFAULT 'Mi Esfera',
        status       text NOT NULL DEFAULT 'forging',
        activated_at timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )`;
    await s`CREATE INDEX IF NOT EXISTS idx_spheres_tenant ON spheres(tenant_id)`;
    await s`
      CREATE TABLE IF NOT EXISTS sphere_credentials (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sphere_id        uuid NOT NULL REFERENCES spheres(id) ON DELETE CASCADE,
        service          text NOT NULL,
        ciphertext       bytea NOT NULL,
        iv               bytea NOT NULL,
        auth_tag         bytea NOT NULL,
        identity         text,
        status           text NOT NULL DEFAULT 'unverified',
        last_verified_at timestamptz,
        last_error       text,
        created_at       timestamptz NOT NULL DEFAULT now(),
        updated_at       timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, service)
      )`;
    await s`CREATE INDEX IF NOT EXISTS idx_cred_tenant ON sphere_credentials(tenant_id)`;
    await s`
      CREATE TABLE IF NOT EXISTS jobs (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sphere_id       uuid REFERENCES spheres(id) ON DELETE CASCADE,
        kind            text NOT NULL,
        status          text NOT NULL DEFAULT 'queued',
        priority        int  NOT NULL DEFAULT 100,
        idempotency_key text,
        metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, idempotency_key)
      )`;
    await s`CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id)`;
    await s`
      CREATE TABLE IF NOT EXISTS events (
        id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sphere_id   uuid REFERENCES spheres(id) ON DELETE CASCADE,
        kind        text NOT NULL,
        service     text,
        level       text NOT NULL DEFAULT 'info',
        message     text,
        metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at  timestamptz NOT NULL DEFAULT now()
      )`;
    await s`CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id, created_at DESC)`;

    // ── Row Level Security: ENCENDERLA en runtime, no solo en el .sql ─────────
    // Las tablas de DATOS por-tenant usan FORCE → RLS "muerde" incluso para el
    // OWNER de la conexión (el rol por defecto de Neon). Así el aislamiento no
    // depende de crear un rol no-owner aparte. `tenants` solo ENABLE: su INSERT
    // de provisioning ocurre antes de que exista un tenant_id (bootstrap
    // privilegiado por el owner); las lecturas van siempre por id de la sesión.
    await s`ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY`;
    await s`ALTER TABLE spheres            ENABLE ROW LEVEL SECURITY`;
    await s`ALTER TABLE spheres            FORCE  ROW LEVEL SECURITY`;
    await s`ALTER TABLE sphere_credentials ENABLE ROW LEVEL SECURITY`;
    await s`ALTER TABLE sphere_credentials FORCE  ROW LEVEL SECURITY`;
    await s`ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY`;
    await s`ALTER TABLE jobs               FORCE  ROW LEVEL SECURITY`;
    await s`ALTER TABLE events             ENABLE ROW LEVEL SECURITY`;
    await s`ALTER TABLE events             FORCE  ROW LEVEL SECURITY`;
    await s`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenant_isolation') THEN
          CREATE POLICY tenant_isolation ON tenants
            USING (id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (id = current_setting('app.current_tenant', true)::uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spheres' AND policyname='tenant_isolation') THEN
          CREATE POLICY tenant_isolation ON spheres
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sphere_credentials' AND policyname='tenant_isolation') THEN
          CREATE POLICY tenant_isolation ON sphere_credentials
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jobs' AND policyname='tenant_isolation') THEN
          CREATE POLICY tenant_isolation ON jobs
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='tenant_isolation') THEN
          CREATE POLICY tenant_isolation ON events
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
        END IF;
      END$$`;
  } catch (e) {
    _migrated = false; // permite reintento en la próxima request
    console.error("[control-plane] ensureControlSchema falló:", redactErr(e));
  }
}

/**
 * Ejecuta queries DENTRO de una transacción con la GUC `app.current_tenant`
 * fijada transaction-local (`set_config(..., true)`). Es la ÚNICA forma de que
 * RLS muerda con el driver HTTP stateless de Neon: el `set_config` y las queries
 * viajan en UN solo request/transacción (BEGIN…COMMIT), así la GUC aplica a
 * todas. Sin esto, cada query es su propia conexión y la GUC se perdería.
 *
 * Las `queries` se construyen con `csql` (mismo instance vía el Proxy) y se
 * pasan SIN await — `transaction()` las orquesta. Devuelve solo los resultados
 * de `queries` (descarta el del set_config).
 */
export async function withTenant(
  tenantId: string,
  queries: unknown[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const s = getSql();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await (s as any).transaction([
    s`SELECT set_config('app.current_tenant', ${tenantId}, true)`,
    ...queries,
  ]);
  return all.slice(1);
}

/** Mensaje de error sin secretos (defensivo). */
export function redactErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/(gh[pousr]_[A-Za-z0-9]+|sk-[A-Za-z0-9-]+|napi_[A-Za-z0-9]+|postgres(ql)?:\/\/[^\s]+)/g, "«redacted»");
}
