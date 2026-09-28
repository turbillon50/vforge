/**
 * Prueba de los dos paneles del Estudio en WebKit de verdad.
 *
 * Lo que comprueba (y cómo, no de oídas):
 *   1. Los paneles se pintan sin un solo error de consola.
 *   2. El inspector muestra el retrato real del elemento (archivo:línea, tamaño, peso).
 *   3. Escribir en el panel CAMBIA EL ARCHIVO EN DISCO — se lee el archivo, no el mensaje.
 *   4. El control ve el commit nuevo, marcado como del Estudio.
 *   5. El diff sale pintado (verde/rojo).
 *   6. Deshacer devuelve el archivo a como estaba — también leyendo el archivo.
 *   7. Publicar pide escribir el nombre del proyecto y el botón está muerto hasta que coincide.
 *   8. Un elemento sin texto propio manda al camino de "dile a V" con su archivo:línea.
 *
 * Uso: node servicios/vivo/qa/banco/prueba-paneles.mjs
 */

import { webkit } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BANCO = process.env.BANCO_URL ?? "http://127.0.0.1:9345";
const PILOTO = "/root/worktrees/vivo-mipipa";
const ARCHIVO = path.join(PILOTO, "components/marketing.tsx");
const CAPTURAS = "/root/worktrees/vforge-b3/capturas/vivo";
const TEXTO_NUEVO = "Agua del banco,";

const fallos = [];
const pasos = [];

