import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
// Abrir la liga magica DIRECTO, sin sesion previa (navegador limpio)
await page.goto(`${BASE}/entrar/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
console.log("URL final tras abrir la liga:", page.url().replace(BASE,''));
const txt = await page.evaluate(() => document.body.innerText.slice(0,180).replace(/\n+/g,' | '));
console.log("Pantalla:", txt);
const enPanel = txt.includes('administraci') || txt.includes('Solicitudes') || txt.includes('Cartera') || page.url().includes('/admin');
console.log("Cae en PANEL ADMIN sin login:", enPanel ? "SI ✅" : "NO ❌");
const role = await page.evaluate(() => localStorage.getItem('credeti_role'));
console.log("Rol en sesion:", role);
await b.close();
