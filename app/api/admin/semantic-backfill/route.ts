import { lastEmbedError, backfillFromHistory } from "@/lib/forge/semantic-recall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/semantic-backfill
 *
 * Memoriza un lote del historial pasado (conversations + v_user_memory)
 * en semantic_memory con embeddings OpenAI. Procesa un lote por llamada;
 * repetir hasta que remaining sea 0. Owner-only: el middleware ya
 * protege /api/admin/*.
 */
export async function POST(req: Request) {
  let limit = 500;
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 2000) {
      limit = Math.floor(body.limit);
    }
  } catch {
    // body opcional
  }
  void req;
  const result = await backfillFromHistory(limit);
  return new Response(JSON.stringify({ ...result, debug: lastEmbedError }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
