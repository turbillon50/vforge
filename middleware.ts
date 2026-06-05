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
  "/workspace(.*)",
  "/api/cockpit(.*)",
  "/api/projects(.*)",
  "/api/graph(.*)",
  "/api/github(.*)",
  "/api/stats(.*)",
  "/api/forge(.*)",
  "/api/vault(.*)",
  "/api/admin(.*)",
  "/api/workspace(.*)",
]);

// Rutas exclusivas del owner (Luis): V, su cockpit y sus productos.
const isOwnerOnly = createRouteMatcher([
  "/app(.*)",
  "/api/cockpit(.*)",
  "/api/graph(.*)",
  "/api/github(.*)",
  "/api/stats(.*)",
  "/api/forge(.*)",
  "/api/vault(.*)",
  "/api/admin(.*)",
  "/api/projects(.*)",
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
        return NextResponse.redirect(new URL("/sign-in", req.url));
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
