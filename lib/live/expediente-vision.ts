export interface ExpedienteEye {
  source: string;
  viewport?: string | null;
  note?: string | null;
  mime_type: "image/png" | "image/jpeg" | string;
  data_b64: string;
}

export interface VisionFrame {
  mimeType: "image/png" | "image/jpeg";
  data: string;
  label: string;
}

const VISOR_ORDER = ["desktop", "mobile", "admin"];

export function pickExpedienteFrames(
  eyes: ExpedienteEye[],
  limit = 3,
): VisionFrame[] {
  const cap = Math.min(4, Math.max(1, Math.floor(limit)));
  const attach = eyes.filter((eye) => eye.source === "attach" && eye.data_b64?.trim());
  const visor = eyes
    .filter((eye) => eye.source === "visor" && eye.data_b64?.trim())
    .sort(
      (a, b) =>
        VISOR_ORDER.indexOf(a.viewport || "") -
        VISOR_ORDER.indexOf(b.viewport || ""),
    );
  const rest = eyes.filter(
    (eye) =>
      eye.source !== "visor" &&
      eye.source !== "attach" &&
      eye.data_b64?.trim(),
  );
  return [...attach, ...visor, ...rest].slice(0, cap).map((eye) => {
    const view = eye.viewport?.trim() || eye.source;
    const note = eye.note?.trim();
    return {
      mimeType: eye.mime_type === "image/png" ? "image/png" : "image/jpeg",
      data: eye.data_b64.replace(/\s/g, ""),
      label: note ? `${eye.source} · ${view} — ${note}` : `${eye.source} · ${view}`,
    };
  });
}

export function visionUserContent(
  message: string,
  frames: VisionFrame[],
): Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
> {
  const labels = frames.map((frame) => frame.label).join(", ");
  const parts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: `${message.trim()}\n\nFOTOS (${frames.length}): ${labels}. Ya las viste. No pidas que te las reenvíen.`,
    },
  ];
  for (const frame of frames) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${frame.mimeType};base64,${frame.data}`,
      },
    });
  }
  return parts;
}
