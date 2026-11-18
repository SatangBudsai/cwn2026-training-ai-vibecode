import { test, expect, type Page } from '@playwright/test';
import {
  step, human, mark, installBanner, holdResult, control, choice, pick, optionTexts,
  rows, waitRows, rowTexts, resultCount, gotoResults, defaultView, openFilter, setSlider, onlyButtonFor,
  closePopup, priceOf, minutesOf, departOf,
} from './helpers';

// 1 test ต่อ 1 ฟีเจอร์ ตามส่วน B ของ EXPLORATION.md (Google Flights)
// ทุกขั้นหาด้วย role / ชื่อที่ผู้ใช้อ่าน / ข้อความ เท่านั้น — ใช้ชุดเดียวกันกับ v1 และ v2

const note = (text: string) => test.info().annotations.push({ type: 'note', description: text });

test.beforeEach(async ({ page }, info) => {
  step('');
  await installBanner(page, info);
});
test.afterEach(async ({ page }, info) => {
  await holdResult(page, info);
});

/** ข้อความที่แสดงบนปุ่มหรือช่อง */
const labelOf = async (page: Page, name: RegExp) => {
  const c = control(page, name);
  return ((await c.getAttribute('aria-label')) ?? '') + ' ' + (await c.innerText().catch(() => ''));
};

test('B01 ประเภทตั๋ว', async ({ page }) => {
  await gotoResults(page);
  const TYPE = /ประเภทตั๋ว|ประเภทการเดินทาง/;
  step('หา dropdown ประเภทตั๋ว');
  const opts = (await optionTexts(page, TYPE)).join('|');
  for (const o of ['ไป-กลับ', 'เที่ยวเดียว', 'หลายเมือง']) expect(opts).toContain(o);

  await pick(page, TYPE, /ไป-กลับ/);
  step('ไป-กลับ ต้องมีช่อง "ขากลับ"');
  const ret = control(page, /ขากลับ/);
  await expect(ret).toBeVisible();
  await mark(ret, 'ขากลับ');

  await pick(page, TYPE, /เที่ยวเดียว/);
  step('เที่ยวเดียว ช่อง "ขากลับ" ต้องหายไป');
  await expect(control(page, /ขากลับ/)).toBeHidden();

  await pick(page, TYPE, /หลายเมือง/);
  step('หลายเมือง ต้องมีปุ่ม "เพิ่มเที่ยวบิน"');
  const add = page.getByRole('button', { name: /เพิ่มเที่ยวบิน/ });
  await expect(add).toBeVisible();
  await mark(add, 'เพิ่มเที่ยวบิน');
});

test('B02 ผู้โดยสาร', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่มผู้โดยสาร');
  const pax = page.getByRole('button', { name: /ผู้โดยสาร/ }).first();
  await expect(pax).toBeVisible();
  await mark(pax);
  await pax.click();
  step('ผู้ใหญ่ 1 คน: ปุ่ม − ผู้ใหญ่ต้องกดไม่ได้');
  const minusAdult = page.getByRole('button', { name: /(นำ|ลด).*ผู้ใหญ่/ }).first();
  await expect(minusAdult).toBeDisabled();
  for (const t of [/เด็ก/, /ทารก.*ที่นั่ง/, /ทารก.*ตัก/]) await expect(page.getByText(t).first()).toBeVisible();
  step('เพิ่มเด็ก 1 คนแล้วกดเสร็จ');
  const addChild = page.getByRole('button', { name: /เพิ่ม.*เด็ก/ }).first();
  await mark(addChild, '+ เด็ก');
  await addChild.click();
  await expect(page.getByRole('button', { name: /^ยกเลิก$/ })).toBeVisible();
  await page.getByRole('button', { name: /^เสร็จ$/ }).click();
  step('ปุ่มผู้โดยสารต้องเป็น 2 คน');
  const after = page.getByRole('button', { name: /ผู้โดยสาร.*2/ }).first();
  await expect(after).toBeVisible();
  await mark(after, 'ผู้โดยสาร 2');
});

test('B03 ชั้นโดยสาร', async ({ page }) => {
  await gotoResults(page);
  const CABIN = /ชั้นโดยสาร|ชั้นที่นั่ง/;
  step('หา dropdown ชั้นโดยสาร');
  const opts = (await optionTexts(page, CABIN)).join('|');
  for (const o of ['ชั้นประหยัด', 'ประหยัดพรีเมียม', 'ชั้นธุรกิจ', 'ชั้นหนึ่ง']) expect(opts).toContain(o);
  await pick(page, CABIN, /ชั้นธุรกิจ/);
  const c = control(page, CABIN);
  await expect(c).toContainText(/ชั้นธุรกิจ/);
  await mark(c, 'ชั้นธุรกิจ');
});

