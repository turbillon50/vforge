import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const isProtected = createRouteMatcher([
  "/app(.*)",
  "/api/cockpit(.*)",
  "/api/projects(.*)",
  "/api/graph(.*)",
  "/api/github(.*)",
  "/api/stats(.*)",
  "/api/forge(.*)",
  "/api/vault(.*)",
  "/api/admin(.*)",
]);

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (!isProtected(req)) return;
      const { userId } = await auth();
      if (userId) return;
      if (req.nextUrl.pathname.startsWith("/api")) {
        return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const url = new URL("/sign-in", req.url);
      return NextResponse.redirect(url);
    })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
