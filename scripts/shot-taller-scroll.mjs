// Evidencia mobile del Taller capturando el contenedor de scroll INTERNO
// (WorkspaceShell usa fixed inset-0 + inner [data-app-scroll], el documento no
// scrollea). Recorremos ese contenedor y capturamos núcleo orbital y feed.
// Uso: node scripts/shot-taller-scroll.mjs <baseUrl>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://localhost:3100";
const url = `${base}/app/taller`;
const out = "/tmp/taller-shots";
mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: "iphone-390x844", width: 390, height: 844 },
  { name: "android-360x800", width: 360, height: 800 },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(5500);

  // Mide el contenedor de scroll real y reporta su altura total.
  const meta = await page.evaluate(() => {
    const el = document.querySelector("[data-app-scroll]");
    if (!el) return { found: false };
    return {
      found: true,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      canScroll: el.scrollHeight > el.clientHeight + 4,
    };
  });

  // Captura por secciones del contenedor interno (top / núcleo / fondo).
  const sections = [
    { tag: "top", to: 0 },
    { tag: "nucleo", to: 0.42 },
    { tag: "feed", to: 1 },
  ];
  for (const s of sections) {
    await page.evaluate((frac) => {
      const el = document.querySelector("[data-app-scroll]");
      if (el) el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * frac, behavior: "instant" });
    }, s.to);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${vp.name}-${s.tag}.png`, fullPage: false });
  }

  console.log(JSON.stringify({ viewport: vp.name, scroll: meta }, null, 2));
  await ctx.close();
}
await browser.close();
console.log("DONE section shots in", out);
