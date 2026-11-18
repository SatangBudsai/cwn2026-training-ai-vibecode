/**
 * 5.6 Gift Card และฐานแต้ม (TC-GIFT-01 ถึง TC-GIFT-10) · TEST-PLAN.md บรรทัด 1117-1302
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, plan, LOCK, BookingHelper, lineAmount, money, type App, type CapturedRequest, type UserKey } from '../fixtures';

const APPT_DATE = '2026-06-17';
const GIFT_API = '/api/gift-cards';
const EXP_2027 = /(^|\D)15 มิ\.ย\. 2027/;

// ---------------------------------------------------------------- helper เฉพาะหัวข้อนี้

/** ขั้นที่พังไม่ให้จุดตรวจของแถวถัดไปหาย: บันทึกเป็นข้อล้มแล้วไปต่อ */
async function guard(app: App, page: Page, label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: unknown) {
    const msg = String(e).slice(0, 400);
    await app.checkValue(page, `${label}: ทำขั้นตอนต่อไม่ได้`, msg, (v) => {
      expect.soft(v, `${label} ทำขั้นตอนไม่จบ`).toBe('');
    });
  }
}

async function textOf(el: Locator) {
  return el.first().innerText({ timeout: 3_000 }).catch(() => '');
}

async function checkPay(app: App, booking: BookingHelper, label: string, expected: number) {
  await booking.quoteReady();
  await app.check(booking.el('booking-pay-at-shop'), label, async (el) => {
    expect.soft(lineAmount(await textOf(el)), label).toBe(expected);
  });
}

/** บรรทัดหักบัตร ตรวจยอดเต็ม */
async function checkGiftLine(app: App, booking: BookingHelper, label: string, expected: number) {
  await booking.quoteReady();
  await app.check(booking.el('booking-line-giftcard'), label, async (el) => {
    expect.soft(lineAmount(await textOf(el)), label).toBe(expected);
  });
}

/** ไม่เกิดการหักบัตร: ไม่มีบรรทัดบัตร หรือบรรทัดเป็น ฿0 */
async function checkNoGiftDeduct(app: App, booking: BookingHelper, label: string) {
  const { giftcard } = await booking.lines();
  await app.checkValue(booking.page, label, Number.isNaN(giftcard) ? 'ไม่มีบรรทัดหักบัตร' : giftcard, (v) => {
    expect.soft(v === 'ไม่มีบรรทัดหักบัตร' || v === 0, `${label} ได้ ${v}`).toBe(true);
  });
}

async function checkBookingError(app: App, page: Page, label: string, re: RegExp) {
  const target = page.locator('[data-testid^="error-"]').first();
  await app.check(target, label, async (el) => {
    await expect.soft(el, label).toContainText(re, { timeout: 3_000 });
  });
}

/** ตรวจยอดบัตรที่ /gift-cards ด้วยเลขเต็ม */
async function checkGift(app: App, page: Page, code: string, label: string, expected: number) {
  const g = await app.readGiftCard(page, code);
  await app.check(page.getByTestId('giftcard-check-balance'), label, async () => {
    expect.soft(g.balance, `${label} (${code})`).toBe(expected);
  });
  return g;
}

/** ตรวจยอดบัตรทันที แล้วเปิดหน้าใหม่ตรวจซ้ำ */
async function checkGiftTwice(app: App, page: Page, code: string, label: string, expected: number) {
  await checkGift(app, page, code, label, expected);
  await checkGift(app, page, code, `${label} หลังรีโหลด`, expected);
}

/** ตรวจยอดสะสม แต้ม ระดับ ที่ /th/account · reload=true ตรวจซ้ำหลังรีโหลด */
async function checkAccount(
  app: App,
  page: Page,
  label: string,
  exp: { spend?: number; points?: number; tier?: RegExp },
  reload = true,
) {
  await app.goto(page, '/th/account');
  for (const when of reload ? ['ทันที', 'หลังรีโหลด'] : ['ทันที']) {
    if (when === 'หลังรีโหลด') await app.reload(page);
    if (exp.spend !== undefined) {
      const want = exp.spend;
      await app.check(page.getByTestId('account-spend'), `${label} ยอดสะสม ฿${want.toLocaleString('en-US')} (${when})`, async (el) => {
        expect.soft(money(await textOf(el)), `${label} ยอดสะสม`).toBe(want);
      });
    }
    if (exp.tier) {
      const want = exp.tier;
      await app.check(page.getByTestId('account-tier'), `${label} ระดับ Silver (${when})`, async (el) => {
        await expect.soft(el, `${label} ระดับ`).toContainText(want);
      });
    }
    if (exp.points !== undefined) {
      const want = exp.points;
      await app.check(page.getByTestId('account-points'), `${label} แต้ม ${want} (${when})`, async (el) => {
        expect.soft(money(await textOf(el)), `${label} แต้ม`).toBe(want);
      });
    }
  }
}

/** กดยืนยัน ไม่ throw · คืนรหัสจอง หรือ null พร้อมจุดตรวจว่าได้รหัส */
async function confirmBooking(app: App, booking: BookingHelper, label: string): Promise<string | null> {
  let code: string | null = null;
  let detail = '';
  try {
    const r = await booking.confirm();
    code = r.code;
    detail = `สถานะ ${r.request.responseStatus} ${JSON.stringify(r.request.responseBody)}`;
  } catch (e: unknown) {
    detail = String(e).slice(0, 300);
  }
  await app.checkValue(booking.page, `${label}: ได้รหัสจอง`, code ?? `(ไม่ได้รหัส) ${detail}`, (v) => {
    expect.soft(v, `${label} ต้องได้รหัสจอง`).toMatch(/^[A-Za-z0-9-]+$/);
  });
  return code;
}

/** ร้านกด "ใช้บริการเสร็จ" ใน /th/admin (login ใหม่เพราะมีการรีเซ็ตคั่น) */
async function ownerComplete(app: App, code: string, pay: number, date = APPT_DATE) {
  const owner = await app.ownerRelogin();
  const admin = await app.admin(owner);
  await admin.open(date);
  await app.check(admin.pay(code), `หน้าร้าน: คิว ${code} ยอดจ่าย ฿${pay.toLocaleString('en-US')}`, async (el) => {
    expect.soft(lineAmount(await textOf(el)), 'ยอดจ่ายในหน้าร้าน').toBe(pay);
  });
  const req = await admin.complete(code);
  await app.checkValue(owner, `หน้าร้าน: กดใช้บริการเสร็จคิว ${code} สำเร็จ`, req.responseStatus, (v) => {
    expect.soft(v).toBeGreaterThanOrEqual(200);
    expect.soft(v).toBeLessThan(300);
  });
}

type BuyForm = { amount: string; design?: 'ORCHID' | 'LOTUS' | 'GOLD'; channel?: 'LINE' | 'EMAIL' };

/** กรอกฟอร์มซื้อบัตร โดยพิมพ์มูลค่าทีละตัว · ยังไม่กดซื้อ */
async function fillBuy(page: Page, o: BuyForm) {
  const channel = o.channel ?? 'LINE';
  await page.getByTestId(`giftcard-design-${o.design ?? 'ORCHID'}`).click();
  await page.getByTestId(`giftcard-channel-${channel}`).click();
  await page.getByTestId('giftcard-recipient').fill(channel === 'LINE' ? 'test56line' : 'test56@example.com');
  const amount = page.getByTestId('giftcard-amount');
  await amount.fill('');
  await amount.pressSequentially(o.amount);
}

