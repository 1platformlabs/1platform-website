import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const origin = process.env.INTERIOR_IMPLEMENTATION_ORIGIN ?? 'http://localhost:4468';
const prototype = 'http://127.0.0.1:4462';
const routes = [
 {name:'blog', en:['/blog-en.html','/blog/'],es:['/blog.html','/es/blog/'],selectors:['.blog-feature','.blog-feature-content h2','.blog-feature-content p:not(.eyebrow)','.archive-layout','.archive-heading','.archive-item','.archive-item h3','.archive-summary']},
 {name:'store',en:['/store-en.html','/solutions/online-store/'],es:['/','/es/soluciones/tienda-online/'],selectors:['.section-heading','.feature-card','.feature-card h3','.story-section','.included-list','.steps','.closing']},
 {name:'article',en:['/article-electronic-invoicing-online-business-en.html','/blog/electronic-invoicing-online-business/'],es:['/article-electronic-invoicing-online-business-es.html','/es/blog/facturacion-electronica-para-negocios-online/'],selectors:['.article-layout','.article-copy','.article-copy h2','.article-copy p','.related-grid','.related-card']},
];
const viewports=[{width:1440,height:900},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:844,height:390}];
const browser=await chromium.launch();
const report=[];
for(const locale of ['es','en']) for(const viewport of viewports) for(const route of routes){
 const context=await browser.newContext({locale:locale==='es'?'es-GT':'en-US',viewport,reducedMotion:'reduce'});
 const pages=await Promise.all([context.newPage(),context.newPage()]);
 const selectors=['.hero','.hero h1','.hero-lede',...route.selectors];
 const data=[];
 for(let i=0;i<2;i++){
  const page=pages[i]; await page.goto((i===0?prototype:origin)+route[locale][i]); await page.evaluate(()=>document.fonts.ready);
  for (const img of await page.locator('img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(element => element.decode()); }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  data.push(await page.evaluate((selectors)=>Object.fromEntries(selectors.map(selector=>[selector,[...document.querySelectorAll(selector)].map(el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   return {x:rect.x,y:rect.y+scrollY,w:rect.width,h:rect.height,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,color:style.color,backgroundColor:style.backgroundColor};
  })])),selectors));
  await page.screenshot({path:`artifacts/interior-fidelity/${route.name}${locale==='en'?'-en':''}-${viewport.width}-${i===0?'prototype':'implementation'}.png`,fullPage:true});
 }
 const differences={};
 for(const selector of selectors){
  const [reference,implementation]=data.map(d=>d[selector]);
  differences[selector]=reference.map((r,i)=>{
   const a=implementation[i];if(!a)return {missing:true};
   const diff=Object.fromEntries(['x','y','w','h'].map(k=>['d'+k,Math.round((a[k]-r[k])*100)/100]));
   const styles=Object.keys(r).filter(k=>!['x','y','w','h'].includes(k)&&r[k]!==a[k]).map(k=>({property:k,prototype:r[k],implementation:a[k]}));
   return {...diff,styles};
  });
  if(reference.length!==implementation.length) differences[selector].push({count:{prototype:reference.length,implementation:implementation.length}});
 }
 report.push({name:route.name,locale,viewport,urls:[prototype+route[locale][0],origin+route[locale][1]],differences});
 await context.close();
}
await browser.close();
await writeFile('artifacts/interior-fidelity/measurements.json',JSON.stringify(report,null,2)+'\n');
const failures=report.flatMap(r=>Object.entries(r.differences).flatMap(([selector,items])=>items.flatMap((x,index)=>x.missing||x.count||['dx','dy','dw','dh'].some(k=>Math.abs(x[k])>2)||x.styles?.length?[{name:r.name,locale:r.locale,viewport:r.viewport,selector,index,...x}]:[])));
console.log(JSON.stringify({cases:report.length,comparisons:report.reduce((n,r)=>n+Object.values(r.differences).reduce((s,x)=>s+x.length,0),0),failures},null,2));
