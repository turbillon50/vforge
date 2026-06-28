import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'client'); }, "abd2262b7a87e16fa81bb035e799abf9ce8054bc2d43d9df36463af7068675ff");
await page.goto(`${BASE}/mi-credito`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const txt = await page.evaluate(() => document.body.innerText);
console.log("Boton 'Pagar mi credito' visible:", txt.includes('Pagar mi credito') || txt.includes('Pagar mi cr') ? "SI" : "NO");
// Confirmar que el link apunta a Mercado Pago
const mpLink = await page.evaluate(() => { const a=[...document.querySelectorAll('a')].find(x=>x.href.includes('mercadopago')); return a ? a.href : null; });
console.log("Link del boton:", mpLink || "(no encontrado)");
await b.close();
