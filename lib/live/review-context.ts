export type ReviewViewport = "desktop" | "mobile" | "admin";

export interface ReviewAnchor {
  viewport: ReviewViewport;
  x: number;
  y: number;
  url: string;
  label: string;
}

export interface AnchoredComment {
  id: string;
  anchor: ReviewAnchor;
}

const VIEWPORTS = new Set<ReviewViewport>(["desktop", "mobile", "admin"]);
const ZIP_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

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
  return {
    viewport: raw.viewport as ReviewViewport,
    x: Math.round(raw.x * 10_000) / 10_000,
    y: Math.round(raw.y * 10_000) / 10_000,
    url,
    label: label || `${raw.viewport} · ${Math.round(raw.x * 100)}%, ${Math.round(raw.y * 100)}%`,
  };
}

export function isAcceptedZip(filename: string, contentType: string, size: number): boolean {
  return (
    filename.trim().toLowerCase().endsWith(".zip") &&
    ZIP_TYPES.has(contentType.trim().toLowerCase()) &&
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
