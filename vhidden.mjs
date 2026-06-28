import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
const cliTok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "credeti" } })).json()).token;
// CLIENTE REAL: sin marcador admin_origin
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => {
  localStorage.setItem('credeti_token', t);
  localStorage.setItem('credeti_role', 'client');
  localStorage.removeItem('credeti_admin_origin'); // cliente genuino
}, cliTok);
await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
const txt1 = await page.evaluate(() => document.body.innerText);
console.log("CLIENTE REAL ve 'Modo administrador':", (txt1.includes('Modo administrador') || txt1.includes('clave maestra')) ? "SI ❌ (mal)" : "NO ✅ (oculto)");

// ADMIN que entro a vista cliente (con marcador): SI debe verlo para volver
await page.evaluate(() => localStorage.setItem('credeti_admin_origin', '1'));
await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const txt2 = await page.evaluate(() => document.body.innerText);
console.log("ADMIN en vista cliente ve el boton para volver:", (txt2.includes('Modo administrador') || txt2.includes('clave maestra')) ? "SI ✅" : "NO");
await b.close();
