/**
 * El Baúl: credenciales por tenant, cifradas con el DEK del tenant (envelope).
 * Nunca se devuelve el secreto en claro al cliente ni se escribe en logs.
 */
import { csql, withTenant } from "./db";
import { encryptWithDek, decryptWithDek, unwrapDek } from "./envelope";
import { getWrappedDek } from "./tenants";
import { toBuf } from "./bytes";

export type Service = "github" | "vercel" | "neon";
export const SERVICES: Service[] = ["github", "vercel", "neon"];

export interface ConnectionView {
  service: Service;
  status: "unverified" | "verified" | "error" | "missing";
  identity: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
}

/** Guarda (o reemplaza) una credencial cifrada y su estado de verificación. */
export async function putCredential(
  tenantId: string,
  sphereId: string,
  service: Service,
  plaintext: string,
  identity: string | null,
  status: "verified" | "error",
  lastError: string | null,
): Promise<void> {
  const wrapped = await getWrappedDek(tenantId);
  if (!wrapped) throw new Error("tenant sin DEK");
  const dek = unwrapDek(wrapped);
  const sealed = encryptWithDek(dek, plaintext);
  dek.fill(0); // borra el DEK de memoria tras usarlo

  // sphere_credentials tiene FORCE RLS → upsert dentro de withTenant.
  await withTenant(tenantId, [
    csql`
      INSERT INTO sphere_credentials
        (tenant_id, sphere_id, service, ciphertext, iv, auth_tag, identity, status, last_verified_at, last_error)
      VALUES
        (${tenantId}, ${sphereId}, ${service}, ${sealed.ciphertext}, ${sealed.iv}, ${sealed.authTag},
         ${identity}, ${status}, ${status === "verified" ? new Date().toISOString() : null}, ${lastError})
      ON CONFLICT (tenant_id, service) DO UPDATE SET
        sphere_id        = EXCLUDED.sphere_id,
        ciphertext       = EXCLUDED.ciphertext,
        iv               = EXCLUDED.iv,
        auth_tag         = EXCLUDED.auth_tag,
        identity         = EXCLUDED.identity,
        status           = EXCLUDED.status,
        last_verified_at = EXCLUDED.last_verified_at,
        last_error       = EXCLUDED.last_error,
        updated_at       = now()
    `,
  ]);
}

/** Descifra y devuelve el secreto en claro (solo para uso server-side, p.ej. re-ping). */
export async function getCredentialSecret(
  tenantId: string,
  service: Service,
): Promise<string | null> {
  const [rows] = (await withTenant(tenantId, [
    csql`
      SELECT ciphertext, iv, auth_tag FROM sphere_credentials
      WHERE tenant_id = ${tenantId} AND service = ${service} LIMIT 1
    `,
  ])) as [Array<{ ciphertext: unknown; iv: unknown; auth_tag: unknown }>];
  if (rows.length === 0) return null;
  const wrapped = await getWrappedDek(tenantId);
  if (!wrapped) return null;
  const dek = unwrapDek(wrapped);
  try {
    return decryptWithDek(dek, {
      ciphertext: toBuf(rows[0].ciphertext),
      iv: toBuf(rows[0].iv),
      authTag: toBuf(rows[0].auth_tag),
    });
  } catch {
    return null;
  } finally {
    dek.fill(0);
  }
}

/** Vista de conexiones del tenant — SIN secretos, lista para la UI. */
export async function listConnections(tenantId: string): Promise<ConnectionView[]> {
  const [rows] = (await withTenant(tenantId, [
    csql`
      SELECT service, status, identity, last_verified_at, last_error
      FROM sphere_credentials WHERE tenant_id = ${tenantId}
    `,
  ])) as [Array<{
    service: Service;
    status: "unverified" | "verified" | "error";
    identity: string | null;
    last_verified_at: string | null;
    last_error: string | null;
  }>];
  const byService = new Map(rows.map((r) => [r.service, r]));
  return SERVICES.map((service) => {
    const r = byService.get(service);
    return {
      service,
      status: r ? r.status : "missing",
      identity: r?.identity ?? null,
      lastVerifiedAt: r?.last_verified_at ?? null,
      lastError: r?.last_error ?? null,
    };
  });
}
