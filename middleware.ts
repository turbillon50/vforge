import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Clerk se inicializa para que /sign-in y /sign-up rendericen los
// componentes oficiales con las keys, pero NO protege rutas. Hasta que
// M11 cable Clerk.user.id al user_id real en BD, bloquear /app solo
// nos deja afuera del producto. Cuando aterrice esa pieza, reactivamos
// auth.protect() aquí.
export default hasClerk
  ? clerkMiddleware(async () => {
      // pass-through; no auth.protect() yet
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
