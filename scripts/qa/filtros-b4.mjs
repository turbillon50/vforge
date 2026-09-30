/**
 * Corredor de SANIDAD de /app/projects — cada filtro contra el número esperado.
 *
 * Amplía el `filtros.py` de Vulcano (que ya medía 9 combinaciones contra la API)
 * con lo que trae B4: estado REAL calculado, de dónde sale el estado, familias,
 * sugerencias y la edición masiva. Corre contra el banco de pruebas
 * (`scripts/qa/servir-b4.mjs`), que monta la pantalla REAL de esta rama con el
 * catálogo REAL medido (qa/catalogo-b4.json, salida de scripts/qa/medir-b4.ts).
 *
 * Uso:
 *   node scripts/qa/servir-b4.mjs &          # banco de pruebas en :4477
 *   node scripts/qa/filtros-b4.mjs [--base http://127.0.0.1:4477] [--romper]
 *
 * `--romper` es la CONTRAPRUEBA del verde: le suma 1 al conteo esperado de un
 * caso y el corredor tiene que marcarlo en rojo. Una prueba que no sabe fallar
 * no es prueba.
 */
import fs from "node:fs";
import path from "node:path";
import { webkit } from "playwright";

const args = process.argv.slice(2);
const base = valor("--base") ?? "http://127.0.0.1:4477";
const romper = args.includes("--romper");
const salida = valor("--salida") ?? "qa/capturas-b4";

function valor(bandera) {
  const i = args.indexOf(bandera);
  return i >= 0 ? args[i + 1] : null;
}

const catalogo = JSON.parse(fs.readFileSync("qa/catalogo-b4.json", "utf8"));
const proyectos = catalogo.projects;
const DIA = 86_400_000;
const ahora = Date.now();

/* ── lo esperado se calcula del MISMO catálogo que ve la pantalla ── */

const edad = (p) => (p.last_push ? (ahora - new Date(p.last_push).getTime()) / DIA : null);
const debe = (p) => Math.max(0, (p.contract_amount ?? 0) - (p.paid_amount ?? 0));
const conRepo = (p) => Boolean(p.github_repo) || (p.repository_count ?? 0) > 0;

/** Familias como las agrupa la pantalla (mismas reglas, resumidas aquí a raíz). */
function familias(lista) {
  const grupos = new Map();
  for (const p of lista) {
    const raiz = raizDe(p);
    grupos.set(raiz, [...(grupos.get(raiz) ?? []), p]);
  }
  return grupos;
}

const SUFIJOS = new Set([
  "admin", "administrador", "api", "app", "apps", "back", "backend", "clean", "cliente", "copia",
  "copy", "demo", "dev", "estudio", "final", "fix", "front", "frontend", "landing", "merge", "new",
  "next", "nextjs", "nuevo", "old", "panel", "plataforma", "preview", "prod", "proyecto", "pwa",
  "qa", "server", "site", "sitio", "store", "test", "tests", "ui", "web", "www",
]);
const PREFIJOS = new Set(["v0", "final", "nuevo", "new", "copia", "copy", "demo", "mi", "the"]);
const GENERICAS = new Set([...SUFIJOS, "proyectos", "vercel", "github", "template", "plantilla",
  "starter", "boilerplate", "main", "master", "repo", "code", "lab"]);
const TLD_DOBLE = new Set(["com.mx", "org.mx", "net.mx", "gob.mx", "com.ar", "com.br", "com.co",
  "co.uk", "com.es", "com.pe"]);

const ruido = (t) =>
  /^v\d+$/.test(t) || /^(19|20)\d{2}$/.test(t) || (/^[0-9a-f]{6,}$/.test(t) && /\d/.test(t) && /[a-f]/.test(t));

