/**
 * Puente server-side al "Ojo de Vulcano" (ojo-api.py en Hetzner, expuesto en
 * https://metamcp.vforge.site/ojo/*). El token NUNCA se manda al cliente: solo
 * vive aquí y en las variables de entorno de Vercel (OJO_TOKEN).
 */
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const OJO_BASE = (process.env.OJO_BASE ?? "https://metamcp.vforge.site/ojo").replace(/\/$/, "");
export const OJO_TOKEN = process.env.OJO_TOKEN ?? "ojo-vulcano-7c3aed22d3ee";

/** Solo el owner (Luis/Jaime) puede tocar la Forja. */
export async function isOwnerRequest(): Promise<boolean> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return false;
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "owner") return true;
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    return isOwnerUser(u);
  } catch {
    return false;
  }
}

/** GET a un path del Ojo con token inyectado. */
export async function ojoGet(path: string): Promise<Response> {
  const url = `${OJO_BASE}/${path}${path.includes("?") ? "&" : "?"}token=${OJO_TOKEN}`;
  return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
}
