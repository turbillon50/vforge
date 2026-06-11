/**
 * POST /api/contracts/onboard  (owner)
 *
 * Da de alta un proyecto nuevo Y genera la invitación del cliente en un solo
 * paso (el flujo "Nuevo proyecto + invitación"):
 *   1. Crea el proyecto (projects) si no existe.
 *   2. Siembra su estado de cartera (client_project_status).
 *   3. Invita al cliente como rol cliente (project_members, status='invited').
 *   4. Devuelve el link de unión para mostrarlo como liga + QR.
 *
 * Body: {
 *   id, name, client_name?, total?, status?,
 *   method?: 'email'|'whatsapp', contact   // correo o teléfono del cliente
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vforge.site"
).replace(/\/$/, "");

const WHATSAPP_DOMAIN = "@whatsapp.invite";

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function POST(req: NextRequest) {
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const id = typeof body.id === "string" ? body.id.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!id || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
    return NextResponse.json(
      { error: "id requerido (a-z0-9_- en minúsculas)" },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }

  const clientName =
    (typeof body.client_name === "string" && body.client_name.trim()) || name;
  const total =
    typeof body.total === "number" && body.total > 0
      ? Math.round(body.total)
      : 12000;
  const cartStatus =
    (typeof body.status === "string" && body.status.trim()) || "arranque";
  const method = body.method === "whatsapp" ? "whatsapp" : "email";
  const rawContact = typeof body.contact === "string" ? body.contact.trim() : "";

  // --- 1. Proyecto (idempotente) ---
  try {
    await queryOne(
      `INSERT INTO projects (id, name, category, status)
       VALUES ($1, $2, 'activo', 'unknown')
       ON CONFLICT (id) DO NOTHING`,
      [id, name],
    );
  } catch (err) {
    console.error("[onboard] project insert", err);
    return NextResponse.json(
      { error: "No se pudo crear el proyecto" },
      { status: 500 },
    );
  }

  // --- 2. Cartera ---
  await queryOne(
    `INSERT INTO client_project_status (project_id, client_name, status, total_mxn, paid_mxn)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (project_id) DO UPDATE
       SET client_name = EXCLUDED.client_name`,
    [id, clientName, cartStatus, total],
  ).catch(() => null);

  // --- 3. Invitación ---
  let invitation: unknown = null;
  let contact = rawContact;
  if (rawContact) {
    let emailKey = "";
    if (method === "whatsapp") {
      const digits = rawContact.replace(/\D/g, "");
      if (digits.length >= 8) {
        emailKey = `wa-${digits}${WHATSAPP_DOMAIN}`;
        contact = `+${digits}`;
      }
    } else if (rawContact.includes("@")) {
      emailKey = rawContact.toLowerCase();
      contact = emailKey;
    }
    if (emailKey) {
      invitation = await queryOne(
        `INSERT INTO project_members
           (project_id, email, role, scope, method, phone, status, invited_by, invited_at)
         VALUES ($1, $2, 'viewer', 'cliente', $3, $4, 'invited', $5, now())
         ON CONFLICT (project_id, email) DO UPDATE
           SET role = 'viewer', scope = 'cliente', method = EXCLUDED.method
         RETURNING *`,
        [
          id,
          emailKey,
          method,
          method === "whatsapp" ? rawContact.replace(/\D/g, "") : null,
          ownerEmail,
        ],
      ).catch((e) => {
        console.error("[onboard] invite", e);
        return null;
      });
    }
  }

  const joinUrl = `${SITE_URL}/workspace/join/${id}`;

  return NextResponse.json(
    {
      project: { id, name },
      invitation,
      method,
      contact,
      joinUrl,
    },
    { status: 201 },
  );
}
