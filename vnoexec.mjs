import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
// simular que un usuario quedo con rol executive en localStorage
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'executive'); }, tok);

// intentar entrar al dashboard de asesor directamente
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
console.log("URL tras /dashboard:", page.url().replace(BASE,''));
const txt = await page.evaluate(() => document.body.innerText.slice(0,150).replace(/\n+/g,' | '));
console.log("Contenido:", txt);
const isExecPanel = txt.includes('Cobrado hoy') || txt.includes('COBRADO HOY') || txt.includes('Clientes asignados') || txt.includes('TU COMISI');
console.log("Muestra panel de asesor:", isExecPanel ? "SI (MAL)" : "NO (BIEN)");

// probar /dashboard/cobrar
await page.goto(`${BASE}/dashboard/cobrar`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
console.log("URL tras /dashboard/cobrar:", page.url().replace(BASE,''));
await b.close();
