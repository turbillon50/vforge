export type EvidenceKind = "screenshot" | "text" | "voice";
export type ProcessState = "listo" | "falta" | "sugerencia";

export const EVIDENCE_KINDS = new Set<EvidenceKind>([
  "screenshot",
  "text",
  "voice",
]);

export const PROCESS_STATES = new Set<ProcessState>([
  "listo",
  "falta",
  "sugerencia",
]);

const PROJECT_RE = /^[a-z0-9][a-z0-9_-]{0,119}$/;

export function normalizeProjectSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return PROJECT_RE.test(slug) ? slug : null;
}

export function normalizeOptionalText(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, max);
}

export function normalizeProcessName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, 120);
}

export function parseEvidenceKind(value: unknown): EvidenceKind | null {
  if (typeof value !== "string") return null;
  const kind = value.trim() as EvidenceKind;
  return EVIDENCE_KINDS.has(kind) ? kind : null;
}

export function parseProcessState(value: unknown): ProcessState | null {
  if (typeof value !== "string") return null;
  const state = value.trim() as ProcessState;
  return PROCESS_STATES.has(state) ? state : null;
}

export function clampTranscript(value: string, max = 16000): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 32).trim()}\n\n[recortado por longitud]`;
}

export function summarizeText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Sin contenido legible todavía.";
  if (compact.length <= 260) return compact;

  const sentences =
    compact.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [];
  const firstSentences = sentences.slice(0, 2).join(" ").trim();
  const base = firstSentences.length >= 120 ? firstSentences : compact.slice(0, 260);
  return `${base.slice(0, 340).trim()}...`;
}

export function buildInterpretation(kind: EvidenceKind, transcript: string): string {
  const summary = summarizeText(transcript);
  if (kind === "screenshot") {
    return `Screenshot recibido. Resumen operativo: ${summary}`;
  }
  if (kind === "voice") {
    return `Nota de voz registrada. Resumen operativo: ${summary}`;
  }
  return `Texto registrado. Resumen operativo: ${summary}`;
}

export function fileMetaLine(file: Blob, fallbackName: string): string {
  const maybeFile = file as File;
  const name = maybeFile.name || fallbackName;
  const type = file.type || "tipo desconocido";
  const kb = Math.max(1, Math.round(file.size / 1024));
  return `${name} · ${type} · ${kb} KB`;
}

export function mimeToExt(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}
