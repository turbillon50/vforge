import { sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { refreshDemoVercelUrls } from "@/lib/projects/demo-vercel-urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });

  const result = await refreshDemoVercelUrls({ auditUserId: access.userId });

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${access.userId}, 'demos.urls.refresh', 'projects', 1,
      ${JSON.stringify(result)}::jsonb
    )
  `;

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
