import { queryAll } from "@/lib/db/client";
import { redactText } from "./redact";
export interface ArchiveEvidence {
  id: string;
  source: string;
  at: string | null;
  author: string | null;
  title: string;
  content: string;
}
export async function recoverySearch(
  query: string,
): Promise<ArchiveEvidence[]> {
  const terms = query
    .trim()
    .slice(0, 1000)
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter((t) => t.length > 2)
    .slice(0, 12);
  if (!terms.length) return [];
  const search = terms.join(" OR ");
  const tasks = [
    queryAll<ArchiveEvidence>(
      `SELECT id,source_type AS source,source_time::text AS at,author,coalesce(title,'') AS title,left(content,4500) AS content
FROM v_memory_documents WHERE owner_id='operator_luis' AND coalesce(author,'') NOT IN ('vigia','learning_loop','sleep_rem','knowledge_graph')
AND to_tsvector('spanish',coalesce(title,'')||' '||content) @@ websearch_to_tsquery('spanish',$1)
ORDER BY ts_rank(to_tsvector('spanish',coalesce(title,'')||' '||content),websearch_to_tsquery('spanish',$1)) DESC,source_time ASC NULLS LAST LIMIT 12`,
      [search],
    ),
    queryAll<ArchiveEvidence>(
      `SELECT id,'backup.'||source_table AS source,source_time::text AS at,author,title,left(content,4500) AS content
FROM v_recovery_archive WHERE to_tsvector('spanish',title||' '||content) @@ websearch_to_tsquery('spanish',$1)
ORDER BY ts_rank(to_tsvector('spanish',title||' '||content),websearch_to_tsquery('spanish',$1)) DESC,source_time ASC NULLS LAST LIMIT 12`,
      [search],
    ),
  ];
  const rows = await Promise.allSettled(tasks);
  if (rows.every((x) => x.status === "rejected"))
    throw Error("El archivo no respondió.");
  const dedup = new Map<string, ArchiveEvidence>();
  for (const r of rows)
    if (r.status === "fulfilled")
      for (const x of r.value) {
        const key = x.content.slice(0, 500);
        if (!dedup.has(key))
          dedup.set(key, {
            ...x,
            title: redactText(x.title),
            content: redactText(x.content).slice(0, 900),
          });
      }
  return [...dedup.values()].slice(0, 12);
}
export async function recoverySources() {
  const base = await queryAll<{
    source: string;
    records: number;
    first: string;
    last: string;
  }>(
    `SELECT source_type AS source,count(*)::int AS records,min(source_time)::text AS first,max(source_time)::text AS last FROM v_memory_documents WHERE owner_id='operator_luis' GROUP BY source_type ORDER BY count(*) DESC`,
  );
  let recovered: unknown[] = [];
  try {
    recovered = await queryAll(
      `SELECT source_table AS source,count(*)::int AS records,min(source_time)::text AS first,max(source_time)::text AS last FROM v_recovery_archive GROUP BY source_table`,
    );
  } catch {}
  return {
    archive: base,
    recovered,
    note: "Archivo histórico parcial. Los autores y fechas se conservan; no todo registro es una declaración personal de V.",
  };
}

export async function recoveryRead(id: string) {
  if (!/^[a-zA-Z0-9_.:-]{1,200}$/.test(id))
    throw Error("ID de fuente inválido.");
  const results = await Promise.allSettled([
    queryAll<ArchiveEvidence>(
      "SELECT id,source_type AS source,source_time::text AS at,author,coalesce(title,'') AS title,left(content,12000) AS content,metadata AS provenance FROM v_memory_documents WHERE owner_id='operator_luis' AND id=$1",
      [id],
    ),
    queryAll<ArchiveEvidence>(
      "SELECT id,'backup.'||source_table AS source,source_time::text AS at,author,title,left(content,12000) AS content,jsonb_build_object('backup_files',source_files,'original_id',original_id,'original_sha256',original_sha256,'redacted',redacted) AS provenance FROM v_recovery_archive WHERE id=$1",
      [id],
    ),
  ]);
  for (const r of results)
    if (r.status === "fulfilled" && r.value[0])
      return {
        ...r.value[0],
        content: redactText(r.value[0].content),
        historical: true,
      };
  return { not_found: true, id };
}
