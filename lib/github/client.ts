/**
 * GitHub client wrapper.
 *
 * Pulls the GITHUB_TOKEN from the operator vault on demand and
 * returns an authenticated Octokit instance. Cached for the duration
 * of the request via a module-level singleton.
 */
import { Octokit } from "octokit";
import { requireOperatorSecret } from "@/lib/vault/get-secret";

let cached: { client: Octokit; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function getGithubClient(
  options: { auditUserId?: string } = {},
): Promise<Octokit> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.client;
  }
  const token = await requireOperatorSecret("GITHUB_TOKEN", options);
  const client = new Octokit({
    auth: token,
    userAgent: "vforge/1.0",
  });
  cached = { client, expiresAt: Date.now() + CACHE_TTL_MS };
  return client;
}

export interface RepoSummary {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  updated_at: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  fork: boolean;
  html_url: string;
  size_kb: number;
  topics: string[];
}

export interface RepoDetail extends RepoSummary {
  created_at: string | null;
  visibility: string;
  has_issues: boolean;
  has_wiki: boolean;
  license: string | null;
  network_count: number;
  subscribers_count: number;
}

export interface RepoCommit {
  sha: string;
  message: string;
  author: string | null;
  date: string | null;
  url: string;
}

export interface RepoTreeNode {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
}

/**
 * Lists all repos visible to the authenticated user, paginated
 * automatically. Up to 200 repos by default.
 */
export async function listAllUserRepos(
  options: { perPage?: number; max?: number; auditUserId?: string } = {},
): Promise<RepoSummary[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const perPage = options.perPage ?? 100;
  const max = options.max ?? 200;
  const out: RepoSummary[] = [];
  let page = 1;
  while (out.length < max) {
    const { data } = await octokit.request("GET /user/repos", {
      per_page: perPage,
      sort: "updated",
      direction: "desc",
      page,
    });
    if (data.length === 0) break;
    for (const r of data) {
      out.push({
        full_name: r.full_name,
        name: r.name,
        owner: r.owner?.login ?? "",
        private: r.private,
        description: r.description,
        language: r.language,
        default_branch: r.default_branch,
        pushed_at: r.pushed_at ?? null,
        updated_at: r.updated_at ?? null,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        open_issues_count: r.open_issues_count,
        archived: r.archived,
        fork: r.fork,
        html_url: r.html_url,
        size_kb: r.size,
        topics: r.topics ?? [],
      });
    }
    if (data.length < perPage) break;
    page += 1;
  }
  return out.slice(0, max);
}

/**
 * Detailed view of a single repo.
 */
export async function getRepo(
  owner: string,
  repo: string,
  options: { auditUserId?: string } = {},
): Promise<RepoDetail> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data: r } = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo,
  });
  return {
    full_name: r.full_name,
    name: r.name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    language: r.language,
    default_branch: r.default_branch,
    pushed_at: r.pushed_at ?? null,
    updated_at: r.updated_at ?? null,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    open_issues_count: r.open_issues_count,
    archived: r.archived,
    fork: r.fork,
    html_url: r.html_url,
    size_kb: r.size,
    topics: r.topics ?? [],
    created_at: r.created_at ?? null,
    visibility: r.visibility ?? (r.private ? "private" : "public"),
    has_issues: r.has_issues,
    has_wiki: r.has_wiki,
    license: r.license?.spdx_id ?? null,
    network_count: r.network_count,
    subscribers_count: r.subscribers_count,
  };
}

export async function listRecentCommits(
  owner: string,
  repo: string,
  options: { limit?: number; auditUserId?: string } = {},
): Promise<RepoCommit[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner,
    repo,
    per_page: options.limit ?? 20,
  });
  return data.map((c) => ({
    sha: c.sha,
    message: (c.commit.message ?? "").split("\n")[0],
    author: c.commit.author?.name ?? c.author?.login ?? null,
    date: c.commit.author?.date ?? null,
    url: c.html_url,
  }));
}

export async function getRepoTree(
  owner: string,
  repo: string,
  options: {
    branch?: string;
    recursive?: boolean;
    auditUserId?: string;
  } = {},
): Promise<RepoTreeNode[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const branch = options.branch ?? "main";
  const { data: refData } = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    { owner, repo, branch },
  );
  const sha = refData.commit.sha;
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: sha,
      recursive: options.recursive ? "true" : undefined,
    },
  );
  return data.tree.map((n) => ({
    path: n.path ?? "",
    type: (n.type as "blob" | "tree" | "commit") ?? "blob",
    size: n.size,
    sha: n.sha ?? "",
  }));
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  options: { branch?: string; auditUserId?: string } = {},
): Promise<{ content: string; sha: string; size: number; encoding: string }> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      ref: options.branch,
    },
  );
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${path} is not a file (got ${(data as { type: string }).type})`);
  }
  const decoded = Buffer.from(data.content, "base64").toString("utf8");
  return {
    content: decoded,
    sha: data.sha,
    size: data.size,
    encoding: data.encoding,
  };
}
