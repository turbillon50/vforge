import { NextRequest } from "next/server";
import crypto from "node:crypto";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

/** Envuelve TwiML en una respuesta XML válida para Twilio. */
export function twiml(inner: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
  return new Response(xml, { status: 200, headers: { "Content-Type": "text/xml" } });
}

/** Escapa texto para insertarlo seguro en <Say>. */
export function sayEscape(text: string): string {
  return text
    .replace(/&/g, " y ")
    .replace(/</g, " menor ")
    .replace(/>/g, " mayor ")
    .replace(/"/g, "'")
    .slice(0, 600);
}

/**
 * Valida X-Twilio-Signature (HMAC-SHA1 sobre URL + params POST ordenados).
 * Si no hay AUTH_TOKEN configurado, no bloquea (entorno de desarrollo).
 * NOTA: lee el form y NO lo consume para el handler — por eso devolvemos params.
 */
export async function verifyTwilioSignature(req: NextRequest): Promise<boolean> {
  if (!AUTH_TOKEN) return true; // sin token no podemos validar; permitir en dev
  const sig = req.headers.get("x-twilio-signature");
  if (!sig) return false;

  const form = await req.clone().formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  // URL pública tal como Twilio la ve (respeta proxy de Vercel).
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const url = `${proto}://${host}${new URL(req.url).pathname}`;

  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];

  const expected = crypto.createHmac("sha1", AUTH_TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
