/**
 * Cliente DocuSign eSignature (REST + JWT Grant) — server-only, sin SDK.
 *
 * Flujo real de firma:
 *   1. JWT Grant (RS256) → access_token  (getAccessToken)
 *   2. Crear + enviar envelope con el HTML del contrato y una pestaña de firma
 *      anclada en `**firma_cliente**`  (createAndSendEnvelope)
 *   3. DocuSign Connect (webhook) o el retorno OAuth llaman a
 *      /api/docusign/callback, que marca el contrato como firmado.
 *
 * Se activa SOLO si están las credenciales en entorno. Sin ellas,
 * docusignConfigured() === false y el caller usa el modo manual (genera el
 * contrato y lo marca 'sent' sin envelope). Así el producto funciona hoy y
 * "se enciende" la firma automática en cuanto Luis suelte la integration key.
 *
 * Variables requeridas:
 *   DOCUSIGN_INTEGRATION_KEY  — Client ID (iss del JWT)
 *   DOCUSIGN_USER_ID          — GUID del usuario a impersonar (sub del JWT)
 *   DOCUSIGN_ACCOUNT_ID       — API Account ID
 *   DOCUSIGN_PRIVATE_KEY      — RSA private key (PEM, con \n reales o escapados)
 *   DOCUSIGN_BASE_PATH        — p.ej. https://demo.docusign.net  (def: demo)
 *   DOCUSIGN_OAUTH_BASE       — account-d.docusign.com (demo) | account.docusign.com (prod)
 */
import crypto from "node:crypto";

const OAUTH_BASE = process.env.DOCUSIGN_OAUTH_BASE ?? "account-d.docusign.com";
const BASE_PATH = process.env.DOCUSIGN_BASE_PATH ?? "https://demo.docusign.net";

export function docusignConfigured(): boolean {
  return Boolean(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
      process.env.DOCUSIGN_USER_ID &&
      process.env.DOCUSIGN_ACCOUNT_ID &&
      process.env.DOCUSIGN_PRIVATE_KEY,
  );
}

function privateKeyPem(): string {
  // Acepta la key con saltos de línea reales o escapados como \n.
  return (process.env.DOCUSIGN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Firma un JWT RS256 con node:crypto (sin dependencias externas). */
function signJwt(claims: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign(privateKeyPem());
  return `${data}.${b64url(signature)}`;
}

/** Intercambia el JWT por un access_token de DocuSign. */
export async function getAccessToken(): Promise<string> {
  if (!docusignConfigured()) {
    throw new Error("DocuSign no configurado");
  }
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt({
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: process.env.DOCUSIGN_USER_ID,
    aud: OAUTH_BASE,
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  });

  const res = await fetch(`https://${OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      `DocuSign token error: ${json.error ?? res.status} ${
        json.error_description ?? ""
      }`.trim(),
    );
  }
  return json.access_token;
}

export interface CreateEnvelopeArgs {
  contractId: string;
  documentHtml: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  emailSubject: string;
  /** URL a la que DocuSign redirige tras firmar (callback). */
  returnUrl?: string;
}

/**
 * Crea y ENVÍA un envelope para firma. Devuelve el envelopeId.
 * La pestaña de firma se ancla al texto `**firma_cliente**` del contrato.
 */
export async function createAndSendEnvelope(
  args: CreateEnvelopeArgs,
): Promise<{ envelopeId: string; status: string }> {
  const token = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const documentBase64 = Buffer.from(args.documentHtml, "utf8").toString(
    "base64",
  );

  const envelopeDefinition = {
    emailSubject: args.emailSubject,
    status: "sent",
    documents: [
      {
        documentBase64,
        name: args.documentName,
        fileExtension: "html",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: args.signerEmail,
          name: args.signerName,
          recipientId: "1",
          routingOrder: "1",
          tabs: {
            signHereTabs: [
              {
                anchorString: "**firma_cliente**",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "-18",
              },
            ],
          },
        },
      ],
    },
    // Etiqueta para correlacionar el callback con nuestro contrato.
    customFields: {
      textCustomFields: [
        { name: "contract_id", value: args.contractId, show: "false" },
      ],
    },
  };

  const res = await fetch(
    `${BASE_PATH}/restapi/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeDefinition),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    envelopeId?: string;
    status?: string;
    message?: string;
  };
  if (!res.ok || !json.envelopeId) {
    throw new Error(`DocuSign envelope error: ${json.message ?? res.status}`);
  }
  return { envelopeId: json.envelopeId, status: json.status ?? "sent" };
}

/** Consulta el estado de un envelope (para reconciliar el callback). */
export async function getEnvelopeStatus(
  envelopeId: string,
): Promise<string | null> {
  if (!docusignConfigured()) return null;
  try {
    const token = await getAccessToken();
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
    const res = await fetch(
      `${BASE_PATH}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { status?: string };
    return json.status ?? null;
  } catch {
    return null;
  }
}
