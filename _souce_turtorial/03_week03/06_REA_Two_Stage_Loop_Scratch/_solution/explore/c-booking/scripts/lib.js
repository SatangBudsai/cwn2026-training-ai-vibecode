const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'https://www.google.com/travel/flights?q=Flights%20from%20Bangkok%20to%20Tokyo%20on%202026-11-15%20one%20way&hl=th&gl=TH&curr=THB';
const ts = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const log = (...a) => { const l = `[${ts()}] ` + a.join(' '); console.log(l); fs.appendFileSync(path.join(ROOT, 'out/log.txt'), l + '\n'); };
async function open() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  return { browser, context, page };
}
async function shot(page, name, full = false) { await page.screenshot({ path: path.join(ROOT, 'shots', name + '.png'), fullPage: full }); log('shot', name, page.url()); }
async function snap(page, name, loc) { const y = await (loc || page.locator('body')).ariaSnapshot(); fs.writeFileSync(path.join(ROOT, 'snapshots', name + '.yml'), `# captured ${ts()} url=${page.url()}\n` + y); log('snap', name); return y; }
async function captcha(page) { const u = page.url(); const t = await page.locator('body').innerText().catch(() => ''); if (/sorry\/index|recaptcha/i.test(u) || /unusual traffic|ผิดปกติ/i.test(t)) { log('CAPTCHA DETECTED', u); return true; } return false; }
module.exports = { open, shot, snap, log, ts, URL, ROOT, captcha };
