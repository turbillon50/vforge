/**
 * Conexión al BRAIN para el sistema nervioso de Vulcano.
 *
 * El webhook /api/webhooks/project-health escribe project_events y lessons,
 * y el agente /root/agents/nervous_system.py los LEE. Ambos DEBEN apuntar a
 * la MISMA base: el Brain central (Neon ep-super-glitter), donde viven
 * `lessons` + `patterns` con weight/decay que cura el protocolo de aprendizaje
 * y `brain_files` que lee cualquier chat de V. NO es la base operativa de la
 * app (DATABASE_URL / ep-empty-frost) — esa es otra mente distinta.
 *
 * Resolución de la connection string (primera que exista):
 *   NERVOUS_DATABASE_URL → BRAIN_DATABASE_URL → DATABASE_URL
 *
 * Lazy-init para no romper el build cuando la env falta.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _brain: NeonQueryFunction<false, false> | null = null;

function getBrain(): NeonQueryFunction<false, false> {
  if (_brain) return _brain;
  const url =
    process.env.NERVOUS_DATABASE_URL ??
    process.env.BRAIN_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error("NERVOUS_DATABASE_URL / BRAIN_DATABASE_URL / DATABASE_URL no están configuradas");
  }
  _brain = neon(url);
  return _brain;
}

/** Tagged-template SQL contra el Brain — solo en tiempo de request. */
export const brainSql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getBrain() as any)(...args);
    },
    get(_t, prop: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getBrain() as any)[prop];
    },
  },
);
