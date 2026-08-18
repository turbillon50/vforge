import "server-only";
import { timingSafeEqual } from "node:crypto";

function readBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Authenticates trusted server-to-server calls to the self-hosted VForge API.
 * Missing configuration always fails closed.
 */
export function hasInternalApiAccess(req: Request): boolean {
  const expected = process.env.VFORGE_API_INTERNAL_TOKEN?.trim();
  const provided = readBearerToken(req.headers.get("authorization"));
  if (!expected || !provided) return false;

  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");
  if (expectedBytes.length !== providedBytes.length) return false;

  return timingSafeEqual(expectedBytes, providedBytes);
}
