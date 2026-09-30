/**
 * Servidor del banco de la Fábrica: estáticos + /api/fabrica/estado con los JSON
 * REALES del colector (mismo contrato que la ruta de Next, sin el gate de Clerk).
 * Uso: node servicios/fabrica/banco/servidor.mjs [puerto]
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, "publico");
const PUERTO = Number(process.argv[2] ?? 9347);
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const leer = (f) => JSON.parse(readFileSync(f, "utf8"));

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/fabrica/estado") {
    const ahora = leer("/var/www/pulso/trabajos.json");
    const cuerpo = url.searchParams.get("solo") === "ahora" ? { ahora } : { ...leer("/var/www/pulso/estado.json"), ahora };
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify(cuerpo));
  }
  const nombre = url.pathname === "/" ? "/pagina.html" : url.pathname;
  const archivo = path.join(PUBLICO, path.normalize(nombre).replace(/^(\.\.[/\\])+/, ""));
  if (!archivo.startsWith(PUBLICO) || !existsSync(archivo)) {
    res.writeHead(404);
    return res.end("no existe");
  }
  res.writeHead(200, { "content-type": TIPOS[path.extname(archivo)] ?? "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(archivo));
}).listen(PUERTO, "127.0.0.1", () => console.log(`banco fábrica en :${PUERTO}`));
