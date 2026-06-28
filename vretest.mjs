import { chromium } from 'playwright';
const KEY = "cti-admin-0c532e1012f44a5e5846245d0d0897f9bc64fb9542e53e81";
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
// Contexto NUEVO, sin cache, sin storage
const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, bypassCSP: true });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";
await page.goto(`${BASE}/entrar/${KEY}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4500);
console.log("URL final:", page.url().replace(BASE,''));
const txt = await page.evaluate(() => document.body.innerText.slice(0,120).replace(/\n+/g,' | '));
console.log("Pantalla:", txt);
const ok = page.url().includes('/admin') || txt.includes('administraci') || txt.includes('Solicitudes');
const is404 = txt.includes('404') || txt.includes('no encontrada');
console.log("Resultado:", ok ? "ENTRA AL PANEL (liga OK)" : is404 ? "404 (problema)" : "otro");
await b.close();
