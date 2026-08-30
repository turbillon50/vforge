import { randomUUID } from "node:crypto";
import { get, head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectApiPath,
} from "@/lib/api/vforge-owned";
import { extractArchiveText } from "@/lib/live/archive-text";
import { isAcceptedZip, isSafeProjectBlobPath, safeArchiveName } from "@/lib/live/review-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXTRACTED_CHARS = 2_097_152;

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const filename = typeof payload?.filename === "string" ? safeArchiveName(payload.filename) : "";
  const blobPathname = typeof payload?.blobPathname === "string" ? payload.blobPathname.trim() : "";
  const contentType = typeof payload?.contentType === "string" ? payload.contentType.trim().toLowerCase() : "application/zip";
  const size = Number(payload?.size);
  const extractedFromClient =
    typeof payload?.extractedText === "string" ? payload.extractedText.replace(/\0/g, "") : "";

  if (extractedFromClient.trim()) {
    if (!isAcceptedZip(filename, contentType, size) || extractedFromClient.length > MAX_EXTRACTED_CHARS) {
      return NextResponse.json({ error: "invalid_asset" }, { status: 400 });
    }
    const inlinePath = `context/${projectId}/inline-${randomUUID()}-${filename}`;
    const upstream = await fetchVForgeApi(projectApiPath(projectId, "assets"), identity, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        blobPathname: inlinePath,
        contentType: "application/zip",
        size,
        extractedText: extractedFromClient.slice(0, MAX_EXTRACTED_CHARS),
      }),
      signal: req.signal,
    });
    return mirrorJsonResponse(upstream);
  }

  if (!isSafeProjectBlobPath(projectId, blobPathname) || !isAcceptedZip(filename, contentType, size)) {
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
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    if (message === "archive_entry_limit") {
      return NextResponse.json(
        {
          error: "archive_too_large",
          notice: "El ZIP tiene demasiados archivos. Exporta el chat de WhatsApp sin incluir la galería.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error: "archive_processing_failed",
        notice: "No se pudo leer el ZIP. Vuelve a exportar el chat desde WhatsApp.",
      },
      { status: 422 },
    );
  }
}