/** ซื้อบนหน้าเว็บจนได้ผลจาก Network */
async function buy(app: App, page: Page, o: BuyForm): Promise<CapturedRequest> {
  await app.goto(page, '/th/gift-cards');
  await fillBuy(page, o);
  const req = await app.capture(page, /\/api\/gift-cards$/, () => page.getByTestId('giftcard-submit').click());
  await page.getByTestId('giftcard-result').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  return req;
}

function buyPosts(app: App, page: Page) {
  return app.requestsOf(page).filter((r) => r.method === 'POST' && new URL(r.url).pathname === GIFT_API).length;
}

/** ไม่มีผลการออกบัตรบนหน้า */
async function checkNoCardIssued(app: App, page: Page, label: string) {
  await app.check(page.locator('body'), label, async (el) => {
    await expect.soft(el.getByTestId('giftcard-result'), label).toHaveCount(0);
  });
}

/** ช่องจ่ายด้วยบัตร: ช่องกรอกรหัสบัตรในฟอร์มซื้อ */
const PAY_WITH_GIFT_FIELD =
  'input[placeholder*="GIFT" i], input[placeholder*="รหัสบัตร"], input[name*="code" i], input[id*="code" i], input[data-testid*="code" i]';

// ---------------------------------------------------------------- TC-GIFT-01

type PointRow = { name: string; user: UserKey; service: string; card?: string; redeem?: number; pay: number; points: number };

test('TC-GIFT-01 ฐานแต้มคิดจากค่าบริการหลังหักบัตร ไม่รวมค่ารถ ปัดเศษทิ้ง', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'U04 S01 + รถ ฿1,300 − GIFT-899 = จ่าย ฿401 · ฐาน ฿1,000 − ฿899 = ฿101 → 1 แต้ม (ถ้ารวมรถจะได้ 4)\nU04 S01 + รถ ฿1,300 − GIFT-900 = จ่าย ฿400 · ฐาน ฿100 → 1 แต้ม (ถ้ารวมรถจะได้ 4)\nU04 S01 + รถ ฿1,300 − GIFT-901 = จ่าย ฿399 · ฐาน ฿99 → 0 แต้ม (ถ้ารวมรถจะได้ 3 · ถ้าปัดขึ้นจะได้ 1)\nU04 S04 + รถ ไม่ใช้บัตร ฿2,000 + ฿300 = จ่าย ฿2,300 · ฐาน ฿2,000 → 20 แต้ม (ถ้ารวมรถจะได้ 23)\nU03 S04 แลก 200 แต้ม + รถ − GIFT-500: ฿1,900 + ฿300 − ฿500 = จ่าย ฿1,700 · ฐาน ฿1,900 − ฿500 = ฿1,400 → 14 แต้ม · แต้มรวม 250 − 200 + 14 = 64 (ถ้าบัตรจ่ายรถก่อนจะได้ 17 แต้ม รวม 67)',
    source: '[D] บ.14 · [D] §4 แต้มและระดับ · [R] ⚠️A-09 · F-ร้าน 9',
    frbr: 'BR-15, BR-16, BR-17',
    rules: '—',
    technique: 'Boundary',
    timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(480_000);
  const rows: PointRow[] = [
    { name: 'U04 S01 GIFT-899', user: 'U04', service: 'S01', card: 'GIFT-899', pay: 401, points: 1 },
    { name: 'U04 S01 GIFT-900', user: 'U04', service: 'S01', card: 'GIFT-900', pay: 400, points: 1 },
    { name: 'U04 S01 GIFT-901', user: 'U04', service: 'S01', card: 'GIFT-901', pay: 399, points: 0 },
    { name: 'U04 S04 ไม่ใช้บัตร', user: 'U04', service: 'S04', pay: 2300, points: 20 },
    { name: 'U03 S04 แลก 200 แต้ม GIFT-500', user: 'U03', service: 'S04', card: 'GIFT-500', redeem: 2, pay: 1700, points: 64 },
  ];
  for (const [i, row] of rows.entries()) {
    await guard(app, page, row.name, async () => {
      await test.step(`${row.name} · 1. รีเซ็ตแล้วเข้าระบบ`, async () => {
        if (i > 0) await app.lockAndReset(LOCK);
        await app.login(page, row.user);
      });
      let code: string | null = null;
      await test.step(`${row.name} · 2. จอง เลือกรถ H04 กรอกบัตร ตรวจยอดจ่าย`, async () => {
        await booking.toSummary({ service: row.service, date: APPT_DATE, time: '12:00' });
        if (row.redeem) await booking.redeemSets(row.redeem);
        await booking.shuttleHotel('H04');
        if (row.card) await booking.giftCard(row.card);
        await checkPay(app, booking, `${row.name} จ่าย ฿${row.pay.toLocaleString('en-US')}`, row.pay);
        code = await confirmBooking(app, booking, row.name);
      });
      if (!code) return;
      const bookingCode: string = code;
      await test.step(`${row.name} · 3. ร้านกดใช้บริการเสร็จ`, async () => {
        await ownerComplete(app, bookingCode, row.pay);
      });
      await test.step(`${row.name} · 4. ดูแต้มในหน้าบัญชี แล้วรีโหลด`, async () => {
        await checkAccount(app, page, row.name, { points: row.points });
      });
    });
  }
});

// ---------------------------------------------------------------- TC-GIFT-02

