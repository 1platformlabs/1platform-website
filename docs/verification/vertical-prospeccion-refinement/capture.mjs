import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out=new URL('./shots/',import.meta.url).pathname;
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--host-resolver-rules=MAP 1platform.pro 127.0.0.1']});
const report=[];
try {
for(const locale of ['en','es']) for(const size of [{width:1360,height:900},{width:375,height:812}]) {
 const ctx=await browser.newContext({viewport:size,locale:locale==='en'?'en-US':'es-GT',reducedMotion:'reduce'});
 await ctx.addCookies([{name:'1p_lang',value:locale,domain:'1platform.pro',path:'/'}]);
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(`http://1platform.pro:4921/${locale==='es'?'es/soluciones/prospeccion/':'solutions/prospecting/'}`);
 await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 const key=`${locale}-${size.width}`;
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 await page.screenshot({path:`${out}/${key}-hero.png`});
 const sections=page.locator('main > section');
 for(let i=1;i<await sections.count();i++) {await sections.nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${key}-section-${i}.png`});}
 await page.screenshot({path:`${out}/${key}-full.png`,fullPage:true});
 const measurements=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,headings:[...document.querySelectorAll('main h1,main h2,main h3')].map(x=>({tag:x.tagName,text:x.textContent})),primary:[...document.querySelectorAll('main a.btn--primary')].map(x=>({text:x.textContent,href:x.href,height:x.getBoundingClientRect().height})),body:getComputedStyle(document.body).color}));
 await page.goto(`http://1platform.pro:4921/${locale==='es'?'es/soluciones/prospeccion/':'solutions/prospecting/'}`);
 await page.keyboard.press('Tab');
 const firstFocus=await page.evaluate(()=>({text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outline}));
 await page.keyboard.press('Enter');
 const skipTarget=await page.evaluate(()=>document.activeElement.id);
 const secondary=page.locator('a[href="#how-it-works"]');await secondary.click();
 await page.waitForTimeout(500);
 const anchor=await page.locator('#how-it-works').boundingBox();
 report.push({key,status:response.status(),url:page.url(),...measurements,errors,firstFocus,skipTarget,anchor,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
 await ctx.close();
}
}finally{await browser.close();writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
