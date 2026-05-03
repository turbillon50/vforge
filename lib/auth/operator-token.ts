/**
 * Operator authentication guard for sensitive API routes.
 *
 * This is the interim solution until Clerk is fully wired into the
 * frontend (M1+). The operator (Luis, single-user mode) holds a
 * 32-byte bearer token (VFORGE_OPERATOR_TOKEN) that the /vault UI
 * caches in localStorage and injects as `Authorization: Bearer ...`
 * on every privileged request.
 *
 * Constant-time comparison to prevent timing-attack key recovery.
 */
import { timingSafeEqual } from "node:crypto";

export type AuthFailure = { ok: false; status: number; error: string };
export type AuthSuccess = { ok: true; userId: string };
export type AuthResult = AuthFailure | AuthSuccess;

const OPERATOR_USER_ID = "operator_luis";

/**
 * Validates the Authorization header against VFORGE_OPERATOR_TOKEN.
 * Returns AuthSuccess with the operator user id, or an AuthFailure
 * with a JSON-friendly error and HTTP status.
 */
export function requireOperatorAuth(req: Request): AuthResult {
  const expected = process.env.VFORGE_OPERATOR_TOKEN;
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "VFORGE_OPERATOR_TOKEN not configured on server",
    };
  }

  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "Missing Authorization: Bearer <token> header",
    };
  }

  const presented = match[1].trim();
  // timingSafeEqual requires equal-length buffers.
  if (presented.length !== expected.length) {
    return { ok: false, status: 403, error: "invalid operator token" };
  }
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (!timingSafeEqual(a, b)) {
    return { ok: false, status: 403, error: "invalid operator token" };
  }

  return { ok: true, userId: OPERATOR_USER_ID };
}

/**
 * Helper to convert AuthFailure into a Response.
 */
export function authFailureResponse(failure: AuthFailure): Response {
  return new Response(JSON.stringify({ error: failure.error }), {
    status: failure.status,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": failure.status === 401 ? "Bearer" : "",
      "Cache-Control": "no-store",
    },
  });
}
