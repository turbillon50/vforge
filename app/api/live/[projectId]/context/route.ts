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

async function proxy(req: NextRequest, projectId: string, method: "GET" | "PUT") {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  const body = method === "PUT" ? await req.text() : undefined;
  try {
    const upstream = await fetchVForgeApi(projectApiPath(projectId, "context"), identity, {
      method,
      headers: method === "PUT" ? { "Content-Type": "application/json" } : undefined,
      body,
      signal: req.signal,
    });
    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503, headers: noStore });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return proxy(req, projectId, "GET");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return proxy(req, projectId, "PUT");
}
