/**
 * POST /api/contracts/[id]/send  (owner)
 *
 * Genera el documento del contrato con los datos reales del proyecto y lo
 * manda a firmar:
 *   - Si DocuSign está configurado → crea + envía el envelope (firma real por
 *     correo) y guarda docusign_envelope_id. Estado → 'sent'.
 *   - Si no → modo manual: marca 'sent' igual (el contrato existe y queda
 *     listo para firma/seguimiento). Se enciende la firma automática en cuanto
 *     se suelten las credenciales DocuSign, sin tocar código.
 *
 * Registra el hito en project_timeline y avisa a Luis por WhatsApp.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";
import { getContract } from "@/lib/contracts/queries";
import { renderContractHtml } from "@/lib/contracts/template";
import {
  docusignConfigured,
  createAndSendEnvelope,
} from "@/lib/docusign/client";
import { addTimelineEvent } from "@/lib/projects/timeline";
import { notifyOwner } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vforge.site"
).replace(/\/$/, "");

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const overrideName =
    typeof body.signer_name === "string" ? body.signer_name.trim() : "";
  const overrideEmail =
    typeof body.signer_email === "string"
      ? body.signer_email.trim().toLowerCase()
      : "";

  try {
    const contract = await getContract(id);
    if (!contract) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 },
      );
    }

    const project = await queryOne<{ name: string }>(
      `SELECT name FROM projects WHERE id = $1`,
      [contract.project_id],
    );
    const signerName = overrideName || contract.signer_name || contract.client_name;
    const signerEmail = overrideEmail || contract.signer_email || "";

    const today = new Date().toLocaleDateString("es-MX");
    const html = renderContractHtml({
      contractId: contract.id,
      projectName: project?.name ?? contract.client_name,
      clientName: contract.client_name,
      product: contract.product,
      amountMxn: contract.amount,
      signerName,
      date: today,
    });

    let envelopeId: string | null = null;
    let mode: "docusign" | "manual" = "manual";

    if (docusignConfigured()) {
      if (!signerEmail) {
        return NextResponse.json(
          { error: "Falta el correo del firmante para enviar a DocuSign" },
          { status: 400 },
        );
      }
      const env = await createAndSendEnvelope({
        contractId: contract.id,
        documentHtml: html,
        documentName: `Contrato ${project?.name ?? contract.client_name}`,
        signerName,
        signerEmail,
        emailSubject: `Contrato de servicios — ${project?.name ?? "V Momentum"}`,
        returnUrl: `${SITE_URL}/api/docusign/callback?contract_id=${contract.id}`,
      });
      envelopeId = env.envelopeId;
      mode = "docusign";
    }

    await queryOne(
      `UPDATE contracts
         SET status = 'sent',
             sent_at = now(),
             updated_at = now(),
             signer_name = COALESCE(NULLIF($2,''), signer_name),
             signer_email = COALESCE(NULLIF($3,''), signer_email),
             docusign_envelope_id = COALESCE($4, docusign_envelope_id)
       WHERE id = $1`,
      [contract.id, signerName, signerEmail, envelopeId],
    );

    await addTimelineEvent(contract.project_id, {
      stage: "Contrato",
      status: "in_progress",
      title: "Contrato enviado a firma",
      detail:
        mode === "docusign"
          ? `Enviado a ${signerEmail} vía DocuSign.`
          : "Generado y listo para firma.",
    });

    notifyOwner(
      `📄 Contrato enviado a firma\nCliente: ${contract.client_name}\nProyecto: ${project?.name ?? contract.project_id}\nMonto: $${contract.amount.toLocaleString("es-MX")} MXN\nModo: ${mode}`,
    ).catch(() => null);

    const updated = await getContract(contract.id);
    return NextResponse.json({ contract: updated, mode, envelopeId });
  } catch (err) {
    console.error("[contracts/send] error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "No se pudo enviar el contrato a firma",
      },
      { status: 500 },
    );
  }
}
