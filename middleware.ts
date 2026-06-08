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

// Rutas que se autentican por operator token (Bearer VFORGE_OPERATOR_TOKEN),
// NO por sesión Clerk. El middleware las deja pasar para que el check de
// requireOperatorAuth de la propia ruta corra; si las interceptara Clerk,
// rechazaría el Bearer (no es un JWT de Clerk) con 401 antes de llegar.
// SÓLO incluir aquí rutas que YA validan el operator token por sí mismas.
const isOperatorTokenRoute = createRouteMatcher(["/api/admin/migrate(.*)"]);

// Rutas que requieren sesión (cualquier usuario registrado).
const isProtected = createRouteMatcher([
  "/app(.*)",
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
      // Rutas con operator token: saltan Clerk; su handler valida el Bearer.
      if (isOperatorTokenRoute(req)) return;
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
