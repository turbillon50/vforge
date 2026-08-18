/**
 * Alias v1 de /api/forge/run.
 *
 * P0: el handler subyacente (app/api/forge/run/route) confía en que el
 * middleware ya filtró y solo dejó pasar al owner — pero ese gating owner-only
 * cubre `/api/forge(.*)`, NO `/api/v1/forge/run`. Sin este guard, el alias
 * exponía el chat/tools de V a cualquier sesión. Aquí verificamos que sea el
 * owner ANTES de delegar.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { POST as forgeRun } from "@/app/api/forge/run/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  if (!isOwnerUser(user)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return forgeRun(req);
}
