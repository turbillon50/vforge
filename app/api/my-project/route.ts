/**
 * API Portal Cliente — lista de proyectos del usuario actual (read-only).
 *
 * GET — devuelve exclusivamente proyectos con membresía ACTIVA para el correo
 * actual, tanto del portal histórico como de las salas live nuevas.
 */
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { listScopedProjects } from "@/lib/projects/scoped-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!user?.id || !email) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await listScopedProjects({ clerkUserId: user.id, email });

  return NextResponse.json(
    { projects: rows },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
