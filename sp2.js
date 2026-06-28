const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true });
  const p = await ctx.newPage();
  await p.goto('https://dlucio.vercel.app/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(900);
  await p.screenshot({ path:'/tmp/f_splash.png' });
  await b.close(); console.log('OK');
})();
