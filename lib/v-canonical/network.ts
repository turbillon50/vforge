import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
export function privateAddress(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) {
    const tail = x.slice(7);
    if (tail.includes(".")) return privateAddress(tail);
    const parts = tail.split(":");
    if (parts.length !== 2) return true;
    const a = parseInt(parts[0], 16),
      b = parseInt(parts[1], 16);
    return privateAddress([a >> 8, a & 255, b >> 8, b & 255].join("."));
  }
  if (x.includes(":")) {
    const first = parseInt(x.split(":")[0], 16);
    return (
      !Number.isFinite(first) ||
      first < 0x2000 ||
      first > 0x3fff ||
      x.startsWith("2001:db8")
    );
  }
  const a = x.split(".").map(Number);
  return (
    a.length !== 4 ||
    a[0] === 0 ||
    a[0] === 10 ||
    a[0] === 127 ||
    a[0] >= 224 ||
    (a[0] === 169 && a[1] === 254) ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && [0, 168].includes(a[1])) ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
    (a[0] === 198 && [18, 19].includes(a[1]))
  );
}
export async function publicHost(host: string) {
  host = host.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => privateAddress(a.address)))
    throw Error("Usa un servidor público de la conexión.");
}
export async function remoteFetch(endpoint: string, init: RequestInit = {}) {
  const u = new URL(endpoint);
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("HTTPS requerido.");
  await publicHost(u.hostname);
  return fetch(u, {
    ...init,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
  });
}
export async function boundedText(response: Response, max = 160000) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  let text = "";
  let bytes = 0;
  const d = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) throw Error("Respuesta demasiado grande.");
      text += d.decode(value, { stream: true });
    }
    return text + d.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export function inferenceEndpoint(
  engine: "cerebras" | "mesh",
  base: string,
): string {
  const clean = base.replace(/\/+$/, "");
  return (
    (engine === "mesh" ? clean.replace(/\/v1$/, "") + "/v1" : clean) +
    "/chat/completions"
  );
}
