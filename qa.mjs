import { chromium } from 'playwright';
const BASE = "https://www.crede-ti.info";
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });

async function checkPage(path, label, injectAdmin) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,90)); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0,90)));
  if (injectAdmin) {
    const r = await fetch(`${BASE}/api/auth/master-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({masterPassword:'LuisAdmin2025#'}) });
    const { token, user } = await r.json();
    await page.goto(`${BASE}/admin`, { waitUntil:'domcontentloaded' });
    await page.evaluate(([t,u]) => { localStorage.setItem('credeti_token',t); localStorage.setItem('credeti_role','admin'); localStorage.setItem('credeti_user', JSON.stringify(u)); }, [token,user]);
  }
  await page.goto(`${BASE}${path}`, { waitUntil:'networkidle' });
  await page.waitForTimeout(3500);
  const bodyLen = await page.evaluate(() => document.body.innerText.length);
  // filtrar errores de red benignos (favicon, etc.)
  const real = errors.filter(e => !/favicon|manifest|404|Failed to load resource/.test(e));
  console.log(`[${label}] ${path} -> texto:${bodyLen>50?'OK':'VACIO'} | errores:${real.length===0?'0':real.length+' -> '+real.slice(0,2).join(' ; ')}`);
  await ctx.close();
}

await checkPage('/', 'PUBLICO', false);
await checkPage('/admin', 'ADMIN-PANEL', true);
await checkPage('/admin/cartera', 'CARTERA', true);
await checkPage('/mi-credito', 'CLIENTE', true);

// PWA: manifest + service worker
const ctx = await b.newContext();
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil:'domcontentloaded' });
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel=manifest]');
  if (!link) return 'NO-MANIFEST';
  try { const r = await fetch(link.href); const j = await r.json(); return `${j.name||j.short_name} | icons:${(j.icons||[]).length} | display:${j.display}`; } catch { return 'MANIFEST-ERR'; }
});
const sw = await page.evaluate(() => fetch('/sw.js').then(r=>r.ok?'sw.js OK':'sw.js '+r.status).catch(()=>'sw.js NO'));
console.log("[PWA] manifest:", manifest);
console.log("[PWA] service worker:", sw);
await b.close();
