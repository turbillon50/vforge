import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3_500_000;

function blockedHost(hostname: string): boolean {
  const h = hostname.replace(/^[\[]|[\]]$/g, "").toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h === "metadata.google.internal" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.startsWith("127.") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    h.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  ) {
    return true;
  }
  return false;
}

function parseTarget(raw: string | null): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (blockedHost(url.hostname)) return null;
  return url;
}

function resolveRef(value: string, base: URL): string | null {
  const v = value.trim();
  if (
    !v ||
    v.startsWith("#") ||
    v.startsWith("data:") ||
    v.startsWith("blob:") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("javascript:")
  ) {
    return null;
  }
  try {
    const abs = new URL(v, base);
    if (abs.protocol !== "https:" && abs.protocol !== "http:") return null;
    if (blockedHost(abs.hostname)) return null;
    return abs.href;
  } catch {
    return null;
  }
}

function rewriteSrcset(value: string, base: URL): string {
  return value
    .split(",")
    .map((part) => {
      const bits = part.trim().split(/\s+/);
      const abs = resolveRef(bits[0] ?? "", base);
      if (!abs) return part.trim();
      bits[0] = abs;
      return bits.join(" ");
    })
    .join(", ");
}

function freezeHtml(html: string, base: URL): string {
  let out = html.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*\/\s*>/gi, "");
  out = out.replace(
    /\s(href|src|poster|action)=(["'])([^"']*)\2/gi,
    (_m, attr: string, q: string, val: string) => {
      const abs = resolveRef(val, base);
      if (!abs) return ` ${attr}=${q}${val}${q}`;
      return ` ${attr}=${q}${abs}${q}`;
    },
  );
  out = out.replace(
    /\s(srcset)=(["'])([^"']*)\2/gi,
    (_m, attr: string, q: string, val: string) => {
      return ` ${attr}=${q}${rewriteSrcset(val, base)}${q}`;
    },
  );
  const style =
    "<style data-vf-canvas>html,body{cursor:crosshair}[data-vf-sel]{outline:1px solid #111!important;outline-offset:2px}</style>";
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => `${m}${style}`);
  else out = style + out;
  return out;
}

export async function GET(req: Request) {
  const incoming = new URL(req.url);
  const target = parseTarget(incoming.searchParams.get("u"));
  if (!target) {
    return NextResponse.json({ error: "url_invalida" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetch(target.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; VForgeCanvas/1.0; +https://vforge.site)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const finalUrl = parseTarget(upstream.url);
    if (!finalUrl) {
      return NextResponse.json({ error: "redirect_bloqueado" }, { status: 400 });
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "pagina_grande" }, { status: 413 });
    }
    const html = freezeHtml(new TextDecoder("utf-8").decode(buf), finalUrl);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-frame-options": "SAMEORIGIN",
        "content-security-policy": "frame-ancestors 'self'",
        "referrer-policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ error: "no_se_pudo_cargar" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
