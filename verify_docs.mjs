import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'admin'); }, tok);
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// abrir la primera solicitud (credito 13)
const opened = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter(d => d.textContent.includes('Luis Humberto') && d.className.includes('pressable'));
  if (cards[0]) { cards[0].click(); return true; }
  // fallback: cualquier card de credito
  const any = [...document.querySelectorAll('[class*="pressable"]')].find(el => el.textContent.match(/Cr.dito #|Cliente #/));
  if (any) { any.click(); return true; }
  return false;
});
await page.waitForTimeout(3000);
const hasDocsSection = await page.evaluate(() => document.body.innerText.includes('Documentos del cliente'));
const docCount = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('a[target="_blank"] img')];
  return imgs.length;
});
const bodyHasReview = await page.evaluate(() => document.body.innerText.includes('Revisión de crédito') || document.body.innerText.includes('Resumen financiero') || document.body.innerText.includes('RESUMEN FINANCIERO'));
console.log("Abrio detalle:", opened);
console.log("Pantalla de revision visible:", bodyHasReview);
console.log("Seccion 'Documentos del cliente' presente:", hasDocsSection);
console.log("Imagenes de documentos mostradas:", docCount);
await b.close();
