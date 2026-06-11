import OpenAI from "openai";
import { resolveAccess } from "@/lib/connect/resolve-token";
import { sql } from "@/lib/db/client";
import {
  buildInterpretation,
  clampTranscript,
  fileMetaLine,
  mimeToExt,
  normalizeOptionalText,
  normalizeProcessName,
  normalizeProjectSlug,
  parseEvidenceKind,
  type EvidenceKind,
} from "@/lib/vault/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 12 * 1024 * 1024;

interface EvidenceRow {
  id: string;
  project_slug: string;
  kind: EvidenceKind;
  raw_url: string | null;
  transcript: string;
  interpretation: string;
  linked_process: string | null;
  created_by: string;
  created_at: string;
}

interface JsonUploadBody {
  project?: unknown;
  projectSlug?: unknown;
  kind?: unknown;
  text?: unknown;
  transcript?: unknown;
  rawUrl?: unknown;
  raw_url?: unknown;
  linkedProcess?: unknown;
  linked_process?: unknown;
}

export async function POST(req: Request) {
  const access = await resolveAccess();
  if (!access.userId) return jsonError("unauthorized", 401);
  if (!access.isOwner) return jsonError("forbidden", 403);

  const contentType = req.headers.get("content-type") ?? "";

  let payload: {
    project: string;
    kind: EvidenceKind;
    rawUrl: string | null;
    transcript: string;
    linkedProcess: string | null;
  };

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return jsonError("Body must be multipart/form-data", 400);
    const parsed = await parseMultipartUpload(form);
    if ("error" in parsed) return jsonError(parsed.error, parsed.status);
    payload = parsed.payload;
  } else {
    const body = (await req.json().catch(() => null)) as JsonUploadBody | null;
    if (!body) return jsonError("Invalid JSON body", 400);
    const parsed = parseJsonUpload(body);
    if ("error" in parsed) return jsonError(parsed.error, parsed.status);
    payload = parsed.payload;
  }

  const interpretation = buildInterpretation(payload.kind, payload.transcript);
  const inserted = (await sql`
    INSERT INTO evidence_vault (
      project_slug, kind, raw_url, transcript, interpretation,
      linked_process, created_by
    ) VALUES (
      ${payload.project}, ${payload.kind}, ${payload.rawUrl},
      ${payload.transcript}, ${interpretation},
      ${payload.linkedProcess}, ${access.userId}
    )
    RETURNING id, project_slug, kind, raw_url, transcript, interpretation,
              linked_process, created_by, created_at
  `) as EvidenceRow[];

  const evidence = inserted[0];

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'vault.evidence.upload', 'evidence', ${evidence.id}, 1,
      ${JSON.stringify({
        project_slug: payload.project,
        kind: payload.kind,
        linked_process: payload.linkedProcess,
        has_raw_url: !!payload.rawUrl,
      })}::jsonb
    )
  `;

  return json({ evidence }, 201);
}

async function parseMultipartUpload(
  form: FormData,
): Promise<
  | {
      payload: {
        project: string;
        kind: EvidenceKind;
        rawUrl: string | null;
        transcript: string;
        linkedProcess: string | null;
      };
    }
  | { error: string; status: number }
> {
  const project = normalizeProjectSlug(readString(form, "project", "projectSlug"));
  if (!project) return { error: "project is required", status: 400 };

  const kind = parseEvidenceKind(readString(form, "kind"));
  if (!kind) return { error: "kind must be screenshot, text, or voice", status: 400 };

  const rawUrl = normalizeOptionalText(readString(form, "rawUrl", "raw_url"), 2048);
  const linkedProcess = normalizeProcessName(
    readString(form, "linkedProcess", "linked_process"),
  );

  if (kind === "text") {
    const text = readString(form, "text", "transcript");
    if (!text?.trim()) return { error: "text is required", status: 400 };
    return {
      payload: {
        project,
        kind,
        rawUrl,
        transcript: clampTranscript(text),
        linkedProcess,
      },
    };
  }

  const file = readBlob(
    form,
    kind === "voice" ? ["audio", "file", "voice"] : ["screenshot", "file", "image"],
  );
  if (!file) return { error: `${kind} file is required`, status: 400 };

  if (kind === "screenshot") {
    if (file.size > MAX_SCREENSHOT_BYTES) {
      return { error: "screenshot too large", status: 413 };
    }
    const caption = normalizeOptionalText(readString(form, "text", "caption"), 4000);
    const meta = fileMetaLine(file, "screenshot");
    return {
      payload: {
        project,
        kind,
        rawUrl,
        transcript: clampTranscript(
          caption
            ? `Screenshot: ${meta}\nNota capturada: ${caption}`
            : `Screenshot: ${meta}\nSin OCR automatico todavia; revisar imagen original si raw_url esta disponible.`,
        ),
        linkedProcess,
      },
    };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "audio too large", status: 413 };
  }

  const transcript = await transcribeAudio(file);
  return {
    payload: {
      project,
      kind,
      rawUrl,
      transcript: clampTranscript(transcript),
      linkedProcess,
    },
  };
}

function parseJsonUpload(
  body: JsonUploadBody,
):
  | {
      payload: {
        project: string;
        kind: EvidenceKind;
        rawUrl: string | null;
        transcript: string;
        linkedProcess: string | null;
      };
    }
  | { error: string; status: number } {
  const project = normalizeProjectSlug(body.project ?? body.projectSlug);
  if (!project) return { error: "project is required", status: 400 };

  const kind = parseEvidenceKind(body.kind);
  if (!kind) return { error: "kind must be screenshot, text, or voice", status: 400 };
  if (kind !== "text") {
    return { error: "Use multipart/form-data for screenshot or voice", status: 415 };
  }

  const text =
    typeof body.text === "string"
      ? body.text
      : typeof body.transcript === "string"
        ? body.transcript
        : "";
  if (!text.trim()) return { error: "text is required", status: 400 };

  return {
    payload: {
      project,
      kind,
      rawUrl: normalizeOptionalText(body.rawUrl ?? body.raw_url, 2048),
      transcript: clampTranscript(text),
      linkedProcess: normalizeProcessName(body.linkedProcess ?? body.linked_process),
    },
  };
}

async function transcribeAudio(audio: Blob): Promise<string> {
  const meta = fileMetaLine(audio, "nota-voz.webm");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `TODO: transcripcion pendiente. Falta OPENAI_API_KEY. Audio recibido: ${meta}.`;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const mime = audio.type || "audio/webm";
    const maybeFile = audio as File;
    const filename = maybeFile.name || `nota-voz.${mimeToExt(mime)}`;
    const file = new File([audio], filename, { type: mime });
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
      response_format: "json",
    });
    const text = transcript.text?.trim();
    return text ? text : `Audio recibido sin texto reconocible: ${meta}.`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `TODO: transcripcion fallo con OPENAI_API_KEY configurada. Audio recibido: ${meta}. Error: ${message.slice(0, 240)}.`;
  }
}

function readString(form: FormData, ...names: string[]): string | null {
  for (const name of names) {
    const value = form.get(name);
    if (typeof value === "string") return value;
  }
  return null;
}

function readBlob(form: FormData, names: string[]): Blob | null {
  for (const name of names) {
    const value = form.get(name);
    if (value instanceof Blob) return value;
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}
