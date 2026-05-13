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

// ─── Write ops (Ring 1-2) ─────────────────────────────────────────────
// Per ADR-009 / AGENTS.md, these are gated by branch name in the tool
// dispatcher: writes to "main" require an explicit override flag,
// otherwise V is forced to land changes on a feature branch.

export interface FileMutationResult {
  path: string;
  sha: string;
  branch: string;
  commit_sha: string;
  commit_url: string;
}

/**
 * Create a new file in a repo. Fails with 422 if the path already
 * exists — the caller should use updateFile in that case.
 */
export async function createFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  options: { branch?: string; auditUserId?: string } = {},
): Promise<FileMutationResult> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request(
    "PUT /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: options.branch,
    },
  );
  return {
    path,
    sha: data.content?.sha ?? "",
    branch: options.branch ?? "main",
    commit_sha: data.commit.sha ?? "",
    commit_url: data.commit.html_url ?? "",
  };
}

/**
 * Update an existing file. The blob SHA is required by the API; if not
 * provided, we fetch it with a GET so the caller doesn't have to wire
 * two calls together.
 */
export async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  options: { sha?: string; branch?: string; auditUserId?: string } = {},
): Promise<FileMutationResult> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  let sha = options.sha;
  if (!sha) {
    const existing = await getFileContent(owner, repo, path, {
      branch: options.branch,
      auditUserId: options.auditUserId,
    });
    sha = existing.sha;
  }
  const { data } = await octokit.request(
    "PUT /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
      branch: options.branch,
    },
  );
  return {
    path,
    sha: data.content?.sha ?? "",
    branch: options.branch ?? "main",
    commit_sha: data.commit.sha ?? "",
    commit_url: data.commit.html_url ?? "",
  };
}

/**
 * Delete a file. Same SHA-resolution shortcut as updateFile.
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  options: { sha?: string; branch?: string; auditUserId?: string } = {},
): Promise<{ path: string; branch: string; commit_sha: string; commit_url: string }> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  let sha = options.sha;
  if (!sha) {
    const existing = await getFileContent(owner, repo, path, {
      branch: options.branch,
      auditUserId: options.auditUserId,
    });
    sha = existing.sha;
  }
  const { data } = await octokit.request(
    "DELETE /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      message,
      sha,
      branch: options.branch,
    },
  );
  return {
    path,
    branch: options.branch ?? "main",
    commit_sha: data.commit.sha ?? "",
    commit_url: data.commit.html_url ?? "",
  };
}

/**
 * Create a new branch from an existing one. Resolves the source SHA
 * with a GET on /git/refs/heads/<from_branch> so the caller can pass
 * just branch names.
 */
export async function createBranch(
  owner: string,
  repo: string,
  branch: string,
  options: { fromBranch?: string; auditUserId?: string } = {},
): Promise<{ branch: string; sha: string; ref: string }> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const fromBranch = options.fromBranch ?? "main";
  const { data: refData } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/{ref}",
    { owner, repo, ref: `heads/${fromBranch}` },
  );
  const sourceSha = refData.object.sha;
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/git/refs",
    {
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: sourceSha,
    },
  );
  return {
    branch,
    sha: data.object.sha,
    ref: data.ref,
  };
}

/**
 * Create a Pull Request. Defaults to draft so V can prepare changes
 * without requesting review until the human approves.
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  input: {
    title: string;
    body?: string;
    head: string;
    base?: string;
    draft?: boolean;
  },
  options: { auditUserId?: string } = {},
): Promise<{
  number: number;
  url: string;
  state: string;
  draft: boolean;
  head: string;
  base: string;
}> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls",
    {
      owner,
      repo,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base ?? "main",
      draft: input.draft ?? true,
    },
  );
  return {
    number: data.number,
    url: data.html_url,
    state: data.state,
    draft: data.draft ?? false,
    head: data.head.ref,
    base: data.base.ref,
  };
}
