// ของที่ทุกตัววัดใช้ร่วมกัน: เปิดเบราว์เซอร์แบบเดียวกับ kit/src (1366×900 · th-TH · Asia/Bangkok)
// และไปหน้าผลค้นหาผ่านฟอร์มที่มองเห็น ด้วยขั้นตอนเดียวกับ visual-ch4.cjs: setup(page,'results') ของชุด acceptance
// → เลือก "→ เที่ยวเดียว" → กด "ค้นหาเที่ยวบิน" → รอแท็บ "ดีที่สุด"
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const { setup } = require('../src/accept/suite.cjs');
export const VIEWPORT = { width: 1366, height: 900 };

export async function newPage(browser, base, extra = {}) {
  const context = await browser.newContext({ baseURL: base, viewport: VIEWPORT, locale: 'th-TH', timezoneId: 'Asia/Bangkok', ...extra });
  // กันไม่ให้ออกนอกแอป (เหมือน accept/run.cjs)
  await context.route('**/*', (route) => {
    const req = route.request();
    if (req.isNavigationRequest() && new URL(req.url()).origin !== new URL(base).origin) return route.abort();
    return route.continue();
  });
  return { context, page: await context.newPage() };
}
export const launch = () => chromium.launch();

export async function openResults(page) {
  await setup(page, 'results');
  const trip = page.getByRole('combobox', { name: 'เปลี่ยนประเภทตั๋ว' });
  if (await trip.count()) {
    await trip.selectOption({ label: '→ เที่ยวเดียว' });
    await page.getByRole('button', { name: /ค้นหาเที่ยวบิน/ }).click();
  }
  await page.getByRole('tab', { name: /ดีที่สุด/ }).waitFor({ timeout: 15_000 });
}

export async function stable(page, loc) {
  let last = -1, same = 0;
  for (let i = 0; i < 80 && same < 4; i++) { const n = await loc.count(); same = n === last && n > 0 ? same + 1 : 0; last = n; await page.waitForTimeout(250); }
  return last;
}
export const ROW_LINKS = (page) => page.getByRole('link', { name: /^เที่ยวบิน .*ราคา/ });
