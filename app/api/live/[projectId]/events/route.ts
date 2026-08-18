/**
 * BFF del portal en vivo — actividad del proyecto.
 * Clerk se resuelve aquí; Hetzner vuelve a validar el rol contra Neon.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectApiPath,
} from "@/lib/api/vforge-owned";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const { projectId } = await params;
  const rawSince = req.nextUrl.searchParams.get("since");
  let path = projectApiPath(projectId, "events");
  if (rawSince) {
    const since = new Date(rawSince);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "invalid_since" },
        { status: 400, headers: noStore },
      );
    }
    path += `?since=${encodeURIComponent(rawSince.trim())}`;
  }

  try {
    const upstream = await fetchVForgeApi(path, identity, { signal: req.signal });
    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
