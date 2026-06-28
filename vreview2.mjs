import { chromium } from 'playwright';
const BASE = "https://www.crede-ti.info";
const r = await fetch(`${BASE}/api/auth/master-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({masterPassword:'LuisAdmin2025#'}) });
const { token, user } = await r.json();
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil:'domcontentloaded' });
await page.evaluate(([t,u]) => { localStorage.setItem('credeti_token',t); localStorage.setItem('credeti_role','admin'); localStorage.setItem('credeti_user', JSON.stringify(u)); }, [token,user]);
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil:'networkidle' });
await page.waitForTimeout(3000);
// asegurar tab pendientes
const beforeText = await page.evaluate(() => document.body.innerText.slice(0,200).replace(/\n+/g,' | '));
console.log("Lista:", beforeText);
// click en la tarjeta (CreditCard) que contenga el monto 10,000 o el nombre
const clicked = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div,button,a')];
  const card = cards.find(e => /10,000|10000|Jose Miguel|Gonz/i.test(e.textContent||'') && e.querySelector('*') && (e.className||'').toString().includes('pressable'));
  const target = card || cards.find(e => /10,000|Jose Miguel/i.test(e.textContent||''));
  if (target){ target.click(); return target.className?.toString().slice(0,40)||'sin-clase'; }
  return null;
});
console.log("Click en:", clicked);
await page.waitForTimeout(7000);
const txt = await page.evaluate(() => document.body.innerText);
const has = s => txt.includes(s);
console.log("Abrio detalle (Aprobar/Editar):", has('Aprobar') || has('Editar condiciones'));
console.log("Tiene 'Datos del cliente':", has('Datos del cliente'));
console.log("Domicilio (Oaxtepec/atocpan):", has('Oaxtepec') || has('atocpan'));
console.log("Ocupacion (Comerciante):", has('Comerciante'));
console.log("CURP (GORM870710):", has('GORM870710'));
console.log("Documentos del cliente:", has('Documentos del cliente'));
await page.screenshot({ path: '/root/vforge/review2.png', fullPage: true });
await b.close();
