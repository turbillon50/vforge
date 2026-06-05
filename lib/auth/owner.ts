/**
 * Owner gating — V (y todo su cockpit) es exclusiva de Luis.
 *
 * Un usuario es owner si:
 *  1. publicMetadata.role === "owner" en Clerk, o
 *  2. alguno de sus emails está en VFORGE_OWNER_EMAILS (env, CSV).
 *
 * Default de emails: las dos cuentas de Luis.
 */
export const OWNER_EMAILS: string[] = (
  process.env.VFORGE_OWNER_EMAILS ??
  "turbillon50@gmail.com,dluisdelatorre@gmail.com,luisdelator@vmomentums.info"
)
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

type MinimalUser = {
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses?: Array<{ emailAddress: string }>;
};

export function isOwnerUser(user: MinimalUser | null | undefined): boolean {
  if (!user) return false;
  if ((user.publicMetadata as { role?: string } | null)?.role === "owner") {
    return true;
  }
  return (user.emailAddresses ?? []).some((e) => isOwnerEmail(e.emailAddress));
}

/** Cache en memoria para no pegarle a Clerk en cada request del middleware. */
const cache = new Map<string, { owner: boolean; at: number }>();
const TTL_MS = 5 * 60 * 1000;

export function getCachedOwner(userId: string): boolean | null {
  const hit = cache.get(userId);
  if (!hit || Date.now() - hit.at > TTL_MS) return null;
  return hit.owner;
}

export function setCachedOwner(userId: string, owner: boolean): void {
  cache.set(userId, { owner, at: Date.now() });
}
