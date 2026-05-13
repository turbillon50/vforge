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

// ─── Read ops added in claude/expand-capabilities ─────────────────────

export interface DirectoryEntry {
  name: string;
  type: "file" | "dir" | "submodule" | "symlink";
  size: number;
  path: string;
  sha: string;
}

/**
 * List the contents of a directory in a repo without downloading file
 * bodies. For files at `path`, the API returns a single object; for
 * directories, an array. We normalize both to an array.
 */
export async function listDirectory(
  owner: string,
  repo: string,
  path: string,
  options: { branch?: string; auditUserId?: string } = {},
): Promise<DirectoryEntry[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  // The API rejects a leading "/", so strip it; "/" means repo root.
  const normalizedPath = path === "/" || path === "" ? "" : path.replace(/^\/+/, "");
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path: normalizedPath,
      ref: options.branch,
    },
  );
  const entries = Array.isArray(data) ? data : [data];
  return entries.map((e) => ({
    name: e.name,
    type: e.type as DirectoryEntry["type"],
    size: e.size ?? 0,
    path: e.path,
    sha: e.sha,
  }));
}

export interface CodeSearchHit {
  path: string;
  repo: string;
  score: number;
  /** Up to 3 short text fragments around the match. */
  fragments: string[];
}

/**
 * Search code inside a repo using GitHub's search API. The query goes
 * to GET /search/code with a `repo:owner/name` qualifier appended so
 * results stay scoped. Rate-limited at 30 req/min by GitHub.
 */
export async function searchCode(
  owner: string,
  repo: string,
  query: string,
  options: { perPage?: number; auditUserId?: string } = {},
): Promise<CodeSearchHit[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const q = `${query} repo:${owner}/${repo}`;
  const { data } = await octokit.request("GET /search/code", {
    q,
    per_page: options.perPage ?? 20,
    headers: {
      // text-match returns the fragments around each hit
      accept: "application/vnd.github.text-match+json",
    },
  });
  return (data.items ?? []).map((item) => ({
    path: item.path,
    repo: item.repository.full_name,
    score: item.score,
    fragments: (item.text_matches ?? [])
      .slice(0, 3)
      .map((t) => (t.fragment ?? "").slice(0, 240)),
  }));
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  head: string;
  base: string;
  user: string | null;
  created_at: string | null;
  updated_at: string | null;
  url: string;
}

/**
 * List Pull Requests in a repo, filtered by state.
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  options: {
    state?: "open" | "closed" | "all";
    perPage?: number;
    auditUserId?: string;
  } = {},
): Promise<PullRequestSummary[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    state: options.state ?? "open",
    per_page: options.perPage ?? 30,
    sort: "updated",
    direction: "desc",
  });
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft ?? false,
    head: pr.head.ref,
    base: pr.base.ref,
    user: pr.user?.login ?? null,
    created_at: pr.created_at ?? null,
    updated_at: pr.updated_at ?? null,
    url: pr.html_url,
  }));
}

// ─── Workflow / Actions ops (M5 alt — GitHub Actions as sandbox) ──────

export interface WorkflowRunSummary {
  id: number;
  name: string | null;
  status: string | null; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | skipped | timed_out | null
  head_branch: string | null;
  head_sha: string;
  url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  run_attempt: number;
}

/**
 * Dispatch a workflow_dispatch event. The GitHub API doesn't return
 * the resulting run_id, so we poll the list of recent runs and pick
 * the newest one for that workflow + branch. Pollable for ~5s before
 * giving up — the run usually shows up within 2s.
 */
export async function dispatchWorkflow(
  owner: string,
  repo: string,
  workflowFile: string,
  ref: string,
  inputs: Record<string, string>,
  options: { auditUserId?: string } = {},
): Promise<{ run_id: number | null; ref: string; workflow: string }> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });

  // Capture a high-water-mark BEFORE the dispatch so we only accept
  // runs created strictly after our request. Without this, a previous
  // workflow_dispatch on the same branch within the last 30s could be
  // mis-correlated as ours (Codex P1).
  const dispatchedAfter = Date.now();

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo,
      workflow_id: workflowFile,
      ref,
      inputs,
    },
  );

  // Poll for the freshly-created run. GitHub assigns the ID eagerly
  // but the listing has a small lag; 5s is enough in practice.
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
      { owner, repo, workflow_id: workflowFile, branch: ref, per_page: 5 },
    );
    const fresh = data.workflow_runs.find(
      (r) =>
        r.event === "workflow_dispatch" &&
        new Date(r.created_at).getTime() >= dispatchedAfter,
    );
    if (fresh) {
      return { run_id: fresh.id, ref, workflow: workflowFile };
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return { run_id: null, ref, workflow: workflowFile };
}

