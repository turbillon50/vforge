/**
 * Proxy SSE autenticado. El browser conserva la sesión Clerk del mismo origen;
 * solo el BFF conoce el token interno usado para llegar a Hetzner.
 *
 * Ciclo suave: el stream se cierra limpio antes del límite de la plataforma y
 * EventSource reconecta solo usando `retry:`. Sin esto, cada conexión moría a
 * los 300s como "Vercel Runtime Timeout Error" (55 errores en 2 días).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  mirrorJsonResponse,
  projectApiPath,
} from "@/lib/api/vforge-owned";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOFT_CLOSE_MS = 55_000;
const RETRY_HINT_MS = 2_500;

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const { projectId } = await params;
  const rawSince = req.nextUrl.searchParams.get("since");
  let path = projectApiPath(projectId, "events/stream");
  if (rawSince) {
    const since = new Date(rawSince);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "invalid_since" },
        { status: 400, headers: noStore },
      );
    }
    path += `?since=${encodeURIComponent(rawSince.trim())}`;
  }

  try {
    const softAbort = new AbortController();
    const upstream = await fetchVForgeApi(path, identity, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.any([req.signal, softAbort.signal]),
    });
    if (!upstream.ok || !upstream.body) return mirrorJsonResponse(upstream);

    const encoder = new TextEncoder();
    const upstreamBody = upstream.body;
    let softTimer: ReturnType<typeof setTimeout> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Le dice al EventSource cada cuanto reintentar tras un cierre limpio.
        controller.enqueue(encoder.encode(`retry: ${RETRY_HINT_MS}\n\n`));

        softTimer = setTimeout(() => {
          try {
            controller.enqueue(
              encoder.encode('event: cycle\ndata: {"reason":"soft_close"}\n\n'),
            );
          } catch {
            // El controller pudo cerrarse justo antes; no pasa nada.
          }
          softAbort.abort();
        }, SOFT_CLOSE_MS);

        const reader = upstreamBody.getReader();
        void (async () => {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
          } catch {
            // Abort esperado: soft close o el cliente se desconectó.
          } finally {
            if (softTimer) clearTimeout(softTimer);
            try {
              controller.close();
            } catch {
              // Ya estaba cerrado.
            }
          }
        })();
      },
      cancel() {
        if (softTimer) clearTimeout(softTimer);
        softAbort.abort();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "service_unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
