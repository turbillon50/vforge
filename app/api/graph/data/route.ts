/**
 * GET /api/graph/data
 *
 * Returns merged Vercel + GitHub data ready for ProjectGraph.
 * No operator-auth required — same pattern as /api/projects.
 */
import { queryAll } from "@/lib/db/client";
import { listAllUserRepos } from "@/lib/github/client";
import { listProjects } from "@/lib/vercel/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DbProject {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  github_language: string | null;
  github_private: boolean | null;
  vercel_url: string | null;
  domain: string | null;
}

function fuzzyMatch(a: string, b: string): boolean {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[-_.v0]/g, "").replace(/(api|server|frontend|app|pwa)/g, "");
  const ca = clean(a), cb = clean(b);
  return ca.length > 3 && cb.length > 3 &&
    (ca.includes(cb.slice(0, 5)) || cb.includes(ca.slice(0, 5)));
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("api") || n.includes("server") || n.includes("backend") || n.includes("nest")) return "api";
  if (n.includes("saas") || n.includes("forge") || n.includes("subscription")) return "saas";
  if (n.includes("defi") || n.includes("cash") || n.includes("pay") || n.includes("credit")) return "fintech";
  if (n.includes("pwa") || n.includes("mobile")) return "pwa";
  if (n.includes("landing") || n.includes("static")) return "static";
  return "platform";
}

function isDead(name: string, lang: string | null): boolean {
  const n = name.toLowerCase();
  return !lang || n.endsWith("-") || n.includes("prueba") || n.includes("test-") ||
    /-(lj3f|v5ld|l6gq|5obd|c66ds)$/.test(n);
}

export async function GET() {
  try {
    const [dbProjects, ghRepos, vercelProjects] = await Promise.all([
      queryAll<DbProject>(
        `SELECT id, name, category, status, github_repo, github_language,
                github_private, vercel_url, domain
           FROM projects ORDER BY name`
      ),
      listAllUserRepos({ max: 200 }),
      listProjects().catch(() => []),
    ]);

    const vercelStatusMap = new Map<string, string>();
    for (const vp of vercelProjects) {
      const deploy = (vp as unknown as { latestDeployment?: { readyState?: string } }).latestDeployment;
      vercelStatusMap.set(vp.name, deploy?.readyState ?? "NONE");
    }

    const ghMap = new Map(ghRepos.map(r => [r.name.toLowerCase(), r]));

    const vercelNodes = dbProjects.map(p => {
      const ghRepo = p.github_repo
        ? ghMap.get(p.github_repo.toLowerCase()) ?? null
        : ghRepos.find(r => fuzzyMatch(p.name, r.name)) ?? null;
      const deployStatus = vercelStatusMap.get(p.name) ?? p.status ?? "NONE";
      const cat = guessCategory(p.name);
      const dead = isDead(p.name, ghRepo?.language ?? p.github_language);
      return {
        id: "v_" + p.id, label: p.name, type: "vercel" as const, cat, dead,
        data: {
          dbId: p.id, name: p.name, framework: null as string | null,
          status: deployStatus, category: p.category, domain: p.domain,
          vercelUrl: p.domain ? `https://${p.domain}` : p.vercel_url ?? `https://${p.name}.vercel.app`,
          ghRepo: ghRepo?.name ?? p.github_repo ?? null,
          ghUrl: ghRepo?.html_url ?? (p.github_repo ? `https://github.com/turbillon50/${p.github_repo}` : null),
          lang: ghRepo?.language ?? p.github_language ?? null,
          private: ghRepo?.private ?? p.github_private ?? false,
          desc: [guessCategory(p.name), ghRepo?.language].filter(Boolean).join(" · "),
          updatedAt: ghRepo?.updated_at ?? null,
        },
      };
    });

    const linkedRepoNames = new Set(
      dbProjects.flatMap(p => {
        const names: string[] = [];
        if (p.github_repo) names.push(p.github_repo.toLowerCase());
        const fuzzy = ghRepos.find(r => fuzzyMatch(p.name, r.name));
        if (fuzzy) names.push(fuzzy.name.toLowerCase());
        return names;
      })
    );

    const githubNodes = ghRepos
      .filter(r => !linkedRepoNames.has(r.name.toLowerCase()))
      .map(r => ({
        id: "g_" + r.full_name.replace("/", "_"), label: r.name,
        type: "github" as const, cat: guessCategory(r.name),
        dead: isDead(r.name, r.language) || r.archived,
        data: {
          dbId: null, name: r.name, framework: r.language, status: "GITHUB_ONLY",
          category: null, domain: null, vercelUrl: null, ghRepo: r.name,
          ghUrl: r.html_url, lang: r.language, private: r.private,
          desc: `GitHub${r.private ? " · Privado" : ""} · ${r.language ?? "Sin lenguaje"}`,
          updatedAt: r.updated_at,
        },
      }));

    const allNodes = [...vercelNodes, ...githubNodes];
    const edges: { s: string; t: string }[] = [];
    const edgeSet = new Set<string>();
    for (const vn of vercelNodes) {
      for (const gn of githubNodes) {
        if (fuzzyMatch(vn.label, gn.label)) {
          const key = vn.id + "_" + gn.id;
          if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ s: vn.id, t: gn.id }); }
        }
      }
    }

    return Response.json({
      nodes: allNodes, edges,
      stats: { vercel: vercelNodes.length, github: githubNodes.length,
               edges: edges.length, dead: allNodes.filter(n => n.dead).length },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
