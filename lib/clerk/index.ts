// lib/clerk/index.ts — Helpers de auth centralizados
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type AuthResult =
  | { userId: string; error: null }
  | { userId: null; error: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId, error: null };
}

export type OwnerResult =
  | { ok: true; error: null }
  | { ok: false; error: NextResponse };

export async function requireOwner(): Promise<OwnerResult> {
  const { userId } = await auth();
  const ownerId = process.env.OWNER_CLERK_ID;
  if (!userId || userId !== ownerId) {
    return {
      ok: false,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, error: null };
}
