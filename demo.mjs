import { chromium, devices } from '@playwright/test';
const OUT='/Users/staimer/Documents/1platform-worktrees/wvf-evidence';
const b=await chromium.launch();

const shot = async (url, file, {sel, mobile, clickMenu}={}) => {
  const ctx = await b.newContext(mobile ? {...devices['iPhone 13']} : {viewport:{width:1440,height:900}});
  const p = await ctx.newPage();
  await p.goto(url,{waitUntil:'networkidle',timeout:60000});
  await p.waitForTimeout(900);
  if (clickMenu) {
    await p.getByRole('button',{name:/menu|menú/i}).first().click();
    await p.waitForTimeout(500);
    const t = p.locator('[aria-expanded]:visible').filter({hasText:/solutions|soluciones/i}).first();
    if (await t.count()) { await t.click().catch(()=>{}); await p.waitForTimeout(400); }
  }
  if (sel) { const el=p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await el.screenshot({path:`${OUT}/${file}`}); }
  else await p.screenshot({path:`${OUT}/${file}`});
  console.log('  ->', file);
  await ctx.close();
};

await shot('http://localhost:4331/solutions/deliveries/','demo-1-deliveries-en.png');
await shot('http://localhost:4331/es/solutions/deliveries/','demo-2-deliveries-es.png');
await shot('http://localhost:4331/es/solutions/ads/','demo-3-ads-es.png');
await shot('http://localhost:4331/','demo-4-mobile-menu.png',{mobile:true,clickMenu:true});
await shot('http://localhost:4331/es/payments-invoicing/','demo-5-tres-formas-de-cobrar.png',{sel:"section:has(h2:text-is('No toda venta entra por tu checkout. Estas son las otras formas en que el dinero te llega.'))"});
await b.close();
