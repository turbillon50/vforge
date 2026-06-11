/**
 * Esquema de pagos de V-Momentum: 3 parcialidades.
 *
 * El estándar de la fábrica (proyecto base 12k) se cobra en 3 pagos:
 *   1. Anticipo  — al firmar / arranque.
 *   2. Avance    — a mitad del desarrollo.
 *   3. Entrega   — contra entrega final.
 *
 * Se reparte en tercios; el redondeo sobrante se carga al primer pago para
 * que la suma cuadre EXACTO con el monto del contrato.
 */

export interface PaymentInstallment {
  idx: number;
  label: string;
  amount_mxn: number;
}

const LABELS = ["Anticipo (arranque)", "Avance (50%)", "Entrega (final)"] as const;

/** Construye las 3 parcialidades para un monto dado (en MXN). */
export function buildPaymentSchedule(amountMxn: number): PaymentInstallment[] {
  const total = Math.max(0, Math.round(amountMxn));
  const third = Math.floor(total / 3);
  const remainder = total - third * 3; // 0, 1 o 2 pesos sobrantes
  return LABELS.map((label, i) => ({
    idx: i + 1,
    label,
    amount_mxn: third + (i === 0 ? remainder : 0),
  }));
}

/**
 * Dado el total y lo ya pagado (de client_project_status), marca cuántas
 * parcialidades cuentan como pagadas (de mayor a menor índice cubierto).
 * Sirve para reflejar el avance real de cobro sin duplicar fuente de verdad.
 */
export function paidCountFromAmount(amountMxn: number, paidMxn: number): number {
  const schedule = buildPaymentSchedule(amountMxn);
  let remaining = Math.max(0, Math.round(paidMxn));
  let count = 0;
  for (const p of schedule) {
    if (remaining >= p.amount_mxn && p.amount_mxn > 0) {
      remaining -= p.amount_mxn;
      count += 1;
    } else {
      break;
    }
  }
  return count;
}
