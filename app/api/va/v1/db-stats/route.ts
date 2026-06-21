import { sql } from "@/lib/db/client";
import { checkVaAuth, vaUnauthorized } from "@/lib/va/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/va/v1/db-stats — salud de la Neon de VForge (contrato-va-v1).
 * Read-only: tamaño de la base + filas de las tablas clave del producto.
 * Si una tabla no existe todavía, se omite (arreglo vacío válido).
 */

// Tablas núcleo de VForge (la Neon es compartida; solo exponemos las del producto).
const KEY_TABLES = [
  "users",
  "projects",
  "vforge_builds",
  "vforge_subscriptions",
  "vforge_workspaces",
  "project_deploys",
  "project_members",
  "skills",
  "skill_invocations",
  "marketplace_products",
  "crm_leads",
  "v_chat_messages",
];

export async function GET(req: Request) {
  if (!checkVaAuth(req)) return vaUnauthorized();

  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, provider: "neon", size_mb: 0, tables: [] });
  }

  try {
    const sizeRows = (await sql`
      SELECT round((pg_database_size(current_database()) / 1024.0 / 1024.0)::numeric, 2) AS mb
    `) as Array<{ mb: string | number }>;
    const size_mb = Number(sizeRows[0]?.mb ?? 0);

    // Qué tablas de la lista existen realmente.
    const existing = (await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${KEY_TABLES})
    `) as Array<{ table_name: string }>;
    const present = new Set(existing.map((r) => r.table_name));

    const tables: Array<{ name: string; rows: number }> = [];
    for (const name of KEY_TABLES) {
      if (!present.has(name)) continue;
      try {
        // Nombre validado contra la whitelist KEY_TABLES -> seguro interpolar.
        const r = (await sql.query(
          `SELECT count(*)::int AS n FROM "${name}"`,
        )) as Array<{ n: number }>;
        tables.push({ name, rows: r[0]?.n ?? 0 });
      } catch {
        // tabla inaccesible -> se omite
      }
    }

    return Response.json({ ok: true, provider: "neon", size_mb, tables });
  } catch (e) {
    console.error("[va/db-stats]", e);
    return Response.json({ ok: true, provider: "neon", size_mb: 0, tables: [] });
  }
}
