/**
 * Preview inline de una versión generada por V — SIN gastar builds de
 * Vercel. Si la versión trae un index.html lo servimos tal cual; si son
 * componentes React, servimos un shell estilizado con la lista de
 * archivos y el aviso "Preview completo al publicar".
 *
 * Embebible solo en iframes propios: frame-ancestors 'self' y sin
 * X-Frame-Options.
 */
import { getVersion, type BuildFile } from "@/lib/builder/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRAME_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "frame-ancestors 'self'",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await ctx.params;
  const version = await getVersion(versionId);
  if (!version) {
    return new Response(shellHtml("Versión no encontrada", []), {
      status: 404,
      headers: FRAME_HEADERS,
    });
  }

  const files: BuildFile[] = Array.isArray(version.files) ? version.files : [];
  const index = files.find((f) =>
    /(^|\/)index\.html?$/i.test(f.path ?? ""),
  );
  if (index?.content) {
    return new Response(index.content, { headers: FRAME_HEADERS });
  }

  return new Response(
    shellHtml(version.summary || "Versión", files),
    { headers: FRAME_HEADERS },
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shellHtml(title: string, files: BuildFile[]): string {
  const items = files
    .map(
      (f) =>
        `<li><span class="dot"></span><code>${escapeHtml(f.path ?? "")}</code></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background:
      radial-gradient(1100px 500px at 15% -10%, rgba(139,92,246,0.22), transparent 60%),
      radial-gradient(900px 500px at 110% 110%, rgba(34,211,238,0.16), transparent 60%),
      #0b0716;
    color: #ece9f6; padding: 24px;
  }
  .card {
    width: min(560px, 100%); border-radius: 20px; padding: 28px;
    background: rgba(255,255,255,0.045);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 70px rgba(0,0,0,0.45);
    backdrop-filter: blur(12px);
  }
  h1 { font-size: 19px; font-weight: 650; letter-spacing: -0.01em; }
  p.note {
    margin-top: 8px; font-size: 13.5px; color: var(--fg-secondary, rgba(236,233,246,0.78));
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px;
    font-size: 12px; padding: 6px 12px; border-radius: 999px;
    background: linear-gradient(90deg, rgba(139,92,246,0.25), rgba(34,211,238,0.18));
    border: 1px solid rgba(139,92,246,0.35); color: #d8ccff;
  }
  ul { list-style: none; margin-top: 18px; display: grid; gap: 8px; }
  li {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 12px; background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07); font-size: 13px;
  }
  .dot { width: 7px; height: 7px; border-radius: 999px; flex: none;
    background: linear-gradient(135deg, #8b5cf6, #22d3ee); }
  code { color: rgba(236,233,246,0.86); font-size: 12.5px; }
</style></head>
<body>
  <main class="card">
    <span class="badge">Preview completo al publicar</span>
    <h1>${escapeHtml(title)}</h1>
    <p class="note">Esta versión es código React: el preview real se ve al publicar (repo + deploy). Mientras, estos son sus archivos:</p>
    <ul>${items || "<li><span class='dot'></span><code>sin archivos</code></li>"}</ul>
  </main>
</body></html>`;
}
