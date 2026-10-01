import reposAudit from "@/docs/auditoria/repos.json";
import { sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { listAllUserRepos, type RepoSummary } from "@/lib/github/client";
import { refreshDemoVercelUrls } from "@/lib/projects/demo-vercel-urls";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const GITHUB_OWNER = "turbillon50";
const VALID_CARTERA_TYPES = new Set([
  "cliente",
  "socios",
  "comercializamos",
  "centro_control",
  "inversion_momentum",
  "store",
  "demo_catalogo",
  "institucional",
  "archivar",
]);

interface AuditEntry {
  repos?: unknown;
  tipo?: unknown;
  estado?: unknown;
  prioridad?: unknown;
  nota?: unknown;
  pendiente?: unknown;
  decision?: unknown;
}

interface AuditFile {
  decisiones?: Record<string, AuditEntry>;
  dominios_por_repo?: Record<string, string>;
}

/** Dominio propio de un repo (sale del cruce con Vercel en la auditoría). */
function dominioDe(repoFullName: string | null | undefined): string | null {
  if (!repoFullName) return null;
  const mapa = (reposAudit as AuditFile).dominios_por_repo ?? {};
  const corto = repoFullName.split("/").pop() ?? repoFullName;
  const d = mapa[corto];
  return d && !d.startsWith("*") ? d : null;
}

interface ImportStats {
  reales: number;
  demos: number;
  repos_ligados: number;
  sin_repos: number;
  omitidos: Array<{ familia: string; motivo: string }>;
  github_disponible: boolean;
}

export async function POST() {
  const access = await resolveRequestOwner();
  if (!access.userId) return json({ error: "unauthorized" }, 401);
  if (!access.isOwner) return json({ error: "forbidden" }, 403);

  await ensureProjectRepositoriesSchema();
  await ensureProjectCarteraSchema();

  const repoMap = await loadGithubRepoMap(access.userId);
  const stats: ImportStats = {
    reales: 0,
    demos: 0,
    repos_ligados: 0,
    sin_repos: 0,
    omitidos: [],
    github_disponible: repoMap !== null,
  };

  const decisiones = (reposAudit as AuditFile).decisiones ?? {};
  const reposReales = new Set<string>();
  for (const [familyId, raw] of Object.entries(decisiones)) {
    const tipos = cleanTypes(raw.tipo);
    const decision = cleanText(raw.decision, 80);
    const archived = decision === "archivar" || tipos.includes("archivar");
    if (archived) {
      stats.omitidos.push({ familia: familyId, motivo: "archivar" });
      continue;
    }

    const repos = cleanRepos(raw.repos, familyId, stats);
    // Demo sólo si NO tiene otro tipo: "nuestro + demo" (ej. Ruta 618) es proyecto real.
    const isDemo = tipos.length > 0 && tipos.every((t) => t === "demo_catalogo");
    if (isDemo) {
      for (const repoName of repos) {
        await upsertDemoProject({
          familyId,
          repoFullName: repoName,
          entry: raw,
          repo: repoMap?.get(repoName.toLowerCase()) ?? null,
        });
        stats.demos += 1;
        stats.repos_ligados += 1;
      }
      if (repos.length === 0) {
        stats.omitidos.push({ familia: familyId, motivo: "demo_sin_repos" });
      }
      continue;
    }

    const realTypes = tipos.filter((type) => type !== "demo_catalogo");
    if (realTypes.length === 0) {
      stats.omitidos.push({ familia: familyId, motivo: "sin_tipo_cartera" });
      continue;
    }

    for (const r of repos) reposReales.add(r.toLowerCase());
    await upsertRealProject({
      familyId,
      tipos: realTypes,
      repos,
      entry: raw,
      repoMap,
    });
    stats.reales += 1;
    if (repos.length === 0) stats.sin_repos += 1;
    stats.repos_ligados += repos.length;
  }

  // Un repo que pasó de demo a proyecto real deja de aparecer en el catálogo (no se borra nada).
  for (const r of reposReales) {
    const demoId = `demo-${slugify(r.split("/").pop() ?? r)}`;
    await sql`UPDATE projects SET es_demo = false, demo_destacado = false, updated_at = now() WHERE id = ${demoId} AND es_demo = true`;
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${access.userId}, 'projects.cartera.import', 'projects', 1,
      ${JSON.stringify(stats)}::jsonb
    )
  `;

  const demoUrls = await refreshDemoVercelUrls({ auditUserId: access.userId }).catch((error) => ({
    ok: false,
    vercel_available: false,
    scanned: 0,
    matched: 0,
    updated: 0,
    unresolved: 0,
    errors: [
      {
        resource: "demos.urls",
        message: error instanceof Error ? error.message : String(error),
      },
    ],
  }));

  return json({ ok: true, ...stats, demo_urls: demoUrls });
}

async function loadGithubRepoMap(userId: string): Promise<Map<string, RepoSummary> | null> {
  try {
    const repos = await listAllUserRepos({ auditUserId: userId, max: 500 });
    return new Map(repos.map((repo) => [repo.full_name.toLowerCase(), repo]));
  } catch {
    return null;
  }
}

async function upsertRealProject({
  familyId,
  tipos,
  repos,
  entry,
  repoMap,
}: {
  familyId: string;
  tipos: string[];
  repos: string[];
  entry: AuditEntry;
  repoMap: Map<string, RepoSummary> | null;
}) {
  const primaryName = repos[0] ?? null;
  const primary = primaryName ? repoMap?.get(primaryName.toLowerCase()) ?? repoFallback(primaryName) : null;
  const note = cleanText(entry.nota, 1000) ?? cleanText(entry.pendiente, 1000);
  const priority = cleanPriority(entry.prioridad);
  const estado = cleanText(entry.estado, 120);
  const description = note;

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_language, github_default_branch,
      cartera_tipo, cartera_estado, cartera_prioridad, cartera_nota, es_demo, domain
    ) VALUES (
      ${familyId}, ${humanName(familyId)}, ${description}, ${categoryFor(tipos, estado, priority)}, 'unknown',
      ${primary?.full_name ?? null}, ${primary?.html_url ?? null}, ${primary?.private ?? false},
      ${primary?.language ?? null}, ${primary?.default_branch ?? null},
      ${tipos}::text[], ${estado}, ${priority}, ${note}, false,
      ${repos.map((r) => dominioDe(r)).find(Boolean) ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(NULLIF(projects.name, ''), EXCLUDED.name),
      description = COALESCE(projects.description, EXCLUDED.description),
      github_repo = COALESCE(EXCLUDED.github_repo, projects.github_repo),
      github_url = COALESCE(EXCLUDED.github_url, projects.github_url),
      github_private = COALESCE(EXCLUDED.github_private, projects.github_private),
      github_language = COALESCE(EXCLUDED.github_language, projects.github_language),
      github_default_branch = COALESCE(EXCLUDED.github_default_branch, projects.github_default_branch),
      cartera_tipo = EXCLUDED.cartera_tipo,
      cartera_estado = EXCLUDED.cartera_estado,
      cartera_prioridad = EXCLUDED.cartera_prioridad,
      cartera_nota = EXCLUDED.cartera_nota,
      es_demo = false,
      domain = COALESCE(NULLIF(projects.domain, ''), EXCLUDED.domain),
      updated_at = now()
  `;

  if (repos.length > 0) {
    await sql`
      UPDATE project_repositories SET is_primary = false, updated_at = now()
      WHERE project_id = ${familyId}
    `;
  }
  for (const [index, repoFullName] of repos.entries()) {
    const repo = repoMap?.get(repoFullName.toLowerCase()) ?? repoFallback(repoFullName);
    await upsertMembership(familyId, repo, index === 0);
  }
}

async function upsertDemoProject({
  familyId,
  repoFullName,
  entry,
  repo,
}: {
  familyId: string;
  repoFullName: string;
  entry: AuditEntry;
  repo: RepoSummary | null;
}) {
  const id = `demo-${slugify(repoFullName.split("/").pop() ?? repoFullName)}`;
  const fallback = repoFallback(repoFullName);
  const source = repo ?? fallback;
  const note = cleanText(entry.nota, 1000) ?? cleanText(entry.pendiente, 1000);
  const estado = cleanText(entry.estado, 120);
  const description = source.description ?? note;

  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_language, github_default_branch,
      cartera_tipo, cartera_estado, cartera_prioridad, cartera_nota,
      es_demo, demo_destacado, domain
    ) VALUES (
      ${id}, ${source.name}, ${description}, 'archivo', 'unknown',
      ${source.full_name}, ${source.html_url}, ${source.private}, ${source.language}, ${source.default_branch},
      ${["demo_catalogo"]}::text[], ${estado}, ${cleanPriority(entry.prioridad)}, ${noteWithFamily(note, familyId)},
      true, false, ${dominioDe(source.full_name)}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = COALESCE(NULLIF(projects.name, ''), EXCLUDED.name),
      description = COALESCE(projects.description, EXCLUDED.description),
      github_repo = EXCLUDED.github_repo,
      github_url = EXCLUDED.github_url,
      github_private = EXCLUDED.github_private,
      github_language = EXCLUDED.github_language,
      github_default_branch = EXCLUDED.github_default_branch,
      cartera_tipo = EXCLUDED.cartera_tipo,
      cartera_estado = EXCLUDED.cartera_estado,
      cartera_prioridad = EXCLUDED.cartera_prioridad,
      cartera_nota = EXCLUDED.cartera_nota,
      es_demo = true,
      domain = COALESCE(NULLIF(projects.domain, ''), EXCLUDED.domain),
      updated_at = now()
  `;

  await sql`
    UPDATE project_repositories SET is_primary = false, updated_at = now()
    WHERE project_id = ${id}
  `;
  await upsertMembership(id, source, true);
}

async function upsertMembership(projectId: string, repo: RepoSummary, isPrimary: boolean) {
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url, pushed_at
    ) VALUES (
      ${projectId}, ${repo.full_name}, 'app', ${isPrimary},
      ${repo.default_branch}, ${repo.private}, ${repo.language}, ${repo.html_url}, ${repo.pushed_at}
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      role = EXCLUDED.role,
      is_primary = EXCLUDED.is_primary,
      default_branch = COALESCE(EXCLUDED.default_branch, project_repositories.default_branch),
      private = COALESCE(EXCLUDED.private, project_repositories.private),
      language = COALESCE(EXCLUDED.language, project_repositories.language),
      html_url = COALESCE(EXCLUDED.html_url, project_repositories.html_url),
      pushed_at = COALESCE(EXCLUDED.pushed_at, project_repositories.pushed_at),
      updated_at = now()
  `;
}

function cleanTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const clean = value
    .map((item) => String(item ?? "").trim())
    .filter((item) => VALID_CARTERA_TYPES.has(item));
  return [...new Set(clean)];
}

