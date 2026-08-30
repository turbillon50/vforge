import { NextRequest, NextResponse } from "next/server";
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { resolveMcpToken } from "@/lib/mcp/tokens";
import { authorizeMcpProject } from "@/lib/mcp/tools";
import { listProjectEyes, saveProjectEye } from "@/lib/live/project-eyes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const noStore = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function canWrite(req: NextRequest, projectId: string): Promise<boolean> {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer.startsWith("vfmcp_")) {
    const principal = await resolveMcpToken(bearer);
    if (!principal) return false;
    return Boolean(await authorizeMcpProject(projectId, principal));
  }
  const live = await loadVForgeLiveProject(projectId).catch(() => null);
  return Boolean(live);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: noStore });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await canWrite(req, projectId))) {
    return NextResponse.json({ error: "no auth" }, { status: 401, headers: noStore });
  }
  const rows = await listProjectEyes(projectId, 8);
  return NextResponse.json(
    {
      eyes: rows.map((row) => ({
        id: row.id,
        source: row.source,
        url: row.url,
        selector: row.selector,
        note: row.note,
        mimeType: row.mime_type,
        createdAt: row.created_at,
      })),
    },
    { headers: noStore },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!(await canWrite(req, projectId))) {
    return NextResponse.json({ error: "no auth" }, { status: 401, headers: noStore });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const image = typeof body?.image === "string" ? body.image : "";
  if (!image) {
    return NextResponse.json({ error: "falta image" }, { status: 400, headers: noStore });
  }
  try {
    const saved = await saveProjectEye({
      projectId,
      source: typeof body?.source === "string" ? body.source : "plugin",
      viewport: typeof body?.viewport === "string" ? body.viewport : null,
      url: typeof body?.url === "string" ? body.url : null,
      selector: typeof body?.selector === "string" ? body.selector : null,
      note: typeof body?.note === "string" ? body.note : null,
      image,
    });
    return NextResponse.json(
      { ok: true, id: saved.id, mimeType: saved.mime_type },
      { headers: noStore },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "no se guardó" },
      { status: 400, headers: noStore },
    );
  }
}
