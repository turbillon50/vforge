export type ReviewViewport = "desktop" | "mobile" | "admin";

export interface ReviewAnchor {
  viewport: ReviewViewport;
  x: number;
  y: number;
  url: string;
  label: string;
  documentX?: number;
  documentY?: number;
  selector?: string;
}

export interface ReviewBridgeViewport {
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
}

export interface AnchoredComment {
  id: string;
  anchor: ReviewAnchor;
}

const VIEWPORTS = new Set<ReviewViewport>(["desktop", "mobile", "admin"]);
export const ACCEPTED_ZIP_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "multipart/x-zip",
] as const;

const ZIP_TYPES = new Set<string>(ACCEPTED_ZIP_CONTENT_TYPES);

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export function parseReviewAnchor(value: unknown): ReviewAnchor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.viewport !== "string" || !VIEWPORTS.has(raw.viewport as ReviewViewport)) {
    return null;
  }
  if (
    typeof raw.x !== "number" ||
    typeof raw.y !== "number" ||
    !Number.isFinite(raw.x) ||
    !Number.isFinite(raw.y) ||
    raw.x < 0 ||
    raw.x > 1 ||
    raw.y < 0 ||
    raw.y > 1
  ) {
    return null;
  }
  const url = cleanUrl(raw.url);
  if (!url) return null;
  const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 120) : "";
  const documentX = finiteDocumentCoordinate(raw.documentX);
  const documentY = finiteDocumentCoordinate(raw.documentY);
  const selector =
    typeof raw.selector === "string"
      ? raw.selector.trim().slice(0, 300)
      : "";
  return {
    viewport: raw.viewport as ReviewViewport,
    x: Math.round(raw.x * 10_000) / 10_000,
    y: Math.round(raw.y * 10_000) / 10_000,
    url,
    label: label || `${raw.viewport} · ${Math.round(raw.x * 100)}%, ${Math.round(raw.y * 100)}%`,
    ...(documentX != null && documentY != null ? { documentX, documentY } : {}),
    ...(selector ? { selector } : {}),
  };
}

function finiteDocumentCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000_000
    ? Math.round(value * 100) / 100
    : null;
}

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10_000_000
    ? value
    : null;
}

export function parseReviewBridgeHit(value: unknown): {
  selector: string;
  text: string;
  documentX: number;
  documentY: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.source !== "vforge-review-bridge" || raw.type !== "hit" || raw.version !== 1) {
    return null;
  }
  const documentX = finiteDocumentCoordinate(raw.documentX);
  const documentY = finiteDocumentCoordinate(raw.documentY);
  if (documentX == null || documentY == null) return null;
  const selector =
    typeof raw.selector === "string" ? raw.selector.trim().slice(0, 300) : "";
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 80) : "";
  return { selector, text, documentX, documentY };
}

/** Origin + pathname. Query y hash no deben mover un ancla. */
export function anchorPageKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return url.split("?")[0].split("#")[0] || url;
  }
}

export function sameReviewPage(left: string, right: string): boolean {
  return anchorPageKey(left) === anchorPageKey(right);
}

export function parseReviewBridgeViewport(value: unknown): ReviewBridgeViewport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.source !== "vforge-review-bridge" || raw.type !== "viewport" || raw.version !== 1) {
    return null;
  }
  const scrollX = finiteDocumentCoordinate(raw.scrollX);
  const scrollY = finiteDocumentCoordinate(raw.scrollY);
  const viewportWidth = finitePositive(raw.viewportWidth);
  const viewportHeight = finitePositive(raw.viewportHeight);
  const documentWidth = finitePositive(raw.documentWidth);
  const documentHeight = finitePositive(raw.documentHeight);
  if (
    scrollX == null ||
    scrollY == null ||
    viewportWidth == null ||
    viewportHeight == null ||
    documentWidth == null ||
    documentHeight == null
  ) {
    return null;
  }
  return {
    scrollX,
    scrollY,
    viewportWidth,
    viewportHeight,
    documentWidth,
    documentHeight,
  };
}

export function documentPointForAnchor(
  x: number,
  y: number,
  bridge: ReviewBridgeViewport | null,
): Pick<ReviewAnchor, "documentX" | "documentY"> | Record<string, never> {
  if (!bridge) return {};
  return {
    documentX: Math.round((bridge.scrollX + x * bridge.viewportWidth) * 100) / 100,
    documentY: Math.round((bridge.scrollY + y * bridge.viewportHeight) * 100) / 100,
  };
}

export function anchorViewportPosition(
  anchor: ReviewAnchor,
  bridge: ReviewBridgeViewport | null,
): { x: number; y: number; visible: boolean } {
  if (bridge && anchor.documentX != null && anchor.documentY != null) {
    const x = (anchor.documentX - bridge.scrollX) / bridge.viewportWidth;
    const y = (anchor.documentY - bridge.scrollY) / bridge.viewportHeight;
    return { x, y, visible: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
  }
  return { x: anchor.x, y: anchor.y, visible: true };
}

export function isAcceptedZip(filename: string, contentType: string, size: number): boolean {
  const type = contentType.trim().toLowerCase();
  return (
    filename.trim().toLowerCase().endsWith(".zip") &&
    (!type || ZIP_TYPES.has(type)) &&
    Number.isInteger(size) &&
    size > 0 &&
    size <= 50 * 1024 * 1024
  );
}

export function safeArchiveName(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return (clean || "conversacion.zip").slice(-120);
}

export function isSafeProjectBlobPath(projectId: string, pathname: string): boolean {
  const prefix = `context/${projectId}/`;
  if (!pathname.startsWith(prefix) || pathname.length <= prefix.length || pathname.includes("\\")) {
    return false;
  }
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  return decoded.split("/").every((segment) => segment !== "." && segment !== "..");
}
