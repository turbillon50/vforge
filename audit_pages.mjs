import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const BASE = "https://www.crede-ti.info";

// errores de consola
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text().slice(0,80)); });

const tok = (await (await page.request.post(`${BASE}/api/auth/master-login`, { data: { masterPassword: "LuisAdmin2025#" } })).json()).token;
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => { localStorage.setItem('credeti_token', t); localStorage.setItem('credeti_role', 'admin'); }, tok);

const routes = [
  ["/admin", "Panel admin"],
  ["/admin/solicitudes", "Solicitudes"],
  ["/admin/cartera", "Cartera"],
  ["/solicitar", "Solicitar (cliente)"],
  ["/perfil", "Perfil"],
  ["/mi-credito", "Mi credito"],
];
for (const [route, name] of routes) {
  errors.length = 0;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    const bodyLen = (await page.evaluate(() => document.body.innerText.trim().length));
    const blank = bodyLen < 30;
    const errCount = errors.length;
    const status = (!blank && errCount===0) ? "OK" : (blank ? "PANTALLA VACIA" : `${errCount} errores`);
    console.log(`  [${status}] ${name} (${route}) - ${bodyLen} chars`);
    if (errCount>0) console.log("      " + errors.slice(0,2).join(" | "));
  } catch(e) {
    console.log(`  [TIMEOUT/ERROR] ${name} (${route}): ${e.message.slice(0,60)}`);
  }
}
await b.close();
