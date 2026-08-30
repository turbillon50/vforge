import { get, head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectApiPath,
} from "@/lib/api/vforge-owned";
import { extractArchiveText } from "@/lib/live/archive-text";
import { isAcceptedZip, safeArchiveName } from "@/lib/live/review-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const filename = typeof payload?.filename === "string" ? safeArchiveName(payload.filename) : "";
  const blobPathname = typeof payload?.blobPathname === "string" ? payload.blobPathname.trim() : "";
  const contentType = typeof payload?.contentType === "string" ? payload.contentType.trim().toLowerCase() : "";
  const size = Number(payload?.size);
  if (!blobPathname.startsWith(`context/${projectId}/`) || !isAcceptedZip(filename, contentType, size)) {
    return NextResponse.json({ error: "invalid_asset" }, { status: 400 });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });

  try {
    const metadata = await head(blobPathname, { token });
    if (metadata.pathname !== blobPathname || metadata.size !== size) {
      return NextResponse.json({ error: "blob_mismatch" }, { status: 409 });
    }
    const result = await get(blobPathname, { access: "private", token, useCache: false });
    if (!result) return NextResponse.json({ error: "blob_missing" }, { status: 404 });
    const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
    const extractedText = extractArchiveText(bytes);
    const upstream = await fetchVForgeApi(projectApiPath(projectId, "assets"), identity, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, blobPathname, contentType, size, extractedText }),
      signal: req.signal,
    });
    return mirrorJsonResponse(upstream);
  } catch {
    return NextResponse.json({ error: "archive_processing_failed" }, { status: 422 });
  }
}
