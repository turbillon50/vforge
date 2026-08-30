import { unzipSync, type UnzipFileInfo } from "fflate";

const MAX_EXTRACTED_BYTES = 2 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "csv", "html", "htm"]);

function isTextEntry(info: UnzipFileInfo): boolean {
  const name = info.name.toLowerCase();
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  return !name.endsWith("/") && TEXT_EXTENSIONS.has(extension);
}

export function extractArchiveText(input: Uint8Array): string {
  let declaredBytes = 0;
  const files = unzipSync(input, {
    filter(info) {
      if (!isTextEntry(info) || info.originalSize < 0) return false;
      if (declaredBytes + info.originalSize > MAX_EXTRACTED_BYTES) return false;
      declaredBytes += info.originalSize;
      return true;
    },
  });

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const sections = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => `\n--- ${name.replace(/[\r\n]/g, " ")} ---\n${decoder.decode(data).replace(/\0/g, "")}`);
  const joined = sections.join("\n").trim();
  if (!joined) return "";
  const encoded = new TextEncoder().encode(joined);
  if (encoded.byteLength <= MAX_EXTRACTED_BYTES) return joined;
  return decoder.decode(encoded.slice(0, MAX_EXTRACTED_BYTES)).trim();
}
