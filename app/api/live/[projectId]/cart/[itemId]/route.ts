import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectCartItemApiPath,
} from "@/lib/api/vforge-owned";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  try {
    const upstream = await fetchVForgeApi(projectCartItemApiPath(projectId, itemId), identity, {
      method: "DELETE",
      signal: req.signal,
    });
    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: noStore });
  }
}
