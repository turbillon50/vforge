import "server-only";

import { normalizeReferenceUrl } from "@/lib/live/project-references";
import { extractReadableText } from "@/lib/live/read-page";

export interface ReadPageResult {
  url: string;
  title: string;
  text: string;
}

const MAX_PAGES = 10;
const MAX_BYTES = 100_000;
const TIMEOUT_MS = 6_000;

async function readOne(url: string): Promise<ReadPageResult | null> {
  const safe = normalizeReferenceUrl(url);
  if (!safe) return null;
  try {
    const response = await fetch(safe, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "text/html, text/plain;q=0.9",
        "User-Agent": "VForgeRoomReader/1.0",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (
      !type.includes("text/html") &&
      !type.includes("text/plain") &&
      !type.includes("application/xhtml")
    ) {
      return null;
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    const slice = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const extracted = extractReadableText(html);
    if (!extracted.text) return null;
    return { url: safe, title: extracted.title, text: extracted.text.slice(0, 2500) };
  } catch {
    return null;
  }
}

export async function readPublicPages(urls: string[]): Promise<ReadPageResult[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    const safe = normalizeReferenceUrl(url);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    unique.push(safe);
    if (unique.length >= MAX_PAGES) break;
  }
  const pages = await Promise.all(unique.map(readOne));
  return pages.filter((page): page is ReadPageResult => Boolean(page));
}
