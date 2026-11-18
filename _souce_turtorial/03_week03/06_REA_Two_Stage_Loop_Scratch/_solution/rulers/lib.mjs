// ไลบรารีกลางของไม้บรรทัด: เปิดเบราว์เซอร์ · เส้นทางมาตรฐาน · รอรายการนิ่ง · ดึงแถวจากชื่อที่ผู้ใช้เห็น (accessible name)
// ใช้ได้ทั้งกับ Google Flights (ต้นฉบับ) และโคลนที่ตั้งชื่อตามข้อความบนจอเดียวกัน
import { chromium } from 'playwright';

export const START = 'https://www.google.com/travel/flights?hl=th&gl=TH&curr=THB';
export const isGoogle = base => !base || /google\.com/.test(base);
export const ts = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
export const log = (...a) => console.error(`[${ts()}]`, ...a);

export async function open() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function guard(page) {
  if (/\/sorry\//.test(page.url()) || await page.locator('iframe[src*="recaptcha"]').count()) throw new Error('CAPTCHA — หยุด (ห้ามข้าม)');
  const ok = page.getByRole('button', { name: /^(ยอมรับทั้งหมด|Accept all)$/ });
  if (await ok.count()) { await ok.first().click(); await page.waitForTimeout(1500); }
}

const resultsHeading = page => page.getByRole('heading', { name: /^(เที่ยวบินยอดนิยม|เที่ยวบินทั้งหมด|เที่ยวบินอื่นๆ|ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ)$/ });
const oops = page => page.getByText('อ๊ะ มีบางอย่างผิดพลาด').filter({ visible: true });

// รอจนผลค้นหาขึ้น (หัวข้อรายการ หรือแถว "ราคาเริ่มต้นที่…") · ถ้าเจอ "อ๊ะ มีบางอย่างผิดพลาด" ให้กด "โหลดซ้ำ" (เส้นทางมาตรฐานขั้น 9)
export async function recover(page, { tries = 5, wait = true } = {}) {
  const ready = resultsHeading(page).or(page.getByRole('link', { name: /^ราคาเริ่มต้นที่/ })).or(oops(page)).first();
  let n = 0;
  for (; n < tries; n++) {
    if (wait) await ready.waitFor({ timeout: 45000 });
    if (!(await oops(page).count())) return n;
    log('เจอ "อ๊ะ มีบางอย่างผิดพลาด" → โหลดซ้ำ', n + 1);
    await page.waitForTimeout(15000 * (n + 1));
    const b = page.getByRole('button', { name: 'โหลดซ้ำ' });
    if (await b.count()) await b.first().click(); else await page.reload();
    await page.waitForTimeout(3000); wait = true;
  }
  if (await oops(page).count()) throw new Error('ผลค้นหาโหลดไม่สำเร็จ (อ๊ะ มีบางอย่างผิดพลาด)');
  return n;
}

// เส้นทางมาตรฐาน (spec/EXPLORATION.md): กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · อา. 15 พ.ย. 2026 · ผู้ใหญ่ 1 · ชั้นประหยัด
// base ว่างหรือเป็น google → เริ่มที่ START · โคลน → เปิด base ถ้าหน้านั้นเป็นผลค้นหาอยู่แล้วก็ข้ามฟอร์ม
export async function standardRoute(page, base, attempts = 2) {
  for (let i = 1; ; i++) {
    try { return await standardRouteOnce(page, base); }
    catch (e) { if (i >= attempts || /CAPTCHA/.test(e.message)) throw e; log('เส้นทางมาตรฐานล้ม เริ่มใหม่:', e.message.split('\n')[0]); await page.waitForTimeout(10000); }
  }
}
async function standardRouteOnce(page, base) {
  await page.goto(isGoogle(base) ? START : base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await guard(page);
  if (!(await resultsHeading(page).first().isVisible().catch(() => false))) {
    const S = page.getByRole('search', { name: 'เที่ยวบิน' }).or(page.getByRole('search')).first();
    const tt = S.getByRole('combobox', { name: /^เปลี่ยนประเภทตั๋ว/ });
    if (!/เที่ยวเดียว/.test(await tt.getAttribute('aria-label').catch(() => '') || '')) {
      await tt.click();
      await page.getByRole('listbox', { name: 'เลือกประเภทตั๋ว' }).getByRole('option', { name: 'เที่ยวเดียว', exact: true }).click();
    }
    await S.getByRole('combobox', { name: /^ต้นทาง/ }).first().click();
    let dlg = page.getByRole('dialog').filter({ visible: true }).first();
    await dlg.getByRole('combobox').first().fill('กรุงเทพ');
    await dlg.getByRole('option', { name: 'กรุงเทพมหานคร', exact: true }).first().click();
    await S.getByRole('combobox', { name: /^ปลายทาง/ }).first().click();
    dlg = page.getByRole('dialog').filter({ visible: true }).first();
    await dlg.getByRole('combobox').first().fill('โตเกียว');
    await dlg.getByRole('option', { name: 'โตเกียว ญี่ปุ่น', exact: true }).first().click();
    await page.getByRole('dialog').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const day15 = page.getByRole('button', { name: /^วันอาทิตย์ที่ 15 พฤศจิกายน ค\.ศ\. 2026/ });
    dlg = page.getByRole('dialog').filter({ visible: true }).filter({ has: day15 }).first();
    for (let i = 0; i < 3 && !(await dlg.isVisible()); i++) {   // กล่องปลายทางยังปิดไม่เสร็จ → คลิก "ขาไป" ซ้ำ
      await S.getByRole('textbox', { name: 'ขาไป' }).click();
      await dlg.waitFor({ timeout: 5000 }).catch(() => {});
    }
    const depart = S.getByRole('textbox', { name: 'ขาไป' });
    for (let i = 0; i < 3; i++) {   // บางครั้งกดแล้วกล่องปฏิทินไม่ปิด → กดซ้ำจนช่อง "ขาไป" เป็น 15 พ.ย. และกล่องปิด
      const box = dlg.getByRole('textbox', { name: 'ขาไป' });
      if (!/15 พ\.ย\./.test(await box.inputValue({ timeout: 3000 }).catch(() => ''))) {
        await dlg.getByRole('button', { name: /^วันอาทิตย์ที่ 15 พฤศจิกายน ค\.ศ\. 2026/ }).click({ timeout: 15000 });
        await page.waitForTimeout(800);
      }
      await dlg.getByRole('button', { name: /^เสร็จ/ }).click();
      await dlg.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      if (!(await dlg.isVisible()) && /15 พ\.ย\./.test(await depart.inputValue())) break;
      log('ปฏิทินยังไม่ปิด ลองใหม่', i + 1);
    }
    if (await dlg.isVisible()) throw new Error('ปิดปฏิทินไม่ได้');
    await S.getByRole('button', { name: 'ค้นหา', exact: true }).click();
    await page.waitForTimeout(1500);
    await guard(page);
  }
  await recover(page);
  await waitStable(page);
  return page.url();
}

// ---------- แถวเที่ยวบิน: อ่านจาก ariaSnapshot (เห็นเฉพาะที่ผู้ใช้เห็น ซ่อนแล้วไม่นับ) ----------
export const ROW_RE = /link "(ราคาเริ่มต้นที่ [^"]*)"/g;
export function parseRow(name) {
  const g = re => (name.match(re) || [])[1] ?? null;
  const stops = /เที่ยวบินตรง/.test(name) ? 0 : +(g(/แวะพัก (\d+) ครั้ง/) ?? NaN);
  return {
    price: +g(/^ราคาเริ่มต้นที่ (\d+)/),
    stops,
    airline: (g(/(?:ครั้ง|ตรง)กับ (.+?) ออกเดินทางจาก /) || '').replace(/ ดำเนินการโดย .*$/, '').replace(/\.$/, '').trim(),
    dep: g(/ออกเดินทางจาก .+? เวลา (\d{1,2}:\d{2})/),
    arr: g(/เดินทางถึง .+? เวลา (\d{1,2}:\d{2})/),
    from: g(/ออกเดินทางจาก (.+?) เวลา/),
  };
}
export async function rowNames(page) {
  const y = await page.locator('body').ariaSnapshot();
  return [...y.matchAll(ROW_RE)].map(m => m[1]);
}
export async function rows(page) { return (await rowNames(page)).map(parseRow); }
export async function resultCount(page) {
  const t = await page.getByText(/^มีผลลัพธ์ [\d,]+ รายการ$/).filter({ visible: true }).first().innerText({ timeout: 3000 }).catch(() => null);
  return t ? +t.replace(/\D/g, '') : null;
}

