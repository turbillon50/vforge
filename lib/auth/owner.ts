/**
 * Owner gating — V (y todo su cockpit) es para los owners (Luis + Jaime).
 *
 * Un usuario es owner únicamente si alguno de sus emails está en
 * VFORGE_OWNER_EMAILS (env, CSV). El metadata de Clerk nunca eleva permisos:
 * puede quedar obsoleto, copiarse entre instancias o haber sido escrito por
 * un onboarding antiguo.
 *
 * Default de emails: las cuentas canónicas de Luis + Jaime. Las cuentas
 * secundarias se comportan como clientes y sólo ven proyectos por membresía.
 */
export const DEFAULT_OWNER_EMAILS = [
  "turbillon50@gmail.com",
  "jaime@vmomentums.info",
] as const;

export function parseOwnerEmails(value?: string): string[] {
  return (value ?? DEFAULT_OWNER_EMAILS.join(","))
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
}

export const OWNER_EMAILS: string[] = parseOwnerEmails(
  process.env.VFORGE_OWNER_EMAILS,
);

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

type MinimalUser = {
  emailAddresses?: Array<{ emailAddress: string }>;
};

export function isOwnerUser(user: MinimalUser | null | undefined): boolean {
  if (!user) return false;
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
