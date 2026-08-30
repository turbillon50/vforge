/**
 * Identidad fail-closed para consultas de membresía.
 * Sin Clerk user id no se consulta nada — nunca se cae al catálogo global.
 */
export interface ScopedIdentity {
  clerkUserId: string;
  email: string;
}

export function normalizeScopedIdentity(
  clerkUserId: string | null | undefined,
  email: string | null | undefined,
): ScopedIdentity | null {
  const id = clerkUserId?.trim() ?? "";
  const mail = email?.trim().toLowerCase() ?? "";
  if (!id) return null;
  if (!mail || mail.length > 320) return null;
  return { clerkUserId: id, email: mail };
}

/**
 * Predicado SQL: la fila pertenece a ESTE usuario.
 * clerk_user_id gana. El email solo cubre filas legacy aún sin Clerk id.
 * Nunca es un fallback a "todas las filas".
 */
export function membershipBelongsToUserSql(
  tableAlias: string,
  clerkUserIdParam: string,
  emailParam: string,
): string {
  const col = (name: string) => `${tableAlias}.${name}`;
  return `(${col("clerk_user_id")} = ${clerkUserIdParam} OR ((${col("clerk_user_id")} IS NULL OR ${col("clerk_user_id")} = '') AND lower(${col("email")}) = ${emailParam}))`;
}
