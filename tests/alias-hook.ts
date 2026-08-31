/**
 * Puente de resolución para `node --test`.
 *
 * Los tests se compilan a CommonJS en .test-dist, pero el código de la app
 * importa con el alias `@/...` (que sólo entiende TypeScript/Next) y algunos
 * módulos de servidor importan `server-only`, que lanza a propósito fuera de
 * un React Server Component. Por eso dos archivos de prueba no corrían: no
 * estaban mal escritos, no podían ni cargarse.
 *
 * Este hook los hace ejecutables sin dependencias nuevas: mapea `@/x` a la
 * raíz compilada y convierte `server-only` en un módulo vacío.
 */
import Module from "node:module";
import path from "node:path";

interface ResolverHost {
  _resolveFilename(request: string, ...rest: unknown[]): string;
}

const host = Module as unknown as ResolverHost;
const raiz = path.resolve(__dirname, "..");
const vacio = path.join(__dirname, "server-only-stub.js");
const original = host._resolveFilename;

host._resolveFilename = function (request: string, ...rest: unknown[]): string {
  if (request === "server-only") return vacio;
  const destino = request.startsWith("@/")
    ? path.join(raiz, request.slice(2))
    : request;
  return original.call(this, destino, ...rest);
};
