/**
 * Eventos de observabilidad por tenant. NUNCA registrar secretos: message y
 * metadata son seguros para mostrar en el dashboard del cliente.
 */
import { csql, withTenant } from "./db";
import type { Service } from "./credentials";

export async function recordEvent(
  tenantId: string,
  sphereId: string | null,
  kind: string,
  opts: {
    service?: Service | null;
    level?: "info" | "warn" | "error";
    message?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    // events tiene FORCE RLS → insert dentro de withTenant.
    await withTenant(tenantId, [
      csql`
        INSERT INTO events (tenant_id, sphere_id, kind, service, level, message, metadata)
        VALUES (${tenantId}, ${sphereId}, ${kind}, ${opts.service ?? null},
                ${opts.level ?? "info"}, ${opts.message ?? null},
                ${JSON.stringify(opts.metadata ?? {})}::jsonb)
      `,
    ]);
  } catch {
    // la observabilidad nunca debe tumbar el flujo principal
  }
}

export interface EventView {
  kind: string;
  service: string | null;
  level: string;
  message: string | null;
  created_at: string;
}

export async function recentEvents(tenantId: string, limit = 12): Promise<EventView[]> {
  const [rows] = (await withTenant(tenantId, [
    csql`
      SELECT kind, service, level, message, created_at
      FROM events WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT ${limit}
    `,
  ])) as [EventView[]];
  return rows;
}