function raizNombre(v) {
  const partes = (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter(Boolean);
  while (partes.length > 1 && (PREFIJOS.has(partes[0]) || ruido(partes[0]))) partes.shift();
  while (partes.length > 1) {
    const u = partes[partes.length - 1];
    if (SUFIJOS.has(u) || ruido(u)) partes.pop();
    else break;
  }
  const raiz = partes.join("-");
  if (!raiz || raiz.length < 3 || GENERICAS.has(raiz)) return null;
  return raiz;
}

function raizDominio(v) {
  const limpio = (v ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!limpio.includes(".")) return null;
  const partes = limpio.split(".").filter(Boolean);
  const tld = TLD_DOBLE.has(partes.slice(-2).join(".")) ? 2 : 1;
  const etiquetas = partes.slice(0, partes.length - tld);
  const registrable = etiquetas[etiquetas.length - 1];
  if (!registrable || ["vercel", "netlify", "github"].includes(registrable)) return null;
  for (const sub of etiquetas.slice(0, -1).reverse()) {
    if (sub === "www" || SUFIJOS.has(sub) || ruido(sub)) continue;
    const r = raizNombre(sub);
    if (r) return r;
  }
  return raizNombre(registrable);
}

function raizDe(p) {
  const codigo = p.family_code?.trim().toLowerCase();
  if (codigo) return codigo.replace(/-/g, "");
  const dom = raizDominio(p.domain);
  if (dom) return dom.replace(/-/g, "");
  const repo = raizNombre((p.github_repo ?? "").split("/").pop());
  if (repo) return repo.replace(/-/g, "");
  const nom = raizNombre(p.name || p.id);
  if (nom) return nom.replace(/-/g, "");
  return `solo:${p.id}`;
}

const enFamilia = new Set();
for (const [, miembros] of familias(proyectos)) {
  if (miembros.length > 1 && !raizDe(miembros[0]).startsWith("solo:")) {
    for (const m of miembros) enFamilia.add(m.id);
  }
}

const CASOS = [
  ["?estado=produccion", (p) => p.estado_real === "produccion"],
  ["?estado=activo", (p) => p.estado_real === "activo"],
  ["?estado=en_pausa", (p) => p.estado_real === "en_pausa"],
  ["?estado=archivo", (p) => p.estado_real === "archivo"],
  ["?estado=en_revision", (p) => p.estado_real === "en_revision"],
  ["?estado=produccion,activo", (p) => ["produccion", "activo"].includes(p.estado_real)],
  ["?fuente=manual", (p) => p.estado_fuente === "manual"],
  ["?fuente=calculado", (p) => p.estado_fuente === "calculado"],
  ["?estado=produccion&fuente=manual", (p) => p.estado_real === "produccion" && p.estado_fuente === "manual"],
  ["?estado=produccion&fuente=calculado", (p) => p.estado_real === "produccion" && p.estado_fuente === "calculado"],
  ["?marcas=family", (p) => enFamilia.has(p.id)],
  ["?marcas=sugerencias", (p) => (p.sugerencias?.length ?? 0) > 0],
  ["?marcas=family,sugerencias", (p) => enFamilia.has(p.id) && (p.sugerencias?.length ?? 0) > 0],
  ["?marcas=priority", (p) => Boolean(p.delivery_priority)],
  ["?marcas=vercel", (p) => Boolean(p.vercel_url)],
  ["?marcas=norepo", (p) => !conRepo(p)],
  ["?marcas=domain", (p) => Boolean(p.domain?.trim())],
  ["?marcas=notes", (p) => (p.notes_count ?? 0) > 0],
  ["?marcas=owed", (p) => debe(p) > 0],
  ["?actividad=7", (p) => edad(p) !== null && edad(p) <= 7],
  ["?actividad=30", (p) => edad(p) !== null && edad(p) <= 30],
  ["?actividad=never", (p) => edad(p) === null],
  ["?actividad=dormant", (p) => edad(p) !== null && edad(p) > 90],
  ["?avance=0", (p) => (p.progress_pct ?? 0) === 0],
  ["?entrega=undated", (p) => !p.due_date],
  ["?q=vliving", (p) => texto(p).includes("vliving")],
  ["?q=castores&estado=archivo", (p) => texto(p).includes("castores") && p.estado_real === "archivo"],
  ["?estado=produccion&marcas=family", (p) => p.estado_real === "produccion" && enFamilia.has(p.id)],
];

function texto(p) {
  return [p.name, p.id, p.domain, p.vercel_url, p.github_repo, p.family_code, p.client_name,
    p.description, p.last_note?.body, ...(p.repositories ?? []).map((r) => r.repo_full_name)]
    .map((x) => (x ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .join(" ");
}

/* ── corrida ── */

const capturas = [];
let rojos = 0;

const navegador = await webkit.launch();
fs.mkdirSync(salida, { recursive: true });

for (const ancho of [390, 1440]) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: ancho === 390 ? 844 : 900 },
  });
  const pg = await ctx.newPage();

  const errores = [];
  pg.on("console", (m) => m.type() === "error" && errores.push(m.text()));

  for (const [consulta, prueba] of CASOS) {
    const esperado = proyectos.filter(prueba).length + (romper && consulta === "?marcas=family" ? 1 : 0);
    const visto = await medir(pg, `${base}/app/projects${consulta}&agrupar=0`);
    const ok = String(esperado) === String(visto);
    if (!ok) rojos++;
    console.log(
      `${ancho} ${consulta.padEnd(42)} esperado ${String(esperado).padStart(4)}  pantalla ${String(visto).padStart(4)}  ${ok ? "OK" : "DIFERENTE"}`,
    );
  }

  // Vista agrupada: filas de familia vs proyectos.
  const totalFamilias = [...familias(proyectos).values()].length;
  const vistoFilas = await medirFilas(pg, `${base}/app/projects?agrupar=1`);
  const okFilas = vistoFilas.familias > 0 && vistoFilas.proyectos === proyectos.length;
  if (!okFilas) rojos++;
  console.log(
    `${ancho} agrupar=1: ${vistoFilas.proyectos} proyectos en ${vistoFilas.familias} familias ` +
      `(cubetas calculadas: ${totalFamilias}) ${okFilas ? "OK" : "DIFERENTE"}`,
  );

  // ── promesas con consecuencia (no sólo contar) ──
  await pg.goto(`${base}/app/projects?q=vliving`, { waitUntil: "load" });
  await pg.waitForTimeout(1800);

  const abrir = pg.locator("button", { hasText: /Ver los \d+/ }).first();
  const familiasVisibles = await abrir.count();
  let filasAntes = await pg.locator("article").count();
  if (familiasVisibles) {
    await abrir.click();
    await pg.waitForTimeout(700);
  }
  const filasDespues = await pg.locator("article").count();
  marcar(
    `${ancho} B4-18 abrir familia muestra sus proyectos`,
    familiasVisibles > 0 && filasDespues > filasAntes,
    `${filasAntes} → ${filasDespues} filas`,
  );

  await pg.locator("button", { hasText: /Seleccionar los \d+ del filtro/ }).first().click();
  await pg.waitForTimeout(600);
  const textoBarra = await pg.evaluate(() => document.body.innerText);
  const esperadosSel = proyectos.filter((p) => texto(p).includes("vliving")).length;
  marcar(
    `${ancho} B4-21 seleccionar todo lo filtrado abre la barra con el número`,
    textoBarra.includes(`${esperadosSel} seleccionado`),
    `esperaba ${esperadosSel} seleccionados`,
  );

  await pg.locator("button", { hasText: /^Poner /  }).first().click();
  await pg.waitForTimeout(900);
  const textoLote = await pg.evaluate(() => document.body.innerText);
  marcar(
    `${ancho} B4-22 aplicar el lote avisa cuántos cambiaron`,
    /Se cambiaron \d+ de \d+ proyectos/.test(textoLote),
    textoLote.match(/Se cambiaron[^.]*\./)?.[0] ?? "sin aviso",
  );

  await pg.goto(`${base}/app/projects?q=zzz-no-existe-nada`, { waitUntil: "load" });
  await pg.waitForTimeout(1500);
  const vacio = await pg.evaluate(() => document.body.innerText);
  marcar(
    `${ancho} B4-31 estado vacío con mensaje humano y salida`,
    vacio.includes("Ningún proyecto coincide con estos filtros") && vacio.includes("Limpiar filtros"),
    "mensaje + Limpiar filtros",
  );
  await pg.locator("button", { hasText: "Limpiar filtros" }).first().click();
  await pg.waitForTimeout(1200);
  const trasLimpiar = await pg.evaluate(() => document.body.innerText);
  marcar(
    `${ancho} B4-14 limpiar filtros devuelve el catálogo completo`,
    new RegExp(`MOSTRANDO\\s*\\n?\\s*${proyectos.length}`, "i").test(trasLimpiar),
    `esperaba ${proyectos.length}`,
  );

  // Capturas para mirar con los ojos.
  for (const [nombre, url] of [
    ["lista", `${base}/app/projects`],
    ["familias-abierta", `${base}/app/projects?q=vliving`],
    ["filtros-abiertos", `${base}/app/projects?estado=produccion&fuente=calculado`],
  ]) {
    await pg.goto(url, { waitUntil: "load" });
    await pg.waitForTimeout(2500);
    if (nombre === "familias-abierta") {
      const ver = pg.locator("button", { hasText: /Ver los \d+/ }).first();
      if (await ver.count()) await ver.click();
      await pg.waitForTimeout(600);
    }
    if (nombre === "filtros-abiertos") {
      await pg.locator('button[aria-expanded]', { hasText: /Filtros/ }).first().click();
      await pg.waitForTimeout(400);
      const chk = pg.locator('input[type=checkbox]').first();
      if (await chk.count()) await chk.check();
      await pg.waitForTimeout(400);
    }
    const archivo = path.join(salida, `${nombre}-${ancho}.png`);
    await pg.screenshot({ path: archivo, fullPage: false });
    capturas.push(archivo);
  }

  // Ancho: nada se sale de la pantalla (SANIDAD).
  const desborde = await pg.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (desborde > 2) {
    rojos++;
    console.log(`${ancho} DESBORDE horizontal de ${desborde}px DIFERENTE`);
  } else {
    console.log(`${ancho} sin desborde horizontal OK`);
  }

  if (errores.length) {
    rojos++;
    console.log(`${ancho} errores de consola: ${errores.slice(0, 3).join(" | ")} DIFERENTE`);
  } else {
    console.log(`${ancho} 0 errores de consola OK`);
  }

  await ctx.close();
}

