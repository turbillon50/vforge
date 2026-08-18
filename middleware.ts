import {
  clerkMiddleware,
  clerkClient,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  isOwnerUser,
  getCachedOwner,
  setCachedOwner,
} from "@/lib/auth/owner";
import { resolveOnboardingComplete } from "@/lib/auth/onboarding";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Rutas admin: se aceptan DOS formas de auth (ver dualidad abajo):
//   1) operator token (Bearer VFORGE_OPERATOR_TOKEN) — para curl/CLI del owner
//      y endpoints como /api/admin/migrate.
//   2) sesión Clerk de owner — para la UI (/activity health pill, cockpit…).
const isAdminRoute = createRouteMatcher(["/api/admin/(.*)"]);
const isTwilioWebhook = createRouteMatcher(["/api/v/voice/twilio(.*)"]);
// Rutas MCP: Clerk NO debe validar el Bearer (son tokens vfmcp_* propios,
// no JWTs de Clerk). El handler MCP hace su propia autenticación.
const isMcpRoute = createRouteMatcher(["/api/mcp", "/api/mcp/(.*)", "/api/mcp/public", "/api/mcp/public/(.*)"]);
// Portal en vivo del cliente: accesible a CUALQUIER usuario autenticado
// (owner/reviewer/observer), no solo al owner de la plataforma. El gating fino
// por proyecto y rol vive en la página (/app/live) y en /api/live/*, que
// resuelven la membresía con fail-closed. Aquí solo exigimos sesión.
const isLivePortal = createRouteMatcher(["/app/live(.*)", "/api/live(.*)"]);

/**
 * Valida el operator token del header Authorization en el edge. Comparación de
 * tiempo constante (sin node:crypto, que no existe en el runtime del middleware).
 * Si devuelve true, la request se considera autenticada como owner y salta Clerk;
 * si no, cae al control normal de Clerk. Nunca expone la ruta: hace falta token
 * válido O sesión válida.
 */
function hasValidOperatorToken(req: Request): boolean {
  const expected = process.env.VFORGE_OPERATOR_TOKEN?.trim();
  if (!expected) return false;
  const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const presented = m[1].trim();
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i++) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// Rutas que requieren sesión (cualquier usuario registrado).
const isProtected = createRouteMatcher([
  "/app(.*)",
  "/forge(.*)",
  "/v",
  "/api/v/chat(.*)",
  "/forge(.*)",
  "/v",
  "/api/v/chat(.*)",
  "/forja(.*)",
  "/esfera(.*)",
  "/api/forja(.*)",
  "/api/esfera(.*)",
  "/api/connect(.*)",
  "/api/integrations(.*)",
  "/api/mcp/token(.*)",
  "/api/auth/neon(.*)",
  "/api/auth/stripe(.*)",
  "/workspace(.*)",
  "/onboarding",
  "/onboarding/(.*)",
  "/vulcano",
  "/vulcano/(.*)",
  "/api/navegador(.*)",
  "/api/cockpit(.*)",
  "/api/projects(.*)",
  "/api/graph(.*)",
  "/api/github(.*)",
  "/api/stats(.*)",
  "/api/forge(.*)",
  "/api/builder(.*)",
  "/api/vault(.*)",
  "/api/admin(.*)",
  "/api/workspace(.*)",
  "/