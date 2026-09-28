/**
 * Medición del catálogo con el MISMO código que usa la pantalla.
 *
 * Corre `leerCatalogo()` contra la base real, imprime los números del estado
 * real y de las familias, y deja `qa/catalogo-b4.json` para que el corredor de
 * filtros (scripts/qa/filtros-b4.mjs) compare pantalla contra dato.
 *
 * Uso:
 *   npx tsc -p tsconfig.test.json
 *   DATABASE_URL=... node --require ./.test-dist/tests/alias-hook.js \
 *     .test-dist/scripts/qa/medir-b4.js
 */
import fs from "node:fs";
import path from "node:path";
import { leerCatalogo } from "@/lib/projects/catalogo";
import { agruparFamilias } from "@/lib/projects/familias";

async function main() {
  const proyectos = await leerCatalogo();
  const cuenta = <T>(lista: T[], clave: (x: T) => string) => {
    const m = new Map<string, number>();
    for (const x of lista) m.set(clave(x), (m.get(clave(x)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  console.log(`proyectos: ${proyectos.length}`);
  console.log("estado guardado:", JSON.stringify(cuenta(proyectos, (p) => p.category)));
  console.log("ESTADO REAL:", JSON.stringify(cuenta(proyectos, (p) => p.estado_real)));
  console.log("fuente:", JSON.stringify(cuenta(proyectos, (p) => p.estado_fuente)));
  console.log(
    "dominios sondeados:",
    proyectos.filter((p) => p.health_checked_at).length,
    "· responden:",
    proyectos.filter((p) => p.health_ok).length,
    "· sin sondear:",
    proyectos.filter((p) => p.sondeo_pendiente).length,
  );
  console.log(
    "con cliente:",
    proyectos.filter((p) => p.client_name).length,
    "· con monto:",
    proyectos.filter((p) => p.contract_amount !== null).length,
    "· con comentarios:",
    proyectos.filter((p) => (p.notes_count ?? 0) > 0).length,
    "· con sugerencias:",
    proyectos.filter((p) => p.sugerencias.length > 0).length,
  );

  const familias = agruparFamilias(proyectos);
  const agrupadas = familias.filter((f) => f.agrupada);
  console.log(
    `familias: ${familias.length} filas · ${agrupadas.length} agrupadas · ` +
      `${agrupadas.reduce((n, f) => n + f.miembros.length, 0)} proyectos dentro de familias`,
  );
  console.log("las 12 familias más grandes:");
  for (const f of [...agrupadas].sort((a, b) => b.miembros.length - a.miembros.length).slice(0, 12)) {
    console.log(
      `  ${f.etiqueta} (${f.miembros.length}) — ${f.motivo} — ${f.miembros
        .map((m) => m.id)
        .join(", ")}`,
    );
  }

  const destino = path.join(process.cwd(), "qa");
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(
    path.join(destino, "catalogo-b4.json"),
    JSON.stringify({ projects: proyectos, sin_sondear: proyectos.filter((p) => p.sondeo_pendiente).length }),
  );
  console.log(`\nfijado en qa/catalogo-b4.json (${proyectos.length} proyectos)`);
}

void main();
