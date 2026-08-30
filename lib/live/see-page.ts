/**
 * Ojos de la sala: captura Escritorio / Móvil / Admin en un Chrome aislado
 * (sin cookies del owner) y las devuelve como imagen MCP.
 */
const RELAY = (process.env.VULCANO_RELAY_URL || "http://178.105.135.26").replace(
  /\/$/,
  "",
);
const CONTAINER = "vulcano-browser";
const CAPTURE_TIMEOUT_MS = 25_000;
const MAX_BASE64_CHARS = 1_800_000;

export const SEE_VIEWPORTS = {
  desktop: { width: 1440, height: 900, label: "Escritorio", mobile: false },
  mobile: { width: 390, height: 844, label: "Móvil", mobile: true },
  admin: { width: 1280, height: 800, label: "Administración", mobile: false },
} as const;

export type SeeViewportId = keyof typeof SEE_VIEWPORTS;

export interface SeeShot {
  viewport: SeeViewportId;
  label: string;
  url: string;
  mimeType: "image/png";
  data: string;
}

export interface SeeFailure {
  viewport: SeeViewportId;
  label: string;
  url: string | null;
  error: string;
}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function shSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function isSafeCaptureUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseSeeViewports(raw: unknown): SeeViewportId[] {
  if (raw === undefined || raw === null || raw === "") {
    return ["desktop", "mobile"];
  }
  const values = Array.isArray(raw) ? raw : [raw];
  const next: SeeViewportId[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const key = value.trim().toLowerCase();
    if (key === "all") return ["desktop", "mobile", "admin"];
    if (key === "desktop" || key === "mobile" || key === "admin") {
      if (!next.includes(key)) next.push(key);
    }
  }
  return next.length ? next : ["desktop", "mobile"];
}

export function isPngBase64(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, "");
  if (trimmed.length < 80 || trimmed.length > MAX_BASE64_CHARS) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return false;
  try {
    const header = Buffer.from(trimmed.slice(0, 24), "base64");
    return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  } catch {
    return false;
  }
}

/** El relay a veces mezcla logs; el PNG en base64 empieza por iVBORw0KGgo. */
export function extractPngBase64(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "");
  const idx = compact.indexOf("iVBORw0KGgo");
  if (idx < 0) return isPngBase64(compact) ? compact : null;
  const candidate = compact.slice(idx).replace(/[^A-Za-z0-9+/=]/g, "");
  return isPngBase64(candidate) ? candidate : null;
}

const CAPTURE_SCRIPT = `set -euo pipefail
URL="$1"
W="$2"
H="$3"
MOBILE="$4"
OUT="/tmp/vforge-see-$$.png"
PROF="/tmp/vforge-see-profile-$$"
BIN="$(command -v google-chrome-stable || command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [ -z "$BIN" ]; then
  for c in /usr/bin/google-chrome /usr/bin/google-chrome-stable /opt/google/chrome/chrome /usr/lib/chromium/chromium; do
    if [ -x "$c" ]; then BIN="$c"; break; fi
  done
fi
if [ -z "$BIN" ]; then
  echo "NO_CHROME" >&2
  exit 2
fi
UA=()
if [ "$MOBILE" = "1" ]; then
  UA=(--user-agent=${JSON.stringify(MOBILE_UA)})
fi
"$BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \\
  --hide-scrollbars --force-device-scale-factor=1 \\
  --user-data-dir="$PROF" --window-size="$W,$H" "\${UA[@]}" \\
  --virtual-time-budget=12000 --screenshot="$OUT" "$URL" \\
  >/tmp/vforge-see-chrome-$$.log 2>&1 || true
if [ ! -s "$OUT" ]; then
  echo "NO_SHOT" >&2
  cat /tmp/vforge-see-chrome-$$.log >&2 || true
  rm -rf "$PROF"
  exit 3
fi
base64 -w0 "$OUT"
rm -f "$OUT"
rm -rf "$PROF"
`;

