import { auth } from "@clerk/nextjs/server";
import { CATALOG } from "@/lib/integrations/catalog";
import {
  getPlan,
  setItemStatus,
  refreshConnectedStatus,
  type ItemStatus,
} from "@/lib/integrations/plan-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/plan — plan de conexiones del usuario actual.
 * Refresca primero el estado contra su vault, luego lo devuelve hidratado
 * con la metadata del catálogo. Cada usuario ve SOLO su propio plan.
 */
function hydrate(items: Awaited<ReturnType<typeof getPlan>>) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const out = sorted.map((it) => {
    const svc = CATALOG[it.id];
    return {
      id: it.id,
      name: svc?.name ?? it.id,
      why: it.why || svc?.why || "",
      connectKind: svc?.connectKind ?? "manual",
      signupUrl: svc?.signupUrl ?? "",
      keyHint: svc?.keyHint ?? null,
      validateHint: svc?.validateHint ?? null,
      oauthStart: svc?.oauthStart ?? null,
      connectApi: svc?.connectApi ?? null,
      status: it.status,
    };
  });
  const total = out.length;
  const done = out.filter((i) => i.status === "connected").length;
  return { items: out, progress: { done, total } };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    await refreshConnectedStatus(userId);
    const items = await getPlan(userId);
    return Response.json(hydrate(items));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

const VALID: ItemStatus[] = ["pending", "connected", "skipped"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    serviceId?: string;
    status?: ItemStatus;
  };

  if (body.action !== "set" || !body.serviceId || !body.status)
    return Response.json({ error: "bad_request" }, { status: 400 });
  if (!VALID.includes(body.status))
    return Response.json({ error: "invalid_status" }, { status: 400 });

  try {
    const items = await setItemStatus(userId, body.serviceId, body.status);
    return Response.json(hydrate(items));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