function cleanRepos(value: unknown, familyId: string, stats: ImportStats): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const fullName = repoFullName(String(item ?? ""));
    if (!fullName) {
      stats.omitidos.push({ familia: familyId, motivo: `repo_invalido:${String(item ?? "")}` });
      continue;
    }
    if (!out.some((repo) => repo.toLowerCase() === fullName.toLowerCase())) {
      out.push(fullName);
    }
  }
  return out;
}

function repoFullName(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const full = raw.includes("/") ? raw : `${GITHUB_OWNER}/${raw}`;
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full) ? full : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function cleanPriority(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 9) return null;
  return n;
}

function categoryFor(tipos: string[], estado: string | null, priority: number | null) {
  const state = estado ?? "";
  if (state.includes("mantenimiento") || state.includes("cerrado")) return "en_pausa";
  if (state.includes("parado") || state.includes("abandono") || state.includes("rota")) return "en_pausa";
  if (priority === 1 || tipos.includes("cliente") || tipos.includes("socios")) return "activo";
  return "en_revision";
}

// Nombres con los que Luis llama a cada familia (auditoría 1-oct-2026).
const NOMBRES: Record<string, string> = {
  happytoc: "HappyToc", vliving: "V&LIVING", allliving: "All Living", zuxen: "Zuxen", ssante: "Ssante",
  ruta618: "Ruta 618 / Last Mile", ceer: "CEER", vedika: "Védika", premmex: "PREMMEX", studiodj: "StudioDJ",
  momentum: "Momentum", vforge: "VForge", vulcano: "Vulcano (infra)", eternime: "Eternime",
  mindcontextia: "MindContextIA", trama: "TRAMA", trading: "V-TRADING", vandefi: "VanDeFi",
  allglobal: "All Global (institucional)", apsus: "APSUS", castores_bitacora: "Castores — Bitácora",
  castores_store: "Castores — Store", icep: "ICEP Control", exci: "EXCI", contarea: "ElContaREA",
  luspa: "Lucienne Spa", netmas: "NetMás Móvil", goossip: "Goossip", rideme: "RideMe", identykit: "Identy-Kit",
  lutor: "LUTOR", modafy: "Modafy", jsc: "Junior Soccer Club", esteticar: "Esteticar",
  mtempresarial: "MT Empresarial", mitcan: "Mitcan / CSN", cuponia: "Cuponia", samrs: "SAM RS",
  credeti: "Crede-ti", trackport: "Track-Port", yerro: "YERRO", lnred: "LNRED", arco: "ARCO", sentrix: "Sentrix",
  paradox: "Paradox", vcredit: "VCredit / Credit Club", vgift: "V-Gift", pipmx: "Mi pipa / PIPMX",
  decaciones: "Decaciones", juego_inteligencia: "El juego de la inteligencia", vtv: "V-TV", break: "Break",
  toonimatics: "Toonimatics", vadmin: "V-Admin",
};

function humanName(id: string) {
  if (NOMBRES[id]) return NOMBRES[id];
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      const known: Record<string, string> = {
        vforge: "VForge",
        vliving: "VLiving",
        vandefi: "VanDeFi",
        zuxen: "Zuxen",
        ssante: "Ssante",
        ceer: "CEER",
        exci: "EXCI",
        icep: "ICEP",
        jsc: "JSC",
      };
      return known[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function noteWithFamily(note: string | null, familyId: string) {
  const familyNote = `Familia auditoria: ${familyId}`;
  return note ? `${note} | ${familyNote}`.slice(0, 1000) : familyNote;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 58) || "demo";
}

function repoFallback(fullName: string): RepoSummary {
  const [, repoName = fullName] = fullName.split("/", 2);
  return {
    full_name: fullName,
    name: repoName,
    owner: GITHUB_OWNER,
    private: false,
    description: null,
    language: null,
    default_branch: "main",
    pushed_at: null,
    updated_at: null,
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    archived: false,
    fork: false,
    html_url: `https://github.com/${fullName}`,
    size_kb: 0,
    topics: [],
  };
}

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
