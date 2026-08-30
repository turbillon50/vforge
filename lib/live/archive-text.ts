import { unzipSync, type UnzipFileInfo } from "fflate";

const MAX_EXTRACTED_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_FILES = 80;
const MAX_SCAN_ENTRIES = 50_000;
const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "csv", "html", "htm"]);

function isTextEntry(info: UnzipFileInfo): boolean {
  const name = info.name.toLowerCase();
  const base = name.split("/").pop() ?? name;
  if (name.endsWith("/") || info.originalSize < 0) return false;
  if (base === "_chat.txt" || base.startsWith("whatsapp chat") || base.includes("chat de whatsapp")) {
    return true;
  }
  const extension = base.includes(".") ? base.split(".").pop() ?? "" : "";
  return TEXT_EXTENSIONS.has(extension);
}

function decodeText(data: Uint8Array): string {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(data);
  }
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(data);
  }
  const start = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf ? 3 : 0;
  return new TextDecoder("utf-8", { fatal: false }).decode(data.slice(start));
}

export function extractArchiveText(input: Uint8Array): string {
  let declaredBytes = 0;
  let scanned = 0;
  let textFiles = 0;
  const files = unzipSync(input, {
    filter(info) {
      scanned += 1;
      if (scanned > MAX_SCAN_ENTRIES) return false;
      if (!isTextEntry(info)) return false;
      if (textFiles >= MAX_TEXT_FILES) return false;
      if (declaredBytes + info.originalSize > MAX_EXTRACTED_BYTES) return false;
      textFiles += 1;
      declaredBytes += info.originalSize;
      return true;
    },
  });

  const decoderSections = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => `\n--- ${name.replace(/[\r\n]/g, " ")} ---\n${decodeText(data).replace(/\0/g, "")}`);
  const joined = decoderSections.join("\n").trim();
  if (!joined) return "";
  const encoded = new TextEncoder().encode(joined);
  if (encoded.byteLength <= MAX_EXTRACTED_BYTES) return joined;
  return new TextDecoder("utf-8", { fatal: false }).decode(encoded.slice(0, MAX_EXTRACTED_BYTES)).trim();
}
