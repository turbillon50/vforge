/**
 * Stripe sin SDK — fetch directo a api.stripe.com con form-encoding.
 * La key vive en la bóveda del operador (STRIPE_SECRET_KEY).
 */
import { getOperatorSecret } from "@/lib/vault/get-secret";

const STRIPE_API = "https://api.stripe.com";

export type PaidPlan = "studio" | "forge" | "payg";

const LOOKUP_KEYS: Record<PaidPlan, string> = {
  studio: "vforge_studio",
  forge: "vforge_forge",
  payg: "vforge_payg",
};

let _priceCache: Record<PaidPlan, string> | null = null;

async function getStripeKey(): Promise<string> {
  const key =
    (await getOperatorSecret("STRIPE_SECRET_KEY")) ??
    process.env.STRIPE_SECRET_KEY ??
    null;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada en la bóveda");
  return key;
}

/**
 * Llama a Stripe con application/x-www-form-urlencoded.
 * `params` admite claves ya aplanadas: { "recurring[interval]": "month" }.
 */
export async function stripeFetch<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  method: "GET" | "POST" = params ? "POST" : "GET",
): Promise<T> {
  const key = await getStripeKey();
  const form = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) form.append(k, String(v));
    }
  }
  const isGet = method === "GET";
  const qs = isGet && [...form.keys()].length > 0 ? `?${form.toString()}` : "";
  const res = await fetch(`${STRIPE_API}${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(isGet ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
    },
    body: isGet ? undefined : form.toString(),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(
      `Stripe ${res.status} ${path}: ${json.error?.message ?? "error desconocido"}`,
    );
  }
  return json;
}

interface PriceObject {
  id: string;
  lookup_key: string | null;
}

/**
 * Garantiza que existan los precios de VForge en Stripe.
 * Busca por lookup_key; si faltan, crea producto + precio.
 * Cachea los price IDs en memoria del proceso. Corre lazy al primer checkout.
 */
export async function ensurePrices(): Promise<Record<PaidPlan, string>> {
  if (_priceCache) return _priceCache;

  const lookup = await stripeFetch<{ data: PriceObject[] }>(
    "/v1/prices?lookup_keys[]=vforge_studio&lookup_keys[]=vforge_forge&lookup_keys[]=vforge_payg&limit=10",
    undefined,
    "GET",
  );

  const found = new Map<string, string>();
  for (const p of lookup.data) {
    if (p.lookup_key) found.set(p.lookup_key, p.id);
  }

  async function createPlan(
    plan: PaidPlan,
    name: string,
    extra: Record<string, string | number>,
  ): Promise<string> {
    const product = await stripeFetch<{ id: string }>("/v1/products", {
      name,
      "metadata[vforge_plan]": plan,
    });
    const price = await stripeFetch<{ id: string }>("/v1/prices", {
      product: product.id,
      currency: "usd",
      lookup_key: LOOKUP_KEYS[plan],
      "recurring[interval]": "month",
      "metadata[vforge_plan]": plan,
      ...extra,
    });
    return price.id;
  }

  const studio =
    found.get("vforge_studio") ??
    (await createPlan("studio", "VForge Studio", { unit_amount: 2000 }));
  const forge =
    found.get("vforge_forge") ??
    (await createPlan("forge", "VForge Forge", { unit_amount: 10000 }));
  // PAYG: Stripe (basil) ahora exige Meters para precios "metered". Para no
  // bloquear el lanzamiento, PAYG se crea como precio recurrente base $0
  // (el consumo se factura aparte con invoice items / meters más adelante).
  // Si falla, NO debe tumbar Studio/Forge.
  let payg = found.get("vforge_payg") ?? "";
  if (!payg) {
    try {
      payg = await createPlan("payg", "VForge Pay-as-you-go", { unit_amount: 0 });
    } catch (e) {
      console.error("[billing] PAYG price no creado (no bloquea):", e);
    }
  }

  _priceCache = { studio, forge, payg };
  return _priceCache;
}

/** Mapea un lookup_key de Stripe al plan de VForge. */
export function planFromLookupKey(lookupKey: string | null | undefined): PaidPlan | null {
  if (!lookupKey) return null;
  const entry = (Object.entries(LOOKUP_KEYS) as [PaidPlan, string][]).find(
    ([, lk]) => lk === lookupKey,
  );
  return entry ? entry[0] : null;
}
