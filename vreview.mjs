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
await page.waitForTimeout(3500);
// click en la solicitud de Jose Miguel
const clicked = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length<=3 && /Jose Miguel|Gonz/i.test(e.textContent||''));
  if (els.length){ (els[0].closest('button,[role=button],a,div[class*=pressable]')||els[0]).click(); return true; }
  return false;
});
await page.waitForTimeout(3000);
const txt = await page.evaluate(() => document.body.innerText);
const has = s => txt.includes(s);
console.log("Click solicitud:", clicked);
console.log("Tiene 'Datos del cliente':", has('Datos del cliente'));
console.log("Muestra Nombre:", has('Jose Miguel') || has('Gonz'));
console.log("Muestra Domicilio:", has('Oaxtepec') || has('atocpan'));
console.log("Muestra Ocupacion:", has('Comerciante'));
console.log("Muestra CURP:", has('GORM870710'));
console.log("Tiene Referencias:", has('Referencias'));
console.log("Tiene Documentos:", has('Documentos del cliente'));
await page.screenshot({ path: '/root/vforge/review.png', fullPage: true });
await b.close();
