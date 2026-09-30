/**
 * Servidor del banco de pruebas de /app/projects.
 *
 * 1. Arma con esbuild la pantalla real (scripts/qa/harness/entry.tsx).
 * 2. Sirve una página con el CSS compilado de la app (se toma del `next dev`
 *    que corre al lado, o de --css) para que se vea como se ve de verdad.
 * 3. Responde las APIs que usa la pantalla con el catálogo REAL medido
 *    (qa/catalogo-b4.json) y con respuestas fieles al contrato ya verificado
 *    contra la base con curl.
 *
 * Uso: node scripts/qa/servir-b4.mjs [--puerto 4477] [--css URL]
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { build } from "esbuild";

const args = process.argv.slice(2);
const opt = (k, def) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : def;
};

const puerto = Number(opt("--puerto", "4477"));
const cssUrl = opt("--css", "http://127.0.0.1:3477/_next/static/chunks/_0khx2n8._.css");
const raiz = process.cwd();

const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, "qa/catalogo-b4.json"), "utf8"));
const sugerencias = catalogo.projects.flatMap((p) =>
  (p.sugerencias ?? []).map((s) => ({ ...s, project_id: p.id, project_name: p.name })),
);

const resultado = await build({
  entryPoints: [path.join(raiz, "scripts/qa/harness/entry.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  target: ["safari15", "chrome100"],
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".ts": "ts" },
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": path.join(raiz, "scripts/qa/harness/next-link.tsx"),
    "@": raiz,
  },
  logLevel: "warning",
});
const bundle = resultado.outputFiles[0].text;
console.log(`bundle listo: ${(bundle.length / 1024).toFixed(0)} KB`);

const html = `<!doctype html>
<html lang="es" class="h-full">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Proyectos — banco de pruebas B4</title>
    <link rel="stylesheet" href="${cssUrl}" />
    <style>body{background:#fff;margin:0}</style>
  </head>
  <body class="h-full">
    <div id="root"></div>
    <script src="/bundle.js"></script>
  </body>
</html>`;

const json = (res, valor, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(valor));
};

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${puerto}`);
  const ruta = url.pathname;

  if (ruta === "/bundle.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(bundle);
    return;
  }
  if (ruta === "/api/projects") return json(res, catalogo);
  if (ruta === "/api/projects/suggestions") {
    if (req.method === "GET") return json(res, { sugerencias, total: sugerencias.length });
    return json(res, { encontradas: sugerencias.length, pendientes: sugerencias.length, nuevas: 0, refrescadas: sugerencias.length, sin_emparejar: [], sugerencias, aplicadas: 0, omitidas: [] });
  }
  if (ruta === "/api/projects/bulk") {
    let cuerpo = "";
    req.on("data", (c) => (cuerpo += c));
    req.on("end", () => {
      const { ids = [], patch = {} } = JSON.parse(cuerpo || "{}");
      json(res, { pedidos: ids.length, actualizados: ids.length, no_encontrados: [], cambios: patch });
    });
    return;
  }
  if (ruta === "/api/projects/health") return json(res, { sondeados: 0, vivos: 0, restantes: 0, resultados: [] });
  if (ruta.startsWith("/api/projects/") && ruta.endsWith("/notes")) return json(res, { notes: [] });
  if (ruta.startsWith("/api/")) return json(res, { ok: true });

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

servidor.listen(puerto, "127.0.0.1", () =>
  console.log(`banco de pruebas en http://127.0.0.1:${puerto}/app/projects`),
);
