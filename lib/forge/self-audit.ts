import { readdir } from "node:fs/promises";
import path from "node:path";
import { sql, ensureDatabaseHealed } from "@/lib/db/client";
import { TOOLS } from "@/lib/forge/tools";

export interface SkillAudit {
  id: string;
  name: string;
  source: "system" | "user" | "learned";
  installed: boolean;
  active: boolean;
  has_doc: boolean;
  doc_path: string | null;
  required_tools: string[];
  missing_tools: string[];
  verdict: "real" | "partial" | "hallucinated";
}

export interface SelfAuditReport {
  ok: boolean;
  message: string;
  summary: {
    real: number;
    partial: number;
    hallucinated: number;
    total_skills_in_db: number;
    total_tools_in_code: number;
    total_docs: number;
    orphan_docs_count: number;
  };
  skills: SkillAudit[];
  tools: { count: number; names: string[] };
  docs: { count: number; slugs: string[]; orphans: string[] };
  vault: { operator_secrets: number; project_secrets: number; error: string | null };
  db_error: string | null;
  identity: {
    runtime_system_prompt: string;
    reference_doc: string;
    protocol_doc: string;
  };
  timestamp: string;
}

interface SkillRow {
  id: string;
  name: string;
  description: string;
  source: "system" | "user" | "learned";
  required_tools: string[] | null;
  installed_at: string | null;
  active: boolean;
}

/**
 * Cruza tres fuentes de verdad para reportar qué capacidades de V son
 * reales, parciales o alucinaciones:
 *
 *   1. BD: tabla `skills`           (lo que V cree que tiene)
 *   2. Docs: `docs/skills/*.md`     (lo que está diseñado)
 *   3. Código: `TOOLS` en tools.ts  (lo que de verdad puede ejecutar)
 *
 * Veredictos:
 *   - real         → en BD + tiene .md + todos sus required_tools existen.
 *   - partial      → en BD + falta el .md o le falta alguna tool.
 *   - hallucinated → en BD pero ninguna tool requerida existe en código.
 */
export async function runSelfAudit(): Promise<SelfAuditReport> {
  await ensureDatabaseHealed();

  const toolNames = new Set(TOOLS.map((t) => t.name));

  let docSlugs = new Set<string>();
  try {
    const skillsDir = path.join(process.cwd(), "docs", "skills");
    const files = await readdir(skillsDir);
    docSlugs = new Set(
      files
        .filter((f) => f.endsWith(".md") && f !== "README.md")
        .map((f) => f.replace(/\.md$/, "")),
    );
  } catch {
    // docs/skills no accesible — el audit marca todas como partial
  }

  let skillRows: SkillRow[] = [];
  let dbError: string | null = null;
  try {
    skillRows = (await sql`
      SELECT id, name, description, source, required_tools, installed_at, active
      FROM skills
      ORDER BY source, id
    `) as SkillRow[];
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown error";
  }

  const skills: SkillAudit[] = skillRows.map((row) => {
    const required = row.required_tools ?? [];
    const missing = required.filter((t) => !toolNames.has(t));
    const hasDoc = docSlugs.has(row.id);

    let verdict: SkillAudit["verdict"];
    if (required.length > 0 && missing.length === required.length) {
      verdict = "hallucinated";
    } else if (!hasDoc || missing.length > 0) {
      verdict = "partial";
    } else {
      verdict = "real";
    }

    return {
      id: row.id,
      name: row.name,
      source: row.source,
      installed: row.installed_at !== null,
      active: row.active,
      has_doc: hasDoc,
      doc_path: hasDoc ? `docs/skills/${row.id}.md` : null,
      required_tools: required,
      missing_tools: missing,
      verdict,
    };
  });

  const orphanDocs = Array.from(docSlugs).filter(
    (slug) => !skillRows.find((r) => r.id === slug),
  );

  let vault = { operator_secrets: -1, project_secrets: -1, error: null as string | null };
  try {
    const op = (await sql`SELECT COUNT(*)::int AS n FROM operator_secrets`) as Array<{ n: number }>;
    const pr = (await sql`SELECT COUNT(*)::int AS n FROM project_secrets`) as Array<{ n: number }>;
    vault = {
      operator_secrets: op[0]?.n ?? 0,
      project_secrets: pr[0]?.n ?? 0,
      error: null,
    };
  } catch (e) {
    vault.error = e instanceof Error ? e.message : "unknown error";
  }

  const summary = {
    real: skills.filter((s) => s.verdict === "real").length,
    partial: skills.filter((s) => s.verdict === "partial").length,
    hallucinated: skills.filter((s) => s.verdict === "hallucinated").length,
    total_skills_in_db: skills.length,
    total_tools_in_code: toolNames.size,
    total_docs: docSlugs.size,
    orphan_docs_count: orphanDocs.length,
  };

  const ok = summary.hallucinated === 0 && dbError === null && vault.error === null;

  return {
    ok,
    message: ok
      ? "V está limpia — todas sus skills son reales o parciales con backing en código"
      : `V tiene ${summary.hallucinated} skill(s) alucinada(s) o errores de infra`,
    summary,
    skills,
    tools: {
      count: toolNames.size,
      names: Array.from(toolNames).sort(),
    },
    docs: {
      count: docSlugs.size,
      slugs: Array.from(docSlugs).sort(),
      orphans: orphanDocs,
    },
    vault,
    db_error: dbError,
    identity: {
      runtime_system_prompt: "lib/forge/system-prompt.ts",
      reference_doc: "docs/v-identity/system-prompt-v2.md",
      protocol_doc: "AGENTS.md",
    },
    timestamp: new Date().toISOString(),
  };
}
