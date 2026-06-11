/**
 * POST /api/my-project/[id]/evidence
 *
 * El cliente sube una evidencia desde su celular: foto, archivo o nota.
 * multipart/form-data:
 *   - file?    : la foto o archivo (se sube a Vercel Blob)
 *   - caption? : descripción / comentario de la evidencia
 *   - kind?    : 'photo' | 'file' | 'text'  (se infiere del archivo si falta)
 *
 * Guarda en evidence_vault, registra el hito en project_timeline y avisa a Luis
 * por WhatsApp. Sólo miembros ACTIVOS del proyecto.
 */
import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import { requireMember } from "@/lib/projects/membership";
import { uploadEvidence, blobConfigured } from "@/lib/blob/upload";
import { addTimelineEvent } from "@/lib/projects/timeline";
import { notifyOwner } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await requireMember(id);
  if (!member) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "form inválido" }, { status: 400 });
  }

  const file = form.get("file");
  const caption = (form.get("caption") as string | null)?.trim() ?? "";
  let kind = (form.get("kind") as string | null)?.trim() ?? "";

  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !caption) {
    return NextResponse.json(
      { error: "Sube una foto/archivo o escribe una nota" },
      { status: 400 },
    );
  }

  let rawUrl: string | null = null;
  if (hasFile) {
    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera 15 MB" },
        { status: 413 },
      );
    }
    if (!blobConfigured()) {
      return NextResponse.json(
        { error: "Almacenamiento no disponible" },
        { status: 503 },
      );
    }
    const up = await uploadEvidence(id, f, Date.now());
    rawUrl = up.url;
    if (!kind) kind = f.type.startsWith("image/") ? "photo" : "file";
  } else {
    kind = "text";
  }

  const text = caption || (kind === "photo" ? "Foto del cliente" : "Evidencia");

  const inserted = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO evidence_vault
       (project_slug, kind, raw_url, transcript, interpretation, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [id, kind, rawUrl, text, text, member.email],
  );

  await addTimelineEvent(id, {
    stage: "Cliente",
    status: "in_progress",
    title:
      kind === "photo"
        ? "📷 El cliente subió una foto"
        : kind === "file"
          ? "📎 El cliente subió un archivo"
          : "📝 El cliente dejó una nota",
    detail: caption || null,
  });

  const project = await queryOne<{ name: string }>(
    `SELECT name FROM projects WHERE id = $1`,
    [id],
  );
  notifyOwner(
    `📷 Evidencia nueva en ${project?.name ?? id}\nDe: ${member.name}\n${caption ? `"${caption}"` : ""}${rawUrl ? `\n${rawUrl}` : ""}`,
  ).catch(() => null);

  return NextResponse.json(
    {
      evidence: {
        id: inserted?.id,
        kind,
        raw_url: rawUrl,
        transcript: text,
        created_at: inserted?.created_at,
        created_by: member.email,
      },
    },
    { status: 201 },
  );
}
