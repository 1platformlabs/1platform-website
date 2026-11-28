import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({args:['--host-resolver-rules=MAP 1platform.pro 127.0.0.1']});
const results=[];
try {
for(const port of [4921,5021])for(const reducedMotion of ['reduce','no-preference']) {
 const p=await b.newPage({viewport:{width:375,height:812},reducedMotion,locale:'en-US'});
 const response=await p.goto(`http://1platform.pro:${port}/about/`);await p.waitForLoadState('networkidle');
 await p.keyboard.press('Tab');const initial=await p.evaluate(()=>document.activeElement.textContent);
 await p.keyboard.press('Enter');await p.waitForTimeout(1500);
 const after=await p.evaluate(()=>({active:document.activeElement.tagName,id:document.activeElement.id,text:document.activeElement.textContent.slice(0,80),hash:location.hash,y:scrollY}));
 await p.keyboard.press('Tab');
 const next=await p.evaluate(()=>({active:document.activeElement.tagName,cls:document.activeElement.className,text:document.activeElement.textContent}));
 const buttons=await p.locator('main .btn').evaluateAll(xs=>xs.map(x=>({text:x.textContent,h:x.getBoundingClientRect().height})));
 results.push({port,reducedMotion,status:response.status(),initial,after,next,buttons});await p.close();
}
}finally{await b.close()}
writeFileSync(new URL('./shared-results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
