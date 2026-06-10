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

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Rutas admin: se aceptan DOS formas de auth (ver dualidad abajo):
//   1) operator token (Bearer VFORGE_OPERATOR_TOKEN) — para curl/CLI del owner
//      y endpoints como /api/admin/migrate.
//   2) sesión Clerk de owner — para la UI (/activity health pill, cockpit…).
const isAdminRoute = createRouteMatcher(["/api/admin/(.*)"]);

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
  "/api/connect(.*)",
  "/api/integrations(.*)",
  "/api/mcp/token(.*)",
  "/api/auth/neon(.*)",
  "/api/auth/stripe(.*)",
  "/workspace(.*)",
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
  "/api/billing(.*)",
  "/api/v/bridge(.*)",
]);

// Rutas exclusivas del owner (Luis): V, su cockpit y sus productos.
const isOwnerOnly = createRouteMatcher([
  "/app(.*)",
  "/forge(.*)",
  "/v",
  "/api/cockpit(.*)",
  "/api/graph(.*)",
  "/api/github(.*)",
  "/api/stats(.*)",
  "/api/forge(.*)",
  "/api/builder(.*)",
  "/api/vault(.*)",
  "/api/admin(.*)",
  "/api/projects(.*)",
  "/api/v/bridge(.*)",
]);

async function resolveOwner(userId: string): Promise<boolean> {
  const cached = getCachedOwner(userId);
  if (cached !== null) return cached;
  try {
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const owner = isOwnerUser(user);
    setCachedOwner(userId, owner);
    return owner;
  } catch {
    return false;
  }
}

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      // Auth dual en /api/admin: un operator token válido salta Clerk (el Bearer
      // no es un JWT de Clerk, así que Clerk lo rechazaría con 401). Sin token
      // válido, la ruta cae al control de Clerk de abajo (la UI usa su sesión).
      if (isAdminRoute(req) && hasValidOperatorToken(req)) return;
      if (!isProtected(req)) return;
      const { userId, sessionClaims, redirectToSignIn } = await auth();
      const isApi = req.nextUrl.pathname.startsWith("/api");

      if (!userId) {
        if (isApi) {
          return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        // redirectToSignIn() de Clerk hace el handshake/refresh de token
        // (a diferencia de un redirect manual, que dejaba al usuario CON
        // sesion activa en un bucle /app <-> /sign-in). signInUrl="/sign-in"
        // en clerkMiddleware (abajo) lo apunta a la pagina PROPIA, nunca al
        // Account Portal hosteado accounts.vforge.site.
        return redirectToSignIn({ returnBackUrl: req.url });
      }

      if (isOwnerOnly(req)) {
        const claimRole = (
          sessionClaims?.publicMetadata as { role?: string } | undefined
        )?.role;
        const owner =
          claimRole === "owner" ? true : await resolveOwner(userId);
        if (!owner) {
          if (isApi) {
            return new NextResponse(JSON.stringify({ error: "forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
          // Usuarios no-owner van a su propio workspace.
          return NextResponse.redirect(new URL("/workspace", req.url));
        }
      }
    }, { signInUrl: "/sign-in", signUpUrl: "/sign-up" })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
