import { queryOne } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    await queryOne<{ ok: number }>("SELECT 1 AS ok");
    return Response.json(
      {
        service: "vforge-api",
        status: "ok",
        database: "ok",
        time: new Date().toISOString(),
      },
      { headers },
    );
  } catch {
    return Response.json(
      {
        service: "vforge-api",
        status: "degraded",
        database: "error",
        time: new Date().toISOString(),
      },
      { status: 503, headers },
    );
  }
}