test('TC-GIFT-02 ส่วนที่จ่ายด้วยบัตรไม่เพิ่มยอดสะสม ยอดและแต้มเปลี่ยนตอนร้านกดเสร็จเท่านั้น', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'ก่อนกดเสร็จ ทุกแถว: ยอดสะสม ฿0 แต้ม 0 (ถ้าเพิ่มตอนจอง ค่านี้จะเปลี่ยนไปแล้ว)\nไม่ใช้บัตร: ฿1,000 − ฿0 = จ่าย ฿1,000 → ยอด ฿1,000 แต้ม 10\nGIFT-BAL-400: ฿1,000 − ฿400 = จ่าย ฿600 บัตรเหลือ ฿0 ตั้งแต่ตอนจอง → ยอด ฿600 แต้ม 6 (ถ้ารวมส่วนบัตรจะได้ ฿1,000 แต้ม 10)\nGIFT-1000: ฿1,000 − ฿1,000 = จ่าย ฿0 บัตรเหลือ ฿0 ตั้งแต่ตอนจอง → ยอด ฿0 แต้ม 0 (ถ้ารวมส่วนบัตรจะได้ ฿1,000 แต้ม 10)',
    source: '[R] ⚠️A-10 · [D] §4 ราคา',
    frbr: 'BR-24, FR-29',
    rules: '—',
    technique: 'Boundary, State',
    timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);
  const rows: { name: string; card?: string; pay: number; spend: number; points: number }[] = [
    { name: 'ไม่ใช้บัตร', pay: 1000, spend: 1000, points: 10 },
    { name: 'GIFT-BAL-400', card: 'GIFT-BAL-400', pay: 600, spend: 600, points: 6 },
    { name: 'GIFT-1000', card: 'GIFT-1000', pay: 0, spend: 0, points: 0 },
  ];
  for (const [i, row] of rows.entries()) {
    await guard(app, page, row.name, async () => {
      let code: string | null = null;
      await test.step(`${row.name} · 1. เข้าระบบ U04 จองจนได้รหัสจอง`, async () => {
        if (i > 0) await app.lockAndReset(LOCK);
        await app.login(page, 'U04');
        await booking.toSummary({ service: 'S01', date: APPT_DATE, time: '12:00' });
        if (row.card) await booking.giftCard(row.card);
        await checkPay(app, booking, `${row.name} จ่าย ฿${row.pay.toLocaleString('en-US')}`, row.pay);
        code = await confirmBooking(app, booking, row.name);
      });
      await test.step(`${row.name} · 2. ดูยอดสะสมและแต้มก่อนร้านกดเสร็จ`, async () => {
        if (row.card) await checkGift(app, page, row.card, `${row.name} บัตรเหลือ ฿0 ตั้งแต่ตอนจอง`, 0);
        await checkAccount(app, page, `${row.name} ก่อนกดเสร็จ`, { spend: 0, points: 0 }, false);
      });
      if (!code) return;
      const bookingCode: string = code;
      await test.step(`${row.name} · 3. ร้านกดใช้บริการเสร็จ`, async () => {
        await ownerComplete(app, bookingCode, row.pay);
      });
      await test.step(`${row.name} · 4. ดูยอดสะสมและแต้มอีกครั้ง แล้วรีโหลด`, async () => {
        await checkAccount(app, page, `${row.name} หลังกดเสร็จ`, { spend: row.spend, points: row.points });
      });
    });
  }
});

// ---------------------------------------------------------------- TC-GIFT-03

test('TC-GIFT-03 ยอดจ่ายต่ำสุด ฿0 หักบัตรไม่เกินยอดก่อนหักบัตร เศษคงอยู่ในบัตร', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'ยอดก่อนหักบัตรทุกแถว (฿2,000 − แลก 200 แต้ม ฿100 = ฿1,900 + รถ ฿300 = ฿2,200)\nGIFT-2199: หัก ฿2,199 จ่าย ฿1 บัตรเหลือ ฿0\nGIFT-2200: หัก ฿2,200 จ่าย ฿0 บัตรเหลือ ฿0\nGIFT-2201: หัก ฿2,200 จ่าย ฿0 บัตรเหลือ ฿1 (ถ้าหักเต็มใบ บัตรจะเหลือ ฿0 · ถ้าไม่กันขั้นต่ำ จะจ่าย −฿1)\nแต้ม U03 ทุกแถว 250 − 200 = 50',
    source: '[D] §4 ราคา · [D][R] E157–E159',
    frbr: 'BR-33, FR-29',
    rules: '—',
    technique: 'Boundary',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(360_000);
  const rows = [
    { card: 'GIFT-2199', deduct: 2199, pay: 1, left: 0 },
    { card: 'GIFT-2200', deduct: 2200, pay: 0, left: 0 },
    { card: 'GIFT-2201', deduct: 2200, pay: 0, left: 1 },
  ];
  for (const [i, row] of rows.entries()) {
    await guard(app, page, row.card, async () => {
      await test.step(`${row.card} · 1. เข้าระบบ U03 เลือก S04 รถ H04 แลก 200 แต้ม`, async () => {
        if (i > 0) await app.lockAndReset(LOCK);
        await app.login(page, 'U03');
        await booking.toSummary({ service: 'S04', date: APPT_DATE, time: '12:00' });
        await booking.redeemSets(2);
        await booking.shuttleHotel('H04');
        await checkPay(app, booking, `${row.card} ยอดก่อนหักบัตร ฿2,200`, 2200);
      });
      await test.step(`${row.card} · 2. กรอกบัตร ดูยอดหน้าสรุป`, async () => {
        await booking.giftCard(row.card);
        await checkGiftLine(app, booking, `${row.card} หัก ฿${row.deduct.toLocaleString('en-US')}`, row.deduct);
        await checkPay(app, booking, `${row.card} จ่าย ฿${row.pay}`, row.pay);
      });
      await test.step(`${row.card} · 3. ยืนยันการจอง`, async () => {
        await confirmBooking(app, booking, row.card);
      });
      await test.step(`${row.card} · 4. ตรวจยอดบัตรที่ /gift-cards แล้วรีโหลด`, async () => {
        await checkAccount(app, page, row.card, { points: 50 });
        await checkGiftTwice(app, page, row.card, `${row.card} บัตรเหลือ ฿${row.left}`, row.left);
      });
    });
  }
});

// ---------------------------------------------------------------- TC-GIFT-04

