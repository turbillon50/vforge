/**
 * Memoria semántica de V — herencia Mastra reconstruida.
 *
 * Embeddings con OpenAI text-embedding-3-small (1536 dims, coincide con
 * la columna vector(1536) de semantic_memory). Módulo AUTÓNOMO: no
 * importa lib/db/semantic-memory.ts (ese instancia `new Anthropic()`
 * sin key al cargar y truena en runtime sin ANTHROPIC_API_KEY en env).
 *
 * Regla de oro: TODO silencioso ante fallos — la memoria nunca tumba el chat.
 */
import { sql, queryAll } from "@/lib/db/client";
import { getOperatorSecret } from "@/lib/vault/get-secret";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_CONTENT_CHARS = 2000;

/** Convierte un arreglo de números al literal '[1,2,...]' que pgvector acepta. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function newId(): string {
  return `sm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Embedding de un solo texto. Devuelve null ante cualquier fallo. */
export let lastEmbedError: string | null = null;

export async function embed(text: string): Promise<number[] | null> {
  const vectors = await embedBatch([text]);
  return vectors ? (vectors[0] ?? null) : null;
}

/**
 * Embeddings en lote (un solo request). Devuelve null si algo falla
 * (sin key, error HTTP, respuesta malformada).
 */
export async function embedBatch(
  texts: string[],
): Promise<number[][] | null> {
  const viaOpenAI = await embedBatchOpenAI(texts);
  if (viaOpenAI) return viaOpenAI;
  // Fallback: Gemini embedding-001 con outputDimensionality 1536 —
  // misma dimension que la tabla, distinta familia (consistente entre si
  // porque el backfill y el recall usan el mismo proveedor disponible).
  return embedBatchGemini(texts);
}

async function embedBatchOpenAI(
  texts: string[],
): Promise<number[][] | null> {
  try {
    if (texts.length === 0) return [];
    const apiKey = await getOperatorSecret("OPENAI_API_KEY");
    if (!apiKey) {
      lastEmbedError = "OPENAI_API_KEY no resuelta del vault";
      return null;
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts.map((t) => t.slice(0, 8000) || " "),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      lastEmbedError = `HTTP ${res.status}: ${body.slice(0, 200)}`;
      console.error("[V recall] embeddings", lastEmbedError);
      return null;
    }
    const json = (await res.json()) as {
      data?: Array<{ index: number; embedding: number[] }>;
    };
    if (!Array.isArray(json.data) || json.data.length !== texts.length) {
      return null;
    }
    const out: number[][] = new Array(texts.length);
    for (const d of json.data) out[d.index] = d.embedding;
    return out;
  } catch (e) {
    console.error("[V recall] embed failed:", e);
    return null;
  }
}

/**
 * Memoriza un turno de conversación. Fire-and-forget: silencioso ante fallo.
 */
export async function rememberTurn(args: {
  role: "user" | "assistant";
  content: string;
  sessionId: string;
  sourceId?: string | null;
}): Promise<void> {
  try {
    const content = (args.content || "").slice(0, MAX_CONTENT_CHARS).trim();
    if (!content) return;
    const vector = await embed(content);
    if (!vector) return;
    const metadata = {
      role: args.role,
      session_id: args.sessionId,
      ...(args.sourceId ? { source_id: args.sourceId } : {}),
    };
    await sql`
      INSERT INTO semantic_memory (id, content, embedding, category, metadata)
      VALUES (
        ${newId()}, ${content}, ${toVectorLiteral(vector)}::vector,
        'conversation', ${JSON.stringify(metadata)}::jsonb
      )
    `;
  } catch (e) {
    console.error("[V recall] rememberTurn failed (no tumba el chat):", e);
  }
}

