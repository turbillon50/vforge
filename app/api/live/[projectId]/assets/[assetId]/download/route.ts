import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  projectAssetApiPath,
} from "@/lib/api/vforge-owned";
import { isSafeProjectBlobPath, safeArchiveName } from "@/lib/live/review-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const upstream = await fetchVForgeApi(projectAssetApiPath(projectId, assetId), identity, { signal: req.signal });
    if (!upstream.ok) return NextResponse.json({ error: "not_found" }, { status: upstream.status });
    const payload = (await upstream.json()) as { asset?: { filename?: string; blob_pathname?: string } };
    const pathname = payload.asset?.blob_pathname;
    if (!pathname || !isSafeProjectBlobPath(projectId, pathname)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
    const blob = await get(pathname, { access: "private", token, useCache: false });
    if (!blob) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeArchiveName(payload.asset?.filename || "conversacion.zip")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
