import { chromium } from 'playwright';
const BASE = "https://www.crede-ti.info";
const r = await fetch(`${BASE}/api/auth/master-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({masterPassword:'LuisAdmin2025#'}) });
const { token, user } = await r.json();
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 1100 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil:'domcontentloaded' });
await page.evaluate(([t,u]) => { localStorage.setItem('credeti_token',t); localStorage.setItem('credeti_role','admin'); localStorage.setItem('credeti_user', JSON.stringify(u)); }, [token,user]);
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil:'networkidle' });
await page.waitForTimeout(2500);
await page.evaluate(() => { const t=[...document.querySelectorAll('button')].find(e=>/Historial/i.test(e.textContent||'')); if(t) t.click(); });
await page.waitForTimeout(2500);
// click tarjeta aprobada de Emiliano $11,600
const ok = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter(e => (e.className||'').toString().includes('card') && (e.className||'').toString().includes('pressable'));
  const target = cards.find(e => /11,600|Emiliano perez merida/.test(e.textContent||'')) || cards[0];
  if (target){ target.click(); return (target.textContent||'').slice(0,40); }
  return 'sin tarjeta';
});
console.log("Click:", ok);
await page.waitForTimeout(6500);
const t1 = await page.evaluate(() => document.body.innerText);
console.log("Abrio detalle (Aprobar/Rechazar/Resumen):", t1.includes('Aprobar')||t1.includes('Resumen financiero')||t1.includes('RESUMEN'));
console.log("Header capacidad:", t1.includes('CAPACIDAD DE PAGO') || t1.includes('Capacidad de pago'));
console.log("Etiqueta:", ['Saludable','Ajustado','Riesgo alto'].find(x=>t1.includes(x)) || 'NO');
console.log("% del ingreso:", /\d+% del ingreso/.test(t1));
await page.screenshot({ path: '/root/vforge/sem3.png', fullPage: false });
await b.close();
