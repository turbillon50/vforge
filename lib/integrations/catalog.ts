/**
 * Catálogo declarativo de servicios para el Asistente de Integraciones.
 *
 * Cada entrada describe QUÉ es el servicio, POR QUÉ podría necesitarlo el
 * usuario y CÓMO conectarlo (oauth deep-link, pegar API key validada, o
 * pasos manuales). El recomendador y la UI leen de aquí — nada hardcodeado
 * fuera de este archivo.
 */
export type ConnectKind = "oauth" | "paste" | "manual";

export interface ServiceRec {
  id: string;
  name: string;
  /** Una línea en español: para qué sirve en el proyecto del usuario. */
  why: string;
  connectKind: ConnectKind;
  /** Deep-link al registro/alta del servicio (target _blank en la UI). */
  signupUrl: string;
  /** Dónde sacar la API key, 1-2 frases. */
  keyHint?: string;
  /** Qué se valida al conectar, para tranquilizar al usuario. */
  validateHint?: string;
  /** Ruta de inicio OAuth (si connectKind = 'oauth'). */
  oauthStart?: string;
  /** Endpoint que valida y guarda la key (si 'paste' o 'manual'). */
  connectApi?: string;
}

export const CATALOG: Record<string, ServiceRec> = {
  github: {
    id: "github",
    name: "GitHub",
    why: "Para guardar el código de tu app con respaldo e historial.",
    connectKind: "oauth",
    signupUrl: "https://github.com/signup",
    validateHint: "Conectamos tu cuenta por OAuth; no pegas nada.",
    oauthStart: "/api/auth/github/start",
  },
  vercel: {
    id: "vercel",
    name: "Vercel",
    why: "Para publicar tu app en internet con un dominio y HTTPS.",
    connectKind: "oauth",
    signupUrl: "https://vercel.com/signup",
    validateHint: "Conectamos tu cuenta por OAuth; no pegas nada.",
    oauthStart: "/api/auth/vercel/start",
  },
  domain: {
    id: "domain",
    name: "Dominio",
    why: "Para que tu app tenga su propia dirección (tunombre.com).",
    connectKind: "manual",
    signupUrl: "https://www.namecheap.com/domains/registration/",
    keyHint:
      "Elige y registra un dominio; luego lo apuntamos a tu app desde aquí.",
    validateHint: "Solo necesitas tener el dominio registrado.",
  },
  stripe: {
    id: "stripe",
    name: "Stripe",
    why: "Para cobrar con tarjeta y OXXO/SPEI.",
    connectKind: "oauth",
    signupUrl: "https://dashboard.stripe.com/register",
    validateHint: "Conexión por Stripe Connect; tu dinero llega a tu cuenta.",
    oauthStart: "/api/auth/stripe/start",
  },
  mercadopago: {
    id: "mercadopago",
    name: "Mercado Pago",
    why: "Para cobrar con tarjeta, OXXO, SPEI y saldo en LatAm.",
    connectKind: "oauth",
    signupUrl: "https://www.mercadopago.com/developers",
    validateHint: "Conexión por Mercado Pago Connect (OAuth); tu dinero llega a tu cuenta.",
    oauthStart: "/api/auth/mercadopago/start",
  },
  neon: {
    id: "neon",
    name: "Neon",
    why: "Para guardar los datos de tu app (usuarios, registros, etc.).",
    connectKind: "paste",
    signupUrl: "https://console.neon.tech",
    keyHint: "console.neon.tech → Account → API keys.",
    validateHint: "Validamos la llave listando tus proyectos de Neon.",
    connectApi: "/api/connect/neon",
  },
  resend: {
    id: "resend",
    name: "Resend",
    why: "Para enviar correos (confirmaciones, avisos, recuperación).",
    connectKind: "paste",
    signupUrl: "https://resend.com/signup",
    keyHint: "resend.com/api-keys → Create API Key (empieza con re_).",
    validateHint: "Validamos la llave consultando tus dominios.",
    connectApi: "/api/connect/resend",
  },
  clerk: {
    id: "clerk",
    name: "Clerk",
    why: "Para que tus usuarios inicien sesión de forma segura.",
    connectKind: "paste",
    signupUrl: "https://dashboard.clerk.com",
    keyHint: "dashboard.clerk.com → tu app → API Keys → Secret Key (sk_).",
    validateHint: "Validamos la Secret Key contra la API de Clerk.",
    connectApi: "/api/connect/clerk",
  },
  twilio: {
    id: "twilio",
    name: "Twilio",
    why: "Para enviar SMS y mensajes de WhatsApp.",
    connectKind: "paste",
    signupUrl: "https://www.twilio.com/try-twilio",
    keyHint: "Console → Account SID + Auth Token (panel principal de Twilio).",
    validateHint: "Pega tus credenciales y las guardamos cifradas.",
    connectApi: "/api/connect/twilio",
  },
  google_maps: {
    id: "google_maps",
    name: "Google Maps",
    why: "Para mostrar mapas, ubicaciones y rutas en tu app.",
    connectKind: "manual",
    signupUrl: "https://console.cloud.google.com/google/maps-apis",
    keyHint:
      "Habilita la API de Maps JavaScript y crea una API key en la consola.",
    validateHint: "Pega la API key y la guardamos cifrada.",
    connectApi: "/api/connect/google_maps",
  },
};

export function getService(id: string): ServiceRec | undefined {
  return CATALOG[id];
}
