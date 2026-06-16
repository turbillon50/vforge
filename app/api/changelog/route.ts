import { NextResponse } from "next/server";

// El token vive solo en env (Vercel: production/preview/development). Nunca en el repo:
// GitHub push-protection rechaza cualquier PAT hardcodeado.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "turbillon50/vforge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CommitCategory = "feat" | "fix" | "perf" | "refactor" | "other";

interface ChangelogCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date: string };
  };
  author?: { login?: string } | null;
}

function categorize(msg: string): CommitCategory {
  if (msg.startsWith("feat")) return "feat";
  if (msg.startsWith("fix")) return "fix";
  if (msg.startsWith("perf")) return "perf";
  if (msg.startsWith("refactor")) return "refactor";
  return "other";
}

function clean(msg: string): string {
  return msg
    .replace(/^(feat|fix|perf|refactor|chore|style|test|docs)(\([^)]+\))?:\s*/i, "")
    .split("\n")[0]
    .trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const perPage = "30";

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

    const r = await fetch(
      `https://api.github.com/repos/${REPO}/commits?per_page=${perPage}&page=${page}`,
      { headers, next: { revalidate: 300 } }
    );
    if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`);
    const commits = await r.json();

    const entries = (commits as ChangelogCommit[])
      .filter((c) => {
        const msg = (c.commit?.message || "").toLowerCase();
        return !msg.startsWith("merge") && !msg.startsWith("wip") && msg.length > 10;
      })
      .map((c) => ({
        sha: c.sha.slice(0, 7),
        date: c.commit.author?.date,
        message: clean(c.commit.message),
        category: categorize(c.commit.message.toLowerCase()),
        url: c.html_url,
        author: c.commit.author?.name || c.author?.login || "VForge",
      }));

    return NextResponse.json({ ok: true, entries, total: entries.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), entries: [] }, { status: 500 });
  }
}
