/**
 * Tenants + Esferas. Cada usuario Clerk del portal = un tenant con su propio
 * DEK envuelto. Al crear el tenant se le crea su Esfera en estado 'forging'.
 */
import { csql, ensureControlSchema } from "./db";
import { generateWrappedDek } from "./envelope";
import { toBuf } from "./bytes";

export interface Tenant {
  id: string;
  clerk_user_id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
}

export interface Sphere {
  id: string;
  tenant_id: string;
  name: string;
  status: "forging" | "active" | "degraded";
  activated_at: string | null;
}

export interface TenantContext {
  tenant: Tenant;
  sphere: Sphere;
}

/** DEK envuelto del tenant (los 3 buffers de tenants.dek_*). */
export interface WrappedDekRow {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Garantiza tenant + esfera para un usuario Clerk. Idempotente: si ya existen,
 * los devuelve; si no, crea el tenant (con DEK envuelto nuevo) y su esfera.
 */
export async function ensureTenantContext(
  clerkUserId: string,
  email: string | null,
  displayName: string | null,
): Promise<TenantContext> {
  await ensureControlSchema();

  const existing = (await csql`
    SELECT id, clerk_user_id, email, display_name, plan
    FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `) as Tenant[];

  let tenant: Tenant;
  if (existing.length > 0) {
    tenant = existing[0];
  } else {
    const { wrapped } = generateWrappedDek();
    const rows = (await csql`
      INSERT INTO tenants (clerk_user_id, email, display_name, dek_wrapped, dek_iv, dek_tag)
      VALUES (${clerkUserId}, ${email}, ${displayName}, ${wrapped.ciphertext}, ${wrapped.iv}, ${wrapped.authTag})
      ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = now()
      RETURNING id, clerk_user_id, email, display_name, plan
    `) as Tenant[];
    tenant = rows[0];
  }

  const spheres = (await csql`
    SELECT id, tenant_id, name, status, activated_at
    FROM spheres WHERE tenant_id = ${tenant.id}
    ORDER BY created_at ASC LIMIT 1
  `) as Sphere[];

  let sphere: Sphere;
  if (spheres.length > 0) {
    sphere = spheres[0];
  } else {
    const rows = (await csql`
      INSERT INTO spheres (tenant_id) VALUES (${tenant.id})
      RETURNING id, tenant_id, name, status, activated_at
    `) as Sphere[];
    sphere = rows[0];
  }

  return { tenant, sphere };
}

/** Lee el DEK envuelto del tenant para descifrar sus credenciales. */
export async function getWrappedDek(tenantId: string): Promise<WrappedDekRow | null> {
  const rows = (await csql`
    SELECT dek_wrapped, dek_iv, dek_tag FROM tenants WHERE id = ${tenantId} LIMIT 1
  `) as Array<{ dek_wrapped: unknown; dek_iv: unknown; dek_tag: unknown }>;
  if (rows.length === 0) return null;
  return {
    ciphertext: toBuf(rows[0].dek_wrapped),
    iv: toBuf(rows[0].dek_iv),
    authTag: toBuf(rows[0].dek_tag),
  };
}

/** Cambia el estado de la esfera (forging | active | degraded). */
export async function setSphereStatus(
  tenantId: string,
  sphereId: string,
  status: Sphere["status"],
): Promise<void> {
  const activated = status === "active" ? "now()" : null;
  if (status === "active") {
    await csql`
      UPDATE spheres SET status = ${status}, activated_at = COALESCE(activated_at, now()), updated_at = now()
      WHERE id = ${sphereId} AND tenant_id = ${tenantId}
    `;
  } else {
    await csql`
      UPDATE spheres SET status = ${status}, updated_at = now()
      WHERE id = ${sphereId} AND tenant_id = ${tenantId}
    `;
    void activated;
  }
}
