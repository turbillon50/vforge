import { clerkClient } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { checkVaAuth, vaUnauthorized } from "@/lib/va/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/va/v1/users — usuarios reales desde Clerk (contrato-va-v1).
 * VForge maneja roles Owner / Associate / Client.
 *   - role = publicMetadata.role si está presente.
 *   - sino owner por email de plataforma -> "owner".
 *   - default -> "client".
 * Si no hay Clerk configurado -> total:0, users:[].
 */
export async function GET(req: Request) {
  if (!checkVaAuth(req)) return vaUnauthorized();

  if (!process.env.CLERK_SECRET_KEY) {
    return Response.json({ ok: true, total: 0, users: [] });
  }

  try {
    const cc = await clerkClient();
    const list = await cc.users.getUserList({ limit: 100, orderBy: "-created_at" });
    const total =
      typeof list.totalCount === "number" ? list.totalCount : list.data.length;

    const users = list.data.map((u) => {
      const email = u.emailAddresses?.[0]?.emailAddress ?? null;
      const metaRole = (u.publicMetadata as { role?: string } | null)?.role;
      const role = metaRole
        ? metaRole
        : isOwnerEmail(email)
          ? "owner"
          : "client";
      const name =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.username ||
        email ||
        u.id;
      return {
        id: u.id,
        name,
        email,
        role,
        last_seen: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
      };
    });

    return Response.json({ ok: true, total, users });
  } catch (e) {
    console.error("[va/users]", e);
    return Response.json({ ok: true, total: 0, users: [] });
  }
}
