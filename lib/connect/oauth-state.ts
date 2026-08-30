import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * POR QUE EXISTE ESTE ARCHIVO
 *
 * El callback de OAuth regresa desde otro sitio (vercel.com, github.com...).
 * Si en ese salto no viaja la cookie de sesion de Clerk, `auth()` devuelve
 * vacio, el codigo de autorizacion se tira a la basura y el usuario aterriza
 * en /sign-in creyendo que no paso nada. Eso es exactamente lo que tuvo
 * muerto al conector de Vercel: cero tokens guardados en meses.
 *
 * La solucion no es parchar la cookie: es no depender de ella. Metemos el
 * userId DENTRO del state, firmado, para que el callback sepa de quien es el
 * codigo aunque la sesion no viaje. El state ya viajaba de ida y vuelta por
 * el protocolo; solo lo hacemos util.
 */

const VENTANA_MS = 15 * 60 * 1000; // 15 min de vida

export const OAUTH_RETURN_PATHS = [
  "/onboarding",
  "/workspace",
  "/app/integrations",
] as const;

export type OAuthReturnPath = (typeof OAUTH_RETURN_PATHS)[number];

export function normalizarOAuthReturnPath(
  value: string | null | undefined,
  fallback: OAuthReturnPath = "/app/integrations",
): OAuthReturnPath {
  return OAUTH_RETURN_PATHS.includes(value as OAuthReturnPath)
    ? (value as OAuthReturnPath)
    : fallback;
}

function llave(): Buffer {
  const s =
    process.env.VFORGE_MASTER_PEPPER ||
    process.env.VFORGE_BRIDGE_SECRET ||
    process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("falta secreto para firmar el state de OAuth");
  return Buffer.from(s, "utf8");
}

const b64u = (b: Buffer) => b.toString("base64url");

/** Crea un state firmado que carga el userId y su destino interno permitido. */
export function firmarState(
  userId: string,
  returnPath: OAuthReturnPath = "/app/integrations",
): string {
  const cuerpo = b64u(
    Buffer.from(
      JSON.stringify({
        u: userId,
        n: randomBytes(8).toString("hex"),
        t: Date.now(),
        r: returnPath,
      }),
      "utf8",
    ),
  );
  const firma = b64u(createHmac("sha256", llave()).update(cuerpo).digest());
  return `${cuerpo}.${firma}`;
}

/**
 * Verifica el state y devuelve el userId. `null` si viene manipulado,
 * caducado o con otro formato (p.ej. states viejos sin firma).
 */
export function leerStateCompleto(
  state: string | null | undefined,
): { userId: string; returnPath: OAuthReturnPath } | null {
  if (!state || !state.includes(".")) return null;
  const [cuerpo, firma] = state.split(".");
  if (!cuerpo || !firma) return null;
  try {
    const esperada = b64u(createHmac("sha256", llave()).update(cuerpo).digest());
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
    if (!d?.u || typeof d.t !== "number") return null;
    if (Date.now() - d.t > VENTANA_MS) return null;
    return {
      userId: String(d.u),
      returnPath: normalizarOAuthReturnPath(d.r),
    };
  } catch {
    return null;
  }
}

/** Compatibilidad con consumidores que sólo necesitan el userId. */
export function leerState(state: string | null | undefined): string | null {
  return leerStateCompleto(state)?.userId ?? null;
}
