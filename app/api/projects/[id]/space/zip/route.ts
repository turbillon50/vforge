import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const identity = await getCurrentVForgeIdentity();
        if (!identity) throw new Error("not_authorized");
        return {
          allowedContentTypes: ["application/zip", "application/octet-stream", "application/x-zip-compressed"],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: projectId,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_failed";
    const status = message === "not_authorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
