import { randomUUID } from "node:crypto";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { loadVForgeLiveProject } from "@/lib/api/vforge-owned";
import { isAcceptedZip, safeArchiveName } from "@/lib/live/review-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const live = await loadVForgeLiveProject(projectId).catch(() => null);
  if (!live) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (live.me.role === "observer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const filename = typeof body?.filename === "string" ? safeArchiveName(body.filename) : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = Number(body?.size);
  if (!isAcceptedZip(filename, contentType, size)) {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }
  const storeToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!storeToken) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });

  const pathname = `context/${projectId}/${Date.now()}-${randomUUID()}-${filename}`;
  const clientToken = await generateClientTokenFromReadWriteToken({
    token: storeToken,
    pathname,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: 50 * 1024 * 1024,
    validUntil: Date.now() + 10 * 60 * 1000,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return NextResponse.json({ pathname, clientToken, access: "private" }, { headers: { "Cache-Control": "no-store" } });
}
