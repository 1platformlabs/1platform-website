/** Run only against the isolated full Core/SSR bank; no webServer or HTTP doubles. */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const port = Number(process.env.WEBSITE_E2E_PORT);
assert(Number.isInteger(port) && port > 4321, 'An explicit isolated bank port is required');
const output = process.env.WEBSITE_E2E_EVIDENCE;
assert(output, 'An evidence directory is required');
await mkdir(output, { recursive: true });
const cases = [['1platform.pro','/','en'],['1platform.pro','/es/','es'],['medipago.gt','/','es'],['vendefacil.gt','/','es']];
const browser = await chromium.launch({args:['--host-resolver-rules='+[...new Set(cases.map(x=>x[0])), 'unknown.example'].map(h=>`MAP ${h} 127.0.0.1`).join(',')]});
const results=[];
try {
 for (const [host,path,locale] of cases) {
  for (const [width,height] of [[1440,900],[390,844],[844,390]]) {
   const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page = await context.newPage();
   const response=await page.goto(`http://${host}:${port}${path}`);
   assert.equal(response.status(),200);
   assert.equal(new URL(page.url()).host,`${host}:${port}`, 'Stay inside the isolated bank');
   await page.locator('h1').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const button=page.locator('[data-whatsapp-contact]');
   assert.equal(await button.count(),1,`Missing floating WhatsApp: ${host}${path}`);
   assert(await button.isVisible());
   const original=page.locator(host==='1platform.pro'?'.contact .button':'[data-support-cta="hero"]');
   assert.equal(await button.getAttribute('href'),await original.getAttribute('href'));
   assert.match(await button.getAttribute('aria-label'),locale==='en'?/opens a new tab/:/abre una pestaña nueva/);
   const box=await button.boundingBox();
   assert.equal(box.width,width>600&&height>500?60:56);
   assert(box.x>=0&&box.y>=0&&box.x+box.width<width&&box.y+box.height<height);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await button.focus();
   assert.equal(await button.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
   assert.equal(await button.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
   if(width<1000){
    const menu=page.locator(host==='1platform.pro'?'.brand-menu-toggle':'.menu-toggle');
    await menu.click(); assert(!(await button.isVisible()));
    await page.keyboard.press('Escape'); assert(await button.isVisible());
   }
   await page.screenshot({path:`${output}/${host}-${locale}-${width}.png`});
   await page.locator('footer').scrollIntoViewIfNeeded();
   assert.deepEqual(await button.boundingBox(),box,'Button remains fixed after scrolling');
   results.push({host,path,locale,width,height,href:await button.getAttribute('href'),box});
   await context.close();
  }
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const p=await nojs.newPage();
 await p.goto(`http://medipago.gt:${port}/`);
 assert(await p.locator('[data-whatsapp-contact]').isVisible());
 const unknown=await p.goto(`http://unknown.example:${port}/`);
 assert.equal(unknown.status(),404);
 assert.equal(await p.locator('[data-whatsapp-contact]').count(),0);
 await nojs.close();
 await writeFile(`${output}/results.json`,JSON.stringify({checks:results.length+2,results},null,2));
 console.log(`${results.length+2} bank cases passed`);
} finally { await browser.close(); }
