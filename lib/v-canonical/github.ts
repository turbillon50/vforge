import { remoteFetch, boundedText } from "./network";
import { repositoryRead } from "./tools";
import type { CanonConfig } from "./config";
export function githubKey(config: CanonConfig) {
  return config.githubSecret || process.env.GITHUB_TOKEN || "";
}
export async function githubRepos(config: CanonConfig, page = 1, query = "") {
  const key = githubKey(config);
  if (!key) throw Error("Conecta GitHub una vez en la sala de configuración.");
  page = Math.min(20, Math.max(1, Math.floor(page)));
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + key,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const [user, r] = await Promise.all([
    remoteFetch("https://api.github.com/user", { headers }),
    remoteFetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&type=all&page=" +
        page,
      { headers },
    ),
  ]);
  if (!user.ok || !r.ok)
    throw Error(
      "GitHub no confirmó acceso. Revisa el token y sus permisos de lectura.",
    );
  const u = JSON.parse(await boundedText(user, 100000));
  const rows = JSON.parse(await boundedText(r, 2000000)) as Array<{
    full_name: string;
    html_url: string;
    private: boolean;
    description: string | null;
  }>;
  return {
    account: String(u.login || ""),
    page,
    next_page: rows.length === 100 ? page + 1 : null,
    repositories: rows
      .filter((x) => x.full_name.toLowerCase().includes(query.toLowerCase()))
      .map((x) => ({
        name: x.full_name,
        url: x.html_url,
        private: x.private,
        description: x.description?.slice(0, 300),
        purpose: config.githubRoles?.[x.full_name] || "reference",
      })),
  };
}
export async function githubFile(
  config: CanonConfig,
  repo: string,
  path: string,
) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error("Repositorio inválido.");
  const result = await repositoryRead(
    {
      id: "github-shared",
      name: repo,
      kind: "repository",
      endpoint: "https://github.com/" + repo,
      secret: githubKey(config),
      enabled: true,
      status: "ready",
    },
    path,
  );
  return { ...result, purpose: config.githubRoles?.[repo] || "reference" };
}
