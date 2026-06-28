const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true });
  const shots = [
    ['home','https://dlucio.vercel.app/', 2700],
    ['registro','https://dlucio.vercel.app/registro', 1200],
    ['app','https://dlucio.vercel.app/app', 1600],
    ['admin','https://dlucio.vercel.app/admin', 1600],
  ];
  for (const [name,url,wait] of shots) {
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil:'networkidle' });
    await p.waitForTimeout(wait);
    await p.screenshot({ path:`/tmp/v2_${name}.png` });
    await p.close();
  }
  const p = await ctx.newPage();
  await p.goto('https://dlucio.vercel.app/app', { waitUntil:'networkidle' });
  await p.waitForTimeout(1400);
  try { await p.getByText('Demo', { exact:false }).first().click({ timeout:4000 }); await p.waitForTimeout(700); } catch(e){ console.log('click:', e.message); }
  await p.screenshot({ path:'/tmp/v2_sheet.png' });
  await p.close();
  await b.close();
  console.log('SHOTS_DONE');
})();
