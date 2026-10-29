import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { requireOperatorAuth } from "@/lib/auth/operator-token";

/** Same owner boundary as V's cockpit, also enforced inside each route. */
export async function requireVOwner(req: Request): Promise<{ userId: string } | Response> {
  try {
    if (requireOperatorAuth(req).ok) return { userId: "operator_luis" };
  } catch {
    // Malformed bearer input must never prevent the normal owner check.
  }
  const owner = await resolveRequestOwner();
  if (owner.isOwner && owner.userId) return { userId: owner.userId };
  return Response.json({ error: owner.userId ? "Acceso reservado al propietario." : "Inicia sesión para hablar con V." }, {
    status: owner.userId ? 403 : 401, headers: { "Cache-Control": "no-store" },
  });
}