test('TC-GIFT-04 บัตรใบเดียวใช้ได้หลายครั้งจนหมด ยอดตรงทุกครั้ง บัตรเหลือ ฿0 ใช้ไม่ได้', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'GIFT-ACTIVE เริ่ม ฿2,000\nครั้งที่ 1: ฿800 − ฿800 = จ่าย ฿0 · บัตร ฿2,000 − ฿800 = ฿1,200\nครั้งที่ 2: ฿800 − ฿800 = จ่าย ฿0 · บัตร ฿1,200 − ฿800 = ฿400 (ถ้าใช้ได้ครั้งเดียวหรือไม่หักซ้ำ จะไม่ใช่ ฿400)\nGIFT-BAL-1: ฿1,000 − ฿1 = จ่าย ฿999 · บัตรเหลือ ฿0 · ร้านกดเสร็จแล้ว ฐาน ฿999 → 9 แต้ม (ถ้าไม่หักบัตรจากฐานจะได้ 10)\nGIFT-BAL-0: มีข้อความแจ้งว่าบัตรไม่มีมูลค่าเหลือ · ยอดจ่ายยัง ฿1,000 · บัตรยัง ฿0 · ไม่เกิดการหักบัตร',
    source: '[D] §4 Gift Card · [D][R] E160–E163',
    frbr: 'FR-49, FR-29, BR-17',
    rules: 'R50',
    technique: 'Happy path, Negative, State',
    timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(360_000);
  await guard(app, page, 'GIFT-ACTIVE', async () => {
    await test.step('1. ตรวจยอด GIFT-ACTIVE ที่ /gift-cards', async () => {
      await checkGift(app, page, 'GIFT-ACTIVE', 'GIFT-ACTIVE เริ่ม ฿2,000', 2000);
    });
    await app.login(page, 'U04');
    await test.step('2. U04 จอง S05 รอบ 12:00 ใช้ GIFT-ACTIVE แล้วตรวจยอด', async () => {
      await booking.toSummary({ service: 'S05', date: APPT_DATE, time: '12:00' });
      await booking.giftCard('GIFT-ACTIVE');
      await checkPay(app, booking, 'ครั้งที่ 1 จ่าย ฿0', 0);
      await confirmBooking(app, booking, 'ครั้งที่ 1');
      await checkGift(app, page, 'GIFT-ACTIVE', 'ครั้งที่ 1 บัตรเหลือ ฿1,200', 1200);
    });
    await test.step('3. U04 จอง S05 รอบ 14:00 ใช้บัตรเดิม แล้วตรวจยอดและรีโหลด', async () => {
      await booking.toSummary({ service: 'S05', date: APPT_DATE, time: '14:00' });
      await booking.giftCard('GIFT-ACTIVE');
      await checkPay(app, booking, 'ครั้งที่ 2 จ่าย ฿0', 0);
      await confirmBooking(app, booking, 'ครั้งที่ 2');
      await checkGiftTwice(app, page, 'GIFT-ACTIVE', 'ครั้งที่ 2 บัตรเหลือ ฿400', 400);
    });
  });
  await guard(app, page, 'GIFT-BAL-1', async () => {
    await test.step('4. รีเซ็ต จอง S01 ด้วย GIFT-BAL-1 ตรวจยอด ร้านกดเสร็จ ดูแต้ม U04', async () => {
      await app.lockAndReset(LOCK);
      await app.login(page, 'U04');
      await booking.toSummary({ service: 'S01', date: APPT_DATE, time: '12:00' });
      await booking.giftCard('GIFT-BAL-1');
      await checkPay(app, booking, 'GIFT-BAL-1 จ่าย ฿999', 999);
      const code = await confirmBooking(app, booking, 'GIFT-BAL-1');
      await checkGift(app, page, 'GIFT-BAL-1', 'GIFT-BAL-1 บัตรเหลือ ฿0', 0);
      if (code) {
        await ownerComplete(app, code, 999);
        await checkAccount(app, page, 'GIFT-BAL-1 ฐาน ฿999', { points: 9 });
      }
    });
  });
  await guard(app, page, 'GIFT-BAL-0', async () => {
    await test.step('5. รีเซ็ต จอง S01 กรอก GIFT-BAL-0 ดูข้อความและยอดจ่าย แล้วตรวจยอดบัตร', async () => {
      await app.lockAndReset(LOCK);
      await app.login(page, 'U04');
      await booking.toSummary({ service: 'S01', date: APPT_DATE, time: '12:00' });
      await booking.giftCard('GIFT-BAL-0');
      await checkBookingError(app, page, 'GIFT-BAL-0 แจ้งว่าบัตรไม่มีมูลค่าเหลือ', /ไม่มีมูลค่าเหลือ/);
      await checkPay(app, booking, 'GIFT-BAL-0 ยอดจ่ายยัง ฿1,000', 1000);
      await checkNoGiftDeduct(app, booking, 'GIFT-BAL-0 ไม่เกิดการหักบัตร');
      await checkGift(app, page, 'GIFT-BAL-0', 'GIFT-BAL-0 บัตรยัง ฿0', 0);
    });
  });
});

// ---------------------------------------------------------------- TC-GIFT-05

test('TC-GIFT-05 ลูกค้า 2 คนจองพร้อมกันด้วยบัตรใบเดียว ห้ามหักเกินยอด', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'ทุกรอบ: สำเร็จ 1 ราย อีกรายถูกปฏิเสธและมีข้อความแจ้งว่าใช้บัตรไม่ได้หรือยอดเปลี่ยน\nกรณี ก: บัตร ฿1,000 − ฿800 = เหลือ ฿200 (ถ้าหักซ้อนจะได้ −฿600 หรือหักรวม ฿1,600)\nกรณี ข: บัตร ฿1,000 − ฿1,000 = เหลือ ฿0 (ถ้าหักซ้อนจะได้ −฿1,000 หรือหักรวม ฿2,000)\nคนที่ถูกปฏิเสธ: ไม่มีคิวใหม่ในหลังร้าน · แต้ม U03 ยัง 250 · แต้ม U04 ยัง 0\nหลังร้านมีคิวใหม่จากการทดสอบ 1 คิวต่อรอบ',
    source: '[R] · [D] §4 ราคา',
    frbr: 'BR-33, FR-49',
    rules: 'R51',
    technique: 'Negative, State',
    timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  const other = await app.actor('U03');
  const bookingB = new BookingHelper(app, other.page);
  const cases = [
    { name: 'ก', service: 'S05', left: 200 },
    { name: 'ข', service: 'S01', left: 0 },
  ];
  let first = true;
  for (const c of cases) {
    for (let round = 1; round <= 5; round++) {
      const tag = `กรณี ${c.name} รอบ ${round}`;
      await guard(app, page, tag, async () => {
        if (!first) await app.lockAndReset(LOCK);
        first = false;
        const owner = await app.ownerRelogin();
        const admin = await app.admin(owner);
        await admin.open(APPT_DATE);
        const before = await admin.codes();

        await test.step(`${tag} · 1. ทั้ง 2 context จองจนถึงหน้าสรุป กรอก GIFT-1000 จนเห็นยอดจ่าย ฿0`, async () => {
          await Promise.all([app.login(page, 'U04'), app.login(other.page, 'U03')]);
          await Promise.all([
            booking.toSummary({ service: c.service, date: APPT_DATE, time: '12:00' }),
            bookingB.toSummary({ service: c.service, date: APPT_DATE, time: '14:00' }),
          ]);
          await Promise.all([booking.giftCard('GIFT-1000'), bookingB.giftCard('GIFT-1000')]);
          await checkPay(app, booking, `${tag} U04 เห็นยอดจ่าย ฿0`, 0);
          await checkPay(app, bookingB, `${tag} U03 เห็นยอดจ่าย ฿0`, 0);
        });

        const settleConfirm = (b: BookingHelper) =>
          b.confirm()
            .then((r) => ({ code: r.code, status: r.request.responseStatus }))
            .catch((e: unknown) => ({ code: null as string | null, status: -1, error: String(e).slice(0, 200) }));
        let a: { code: string | null; status: number } = { code: null, status: -1 };
        let b: { code: string | null; status: number } = { code: null, status: -1 };
        await test.step(`${tag} · 2. กดยืนยันพร้อมกัน`, async () => {
          [a, b] = await Promise.all([settleConfirm(booking), settleConfirm(bookingB)]);
        });
        const winners = [a, b].filter((r) => r.code);
        const winnerCode = winners[0]?.code ?? null;

        await test.step(`${tag} · 3. บันทึกผลของแต่ละคน และตรวจยอดบัตร`, async () => {
          await app.checkValue(page, `${tag} สำเร็จ 1 ราย อีกรายถูกปฏิเสธ`, { U04: a, U03: b }, () => {
            expect.soft(winners.length, `${tag} จำนวนผู้จองสำเร็จ`).toBe(1);
          });
          if (winners.length === 1) {
            const loser = a.code ? { page: other.page, res: b } : { page, res: a };
            await app.checkValue(loser.page, `${tag} คนที่ถูกปฏิเสธได้สถานะ 4xx`, loser.res.status, (v) => {
              expect.soft(v).toBeGreaterThanOrEqual(400);
              expect.soft(v).toBeLessThan(500);
            });
            const msg = loser.page.locator('[data-testid^="error-"], [data-testid="booking-quote-stale"]').first();
            await app.check(msg, `${tag} คนที่ถูกปฏิเสธเห็นข้อความใช้บัตรไม่ได้หรือยอดเปลี่ยน`, async (el) => {
              await expect.soft(el).toContainText(/บัตร|Gift Card|ยอด|ราคา/i, { timeout: 3_000 });
            });
          }
          await checkGift(app, page, 'GIFT-1000', `${tag} บัตรเหลือ ฿${c.left}`, c.left);
        });

        await test.step(`${tag} · 4. ตรวจคิวของทั้งคู่ในหลังร้าน แล้วรีโหลด`, async () => {
          await admin.open(APPT_DATE);
          const after = await admin.codes();
          const added = after.filter((x) => !before.includes(x));
          await app.checkValue(owner, `${tag} หลังร้านมีคิวใหม่ 1 คิว`, added, (v) => {
            expect.soft(v.length, `${tag} คิวใหม่`).toBe(1);
            if (winnerCode) expect.soft(v, `${tag} คิวใหม่ต้องเป็นของผู้ชนะ`).toContain(winnerCode);
          });
          await admin.open(APPT_DATE);
          await app.checkValue(owner, `${tag} หลังรีโหลด คิวใหม่ยัง 1 คิว`, (await admin.codes()).filter((x) => !before.includes(x)), (v) => {
            expect.soft(v.length, `${tag} คิวใหม่หลังรีโหลด`).toBe(1);
          });
          await checkAccount(app, page, `${tag} U04`, { points: 0 }, false);
          await checkAccount(app, other.page, `${tag} U03`, { points: 250 }, false);
          await checkGift(app, page, 'GIFT-1000', `${tag} บัตรเหลือ ฿${c.left} หลังรีโหลด`, c.left);
        });
      });
    }
  }
});

