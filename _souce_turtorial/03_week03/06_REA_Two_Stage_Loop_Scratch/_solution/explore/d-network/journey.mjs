import { chromium } from 'playwright';
import fs from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH='/ms-playwright';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1366,height:900},locale:'th-TH',timezoneId:'Asia/Bangkok',recordHar:{path:'har/flights.har',content:'embed',mode:'full'}});
await context.tracing.start({screenshots:true,snapshots:true,sources:true});
const page=await context.newPage();
const events=[];
async function capture(name){await page.screenshot({path:`shots/${name}.png`,fullPage:true});await fs.writeFile(`snapshots/${name}.yml`,await page.locator('body').ariaSnapshot());await fs.writeFile(`data/${name}-text.txt`,await page.locator('body').innerText());await fs.writeFile(`data/${name}-cards.json`,JSON.stringify(await page.locator('li').evaluateAll(es=>es.filter(e=>e.querySelector('[role="link"][aria-label*="เลือกเที่ยวบิน"]')).map(e=>({text:e.innerText,aria:e.querySelector('[role="link"]')?.getAttribute('aria-label'),html:e.outerHTML}))),null,2));events.push({state:name,time:new Date().toISOString(),url:page.url()});}
async function guard(){const t=await page.locator('body').innerText();if(/unusual traffic|ระบบของเราตรวจพบ|I'm not a robot|ยืนยันว่าคุณไม่ใช่หุ่นยนต์/i.test(t)||page.url().includes('/sorry/'))throw new Error('CAPTCHA detected: stopped');}
try {
await page.goto('https://www.google.com/travel/flights?q=Flights%20from%20Bangkok%20to%20Tokyo%20on%202026-11-15%20one%20way&hl=th&gl=TH&curr=THB',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(12000);await capture('01-results');await guard();
if(await page.getByRole('button',{name:'โหลดซ้ำ',exact:true}).count()) {
 await page.getByRole('button',{name:'โหลดซ้ำ',exact:true}).click();await page.waitForTimeout(12000);await capture('02-retry');await guard();
}
const more=page.getByRole('button',{name:/ดูเที่ยวบินเพิ่มเติม/});
if(await more.count()){await more.click();await page.waitForTimeout(8000);await capture('03-more');await guard();}
else events.push({step:'more',status:'blocked',reason:'ไม่มีปุ่มดูเที่ยวบินเพิ่มเติมในผลลัพธ์'});
for(const [name,label] of [['stops','จำนวนครั้งที่แวะพัก'],['price','ราคา'],['airlines','สายการบิน'],['layover-airports','สนามบินสำหรับต่อเครื่อง']]) {
 const b=page.getByRole('button',{name:new RegExp('^'+label+',')});
 if(await b.count()) {await b.click();await page.waitForTimeout(500);await capture('filter-'+name);
 if(name==='stops') {const direct=page.getByRole('radio',{name:/บินตรง/});if(await direct.count()){await direct.first().click();await page.waitForTimeout(4000);await capture('04-nonstop');} }
 const close=page.getByRole('button',{name:'ปิดกล่องโต้ตอบ',exact:true});if(await close.count())await close.click();await page.waitForTimeout(500);}
}
await capture('05-nonstop-results');
const details=page.getByRole('button',{name:/^รายละเอียดเที่ยวบิน ออกเดินทาง/});if(await details.count()){await details.first().click();await page.waitForTimeout(1000);await capture('06-details');const select=page.getByRole('button',{name:/^เลือกเที่ยวบิน|^เลือก$/});console.log('SELECTS',await select.allTextContents());if(await select.count()){await select.first().click();await page.waitForTimeout(8000);await capture('07-booking');await guard();}}
await fs.writeFile('data/final-body.txt',await page.locator('body').innerText());
const finalText=await page.locator('body').innerText();
if(/อ๊ะ มีบางอย่างผิดพลาด/.test(finalText))events.push({step:'expand-and-select',status:'blocked',reason:'GetShoppingResults ล้มเหลว ไม่มีใบเที่ยวบินให้ขยายหรือเลือก'});
console.log(finalText.slice(0,20000));
} catch(e){events.push({error:String(e),time:new Date().toISOString()});console.error(e.message);} finally {await fs.writeFile('data/journey-log.json',JSON.stringify(events,null,2));await context.tracing.stop({path:'trace/journey.zip'});await context.close();await browser.close();}
