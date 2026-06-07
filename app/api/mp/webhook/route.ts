import { createHmac, timingSafeEqual } from "node:crypto";
import { sql, ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mercado Pago reintenta hasta 8 veces si no recibe 2xx, así que SIEMPRE
// respondemos 200 cuando la firma es válida; el trabajo de BD nunca bloquea
// la respuesta. Doc: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks

const TOLERANCE_S = 5 * 60;

/**
 * Valida la firma de Mercado Pago.
 *
 * Header `x-signature`: "ts=<unix>,v1=<hmac-hex>".
 * Manifest firmado por MP: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * donde data.id se toma del query param `data.id` (en minúsculas si es
 * alfanumérico) y request-id del header `x-request-id`. HMAC-SHA256 hex con
 * MP_WEBHOOK_SECRET_VFORGE.
 */
function verifySignature(opts: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts;
  if (!xSignature || !secret) return false;

  const parts = new Map<string, string>();
  for (const piece of xSignature.split(",")) {
    const idx = piece.indexOf("=");
    if (idx === -1) continue;
    parts.set(piece.slice(0, idx).trim(), piece.slice(idx + 1).trim());
  }
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return false;

  const tsNum = Number(ts);
  if (
    !Number.isFinite(tsNum) ||
    Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_S
  ) {
    return false;
  }

  // MP: si data.id es alfanumérico debe ir en minúsculas dentro del manifest.
  const normalizedId = /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId;

  // Solo se incluyen en el manifest los campos presentes.
  let manifest = "";
  if (normalizedId) manifest += `id:${normalizedId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(v1, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface MpNotification {
  id?: string | number;
  type?: string;
  action?: string;
  live_mode?: boolean;
  data?: { id?: string | number };
}

/**
 * Registra el evento crudo en mp_events (idempotente por id).
 */
async function recordEvent(args: {
  eventId: string;
  type: string | null;
  action: string | null;
  dataId: string | null;
  liveMode: boolean | null;
  raw: unknown;
}): Promise<void> {
  await sql`
    INSERT INTO mp_events (id, type, action, data_id, live_mode, raw)
    VALUES (
      ${args.eventId},
      ${args.type},
      ${args.action},
      ${args.dataId},
      ${args.liveMode},
      ${JSON.stringify(args.raw)}::jsonb
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

interface MpPayment {
  id?: number | string;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  date_approved?: string;
  payer?: { email?: string };
  external_reference?: string;
  description?: string;
}

/**
 * Si hay access token y el evento es de pago, consulta el pago en MP.
 * Si está aprobado, hace upsert del resumen en brain_files (ultimo-pago-mp).
 */
async function handlePaymentApproved(dataId: string): Promise<void> {
  const token = process.env.MP_ACCESS_TOKEN_VFORGE;
  if (!token || !dataId) return; // token APP_USR aún pendiente — se omite sin romper

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[mp webhook] fetch payment falló", res.status);
    return;
  }
  const pay = (await res.json()) as MpPayment;
  if (pay.status !== "approved") return;

  const amount =
    typeof pay.transaction_amount === "number"
      ? pay.transaction_amount.toFixed(2)
      : "?";
  const resumen = [
    `Último pago aprobado en Mercado Pago (VForge).`,
    `ID: ${pay.id}`,
    `Monto: ${amount} ${pay.currency_id ?? ""}`.trim(),
    `Método: ${pay.payment_method_id ?? "?"}`,
    `Pagador: ${pay.payer?.email ?? "?"}`,
    pay.external_reference ? `Referencia: ${pay.external_reference}` : null,
    pay.description ? `Concepto: ${pay.description}` : null,
    `Aprobado: ${pay.date_approved ?? "?"}`,
    pay.status_detail ? `Detalle: ${pay.status_detail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sql`
    INSERT INTO brain_files (name, content, updated_at)
    VALUES ('ultimo-pago-mp', ${resumen}, now())
    ON CONFLICT (name) DO UPDATE
      SET content = EXCLUDED.content, updated_at = now()
  `;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const url = new URL(req.url);

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  let body: MpNotification = {};
  try {
    body = raw ? (JSON.parse(raw) as MpNotification) : {};
  } catch {
    // cuerpo no-JSON: seguimos con lo que tengamos para validar la firma
  }

  // data.id: prioriza el query param (lo que MP usa para firmar), cae al body.
  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    (body.data?.id != null ? String(body.data.id) : "") ??
    "";

  const secret = process.env.MP_WEBHOOK_SECRET_VFORGE ?? "";

  if (!verifySignature({ xSignature, xRequestId, dataId, secret })) {
    return Response.json({ error: "firma inválida" }, { status: 401 });
  }

  // Firma válida → respondemos 200; el resto best-effort, nunca bloquea.
  try {
    await ensureDatabaseHealed();

    const type = body.type ?? url.searchParams.get("type") ?? null;
    const action = body.action ?? null;
    const liveMode = typeof body.live_mode === "boolean" ? body.live_mode : null;
    // id del evento: el del cuerpo, o sintético (request-id/data.id) si falta.
    const eventId =
      (body.id != null ? String(body.id) : "") ||
      xRequestId ||
      `${dataId}:${Date.now()}`;

    await recordEvent({
      eventId,
      type,
      action,
      dataId: dataId || null,
      liveMode,
      raw: Object.keys(body).length ? body : { raw, query: url.search },
    });

    const isPayment =
      type === "payment" || (action ?? "").startsWith("payment.");
    if (isPayment && dataId) {
      await handlePaymentApproved(dataId);
    }
  } catch (e) {
    // Nunca bloquear el 200: MP reintenta solo ante no-2xx.
    console.error("[mp webhook]", e);
  }

  return Response.json({ ok: true });
}