export async function getWorkflowRun(
  owner: string,
  repo: string,
  runId: number,
  options: { auditUserId?: string } = {},
): Promise<WorkflowRunSummary> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}",
    { owner, repo, run_id: runId },
  );
  return {
    id: data.id,
    name: data.name ?? null,
    status: data.status,
    conclusion: data.conclusion,
    head_branch: data.head_branch,
    head_sha: data.head_sha,
    url: data.html_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    run_started_at: data.run_started_at ?? null,
    run_attempt: data.run_attempt ?? 1,
  };
}

/**
 * Fetch workflow run logs as readable plain text.
 *
 * The run-level `/actions/runs/{id}/logs` endpoint returns a ZIP that
 * we'd need to decompress (extra dep + buffer mgmt). Instead we use
 * the per-job endpoint `/actions/jobs/{job_id}/logs` which returns
 * plain text directly. We concatenate all jobs of the run, prefix
 * each with a header, and truncate to maxBytes.
 * (Codex P2 — was returning ZIP-as-utf8 garbage.)
 */
export async function getWorkflowRunLogs(
  owner: string,
  repo: string,
  runId: number,
  options: { auditUserId?: string; maxBytes?: number } = {},
): Promise<{ text: string; truncated: boolean; size: number; jobs: number }> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const maxBytes = options.maxBytes ?? 100_000;

  // List jobs of this run.
  const { data: jobsData } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
    { owner, repo, run_id: runId, per_page: 30 },
  );

  const parts: string[] = [];
  let totalSize = 0;
  for (const job of jobsData.jobs ?? []) {
    if (totalSize >= maxBytes) break;
    try {
      // octokit returns the body as string for this text endpoint.
      const { data: logBody } = (await octokit.request(
        "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
        { owner, repo, job_id: job.id, request: { redirect: "follow" } },
      )) as unknown as { data: string };
      const body = typeof logBody === "string" ? logBody : String(logBody);
      const header = `\n══════ job ${job.id} · ${job.name} · ${job.conclusion ?? job.status} ══════\n`;
      parts.push(header);
      parts.push(body);
      totalSize += header.length + body.length;
    } catch {
      // A job may not have logs yet (still queued); skip.
      parts.push(`\n══════ job ${job.id} · ${job.name} · (logs unavailable) ══════\n`);
    }
  }

  const combined = parts.join("");
  const truncated = combined.length > maxBytes;
  const text = truncated ? combined.slice(0, maxBytes) : combined;
  return {
    text,
    truncated,
    size: combined.length,
    jobs: (jobsData.jobs ?? []).length,
  };
}

export async function createRepo(
  input: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  },
  options: { auditUserId?: string } = {},
): Promise<{
  full_name: string;
  url: string;
  clone_url: string;
  private: boolean;
  default_branch: string;
}> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request("POST /user/repos", {
    name: input.name,
    description: input.description ?? "",
    private: input.private ?? true,
    auto_init: input.auto_init ?? true,
  });
  return {
    full_name: data.full_name,
    url: data.html_url,
    clone_url: data.clone_url,
    private: data.private,
    default_branch: data.default_branch,
  };
}

export async function listRecentWorkflowRuns(
  owner: string,
  repo: string,
  workflowFile: string,
  options: { branch?: string; perPage?: number; auditUserId?: string } = {},
): Promise<WorkflowRunSummary[]> {
  const octokit = await getGithubClient({ auditUserId: options.auditUserId });
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
    {
      owner,
      repo,
      workflow_id: workflowFile,
      branch: options.branch,
      per_page: options.perPage ?? 10,
    },
  );
  return data.workflow_runs.map((r) => ({
    id: r.id,
    name: r.name ?? null,
    status: r.status,
    conclusion: r.conclusion,
    head_branch: r.head_branch,
    head_sha: r.head_sha,
    url: r.html_url,
    created_at: r.created_at,
    updated_at: r.updated_at,
    run_started_at: r.run_started_at ?? null,
    run_attempt: r.run_attempt ?? 1,
  }));
}
