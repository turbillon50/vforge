import type { VisionFrame } from "@/lib/live/expediente-vision";
import { parseEyeImage } from "@/lib/live/see-page";

export interface ChatAttachment {
  name: string;
  mime: string;
  data: string;
}

export function parseChatAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  for (const item of raw.slice(0, 4)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.slice(0, 80) : "foto";
    const mime = typeof rec.mime === "string" ? rec.mime : "image/jpeg";
    const data = typeof rec.data === "string" ? rec.data.trim() : "";
    if (!data) continue;
    if (!/^image\//i.test(mime) && !data.startsWith("data:image/")) continue;
    out.push({ name, mime, data });
  }
  return out;
}

export function framesFromAttachments(files: ChatAttachment[]): VisionFrame[] {
  const frames: VisionFrame[] = [];
  for (const file of files) {
    const parsed = parseEyeImage(file.data);
    if (!parsed) continue;
    frames.push({
      mimeType: parsed.mimeType,
      data: parsed.data,
      label: `attach · ${file.name}`,
    });
  }
  return frames;
}
