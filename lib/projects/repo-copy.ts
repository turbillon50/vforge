import "server-only";
import { getGithubClient } from "@/lib/github/client";
const TARGET_BRANCH = "main";

// Copia el contenido de un repo a otro con la API de Git de GitHub (sin clonar), 8 archivos a la vez.
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface SkippedCopyItem {
  path: string;
  reason: string;
  size?: number;
  message?: string;
}

export interface CopyReport {
  copied_files: number;
  skipped: SkippedCopyItem[];
  truncated: boolean;
}

export function parseFullRepo(value: string) {
  const [owner, repo, extra] = value.split("/");
  if (!owner || !repo || extra) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}


export async function copyRepoWithGitApi({
  octokit,
  source,
  sourceBranch,
  target,
}: {
  octokit: Awaited<ReturnType<typeof getGithubClient>>;
  source: { owner: string; repo: string };
  sourceBranch: string;
  target: { owner: string; repo: string };
}): Promise<CopyReport> {
  const branch = await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
    owner: source.owner,
    repo: source.repo,
    branch: sourceBranch,
  });
  const tree = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: source.owner,
      repo: source.repo,
      tree_sha: branch.data.commit.sha,
      recursive: "true",
    },
  );

  const skipped: SkippedCopyItem[] = [];
  const targetTree: Array<{
    path: string;
    mode: "100644" | "100755" | "120000";
    type: "blob";
    sha: string;
  }> = [];

  // Copia en paralelo (8 a la vez): una demo de cientos de archivos cabe en el tiempo límite.
  const copiar = async (item: (typeof tree.data.tree)[number]) => {
    if (!item.path) return;

    if (item.type === "commit") {
      skipped.push({ path: item.path, reason: "submodule" });
      return;
    }
    if (item.type !== "blob") return;

    const size = typeof item.size === "number" ? item.size : undefined;
    if (size !== undefined && size > MAX_FILE_BYTES) {
      skipped.push({ path: item.path, reason: "too_large", size });
      return;
    }
    if (!item.sha) {
      skipped.push({ path: item.path, reason: "missing_blob_sha" });
      return;
    }

    try {
      const sourceBlob = await octokit.request(
        "GET /repos/{owner}/{repo}/git/blobs/{file_sha}",
        {
          owner: source.owner,
          repo: source.repo,
          file_sha: item.sha,
        },
      );
      const createdBlob = await octokit.request(
        "POST /repos/{owner}/{repo}/git/blobs",
        {
          owner: target.owner,
          repo: target.repo,
          content: sourceBlob.data.content,
          encoding: "base64",
        },
      );
      targetTree.push({
        path: item.path,
        mode: copyableBlobMode(item.mode),
        type: "blob",
        sha: createdBlob.data.sha,
      });
    } catch (error) {
      skipped.push({
        path: item.path,
        reason: "copy_failed",
        size,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const cola = [...tree.data.tree];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let item = cola.shift(); item; item = cola.shift()) await copiar(item);
    }),
  );

  if (tree.data.truncated) {
    skipped.push({
      path: "/",
      reason: "tree_truncated",
      message: "GitHub devolvio el arbol truncado; copia parcial.",
    });
  }

  const newTree = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
    owner: target.owner,
    repo: target.repo,
    tree: targetTree,
  });
  const commit = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
    owner: target.owner,
    repo: target.repo,
    message: `Crear base desde ${source.owner}/${source.repo}`,
    tree: newTree.data.sha,
    parents: [],
  });
  await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
    owner: target.owner,
    repo: target.repo,
    ref: `refs/heads/${TARGET_BRANCH}`,
    sha: commit.data.sha,
  });
  await octokit.request("PATCH /repos/{owner}/{repo}", {
    owner: target.owner,
    repo: target.repo,
    default_branch: TARGET_BRANCH,
  });

  return {
    copied_files: targetTree.length,
    skipped,
    truncated: Boolean(tree.data.truncated),
  };
}

function copyableBlobMode(mode: string | undefined): "100644" | "100755" | "120000" {
  return mode === "100755" || mode === "120000" ? mode : "100644";
}

