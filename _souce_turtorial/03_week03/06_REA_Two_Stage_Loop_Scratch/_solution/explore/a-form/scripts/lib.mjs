import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
export const ROOT = '/workspace/arena6/explore/a-form';
export const START = 'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB';
export const ts = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
export async function open() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok',
  });
  const page = await context.newPage();
  return { browser, context, page };
}
export async function home(page) {
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const url = page.url();
  if (/sorry|captcha/i.test(url) || await page.locator('text=/unusual traffic|ผิดปกติ/i').count()) {
    throw new Error('CAPTCHA/block detected: ' + url);
  }
  return url;
}
export async function shot(page, name, opts = {}) {
  const p = path.join(ROOT, 'shots', name + '.png');
  await page.screenshot({ path: p, ...opts });
  console.log('[shot]', name, ts());
}
export async function snap(page, name, loc) {
  const y = await (loc || page.locator('body')).ariaSnapshot();
  fs.writeFileSync(path.join(ROOT, 'snapshots', name + '.yml'), `# ${name} @ ${ts()} (Asia/Bangkok)\n# url: ${page.url()}\n` + y);
  console.log('[snap]', name);
  return y;
}
export function log(...a) { console.log(`[${ts()}]`, ...a); }
export async function setPlace(page, field, query, optionName) {
  const S = page.getByRole('search');
  await S.getByRole('combobox', { name: new RegExp('^' + field) }).first().click();
  await page.waitForTimeout(700);
  const D = page.getByRole('dialog').filter({ visible: true }).first();
  const inp = D.getByRole('combobox').first();
  await inp.fill(''); await inp.pressSequentially(query, { delay: 50 });
  await page.waitForTimeout(1500);
  await D.getByRole('option', { name: optionName }).first().click();
  await page.waitForTimeout(800);
}
export async function setTripType(page, name) {
  await page.getByRole('combobox', { name: /เปลี่ยนประเภทตั๋ว/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name, exact: true }).click();
  await page.waitForTimeout(600);
}