test('B04 ช่องต้นทาง/ปลายทาง + รายการแนะนำ', async ({ page }) => {
  await gotoResults(page);
  step('ช่องต้นทางเติมกรุงเทพไว้แล้ว');
  const from = control(page, /^ต้นทาง|จากที่ไหน/);
  await expect(from).toContainText(/กรุงเทพ/);
  step('กดช่องปลายทางแล้วพิมพ์ "โตเกียว"');
  const to = control(page, /^ปลายทาง|ไปที่ไหน/);
  await expect(to).toBeVisible();
  await mark(to);
  await to.click();
  const box = page.getByRole('textbox', { name: /ปลายทาง|เมืองหรือสนามบิน|ไปที่ไหน/ })
    .or(page.getByRole('combobox', { name: /ปลายทาง|เมืองหรือสนามบิน|ไปที่ไหน/ })).first();
  await expect(box).toBeEditable();
  await box.fill('โตเกียว');
  step('รายการแนะนำต้องมี NRT และ HND');
  const nrt = page.getByRole('option', { name: /NRT/ }).first();
  await expect(nrt).toBeVisible();
  await expect(page.getByRole('option', { name: /HND/ }).first()).toBeVisible();
  await mark(page.getByRole('listbox').first(), 'รายการแนะนำ');
  step('เลือก "โตเกียว"');
  await page.getByRole('option', { name: /โตเกียว/ }).first().click();
  await expect(control(page, /^ปลายทาง/)).toContainText(/โตเกียว/);
});

test('B05 เลือกสนามบินหลายแห่ง', async ({ page }) => {
  await gotoResults(page);
  step('เปิดช่องต้นทาง');
  await control(page, /^ต้นทาง|จากที่ไหน/).click();
  step('หาตัวเลือก "เลือกสนามบินหลายแห่ง"');
  const multi = page.getByRole('checkbox', { name: /เลือกสนามบินหลายแห่ง/ })
    .or(page.getByRole('switch', { name: /เลือกสนามบินหลายแห่ง/ }))
    .or(page.getByRole('button', { name: /เลือกสนามบินหลายแห่ง/ })).first();
  await expect(multi).toBeVisible();
  await mark(multi);
  await multi.click();
  step('เลือก BKK และ DMK พร้อมกัน');
  await page.getByRole('option', { name: /BKK/ }).first().click();
  await page.getByRole('option', { name: /DMK/ }).first().click();
  await closePopup(page);
  const from = control(page, /^ต้นทาง/);
  await expect(from).toContainText(/BKK/);
  await expect(from).toContainText(/DMK/);
  await mark(from, 'BKK + DMK');
});

test('B06 ปุ่มสลับต้นทาง-ปลายทาง', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่มสลับต้นทางกับปลายทาง');
  const swap = page.getByRole('button', { name: /สลับ/ }).first();
  await expect(swap).toBeVisible();
  const before = [await labelOf(page, /^ต้นทาง/), await labelOf(page, /^ปลายทาง/)];
  await mark(swap, '⇄');
  await swap.click();
  step('ต้นทางกับปลายทางต้องสลับกัน');
  await expect(control(page, /^ต้นทาง/)).toContainText(/กรุงเทพ/.test(before[1]) ? /กรุงเทพ/ : /ญี่ปุ่น|โตเกียว/);
  await expect(control(page, /^ปลายทาง/)).toContainText(/กรุงเทพ/);
  await mark(control(page, /^ปลายทาง/), 'สลับแล้ว');
});

