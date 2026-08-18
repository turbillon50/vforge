/**
 * Jerarquía de roles del portal en vivo — LÓGICA PURA, sin dependencias.
 *
 * Vive aislada (cero imports de Clerk / DB / server-only) para poder probarse
 * con `node --test`. El resto del portal (access.ts) la consume.
 *
 * Jerarquía: owner > reviewer > observer.
 */

export type LiveRole = "owner" | "reviewer" | "observer";

/** Rango numérico de cada rol. Mayor = más permisos. */
export const ROLE_RANK: Record<LiveRole, number> = {
  observer: 1,
  reviewer: 2,
  owner: 3,
};

export const LIVE_ROLES: readonly LiveRole[] = [
  "observer",
  "reviewer",
  "owner",
] as const;

/** Type guard: ¿es un rol válido del portal? */
export function isLiveRole(value: unknown): value is LiveRole {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ROLE_RANK, value)
  );
}

/**
 * Normaliza una entrada arbitraria a un LiveRole. Si no es válida, cae al rol
 * de MENOR privilegio (observer) — fail-closed por diseño.
 */
export function normalizeRole(value: unknown): LiveRole {
  return isLiveRole(value) ? value : "observer";
}

/** Roles que se pueden INVITAR desde el portal. `owner` NUNCA es invitable. */
export type InvitableRole = Exclude<LiveRole, "owner">;

/** Type guard: ¿es un rol que se puede invitar? (solo observer / reviewer) */
export function isInvitableRole(value: unknown): value is InvitableRole {
  return value === "observer" || value === "reviewer";
}

/** ¿`role` cubre al menos el nivel de `min`? (jerarquía inclusiva) */
export function roleAtLeast(role: LiveRole, min: LiveRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export interface MembershipRow {
  role: string;
  status: string;
  /** ISO string, Date, o null (sin expiración). */
  expires_at: string | Date | null;
}

/**
 * Decide, de forma PURA y fail-closed, si una fila de membresía otorga acceso
 * en el instante `now`. Devuelve el rol efectivo o null.
 *
 * Reglas (todas deben cumplirse):
 *   · status === 'active'
 *   · no expirada (expires_at nulo o en el futuro)
 *   · role es un LiveRole válido
 */
export function resolveMembership(
  row: MembershipRow | null | undefined,
  now: Date = new Date(),
): LiveRole | null {
  if (!row) return null;
  if (row.status !== "active") return null;
  if (!isLiveRole(row.role)) return null;
  if (row.expires_at != null) {
    const exp = row.expires_at instanceof Date
      ? row.expires_at
      : new Date(row.expires_at);
    // Fecha inválida o ya expirada → sin acceso.
    if (Number.isNaN(exp.getTime()) || exp.getTime() <= now.getTime()) {
      return null;
    }
  }
  return row.role;
}

export interface InvitationRow {
  role: string;
  email: string;
  /** ISO string o Date. */
  expires_at: string | Date;
  accepted_at: string | Date | null;
  revoked_at?: string | Date | null;
}

export type InvitationCheck =
  | { ok: true; role: LiveRole }
  | { ok: false; reason: "expired" | "used" | "revoked" | "email_mismatch" | "invalid" };

/**
 * Valida de forma PURA si una invitación puede aceptarse por `sessionEmail`
 * en el instante `now`. Fail-closed: cualquier ambigüedad → not ok.
 */
export function checkInvitation(
  row: InvitationRow | null | undefined,
  sessionEmail: string,
  now: Date = new Date(),
): InvitationCheck {
  if (!row || !isLiveRole(row.role)) return { ok: false, reason: "invalid" };
  if (row.revoked_at != null) return { ok: false, reason: "revoked" };
  if (row.accepted_at != null) return { ok: false, reason: "used" };

  const exp = row.expires_at instanceof Date
    ? row.expires_at
    : new Date(row.expires_at);
  if (Number.isNaN(exp.getTime()) || exp.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  const invited = (row.email ?? "").trim().toLowerCase();
  const session = (sessionEmail ?? "").trim().toLowerCase();
  if (!invited || !session || invited !== session) {
    return { ok: false, reason: "email_mismatch" };
  }

  return { ok: true, role: row.role };
}
