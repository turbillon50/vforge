export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// app/api/navegador/control/route.ts
// Control del navegador visible (Chrome 138 vía VNC) en el contenedor
// docker 'vulcano-browser' de Hetzner. Se maneja con CDP (puerto 9222
// DENTRO del contenedor) a través del relay Hetzner /brain/exec.
// Helpers compartidos con el bucle ver→arreglar→verificar en lib/forja/browser.ts.
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { NextResponse } from "next/server";
import { CONTAINER, CDP, relayExec, safeHttpUrl, cdpControl } from "@/lib/forja/browser";

type Action = "navigate" | "tabs" | "close" | "eval" | "click" | "type" | "read";

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