// ---------------------------------------------------------------- TC-GIFT-06

test('TC-GIFT-06 บัตรใช้ได้ถึงวันที่ 365 วันซื้อเป็นวันที่ 0 ตรวจจากวันจอง ไม่ใช่วันนัด', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'GIFT-EXP364 วันที่ 364: ใช้ได้ · ฿1,000 − ฿1,000 = จ่าย ฿0 · บัตรเหลือ ฿0\nGIFT-EXP365 วันที่ 365: ใช้ได้ · จ่าย ฿0 · บัตรเหลือ ฿0 (ถ้านับวันซื้อเป็นวันที่ 1 จะกลายเป็นวันที่ 366 และถูกปฏิเสธ)\nGIFT-EXP366 วันที่ 366: มีข้อความว่าหมดอายุ · ยอดจ่ายยัง ฿1,000 · บัตรยัง ฿1,000 · ไม่เกิดการหักบัตร\nGIFT-EXP365 นัด 15 ก.ค. 2026: ใช้ได้ · จ่าย ฿0 · บัตรเหลือ ฿0 (ถ้าตรวจจากวันนัดจะถูกปฏิเสธ เพราะบัตรหมดอายุ 15 มิ.ย. 2026)',
    source: '[D] §4 Gift Card · [D][R] E205–E207 · [R] ⚠️D-06 · [R] ⚠️A-30 · F-ร้าน 13',
    frbr: 'BR-44, BR-45',
    rules: 'R75',
    technique: 'Boundary',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(360_000);
  const rows = [
    { name: 'GIFT-EXP364 นัด 17 มิ.ย.', card: 'GIFT-EXP364', date: APPT_DATE, ok: true },
    { name: 'GIFT-EXP365 นัด 17 มิ.ย.', card: 'GIFT-EXP365', date: APPT_DATE, ok: true },
    { name: 'GIFT-EXP366 นัด 17 มิ.ย.', card: 'GIFT-EXP366', date: APPT_DATE, ok: false },
    { name: 'GIFT-EXP365 นัด 15 ก.ค.', card: 'GIFT-EXP365', date: '2026-07-15', ok: true },
  ];
  for (const [i, row] of rows.entries()) {
    await guard(app, page, row.name, async () => {
      await test.step(`${row.name} · 1. เข้าระบบ U04 จอง S01`, async () => {
        if (i > 0) await app.lockAndReset(LOCK);
        await app.login(page, 'U04');
        await booking.toSummary({ service: 'S01', date: row.date, time: '12:00' });
      });
      await test.step(`${row.name} · 2. กรอกบัตร ดูข้อความและยอดจ่าย`, async () => {
        await booking.giftCard(row.card);
        if (row.ok) {
          await checkPay(app, booking, `${row.name} ใช้ได้ จ่าย ฿0`, 0);
        } else {
          await checkBookingError(app, page, `${row.name} มีข้อความว่าหมดอายุ`, /หมดอายุ/);
          await checkPay(app, booking, `${row.name} ยอดจ่ายยัง ฿1,000`, 1000);
          await checkNoGiftDeduct(app, booking, `${row.name} ไม่เกิดการหักบัตร`);
        }
      });
      await test.step(`${row.name} · 3. ถ้าบัตรผ่าน กดยืนยัน แล้วตรวจยอดบัตร`, async () => {
        if (row.ok) await confirmBooking(app, booking, row.name);
        const left = row.ok ? 0 : 1000;
        await checkGiftTwice(app, page, row.card, `${row.name} บัตรเหลือ ฿${left.toLocaleString('en-US')}`, left);
      });
    });
  }
});

// ---------------------------------------------------------------- TC-GIFT-07

