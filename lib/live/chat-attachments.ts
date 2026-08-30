import { parseEyeImage } from "./see-page";
import type { VisionFrame } from "./expediente-vision";

export interface RawChatAttachment {
  name?: unknown;
  mime?: unknown;
  data?: unknown;
}

export interface ParsedChatAttachment {
  name: string;
  kind: "image" | "text";
  mimeType: string;
  data: string;
  text?: string;
}

const MAX_FILES = 4;
const MAX_B64 = 1_800_000;
const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/json",
  "image/svg+xml",
]);

function safeName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const base = raw.replace(/[\/\\]+/g, " ").slice(0, 80);
  return base || "adjunto";
}

function decodeText(data: string): string {
  try {
    return Buffer.from(data, "base64").toString("utf8").replace(/\u0000/g, "").trim();
  } catch {
    return "";
  }
}

export function parseChatAttachments(raw: unknown): ParsedChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedChatAttachment[] = [];
  for (const item of raw) {
    if (out.length >= MAX_FILES) break;
    if (!item || typeof item !== "object") continue;
    const row = item as RawChatAttachment;
    const name = safeName(row.name);
    const mime = typeof row.mime === "string" ? row.mime.toLowerCase().split(";")[0].trim() : "";
    const data = typeof row.data === "string" ? row.data.replace(/\s/g, "") : "";
    if (!data || data.length > MAX_B64) continue;
    if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
      const parsed = parseEyeImage(`data:${mime || "image/jpeg"};base64,${data}`) || parseEyeImage(data);
      if (!parsed) continue;
      out.push({
        name,
        kind: "image",
        mimeType: parsed.mimeType,
        data: parsed.data,
      });
      continue;
    }
    const looksText =
      TEXT_MIMES.has(mime) || /\.(txt|md|csv|json|svg|html?)$/i.test(name);
    if (!looksText) continue;
    const text = decodeText(data).slice(0, 8000);
    if (text.length < 2) continue;
    out.push({
      name,
      kind: "text",
      mimeType: mime || "text/plain",
      data,
      text,
    });
  }
  return out;
}

export function attachmentFrames(files: ParsedChatAttachment[]): VisionFrame[] {
  return files
    .filter((file) => file.kind === "image")
    .slice(0, 3)
    .map((file) => ({
      mimeType: file.mimeType === "image/png" ? "image/png" : "image/jpeg",
      data: file.data,
      label: `adjunto · ${file.name}`,
    }));
}

export function attachmentTextBrief(files: ParsedChatAttachment[]): string {
  const texts = files.filter((file) => file.kind === "text" && file.text?.trim());
  if (!texts.length) return "";
  const lines = [
    `ADJUNTOS DE ESTE TURNO (${texts.length}). Léelos. Son ejemplos o referencias que el owner acaba de pegar.`,
  ];
  for (const file of texts) {
    lines.push(`### ${file.name}`);
    lines.push(file.text || "");
  }
  return lines.join("\n");
}

export function attachmentUserNote(message: string, files: ParsedChatAttachment[]): string {
  const names = files.map((file) => file.name).join(", ");
  const body = message.trim() || (files.length ? "Mira este adjunto." : "");
  if (!files.length) return body;
  return `${body}\n\n[adjunto: ${names}]`;
}