test('B07 ปฏิทินวันที่', async ({ page }) => {
  await gotoResults(page);
  step('กดช่องวันที่ขาไป');
  const date = control(page, /^ขาไป(?! วัน)|วันเดินทาง/);
  await expect(date).toBeVisible();
  await mark(date);
  await date.click();
  step('ปฏิทินต้องแสดง 2 เดือน');
  const months = page.getByRole('heading', { name: /(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*\d{4}/ });
  await expect(months).toHaveCount(2);
  await mark(months.first().locator('..'), 'ปฏิทิน 2 เดือน');
  step('ปุ่มเลื่อนเดือน');
  await expect(page.getByRole('button', { name: /เดือนถัดไป/ })).toBeVisible();
  step('ต้องมีราคาใต้วันที่ในปฏิทิน');
  const priced = page.getByRole('button', { name: /^\d{1,2}\b.*฿/ })
    .or(page.getByRole('gridcell', { name: /฿/ }))
    .or(page.getByRole('button').filter({ hasText: /^\s*\d{1,2}\s*฿/ }));
  expect(await priced.count(), 'วันที่ในปฏิทินไม่มีราคา').toBeGreaterThan(0);
  await mark(priced.first(), 'ราคาใต้วันที่');
  step('ต้องมีปุ่ม "รีเซ็ต" และ "เสร็จ"');
  await expect(page.getByRole('button', { name: /รีเซ็ต/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^เสร็จ$/ })).toBeVisible();
});

test('B08 ปุ่ม < > เลื่อนวันทีละวัน', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่มวันถัดไป');
  const next = page.getByRole('button', { name: /วันถัดไป/ }).first();
  await expect(next).toBeVisible();
  const date = control(page, /^ขาไป(?! วัน)|วันเดินทาง/);
  const before = await labelOf(page, /^ขาไป(?! วัน)|วันเดินทาง/);
  const day = Number(before.match(/(\d{1,2})\s/)?.[1]);
  await mark(next, '>');
  await next.click();
  step('วันที่ต้องเพิ่มขึ้น 1 วัน');
  await expect(date).toContainText(new RegExp(`\\b${day + 1}\\b`));
  await mark(date, `${day} → ${day + 1}`);
  await page.getByRole('button', { name: /วันก่อนหน้า/ }).first().click();
  await expect(date).toContainText(new RegExp(`\\b${day}\\b`));
});

test('B09 ปุ่มค้นหา', async ({ page }) => {
  await page.goto('/');
  step('หน้าแรกต้องมีปุ่ม "ค้นหา"');
  const search = page.getByRole('button', { name: /ค้นหา/ }).first();
  await expect(search).toBeVisible();
  await mark(search);
  await search.click();
  step('ต้องได้ผลลัพธ์ 22 รายการ');
  await expect(page.getByText(/(?:ผลลัพธ์|พบ)\s*22\s*(?:รายการ|เที่ยวบิน)/)).toBeVisible({ timeout: 10_000 });
  await mark(page.getByText(/(?:ผลลัพธ์|พบ)\s*22/).first(), '22 รายการ');
});

test('B10 แท็บ ดีที่สุด / ถูกที่สุด', async ({ page }) => {
  await gotoResults(page);
  step('หาแท็บ "ดีที่สุด" และ "ถูกที่สุด"');
  const best = control(page, /ดีที่สุด/);
  const cheap = control(page, /ถูกที่สุด/);
  await expect(best).toBeVisible();
  await expect(cheap).toBeVisible();
  step('แท็บถูกที่สุดต้องบอกราคาเริ่มต้น ฿7,635');
  await expect(cheap).toContainText(/7,635/);
  await mark(cheap, 'ถูกที่สุด ฿7,635');
  await cheap.click();
  step('กดถูกที่สุดแล้วแถวแรกต้องเป็นราคาต่ำสุด');
  const prices = (await rowTexts(page)).map(priceOf);
  expect(prices[0]).toBe(Math.min(...prices));
});

test('B11 ⓘ อธิบายการจัดอันดับ', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่ม ⓘ ข้อมูลการจัดอันดับ');
  const info = page.getByRole('button', { name: /จัดอันดับ/ }).first();
  await expect(info).toBeVisible();
  await mark(info, 'ⓘ');
  await info.click();
  step('ต้องอธิบายว่า "ดีที่สุด" ชั่งราคากับความสะดวก');
  const text = page.getByText(/ราคา.*ความสะดวก/).first();
  await expect(text).toBeVisible();
  await mark(text);
});

