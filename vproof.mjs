import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
// token admin real
const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
// simular sesion admin (como quedaria el dueno tras re-loguear)
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'admin'); }, tok);
// ir a la raiz (como cuando abre la app recien logueado)
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
console.log("URL al abrir la app como admin:", page.url().replace(BASE,'') || '/');
const txt = await page.evaluate(() => document.body.innerText.slice(0,200).replace(/\n+/g,' | '));
console.log("Pantalla:", txt);
const enPanel = txt.includes('administraci') || page.url().includes('/admin');
const enCliente = txt.includes('Tu primer cr') || txt.includes('Bienvenido');
console.log("¿Cae en PANEL ADMIN?:", enPanel ? "SI ✅" : "NO");
console.log("¿Cae en vista cliente (malo)?:", enCliente ? "SI ❌" : "NO ✅");
await b.close();
