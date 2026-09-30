/** Capturas de la Fábrica en WebKit (escritorio y celular) con datos reales. */
import { webkit } from "playwright";
import { mkdirSync } from "node:fs";

const PUERTO = Number(process.argv[2] ?? 9347);
const CAPTURAS = process.argv[3] ?? "capturas/fabrica";
mkdirSync(CAPTURAS, { recursive: true });
const navegador = await webkit.launch();
const errores = [];
for (const [nombre, vp] of [["escritorio", { width: 1440, height: 1000 }], ["celular", { width: 390, height: 844 }]]) {
  const p = await navegador.newPage({ viewport: vp, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => errores.push(`${nombre}: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errores.push(`${nombre}: ${m.text()}`));
  await p.goto(`http://127.0.0.1:${PUERTO}/`);
  await p.waitForSelector("text=Trabajando ahora");
  await p.waitForTimeout(2500);
  const r1 = await p.locator("header").innerText();
  await p.waitForTimeout(2100);
  const r2 = await p.locator("header").innerText();
  console.log(nombre, "reloj corre:", r1 !== r2, "|", r2.replace(/\n/g, " ").slice(0, 120));
  await p.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true });
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(nombre, "scroll horizontal:", ancho > vp.width ? `SÍ (${ancho})` : "no");
  await p.close();
}
await navegador.close();
console.log("errores:", errores.length ? errores : "ninguno");
