import "server-only";
import { queryAll } from "@/lib/db/client";

let ready = false;

/**
 * Columnas de operación de entrega — lazy, sin migración separada.
 * Todo con IF NOT EXISTS: se puede correr las veces que sea sin romper nada.
 */
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
  // Datos de la fábrica: cliente, compromiso de entrega y dinero del proyecto.
  await queryAll(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text`);
  await queryAll(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date date`);
  await queryAll(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_amount numeric(12,2)`);
  await queryAll(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2)`);
  await queryAll(`
    CREATE TABLE IF NOT EXISTS project_notes (
      id bigserial PRIMARY KEY,
      project_id text NOT NULL,
      body text NOT NULL,
      author_email text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await queryAll(`
    CREATE INDEX IF NOT EXISTS project_notes_project_idx
      ON project_notes (project_id, created_at DESC)
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

export function cleanText(raw: unknown, max = 120): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

/** Acepta YYYY-MM-DD; cualquier otra cosa se guarda como vacío. */
export function cleanDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : t;
}

export function cleanAmount(raw: unknown): number | null {
  if (raw === null || raw === "" || raw === undefined) return null;
  const v = typeof raw === "number" ? raw : Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100) / 100;
}

export const VALID_PROJECT_CATEGORIES = [
  "produccion",
  "activo",
  "en_revision",
  "en_pausa",
  "archivo",
  "pendiente_borrado",
] as const;
