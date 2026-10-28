import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";

export const runtime = "nodejs";

const SAFE = /[^a-zA-Z0-9._-]/g;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return NextResponse.json({ error: "not_authorized" }, { status: 401 });

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  const sha256 = String(form.get("sha256") || "");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }
  if (file.size > 50_000_000) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const clean = (file.name || "archivo.zip").replace(SAFE, "_").slice(-80);
  const pathname = `spaces/${projectId}/zips/${Date.now()}-${clean}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: "application/zip",
    token,
  });

  return NextResponse.json({
    ok: true,
    url: blob.url,
    pathname: blob.pathname,
    sha256,
    size: file.size,
    assetId: blob.pathname,
  });
}
