import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseHealed } from "@/lib/db/client";

export async function middleware(request: NextRequest) {
  // Auto-heal database on every request (idempotent, runs once per process)
  // Run in background to not block the request
  if (process.env.NODE_ENV === "production") {
    ensureDatabaseHealed().catch((e) => {
      console.error("[V middleware] Database healing failed:", e);
    });
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
