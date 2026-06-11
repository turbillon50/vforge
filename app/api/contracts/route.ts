/**
 * API Contratos (owner).
 *
 * GET  — lista todos los contratos con su esquema de pagos y avance de cobro.
 * POST — crea un contrato a partir de un proyecto. Body:
 *          { project_id, product?, amount?, signer_name?, signer_email? }
 *        El nombre del cliente y el monto se toman de client_project_status
 *        (la cartera real) cuando existen. Crea las 3 parcialidades
 *        V-Momentum. Devuelve el contrato enriquecido.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";
import {
  listContracts,
  getContract,
  seedPaymentsForContract,
} from "@/lib/contracts/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function GET() {
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const contracts = await listContracts();
    const signed = contracts.filter((c) => c.status === "signed").length;
    const pending = contracts.filter((c) => c.status === "sent").length;
    const drafts = contracts.filter((c) => c.status === "draft").length;
    const totalValue = contracts.reduce((s, c) => s + c.amount, 0);
    return NextResponse.json(
      {
        contracts,
        metrics: { signed, pending, drafts, total: contracts.length, totalValue },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[contracts] GET error:", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los contratos" },
      { status: 500 },
    );
  }
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
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const projectId =
    typeof body.project_id === "string" ? body.project_id.trim() : "";
  if (!projectId) {
    return NextResponse.json({ error: "project_id requerido" }, { status: 400 });
  }

  try {
    const project = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM projects WHERE id = $1`,
      [projectId],
    );
    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 },
      );
    }

    const cps = await queryOne<{
      client_name: string;
      total_mxn: string;
    }>(
      `SELECT client_name, total_mxn FROM client_project_status WHERE project_id = $1`,
      [projectId],
    );

    const clientName =
      (typeof body.client_name === "string" && body.client_name.trim()) ||
      cps?.client_name ||
      project.name;
    const product =
      (typeof body.product === "string" && body.product.trim()) ||
      "Aplicación Personalizada";
    const amount =
      typeof body.amount === "number" && body.amount > 0
        ? Math.round(body.amount)
        : cps?.total_mxn
          ? Math.round(Number(cps.total_mxn))
          : 12000;
    const signerName =
      typeof body.signer_name === "string" ? body.signer_name.trim() : null;
    const signerEmail =
      typeof body.signer_email === "string"
        ? body.signer_email.trim().toLowerCase()
        : null;

    const created = await queryOne<{ id: string }>(
      `INSERT INTO contracts
         (project_id, client_name, product, amount_mxn, signer_name, signer_email, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING id`,
      [projectId, clientName, product, amount, signerName, signerEmail, ownerEmail],
    );
    if (!created) throw new Error("insert failed");

    await seedPaymentsForContract(created.id, amount);
    const contract = await getContract(created.id);

    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    console.error("[contracts] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el contrato" },
      { status: 500 },
    );
  }
}
