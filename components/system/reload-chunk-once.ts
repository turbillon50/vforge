"use client";

const CHUNK_ERROR_RE =
  /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i;

export function reloadChunkErrorOnce(error: Error): boolean {
  const text = `${error.name ?? ""} ${error.message ?? ""}`;
  if (!CHUNK_ERROR_RE.test(text)) return false;

  try {
    const key = `vf-chunk-reload:${window.location.pathname}`;
    if (window.sessionStorage.getItem(key) === "1") return false;
    window.sessionStorage.setItem(key, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