// รอจนรายการนิ่ง: ชื่อแถวทั้งหมดไม่เปลี่ยน 3 ครั้งติด (ห่างกัน 1 วินาที)
export async function waitStable(page, { timeout = 45000, allowEmpty = false } = {}) {
  const t0 = Date.now(); let prev = null, same = 0;
  while (Date.now() - t0 < timeout) {
    await recover(page, { wait: false });
    const sig = (await rowNames(page)).join('\n');
    const empty = !sig && !(allowEmpty && await page.getByRole('heading', { name: 'ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ' }).count());
    if (sig === prev && !empty) { if (++same >= 3) return; } else same = 0;
    prev = sig; await page.waitForTimeout(1000);
  }
  log('waitStable: หมดเวลา (ใช้สถานะล่าสุด)');
}

// กด "ดูเที่ยวบินเพิ่มเติม" จนกว่าปุ่มจะหาย · หลังกดรอจนจำนวนแถวเพิ่ม (หรือปุ่มหาย) แล้วรอให้นิ่ง
export async function showAll(page) {
  let n = 0;
  for (; n < 5; n++) {
    const b = page.getByRole('button', { name: 'ดูเที่ยวบินเพิ่มเติม' }).filter({ visible: true });
    if (!(await b.count())) break;
    const before = (await rowNames(page)).length;
    await b.first().scrollIntoViewIfNeeded(); await b.first().click();
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await page.waitForTimeout(1500);
      await recover(page, { wait: false });
      if ((await rowNames(page)).length > before) break;
    }
    await waitStable(page);
  }
  return n;
}

