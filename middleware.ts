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
      if (!isProtected(req)) return;
      const { userId, sessionClaims } = await auth();
      const isApi = req.nextUrl.pathname.startsWith("/api");

      if (!userId) {
        if (isApi) {
          return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        // SIEMPRE a la página /sign-in PROPIA de la app (NUNCA al Account
        // Portal hosteado accounts.vforge.site, que rinde en blanco en móvil
        // y causaba el bucle). Conservamos el destino para volver tras login.
        const signIn = new URL("/sign-in", req.url);
        const dest = req.nextUrl.pathname + req.nextUrl.search;
        if (dest && dest !== "/sign-in") signIn.searchParams.set("redirect_url", dest);
        return NextResponse.redirect(signIn);
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
    })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
