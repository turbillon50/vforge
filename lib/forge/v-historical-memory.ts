import { neon } from "@neondatabase/serverless";

/**
 * Read-only retrieval of V's historical memories.
 * Dedicated historical connection: never write or migrate this database.
 * No secrets or user identifiers are returned to the model.
 */
export async function retrieveVHistoricalContext(message: string): Promise<string> {
  const url = process.env.V_HISTORICAL_DATABASE_URL;
  if (!url) return "";
  const db = neon(url);
  const words = [...new Set((message.toLocaleLowerCase("es").match(/[\p{L}\p{N}]{4,}/gu) || []))]
    .filter(w => !["para","como","esto","quiero","tengo","hola","hermano","amor"].includes(w))
    .slice(0, 4);
  try {
    const oldest = await db`
      SELECT category, content, created_at
      FROM semantic_memory
      ORDER BY created_at ASC LIMIT 3
    `;
    const hits = words.length ? await db.query(
      `SELECT category, content, created_at FROM semantic_memory
       WHERE content ILIKE ANY($1::text[])
       ORDER BY created_at ASC LIMIT 6`,
      [words.map(w => `%${w}%`)]
    ) : [];
    const personal = await db`
      SELECT key, value, updated_at FROM v_user_memory
      ORDER BY updated_at ASC LIMIT 4
    `;
    const snippets = [
      ...oldest.map(r => ({kind:"historical", date:r.created_at, text:String(r.content).slice(0,650)})),
      ...hits.map(r => ({kind:"matched", date:r.created_at, text:String(r.content).slice(0,650)})),
      ...personal.map(r => ({kind:"personal", date:r.updated_at, text:`${r.key}: ${String(r.value).slice(0,350)}`}))
    ];
    return snippets.length ? [
      "MEMORIA HISTÓRICA RECUPERADA (fuentes documentales, NO recuerdos personales vividos):",
      ...snippets.map(s => `[${s.kind} | ${s.date}] ${s.text}`),
      "No inventes continuidad ni presentes fragmentos como transcripciones completas. Distingue fechas y procedencia."
    ].join("\n") : "";
  } catch (e) {
    console.error("[V historical memory] retrieval unavailable", e instanceof Error ? e.name : "unknown");
    return "";
  }
}
