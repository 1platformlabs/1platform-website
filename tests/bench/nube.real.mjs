/** Real local bank: no request interception, mocks or remote API fallback. */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.NUBE_EVIDENCE;
assert(out,'NUBE_EVIDENCE required'); mkdirSync(out,{recursive:true});
const mode=process.env.NUBE_PHASE ?? 'available';
// Published content has a 60s stale-while-revalidate cache. Wait for the
// expected version without restarting services or clearing browser storage.
if(mode==='available') for(const port of [4921,5021]) for(const [locale,status] of [['es','DISPONIBLE'],['en','AVAILABLE']]) {
 const started=Date.now();let ready=false;
 while(Date.now()-started<75000){
  const {statusCode,html}=await new Promise((resolve,reject)=>{
   http.get(`http://127.0.0.1:${port}/${locale==='es'?'es/':''}`,{headers:{Host:'1platform.pro'}},r=>{
    let html='';r.on('data',c=>html+=c);r.on('end',()=>resolve({statusCode:r.statusCode,html}));
   }).on('error',reject);
  });
  assert.equal(statusCode,200);
  if(html.includes(`data-capability="${locale==='es'?'Nube':'Cloud'}" data-capability-status="${status}"`)){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert(ready,`Published ${locale} content not visible on port ${port} within cache window`);
}
const browser=await chromium.launch({args:['--host-resolver-rules=MAP 1platform.pro 127.0.0.1,MAP medipago.gt 127.0.0.1,MAP vendefacil.1platform.pro 127.0.0.1']});
const results=[];
try {
 for(const [width,height] of (mode==='legacy'?[[1440,900]]:[[1440,900],[360,800],[390,844],[430,932],[844,390]])) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const locale of ['es','en']) {
   const home=`http://1platform.pro:4921/${locale==='es'?'es/':''}`;
   await context.addCookies([{name:'1p_lang',value:locale,url:'http://1platform.pro:4921'}]);
   const response=await page.goto(home);assert.equal(response.status(),200);
   const card=page.locator('button.capability').filter({has:page.locator('strong',{hasText:locale==='es'?'Nube':'Cloud'})});
   assert.equal(await card.count(),1);
   const status=mode==='legacy'?(locale==='es'?'EN PREPARACIÓN':'IN DEVELOPMENT'):(locale==='es'?'DISPONIBLE':'AVAILABLE');
   assert.equal(await card.locator('em').innerText(),status);
   await card.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
   const link=card.locator('..').locator('a.capability-documentation');
   assert.equal(await link.count(),1);assert.equal(await link.getAttribute('href'),'http://127.0.0.1:3601/docs/saas/1platform-api/nube/');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`${out}/${mode}-home-${locale}-${width}.png`});
   if(mode==='available'){
    await card.click();assert.equal(await card.getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('.integration-preview').innerText(),new RegExp(status));
    await link.focus();assert.equal(await link.evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Enter');await page.waitForURL('**/docs/saas/1platform-api/nube/');
    await page.locator('main h1').waitFor();assert.equal(await page.locator('main h1').innerText(),'Nube');
    assert.match(await page.locator('main').innerText(),/servicio de Nube está disponible/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.evaluate(()=>document.fonts.ready);
    if(locale==='es') await page.screenshot({path:`${out}/guide-${width}.png`,fullPage:true});
   }
   results.push({locale,width,mode,status,errors:[...errors]});assert.deepEqual(errors,[]);
  }
  await context.close();
 }
 if(mode==='available'){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}); const page=await context.newPage();
  await context.addCookies([{name:'1p_lang',value:'es',url:'http://1platform.pro:5021'}]);
  await page.goto('http://1platform.pro:5021/es/');
  const card=page.locator('button.capability').filter({has:page.locator('strong',{hasText:'Nube'})});
  assert.equal(await card.locator('em').innerText(),'DISPONIBLE');
  assert.equal(await card.locator('..').locator('a.capability-documentation').count(),0,'control must lack Nube link');
  await card.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/control-home.png`});
  const r=await page.goto('http://127.0.0.1:3701/docs/saas/1platform-api/nube/');
  assert.equal(r.status(),404,'control must lack guide');
  results.push({control:'same DB, main website lacks cloud link; main docs 404',passed:true});
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:900});
   await page.goto('http://127.0.0.1:3601/docs/saas/1platform-api/getting-started');
   const product=page.locator('main a[href="/docs/saas/1platform-api/nube/"]');
   assert.equal(await product.count(),1);await product.scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/docs-home-${width}.png`});
   await product.click();await page.locator('main h1').waitFor();
   assert.equal(await page.locator('main h1').innerText(),'Nube');
   results.push({width,entry:'product card',passed:true});
  }
  // Unchanged tenants retain the same body, including their own contact/destinations.
  for(const host of ['medipago.gt','vendefacil.1platform.pro']) {
   await page.goto(`http://${host}:4921/`);const body=await page.locator('body').innerText();
   await page.goto(`http://${host}:5021/`);assert.equal(await page.locator('body').innerText(),body);
   results.push({host,unchanged:true});
  }
  await context.close();
 }
 writeFileSync(`${out}/${mode}-results.json`,JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({phase:mode,cases:results.length,passed:true}));
} finally {await browser.close();}
