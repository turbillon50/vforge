/**
 * Métrica estrella del dashboard: "Ahorro del mes vs infra tradicional".
 *
 * Modelo BYO: el cliente usa los free tiers de SUS cuentas. Cada conexión
 * verificada representa un servicio que en infra tradicional administrada
 * pagaría. El ahorro es la suma de esos costos evitados (estimación de
 * referencia mensual en MXN, conservadora). Solo cuenta conexiones VERIFICADAS
 * — sin inventar números: si no hay conexiones, el ahorro es 0.
 */
import type { ConnectionView, Service } from "./credentials";

/** Costo mensual de referencia (MXN) que el cliente evita al traer su cuenta. */
export const SAVINGS_PER_SERVICE_MXN: Record<Service, number> = {
  // Equivalente a un hosting/compute administrado de gama baja.
  vercel: 380, // ~ $20 USD/mes plan Pro administrado
  // Postgres administrado de gama baja.
  neon: 360, // ~ $19 USD/mes Postgres administrado
  // CI/repos privados administrados.
  github: 80, // ~ $4 USD/mes asientos/CI
};

/** Orquestación que VForge aporta sin que el cliente monte su propio panel. */
export const ORCHESTRATION_VALUE_MXN = 150;

export interface SavingsBreakdown {
  service: Service;
  verified: boolean;
  monthlyMxn: number;
}

export interface Savings {
  monthlyMxn: number;
  annualMxn: number;
  breakdown: SavingsBreakdown[];
  verifiedCount: number;
}

export function computeSavings(connections: ConnectionView[]): Savings {
  const breakdown: SavingsBreakdown[] = connections.map((c) => {
    const verified = c.status === "verified";
    return {
      service: c.service,
      verified,
      monthlyMxn: verified ? SAVINGS_PER_SERVICE_MXN[c.service] ?? 0 : 0,
    };
  });
  const verifiedCount = breakdown.filter((b) => b.verified).length;
  const base = breakdown.reduce((sum, b) => sum + b.monthlyMxn, 0);
  // El valor de orquestación solo aplica si la esfera tiene al menos 1 conexión viva.
  const monthlyMxn = base + (verifiedCount > 0 ? ORCHESTRATION_VALUE_MXN : 0);
  return { monthlyMxn, annualMxn: monthlyMxn * 12, breakdown, verifiedCount };
}
