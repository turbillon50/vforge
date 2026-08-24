import "server-only";
import { queryAll } from "@/lib/db/client";

let ready = false;

/** Columnas de operación de entrega — lazy, sin migración separada. */
export async function ensureDeliveryColumns() {
  if (ready) return;
  await queryAll(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_priority boolean NOT NULL DEFAULT false
  `);
  await queryAll(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_pct smallint NOT NULL DEFAULT 0
  `);
  await queryAll(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS family_code text
  `);
  ready = true;
}

export function clampProgress(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function cleanFamilyCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return t || null;
}
