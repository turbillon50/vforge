import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
// token como CLIENTE (simula al dueno antes de activarse)
const cliTok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "credeti" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'client'); }, cliTok);
// ir al perfil como cliente
await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
const txt = await page.evaluate(() => document.body.innerText);
const tieneBotonMaster = txt.includes('Modo administrador') || txt.includes('clave maestra');
console.log("Cliente VE el boton 'Modo administrador':", tieneBotonMaster ? "SI ✅" : "NO ❌");

// Probar que master-login con la clave devuelve admin (el flujo que ejecutara el boton)
const r = await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } });
const j = await r.json();
console.log("Clave maestra LuisAdmin2025# -> rol:", j.user?.role, j.token ? "(token OK)" : "(SIN token)");
await b.close();
