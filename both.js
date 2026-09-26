const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const base = 'https://dlucio.vercel.app';
  async function shot(name, path, theme, wait) {
    const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true });
    if (theme) await ctx.addInitScript((t) => { try { localStorage.setItem('tm-theme', t); } catch(e){} }, theme);
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil:'networkidle' });
    await p.waitForTimeout(wait);
    await p.screenshot({ path:`/tmp/t_${name}.png` });
    await ctx.close();
  }
  await shot('app_light','/app','light',1500);
  await shot('app_dark','/app','dark',1500);
  await shot('quiniela_light','/app/quiniela','light',1400);
  await shot('perfil_light','/app/perfil','light',1400);
  await shot('admin_light','/admin','light',1400);
  await shot('admin_dark','/admin','dark',1400);
  await b.close();
  console.log('DONE');
})();
