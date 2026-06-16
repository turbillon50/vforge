import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { runSelfAudit } from "@/lib/forge/self-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v-self-audit
 *
 * Reporte de auto-diagnóstico de V. Cruza BD ↔ docs ↔ código para
 * distinguir lo real de lo alucinado. La lógica vive en
 * lib/forge/self-audit.ts para que la tool `self_audit` la pueda
 * invocar directamente sin un round-trip HTTP.
 */
export async function GET() {
  const user = await currentUser();
  if (!user || !isOwnerEmail(user.emailAddresses[0]?.emailAddress)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const report = await runSelfAudit();
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
