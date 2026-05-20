import { listAllUserRepos } from "@/lib/github/client";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain: string | null;
  category: string;
  status: string;
  last_audit_at: string | null;
}

interface EnrichedRepo {
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  html_url: string;
  pushed_at: string | null;
  stargazers_count: number;
  topics: string[];
  /** Integraciones detectadas. */
  integrations: {
    /** Está dado de alta en la tabla projects → V puede operarlo. */
    tracked: boolean;
    projectId: string | null;
    projectCategory: string | null;
    projectStatus: string | null;
    /** Tiene proyecto en Vercel vinculado. */
    vercel_url: string | null;
    /** Tiene dominio custom configurado. */
    domain: string | null;
    /** Cuándo fue la última auditoría de V. */
    last_audit_at: string | null;
  };
}

/**
 * GET /api/repos
 *
 * Devuelve la lista de repos de GitHub del operador, enriquecida con
 * info de integraciones (cuáles están tracked en la DB, cuáles tienen
 * Vercel/dominio, etc). Pensado para alimentar la página /app/repos
 * donde Luis ve TODO su parque de repos y qué hay conectado a cada uno.
 *
 * No requiere auth porque la sesión es single-user (operator_luis).
 * Cuando entre Clerk multi-tenant, esto pasará a leer el token de
 * GitHub del usuario en sesión.
 */
export async function GET() {
  let repos;
  try {
    repos = await listAllUserRepos({ max: 200, auditUserId: "operator_luis" });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `github fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // Cross-reference con la tabla projects para saber cuáles están tracked.
  // Mapeo por github_repo (full_name). Si Luis tiene un proyecto sin
  // github_repo en la DB, no aparece como integración aquí (debería —
  // pero ese es otro fix).
  const projects = await queryAll<ProjectRow>(
    `SELECT id, name, github_repo, vercel_url, domain, category, status, last_audit_at
       FROM projects
      WHERE github_repo IS NOT NULL`,
  );
  const byRepo = new Map(projects.map((p) => [p.github_repo!, p]));

  const enriched: EnrichedRepo[] = repos.map((r) => {
    const p = byRepo.get(r.full_name) ?? null;
    return {
      full_name: r.full_name,
      name: r.name,
      owner: r.owner,
      description: r.description,
      language: r.language,
      private: r.private,
      archived: r.archived,
      fork: r.fork,
      html_url: r.html_url,
      pushed_at: r.pushed_at,
      stargazers_count: r.stargazers_count,
      topics: r.topics,
      integrations: {
        tracked: !!p,
        projectId: p?.id ?? null,
        projectCategory: p?.category ?? null,
        projectStatus: p?.status ?? null,
        vercel_url: p?.vercel_url ?? null,
        domain: p?.domain ?? null,
        last_audit_at: p?.last_audit_at ?? null,
      },
    };
  });

  // Orden: tracked + production primero, luego tracked, luego untracked.
  enriched.sort((a, b) => {
    const score = (e: EnrichedRepo) =>
      (e.integrations.tracked ? 10 : 0) +
      (e.integrations.projectCategory === "produccion" ? 5 : 0) +
      (e.integrations.vercel_url ? 2 : 0) +
      (e.integrations.domain ? 1 : 0);
    const sb = score(b) - score(a);
    if (sb !== 0) return sb;
    const ta = a.pushed_at ? Date.parse(a.pushed_at) : 0;
    const tb = b.pushed_at ? Date.parse(b.pushed_at) : 0;
    return tb - ta;
  });

  return new Response(
    JSON.stringify({
      repos: enriched,
      tracked_count: enriched.filter((e) => e.integrations.tracked).length,
      total: enriched.length,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