test('TC-GIFT-07 รหัสพิมพ์เล็กใช้ได้ทั้งจองและตรวจยอด กรอกรหัสผิดแล้วลบจนว่าง error ต้องหาย', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'ขั้น 1: เห็นยอด ฿2,000 ของบัตรเดียวกับ GIFT-ACTIVE (ถ้าขึ้นว่าไม่พบบัตร ถือว่าไม่ผ่าน)\nขั้น 2: มี error ว่าไม่พบบัตร · ยอดจ่ายยัง ฿800\nขั้น 3: error หายทันที · ปุ่มยืนยันกดได้ · ยอดจ่าย ฿800 (ถ้า error ค้าง ปุ่มยืนยันจะปิด)\nขั้น 4: ฿800 − ฿800 = จ่าย ฿0\nขั้น 5: บัตร ฿2,000 − ฿800 = ฿1,200',
    source: '[R] · F-ร้าน 7',
    frbr: 'FR-29, FR-49',
    rules: 'R52, R53',
    technique: 'Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  const pending = (description: string) => test.info().annotations.push({ type: 'pending-answer', description });
  await test.step('1. ตรวจยอดด้วย gift-active (รอคำตอบร้าน F-ร้าน 7)', async () => {
    const g = await app.readGiftCard(page, 'gift-active');
    const actual = g.found ? `พบบัตร ยอด ฿${g.balance}` : `ไม่พบบัตร: ${g.errorText.slice(-80)}`;
    pending(`TC-GIFT-07 ขั้น 1 ตรวจยอดรหัสพิมพ์เล็ก: ${actual}`);
    await app.checkValue(page, 'ขั้น 1 ตรวจยอดด้วย gift-active (รอคำตอบร้าน ไม่นับเป็นข้อล้ม)', actual, () => {});
  });
  await guard(app, page, 'ขั้น 2-5', async () => {
    await app.login(page, 'U04');
    await booking.toSummary({ service: 'S05', date: APPT_DATE, time: '12:00' });
    await test.step('2. กรอก GIFT-NOPE แล้วกดใช้ ดู error และปุ่มยืนยัน', async () => {
      await booking.giftCard('GIFT-NOPE');
      await checkBookingError(app, page, 'ขั้น 2 มี error ว่าไม่พบบัตร', /ไม่พบ/);
      await checkPay(app, booking, 'ขั้น 2 ยอดจ่ายยัง ฿800', 800);
    });
    await test.step('3. ลบช่องจนว่าง ดู error ปุ่มยืนยัน และยอดจ่าย', async () => {
      await booking.el('booking-giftcard-code').fill('');
      await app.check(booking.el('booking-screen-3'), 'ขั้น 3 error หายทันที', async (el) => {
        await expect.soft(el.locator('[data-testid^="error-"]'), 'error ต้องหายเมื่อลบช่องจนว่าง').toHaveCount(0, { timeout: 1_000 });
      });
      await app.check(booking.confirmButton(), 'ขั้น 3 ปุ่มยืนยันกดได้', async (el) => {
        await expect.soft(el).toBeEnabled({ timeout: 1_000 });
      });
      await checkPay(app, booking, 'ขั้น 3 ยอดจ่าย ฿800', 800);
    });
    let applied = false;
    await test.step('4. กรอก gift-active แล้วกดใช้ ดูยอดจ่าย (รอคำตอบร้าน F-ร้าน 7)', async () => {
      await booking.giftCard('gift-active');
      const pay = await booking.pay();
      applied = pay === 0;
      pending(`TC-GIFT-07 ขั้น 4 จองด้วยรหัสพิมพ์เล็ก: ยอดจ่าย ฿${pay}`);
      await app.checkValue(page, 'ขั้น 4 ยอดจ่ายหลังกรอก gift-active (รอคำตอบร้าน ไม่นับเป็นข้อล้ม)', pay, () => {});
    });
    await test.step('5. ยืนยันการจอง แล้วตรวจยอดด้วยรหัส GIFT-ACTIVE และรีโหลด', async () => {
      if (applied) {
        await confirmBooking(app, booking, 'ขั้น 5');
        await checkGiftTwice(app, page, 'GIFT-ACTIVE', 'ขั้น 5 บัตรเหลือ ฿1,200', 1200);
      } else {
        const g = await app.readGiftCard(page, 'GIFT-ACTIVE');
        pending(`TC-GIFT-07 ขั้น 5 ไม่ได้จองเพราะรหัสพิมพ์เล็กไม่ถูกรับ: GIFT-ACTIVE ยอด ฿${g.balance}`);
        await app.checkValue(page, 'ขั้น 5 ยอด GIFT-ACTIVE (รอคำตอบร้าน ไม่นับเป็นข้อล้ม)', g.balance, () => {});
      }
    });
  });
});

// ---------------------------------------------------------------- TC-GIFT-08

test('TC-GIFT-08 มูลค่าบัตร ฿500–฿10,000 จำนวนเต็ม บังคับทั้งหน้าจอและ API', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: '฿499, ฿10,001, ฿2,149.99, ฿2,150.50: หน้าเว็บไม่ออกบัตร · API ถูกปฏิเสธด้วยสถานะ 4xx · ไม่มีรหัสบัตรใหม่ · ยอด ฿9,999 · แต้ม 250\n฿500, ฿501, ฿2,150, ฿9,999, ฿10,000: ได้รหัสบัตรใหม่ · ตรวจยอดได้เท่ามูลค่าที่ซื้อตรงทุกค่า\nไม่มี session: บันทึกผล ไม่นับเป็น P1 จนกว่าร้านจะตอบข้อ 8.3 · ถ้าร้านตอบว่าต้องเป็นสมาชิก ต้องได้ 401/403 และไม่มีรหัสบัตรใหม่\nหลังซื้อครบ U03 ยอด ฿9,999 ระดับ Silver (฿9,999 + ฿0 · ถ้านับยอดซื้อบัตรจะได้ ฿33,149 และกลายเป็น Platinum)',
    source: '[D] บ.18 · [D] §4 Gift Card · [D] §4 แต้มและระดับ · [D][R] E196–E204, E110',
    frbr: 'BR-41, BR-42, BR-43, BR-23, FR-47',
    rules: 'R73',
    technique: 'Boundary, Security',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  test.setTimeout(480_000);
  let captured: CapturedRequest | undefined;
  await test.step('1. U03 ซื้อด้วย ฿500 เพื่อดึง URL จาก Network แล้วรีเซ็ต', async () => {
    await app.login(page, 'U03');
    try {
      captured = await buy(app, page, { amount: '500', design: 'ORCHID', channel: 'LINE' });
    } catch (e: unknown) {
      throw new Error(`Blocked: ดึง URL ซื้อบัตรจาก Network ไม่ได้ ${String(e).slice(0, 200)}`);
    }
    await app.lockAndReset(LOCK);
    await app.login(page, 'U03');
  });
  const req = captured;
  if (!req) throw new Error('Blocked: ไม่ได้คำขอซื้อบัตรจาก Network');

  const rejected = ['499', '10001', '2149.99', '2150.50'];
  let created = 0;
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && new URL(r.url()).pathname === GIFT_API && r.ok()) created++;
  });

  await test.step('2. กรอกค่าที่ต้องถูกปฏิเสธบนหน้าเว็บทีละค่า', async () => {
    for (const value of rejected) {
      await guard(app, page, `หน้าเว็บ ฿${value}`, async () => {
        await app.goto(page, '/th/gift-cards');
        await fillBuy(page, { amount: value });
        await page.getByTestId('giftcard-submit').click();
        await page.waitForTimeout(400);
        await checkNoCardIssued(app, page, `หน้าเว็บ ฿${value} ไม่ออกบัตร`);
      });
    }
    await app.checkValue(page, 'หน้าเว็บ ค่าที่ผิดทุกค่าไม่ได้สร้างบัตรใหม่', created, (v) => {
      expect.soft(v).toBe(0);
    });
  });

  await test.step('3. ยิงค่าเดียวกันซ้ำด้วย Playwright request', async () => {
    for (const value of rejected) {
      for (const amount of [value, Number(value)]) {
        const res = await app.replay(page, req, { amount });
        const kind = typeof amount === 'string' ? 'ข้อความ' : 'ตัวเลข';
        await app.checkValue(page, `API ฿${value} (ส่งเป็น${kind}) ถูกปฏิเสธ 4xx เพราะมูลค่าไม่ถูกต้อง`, { status: res.status, error: res.body?.error ?? null }, (v) => {
          expect.soft(v.status, `API ฿${value} สถานะ`).toBeGreaterThanOrEqual(400);
          expect.soft(v.status, `API ฿${value} สถานะ`).toBeLessThan(500);
          expect.soft(String(v.error?.message ?? ''), `API ฿${value} เหตุต้องเป็นเรื่องมูลค่า`).toMatch(/มูลค่า/);
        });
      }
    }
    await checkAccount(app, page, 'หลังถูกปฏิเสธครบ U03', { spend: 9999, points: 250 });
  });

  await test.step('4. ซื้อค่าที่ต้องผ่านบนหน้าเว็บทีละค่า ตรวจยอดบัตรใหม่', async () => {
    for (const value of [500, 501, 2150, 9999, 10000]) {
      await guard(app, page, `ซื้อ ฿${value}`, async () => {
        await buy(app, page, { amount: String(value) });
        const code = (await textOf(page.getByTestId('giftcard-result-code'))).trim();
        await app.check(page.getByTestId('giftcard-result-code'), `ซื้อ ฿${value} ได้รหัสบัตรใหม่`, async () => {
          expect.soft(code, `ซื้อ ฿${value} ต้องได้รหัสบัตร`).toMatch(/^GIFT-/);
        });
        if (code) await checkGift(app, page, code, `ซื้อ ฿${value} ยอดบัตรตรงมูลค่า`, value);
      });
    }
  });

  await test.step('5. ยิงซ้ำค่า ฿500 โดยไม่มี session (รอคำตอบร้านข้อ 8.3)', async () => {
    const res = await app.replay(await app.guestApi(), req, { amount: '500' });
    const actual = `สถานะ ${res.status} รหัส ${res.body?.giftCard?.code ?? '-'}`;
    test.info().annotations.push({ type: 'pending-answer', description: `TC-GIFT-08 ซื้อโดยไม่มี session: ${actual}` });
    await app.checkValue(page, 'ยิง ฿500 ไม่มี session (รอคำตอบร้าน ไม่นับเป็นข้อล้ม)', actual, () => {});
  });

  await test.step('6. ดูยอดสะสม U03 แล้วรีโหลด', async () => {
    await checkAccount(app, page, 'หลังซื้อครบ U03', { spend: 9999, tier: /Silver|ซิลเวอร์/i });
  });
});