await navegador.close();
console.log(`\ncapturas: ${capturas.join(", ")}`);
console.log(rojos === 0 ? "TODO OK" : `${rojos} EN ROJO`);
process.exit(rojos === 0 ? 0 : 1);

/** Un renglón del reporte; cuenta rojos. */
function marcar(titulo, ok, detalle) {
  if (!ok) rojos++;
  console.log(`${titulo.padEnd(72)} ${ok ? "OK" : `DIFERENTE (${detalle})`}`);
}

/** Lee el contador "Mostrando" de la pantalla. */
async function medir(pg, url) {
  await pg.goto(url, { waitUntil: "load" });
  await pg.waitForTimeout(1800);
  const t = await pg.evaluate(() => document.body.innerText);
  const m = t.match(/MOSTRANDO\s*\n?\s*([\d,]+)/i);
  return m ? m[1].replace(/,/g, "") : null;
}

/** Contador de la vista agrupada: proyectos mostrados y familias formadas. */
async function medirFilas(pg, url) {
  await pg.goto(url, { waitUntil: "load" });
  await pg.waitForTimeout(1800);
  const t = await pg.evaluate(() => document.body.innerText);
  const proyectosVistos = Number((t.match(/MOSTRANDO\s*\n?\s*([\d,]+)/i)?.[1] ?? "0").replace(/,/g, ""));
  const fam = Number(t.match(/·\s*(\d+)\s*familias?/i)?.[1] ?? "0");
  return { proyectos: proyectosVistos, familias: fam };
}
