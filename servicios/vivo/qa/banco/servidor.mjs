/**
 * Servidor del banco de paneles.
 *
 * Sirve la página del banco y hace de puente a `vf-vivo` con la llave del
 * servicio, ocupando el lugar exacto que en el Estudio ocupan las rutas
 * `/api/vivo/*` de Next (que además piden sesión de owner de Clerk, imposible
 * headless). El motor, el archivo que se escribe y los commits son los de verdad.
 *
 * `publicar` NO se reenvía: empujaría a la rama de producción del piloto. Se
 * contesta con la forma real y la marca `simulado: true`, para poder ver el
 * camino de la confirmación en pantalla sin tocar producción. El push de verdad
 * ya se probó aparte, contra una rama desechable.
 *
 * Uso: node servicios/vivo/qa/banco/servidor.mjs [puerto]
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, "publico");
const PUERTO = Number(process.argv[2] ?? 9345);
const MOTOR = process.env.VIVO_LOCAL ?? "http://127.0.0.1:9311";

const SECRETO = (() => {
  const archivo = "/etc/vl-secrets/vivo.env";
  if (!existsSync(archivo)) throw new Error(`falta ${archivo}`);
  const m = /^VIVO_SECRET=(.+)$/m.exec(readFileSync(archivo, "utf8"));
  if (!m) throw new Error("VIVO_SECRET no está en el archivo de secretos");
  return m[1].trim();
})();

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

/** Bitácora de lo que pasó por el puente: la prueba la lee para comprobar. */
const bitacora = [];

function json(res, codigo, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(cuerpo);
}

async function leerCuerpo(req) {
  const trozos = [];
  for await (const trozo of req) trozos.push(trozo);
  return JSON.parse(Buffer.concat(trozos).toString("utf8") || "{}");
}

async function alMotor(ruta, cuerpo) {
  const respuesta = await fetch(`${MOTOR}${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vivo-key": SECRETO },
    body: JSON.stringify(cuerpo),
  });
  return { codigo: respuesta.status, datos: await respuesta.json() };
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);

  try {
    if (req.method === "POST" && url.pathname === "/api/vivo/edit") {
      const { proyecto, src, operacion } = await leerCuerpo(req);
      const r = await alMotor("/__vivo/api/edit", { project: proyecto, src, operacion });
      bitacora.push({ que: "edit", src, operacion, codigo: r.codigo, datos: r.datos });
      return json(res, r.codigo, r.datos);
    }

    if (req.method === "POST" && url.pathname === "/api/vivo/git") {
      const { proyecto, accion, ...resto } = await leerCuerpo(req);

      if (accion === "publicar") {
        const simulado = {
          ok: true,
          publicado: "SIMULADO",
          rama: "master",
          simulado: true,
        };
        bitacora.push({ que: "git", accion, codigo: 200, datos: simulado });
        return json(res, 200, simulado);
      }

      const r = await alMotor("/__vivo/api/git", { project: proyecto, accion, ...resto });
      bitacora.push({ que: "git", accion, codigo: r.codigo, datos: r.datos });
      return json(res, r.codigo, r.datos);
    }

    // Encargos de V: mismo contrato que /api/vivo/encargo de Next.
    if (url.pathname === "/api/vivo/encargo") {
      if (req.method === "POST") {
        const { proyecto, pedido, elemento } = await leerCuerpo(req);
        const r = await alMotor("/__vivo/api/encargo", { project: proyecto, pedido, elemento, agente: "claude" });
        bitacora.push({ que: "encargo", pedido, codigo: r.codigo, datos: r.datos });
        return json(res, r.codigo === 202 ? 202 : r.codigo, r.datos);
      }
      const r = await alMotor("/__vivo/api/encargos", { project: url.searchParams.get("proyecto"), limite: 8 });
      return json(res, r.codigo, r.datos);
    }

    if (url.pathname === "/api/banco/bitacora") {
      return json(res, 200, { bitacora });
    }

    // Estáticos
    const nombre = url.pathname === "/" ? "/pagina.html" : url.pathname;
    const archivo = path.join(PUBLICO, path.normalize(nombre).replace(/^(\.\.[/\\])+/, ""));
    if (!archivo.startsWith(PUBLICO) || !existsSync(archivo)) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("no existe");
    }
    res.writeHead(200, {
      "content-type": TIPOS[path.extname(archivo)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    return res.end(readFileSync(archivo));
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`banco de paneles en http://127.0.0.1:${PUERTO} (motor: ${MOTOR})`);
});
