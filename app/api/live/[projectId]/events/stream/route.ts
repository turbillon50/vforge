/**
 * Proxy SSE autenticado. El browser conserva la sesión Clerk del mismo origen;
 * solo el BFF conoce el token interno usado para llegar a Hetzner.
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
export const maxDuration = 300;

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
  let path = projectApiPath(projectId, "events/stream");
  if (rawSince) {
    const since = new Date(rawSince);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "invalid_since" },
        { status: 400, headers: noStore },
      );
    }
    path += `?since=${encodeURIComponent(since.toISOString())}`;
  }

  try {
    const upstream = await fetchVForgeApi(path, identity, {
      headers: { Accept: "text/event-stream" },
      signal: req.signal,
    });
    if (!upstream.ok || !upstream.body) return mirrorJsonResponse(upstream);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
