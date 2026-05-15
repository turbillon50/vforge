import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseHealed } from "@/lib/db/client";

let _vaultInitialized = false;

export async function middleware(request: NextRequest) {
  // Auto-heal database on every request (idempotent, runs once per process)
  if (process.env.NODE_ENV === "production") {
    ensureDatabaseHealed().catch((e) => {
      console.error("[V middleware] Database healing failed:", e);
    });
  }

  // Initialize vault from environment variables (once per process)
  if (!_vaultInitialized && request.nextUrl.pathname.startsWith("/api")) {
    _vaultInitialized = true;

    try {
      const protocol = request.nextUrl.protocol;
      const host = request.nextUrl.host;
      const initUrl = `${protocol}//${host}/api/v-vault-init`;

      await fetch(initUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {
        // Silently fail if vault init doesn't work
      });
    } catch {
      // Silently continue if vault init fails
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
