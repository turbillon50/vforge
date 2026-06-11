// Captura de evidencia mobile del Taller en dos viewports reales.
// Uso: node scripts/shot-taller.mjs <baseUrl>
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
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  // Deja que las esferas hagan al menos un poll y se asienten las animaciones.
  await page.waitForTimeout(5500);

  // Mide desbordes horizontales (el síntoma clásico de "no se ve en celular").
  const overflow = await page.evaluate((w) => {
    const docW = document.documentElement.scrollWidth;
    const bad = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > w + 1 || r.left < -1)) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
          right: Math.round(r.right),
          left: Math.round(r.left),
        });
      }
    });
    return { docW, viewportW: w, horizontalOverflow: docW > w + 1, offenders: bad.slice(0, 8) };
  }, vp.width);

  await page.screenshot({ path: `${out}/${vp.name}.png`, fullPage: true });
  await page.screenshot({ path: `${out}/${vp.name}-fold.png`, fullPage: false });
  console.log(
    JSON.stringify({ viewport: vp.name, overflow, consoleErrors: errors.slice(0, 5) }, null, 2),
  );
  await ctx.close();
}
await browser.close();
console.log("DONE shots in", out);
