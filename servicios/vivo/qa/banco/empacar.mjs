/**
 * Empaquetador mínimo para el banco de paneles.
 *
 * En este servidor no hay esbuild y `next build` no se corre (RAM). Pero `tsc` ya
 * es devDep y React trae compilaciones CommonJS: con eso alcanza. Esto toma la
 * salida CommonJS de tsc, sigue los `require` (relativos y de node_modules) y
 * escribe UN archivo para el navegador. Sin dependencias nuevas.
 *
 * Uso: node servicios/vivo/qa/banco/empacar.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../../../..");
const ENTRADA = path.join(RAIZ, ".banco-dist/servicios/vivo/qa/banco/entrada.js");
const SALIDA = path.join(AQUI, "publico/banco.js");

const requerir = createRequire(path.join(RAIZ, "empacar-anclaje.cjs"));

/** Resuelve un especificador de `require` al archivo real. */
function resolver(especificador, desde) {
  const base = path.dirname(desde);
  // Los alias @/ los deja tsc como rutas relativas, pero por si acaso.
  if (especificador.startsWith("@/")) {
    return requerir.resolve(path.join(RAIZ, ".banco-dist", especificador.slice(2)));
  }
  if (especificador.startsWith(".")) {
    return requerir.resolve(path.resolve(base, especificador));
  }
  // node_modules: que node haga el trabajo, pero pidiendo la cara CommonJS.
  return requerir.resolve(especificador, { paths: [base, RAIZ] });
}

const modulos = new Map(); // id → { fuente, mapa }
const pendientes = [ENTRADA];
const faltantes = [];

const RE_REQUIRE = /(?<![.\w$])require\(\s*(["'])([^"']+)\1\s*\)/g;

while (pendientes.length) {
  const id = pendientes.pop();
  if (modulos.has(id)) continue;
  if (!existsSync(id)) {
    faltantes.push(id);
    continue;
  }
  const fuente = readFileSync(id, "utf8");
  const mapa = {};
  for (const [, , especificador] of fuente.matchAll(RE_REQUIRE)) {
    if (mapa[especificador]) continue;
    try {
      const destino = resolver(especificador, id);
      mapa[especificador] = destino;
      pendientes.push(destino);
    } catch {
      // `require` que no se puede resolver (opcional o dinámico): queda apuntado.
      faltantes.push(`${especificador} (desde ${path.relative(RAIZ, id)})`);
    }
  }
  modulos.set(id, { fuente, mapa });
}

const idCorto = (id) => path.relative(RAIZ, id).replace(/\\/g, "/");

let cuerpo = "";
for (const [id, { fuente, mapa }] of modulos) {
  const mapaCorto = Object.fromEntries(
    Object.entries(mapa).map(([especificador, destino]) => [especificador, idCorto(destino)]),
  );
  cuerpo += `__def(${JSON.stringify(idCorto(id))}, ${JSON.stringify(mapaCorto)}, function (module, exports, require) {\n${fuente}\n});\n`;
}

const paquete = `/* generado por servicios/vivo/qa/banco/empacar.mjs — no editar a mano */
(function () {
  var __mods = {}, __cache = {};
  if (typeof process === "undefined") {
    window.process = { env: { NODE_ENV: "development" }, nextTick: function (f) { setTimeout(f, 0); } };
  }
  function __def(id, mapa, fn) { __mods[id] = { mapa: mapa, fn: fn }; }
  function __req(id) {
    if (__cache[id]) return __cache[id].exports;
    var mod = __mods[id];
    if (!mod) throw new Error("módulo fuera del paquete: " + id);
    var module = { exports: {} };
    __cache[id] = module;
    mod.fn(module, module.exports, function (especificador) {
      var destino = mod.mapa[especificador];
      if (!destino) throw new Error("no resuelto: " + especificador + " desde " + id);
      return __req(destino);
    });
    return module.exports;
  }
${cuerpo}
  __req(${JSON.stringify(idCorto(ENTRADA))});
})();
`;

mkdirSync(path.dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, paquete);

console.log(`módulos: ${modulos.size}`);
console.log(`salida: ${path.relative(RAIZ, SALIDA)} (${(paquete.length / 1024).toFixed(0)} KB)`);
if (faltantes.length) {
  console.log(`sin resolver (${faltantes.length}):`);
  for (const f of faltantes.slice(0, 12)) console.log(`  · ${f}`);
}
