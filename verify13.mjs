import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1100 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'admin'); }, tok);
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// click en la card que tenga "Credito #13" o "Luis Humberto"
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[class*="pressable"]')];
  const target = cards.find(el => el.textContent.includes('Luis Humberto') || el.textContent.includes('#13'));
  if (target) target.click();
});
await page.waitForTimeout(3500);
const full = await page.evaluate(() => document.body.innerText);
console.log("Tiene 'Documentos del cliente':", full.includes('Documentos del cliente'));
console.log("Tiene 'archivo' o 'archivos':", /\d+ archivos?/.test(full));
console.log("Tiene 'Toca un documento':", full.includes('Toca un documento'));
// extraer la parte relevante
const idx = full.indexOf('Documentos del cliente');
if (idx >= 0) console.log("CONTEXTO:", full.slice(idx, idx+120).replace(/\n+/g,' | '));
const imgs = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"] img')].map(i => i.src.slice(0,50)));
console.log("Imagenes:", JSON.stringify(imgs));
await b.close();
