import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1100 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'admin'); }, tok);
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
// listar lo que hay en la pantalla
const cards = await page.evaluate(() => {
  return [...document.querySelectorAll('[class*="pressable"]')].map(el => el.textContent.trim().slice(0,40)).filter(t => t.length > 3).slice(0,12);
});
console.log("Tarjetas/botones en pantalla:");
cards.forEach(c => console.log("  - " + c));
// intentar abrir cualquier credito (busca "Ver" o nombre)
const clicked = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[class*="pressable"]')];
  // buscar uno que parezca tarjeta de credito (tiene monto o nombre)
  const card = els.find(el => /\$[\d,]+|Luis|Cliente #|Cr.dito #/.test(el.textContent) && el.querySelector('*'));
  if (card) { card.click(); return card.textContent.trim().slice(0,50); }
  return null;
});
console.log("Cliqueado:", clicked);
await page.waitForTimeout(3000);
const hasDocs = await page.evaluate(() => document.body.innerText.toLowerCase().includes('documento'));
const imgs = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"] img')].length);
console.log("Menciona 'documento':", hasDocs, "| imagenes doc:", imgs);
await b.close();