test('B12 เรียงลำดับ', async ({ page }) => {
  await gotoResults(page);
  const SORT = /จัดเรียง|เรียงตาม|เรียงลำดับ/;
  const hasDropdown = await control(page, SORT).isVisible().catch(() => false);
  const sortBy = async (option: RegExp, fallback: RegExp) => {
    if (hasDropdown) return pick(page, SORT, option);
    step(`หาตัวเลือกเรียง "${human(fallback)}"`);
    const c = control(page, fallback);
    await expect(c).toBeVisible();
    await mark(c);
    await c.click();
  };
  step('เรียงตามราคา');
  await sortBy(/^ราคา$/, /ราคาถูก/);
  await expect.poll(async () => {
    const p = (await rowTexts(page)).map(priceOf);
    return p.length > 1 && p.every((v, i) => i === 0 || v >= p[i - 1]);
  }).toBe(true);
  await mark((await rows(page)).first(), 'ราคาน้อย→มาก');
  step('เรียงตามระยะเวลา');
  await sortBy(/^ระยะเวลา$/, /บินเร็ว|ระยะเวลา/);
  await expect.poll(async () => {
    const d = (await rowTexts(page)).map(minutesOf);
    return d.length > 1 && d.every((v, i) => i === 0 || v >= d[i - 1]);
  }).toBe(true);
  step('เรียงตามเวลาออกเดินทาง');
  await sortBy(/^เวลาออกเดินทาง$/, /ออกเดินทาง/);
  await expect.poll(async () => {
    const d = (await rowTexts(page)).map(departOf);
    return d.length > 1 && d.every((v, i) => i === 0 || v >= d[i - 1]);
  }).toBe(true);
  // ตัวเลือกอื่นของ Google (เวลาถึง / การปล่อยก๊าซ / ยอดนิยม) — บันทึกเป็นหมายเหตุ
  const all = hasDropdown ? (await optionTexts(page, SORT)).join('|') : await page.locator('body').innerText();
  const missing = ['เวลาถึง', 'การปล่อยก๊าซ', 'ยอดนิยม'].filter((o) => !all.includes(o));
  if (missing.length) note(`ไม่มีตัวเลือกเรียง: ${missing.join(', ')}`);
});

test('B13 แถวเที่ยวบิน (สรุป)', async ({ page }) => {
  await gotoResults(page);
  const r = (await rows(page)).first();
  await mark(r, 'แถวเที่ยวบิน');
  const t = await r.innerText();
  const need: [string, RegExp][] = [
    ['เวลาออก–ถึง', /\d{2}:\d{2}[\s\S]*\d{2}:\d{2}/],
    ['ระยะเวลา', /ชม\./],
    ['รหัสสนามบิน', /\b(BKK|DMK)\b[\s\S]*\b(NRT|HND)\b/],
    ['จำนวนครั้งที่แวะ', /บินตรง|แวะ/],
    ['ราคา', /฿\s?[\d,]+/],
    ['CO2e', /CO2|CO₂|การปล่อยก๊าซ/],
    ['% เทียบค่าเฉลี่ย', /[+-−]\d+\s?%/],
  ];
  for (const [name, re] of need) {
    step(`แถวเที่ยวบินต้องมี ${name}`);
    expect(t, name).toMatch(re);
  }
  step('มี +1 เมื่อถึงวันถัดไป');
  await expect(page.getByText('+1').first()).toBeVisible();
});

test('B14 ขยายรายละเอียดเที่ยวบิน', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่ม ˅ ขยายรายละเอียดในแถว');
  const exp = page.getByRole('button', { name: /รายละเอียด|ขยาย/ });
  await expect(exp.first()).toBeVisible();
  await mark(exp.first(), '˅');
  await exp.first().click();
  await exp.nth(1).click();
  step('รายละเอียดต้องมีเลขเที่ยวบิน รุ่นเครื่องบิน พื้นที่วางขา');
  await expect(exp.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(exp.nth(1)).toHaveAttribute('aria-expanded', 'true');
  const body = page.locator('main');
  await expect(body).toContainText(/\b[A-Z0-9]{2}\s?\d{2,4}\b/);
  await expect(body).toContainText(/Boeing|Airbus|เครื่องบิน/);
  await expect(body).toContainText(/\d+\s*ซม\./);
  const sel = page.getByRole('link', { name: /เลือกเที่ยวบิน/ }).or(page.getByRole('button', { name: /เลือกเที่ยวบิน/ })).first();
  await expect(sel).toBeVisible();
  await mark(sel.locator('xpath=ancestor::*[contains(., "ซม.")][1]'), 'รายละเอียดช่วงบิน');
});

test('B15 ดูเที่ยวบินเพิ่มเติม', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่ม "ดูเที่ยวบินเพิ่มเติม"');
  const more = page.getByRole('button', { name: /ดูเที่ยวบินเพิ่มเติม|เที่ยวบินอื่น/ }).first();
  await expect(more).toBeVisible();
  const before = await (await rows(page)).count();
  await mark(more);
  await more.click();
  step('รายการต้องเพิ่มขึ้นและปุ่มหายไป');
  await expect.poll(async () => (await rows(page)).count()).toBeGreaterThan(before);
  await expect(more).toBeHidden();
  await mark((await rows(page)).last(), `${before} → ${await (await rows(page)).count()} แถว`);
  const n = await (await rows(page)).count();
  if (n < 300) note(`โหลดได้ ${n} รายการ (Google ได้ 300)`);
});

