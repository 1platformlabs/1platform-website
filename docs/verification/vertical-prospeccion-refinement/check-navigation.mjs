import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({args:['--host-resolver-rules=MAP 1platform.pro 127.0.0.1']});const rows=[];
try{for(const locale of ['en','es'])for(const width of [1360,375]){
const page=await browser.newPage({viewport:{width,height:width===375?812:900},reducedMotion:'reduce',locale:locale==='en'?'en-US':'es-GT'});await page.context().addCookies([{name:'1p_lang',value:locale,domain:'1platform.pro',path:'/'}]);
await page.goto(`http://1platform.pro:4921/${locale==='es'?'es/soluciones/prospeccion/':'solutions/prospecting/'}`);await page.waitForLoadState('networkidle');
await page.locator('.features .card-item').last().scrollIntoViewIfNeeded();await page.screenshot({path:new URL(`./shots/${locale}-${width}-last-card.png`,import.meta.url).pathname});
await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(250);await page.screenshot({path:new URL(`./shots/${locale}-${width}-footer.png`,import.meta.url).pathname});
let menu=null;if(width===375){const toggle=page.locator('.brand-menu-toggle');await toggle.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');const first=await page.locator('#brand-mobile-nav a').first().evaluate(x=>x===document.activeElement);await page.keyboard.press('Shift+Tab');const back=await toggle.evaluate(x=>x===document.activeElement);await page.keyboard.press('Escape');menu={first,back,closed:await page.locator('#brand-mobile-nav').isHidden(),returned:await toggle.evaluate(x=>x===document.activeElement)};}
const alternative=page.locator('.brand-languages a');const target=await alternative.getAttribute('href');await alternative.click();await page.waitForURL(`**${target}`);await page.waitForLoadState('networkidle');const actual=await page.locator('html').getAttribute('lang');rows.push({locale,width,menu,target,actual,url:page.url()});await page.close();
}}finally{await browser.close()};writeFileSync(new URL('./navigation-results.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
