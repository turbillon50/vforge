import { sql, queryAll } from "@/lib/db/client";

/**
 * Memoria por cuenta (independiente del chat). Tabla NUEVA — nunca
 * alteramos tablas existentes. Se crea on-demand.
 */
let _ensured = false;

async function ensureTable(): Promise<void> {
  if (_ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS v_user_memory (
      id serial PRIMARY KEY,
      user_id text NOT NULL,
      key text NOT NULL,
      value text NOT NULL,
      updated_at timestamptz DEFAULT now(),
      UNIQUE (user_id, key)
    )
  `;
  _ensured = true;
}

export async function getUserMemories(
  userId: string,
): Promise<Array<{ key: string; value: string }>> {
  try {
    await ensureTable();
    return await queryAll<{ key: string; value: string }>(
      `SELECT key, value FROM v_user_memory
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 40`,
      [userId],
    );
  } catch (e) {
    console.error("[V] getUserMemories failed:", e);
    return [];
  }
}

export async function saveUserMemory(
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  try {
    await ensureTable();
    await sql`
      INSERT INTO v_user_memory (user_id, key, value, updated_at)
      VALUES (${userId}, ${key}, ${value}, now())
      ON CONFLICT (user_id, key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  } catch (e) {
    console.error("[V] saveUserMemory failed:", e);
  }
}

const MEMORY_BLOCK_RE = /<memory\s+key="([^"]{1,120})"\s*>([\s\S]*?)<\/memory>/g;

/**
 * Extrae bloques <memory key="...">valor</memory> del texto del modelo.
 * Devuelve el texto limpio (sin los bloques) y los pares encontrados.
 */
export function extractMemoryBlocks(text: string): {
  cleaned: string;
  memories: Array<{ key: string; value: string }>;
} {
  const memories: Array<{ key: string; value: string }> = [];
  const cleaned = text
    .replace(MEMORY_BLOCK_RE, (_m, key: string, value: string) => {
      const v = value.trim();
      if (v) memories.push({ key: key.trim(), value: v.slice(0, 2000) });
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { cleaned, memories };
}

export function memoryPromptSection(
  memories: Array<{ key: string; value: string }>,
): string {
  const lines = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
  const list = memories.length > 0 ? `\n\nMemoria de la cuenta:\n${lines}` : "";
  return (
    list +
    "\n\nCuando detectes un dato durable del usuario (nombre, preferencias, proyectos, decisiones, datos de su negocio), emite al FINAL de tu respuesta un bloque <memory key=\"clave_corta\">valor</memory> por cada dato. Estos bloques no se muestran al usuario. No repitas memorias que ya tienes."
  );
}
