// Banco del Trío: capturas de /app/trio contra `next dev` real (sin Clerk local).
// /api/projects y /api/forge/trio se SIMULAN aquí con page.route, sólo para la
// captura: la app no lleva mocks.
//
//   npx next dev --webpack -p 3123   (en otra terminal)
//   node servicios/trio/banco/prueba.mjs /tmp/claude-0/trio
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BANCO_URL ?? "http://localhost:3123";
const OUT = process.argv[2] ?? "capturas/trio";
mkdirSync(OUT, { recursive: true });
const PROYECTOS = [
  { id: "p-eternime", name: "Eternime" },
  { id: "p-vliving", name: "V&LIVING" },
  { id: "p-vforge", name: "VForge" },
];
const RESPUESTAS = {
  claude: {
    model: "claude-sonnet-4-6",
    responder:
      "Para el onboarding de **Eternime** yo empezaría por medir dónde se cae la gente:\n\n1. Registro → primera memoria guardada.\n2. Primera memoria → regreso al día 2.\n\nSin ese embudo, cualquier rediseño es a ciegas. Propongo un evento por paso en `vl_events` y revisar en una semana.",
    replicar:
      "Coincido con ChatGPT en quitar el registro obligatorio, pero V tiene razón en que sin medir no sabremos si funcionó. Yo juntaría ambas: modo invitado **y** el embudo desde el día uno.",
  },
  chatgpt: {
    model: "gpt-5",
    responder:
      "Yo atacaría la fricción primero: deja entrar sin cuenta, que la persona guarde su primera memoria como invitada y pida registro sólo para sincronizar. Eso suele duplicar la activación en apps de notas personales.",
    replicar:
      "Claude agrega algo que me faltó: el embudo. Le corregiría a V que el plan de 3 semanas es largo; con el modo invitado se puede probar en días.",
  },
  v: {
    model: "llama-3.3-70b",
    responder:
      "Carnal, en Eternime el dolor real es que la primera pantalla no explica qué es *tu segunda memoria*. Antes de tocar el registro, una pantalla de 10 segundos con un ejemplo vivo. Plan sugerido: semana 1 copy y ejemplo, semana 2 invitado, semana 3 medir.",
    replicar:
      "ChatGPT tiene razón con lo del invitado y Claude con el embudo. Ajusto mi plan: invitado + ejemplo vivo en la misma entrega, y medimos desde ahí.",
  },
};

function sse(eventos) {
  return eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

async function preparar(page, { falla = null } = {}) {
  await page.route("**/api/projects", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: PROYECTOS }) }),
  );
  await page.route("**/api/forge/trio", async (route) => {
    const cuerpo = JSON.parse(route.request().postData() ?? "{}");
    const r = RESPUESTAS[cuerpo.agente];
    await new Promise((ok) => setTimeout(ok, cuerpo.agente === "v" ? 500 : 250));
    const eventos =
      falla === cuerpo.agente
        ? [{ type: "meta", model: r.model }, { type: "error", message: "OPENAI_API_KEY no está configurada." }]
        : [{ type: "meta", model: r.model }, { type: "text", value: r[cuerpo.modo] }, { type: "done" }];
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(eventos) });
  });
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const errores = [];

async function escena(nombre, viewport, { replica, falla, pestana } = {}) {
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(`${nombre}: ${e.message}`));
  await preparar(page, { falla });
  await page.goto(`${BASE}/app/trio`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("textarea", { timeout: 120_000 });
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 1);
  await page.selectOption("select", "p-eternime");
  if (replica) await page.getByRole("switch").click();
  await page.fill("textarea", "¿Cómo mejoramos el onboarding de Eternime para que la gente guarde su primera memoria?");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30_000 });
  await page.waitForTimeout(600);
  if (pestana) {
    await page.getByRole("tab", { name: new RegExp(pestana) }).click();
    await page.waitForTimeout(300);
  }
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(nombre, "scroll horizontal:", ancho > viewport.width ? `SÍ (${ancho})` : "no");
  await page.screenshot({ path: `${OUT}/${nombre}.png` });
  await ctx.close();
}

await escena("escritorio-1440", { width: 1440, height: 900 }, { replica: true });
await escena("escritorio-1440-falla-chatgpt", { width: 1440, height: 900 }, { falla: "chatgpt" });
await escena("celular-390-claude", { width: 390, height: 844 }, { replica: true });
await escena("celular-390-v", { width: 390, height: 844 }, { replica: true, pestana: "V" });
await escena("celular-390-falla-chatgpt", { width: 390, height: 844 }, { falla: "chatgpt", pestana: "ChatGPT" });

// Estado vacío
{
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await preparar(page);
  await page.goto(`${BASE}/app/trio`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("textarea", { timeout: 120_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/escritorio-1440-vacio.png` });
  await ctx.close();
}
await navegador.close();
console.log("errores:", errores.length ? errores : "ninguno");
