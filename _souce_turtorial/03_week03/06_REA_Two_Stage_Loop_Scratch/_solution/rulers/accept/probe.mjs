import {chromium} from 'playwright';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1366,height:900},locale:'th-TH'});await p.goto('https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB');await p.waitForTimeout(2500);console.log(await p.locator('body').ariaSnapshot());await b.close();
