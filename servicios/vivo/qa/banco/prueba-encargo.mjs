/**
 * Prueba de punta a punta de "Encárgalo" en WebKit, contra el motor vivo real.
 *
 * Selecciona el h1 del piloto (mipipa), escribe un encargo, lo manda, espera a que
 * el agente encerrado lo termine y lo revise, y captura el panel en cada fase.
 * Al final DESHACE el commit del encargo para dejar el piloto como estaba.
 *
 * Uso (con el banco levantado en :PUERTO):
 *   node servicios/vivo/qa/banco/prueba-encargo.mjs [puerto] [carpeta-capturas]
 */
import { webkit } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PUERTO = Number(process.argv[2] ?? 9345);
const CAPTURAS = process.argv[3] ?? "/root/worktrees/vforge-encargos/capturas/encargo";
const PILOTO = "/root/worktrees/vivo-mipipa";
mkdirSync(CAPTURAS, { recursive: true });

const secreto = /^VIVO_SECRET=(.+)$/m.exec(readFileSync("/etc/vl-secrets/vivo.env", "utf8"))[1].trim();
const antes = execFileSync("git", ["-C", PILOTO, "rev-parse", "--short", "HEAD"]).toString().trim();

const navegador = await webkit.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 860 } });
await pagina.goto(`http://127.0.0.1:${PUERTO}/`);
await pagina.click('[data-banco="sel-h1"]');
await pagina.waitForSelector("text=Encárgalo");

const caja = pagina.locator('textarea[placeholder^="esto más grande"]');
await caja.fill('Cambia la coma final de "Agua segura," por un punto. Solo eso.');
await pagina.screenshot({ path: `${CAPTURAS}/1-escrito.png` });
await pagina.click("text=Encargar con este elemento");

await pagina.waitForTimeout(6000);
await pagina.screenshot({ path: `${CAPTURAS}/2-trabajando.png` });

const limite = Date.now() + 240_000;
let final = null;
while (Date.now() < limite) {
  const texto = await pagina.locator("aside").first().innerText();
  const m = /(listo y revisado|no cambió nada|cambió sin revisar|falló)/.exec(texto);
  if (m) {
    final = m[1];
    break;
  }
  await pagina.waitForTimeout(4000);
}
await pagina.screenshot({ path: `${CAPTURAS}/3-cerrado.png` });
const panel = await pagina.locator("aside").first().innerText();
await navegador.close();

const despues = execFileSync("git", ["-C", PILOTO, "log", "-1", "--format=%h %s"]).toString().trim();
console.log(JSON.stringify({ antes, final, despues, panel: panel.slice(-700) }, null, 2));

// Dejar el piloto como estaba: deshacer el commit del encargo (sólo si es del encargo).
if (despues.includes("encargo V #")) {
  const r = await fetch("http://127.0.0.1:9311/__vivo/api/git", {
    method: "POST",
    headers: { "content-type": "application/json", "x-vivo-key": secreto },
    body: JSON.stringify({ project: "mipipa", accion: "deshacer" }),
  });
  console.log("deshecho:", JSON.stringify(await r.json()));
}