test('B16 ตัวกรอง: จำนวนครั้งที่แวะพัก', async ({ page }) => {
  await gotoResults(page);
  const before = await resultCount(page);
  step('หาตัวกรองจำนวนครั้งที่แวะพัก');
  const chip = page.getByRole('button', { name: /แวะพัก/ }).first();
  if (await chip.isVisible().catch(() => false)) {
    await openFilter(page, /แวะพัก/);
    for (const o of [/บินตรงเท่านั้น/, /แวะพัก 1 ครั้ง/, /แวะพัก 2 ครั้ง/]) await expect(choice(page, o)).toBeVisible();
    const r = choice(page, /บินตรงเท่านั้น/);
    await mark(r);
    await r.click();
    await closePopup(page);
  } else {
    const c = control(page, /บินตรงเท่านั้น/);
    await expect(c).toBeVisible();
    await mark(c);
    await c.click();
    note('มีแค่ปุ่ม "บินตรงเท่านั้น" — ไม่มีตัวเลือก แวะ ≤1 / ≤2');
  }
  step('ทุกแถวต้องเป็นบินตรง');
  await expect.poll(() => resultCount(page)).toBeLessThan(before);
  const t = await rowTexts(page);
  expect(t.every((x) => /บินตรง/.test(x))).toBe(true);
  await mark((await rows(page)).first(), `${before} → ${await resultCount(page)} บินตรง`);
});

test('B17 ตัวกรอง: สายการบิน', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /^สายการบิน/);
  step('ต้องมีสวิตช์เลือกทั้งหมดและกลุ่มพันธมิตร');
  await expect(page.getByText(/เลือกสายการบินทั้งหมด/).first()).toBeVisible();
  for (const a of ['Oneworld', 'SkyTeam', 'Star Alliance']) await expect(page.getByText(a).first()).toBeVisible();
  step('กด "การบินไทย เท่านั้น"');
  const only = onlyButtonFor(page, /การบินไทย/);
  await expect(only).toBeVisible();
  await mark(only, 'การบินไทย เท่านั้น');
  await only.click();
  await closePopup(page);
  step('ทุกแถวต้องเป็นการบินไทย');
  await expect.poll(async () => (await rowTexts(page)).every((x) => /การบินไทย/.test(x))).toBe(true);
  await mark((await rows(page)).first(), `${await resultCount(page)} รายการ TG`);
});

test('B18 ตัวกรอง: สัมภาระ', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /^สัมภาระ/);
  step('เพิ่มกระเป๋าถือขึ้นเครื่อง');
  const plus = page.getByRole('button', { name: /เพิ่ม.*กระเป๋า/ }).first();
  await expect(plus).toBeVisible();
  await mark(plus, '+ กระเป๋าถือ');
  await plus.click();
  step('ใส่ได้สูงสุด 1 ใบ (ปุ่ม + กดไม่ได้)');
  await expect(plus).toBeDisabled();
  await closePopup(page);
  const chip = page.getByRole('button', { name: /กระเป๋าถือ.*1/ }).first();
  await expect(chip).toBeVisible();
  await mark(chip, 'ชิปเปลี่ยนชื่อ');
});

test('B19 ตัวกรอง: ราคา', async ({ page }) => {
  await gotoResults(page);
  const before = await resultCount(page);
  await openFilter(page, /^ราคา/);
  step('หา slider ราคาสูงสุด');
  const s = page.getByRole('slider', { name: /ราคา/ }).first();
  await expect(s).toBeVisible();
  await setSlider(s, 'Home');
  const max = Number(await s.getAttribute('aria-valuenow') ?? await s.inputValue());
  await mark(s, `สูงสุด ฿${max.toLocaleString()}`);
  await closePopup(page);
  step('ทุกแถวต้องราคาไม่เกินค่าที่ตั้ง');
  await expect.poll(() => resultCount(page)).toBeLessThan(before);
  expect((await rowTexts(page)).map(priceOf).every((p) => p <= max)).toBe(true);
});

test('B20 ตัวกรอง: เวลา', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /^เวลา/);
  step('slider เวลาออกเดินทางที่เร็วที่สุด → ช้าสุด (23:00)');
  const s = page.getByRole('slider', { name: /ออกเดินทาง.*(เร็ว|ต่ำสุด|เริ่ม)/ }).first();
  await expect(s).toBeVisible();
  await expect(page.getByRole('slider', { name: /มาถึง/ }).first()).toBeVisible();
  await setSlider(s, 'End');
  await mark(s, 'ออกเดินทาง 23:00–24:00');
  await closePopup(page);
  step('ทุกแถวต้องออกเดินทาง 23:xx');
  await expect.poll(async () => (await rowTexts(page)).every((x) => departOf(x).startsWith('23'))).toBe(true);
  await mark((await rows(page)).first(), `${await resultCount(page)} รายการ ออก 23:xx`);
});

