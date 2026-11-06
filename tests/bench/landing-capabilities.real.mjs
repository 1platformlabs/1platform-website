import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
const out='artifacts/landing-capabilities-refresh';
await mkdir(out,{recursive:true});
test('published capabilities in the isolated real bank', async () => {
const browser=await chromium.launch({args:['--host-resolver-rules=MAP 1platform.pro 127.0.0.1, MAP medipago.gt 127.0.0.1, MAP vendefacil.1platform.pro 127.0.0.1']});
const results=[];
console.log('Browser started');
try {
 for(const [locale,path,cloud,plates] of [['es','/es/','Nube','Placas NFC'],['en','/','Cloud','NFC plaques']]) {
  for(const [width,height] of [[1440,900],[360,800],[390,844],[430,932],[844,390]]) {
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);console.log(locale,width,'navigate');const errors=[];const mutations=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))mutations.push(r.url());});
   const response=await page.goto(`http://1platform.pro:4921${path}`,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   await expect(page.locator('[data-capability]')).toHaveCount(17,{timeout:90000});
   await expect(page.locator('.capability-grid a')).toHaveCount(0);
   await expect(page.locator(`[data-capability="${cloud}"] em`)).toHaveCount(0);
   await expect(page.locator('[data-capability]').nth(7).locator('small')).toContainText('WhatsApp');
   await expect(page.locator('[data-capability]').nth(7).locator('em')).toHaveCount(0);
   await expect(page.locator('[data-capability][aria-pressed=true]')).toHaveCount(3);
   console.log(locale,width,'controls');
   const card=page.locator(`[data-capability="${plates}"]`);await card.focus();await page.keyboard.press('Space');
   await expect(card).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-selected-list]')).toContainText(plates);
   await page.keyboard.press('Enter');await expect(card).toHaveAttribute('aria-pressed','false');
   while(await page.locator('[data-capability][aria-pressed=false]').count())await page.locator('[data-capability][aria-pressed=false]').first().click();
   await expect(page.locator('[data-selected-list] li')).toHaveCount(17);
   for(const button of await page.locator('[data-capability]').all())await button.click();
   await expect(page.locator('[data-selection-count]')).toHaveText(/^0 /);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(locale,width,'screenshot');
   await page.locator('#nube').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${locale}-${width}-capabilities.png`});
   if(width===1440||width===390) await page.screenshot({path:`${out}/${locale}-${width}-full.png`,fullPage:true});
   const ai=page.locator('[data-ai-switch]');await ai.focus();await page.keyboard.press('Space');await expect(ai).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Space');await expect(ai).toHaveAttribute('aria-pressed','false');
   if(width===390){const menu=page.locator('.brand-menu-toggle');await menu.focus();await page.keyboard.press('Enter');await expect(page.locator('#brand-mobile-nav')).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();}
   assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);results.push({locale,width,height,cards:17,errors:0,mutations:0,overflow:false});await context.close();
  }
 }
 const context=await browser.newContext();const page=await context.newPage();
 for(const path of ['/','/es/']){
  await page.goto(`http://1platform.pro:5021${path}`);await expect(page.locator('[data-capability]')).toHaveCount(11);await expect(page.locator('.capability-documentation')).toHaveCount(11);
  results.push({control:path,cards:11,individualLinks:11,discriminates:true});
 }
 for(const host of ['medipago.gt','vendefacil.1platform.pro']){
  const texts=[];for(const port of [4921,5021]){const r=await page.goto(`http://${host}:${port}/`);assert.equal(r.status(),200);texts.push(await page.locator('body').innerText());}
  assert.equal(texts[0],texts[1],host);results.push({tenant:host,bodyTextIdentical:true});
 }
 await context.close();
}finally{await browser.close();await writeFile(`${out}/real-results.json`,JSON.stringify(results,null,2));}
console.log(`${results.length} real-bank cases passed`);

});
