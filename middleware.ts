import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/onboarding(.*)",
]);

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Cuando Clerk tiene keys configuradas (producción), protege /app y
// /onboarding — no entra cualquiera, hay que loguearse vía /sign-in o
// /sign-up. En previews sin keys, el middleware pasa todo para no
// bloquear el desarrollo.
//
// Nota: el backend de V todavía usa operator_luis hardcoded en
// `lib/forge/run/route.ts`. Mientras tanto, Clerk solo es el guard
// frontend. Cuando M11 aterrice, mapearemos el Clerk user.id al user_id
// real en BD para que V identifique a cada operador en serio.
export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) await auth.protect();
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