test('B21 ตัวกรอง: การปล่อยก๊าซ', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /^การปล่อยก๊าซ/);
  step('เลือก "การปล่อยก๊าซต่ำเท่านั้น"');
  const low = choice(page, /ต่ำเท่านั้น/);
  await expect(low).toBeVisible();
  await mark(low);
  await low.click();
  await closePopup(page);
  step('ทุกแถวต้องมี % ติดลบ');
  await expect.poll(async () => {
    const t = await rowTexts(page);
    return t.length > 0 && t.every((x) => /[-−]\d+\s?%/.test(x));
  }).toBe(true);
  await mark((await rows(page)).first(), 'CO2e ต่ำกว่าค่าเฉลี่ย');
});

test('B22 ตัวกรอง: สนามบินสำหรับต่อเครื่อง', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /สนามบิน.*ต่อเครื่อง/);
  step('ต้องมี slider ระยะเวลาแวะพัก');
  await expect(page.getByRole('slider', { name: /แวะพัก/ }).first()).toBeVisible();
  step('กด HKG เท่านั้น');
  const only = onlyButtonFor(page, /HKG/);
  await expect(only).toBeVisible();
  await mark(only, 'HKG เท่านั้น');
  await only.click();
  await closePopup(page);
  step('ทุกแถวต้องเป็นบินตรงหรือแวะ HKG');
  await expect.poll(async () => (await rowTexts(page)).every((x) => /บินตรง|HKG/.test(x))).toBe(true);
  expect((await rowTexts(page)).some((x) => /HKG/.test(x))).toBe(true);
  await mark((await rows(page)).first(), `${await resultCount(page)} รายการ`);
});

test('B23 ตัวกรอง: ระยะเวลา', async ({ page }) => {
  await gotoResults(page);
  await openFilter(page, /^ระยะเวลา/);
  step('slider ระยะเวลาบินสูงสุด → ต่ำสุด');
  const s = page.getByRole('slider', { name: /ระยะเวลา/ }).first();
  await expect(s).toBeVisible();
  await setSlider(s, 'Home');
  await mark(s, 'ต่ำสุด');
  await closePopup(page);
  step('ต้องไม่พบผลลัพธ์ (ไม่มีเที่ยวบินสั้นขนาดนั้น)');
  const empty = page.getByText(/ไม่พบผลลัพธ์|ไม่พบตัวเลือก|ไม่พบเที่ยวบิน/).first();
  await expect(empty).toBeVisible();
  await mark(empty);
});

test('B24 ตัวกรองทั้งหมด', async ({ page }) => {
  await gotoResults(page);
  step('หาปุ่ม "ตัวกรองทั้งหมด"');
  const all = page.getByRole('button', { name: /ตัวกรองทั้งหมด/ }).first();
  await expect(all).toBeVisible();
  await mark(all);
  await all.click();
  step('แผงเดียวต้องมีตัวกรองทุกตัว + ล้างทั้งหมด');
  for (const h of ['จำนวนครั้งที่แวะพัก', 'สายการบิน', 'สัมภาระ', 'ราคา', 'เวลา', 'การปล่อยก๊าซ', 'ระยะเวลา'])
    await expect(page.getByRole('heading', { name: h }).first()).toBeVisible();
  const nonstop = page.getByRole('radio', { name: /บินตรงเท่านั้น/ }).first();
  await nonstop.click();
  await expect(page.getByRole('button', { name: /ล้างทั้งหมด/ })).toBeVisible();
  if (!(await page.getByText(/ตั๋วแยก/).first().isVisible().catch(() => false))) note('ไม่มีตัวเลือก "ตั๋วแยก/เปลี่ยนเครื่องเอง"');
  await closePopup(page);
  step('ปุ่มต้องแสดงจำนวนตัวกรองที่ใช้ (1)');
  const counted = page.getByRole('button', { name: /ตัวกรองทั้งหมด.*1/ }).first();
  await expect(counted).toBeVisible();
  await mark(counted, 'ตัวกรองทั้งหมด (1)');
});

