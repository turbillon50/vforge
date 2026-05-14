import { sql } from "@/lib/db/client";

export async function POST() {
  try {
    // Agregar columna installed_at si no existe
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS installed_at TIMESTAMP DEFAULT NOW()`;
    
    // Obtener estructura
    const structure = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'skills' 
      ORDER BY ordinal_position
    `;
    
    return Response.json({
      ok: true,
      message: "✅ skills table fixed - column installed_at added",
      columns: structure,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