export function buildSeeHostCommand(input: {
  url: string;
  width: number;
  height: number;
  mobile: boolean;
}): string {
  if (!isSafeCaptureUrl(input.url)) {
    throw new Error("url insegura");
  }
  const scriptB64 = Buffer.from(CAPTURE_SCRIPT, "utf8").toString("base64");
  return [
    `echo ${scriptB64} | base64 -d | docker exec -i ${CONTAINER} bash -s --`,
    shSingleQuote(input.url),
    String(input.width),
    String(input.height),
    input.mobile ? "1" : "0",
  ].join(" ");
}

async function relayExec(cmd: string): Promise<string> {
  const secret = process.env.BRAIN_SECRET ?? "";
  if (!secret) throw new Error("ojos no disponibles: falta el relay");
  const res = await fetch(`${RELAY}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, cmd }),
    cache: "no-store",
    signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`relay HTTP ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const out = (data.stdout ?? data.output ?? data.result ?? data.data ?? "") as unknown;
  return typeof out === "string" ? out : JSON.stringify(out);
}

export async function captureOneViewport(input: {
  viewport: SeeViewportId;
  url: string;
}): Promise<SeeShot> {
  const spec = SEE_VIEWPORTS[input.viewport];
  const cmd = buildSeeHostCommand({
    url: input.url,
    width: spec.width,
    height: spec.height,
    mobile: spec.mobile,
  });
  const stdout = await relayExec(cmd);
  const data = extractPngBase64(stdout);
  if (!data) {
    const hint = stdout.replace(/\s+/g, " ").trim().slice(0, 180) || "sin salida";
    throw new Error(`no se pudo fotografiar ${spec.label}: ${hint}`);
  }
  return {
    viewport: input.viewport,
    label: spec.label,
    url: input.url,
    mimeType: "image/png",
    data,
  };
}

export async function captureSeeViewports(input: {
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  viewports: SeeViewportId[];
}): Promise<{ shots: SeeShot[]; failures: SeeFailure[] }> {
  const urls: Record<SeeViewportId, string | null> = {
    desktop: input.desktop_url,
    mobile: input.mobile_url,
    admin: input.admin_url,
  };
  const results = await Promise.all(
    input.viewports.map(async (viewport) => {
      const url = urls[viewport];
      const label = SEE_VIEWPORTS[viewport].label;
      if (!url || !isSafeCaptureUrl(url)) {
        return {
          ok: false as const,
          failure: {
            viewport,
            label,
            url: url || null,
            error: "Sin URL autorizada para esta vista",
          },
        };
      }
      try {
        return { ok: true as const, shot: await captureOneViewport({ viewport, url }) };
      } catch (error) {
        return {
          ok: false as const,
          failure: {
            viewport,
            label,
            url,
            error: error instanceof Error ? error.message : "captura fallida",
          },
        };
      }
    }),
  );
  const shots: SeeShot[] = [];
  const failures: SeeFailure[] = [];
  for (const result of results) {
    if (result.ok) shots.push(result.shot);
    else failures.push(result.failure);
  }
  return { shots, failures };
}

export function mcpSeeResult(
  projectName: string,
  projectId: string,
  result: { shots: SeeShot[]; failures: SeeFailure[] },
): { content: Array<Record<string, unknown>>; isError?: boolean } {
  if (result.shots.length === 0) {
    const detail = result.failures
      .map((item) => `- ${item.label}: ${item.error}`)
      .join("\n");
    return {
      content: [
        {
          type: "text",
          text: `No pude ver ${projectName} (${projectId}).\n${detail || "Sin vistas disponibles."}`,
        },
      ],
      isError: true,
    };
  }
  const lines = [
    `Ojos de la sala — ${projectName} (${projectId}).`,
    ...result.shots.map(
      (shot) =>
        `• ${shot.label} ${SEE_VIEWPORTS[shot.viewport].width}×${SEE_VIEWPORTS[shot.viewport].height} — ${shot.url}`,
    ),
    ...result.failures.map((item) => `• ${item.label} no se vio: ${item.error}`),
  ];
  return {
    content: [
      { type: "text", text: lines.join("\n") },
      ...result.shots.map((shot) => ({
        type: "image",
        data: shot.data,
        mimeType: shot.mimeType,
      })),
    ],
  };
}
