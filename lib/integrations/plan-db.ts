/**
 * Plan de integraciones por usuario, persistido en tabla on-demand.
 *
 * workspace_id = 'ws_' + clerk userId (misma convención que el workspace).
 * Si el usuario no tiene plan aún, se genera leyendo su scope con
 * recommendFromScope y se guarda. El estado de cada item (pending /
 * connected / skipped) se actualiza por separado, y refreshConnectedStatus
 * marca como connected lo que ya tenga token en su vault.
 */
import { sql } from "@/lib/db/client";
import { getScope, workspaceId } from "@/lib/workspace/db";
import { getUserSecret } from "@/lib/connect/user-vault";
import { recommendFromScope } from "@/lib/integrations/recommend";

export type ItemStatus = "pending" | "connected" | "skipped";

export interface PlanItem {
  id: string;
  why: string;
  order: number;
  status: ItemStatus;
}

let _tableReady = false;
async function ensureTable(): Promise<void> {
  if (_tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_integration_plans (
      workspace_id text PRIMARY KEY,
      clerk_user_id text,
      items jsonb NOT NULL DEFAULT '[]',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;
  _tableReady = true;
}

/** Token en user_secrets que confirma que un servicio está conectado. */
const SECRET_FOR: Record<string, string> = {
  github: "GITHUB_USER_TOKEN",
  vercel: "VERCEL_USER_TOKEN",
  stripe: "STRIPE_CONNECTED_ACCOUNT",
  neon: "NEON_API_KEY",
  resend: "RESEND_API_KEY",
  clerk: "CLERK_SECRET_KEY",
};

async function readItems(userId: string): Promise<PlanItem[] | null> {
  await ensureTable();
  const rows = (await sql`
    SELECT items FROM vforge_integration_plans
    WHERE workspace_id = ${workspaceId(userId)}
  `) as Array<{ items: PlanItem[] }>;
  if (rows.length === 0) return null;
  return Array.isArray(rows[0].items) ? rows[0].items : [];
}

async function writeItems(userId: string, items: PlanItem[]): Promise<void> {
  await ensureTable();
  await sql`
    INSERT INTO vforge_integration_plans (workspace_id, clerk_user_id, items, updated_at)
    VALUES (${workspaceId(userId)}, ${userId}, ${JSON.stringify(items)}::jsonb, now())
    ON CONFLICT (workspace_id) DO UPDATE
      SET items = ${JSON.stringify(items)}::jsonb,
          updated_at = now()
  `;
}

/** Devuelve el plan del usuario; lo genera desde su scope si no existe. */
export async function getPlan(userId: string): Promise<PlanItem[]> {
  const existing = await readItems(userId);
  if (existing) return existing;

  const row = await getScope(userId).catch(() => null);
  const recs = recommendFromScope(row?.scope);
  const items: PlanItem[] = recs.map((r) => ({
    id: r.id,
    why: r.why,
    order: r.order,
    status: "pending",
  }));
  await writeItems(userId, items);
  return items;
}

/** Cambia el estado de un servicio dentro del plan del usuario. */
export async function setItemStatus(
  userId: string,
  serviceId: string,
  status: ItemStatus,
): Promise<PlanItem[]> {
  const items = await getPlan(userId);
  const next = items.map((it) =>
    it.id === serviceId ? { ...it, status } : it,
  );
  await writeItems(userId, next);
  return next;
}

/**
 * Marca como connected los servicios cuyo token ya exista en el vault del
 * usuario. No degrada estados ya connected ni toca los skipped manuales.
 */
export async function refreshConnectedStatus(
  userId: string,
): Promise<PlanItem[]> {
  const items = await getPlan(userId);
  let changed = false;
  const next: PlanItem[] = [];
  for (const it of items) {
    const secretName = SECRET_FOR[it.id];
    if (secretName && it.status !== "connected") {
      const tok = await getUserSecret(userId, secretName).catch(() => null);
      if (tok) {
        next.push({ ...it, status: "connected" });
        changed = true;
        continue;
      }
    }
    next.push(it);
  }
  if (changed) await writeItems(userId, next);
  return next;
}
