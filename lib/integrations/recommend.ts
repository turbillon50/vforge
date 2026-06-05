/**
 * Recomendador de integraciones a partir del alcance del wizard del usuario.
 *
 * Reglas simples y deterministas: SIEMPRE se incluye github, vercel y un
 * dominio (lo mínimo para tener una app publicada). Según las features /
 * tipo de app declaradas, se agregan servicios concretos. El resultado va
 * ordenado: primero lo base, luego el resto.
 */
import type { WorkspaceScope } from "@/lib/workspace/db";

export interface Recommendation {
  id: string;
  why: string;
  order: number;
}

/** why de cada servicio recomendado (espejo del catálogo, en una línea). */
const WHY: Record<string, string> = {
  github: "Para guardar el código de tu app con respaldo e historial.",
  vercel: "Para publicar tu app en internet con un dominio y HTTPS.",
  domain: "Para que tu app tenga su propia dirección (tunombre.com).",
  stripe: "Para cobrar con tarjeta y OXXO/SPEI.",
  resend: "Para enviar correos (confirmaciones, avisos, recuperación).",
  neon: "Para guardar los datos de tu app (usuarios, registros, etc.).",
  twilio: "Para enviar SMS y mensajes de WhatsApp.",
  clerk: "Para que tus usuarios inicien sesión de forma segura.",
  google_maps: "Para mostrar mapas, ubicaciones y rutas en tu app.",
};

// Servicios base, siempre presentes y en este orden.
const BASE = ["github", "vercel", "domain"];

// Reglas: si alguna palabra clave aparece en features/tipo, agrega el servicio.
const RULES: Array<{ id: string; keywords: string[] }> = [
  { id: "stripe", keywords: ["pago", "pagos", "cobr", "ecommerce", "tienda", "venta", "checkout", "suscrip"] },
  { id: "resend", keywords: ["email", "correo", "notific", "aviso", "newsletter"] },
  { id: "neon", keywords: ["base de datos", "datos", "database", "registro", "guardar"] },
  { id: "twilio", keywords: ["sms", "whatsapp", "mensaje", "texto"] },
  { id: "clerk", keywords: ["auth", "login", "sesión", "sesion", "usuario", "cuenta", "registro de usuario"] },
  { id: "google_maps", keywords: ["mapa", "ubicac", "ubicación", "logística", "logistica", "ruta", "geo"] },
];

export function recommendFromScope(
  scope: WorkspaceScope | null | undefined,
): Recommendation[] {
  const haystack = [
    scope?.appType ?? "",
    scope?.audience ?? "",
    ...(Array.isArray(scope?.features) ? scope!.features : []),
    ...(Array.isArray(scope?.integrations) ? scope!.integrations : []),
  ]
    .join(" ")
    .toLowerCase();

  const ids: string[] = [...BASE];
  for (const rule of RULES) {
    if (rule.keywords.some((k) => haystack.includes(k)) && !ids.includes(rule.id)) {
      ids.push(rule.id);
    }
  }

  return ids.map((id, i) => ({
    id,
    why: WHY[id] ?? "",
    order: i,
  }));
}