export interface RecallHit {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

/**
 * Búsqueda semántica: top-k recuerdos más cercanos al query (similitud coseno).
 */
export async function recall(query: string, k = 6): Promise<RecallHit[]> {
  try {
    const text = (query || "").trim();
    if (!text) return [];
    const vector = await embed(text.slice(0, 4000));
    if (!vector) return [];
    const lit = toVectorLiteral(vector);
    const rows = (await sql`
      SELECT content, metadata, 1 - (embedding <=> ${lit}::vector) AS score
      FROM semantic_memory
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${lit}::vector
      LIMIT ${k}
    `) as Array<{ content: string; metadata: Record<string, unknown>; score: number | string }>;
    return rows.map((r) => ({
      content: r.content,
      metadata: r.metadata ?? {},
      score: typeof r.score === "string" ? parseFloat(r.score) : r.score,
    }));
  } catch (e) {
    console.error("[V recall] recall failed (no tumba el chat):", e);
    return [];
  }
}

/**
 * Backfill: memoriza el historial pasado (conversations del operador +
 * v_user_memory) que aún no está en semantic_memory. Procesa hasta
 * `limit` ítems por llamada, embebiendo en lotes de 50 (un request por lote).
 * Devuelve {processed, remaining}.
 */
export async function backfillFromHistory(
  limit = 500,
): Promise<{ processed: number; remaining: number }> {
  const BATCH = 50;
  let processed = 0;

  try {
    // Turnos de conversations aún no memorizados (left join por source_id).
    const pendingTurns = await queryAll<{
      id: string;
      session_id: string;
      role: string;
      content: string;
    }>(
      `SELECT c.id::text, c.session_id, c.role, c.content
         FROM conversations c
         LEFT JOIN semantic_memory sm
           ON sm.metadata->>'source_id' = c.id::text
        WHERE c.user_id = 'operator_luis'
          AND c.role IN ('user','assistant')
          AND length(trim(c.content)) > 0
          AND sm.id IS NULL
        ORDER BY c.created_at ASC
        LIMIT $1`,
      [limit],
    );

    // Memorias por cuenta aún no memorizadas (con id para el source_id).
    const pendingMemoriesFull = await queryAll<{
      id: number;
      key: string;
      value: string;
    }>(
      `SELECT m.id, m.key, m.value
         FROM v_user_memory m
         LEFT JOIN semantic_memory sm
           ON sm.metadata->>'source_id' = 'umem_' || m.id::text
        WHERE sm.id IS NULL
        LIMIT $1`,
      [Math.max(0, limit - pendingTurns.length)],
    ).catch(() => [] as Array<{ id: number; key: string; value: string }>);

    interface Item {
      content: string;
      metadata: Record<string, unknown>;
    }
    const items: Item[] = [
      ...pendingTurns.map((t) => ({
        content: t.content.slice(0, MAX_CONTENT_CHARS),
        metadata: {
          role: t.role,
          session_id: t.session_id,
          source_id: t.id,
          source: "backfill_conversations",
        },
      })),
      ...pendingMemoriesFull.map((m) => ({
        content: `${m.key}: ${m.value}`.slice(0, MAX_CONTENT_CHARS),
        metadata: {
          role: "memory",
          source_id: `umem_${m.id}`,
          source: "backfill_user_memory",
        },
      })),
    ];

    // Embebe e inserta en lotes de 50.
    for (let i = 0; i < items.length; i += BATCH) {
      const slice = items.slice(i, i + BATCH);
      const vectors = await embedBatch(slice.map((s) => s.content));
      if (!vectors) break; // sin embeddings no insertamos; reintenta luego
      for (let j = 0; j < slice.length; j++) {
        const v = vectors[j];
        if (!v) continue;
        try {
          await sql`
            INSERT INTO semantic_memory (id, content, embedding, category, metadata)
            VALUES (
              ${newId()}, ${slice[j].content},
              ${toVectorLiteral(v)}::vector,
              'conversation', ${JSON.stringify(slice[j].metadata)}::jsonb
            )
          `;
          processed += 1;
        } catch (e) {
          console.error("[V recall] backfill insert failed:", e);
        }
      }
    }

    // ¿Cuántos turnos quedan pendientes?
    const remainRows = await queryAll<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM conversations c
         LEFT JOIN semantic_memory sm
           ON sm.metadata->>'source_id' = c.id::text
        WHERE c.user_id = 'operator_luis'
          AND c.role IN ('user','assistant')
          AND length(trim(c.content)) > 0
          AND sm.id IS NULL`,
    );
    const remaining = remainRows[0] ? parseInt(remainRows[0].n, 10) : 0;
    return { processed, remaining };
  } catch (e) {
    console.error("[V recall] backfill failed:", e);
    return { processed, remaining: -1 };
  }
}

/**
 * Construye el bloque de prompt con recuerdos relevantes (score >= minScore).
 */
export function formatRecallSection(
  hits: RecallHit[],
  minScore = 0.25,
): string {
  const relevant = hits.filter((h) => h.score >= minScore);
  if (relevant.length === 0) return "";
  const lines = relevant
    .map((h) => {
      const role = typeof h.metadata?.role === "string" ? h.metadata.role : "?";
      return `- [${role}] ${h.content.slice(0, 500)}`;
    })
    .join("\n");
  return `\n\nRECUERDOS RELEVANTES (memoria semántica):\n${lines}\n(Usa estos recuerdos solo si aportan al turno actual; son fragmentos de tu pasado con Luis.)`;
}


async function embedBatchGemini(
  texts: string[],
): Promise<number[][] | null> {
  try {
    if (texts.length === 0) return [];
    const apiKey = await getOperatorSecret("GEMINI_API_KEY");
    if (!apiKey) {
      lastEmbedError = (lastEmbedError ?? "") + " | GEMINI_API_KEY no resuelta";
      return null;
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: t.slice(0, 8000) || " " }] },
            outputDimensionality: 1536,
          })),
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      lastEmbedError = `Gemini HTTP ${res.status}: ${body.slice(0, 200)}`;
      console.error("[V recall] gemini embeddings", lastEmbedError);
      return null;
    }
    const json = (await res.json()) as {
      embeddings?: Array<{ values: number[] }>;
    };
    const vectors = (json.embeddings ?? []).map((e) => e.values);
    if (vectors.length !== texts.length) {
      lastEmbedError = "Gemini devolvió un número distinto de vectores";
      return null;
    }
    lastEmbedError = null;
    return vectors;
  } catch (e) {
    lastEmbedError = `Gemini: ${String(e).slice(0, 200)}`;
    return null;
  }
}
