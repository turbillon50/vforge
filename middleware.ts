import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Clerk se inicializa cuando hay keys (para que /sign-in y /sign-up
// rendericen los componentes oficiales), pero NO protege rutas: el
// backend de V usa operator_luis hardcoded hasta que aterrice M11
// (Clerk-backed auth real cableada al user_id en BD). Bloquear /app
// sin que vaya cableado al user_id solo nos deja afuera del producto
// sin agregar seguridad real. Cuando Clerk se conecte al user_id en
// BD, recuperamos la protección con auth.protect() aquí.
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
