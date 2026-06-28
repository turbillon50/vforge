import { chromium } from 'playwright';
const BASE = "https://www.crede-ti.info";
const r = await fetch(`${BASE}/api/auth/master-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({masterPassword:'LuisAdmin2025#'}) });
const { token, user } = await r.json();
const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 430, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil:'domcontentloaded' });
await page.evaluate(([t,u]) => { localStorage.setItem('credeti_token',t); localStorage.setItem('credeti_role','admin'); localStorage.setItem('credeti_user', JSON.stringify(u)); }, [token,user]);

// 1) SEMAFORO en revision (credito 15 pendiente)
await page.goto(`${BASE}/admin/solicitudes`, { waitUntil:'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const c=[...document.querySelectorAll('div,button,a')].find(e=>/10,000|Jose Miguel/i.test(e.textContent||'') && (e.className||'').toString().includes('pressable')); if(c) c.click(); });
await page.waitForTimeout(6000);
const t1 = await page.evaluate(() => document.body.innerText);
console.log("[SEMAFORO] 'Capacidad de pago':", t1.includes('Capacidad de pago'));
console.log("[SEMAFORO] etiqueta:", ['Saludable','Ajustado','Riesgo alto'].find(x=>t1.includes(x)) || 'NO');
console.log("[SEMAFORO] % visible:", /\d+% del ingreso/.test(t1));
await page.screenshot({ path: '/root/vforge/w1_sem.png', fullPage: false });

// 2) BOTON WhatsApp en expediente con credito activo (cliente 14)
await page.goto(`${BASE}/admin/expediente/14`, { waitUntil:'networkidle' });
await page.waitForTimeout(6000);
const t2 = await page.evaluate(() => document.body.innerText);
console.log("[WHATSAPP] boton 'Cobrar por WhatsApp':", t2.includes('Cobrar por WhatsApp'));
const waHref = await page.evaluate(() => { const a=[...document.querySelectorAll('a')].find(x=>(x.textContent||'').includes('Cobrar por WhatsApp')); return a? a.href.slice(0,60):'NO-LINK'; });
console.log("[WHATSAPP] href:", waHref);
await page.screenshot({ path: '/root/vforge/w1_wa.png', fullPage: false });
await b.close();
