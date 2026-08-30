/**
 * Link permanente de revisión (solo OWNER).
 * POST → crea o devuelve el token + URL pública /s/{token}
 */
import { NextRequest, NextResponse } from "next/server";
import { requireLiveAccess } from "@/lib/projects/access";
import { getProjectViewports } from "@/lib/projects/live-portal";
import { getOrCreateShareLink } from "@/lib/projects/share-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId, "owner");
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const project = await getProjectViewports(projectId);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  try {
    const token = await getOrCreateShareLink(projectId);
    const origin = req.nextUrl.origin;
    const shareUrl = `${origin}/s/${encodeURIComponent(token)}`;
    return NextResponse.json(
      {
        token,
        shareUrl,
        project: { id: project.id, name: project.name },
        permanent: true,
      },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json({ error: "share_failed" }, { status: 500, headers: noStore });
  }
}