function comprobar(nombre, condicion, detalle) {
  if (condicion) pasos.push(`OK   · ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  else {
    pasos.push(`FALLA · ${nombre}${detalle ? ` — ${detalle}` : ""}`);
    fallos.push(nombre);
  }
}

const leerArchivo = () => readFileSync(ARCHIVO, "utf8");

mkdirSync(CAPTURAS, { recursive: true });

const navegador = await webkit.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const pagina = await contexto.newPage();

const erroresConsola = [];
pagina.on("console", (m) => {
  if (m.type() === "error") erroresConsola.push(m.text());
});
pagina.on("pageerror", (e) => erroresConsola.push(`pageerror: ${e.message}`));

await pagina.goto(BANCO, { waitUntil: "load" });
await pagina.waitForSelector('[data-banco="sel-h1"]');

// ── 1. El control arranca con el historial REAL del piloto ──────────────────
await pagina.waitForSelector("text=Historial");
// Esperar a que NO diga "no hay commits" no sirve: mientras carga tampoco lo dice
// y la prueba seguía con el panel vacío. Se espera el dato de verdad.
await pagina.waitForFunction(() => document.body.innerText.includes("vivo/b3"), {
  timeout: 30_000,
});
const cabeceraControl = await pagina.locator("text=Control · mipipa").first().innerText();
comprobar("el control se pinta", cabeceraControl.includes("mipipa"), cabeceraControl);

const ramaVisible = await pagina.locator("aside").last().locator("p").nth(1).innerText();
comprobar("muestra la rama de trabajo, no producción", ramaVisible.includes("vivo/b3"), ramaVisible);

const commitsPintados = await pagina.locator("aside ul li").count();
comprobar("pinta el historial real", commitsPintados >= 3, `${commitsPintados} commits`);

const botonPublicar = pagina.locator('button:has-text("Publicar a")');
comprobar(
  "el botón dice a qué rama publica",
  (await botonPublicar.innerText()).includes("master"),
  await botonPublicar.innerText(),
);

await pagina.screenshot({ path: path.join(CAPTURAS, "banco-control.png") });

// ── 2. Seleccionar el h1: el inspector con su retrato ───────────────────────
await pagina.click('[data-banco="sel-h1"]');
await pagina.waitForSelector("text=Dile a V");

const cabeceraInspector = await pagina.locator("aside").first().locator("p").first().innerText();
comprobar("el inspector dice qué etiqueta es", cabeceraInspector.includes("<h1>"), cabeceraInspector);
const fuenteInspector = await pagina.locator("aside").first().locator("p").nth(1).innerText();
comprobar("y de qué archivo:línea viene", fuenteInspector === "marketing.tsx:87", fuenteInspector);

const tamanoMostrado = await pagina.locator("aside").first().locator("text=62px").first().innerText();
comprobar("el tamaño sale del elemento", tamanoMostrado === "62px", tamanoMostrado);

const pesoActivo = await pagina
  .locator('aside button:has-text("900")')
  .first()
  .evaluate((b) => getComputedStyle(b).backgroundColor);
comprobar("los chips de peso se pintan", Boolean(pesoActivo), pesoActivo);

// Tres cosas que salieron de MIRAR la captura, no de que compilara:
const inspector = pagina.locator("aside").first();
comprobar(
  "un peso fuera de la escala (850) se dice, no se esconde",
  await inspector.locator("text=hoy: 850").isVisible(),
);
comprobar(
  "un fondo transparente no se pinta como negro",
  (await inspector.locator("text=sin fondo").isVisible()) &&
    (await inspector.locator("text=#000000").count()) === 0,
);
const izqActivo = await inspector
  .locator('button:has-text("Izq.")')
  .evaluate((b) => getComputedStyle(b).backgroundColor);
comprobar(
  "textAlign 'start' prende el botón de izquierda",
  izqActivo === "rgb(9, 9, 9)",
  izqActivo,
);

await pagina.screenshot({ path: path.join(CAPTURAS, "banco-paneles.png") });

// ── 3. Editar el texto desde el panel escribe el ARCHIVO ────────────────────
const antes = leerArchivo();
comprobar("el archivo arranca con el texto viejo", antes.includes("Agua segura,"));

const cajaTexto = pagina.locator("aside textarea").first();
await cajaTexto.fill(TEXTO_NUEVO);
const t0 = Date.now();
await cajaTexto.press("Enter");
await pagina.waitForFunction(
  () => document.body.innerText.includes("guardado en components/marketing.tsx"),
  { timeout: 15_000 },
);
const msEscritura = Date.now() - t0;

const despues = leerArchivo();
comprobar(
  "el texto quedó escrito en el archivo de verdad",
  despues.includes(TEXTO_NUEVO) && !despues.includes("Agua segura,"),
  `${msEscritura} ms`,
);
comprobar(
  "no se llevó nada de al lado (el <br/> y el <span> siguen)",
  despues.includes("<br />") && despues.includes("mp-grad-text"),
);
const pieInspector = await pagina.locator("aside").first().locator("footer").innerText();
comprobar("el pie dice dónde guardó", pieInspector.includes("components/marketing.tsx:87"), pieInspector);

await pagina.screenshot({ path: path.join(CAPTURAS, "banco-edicion-escrita.png") });

// ── 4. El control ve el commit nuevo, marcado del Estudio ───────────────────
await pagina.waitForFunction(
  (texto) => document.body.innerText.includes(texto),
  `texto en components/marketing.tsx:87`,
  { timeout: 15_000 },
);
const primerCommit = await pagina.locator("aside").last().locator("ul li").first().innerText();
comprobar(
  "el commit nuevo aparece marcado como del Estudio",
  primerCommit.includes("Estudio") && primerCommit.includes("components/marketing.tsx:87"),
  primerCommit.replace(/\n/g, " · "),
);

// ── 5. El diff sale pintado ─────────────────────────────────────────────────
await pagina.click('button:has-text("Ver cambio")');
await pagina.waitForSelector("pre");
await pagina.waitForFunction(() => {
  const pre = document.querySelector("pre");
  return pre && pre.innerText.length > 20;
}, { timeout: 10_000 });
const diffTexto = await pagina.locator("pre").first().innerText();
comprobar(
  "el diff muestra el cambio de verdad",
  diffTexto.includes(TEXTO_NUEVO),
  `${diffTexto.length} caracteres`,
);
const colores = await pagina.locator("pre div").evaluateAll((nodos) =>
  nodos.map((n) => getComputedStyle(n).color),
);
const hayVerde = colores.some((c) => c.includes("21, 128, 61"));
const hayRojo = colores.some((c) => c.includes("185, 28, 28"));
comprobar("las líneas van en verde y rojo", hayVerde && hayRojo, `verde=${hayVerde} rojo=${hayRojo}`);

await pagina.screenshot({ path: path.join(CAPTURAS, "banco-diff.png") });

// ── 6. Deshacer devuelve el archivo ─────────────────────────────────────────
await pagina.click('button:has-text("Deshacer")');
await pagina.waitForFunction(() => document.body.innerText.includes("Deshecho. El proyecto quedó en"), {
  timeout: 20_000,
});
const revertido = leerArchivo();
comprobar(
  "deshacer devolvió el archivo a como estaba",
  revertido.includes("Agua segura,") && !revertido.includes(TEXTO_NUEVO),
);
comprobar("el archivo quedó idéntico al de antes", revertido === antes);
const avisoDeshecho = await pagina.locator("text=Deshecho.").first().innerText();
comprobar("y lo dice en pantalla", avisoDeshecho.includes("quedó en"), avisoDeshecho);

// Tras deshacer, el inspector no puede seguir enseñando el texto que ya no existe
// en el archivo. Se comprueba en el panel, no en la bitácora del banco.
comprobar(
  "deshacer suelta la selección (no deja el retrato viejo)",
  (await pagina.locator("text=Dile a V").count()) === 0,
);

await pagina.screenshot({ path: path.join(CAPTURAS, "banco-deshacer.png") });

// ── 7. Publicar: candado de confirmación ────────────────────────────────────
await pagina.click('button:has-text("Publicar a")');
await pagina.waitForSelector('input[placeholder="mipipa"]');
const publicarFirme = pagina.locator('aside button:has-text("Publicar")').last();
comprobar("Publicar nace apagado", await publicarFirme.isDisabled());

await pagina.fill('input[placeholder="mipipa"]', "mipip");
comprobar("sigue apagado con el nombre a medias", await publicarFirme.isDisabled());

await pagina.fill('input[placeholder="mipipa"]', "mipipa");
comprobar("se enciende sólo con el nombre exacto", await publicarFirme.isEnabled());
await pagina.screenshot({ path: path.join(CAPTURAS, "banco-publicar.png") });

await publicarFirme.click();
await pagina.waitForFunction(() => document.body.innerText.includes("Vercel ya está construyendo"), {
  timeout: 15_000,
});
const avisoPublicado = await pagina.locator("text=Vercel ya está construyendo").first().innerText();
comprobar("avisa qué publicó y dónde", avisoPublicado.includes("master"), avisoPublicado);

// ── 8. Elemento sin texto propio → "dile a V" ───────────────────────────────
await pagina.click('[data-banco="sel-span"]');
await pagina.waitForSelector("text=no tiene texto propio");
comprobar(
  "un elemento sin texto propio no ofrece editar a ciegas",
  await pagina.locator("text=no tiene texto propio").first().isVisible(),
);
const hayCaja = await pagina.locator("aside textarea").count();
comprobar("sólo queda la caja de 'dile a V'", hayCaja === 1, `${hayCaja} textarea`);

await pagina.fill("aside textarea", "esto más grande");
await pagina.click('button:has-text("Mandar con este elemento")');
await pagina.waitForFunction(() => document.body.innerText.includes("dile-a-v"), { timeout: 5000 });
const registro = await pagina.locator('[data-banco="registro"]').innerText();
comprobar(
  "V recibe el archivo:línea del elemento seleccionado",
  registro.includes("components/marketing.tsx:89:31") && registro.includes("esto más grande"),
  registro.split("\n").pop(),
);
await pagina.screenshot({ path: path.join(CAPTURAS, "banco-dile-a-v.png") });

// ── 9. Móvil 390: los paneles no se cortan ──────────────────────────────────
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.click('[data-banco="sel-h1"]');
await pagina.waitForSelector("text=Dile a V");
const desbordeX = await pagina.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
comprobar("en 390 no hay desborde horizontal", desbordeX <= 0, `${desbordeX}px`);
await pagina.screenshot({ path: path.join(CAPTURAS, "banco-movil-390.png"), fullPage: false });

// ── Cierre ──────────────────────────────────────────────────────────────────
comprobar("cero errores de consola", erroresConsola.length === 0, erroresConsola.slice(0, 3).join(" | "));

await navegador.close();

console.log(pasos.join("\n"));
console.log(`\n${pasos.length - fallos.length}/${pasos.length} comprobaciones en verde`);
if (fallos.length) {
  console.log(`FALLAS: ${fallos.join(", ")}`);
  process.exit(1);
}
