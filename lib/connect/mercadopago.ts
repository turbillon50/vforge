/**
 * Mercado Pago Connect — el equivalente a Stripe Connect para VForge.
 *
 * MODELO (marketplace / split de pagos):
 *  - Cada VENDEDOR (dueño de la app generada) vincula SU cuenta de Mercado
 *    Pago a la aplicación de la plataforma (VForge / Luis) vía OAuth. Eso nos
 *    da access_token, refresh_token, public_key y su user_id (collector_id),
 *    todo guardado CIFRADO por userId en user_secrets (mismo vault que Stripe).
 *  - Cuando VForge genera la cobranza de una app, se crea una "preference" de
 *    Checkout Pro USANDO EL access_token DEL VENDEDOR e incluyendo
 *    `marketplace_fee`: ese monto es la comisión que se lleva la plataforma
 *    (Luis) por transacción. MP descuenta primero su comisión y luego la del
 *    marketplace; el resto llega al vendedor. Igual que Stripe `application_fee`.
 *
 * Las credenciales de la app de plataforma (client_id / client_secret) viven
 * en la bóveda del operador (Class 1), nunca en cliente.
 */
import { saveUserSecret, getUserSecret } from "@/lib/connect/user-vault";
import { getOperatorSecret } from "@/lib/vault/get-secret";

const MP_API = "https://api.mercadopago.com";

/** Nombres de secretos del vendedor en user_secrets (ligados a su userId). */
export const MP_SECRET = {
  accessToken: "MERCADOPAGO_ACCESS_TOKEN",
  refreshToken: "MERCADOPAGO_REFRESH_TOKEN",
  publicKey: "MERCADOPAGO_PUBLIC_KEY",
  collectorId: "MERCADOPAGO_COLLECTOR_ID",
  expiresAt: "MERCADOPAGO_TOKEN_EXPIRES_AT",
} as const;

export interface MpOAuthTokens {
  access_token?: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: number | string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  message?: string;
}

async function getPlatformCreds(): Promise<{ clientId: string; clientSecret: string }> {
  const clientId =
    (await getOperatorSecret("MERCADOPAGO_APP_ID")) ??
    process.env.MERCADOPAGO_APP_ID ??
    null;
  const clientSecret =
    (await getOperatorSecret("MERCADOPAGO_CLIENT_SECRET")) ??
    process.env.MERCADOPAGO_CLIENT_SECRET ??
    null;
  if (!clientId || !clientSecret)
    throw new Error("MERCADOPAGO_APP_ID / MERCADOPAGO_CLIENT_SECRET no configurados en la bóveda");
  return { clientId, clientSecret };
}

/** Intercambia el `code` del OAuth por tokens del vendedor. */
export async function exchangeMpCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = await getPlatformCreds();
  const body: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };
  if (codeVerifier) body.code_verifier = codeVerifier;
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as MpOAuthTokens;
}

/** Renueva el access_token del vendedor con su refresh_token (~180 días). */
export async function refreshMpToken(refreshToken: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = await getPlatformCreds();
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  return (await res.json()) as MpOAuthTokens;
}

/** Guarda (cifrado) el resultado del OAuth para un vendedor. */
export async function persistMpTokens(userId: string, t: MpOAuthTokens): Promise<void> {
  if (t.access_token)
    await saveUserSecret(userId, MP_SECRET.accessToken, t.access_token, "mercadopago");
  if (t.refresh_token)
    await saveUserSecret(userId, MP_SECRET.refreshToken, t.refresh_token, "mercadopago");
  if (t.public_key)
    await saveUserSecret(userId, MP_SECRET.publicKey, t.public_key, "mercadopago");
  if (t.user_id != null)
    await saveUserSecret(userId, MP_SECRET.collectorId, String(t.user_id), "mercadopago");
  if (t.expires_in) {
    const expiresAt = String(Date.now() + t.expires_in * 1000);
    await saveUserSecret(userId, MP_SECRET.expiresAt, expiresAt, "mercadopago");
  }
}

/** access_token VÁLIDO del vendedor, renovándolo si está por expirar. */
export async function getSellerMpAccessToken(userId: string): Promise<string | null> {
  const token = await getUserSecret(userId, MP_SECRET.accessToken);
  if (!token) return null;
  const expRaw = await getUserSecret(userId, MP_SECRET.expiresAt);
  const exp = expRaw ? Number(expRaw) : 0;
  if (exp && exp - Date.now() < 24 * 60 * 60 * 1000) {
    const refresh = await getUserSecret(userId, MP_SECRET.refreshToken);
    if (refresh) {
      const renewed = await refreshMpToken(refresh);
      if (renewed.access_token) {
        await persistMpTokens(userId, renewed);
        return renewed.access_token;
      }
    }
  }
  return token;
}

/** ¿El vendedor ya conectó su cuenta de Mercado Pago? */
export async function isMpConnected(userId: string): Promise<boolean> {
  return (await getUserSecret(userId, MP_SECRET.accessToken)) != null;
}

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  id?: string;
  description?: string;
}

export interface CreatePreferenceInput {
  sellerUserId: string;
  items: PreferenceItem[];
  marketplaceFeeAmount?: number;
  marketplaceFeePercent?: number;
  backUrls?: { success?: string; failure?: string; pending?: string };
  notificationUrl?: string;
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

export interface PreferenceResult {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  marketplace_fee: number;
}

/**
 * Crea una preference de Checkout Pro en modo MARKETPLACE. El cobro va a la
 * cuenta MP del vendedor y `marketplace_fee` es la comisión de la plataforma.
 */
export async function createMarketplacePreference(
  input: CreatePreferenceInput,
): Promise<PreferenceResult> {
  const accessToken = await getSellerMpAccessToken(input.sellerUserId);
  if (!accessToken)
    throw new Error("El vendedor no ha conectado su cuenta de Mercado Pago");

  const total = input.items.reduce((s, it) => s + it.unit_price * (it.quantity || 1), 0);

  let fee = input.marketplaceFeeAmount;
  if (fee == null) {
    const pct =
      input.marketplaceFeePercent ??
      Number(
        (await getOperatorSecret("MERCADOPAGO_MARKETPLACE_FEE_PERCENT")) ??
          process.env.MERCADOPAGO_MARKETPLACE_FEE_PERCENT ??
          "0",
      );
    fee = Math.round(total * (pct / 100) * 100) / 100;
  }

  const appId =
    (await getOperatorSecret("MERCADOPAGO_APP_ID")) ??
    process.env.MERCADOPAGO_APP_ID ??
    undefined;

  const preference: Record<string, unknown> = {
    items: input.items.map((it) => ({
      id: it.id ?? "item",
      title: it.title,
      description: it.description,
      quantity: it.quantity || 1,
      unit_price: it.unit_price,
      currency_id: it.currency_id ?? "MXN",
    })),
    marketplace_fee: fee,
    ...(appId ? { marketplace: appId } : {}),
    ...(input.backUrls ? { back_urls: input.backUrls } : {}),
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
    ...(input.externalReference ? { external_reference: input.externalReference } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(preference),
  });
  const data = (await res.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.id || !data.init_point) {
    throw new Error(
      `Mercado Pago ${res.status}: ${data.message ?? data.error ?? "no se pudo crear la preference"}`,
    );
  }
  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
    marketplace_fee: fee,
  };
}
