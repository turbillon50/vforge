export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/navegador/control/route.ts
// Control del navegador visible (Chrome 138 vía VNC) en el contenedor
// docker 'vulcano-browser' de Hetzner. Se maneja con CDP (puerto 9222
// DENTRO del contenedor) a través del relay Hetzner /brain/exec.
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { NextResponse } from "next/server";

const RELAY = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "";
const CONTAINER = "vulcano-browser";
const CDP = "http://localhost:9222";

type Action = "navigate" | "tabs" | "close" | "eval" | "click" | "type" | "read";

/** Ejecuta un cmd en Hetzner vía el relay y devuelve el stdout (texto). */
async function relayExec(cmd: string): Promise<string> {
  const res = await fetch(`${RELAY}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, cmd }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`relay HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  // El relay devuelve el stdout en alguno de estos campos según versión.
  const out =
    (data?.stdout ?? data?.output ?? data?.result ?? data?.data ?? "") as unknown;
  return typeof out === "string" ? out : JSON.stringify(out);
}

/** Acepta solo URLs http/https — evita inyección de comandos por la url. */
function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}


/** Llama al controlador CDP (cdp_control.py) dentro del contenedor con un comando JSON. */
async function cdpControl(payload: Record<string, unknown>): Promise<unknown> {
  const json = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `docker exec ${CONTAINER} python3 /home/kasm-user/cdp_control.py '${json}'`;
  const stdout = await relayExec(cmd);
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return { ok: false, raw: stdout };
  }
}

export async function POST(req: Request) {
  // Auth: solo owners.
  const user = await currentUser();
  if (!user || !isOwnerUser(user as any)) {
    return NextResponse.json({ ok: false, error: "no auth" }, { status: 401 });
  }

  let body: { action?: Action; url?: string; target_id?: string; selector?: string; text?: string; expr?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "body inválido" },
      { status: 400 }
    );
  }

  const action = body.action;

  try {
    if (action === "navigate") {
      const url = safeHttpUrl(body.url);
      if (!url) {
        return NextResponse.json(
          { ok: false, action, error: "url inválida (solo http/https)" },
          { status: 400 }
        );
      }
      const cmd = `docker exec ${CONTAINER} curl -s -X PUT "${CDP}/json/new?${encodeURIComponent(
        url
      )}"`;
      const stdout = await relayExec(cmd);
      let target: unknown = stdout;
      try {
        target = JSON.parse(stdout);
      } catch {
        /* devolvemos el texto crudo si no es JSON */
      }
      return NextResponse.json({ ok: true, action, result: target });
    }

    if (action === "tabs") {
      const cmd = `docker exec ${CONTAINER} curl -s ${CDP}/json`;
      const stdout = await relayExec(cmd);
      let pages: Array<{ id: string; url: string; title: string }> = [];
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          pages = parsed
            .filter((t) => t?.type === "page")
            .map((t) => ({ id: t.id, url: t.url, title: t.title }));
        }
      } catch {
        return NextResponse.json(
          { ok: false, action, error: "no se pudo parsear la lista de pestañas", raw: stdout },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, action, result: pages });
    }

    if (action === "eval" || action === "read") {
      const expr = action === "read"
        ? "document.body ? document.body.innerText.slice(0, 4000) : ''"
        : (typeof body.expr === "string" ? body.expr : "document.title");
      const result = await cdpControl({ action: "eval", expr });
      return NextResponse.json({ ok: true, action, result });
    }

    if (action === "click") {
      if (typeof body.selector !== "string" || !body.selector.trim()) {
        return NextResponse.json({ ok: false, action, error: "selector requerido" }, { status: 400 });
      }
      const result = await cdpControl({ action: "click", selector: body.selector });
      return NextResponse.json({ ok: true, action, result });
    }

    if (action === "type") {
      if (typeof body.selector !== "string" || !body.selector.trim()) {
        return NextResponse.json({ ok: false, action, error: "selector requerido" }, { status: 400 });
      }
      const result = await cdpControl({ action: "type", selector: body.selector, text: body.text ?? "" });
      return NextResponse.json({ ok: true, action, result });
    }

    if (action === "close") {
      const targetId = body.target_id;
      if (!targetId || !/^[A-Za-z0-9._-]+$/.test(targetId)) {
        return NextResponse.json(
          { ok: false, action, error: "target_id inválido" },
          { status: 400 }
        );
      }
      const cmd = `docker exec ${CONTAINER} curl -s -X PUT "${CDP}/json/close/${targetId}"`;
      const stdout = await relayExec(cmd);
      return NextResponse.json({ ok: true, action, result: stdout });
    }

    return NextResponse.json(
      { ok: false, error: `acción no soportada: ${String(action)}` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        action: action ?? null,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
