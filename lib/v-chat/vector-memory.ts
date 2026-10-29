import { queryAll } from "@/lib/db/client";
import type { MemorySource } from "./continuity";
import { planRetrieval, rankEvidence, mergeEvidence } from "./retrieval-plan";

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
  if (!endpoint || !token) throw new Error("V_MEMORY_ARCHIVE_UNAVAILABLE");
  const plan = await planRetrieval(message);
  let vector: number[] | null = null;
  try {
    const response = await fetch(endpoint, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: plan.embedding_query }), signal: AbortSignal.timeout(10000), cache: "no-store",
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
     ) SELECT * FROM evidence ORDER BY score DESC,id LIMIT 48`, [vector ? JSON.stringify(vector) : null, DIGEST, plan.lexical_query],
  );
  // A short answer (e.g. a test word) may only make sense beside its question.
  // Expand only the same archived session, within three minutes of a top hit.
  const anchors = await rankEvidence(message, rows);
  const seeds = anchors.filter(r => r.source_type === "conversations" && r.source_time && typeof r.metadata?.session_id === "string")
    .map(r => ({session_id:r.metadata.session_id, at:r.source_time}));
  const neighbors = seeds.length ? await queryAll<IndexedMemory>(
    `SELECT DISTINCT ON(c.id) c.id,c.content,0::float AS distance,d.source_type,d.source_id,d.source_time,d.author,d.title,d.metadata,d.redacted
     FROM v_memory_documents d JOIN v_memory_document_chunks l ON l.document_id=d.id
     JOIN v_memory_chunks c ON c.id=l.chunk_id
     WHERE d.owner_id='operator_luis' AND d.source_type='conversations' AND c.model_digest=$2
       AND EXISTS (SELECT 1 FROM jsonb_to_recordset($1::jsonb) AS seed(session_id text,at timestamptz)
         WHERE d.metadata->>'session_id'=seed.session_id AND d.source_time BETWEEN seed.at-interval '3 minutes' AND seed.at+interval '3 minutes')
     ORDER BY c.id,d.source_time LIMIT 36`, [JSON.stringify(seeds), DIGEST],
  ) : [];
  const pool = [...new Map([...anchors, ...neighbors].map(r => [r.id, r])).values()];
  const relevant = neighbors.length ? mergeEvidence(anchors, await rankEvidence(message, pool)) : anchors;
  return relevant.map(row => ({
    id: `${row.source_type}:${row.source_id}`, source: "archive", at: row.source_time || "sin fecha de origen",
    content: `[Archivo ${row.source_type}; registro ${row.source_id}; autor ${row.author || "sin identificar"}; fecha del registro/versión ${row.source_time || "desconocida"}; ${row.title || ""}${row.redacted ? "; copia con credenciales ocultas" : ""}]\n${row.content}`,
    ref: { type: row.source_type, id: row.source_id, author: row.author, metadata: { ...row.metadata, chunk_id: row.id, retrieval: vector ? "hybrid" : "lexical" } },
  }));
}