// ---------------------------------------------------------------- TC-GIFT-09

test('TC-GIFT-09 ค่าผิดรูปแบบในช่องมูลค่าต้องเตือนก่อนส่ง ตัวอย่างบัตรไม่แสดงค่าผิด', {
  tag: ['@P2', '@5.6'],
  annotation: plan({
    expected: '`abc`, `-500`, `0`: มีคำเตือนที่ช่องมูลค่าก่อนส่ง · ไม่มี request ซื้อบัตร · ไม่ออกบัตร · ตัวอย่างบัตรไม่แสดง "฿abc" หรือ "฿-500"\n`1e3`: มีคำเตือนก่อนส่ง · ไม่ออกบัตร ฿1,000\n`1,000`: มีคำเตือนก่อนส่ง หรือถ้า F-สร้าง 20 ตอบว่ารับ ต้องออกบัตร ฿1,000 · ห้ามดูปกติแล้วส่งไม่ผ่าน\nทุกค่าที่ถูกเตือน: ไม่มีรหัสบัตรใหม่ · ยอด U03 ฿9,999 · แต้ม 250',
    source: '[R] · F-สร้าง 20',
    frbr: 'BR-41, BR-43, FR-47',
    rules: 'R74',
    technique: 'Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  await test.step('1. U03 เปิด /gift-cards และเปิดดู Network', async () => {
    await app.login(page, 'U03');
    await app.goto(page, '/th/gift-cards');
  });
  const warning = page.getByTestId('giftcard-form').locator('[role="alert"], [data-testid^="error-"]');

  for (const value of ['1,000', 'abc', '-500', '0', '1e3']) {
    await guard(app, page, `มูลค่า ${value}`, async () => {
      await test.step(`มูลค่า ${value} · 2. พิมพ์ค่า แล้วดูตัวอย่างบัตรก่อนกดซื้อ`, async () => {
        await fillBuy(page, { amount: value });
        await app.check(page.getByTestId('giftcard-preview'), `มูลค่า ${value} ตัวอย่างบัตรไม่แสดงค่าผิด`, async (el) => {
          await expect.soft(el, 'ตัวอย่างบัตรห้ามแสดง ฿abc').not.toContainText(/฿\s*abc/);
          await expect.soft(el, 'ตัวอย่างบัตรห้ามแสดง ฿-500').not.toContainText(/฿\s*-\s*500/);
        });
      });
      await test.step(`มูลค่า ${value} · 3. กดซื้อ ดูข้อความและ request`, async () => {
        const before = buyPosts(app, page);
        await page.getByTestId('giftcard-submit').click();
        await page.waitForTimeout(400);
        const sent = buyPosts(app, page) - before;
        const warned = await warning.first().isVisible().catch(() => false);
        const issued = await page.getByTestId('giftcard-result').isVisible().catch(() => false);

        if (value === '1,000' && issued) {
          await app.check(page.getByTestId('giftcard-result-value'), 'มูลค่า 1,000 ออกบัตร ฿1,000', async (el) => {
            expect.soft(lineAmount(await textOf(el)), 'ค่า 1,000 ต้องออกบัตร ฿1,000 เท่านั้น').toBe(1000);
          });
          return;
        }
        await app.check(warning.first(), `มูลค่า ${value} มีคำเตือนที่ช่องมูลค่า`, async (el) => {
          await expect.soft(el, `มูลค่า ${value} ต้องมีคำเตือน`).toBeVisible({ timeout: 1_500 });
          await expect.soft(el, `มูลค่า ${value} คำเตือนต้องเรื่องมูลค่า`).toContainText(/มูลค่า/, { timeout: 500 });
        });
        await app.checkValue(page, `มูลค่า ${value} ไม่มี request ซื้อบัตร`, { sent, warned }, (v) => {
          expect.soft(v.sent, `มูลค่า ${value} ต้องเตือนก่อนส่ง`).toBe(0);
        });
        await checkNoCardIssued(app, page, `มูลค่า ${value} ไม่ออกบัตร`);
      });
      await test.step(`มูลค่า ${value} · 4. ล้างช่อง`, async () => {
        await app.goto(page, '/th/gift-cards');
      });
    });
  }

  await test.step('5. ดูยอดสะสมและแต้ม U03 แล้วรีโหลด', async () => {
    await checkAccount(app, page, 'U03', { spend: 9999, points: 250 });
  });
});

// ---------------------------------------------------------------- TC-GIFT-10

