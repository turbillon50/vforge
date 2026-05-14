import { sql } from "@/lib/db/client";

export async function POST() {
  try {
    // Alinear con migrations/008_skills.sql y 011: sin default (NULL = no instalada)
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS installed_at timestamptz`;
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS required_tools text[] NOT NULL DEFAULT '{}'::text[]`;
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS ring_max int NOT NULL DEFAULT 1`;
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true`;
    
    // Obtener estructura
    const structure = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'skills' 
      ORDER BY ordinal_position
    `;
    
    return Response.json({
      ok: true,
      message:
        "✅ skills table aligned (installed_at, required_tools, ring_max, active as needed)",
      columns: structure,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
