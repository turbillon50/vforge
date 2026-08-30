import { neon } from "@neondatabase/serverless";

/**
 * POR QUE EXISTE
 *
 * El conector de Vercel llevaba meses roto y nadie podia decir por que:
 * el callback fallaba en silencio, sin dejar rastro. Sin bitacora no hay
 * diagnostico, solo adivinanza. Esta tabla hace que el flujo se explique
 * solo la proxima vez que se caiga.
 *
 * Nunca guarda el token ni el codigo de autorizacion: solo el resultado.
 */
export type Resultado =
  | "iniciado"
  | "ok"
  | "sin_code"
  | "sin_usuario"
  | "state_invalido"
  | "sin_credenciales"
  | "rechazo_proveedor"
  | "excepcion";

export async function registrarIntento(
  proveedor: string,
  resultado: Resultado,
  detalle?: string,
  userId?: string | null,
): Promise<void> {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return;
    const sql = neon(url);
    await sql`
      INSERT INTO connection_attempts (provider, user_id, result, detail)
      VALUES (${proveedor}, ${userId ?? null}, ${resultado}, ${detalle?.slice(0, 500) ?? null})
    `;
  } catch (e) {
    // Nunca tumbar el flujo de conexion por no poder escribir la bitacora.
    console.error("[attempt-log] no se pudo registrar:", e);
  }
}
