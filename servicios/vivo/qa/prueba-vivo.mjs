/**
 * Prueba con navegador de verdad (WebKit) del preview vivo y de la capa de edición.
 *
 * Mide lo que Luis pidió: cambio → visible en la vista previa, con cronómetro,
 * 10 veces, y deja capturas para mirarlas.
 *
 * Uso:
 *   node servicios/vivo/qa/prueba-vivo.mjs <urlEntrada> <worktree> <archivo> <texto> [n]
 */
import { webkit } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";

const [, , urlEntrada, worktree, archivoRel, textoBase, nBruto] = process.argv;
if (!urlEntrada || !worktree || !archivoRel || !textoBase) {
  console.error(
    "uso: node prueba-vivo.mjs <urlEntrada> <worktree> <archivo> <texto> [n]",
  );
  process.exit(1);
}
const n = Number(nBruto || 10);
const archivo = resolve(worktree, archivoRel);
const original = readFileSync(archivo, "utf8");
if (!original.includes(textoBase)) {
  console.error(`No encontré "${textoBase}" en ${archivoRel}`);
  process.exit(1);
}

const SALIDA = resolve(import.meta.dirname, "../../../capturas/vivo");
mkdirSync(SALIDA, { recursive: true });

const navegador = await webkit.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const pagina = await contexto.newPage();

const erroresConsola = [];
pagina.on("console", (m) => {
  if (m.type() === "error") erroresConsola.push(m.text().slice(0, 200));
});

const tiempos = [];
try {
  // Cruzar la puerta: el token se cambia por sesión.
  const respuesta = await pagina.goto(urlEntrada, { waitUntil: "domcontentloaded", timeout: 90_000 });
  console.log(`entrada  : HTTP ${respuesta?.status()} → ${pagina.url()}`);
  await pagina.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});

  // ¿Llegó la capa de edición y trae las marcas de archivo:línea?
  const marcados = await pagina.evaluate(() => document.querySelectorAll("[data-vf-src]").length);
  const capaViva = await pagina.evaluate(() => Boolean(window.__vfVivoOverlay));
  console.log(`capa     : ${capaViva ? "cargada" : "NO cargada"} · ${marcados} elementos marcados`);

  // Desborde horizontal a 390, que es la regla de la casa.
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.waitForTimeout(400);
  const desborde = await pagina.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  await pagina.screenshot({ path: resolve(SALIDA, "vivo-390.png"), fullPage: false });
  console.log(`movil 390: desborde ${desborde}px (0 es lo correcto)`);

  await pagina.setViewportSize({ width: 1440, height: 900 });
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: resolve(SALIDA, "vivo-1440.png"), fullPage: false });

  // Cronómetro: cambio en el archivo → visible en la página (sin recargar a mano).
  console.log(`\ncronómetro de ${n} cambios (sin commit, sin deploy):`);
  for (let i = 1; i <= n; i += 1) {
    const marca = `VIVO-${i}-${textoBase}`;
    const t0 = Date.now();
    writeFileSync(archivo, original.replace(textoBase, marca));
    try {
      await pagina.waitForFunction(
        (texto) => document.body.innerText.includes(texto),
        marca,
        { timeout: 30_000, polling: 50 },
      );
      const ms = Date.now() - t0;
      tiempos.push(ms);
      console.log(`  ${String(i).padStart(2)} → ${ms} ms`);
    } catch {
      console.log(`  ${String(i).padStart(2)} → TIMEOUT`);
    }
    writeFileSync(archivo, original);
    await pagina
      .waitForFunction((t) => document.body.innerText.includes(t), textoBase, {
        timeout: 30_000,
        polling: 50,
      })
      .catch(() => {});
  }

  // Captura con la capa encendida y un elemento seleccionado, para mirarla.
  await pagina.evaluate(() => {
    window.postMessage({ canal: "vf-vivo-estudio", tipo: "modo", activo: true }, "*");
  });
  await pagina.waitForTimeout(300);
  const caja = await pagina.evaluate(() => {
    const el = document.querySelector("h1[data-vf-src]") || document.querySelector("[data-vf-src]");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, src: el.getAttribute("data-vf-src") };
  });
  if (caja) {
    await pagina.mouse.move(caja.x, caja.y);
    await pagina.waitForTimeout(300);
    // No basta con que no truene: el marco tiene que estar pintado de verdad.
    const resaltado = await pagina.evaluate(() => {
      const capa = document.querySelector("[data-vf-overlay]");
      if (!capa || capa.style.display === "none") return { pintado: false, motivo: "capa apagada" };
      const marcos = [...capa.children].filter(
        (m) => m.style.display === "block" && parseFloat(m.style.width) > 0,
      );
      return { pintado: marcos.length > 0, marcos: marcos.length };
    });
    await pagina.screenshot({ path: resolve(SALIDA, "vivo-capa-resaltado.png") });
    console.log(
      `\nresaltado : ${resaltado.pintado ? `SÍ (${resaltado.marcos} marcos)` : `NO — ${resaltado.motivo ?? "sin marco"}`} sobre ${caja.src}`,
    );

    console.log(`capturas  : ${SALIDA}`);
  }

  // ── La prueba de verdad: dentro de un iframe, como en el Estudio ─────────
  // La capa sólo le habla a su padre, así que sin iframe no hay selección que
  // observar. Este arnés levanta un padre en localhost:3000 (origen permitido)
  // y comprueba el camino completo: hover → clic → archivo:línea en el Estudio.
  const arnes = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>arnés</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<script>
  window.__recibidos = [];
  addEventListener("message", (ev) => {
    if (ev.data && ev.data.canal === "vf-vivo") window.__recibidos.push(ev.data);
  });
  window.__alMarco = (m) => document.querySelector("iframe").contentWindow.postMessage(
    Object.assign({ canal: "vf-vivo-estudio" }, m), "*");