test('B25 ล้างตัวกรอง', async ({ page }) => {
  await gotoResults(page);
  const before = await resultCount(page);
  step('ใช้ตัวกรองบินตรงก่อน');
  const chip = page.getByRole('button', { name: /แวะพัก/ }).first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
    await choice(page, /บินตรงเท่านั้น/).click();
    await closePopup(page);
  } else {
    await control(page, /บินตรงเท่านั้น/).click();
  }
  await expect.poll(() => resultCount(page)).toBeLessThan(before);
  step('หาปุ่มล้างตัวกรอง (✕ บนชิป / ล้าง / ล้างทั้งหมด)');
  const clear = page.getByRole('button', { name: /ล้าง|นำตัวกรอง.*ออก/ }).first();
  await expect(clear).toBeVisible();
  await mark(clear, 'ล้าง');
  await clear.click();
  step('รายการต้องกลับมาเท่าเดิม');
  await expect.poll(() => resultCount(page)).toBe(before);
});

test('B26 ข้อมูลเชิงลึกด้านราคา', async ({ page }) => {
  await gotoResults(page);
  await defaultView(page);
  step('ต้องบอกว่าราคาตอนนี้ สูง/ต่ำ/ปกติ');
  const insight = page.getByText(/ราคา.*(สูง|ต่ำ|ปกติ)/).first();
  await expect(insight).toBeVisible();
  await expect(page.getByText(/4,950/).first()).toBeVisible();
  await mark(insight);
  step('กด "ดูประวัติราคา" ต้องมีกราฟ');
  const hist = page.getByRole('button', { name: /ประวัติราคา/ }).first();
  await hist.click();
  const graph = page.getByRole('img', { name: /ประวัติราคา|กราฟ/ }).first();
  await expect(graph).toBeVisible();
  await mark(graph, 'กราฟประวัติราคา');
});

test('B27 การ์ดแนะนำวันที่ถูกกว่า', async ({ page }) => {
  await gotoResults(page);
  step('ต้องมีการ์ด "เดินทางวันที่ … ในราคา ฿…"');
  const card = page.getByText(/เดินทางวันที่.*ในราคา\s*฿/).first();
  await expect(card).toBeVisible();
  await mark(card);
  step('กด "เปลี่ยนวันที่" แล้ววันที่ค้นหาต้องเปลี่ยน');
  const day = (await card.innerText()).match(/วันที่\s*(\d{1,2})/)![1];
  await page.getByRole('button', { name: /เปลี่ยนวันที่/ }).click();
  const date = control(page, /^ขาไป(?! วัน)|วันเดินทาง/);
  await expect(date).toContainText(new RegExp(`\\b${day}\\b`));
  await mark(date, `วันที่ ${day}`);
});

test('B28 ติดตามราคา', async ({ page }) => {
  await gotoResults(page);
  step('หาสวิตช์ติดตามราคา');
  const sw = page.getByRole('switch', { name: /ติดตามราคา/ }).first();
  await expect(sw).toBeVisible();
  await expect(page.getByRole('switch', { name: /วันใดก็ได้/ })).toBeVisible();
  await mark(sw);
  await sw.click();
  step('ยังไม่ล็อกอิน → ต้องขึ้นให้ลงชื่อเข้าใช้ และสวิตช์ยังปิด');
  const dlg = page.getByText(/ลงชื่อเข้าใช้/).first();
  await expect(dlg).toBeVisible();
  await mark(dlg);
  await expect(sw).not.toBeChecked();
});

test('B29 ตารางวันที่', async ({ page }) => {
  await gotoResults(page);
  await defaultView(page);
  step('หาปุ่ม "ตารางวันที่"');
  const btn = page.getByRole('button', { name: /ตารางวันที่/ }).first();
  await expect(btn).toBeVisible();
  await mark(btn);
  await btn.click();
  step('ต้องมี 8 วันพร้อมป้าย "ถูกที่สุด"');
  const cheapest = page.getByRole('button', { name: /ถูกที่สุด/ }).filter({ hasText: /฿/ }).first();
  await expect(cheapest).toBeVisible();
  await mark(cheapest, 'ถูกที่สุด');
  const dateBefore = await labelOf(page, /^ขาไป(?! วัน)|วันเดินทาง/);
  await cheapest.click();
  step('กด "ยกเลิก" แล้ววันที่ต้องไม่เปลี่ยน');
  await expect(page.getByRole('button', { name: /^ตกลง$/ })).toBeVisible();
  await page.getByRole('button', { name: /^ยกเลิก$/ }).click();
  expect(await labelOf(page, /^ขาไป(?! วัน)|วันเดินทาง/)).toBe(dateBefore);
});

test('B30 กราฟราคา', async ({ page }) => {
  await gotoResults(page);
  await defaultView(page);
  step('หาปุ่ม "กราฟราคา"');
  const btn = page.getByRole('button', { name: /กราฟราคา/ }).first();
  await expect(btn).toBeVisible();
  await mark(btn);
  await btn.click();
  step('ต้องมีแท่งราคารายวัน');
  const g = page.getByRole('img', { name: /กราฟ/ }).or(page.getByRole('dialog', { name: /กราฟราคา/ })).first();
  await expect(g).toBeVisible();
  await mark(g);
});

