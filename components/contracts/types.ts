/** Tipos compartidos de la UI de contratos (espejo de lib/contracts/queries). */
export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "declined"
  | "voided";

export interface PaymentUI {
  idx: number;
  label: string;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
}

export interface ContractUI {
  id: string;
  project_id: string;
  client_name: string;
  product: string;
  amount: number;
  currency: string;
  status: ContractStatus;
  signer_name: string | null;
  signer_email: string | null;
  docusign_envelope_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  payments: PaymentUI[];
  paid_count: number;
  paid_mxn: number;
  progress: number;
}

export interface ContractsMetrics {
  signed: number;
  pending: number;
  drafts: number;
  total: number;
  totalValue: number;
}

export const STATUS_META: Record<
  ContractStatus,
  { label: string; color: string }
> = {
  draft: { label: "Borrador", color: "#a78bfa" },
  sent: { label: "En firma", color: "#fbbf24" },
  signed: { label: "Firmado", color: "#34d399" },
  declined: { label: "Rechazado", color: "#f87171" },
  voided: { label: "Anulado", color: "#94a3b8" },
};

export const money = (n: number) =>
  `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export const moneyK = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}k` : money(n);
