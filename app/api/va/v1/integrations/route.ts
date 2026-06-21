import { checkVaAuth, vaUnauthorized } from "@/lib/va/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/va/v1/integrations — qué tiene conectado VForge (contrato-va-v1).
 * NUNCA expone el valor de las keys: solo presencia (ok|missing).
 */
export async function GET(req: Request) {
  if (!checkVaAuth(req)) return vaUnauthorized();

  const has = (...names: string[]) => names.some((n) => Boolean(process.env[n]));

  const integrations = [
    {
      key: "clerk",
      status: has("CLERK_SECRET_KEY") ? "ok" : "missing",
    },
    {
      key: "resend",
      status: has("RESEND_API_KEY") ? "ok" : "missing",
    },
    {
      key: "stripe",
      status: has("STRIPE_SECRET_KEY") ? "ok" : "missing",
    },
    {
      key: "mercadopago",
      status: has("MP_ACCESS_TOKEN") ? "ok" : "missing",
    },
    {
      key: "whatsapp",
      status: has("BAILEYS_SECRET", "WHATSAPP_BRIDGE_SECRET", "BAILEYS_URL")
        ? "ok"
        : "missing",
    },
    {
      key: "vapid",
      status: has("VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY")
        ? "ok"
        : "missing",
    },
    {
      key: "neon",
      status: has("DATABASE_URL") ? "ok" : "missing",
    },
  ];

  return Response.json({ ok: true, integrations });
}