/** เปิดหน้าจองของเที่ยวบินราคา ฿8,172 (ไทยเวียดเจ๊ท 09:35) */
async function openBooking(page: Page) {
  await gotoResults(page);
  const resultsUrl = page.url();
  step('เลือกเที่ยวบินราคา ฿8,172');
  const r = (await rows(page)).filter({ hasText: /8,172/ }).first();
  await expect(r).toBeVisible();
  const sel = r.getByRole('link', { name: /^เลือก/ }).or(r.getByRole('button', { name: /^เลือก/ })).first();
  if (await sel.isVisible().catch(() => false)) {
    await mark(sel, 'เลือก');
    await sel.click();
  } else {
    await mark(r, 'กดที่แถว');
    await r.click({ position: { x: 40, y: 15 } });
  }
  await page.waitForLoadState('domcontentloaded');
  return resultsUrl;
}

test('B31 เลือกเที่ยวบิน', async ({ page }) => {
  const start = await openBooking(page);
  step('ต้องไปหน้าจองที่ราคาตรงกับที่เลือก');
  await expect(page).not.toHaveURL(start);
  await expect.poll(() => rows(page).then((r) => r.count())).toBeLessThan(2);
  const price = page.getByText(/8,172/).first();
  await expect(price).toBeVisible();
  await mark(price, 'ราคาตรงกัน ฿8,172');
});

test('B32 หน้าสรุปการเดินทาง/ตัวเลือกการจอง', async ({ page }) => {
  await openBooking(page);
  const need: [string, RegExp][] = [
    ['ปุ่มแชร์', /แชร์/],
    ['ติดตามราคา', /ติดตามราคา/],
    ['นโยบายสัมภาระ', /สัมภาระ/],
    ['ตัวเลือกการจอง', /ตัวเลือกการจอง|จองกับ/],
    ['ดำเนินการต่อ', /ดำเนินการต่อ/],
  ];
  for (const [name, re] of need) {
    step(`หน้าจองต้องมี ${name}`);
    const el = page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re }))
      .or(page.getByRole('switch', { name: re })).or(page.getByRole('heading', { name: re })).or(page.getByText(re)).first();
    await expect(el).toBeVisible();
    await mark(el, name);
  }
});

test('B33 ปุ่มย้อนกลับ ←', async ({ page }) => {
  await openBooking(page);
  step('หาปุ่ม/ลิงก์ย้อนกลับไปผลการค้นหา');
  const back = page.getByRole('link', { name: /กลับ/ }).or(page.getByRole('button', { name: /กลับ/ })).first();
  await expect(back).toBeVisible();
  await mark(back, '←');
  await back.click();
  step('ต้องกลับมาที่รายการผลการค้นหา');
  await expect((await waitRows(page)).first()).toBeVisible();
  await expect.poll(() => resultCount(page)).toBe(22);
  await mark((await rows(page)).first(), 'กลับมาแล้ว 22 รายการ');
});

test('B34 ส่วนอื่นในหน้าแรก (ดีล / สำรวจ / FAQ)', async ({ page }) => {
  await page.goto('/');
  for (const [name, re] of [['ดีลยอดนิยม', /ดีล/], ['คำถามที่พบบ่อย', /คำถามที่พบบ่อย/]] as const) {
    step(`หน้าแรกต้องมีส่วน ${name}`);
    const h = page.getByRole('heading', { name: re }).first();
    await expect(h).toBeVisible();
    await mark(h, name);
  }
  if (!(await page.getByText(/สำรวจ/).first().isVisible().catch(() => false))) note('ไม่มี "สำรวจจุดหมายปลายทาง / ดีลด้วย AI"');
});

test('B35 ภาษา / สถานที่ตั้ง / สกุลเงิน', async ({ page }) => {
  await page.goto('/');
  for (const re of [/ภาษา/, /สถานที่ตั้ง/, /สกุลเงิน/]) {
    step(`หาปุ่ม "${human(re)}"`);
    const b = page.getByRole('button', { name: re }).first();
    await expect(b).toBeVisible();
    await mark(b);
  }
  step('กดสกุลเงินแล้วต้องเปิดหน้าต่างตั้งค่า');
  await page.getByRole('button', { name: /สกุลเงิน/ }).first().click();
  const d = page.getByRole('dialog').first();
  await expect(d).toBeVisible();
  await mark(d);
});

