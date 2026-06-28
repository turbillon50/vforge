const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true });

  // LIGHT (default) - dashboard
  let p = await ctx.newPage();
  await p.goto('https://dlucio.vercel.app/app', { waitUntil:'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path:'/tmp/t_app_light.png' });
  await p.close();

  // LIGHT - admin
  p = await ctx.newPage();
  await p.goto('https://dlucio.vercel.app/admin', { waitUntil:'networkidle' });
  await p.waitForTimeout(1400);
  await p.screenshot({ path:'/tmp/t_admin_light.png' });
  await p.close();

  // DARK - set localStorage then load dashboard
  p = await ctx.newPage();
  await p.goto('https://dlucio.vercel.app/app', { waitUntil:'domcontentloaded' });
  await p.evaluate(() => localStorage.setItem('tm-theme','dark'));
  await p.reload({ waitUntil:'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path:'/tmp/t_app_dark.png' });
  await p.close();

  await b.close();
  console.log('DONE');
})();