test('TC-GIFT-10 ซื้อบัตรเปิดใช้ทันที ส่งแบบจำลอง วันหมดอายุถูก ยอดสะสมไม่เพิ่ม ใช้บัตรจ่ายค่าบัตรหรือคอร์สไม่ได้', {
  tag: ['@P1', '@5.6'],
  annotation: plan({
    expected: 'ข้อความจำลอง: มูลค่า ฿2,000 ลายบัว หมดอายุ 15 มิ.ย. 2027 (15 มิ.ย. 2026 + 365 · ถ้านับวันซื้อเป็นวันที่ 1 จะได้ 14 มิ.ย. 2027)\nไม่มี request ออกนอกเว็บไป LINE หรือ email\nรหัสใหม่: ยอด ฿2,000 ใช้ได้ทันที หมดอายุ 15 มิ.ย. 2027 · บัตร email ยอด ฿1,000 หมดอายุ 15 มิ.ย. 2027\nหน้าซื้อบัตรและหน้าซื้อคอร์สไม่มีช่องจ่ายด้วยบัตร · การยิงพร้อม GIFT-ACTIVE ต้องไม่หักบัตร ไม่ว่าจะถูกปฏิเสธด้วยสถานะ 4xx หรือไม่สนใจรหัสที่แนบ · GIFT-ACTIVE ยัง ฿2,000 (ถ้าหักบัตรจะเหลือ ฿0)\nยอด U03 ยัง ฿9,999 ระดับ Silver (ถ้านับยอดซื้อจะได้ ฿12,999 และเป็น Gold)',
    source: '[D] §4 Gift Card · [D][R] E253 · [R] ⚠️A-30 · [R] ⚠️A-08 · [R] ⚠️A-27',
    frbr: 'FR-30, FR-47, FR-48, FR-50, BR-23, BR-45',
    rules: 'R76, R84',
    technique: 'Happy path, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  test.setTimeout(360_000);
  const origin = new URL(app.baseURL).origin;
  const SENDER_RE = /line\.(me|biz)|lineapp|line-apps|mail|smtp|sendgrid|mailgun|resend/i;

  const checkPurchase = async (o: { label: string; form: BuyForm; value: number; designRe: RegExp }): Promise<{ req: CapturedRequest; code: string }> => {
    const start = app.requestsOf(page).length;
    const req = await buy(app, page, o.form);
    const amountRe = new RegExp(`฿${o.value.toLocaleString('en-US')}(?![\\d,])`);
    await app.check(page.getByTestId('giftcard-result-message'), `${o.label} ข้อความจำลองบอกมูลค่า ลาย และวันหมดอายุ`, async (el) => {
      await expect.soft(el, `${o.label} มูลค่าในข้อความ`).toContainText(amountRe);
      await expect.soft(el, `${o.label} ลายในข้อความ`).toContainText(o.designRe);
      await expect.soft(el, `${o.label} วันหมดอายุในข้อความ`).toContainText(EXP_2027);
    });
    const external = app.requestsOf(page).slice(start).filter((r) => {
      const u = new URL(r.url);
      if (!/^https?:$/.test(u.protocol) || u.origin === origin) return false;
      return r.method !== 'GET' || SENDER_RE.test(r.url);
    });
    await app.checkValue(page, `${o.label} ไม่มี request ออกนอกเว็บไป LINE หรือ email`, external.map((r) => `${r.method} ${r.url}`), (v) => {
      expect.soft(v).toEqual([]);
    });
    const code = (await textOf(page.getByTestId('giftcard-result-code'))).trim();
    await app.check(page.getByTestId('giftcard-result-code'), `${o.label} ได้รหัสบัตรใหม่`, async () => {
      expect.soft(code, `${o.label} รหัสบัตร`).toMatch(/^GIFT-/);
    });
    return { req, code };
  };

  const checkNewCard = async (label: string, code: string, value: number) => {
    for (const when of ['ทันที', 'หลังรีโหลด']) {
      const g = await checkGift(app, page, code, `${label} ยอด ฿${value.toLocaleString('en-US')} (${when})`, value);
      await app.check(page.getByTestId('giftcard-check-status'), `${label} ใช้ได้ทันที (${when})`, async (el) => {
        await expect.soft(el).toContainText(/ใช้งานได้|ใช้ได้/, { timeout: 1_000 });
      });
      await app.check(page.getByTestId('giftcard-check-expires'), `${label} หมดอายุ 15 มิ.ย. 2027 (${when})`, async () => {
        expect.soft(g.expires).toMatch(EXP_2027);
      });
    }
  };

  let firstReq: CapturedRequest | undefined;
  await test.step('1-2. U03 ซื้อ ฿2,000 ลายบัว ส่ง LINE อ่านข้อความจำลอง ตรวจรายการ request', async () => {
    await app.login(page, 'U03');
    try {
      const r = await checkPurchase({ label: 'LINE ฿2,000', form: { amount: '2000', design: 'LOTUS', channel: 'LINE' }, value: 2000, designRe: /บัว/ });
      firstReq = r.req;
      await test.step('3. ตรวจรหัสใหม่ที่ /gift-cards แล้วรีโหลด', async () => {
        if (r.code) await checkNewCard('LINE', r.code, 2000);
      });
    } catch (e: unknown) {
      throw new Error(`Blocked: ซื้อบัตรเพื่อดึง URL จาก Network ไม่ได้ ${String(e).slice(0, 200)}`);
    }
  });

  await test.step('4. ซื้อ ฿1,000 ลายทอง ส่ง email แล้วตรวจแบบเดียวกัน', async () => {
    await guard(app, page, 'ซื้อ email', async () => {
      const r = await checkPurchase({ label: 'email ฿1,000', form: { amount: '1000', design: 'GOLD', channel: 'EMAIL' }, value: 1000, designRe: /ทอง/ });
      if (r.code) await checkNewCard('email', r.code, 1000);
    });
  });

  await test.step('5. ดูหน้าซื้อบัตรและหน้าซื้อคอร์สว่ามีช่องจ่ายด้วยบัตรไหม', async () => {
    await app.goto(page, '/th/gift-cards');
    await app.check(page.getByTestId('giftcard-form'), 'หน้าซื้อบัตรไม่มีช่องจ่ายด้วยบัตร', async (el) => {
      await expect.soft(el, 'ต้องเห็นฟอร์มซื้อบัตร').toBeVisible();
      await expect.soft(el.locator(PAY_WITH_GIFT_FIELD), 'ช่องจ่ายด้วยบัตรในฟอร์มซื้อบัตร').toHaveCount(0);
    });
    await guard(app, page, 'หน้าซื้อคอร์ส', async () => {
      await app.goto(page, '/th/wallet');
      const openBuy = page.getByTestId('wallet-buy-course');
      if (await openBuy.first().isVisible().catch(() => false)) {
        await openBuy.first().click();
        await page.getByTestId('wallet-buy-confirm-panel').waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
      }
      const panel = page.locator('[data-testid="wallet-buy-confirm-panel"], [data-testid="wallet-buy-panel"]');
      await app.check(panel, 'หน้าซื้อคอร์สไม่มีช่องจ่ายด้วยบัตร', async (el) => {
        await expect.soft(el.first(), 'ต้องเห็นแผงซื้อคอร์ส').toBeVisible({ timeout: 1_000 });
        await expect.soft(el.locator(PAY_WITH_GIFT_FIELD), 'ช่องจ่ายด้วยบัตรในแผงซื้อคอร์ส').toHaveCount(0);
      });
    });
  });

  await test.step('6. ยิง URL ซื้อบัตรซ้ำโดยเพิ่มรหัส GIFT-ACTIVE ใน body แล้วตรวจยอด', async () => {
    const req = firstReq;
    if (!req) throw new Error('Blocked: ไม่ได้คำขอซื้อบัตรจาก Network');
    const res = await app.replay(page, req, { amount: '2000', giftCardCode: 'GIFT-ACTIVE', giftCard: 'GIFT-ACTIVE', code: 'GIFT-ACTIVE' });
    await app.checkValue(page, 'ยิงพร้อม GIFT-ACTIVE ไม่เกิด error ฝั่งเซิร์ฟเวอร์', res.status, (v) => {
      expect.soft(v).toBeLessThan(500);
    });
    await checkGift(app, page, 'GIFT-ACTIVE', 'GIFT-ACTIVE ยัง ฿2,000', 2000);
  });

  await test.step('7. ดูยอดสะสม U03', async () => {
    await checkAccount(app, page, 'U03', { spend: 9999, tier: /Silver|ซิลเวอร์/i });
  });
});
