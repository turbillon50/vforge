import { checkVaAuth, vaUnauthorized } from "@/lib/va/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/va/v1/ping — handshake + identidad (contrato-va-v1).
 * VForge = plataforma para developers (SaaS pay-per-use).
 * capabilities solo lista lo que realmente aplica según env presentes.
 */
export async function GET(req: Request) {
  if (!checkVaAuth(req)) return vaUnauthorized();

  const hasClerk = Boolean(process.env.CLERK_SECRET_KEY);
  const hasDb = Boolean(process.env.DATABASE_URL);

  const capabilities = ["integrations"];
  if (hasClerk) capabilities.push("users");
  if (hasDb) capabilities.push("db-stats", "analytics");

  return Response.json({
    ok: true,
    app: { slug: "vforge", name: "VForge", type: "saas" },
    contract: "v1",
    capabilities,
    vocabulary: {
      items: "Proyectos",
      orders: "Builds",
      customers: "Developers",
    },
  });
}