// ---------- ตัวกรอง (ชิปบนจอ) ----------
export const dialogOpen = async page => (await page.getByRole('dialog').filter({ visible: true }).count()) > 0;
export async function openChip(page, name) {
  await page.getByRole('button', { name: new RegExp(`(^|, )${name}, `) }).filter({ visible: true }).first().click();
  await page.waitForTimeout(1200);
  return page.getByRole('dialog').filter({ visible: true }).last();
}
export async function closeChip(page) {
  if (await dialogOpen(page)) await page.keyboard.press('Escape');
  await page.waitForTimeout(2500);
  await recover(page); await waitStable(page, { allowEmpty: true });
}
// เลื่อน slider ด้วยคีย์บอร์ด (แบบผู้ใช้) จนค่า aria-valuenow ผ่านเงื่อนไข · ถ้ากล่องปิดเองระหว่างเลื่อนจะเปิดใหม่
export async function slideTo(page, chip, slider, key, done) {
  let v = null;
  for (let i = 0; i < 400; i++) {
    if (!(await dialogOpen(page))) await openChip(page, chip);
    const s = page.getByRole('dialog').filter({ visible: true }).last().getByRole('slider', { name: slider, exact: true });
    v = await s.getAttribute('aria-valuenow').catch(() => null);
    if (v !== null && done(+v)) break;
    await s.focus(); await page.keyboard.press(key); await page.waitForTimeout(60);
  }
  await page.waitForTimeout(2000);
  return v === null ? null : +v;
}