</script>
<iframe src="${urlEntrada.replace(/"/g, "&quot;")}" data-vf-vista="desktop"></iframe>`);
  });
  await new Promise((r) => arnes.listen(3000, "127.0.0.1", r));

  try {
    const marco = await contexto.newPage();
    await marco.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90_000 });
    // Espera a que la capa de dentro salude al padre.
    await marco
      .waitForFunction(() => window.__recibidos.some((m) => m.tipo === "listo"), {
        timeout: 60_000,
        polling: 100,
      })
      .catch(() => {});
    const saludo = await marco.evaluate(() =>
      window.__recibidos.find((m) => m.tipo === "listo"),
    );
    console.log(
      `\nen iframe : la capa saluda al Estudio → ${saludo ? `${saludo.marcados} marcados` : "NO saludó"}`,
    );

    await marco.evaluate(() => window.__alMarco({ tipo: "modo", activo: true }));
    await marco.waitForTimeout(400);

    const dentro = marco.frameLocator("iframe");
    const objetivo = dentro.locator("h1[data-vf-src]").first();
    await objetivo.hover({ timeout: 15_000 });
    await marco.waitForTimeout(300);
    await marco.screenshot({ path: resolve(SALIDA, "vivo-iframe-hover.png") });
    await objetivo.click({ timeout: 15_000 });
    await marco.waitForTimeout(400);

    const elegido = await marco.evaluate(() => {
      const m = window.__recibidos.filter((x) => x.tipo === "seleccion").pop();
      return m ? m.elemento : null;
    });
    console.log(
      `selección : ${elegido ? `<${elegido.etiqueta}> en ${elegido.src} · texto "${(elegido.texto || "").slice(0, 40)}" · ${elegido.estilos.fontSize}` : "NO llegó"}`,
    );
    await marco.screenshot({ path: resolve(SALIDA, "vivo-iframe-seleccion.png") });
    await marco.close();
  } finally {
    await new Promise((r) => arnes.close(r));
  }
} finally {
  writeFileSync(archivo, original);
  await navegador.close();
}

const ok = tiempos.slice().sort((a, b) => a - b);
if (ok.length) {
  const mediana =
    ok.length % 2 ? ok[(ok.length - 1) / 2] : (ok[ok.length / 2 - 1] + ok[ok.length / 2]) / 2;
  console.log(`\ncorridas   : ${tiempos.length} de ${n}`);
  console.log(`mediana    : ${Math.round(mediana)} ms`);
  console.log(`mejor caso : ${ok[0]} ms`);
  console.log(`peor caso  : ${ok[ok.length - 1]} ms`);
  console.log(`meta 3000  : ${ok[ok.length - 1] < 3000 ? "CUMPLE" : "NO CUMPLE"}`);
}
console.log(`errores de consola: ${erroresConsola.length}`);
erroresConsola.slice(0, 5).forEach((e) => console.log(`  · ${e}`));
