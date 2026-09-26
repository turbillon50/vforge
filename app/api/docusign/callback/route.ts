/**
 * /api/docusign/callback
 *
 * Punto único que cierra el ciclo de firma DocuSign. Atiende 3 casos:
 *
 *  1) POST  — webhook de DocuSign Connect. Cuando un envelope queda
 *     'completed' (firmado), marca el contrato como firmado, registra el hito
 *     en project_timeline y avisa por WhatsApp al cliente y a Luis.
 *
 *  2) GET ?contract_id&event=...  — retorno del firmante tras firmar (o marca
 *     manual). Si el evento indica firma completada, hace lo mismo que el
 *     webhook y muestra una página de éxito.
 *
 *  3) GET ?code&state  — callback OAuth (consent JWT). Muestra la página de
 *     autorización recibida (comportamiento histórico).
 *
 * Es público a propósito (DocuSign lo llama sin sesión); la correlación se hace
 * por envelopeId / contract_id, no por sesión.
 */
import { queryOne } from "@/lib/db/client";
import { addTimelineEvent } from "@/lib/projects/timeline";
import { notifyOwner, sendWhatsapp } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContractRow = {
  id: string;
  project_id: string;
  client_name: string;
  status: string;
};

/** Marca un contrato como firmado (idempotente) y dispara timeline + avisos. */
async function markSigned(opts: {
  contractId?: string | null;
  envelopeId?: string | null;
}): Promise<ContractRow | null> {
  const { contractId, envelopeId } = opts;
  let contract: ContractRow | null = null;
  if (contractId) {
    contract = await queryOne<ContractRow>(
      `SELECT id, project_id, client_name, status FROM contracts WHERE id = $1`,
      [contractId],
    );
  }
  if (!contract && envelopeId) {
    contract = await queryOne<ContractRow>(
      `SELECT id, project_id, client_name, status FROM contracts WHERE docusign_envelope_id = $1`,
      [envelopeId],
    );
  }
  if (!contract) return null;
  if (contract.status === "signed") return contract; // idempotente

  await queryOne(
    `UPDATE contracts
        SET status = 'signed', signed_at = now(), updated_at = now(),
            docusign_envelope_id = COALESCE($2, docusign_envelope_id)
      WHERE id = $1`,
    [contract.id, envelopeId ?? null],
  );

  const project = await queryOne<{ name: string }>(
    `SELECT name FROM projects WHERE id = $1`,
    [contract.project_id],
  );
  const projectName = project?.name ?? contract.project_id;

  await addTimelineEvent(contract.project_id, {
    stage: "Contrato",
    status: "done",
    title: "Contrato firmado ✅",
    detail: `${contract.client_name} firmó el contrato. ¡Arrancamos!`,
  });

  // Aviso a Luis.
  notifyOwner(
    `✅ Contrato FIRMADO\nCliente: ${contract.client_name}\nProyecto: ${projectName}`,
  ).catch(() => null);

  // Aviso al cliente por WhatsApp (si tenemos su teléfono en project_members).
  const member = await queryOne<{ phone: string | null; email: string }>(
    `SELECT phone, email FROM project_members
      WHERE project_id = $1 AND (phone IS NOT NULL OR email LIKE 'wa-%')
      ORDER BY invited_at DESC LIMIT 1`,
    [contract.project_id],
  );
  const phone =
    member?.phone ??
    (member?.email?.startsWith("wa-")
      ? member.email.slice(3).split("@")[0]
      : null);
  if (phone) {
    sendWhatsapp(
      phone,
      `✅ ¡Tu contrato de *${projectName}* quedó firmado! Ya puedes seguir el avance en tu portal de V·Forge.`,
    ).catch(() => null);
  }

  return contract;
}

/** Extrae envelopeId + status + contract_id de distintos formatos de Connect. */
function parseConnectPayload(body: unknown): {
  envelopeId: string | null;
  status: string | null;
  contractId: string | null;
} {
  const b = (body ?? {}) as Record<string, unknown>;
  // Formato simple propio { contract_id, envelope_id, status }
  const direct = {
    envelopeId:
      (typeof b.envelope_id === "string" && b.envelope_id) ||
      (typeof b.envelopeId === "string" && b.envelopeId) ||
      null,
    status:
      (typeof b.status === "string" && b.status) ||
      (typeof b.event === "string" && b.event) ||
      null,
    contractId:
      (typeof b.contract_id === "string" && b.contract_id) ||
      (typeof b.contractId === "string" && b.contractId) ||
      null,
  };
  // Connect 2.0 JSON: { event, data: { envelopeId, envelopeSummary: { status, customFields } } }
  const data = b.data as Record<string, unknown> | undefined;
  if (data) {
    const summary = data.envelopeSummary as Record<string, unknown> | undefined;
    direct.envelopeId =
      (typeof data.envelopeId === "string" && data.envelopeId) ||
      direct.envelopeId;
    direct.status =
      (summary && typeof summary.status === "string" && summary.status) ||
      direct.status;
    const cf = summary?.customFields as
      | { textCustomFields?: Array<{ name?: string; value?: string }> }
      | undefined;
    const cidField = cf?.textCustomFields?.find(
      (f) => f.name === "contract_id",
    );
    if (cidField?.value) direct.contractId = cidField.value;
  }
  return direct;
}

function isCompleted(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s === "completed" ||
    s === "signed" ||
    s === "signing_complete" ||
    s === "envelope-completed"
  );
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // DocuSign Connect XML no soportado: respondemos 200 para no reintentar.
    return new Response(JSON.stringify({ ok: true, ignored: "non-json" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { envelopeId, status, contractId } = parseConnectPayload(body);
  console.log("[docusign/callback] POST", { envelopeId, status, contractId });

  if (isCompleted(status)) {
    const contract = await markSigned({ contractId, envelopeId });
    return new Response(
      JSON.stringify({ ok: true, signed: Boolean(contract) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(JSON.stringify({ ok: true, ignored: status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const contractId = searchParams.get("contract_id");
  const event = searchParams.get("event");

  // Caso 2: retorno del firmante / marca de firma.
  if (contractId && isCompleted(event)) {
    await markSigned({ contractId });
    return successHtml(
      "Contrato firmado",
      "Tu firma quedó registrada. Ya puedes cerrar esta ventana.",
    );
  }

  // Caso 3: OAuth consent (JWT) — comportamiento histórico.
  console.log("[docusign/callback] OAuth code:", code, "state:", state);
  return successHtml(
    "Autorización DocuSign recibida",
    "La autorización fue procesada correctamente. Ya puede cerrar esta ventana.",
  );
}

function successHtml(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0a0a0f;color:#e2e8f0;display:flex;align-items:center;justify-content:center;}
  .card{text-align:center;max-width:440px;padding:2.5rem 2rem;background:#111118;border:1px solid rgba(139,92,246,.2);border-radius:16px;box-shadow:0 0 40px rgba(139,92,246,.08);}
  .icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:50%;margin-bottom:1.25rem;}
  .icon svg{width:28px;height:28px;color:#10b981;}
  h1{font-size:1.25rem;font-weight:600;color:#f1f5f9;letter-spacing:-.02em;margin-bottom:.75rem;}
  p{font-size:.9rem;line-height:1.6;color:#94a3b8;}
  .badge{display:inline-block;margin-top:1.25rem;padding:.3rem .75rem;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.25);border-radius:9999px;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:#a78bfa;}
</style></head>
<body><div class="card">
  <div class="icon"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
  <h1>${title}</h1><p>${message}</p>
  <span class="badge">VForge · DocuSign</span>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
