/**
 * BFF de comentarios del portal en vivo.
 * Tras un POST exitoso, si el autor no es owner de plataforma, push a owners.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectApiPath,
} from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { sendPushToOwners } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const maxBodyLength = 4_000;

async function context(projectId: string) {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return null;
  return { identity, path: projectApiPath(projectId, "comments") };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const requestContext = await context(projectId);
  if (!requestContext) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  try {
    const upstream = await fetchVForgeApi(
      requestContext.path + "?limit=200",
      requestContext.identity,
      { signal: req.signal },
    );
    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const requestContext = await context(projectId);
  if (!requestContext) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const payload: unknown = await req.json().catch(() => null);
  const raw =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).body
      : null;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "empty" }, { status: 400, headers: noStore });
  }
  if (raw.length > maxBodyLength) {
    return NextResponse.json({ error: "too_long" }, { status: 413, headers: noStore });
  }

  try {
    const upstream = await fetchVForgeApi(requestContext.path, requestContext.identity, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: raw }),
      signal: req.signal,
    });

    if (upstream.ok && !isOwnerEmail(requestContext.identity.email)) {
      const preview = raw.trim().length > 120 ? raw.trim().slice(0, 117) + "…" : raw.trim();
      const who = requestContext.identity.name || requestContext.identity.email;
      void sendPushToOwners({
        title: `Proyecto · mensaje nuevo`,
        body: `${who}: ${preview}`,
        url: `/app/live/${encodeURIComponent(projectId)}`,
      });
    }

    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
