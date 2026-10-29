import { queryAll } from "@/lib/db/client";
import { memorySearch, type MemoryContext, type MemorySource } from "./continuity";
import { loadVectorMemory } from "./vector-memory";

/** Read the original records in place. No backfill, rewriting or synthetic embeddings. */
export async function loadVMemory(message: string, personalUserId?: string): Promise<MemoryContext> {
  const search = memorySearch(message);
  const queries: Array<Promise<MemorySource[]>> = [
    loadVectorMemory(message),
    personalUserId ? queryAll<MemorySource>(
      `SELECT id::text, 'personal' AS source, updated_at::text AS at,
              key || ': ' || value AS content
         FROM v_user_memory WHERE user_id = $1
         ORDER BY updated_at DESC, id DESC LIMIT 40`, [personalUserId],
    ) : Promise.resolve([]),
    queryAll<MemorySource>(
      `WITH archive AS MATERIALIZED (
         SELECT id, created_at, metadata, content, to_tsvector('spanish',content) AS document
           FROM semantic_memory WHERE user_id='operator_luis'
       ), terms AS (
         SELECT unnest(tsvector_to_array(to_tsvector('spanish',$1))) AS term
       ), matches AS MATERIALIZED (
         SELECT a.id, t.term FROM archive a JOIN terms t
           ON a.document @@ plainto_tsquery('spanish',t.term)
       ), frequency AS (
         SELECT term,count(*) AS n FROM matches GROUP BY term
       ), scores AS (
         SELECT m.id,sum(1.0/f.n) AS score FROM matches m
           JOIN frequency f USING(term) GROUP BY m.id
       )
       SELECT a.id::text, 'historical' AS source, a.created_at::text AS at,
              '[' || coalesce(metadata->>'role','sin autor identificado') || '] ' || content AS content
         FROM archive a JOIN scores s USING(id)
        ORDER BY s.score DESC, a.created_at DESC, a.id DESC LIMIT 10`, [search.replaceAll(' OR ', ' ')],
    ),
    queryAll<MemorySource>(
      `SELECT id::text, 'conversation' AS source, created_at::text AS at,
              '[' || role || '] ' || content AS content
         FROM v_chat_messages
        WHERE user_id = 'operator_luis'
          AND to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', $1)
        ORDER BY ts_rank(to_tsvector('spanish', content), websearch_to_tsquery('spanish', $1)) DESC,
                 created_at DESC, id DESC LIMIT 6`, [search],
    ),
  ];
  const results = await Promise.allSettled(queries);
  const successful = results.filter((r) => r.status === "fulfilled");
  return {
    status: successful.length === results.length ? "available" : successful.length ? "partial" : "unavailable",
    sources: results.flatMap((r) => r.status === "fulfilled" ? r.value : []),
  };
}
