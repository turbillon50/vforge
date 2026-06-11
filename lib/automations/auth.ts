/** Helpers de autorización para las rutas de Automatizaciones / CRM / Social. */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";

export interface OwnerGate {
  ok: boolean;
  email: string | null;
}

/** Gate de owner (Luis / Jaime) reutilizando el esquema existente de Clerk. */
export async function ownerGate(): Promise<OwnerGate> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return { ok: isOwnerEmail(email), email };
}

/** Auth máquina-a-máquina por el secreto del puente (bridge → app). */
export function bridgeSecretOk(req: Request): boolean {
  const secret = process.env.WHATSAPP_BRIDGE_SECRET ?? "";
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Auth para tareas programadas (cron de Vercel / externo). */
export function cronSecretOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET ?? process.env.BRAIN_SECRET ?? "";
  if (!expected) return false;
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret");
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}` || fromQuery === expected;
}

export function unauthorized(msg = "no auth") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
