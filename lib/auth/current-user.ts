/**
 * Tenant resolver — single source of truth for "who is making this request".
 *
 * Today this returns `operator_luis` unconditionally, so V keeps loading her
 * full personal context. When Clerk is wired into the frontend, this is the
 * only place that needs to learn the mapping:
 *
 *   - Server-to-server with VFORGE_OPERATOR_TOKEN  → 'operator_luis'
 *   - Clerk session, sub === LUIS_CLERK_ID         → 'operator_luis'
 *   - Clerk session, any other sub                 → `clerk_${sub}`
 *
 * The API surface is intentionally async so the future Clerk path can `await
 * auth()` without a refactor.
 */

import { requireOperatorAuth } from './operator-token';

export const OPERATOR_USER_ID = 'operator_luis';

/**
 * Resolve the user_id this request is acting as.
 *
 * Optional Request lets API routes pass `req` so the helper can inspect the
 * Authorization header (operator token) or session cookie. Server components
 * that do not have a Request just call `getCurrentUserId()`.
 */
export async function getCurrentUserId(req?: Request): Promise<string> {
  // 1) Server-to-server operator token wins (used by background jobs, MCP, CLI).
  if (req) {
    const header = req.headers.get('authorization');
    if (header && process.env.VFORGE_OPERATOR_TOKEN) {
      const result = requireOperatorAuth(req);
      if (result.ok) return result.userId;
    }
  }

  // 2) Clerk session → mapped user_id. Wiring lives here when @clerk/nextjs
  //    is added to the stack. For now we fall through to the operator.
  //
  //    Example for the future:
  //    const { userId: clerkUserId } = auth();
  //    if (clerkUserId) {
  //      if (clerkUserId === process.env.LUIS_CLERK_ID) return OPERATOR_USER_ID;
  //      return `clerk_${clerkUserId}`;
  //    }

  // 3) Default: single-tenant mode = Luis.
  return OPERATOR_USER_ID;
}

/**
 * True when the current request is acting as Luis (the operator). UIs and
 * tools that should only appear for him can gate on this.
 */
export async function isOperator(req?: Request): Promise<boolean> {
  const userId = await getCurrentUserId(req);
  return userId === OPERATOR_USER_ID;
}
