/**
 * Familias: juntar lo que es la misma app sin juntar lo que no.
 * Los casos salen del catálogo real medido el 28-sep-2026.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agruparFamilias,
  claveFamilia,
  mapaFamilias,
  raizDominio,
  raizNombre,
} from "@/lib/projects/familias";

test("el código de familia manda sobre cualquier otra señal", () => {
  const c = claveFamilia({
    id: "vliving-admin",
    name: "vliving-admin",
    family_code: "vliving",
    domain: "admin.otracosa.site",
  });
  assert.equal(c.clave, "codigo:vliving");
  assert.equal(c.senal, "codigo");
  assert.match(c.motivo, /código de familia/);
});

test("la raíz del dominio ignora el TLD y los subdominios de parte", () => {
  assert.equal(raizDominio("admin.vliving.site"), "vliving");
  assert.equal(raizDominio("https://www.ruta618.life/"), "ruta618");
  assert.equal(raizDominio("carnesn.ink"), "carnesn");
  assert.equal(raizDominio("app.algo.com.mx"), "algo");
  assert.equal(raizDominio("algo.vercel.app"), null);
  assert.equal(raizDominio("sin-punto"), null);
});

test("un subdominio con nombre propio es otra app, no la misma familia", () => {
  // Medido en el catálogo: ehecatl, lsm y valores viven bajo vmomentum.site y
  // son demos distintas; protrack vive bajo vforge.site y no es VForge.
  assert.equal(raizDominio("ehecatl.vmomentum.site"), "ehecatl");
  assert.equal(raizDominio("protrack.vforge.site"), "protrack");
  assert.equal(raizDominio("vmomentum.site"), "vmomentum");
  const familias = agruparFamilias([
    { id: "ehecatl-demo", name: "ehecatl-demo", domain: "ehecatl.vmomentum.site" },
    { id: "turbillon50-ehecatl-demo", name: "turbillon50-ehecatl-demo", github_repo: "turbillon50/ehecatl-demo" },
    { id: "vmomentum-site", name: "vmomentum-site", domain: "vmomentum.site" },
  ]);
  assert.equal(familias.length, 2, "ehecatl se junta con su duplicado, no con vmomentum");
  assert.equal(familias.find((f) => f.clave === "raiz:ehecatl")?.miembros.length, 2);
});

test("la raíz del nombre recorta sufijos de parte y ruido de máquina", () => {
  assert.equal(raizNombre("vliving-estudio-clean-a57c166"), "vliving");
  assert.equal(raizNombre("v0-ruta-618-app"), "ruta-618");
  assert.equal(raizNombre("FINAL-CASTORES"), "castores");
  assert.equal(raizNombre("castores-api-server"), "castores");
  assert.equal(raizNombre("vliving"), "vliving");
});

test("una palabra genérica o muy corta nunca agrupa", () => {
  assert.equal(raizNombre("admin"), null);
  assert.equal(raizNombre("demo"), null);
  assert.equal(raizNombre("api-server"), null);
  assert.equal(raizNombre("ab"), null);
  const c = claveFamilia({ id: "demo", name: "demo" });
  assert.equal(c.senal, "solo");
});

test("la familia vliving real se junta en una fila, venga del código, del dominio o del repo", () => {
  const lista = [
    { id: "vliving-2026", name: "vliving-2026", family_code: "vliving", domain: "vliving.site" },
    { id: "vliving-admin", name: "vliving-admin", family_code: "vliving", domain: "admin.vliving.site" },
    { id: "vliving-app", name: "vliving-app", github_repo: "turbillon50/vliving-app" },
    { id: "vliving-estudio-merge", name: "vliving-estudio-merge", github_repo: "turbillon50/vliving-estudio-merge" },
    { id: "otra-cosa", name: "hakapoke", github_repo: "turbillon50/frontend-hakapoke" },
  ];
  const familias = agruparFamilias(lista);
  const vliving = familias.find((f) => f.clave === "raiz:vliving");
  assert.ok(vliving);
  assert.equal(vliving.miembros.length, 4, "los 4 vliving son una sola familia");
  assert.equal(vliving.agrupada, true);
  assert.equal(vliving.senal, "codigo", "manda la señal más fuerte de la familia");
  assert.match(vliving.motivo, /código de familia/);

  const suelta = familias.find((f) => f.miembros[0].id === "otra-cosa");
  assert.ok(suelta);
  assert.equal(suelta.agrupada, false, "un solo miembro no es familia");
});

test("el mismo nombre con y sin guion es la misma familia (ruta618 / ruta-618)", () => {
  const familias = agruparFamilias([
    { id: "ruta618", name: "ruta618", domain: "ruta618.life" },
    { id: "v0-ruta-618-app", name: "v0-ruta-618-app", github_repo: "turbillon50/v0-ruta-618-app" },
  ]);
  assert.equal(familias.length, 1);
  assert.equal(familias[0].miembros.length, 2);
  assert.equal(familias[0].senal, "dominio");
});

test("dos marcas distintas no se juntan", () => {
  const familias = agruparFamilias([
    { id: "ssante-admin", name: "ssante-admin", github_repo: "turbillon50/ssante-admin" },
    { id: "vforge-admin", name: "vforge-admin", github_repo: "turbillon50/vforge-admin" },
  ]);
  assert.equal(familias.length, 2);
  assert.ok(familias.every((f) => !f.agrupada));
});

test("el mapa por proyecto y el agrupado dicen lo mismo (una sola fuente)", () => {
  const lista = [
    { id: "a", name: "castores-final", github_repo: "turbillon50/castores-final" },
    { id: "b", name: "castores-store", github_repo: "turbillon50/castores-store" },
    { id: "c", name: "solito", github_repo: "turbillon50/solito" },
  ];
  const mapa = mapaFamilias(lista);
  assert.equal(mapa.get("a")!.clave, mapa.get("b")!.clave);
  assert.equal(mapa.get("a")!.agrupada, true);
  assert.equal(mapa.get("c")!.agrupada, false);
});

test("el orden de la lista se respeta: la familia aparece donde su primer miembro", () => {
  const familias = agruparFamilias([
    { id: "z", name: "zuxen", github_repo: "turbillon50/zuxen" },
    { id: "c1", name: "castores-final", github_repo: "turbillon50/castores-final" },
    { id: "c2", name: "castores-store", github_repo: "turbillon50/castores-store" },
  ]);
  assert.deepEqual(
    familias.map((f) => f.miembros[0].id),
    ["z", "c1"],
  );
});
