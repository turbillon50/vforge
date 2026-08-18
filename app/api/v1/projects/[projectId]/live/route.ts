import { hasInternalApiAccess } from "@/lib/api/internal-auth";
import { resolveLiveAccessForIdentity } from "@/lib/projects/access";
import { getProjectViewports } from "@/lib/projects/live-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  if (!hasInternalApiAccess(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const userId = req.headers.get("x-vforge-user-id")?.trim();
  const email = req.headers.get("x-vforge-user-email")?.trim();
  const name = req.headers.get("x-vforge-user-name")?.trim() || null;
  if (!userId || !email) {
    return Response.json({ error: "invalid_identity" }, { status: 400, headers: noStore });
  }

  const { projectId } = await params;
  const access = await resolveLiveAccessForIdentity(projectId, {
    userId,
    email,
    name,
  });
  if (!access) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const project = await getProjectViewports(projectId);
  if (!project) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const canSeeAdmin = access.role === "owner" || access.role === "reviewer";
  return Response.json(
    {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        desktop_url: project.desktop_url,
        mobile_url: project.mobile_url,
        admin_url: canSeeAdmin ? project.admin_url : null,
      },
      me: {
        name: access.name,
        role: access.role,
        isPlatformOwner: access.isPlatformOwner,
      },
    },
    { headers: noStore },
  );
}
