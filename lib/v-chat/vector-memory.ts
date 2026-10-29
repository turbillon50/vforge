import { queryAll } from "@/lib/db/client";
import type { MemorySource } from "./continuity";
import { memorySearch } from "./continuity";

const DIGEST = "0a109f422b47e3a30ba2b10eca18548e944e8a23073ee3f3e947efcf3c45e59f";

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
  let vector: number[] | null = null;
  try {
    const response = await fetch(endpoint, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: message.slice(0, 2000) }), signal: AbortSignal.timeout(10000), cache: "no-store",
  });
    if (!response.ok) throw new Error("V_EMBED_UNAVAILABLE");
    const data = await response.json();
    if (!Array.isArray(data.vector) || data.vector.length !== 768 || !data.vector.every((v: unknown) => typeof v === "number" && Number.isFinite(v)) ||
        !data.vector.some((v: number) => v !== 0) || data.digest !== DIGEST) throw new Error("V_EMBED_INVALID");
    vector = data.vector;
  } catch { /* the complete archive remains searchable by text if embeddings are offline */ }
  const rows = await queryAll<IndexedMemory>(
    `WITH semantic AS MATERIALIZED (
       SELECT id,embedding <=> $1::vector AS distance,row_number() OVER(ORDER BY embedding <=> $1::vector) AS rank
       FROM v_memory_chunks WHERE owner_id='operator_luis' AND model_digest=$2 AND embedding IS NOT NULL
       AND $1::vector IS NOT NULL AND embedding <=> $1::vector < 0.65
       ORDER BY embedding <=> $1::vector LIMIT 36
     ), lexical AS MATERIALIZED (
       SELECT id,embedding <=> $1::vector AS distance,
         row_number() OVER(ORDER BY ts_rank_cd(to_tsvector('spanish',content),websearch_to_tsquery('spanish',$3)) DESC,id) AS rank
       FROM v_memory_chunks WHERE owner_id='operator_luis' AND model_digest=$2
       AND to_tsvector('spanish',content) @@ websearch_to_tsquery('spanish',$3)
       ORDER BY ts_rank_cd(to_tsvector('spanish',content),websearch_to_tsquery('spanish',$3)) DESC,id LIMIT 36
     ), scores AS (
       SELECT id,min(distance) AS distance,sum(1.0/(20+rank)) AS score FROM (
         SELECT * FROM semantic UNION ALL SELECT * FROM lexical
       ) candidates GROUP BY id
     ), nearest AS (
       SELECT c.id,c.content,s.distance,s.score FROM scores s JOIN v_memory_chunks c ON c.id=s.id
     ), evidence AS (
       SELECT DISTINCT ON(n.id) n.id,n.content,n.distance,n.score,d.source_type,d.source_id,d.source_time,d.author,d.title,d.metadata,d.redacted
       FROM nearest n JOIN v_memory_document_chunks l ON l.chunk_id=n.id
       JOIN v_memory_documents d ON d.id=l.document_id AND d.owner_id='operator_luis'
       ORDER BY n.id,CASE d.source_type WHEN 'conversations' THEN 0 WHEN 'v_chat_messages' THEN 1 WHEN 'git.document' THEN 2 ELSE 3 END,d.source_time ASC NULLS LAST,d.id
     ) SELECT * FROM evidence ORDER BY score DESC,id LIMIT 10`, [vector ? JSON.stringify(vector) : null, DIGEST, memorySearch(message)],
  );
  return rows.map(row => ({
    id: `${row.source_type}:${row.source_id}`, source: "archive", at: row.source_time || "sin fecha de origen",
    content: `[Archivo ${row.source_type}; registro ${row.source_id}; autor ${row.author || "sin identificar"}; fecha del registro/versión ${row.source_time || "desconocida"}; ${row.title || ""}${row.redacted ? "; copia con credenciales ocultas" : ""}]\n${row.content}`,
    ref: { type: row.source_type, id: row.source_id, author: row.author, metadata: { ...row.metadata, chunk_id: row.id, retrieval: vector ? "hybrid" : "lexical" } },
  }));
}
