import { queryAll } from "@/lib/db/client";
import type { MemorySource } from "./continuity";

interface IndexedMemory {
  id: string;
  source_type: string;
  source_id: string;
  source_time: string | null;
  author: string | null;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  redacted: boolean;
  distance: number;
}

/** Query the additive archive only; original memory and identity tables remain authoritative. */
export async function loadVectorMemory(message: string): Promise<MemorySource[]> {
  const endpoint = process.env.V_MEMORY_EMBED_URL;
  const token = process.env.V_MEMORY_EMBED_TOKEN;
  if (!endpoint || !token) return [];
  const response = await fetch(endpoint, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: message.slice(0, 2000) }), signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw new Error("V_EMBED_UNAVAILABLE");
  const data = await response.json();
  if (!Array.isArray(data.vector) || data.vector.length !== 768 || !data.vector.every((v: unknown) => typeof v === "number" && Number.isFinite(v)) ||
      !data.vector.some((v: number) => v !== 0) || typeof data.digest !== "string" || !/^[0-9a-f]{64}$/.test(data.digest)) throw new Error("V_EMBED_INVALID");
  const rows = await queryAll<IndexedMemory>(
    `WITH nearest AS MATERIALIZED (
       SELECT id,content,embedding <=> $1::vector AS distance
       FROM v_memory_chunks WHERE owner_id='operator_luis' AND model_digest=$2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector LIMIT 36
     ), evidence AS (
       SELECT DISTINCT ON(n.id) n.id,n.content,n.distance,d.source_type,d.source_id,d.source_time,d.author,d.title,d.metadata,d.redacted
       FROM nearest n JOIN v_memory_document_chunks l ON l.chunk_id=n.id
       JOIN v_memory_documents d ON d.id=l.document_id AND d.owner_id='operator_luis'
       WHERE n.distance < 0.65
       ORDER BY n.id,CASE d.source_type WHEN 'conversations' THEN 0 WHEN 'v_chat_messages' THEN 1 WHEN 'git.document' THEN 2 ELSE 3 END,d.source_time ASC NULLS LAST,d.id
     ) SELECT * FROM evidence ORDER BY distance,id LIMIT 10`, [JSON.stringify(data.vector), data.digest],
  );
  return rows.map(row => ({
    id: row.id, source: "archive", at: row.source_time || "sin fecha de origen",
    content: `[Archivo ${row.source_type}; registro ${row.source_id}; autor ${row.author || "sin identificar"}; fecha del registro/versión ${row.source_time || "desconocida"}; ${row.title || ""}${row.redacted ? "; copia con credenciales ocultas" : ""}]\n${row.content}`,
    ref: { type: row.source_type, id: row.source_id, author: row.author, metadata: row.metadata },
  }));
}
