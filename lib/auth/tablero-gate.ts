/**
 * Quién puede mirar y mover el centro de mando.
 *
 * Dos llaves, las dos de dueño, ninguna nueva:
 *   1. Sesión de Clerk cuyo email esté en OWNER_EMAILS — Luis en el navegador.
 *   2. `Authorization: Bearer VFORGE_OPERATOR_TOKEN` — la misma vía que ya usan
 *      /api/admin/* y /api/oauth/* para curl y CLI del owner. Sirve para medir
 *      el tablero sin navegador (QA, capturas) y para que Vulcano lo consulte.
 *
 * Si el token no está configurado en el entorno, esa vía simplemente no existe:
 * no abre nada, solo deja de ofrecerse.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { requireOperatorAuth } from "@/lib/auth/operator-token";

export type Dueno = { ok: true; quien: string } | { ok: false };

export async function requireDueno(req: Request): Promise<Dueno> {
  if (process.env.VFORGE_OPERATOR_TOKEN?.trim()) {
    const r = requireOperatorAuth(req);
    if (r.ok) return { ok: true, quien: "operator" };
  }
  const user = await currentUser().catch(() => null);
  if (isOwnerUser(user)) {
    return {
      ok: true,
      quien: user?.emailAddresses?.[0]?.emailAddress ?? "dueño",
    };
  }
  return { ok: false };
}
