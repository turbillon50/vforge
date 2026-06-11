/**
 * Queries de contratos — fuente de verdad para la UI de /app/contracts y para
 * el portal del cliente. Sin mocks: todo sale de la tabla `contracts` +
 * `contract_payments`, enriquecido con el avance de cobro real que vive en
 * `client_project_status`.
 */
import { queryAll, queryOne } from "@/lib/db/client";
import {
  buildPaymentSchedule,
  paidCountFromAmount,
  type PaymentInstallment,
} from "./payments";

export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "declined"
  | "voided";

export interface ContractRow {
  id: string;
  project_id: string;
  client_name: string;
  product: string;
  amount_mxn: string; // numeric llega como string desde pg
  currency: string;
  status: ContractStatus;
  signer_name: string | null;
  signer_email: string | null;
  docusign_envelope_id: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  contract_id: string;
  idx: number;
  label: string;
  amount_mxn: string;
  status: "pending" | "paid";
  paid_at: string | null;
}

export interface ContractWithPayments extends ContractRow {
  amount: number;
  payments: Array<{
    idx: number;
    label: string;
    amount: number;
    status: "pending" | "paid";
    paid_at: string | null;
  }>;
  paid_count: number;
  paid_mxn: number;
  progress: number; // 0..100 (avance de cobro)
}

/** Crea las 3 parcialidades V-Momentum para un contrato recién creado. */
export async function seedPaymentsForContract(
  contractId: string,
  amountMxn: number,
): Promise<void> {
  const schedule: PaymentInstallment[] = buildPaymentSchedule(amountMxn);
  for (const p of schedule) {
    await queryOne(
      `INSERT INTO contract_payments (contract_id, idx, label, amount_mxn)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (contract_id, idx) DO UPDATE
         SET label = EXCLUDED.label, amount_mxn = EXCLUDED.amount_mxn`,
      [contractId, p.idx, p.label, p.amount_mxn],
    );
  }
}

/** Enriquecimiento común: paga parcialidades según el avance real de cobro. */
function enrich(
  c: ContractRow,
  payments: PaymentRow[],
  paidMxnFromPortfolio: number | null,
): ContractWithPayments {
  const amount = Number(c.amount_mxn) || 0;
  const sched = payments.length
    ? payments.map((p) => ({
        idx: p.idx,
        label: p.label,
        amount: Number(p.amount_mxn) || 0,
        status: p.status,
        paid_at: p.paid_at,
      }))
    : buildPaymentSchedule(amount).map((p) => ({
        idx: p.idx,
        label: p.label,
        amount: p.amount_mxn,
        status: "pending" as const,
        paid_at: null,
      }));

  // Avance de cobro: prioriza los pagos marcados; si no hay, deriva del monto
  // pagado registrado en la cartera (client_project_status).
  let paidCount = sched.filter((p) => p.status === "paid").length;
  if (paidCount === 0 && paidMxnFromPortfolio && paidMxnFromPortfolio > 0) {
    paidCount = paidCountFromAmount(amount, paidMxnFromPortfolio);
  }
  const paidMxn = sched
    .slice(0, paidCount)
    .reduce((s, p) => s + p.amount, 0);
  const progress = amount > 0 ? Math.round((paidMxn / amount) * 100) : 0;

  return {
    ...c,
    amount,
    payments: sched,
    paid_count: paidCount,
    paid_mxn: paidMxn,
    progress: Math.min(100, progress),
  };
}

/** Lista todos los contratos (vista del owner) con sus pagos y avance. */
export async function listContracts(): Promise<ContractWithPayments[]> {
  const contracts = await queryAll<ContractRow>(
    `SELECT * FROM contracts ORDER BY created_at DESC`,
  );
  if (contracts.length === 0) return [];

  const ids = contracts.map((c) => c.id);
  const payments = await queryAll<PaymentRow>(
    `SELECT * FROM contract_payments WHERE contract_id = ANY($1) ORDER BY idx ASC`,
    [ids],
  );
  const projIds = Array.from(new Set(contracts.map((c) => c.project_id)));
  const portfolio = await queryAll<{ project_id: string; paid_mxn: string }>(
    `SELECT project_id, paid_mxn FROM client_project_status WHERE project_id = ANY($1)`,
    [projIds],
  );
  const paidByProject = new Map(
    portfolio.map((p) => [p.project_id, Number(p.paid_mxn) || 0]),
  );

  return contracts.map((c) =>
    enrich(
      c,
      payments.filter((p) => p.contract_id === c.id),
      paidByProject.get(c.project_id) ?? null,
    ),
  );
}

/** Un contrato por id, enriquecido. */
export async function getContract(
  id: string,
): Promise<ContractWithPayments | null> {
  const c = await queryOne<ContractRow>(
    `SELECT * FROM contracts WHERE id = $1`,
    [id],
  );
  if (!c) return null;
  const payments = await queryAll<PaymentRow>(
    `SELECT * FROM contract_payments WHERE contract_id = $1 ORDER BY idx ASC`,
    [id],
  );
  const cps = await queryOne<{ paid_mxn: string }>(
    `SELECT paid_mxn FROM client_project_status WHERE project_id = $1`,
    [c.project_id],
  );
  return enrich(c, payments, cps ? Number(cps.paid_mxn) || 0 : null);
}

/** Contratos de un proyecto (para el portal del cliente). */
export async function listContractsForProject(
  projectId: string,
): Promise<ContractWithPayments[]> {
  const contracts = await queryAll<ContractRow>(
    `SELECT * FROM contracts WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  );
  if (contracts.length === 0) return [];
  const ids = contracts.map((c) => c.id);
  const payments = await queryAll<PaymentRow>(
    `SELECT * FROM contract_payments WHERE contract_id = ANY($1) ORDER BY idx ASC`,
    [ids],
  );
  const cps = await queryOne<{ paid_mxn: string }>(
    `SELECT paid_mxn FROM client_project_status WHERE project_id = $1`,
    [projectId],
  );
  const paid = cps ? Number(cps.paid_mxn) || 0 : null;
  return contracts.map((c) =>
    enrich(c, payments.filter((p) => p.contract_id === c.id), paid),
  );
}
