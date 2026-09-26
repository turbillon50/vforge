const { chromium } = require('playwright');

const URL = 'https://apsus.live';
const viewports = [
  { name: 'movil',   width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const summary = {};
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.name==='movil' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' : undefined });
    const page = await ctx.newPage();
    const errors = [], pageerrors = [], failed = [], bad = [], brokenImgs = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => pageerrors.push(e.message));
    page.on('requestfailed', r => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    try {
      await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (e) { pageerrors.push('goto: ' + e.message); }
    // full scroll
    await page.evaluate(async () => {
      await new Promise(res => {
        let y = 0; const t = setInterval(() => { window.scrollBy(0, 600); y += 600; if (y > document.body.scrollHeight + 1200) { clearInterval(t); res(); } }, 100);
      });
    });
    await page.waitForTimeout(1500);
    const imgCheck = await page.evaluate(() => Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src));
    brokenImgs.push(...imgCheck);
    const hasSW = await page.evaluate(() => 'serviceWorker' in navigator && navigator.serviceWorker.controller != null || (navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(r=>r.length>0)));
    const swReg = await page.evaluate(async () => { try { const r = await navigator.serviceWorker.getRegistrations(); return r.length; } catch(e){ return -1; } });
    const bodyLen = (await page.evaluate(() => document.body.innerText.length));
    summary[vp.name] = { errors, pageerrors, failed, bad, brokenImgs, swReg, bodyLen };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(summary, null, 2));
})();
