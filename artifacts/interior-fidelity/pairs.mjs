import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir='artifacts/interior-fidelity';
const report=JSON.parse(await readFile(`${dir}/measurements.json`,'utf8'));
const details=report.map(r=>{
 const measures=Object.entries(r.differences).flatMap(([selector,items])=>items.map((entry,index)=>({selector,index,...entry})));
 return {route:r.name,locale:r.locale,viewport:r.viewport,comparisonCount:measures.length,maxDelta:Math.max(...measures.flatMap(e=>['dx','dy','dw','dh'].map(k=>Math.abs(e[k]??0)))),geometryDifferences:measures.filter(e=>e.missing||e.count||['dx','dy','dw','dh'].some(k=>Math.abs(e[k])>2)),styleDifferences:measures.flatMap(e=>(e.styles??[]).filter(s=>s.property!=='fontFamily').map(s=>({selector:e.selector,index:e.index,...s})))};
});
const summary={cases:details.length,comparisons:details.reduce((n,x)=>n+x.comparisonCount,0),fontFamilyNote:'Both surfaces load Manrope. Declared fallback stacks differ only by system-ui.',maxDelta:Math.max(...details.map(x=>x.maxDelta)),failures:details.filter(x=>x.geometryDifferences.length||x.styleDifferences.length),details};
await writeFile(`${dir}/final-summary.json`,JSON.stringify(summary,null,2)+'\n');
const browser=await chromium.launch();
const cards=[];
for(const entry of details){
 const name=`${entry.route}${entry.locale==='en'?'-en':''}-${entry.viewport.width}`;
 const label=`${entry.route} · ${entry.locale.toUpperCase()} · ${entry.viewport.width}×${entry.viewport.height}`;
 const maxWidth=Math.min(entry.viewport.width,800)*2+40;
 const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>${label}</title><style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;background:#e9eef4;color:#172640}.title{padding:16px 20px;background:white;border-bottom:1px solid #ccd6e2;font-size:16px}h1{font-size:20px;margin:0 0 5px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;max-width:${maxWidth}px;margin:auto}.pair figure{margin:0;min-width:0}.pair figcaption{font-size:14px;font-weight:700;padding:9px;background:white}.pair img{display:block;width:100%;height:auto}.note{font-size:13px;margin:4px 0 0}</style><header class="title"><h1>${label}</h1><a href="index.html">← Todas las comparaciones</a> · Delta máximo de interiores ${entry.maxDelta}px<p class="note">Fuentes independientes. Navegación/pie siguen la referencia de infraestructura más reciente. Panel sustituye dashboard. Tipografía principal y colores comparables: Manrope y paleta vigente</p></header><div class="pair"><figure><figcaption>Prototipo aprobado</figcaption><a href="${name}-prototype.png"><img src="${name}-prototype.png"></a></figure><figure><figcaption>Implementación real</figcaption><a href="${name}-implementation.png"><img src="${name}-implementation.png"></a></figure></div></html>`;
 await writeFile(`${dir}/pair-${name}.html`,html);
 const page=await browser.newPage({viewport:{width:maxWidth,height:900},deviceScaleFactor:1});
 await page.goto(pathToFileURL(resolve(`${dir}/pair-${name}.html`)).href);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 await page.screenshot({path:`${dir}/pair-${name}.png`,fullPage:true});
 await page.close();
 cards.push(`<a class="card" href="pair-${name}.html"><strong>${label}</strong><span>Δ ${entry.maxDelta}px · ${entry.comparisonCount} elementos</span><div class="thumb"><img loading="lazy" src="${name}-prototype.png"><img loading="lazy" src="${name}-implementation.png"></div></a>`);
}
await browser.close();
await writeFile(`${dir}/index.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Interiores: 30 comparaciones</title><style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:28px;background:#f2f5f7;color:#172640}h1{font-size:26px;margin:0 0 10px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.card{display:block;text-decoration:none;color:inherit;background:white;border:1px solid #cbd7e7;border-radius:10px;padding:14px}.card span{display:block;margin:7px 0;font-size:13px}.thumb{display:grid;grid-template-columns:1fr 1fr;gap:7px;height:245px;overflow:hidden}.thumb img{width:100%;height:auto}p{max-width:900px;line-height:1.6}</style><h1>Interiores · ${summary.cases} pares · ${summary.comparisons} comparaciones</h1><p>Build local del 30 de septiembre, 23:05:47. Originales sin modificar, con fuentes e imágenes cargadas. Cada tarjeta abre el par completo. Los cuerpos interiores se comparan a ±2px; navegación y pie compartidos siguen las decisiones más recientes. <a href="final-summary.json">Ver deltas JSON</a></p><div class="grid">${cards.join('')}</div></html>`);
console.log(JSON.stringify({cases:summary.cases,comparisons:summary.comparisons,maxDelta:summary.maxDelta,failedCases:summary.failures.map(x=>({route:x.route,locale:x.locale,viewport:x.viewport,maxDelta:x.maxDelta}))},null,2));
