/**
 * หัวข้อ 5.3 ราคา แต้ม ระดับสมาชิก และเดือนเกิด (TC-PRICE-01 ถึง TC-PRICE-10)
 * ตัวเลขทั้งหมดมาจาก TEST-PLAN.md บรรทัด 559-743 ห้ามเปลี่ยนตามที่เว็บแสดง
 */
import type { Page } from '@playwright/test';
import { test, expect, plan, LOCK, lineAmount, money, BookingHelper, type App, type ApiResult, type UserKey } from '../fixtures';

const DATE = '2026-06-17';
const LINE_SELECTOR = '[data-testid^="booking-line-"], [data-testid="booking-pay-at-shop"]';

type Want = Partial<Record<'full' | 'pct' | 'discount' | 'points' | 'transport' | 'giftcard' | 'pay', number>>;

/** อ่านบรรทัดราคาหลังคำนวณเสร็จ แล้วเทียบเลขเต็มเฉพาะช่องที่ระบุ */
async function checkLines(app: App, booking: BookingHelper, label: string, want: Want) {
  const l = await booking.lines();
  const pctMatch = /(\d+)\s*%/.exec(l.discountText);
  const all: Required<Want> = {
    full: l.full,
    pct: pctMatch ? Number(pctMatch[1]) : NaN,
    discount: l.discount,
    points: l.points,
    transport: l.transport,
    giftcard: l.giftcard,
    pay: l.pay,
  };
  const actual: Want = {};
  for (const k of Object.keys(want) as (keyof Want)[]) actual[k] = all[k];
  await app.check(booking.page.locator(LINE_SELECTOR), label, async () => {
    expect.soft(actual).toEqual(want);
  });
}

async function checkPay(app: App, booking: BookingHelper, label: string, want: number) {
  const pay = await booking.pay();
  await app.check(booking.el('booking-pay-at-shop'), label, async () => {
    expect.soft(pay).toBe(want);
  });
}

async function readSets(booking: BookingHelper): Promise<number> {
  await booking.quoteReady();
  // แผงแลกแต้มหุบเองได้หลังราคาเปลี่ยน ต้องเปิดก่อนอ่าน
  await booking.openPoints();
  return money(await booking.pointsValue().innerText());
}

async function checkSets(app: App, booking: BookingHelper, label: string, want: number) {
  const sets = await readSets(booking);
  await app.check(booking.pointsValue(), label, async () => {
    expect.soft(sets).toBe(want);
  });
}

/** กดยืนยันและบันทึกว่าการจองสำเร็จ · ไม่สำเร็จคืน code เป็น null โดยไม่หยุด test */
async function confirmBooking(app: App, booking: BookingHelper, label: string) {
  const result = await booking.confirm();
  await app.checkValue(booking.page, label, { status: result.request.responseStatus, code: result.code }, (v) => {
    expect.soft(v.status).toBeGreaterThanOrEqual(200);
    expect.soft(v.status).toBeLessThan(300);
  });
  return result;
}

/** ลองเลือกเดือนเกิดโดยไม่ทำให้ test หยุด · คืนว่าถูกเลือกอยู่จริงหลังกดหรือไม่ */
async function attemptBirthday(booking: BookingHelper): Promise<boolean> {
  const panelReachable = (await booking.el('booking-toggle-birthday').count()) > 0 || (await booking.birthdayBox().count()) > 0;
  if (!panelReachable) return false;
  await booking.openBirthday();
  const box = booking.birthdayBox();
  if (await box.isDisabled()) return false;
  await box.click();
  await booking.quoteReady();
  return box.isChecked();
}

/** คะแนนและรหัสนัดที่ยังมาไม่ถึงจาก /th/account */
async function snapshot(app: App, page: Page) {
  const acc = await app.readAccount(page);
  const codes = await page.locator('[data-testid^="account-booking-code-"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.testid!.replace('account-booking-code-', '')));
  return { points: acc.points, codes };
}

async function checkPoints(app: App, page: Page, label: string, want: number) {
  const acc = await app.readAccount(page);
  await app.check(page.getByTestId('account-points'), label, async () => {
    expect.soft(acc.points).toBe(want);
  });
}

/** ตรวจว่าแต้มและจำนวนนัดเท่าเดิมหลังถูกปฏิเสธ */
async function checkNoChange(app: App, page: Page, who: string, points: number, codes: string[]) {
  const after = await snapshot(app, page);
  await app.check(page.getByTestId('account-points'), `${who} ยัง ${points} แต้มหลังรีโหลด`, async () => {
    expect.soft(after.points).toBe(points);
  });
  await app.check(page.getByTestId('account-page'), `${who} ไม่มีนัดใหม่`, async () => {
    expect.soft([...after.codes].sort()).toEqual([...codes].sort());
  });
}

/** ยอดของนัดที่ /th/account หลังรีโหลด (แผน 7.3) */
async function checkAccountTotal(app: App, page: Page, code: string | null, label: string, want: number) {
  if (!code) return;
  await app.goto(page, '/th/account');
  const el = page.getByTestId(`account-booking-total-${code}`);
  const text = await el.innerText({ timeout: 5_000 }).catch(() => '');
  await app.check(el, label, async () => {
    expect.soft(lineAmount(text)).toBe(want);
  });
}

/** ยอดของนัดในหลังร้าน ใช้บัญชีร้านใน context แยก */
async function checkAdminPay(app: App, date: string, code: string | null, label: string, want: number) {
  if (!code) return;
  const admin = await app.admin();
  await admin.open(date);
  const el = admin.pay(code);
  const text = await el.innerText({ timeout: 5_000 }).catch(() => '');
  await app.check(el, label, async () => {
    expect.soft(lineAmount(text)).toBe(want);
  });
}

async function adminRowCount(app: App, date: string) {
  const admin = await app.admin();
  await admin.open(date);
  return admin.rowCount();
}

async function checkAdminRowCount(app: App, date: string, label: string, want: number) {
  const admin = await app.admin();
  await admin.open(date);
  const count = await admin.rowCount();
  await app.check(admin.page.getByTestId('admin-page'), label, async () => {
    expect.soft(count).toBe(want);
  });
}

/** คำขอต้องได้ 4xx เหตุตรงกฎ และไม่ใช่เพราะยอดไม่ตรง */
async function checkRejected(app: App, page: Page, label: string, res: ApiResult, reason: RegExp) {
  await app.checkValue(page, label, { status: res.status, body: res.text.slice(0, 400) }, (v) => {
    expect.soft(v.status).toBeGreaterThanOrEqual(400);
    expect.soft(v.status).toBeLessThan(500);
    expect.soft(v.body).not.toContain('price-changed');
    expect.soft(v.body).toMatch(reason);
  });
}

/** กด + ต่อถ้ายังกดได้ ต้องได้จำนวนเดิม แล้วคืนจำนวนชุดกลับเพื่อให้ขั้นถัดไปเดินต่อได้ */
async function checkIncBlocked(app: App, booking: BookingHelper, label: string, want: number) {
  const inc = booking.pointsInc();
  if (await inc.isEnabled()) {
    await inc.click();
    await booking.quoteReady();
  }
  await checkSets(app, booking, label, want);
  await reduceSetsTo(booking, want);
}

/** กด − จนเหลือจำนวนชุดที่ต้องการ */
async function reduceSetsTo(booking: BookingHelper, want: number) {
  for (let i = 0; i < 20; i++) {
    const sets = await readSets(booking);
    if (!(sets > want)) return;
    const dec = booking.pointsDec();
    if (await dec.isDisabled()) return;
    await dec.click();
    await booking.quoteReady();
  }
}

// ----------------------------------------------------------------------------------------------

test('TC-PRICE-01 ค่าขอบยอดสะสมของระดับ Gold และ Platinum', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      '฿9,999 U03: ลด 0% จ่าย ฿1,000 (ถ้าปัดยอดขึ้นเป็น Gold จะได้ ฿950)',
      '฿10,000 U08: ลด 5% (฿50) จ่าย ฿950 (ถ้าใช้เงื่อนไขมากกว่าแทนตั้งแต่จะได้ ฿1,000)',
      '฿10,001 U09: ลด 5% (฿50) จ่าย ฿950',
      '฿29,999 U05: ลด 5% (฿50) จ่าย ฿950 (ถ้าปัดยอดขึ้นเป็น Platinum จะได้ ฿900)',
      '฿30,000 U02: ลด 10% (฿100) จ่าย ฿900 (ถ้าใช้เงื่อนไขมากกว่าแทนตั้งแต่จะได้ ฿950)',
      '฿30,001 U10: ลด 10% (฿100) จ่าย ฿900',
      'นัดของ U08 ยังเป็น ฿950 และ U02 ยังเป็น ฿900 ทั้งหลังรีโหลดและในหลังร้าน',
    ].join('\n'),
    source: '[D] บ.15 · [D] §5 ยอดสะสม · [R] ⚠️TD-05',
    frbr: 'FR-27, FR-28, BR-21, BR-22',
    rules: '—',
    technique: 'Boundary, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);
  const rows: { user: UserKey; spend: string; pct: number; discount: number; pay: number }[] = [
    { user: 'U03', spend: '฿9,999', pct: 0, discount: 0, pay: 1000 },
    { user: 'U08', spend: '฿10,000', pct: 5, discount: 50, pay: 950 },
    { user: 'U09', spend: '฿10,001', pct: 5, discount: 50, pay: 950 },
    { user: 'U05', spend: '฿29,999', pct: 5, discount: 50, pay: 950 },
    { user: 'U02', spend: '฿30,000', pct: 10, discount: 100, pay: 900 },
    { user: 'U10', spend: '฿30,001', pct: 10, discount: 100, pay: 900 },
  ];

  await test.step('1-2. เข้าระบบทีละคน ไปหน้าสรุป S01 12:00 แล้วอ่านส่วนลดและยอด', async () => {
    for (const r of rows) {
      await app.login(page, r.user);
      await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
      await checkLines(app, booking, `${r.spend} ${r.user}: ลด ${r.pct}% (฿${r.discount}) จ่าย ฿${r.pay}`, {
        pct: r.pct, discount: r.discount, pay: r.pay,
      });
    }
  });

  let codeU08: string | null = null;
  let codeU02: string | null = null;
  await test.step('3. U08 ยืนยันรอบ 12:00 และ U02 ยืนยันรอบ 14:00', async () => {
    await app.login(page, 'U08');
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    codeU08 = (await confirmBooking(app, booking, 'U08 ยืนยันรอบ 12:00 สำเร็จ')).code;
    await app.login(page, 'U02');
    await booking.toSummary({ service: 'S01', date: DATE, time: '14:00' });
    codeU02 = (await confirmBooking(app, booking, 'U02 ยืนยันรอบ 14:00 สำเร็จ')).code;
  });

  await test.step('4. รีโหลดแล้วอ่านยอดนัดของ U08 และ U02', async () => {
    await checkAccountTotal(app, page, codeU02, 'นัด U02 ยังเป็น ฿900 หลังรีโหลด', 900);
    await app.login(page, 'U08');
    await checkAccountTotal(app, page, codeU08, 'นัด U08 ยังเป็น ฿950 หลังรีโหลด', 950);
  });

  await test.step('5. ดูยอดของ 2 นัดในหลังร้าน', async () => {
    await checkAdminPay(app, DATE, codeU08, 'หลังร้าน นัด U08 ฿950', 950);
    await checkAdminPay(app, DATE, codeU02, 'หลังร้าน นัด U02 ฿900', 900);
  });
});

test('TC-PRICE-02 ลำดับคำนวณ 5 ขั้น ตรงกันทุกหน้า', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'แขก: จ่าย ฿1,000 ไม่มีบรรทัดส่วนลด',
      'U08: (฿1,000 − 5% ฿50 = ฿950 − ฿50 = ฿900) ไม่ใช่ ฿902 (ถ้าหักแต้มก่อน % ได้ (฿1,000 − ฿50) × 95% = ฿902.50 ปัดลง ฿902) · แต้ม 101 − 100 = 1',
      'U03 ทุกหน้าแสดงเท่ากัน: ราคาเต็ม ฿2,000 → % ฿0 = ฿2,000 → แต้ม −฿100 = ฿1,900 → รถ +฿300 = ฿2,200 → บัตร −฿500 = จ่ายหน้าร้าน ฿1,700 (ถ้าลืมค่ารถได้ ฿1,400 · ถ้าลืมบัตรได้ ฿2,200) · แต้ม 250 − 200 = 50',
      'ขั้น 6: มีข้อความแจ้งว่าใช้บัตรไม่ได้ เพราะบัตรถูกหัก ฿500 ทันทีตอนจองจนเหลือ ฿0 และยอดจ่ายของการจองใหม่ไม่ลด',
    ].join('\n'),
    source: '[D] §4 ราคา · [R] ⚠️A-22',
    frbr: 'FR-27, FR-28, FR-29, BR-31',
    rules: '—',
    technique: 'Happy path, Boundary',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(300_000);
  const u03Lines: Want = { full: 2000, pct: 0, discount: 0, points: 100, transport: 300, giftcard: 500, pay: 1700 };

  await test.step('1. แขกเลือก S01 1 คน 12:00 อ่านยอด ไม่ยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    await app.check(booking.el('booking-screen-3'), 'แขก ไม่มีบรรทัดส่วนลด', async () => {
      await expect.soft(booking.el('booking-line-discount')).toHaveCount(0);
    });
    await checkPay(app, booking, 'แขก จ่าย ฿1,000', 1000);
  });

  let codeU08: string | null = null;
  await test.step('2. U08 S01 12:00 แลก 1 ชุด อ่านสรุป ยืนยัน อ่านหน้ายืนยัน', async () => {
    await app.login(page, 'U08');
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    await booking.redeemSets(1);
    await checkLines(app, booking, 'U08 หน้าสรุป ฿1,000 − ฿50 − ฿50 = ฿900', { full: 1000, pct: 5, discount: 50, points: 50, pay: 900 });
    codeU08 = (await confirmBooking(app, booking, 'U08 ยืนยันสำเร็จ')).code;
    await checkLines(app, booking, 'U08 หน้ายืนยัน ฿900', { full: 1000, pct: 5, discount: 50, points: 50, pay: 900 });
  });

  let codeU03: string | null = null;
  await test.step('3. U03 S04 14:00 รถ H04 แลก 2 ชุด GIFT-500 อ่านสรุป ยืนยัน อ่านหน้ายืนยัน', async () => {
    await app.login(page, 'U03');
    await booking.toSummary({ service: 'S04', date: DATE, time: '14:00' });
    await booking.shuttleHotel('H04');
    await booking.redeemSets(2);
    await booking.giftCard('GIFT-500');
    await checkLines(app, booking, 'U03 หน้าสรุป จ่าย ฿1,700', u03Lines);
    const order = await page.locator(LINE_SELECTOR).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid ?? ''));
    await app.checkValue(page, 'บรรทัดราคาเรียงตามลำดับคำนวณ', order, (v) => {
      expect.soft(v).toEqual(['booking-line-full-price', 'booking-line-discount', 'booking-line-points', 'booking-line-transport', 'booking-line-giftcard', 'booking-pay-at-shop']);
    });
    codeU03 = (await confirmBooking(app, booking, 'U03 ยืนยันสำเร็จ')).code;
    await checkLines(app, booking, 'U03 หน้ายืนยัน จ่าย ฿1,700', u03Lines);
  });

  await test.step('4. รีโหลดของ U03 และ U08 แล้วดูแต้มคงเหลือ', async () => {
    await checkPoints(app, page, 'U03 แต้ม 250 − 200 = 50', 50);
    await checkAccountTotal(app, page, codeU03, 'U03 ยอดนัด ฿1,700 หลังรีโหลด', 1700);
    await app.login(page, 'U08');
    await checkPoints(app, page, 'U08 แต้ม 101 − 100 = 1', 1);
    await checkAccountTotal(app, page, codeU08, 'U08 ยอดนัด ฿900 หลังรีโหลด', 900);
  });

  await test.step('5. ดูยอดของ 2 นัดในหลังร้าน', async () => {
    await checkAdminPay(app, DATE, codeU08, 'หลังร้าน นัด U08 ฿900', 900);
    await checkAdminPay(app, DATE, codeU03, 'หลังร้าน นัด U03 ฿1,700', 1700);
  });

  await test.step('6. U03 เริ่มจองใหม่แล้วใส่ GIFT-500 อีกครั้ง', async () => {
    await app.login(page, 'U03');
    await booking.toSummary({ service: 'S04', date: DATE, time: '16:00' });
    const before = await booking.pay();
    await booking.giftCard('GIFT-500');
    const extra = booking.el('booking-extra-giftcard');
    await app.check(extra, 'มีข้อความแจ้งว่าใช้บัตรไม่ได้', async (el) => {
      await expect.soft(el).toContainText(/ไม่มีมูลค่าเหลือ|ใช้.*ไม่ได้|เหลือ\s*฿?0/);
    });
    await checkPay(app, booking, `ยอดจ่ายของการจองใหม่ไม่ลด คงเดิม ฿2,000 (ก่อนใส่บัตร ฿${before})`, 2000);
  });
});

test('TC-PRICE-03 ค่าขอบการแลกแต้มชุดละ 100 แต้ม ฿50', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'U01 99: กดแลกไม่ได้ · ฿1,000 − 5% = ฿950 · เหลือ 99 (ถ้าปล่อยแลกจะได้ ฿900)',
      'U05 100: 1 ชุด · ฿950 − ฿50 = ฿900 · เหลือ 0',
      'U08 101: 1 ชุด · ฿950 − ฿50 = ฿900 · เหลือ 1',
      'U09 199: 1 ชุด · ฿950 − ฿50 = ฿900 · เหลือ 99 (ถ้าคิดตามสัดส่วนจะลด ฿99)',
      'U10 200: 2 ชุด · ฿1,000 − 10% = ฿900 − ฿100 = ฿800 · เหลือ 0',
      'U03 250: 2 ชุด · ฿1,000 − ฿100 = ฿900 · เหลือ 50 (ถ้าคิดตามสัดส่วนจะได้ ฿875)',
      'ขอ 150 และ 300: ถูกปฏิเสธด้วยสถานะ 4xx โดยเหตุเป็นเรื่องแต้ม ไม่ใช่ยอดไม่ตรง (`price-changed`) · U03 ยัง 250 แต้ม · ไม่มีนัดใหม่ · ข้อความของกรณี 300 บอกว่าแต้มไม่พอกับที่ขอ ไม่ใช่บอกว่าต้องมีอย่างน้อย 100 แต้ม เพราะ U03 มี 250',
    ].join('\n'),
    source: '[D] บ.14 · [D] §4 แต้มและระดับ · [R] · F-สร้าง 11',
    frbr: 'FR-32, BR-18, BR-19',
    rules: 'R31',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(480_000);
  const rows: { user: UserKey; has: number; sets: number; pay: number; left: number }[] = [
    { user: 'U01', has: 99, sets: 0, pay: 950, left: 99 },
    { user: 'U05', has: 100, sets: 1, pay: 900, left: 0 },
    { user: 'U08', has: 101, sets: 1, pay: 900, left: 1 },
    { user: 'U09', has: 199, sets: 1, pay: 900, left: 99 },
    { user: 'U10', has: 200, sets: 2, pay: 800, left: 0 },
    { user: 'U03', has: 250, sets: 2, pay: 900, left: 50 },
  ];

  for (const r of rows) {
    await test.step(`1-3. ${r.user} ${r.has} แต้ม แลกสูงสุด ยืนยัน รีโหลดอ่านแต้ม`, async () => {
      await app.lockAndReset(LOCK);
      await app.login(page, r.user);
      await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
      await booking.openPoints();
      if (r.sets === 0) {
        await app.check(booking.pointsInc(), `${r.user} ปุ่ม + กดแลกไม่ได้`, async (el) => {
          await expect.soft(el).toBeDisabled();
        });
        await app.check(booking.el('booking-points-max'), `${r.user} ปุ่มแลกสูงสุดกดไม่ได้`, async (el) => {
          await expect.soft(el).toBeDisabled();
        });
      } else {
        await booking.redeemMax();
      }
      await checkSets(app, booking, `${r.user} แลกได้ ${r.sets} ชุด`, r.sets);
      await checkPay(app, booking, `${r.user} จ่าย ฿${r.pay}`, r.pay);
      await confirmBooking(app, booking, `${r.user} ยืนยันสำเร็จ`);
      await checkPoints(app, page, `${r.user} เหลือ ${r.left} แต้ม`, r.left);
    });
  }

  await test.step('4. U03 กดจองจริงเพื่อดึงคำขอ แล้วล็อกและรีเซ็ต', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U03');
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    await booking.redeemSets(1);
  });
  const { request: captured } = await booking.confirm();
  await app.checkValue(page, 'ดึงคำขอจองจาก Network ได้', captured.url, (v) => {
    expect.soft(v).toMatch(/\/api\/bookings$/);
  });

  await test.step('5-6. U03 ยิงซ้ำ 150 และ 300 แต้ม โดยตัด expectedPayAtShop แล้วอ่านแต้มและนัด', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U03');
    const before = await snapshot(app, page);
    const rowsBefore = await adminRowCount(app, DATE);

    const r150 = await app.replay(page, captured, { pointsToRedeem: 150 }, { remove: ['expectedPayAtShop'] });
    await checkRejected(app, page, 'ขอ 150 แต้ม ถูกปฏิเสธเพราะไม่ครบชุด', r150, /points-|แต้ม/);

    const r300 = await app.replay(page, captured, { pointsToRedeem: 300 }, { remove: ['expectedPayAtShop'] });
    await checkRejected(app, page, 'ขอ 300 แต้ม ถูกปฏิเสธเรื่องแต้ม', r300, /points-|แต้ม/);
    await app.checkValue(page, 'ข้อความกรณี 300 บอกว่าแต้มไม่พอกับที่ขอ ไม่ใช่ต้องมีอย่างน้อย 100 แต้ม', r300.text.slice(0, 400), (v) => {
      expect.soft(v).toMatch(/แต้มไม่พอ/);
      expect.soft(v).not.toMatch(/อย่างน้อย\s*100/);
    });

    await checkAdminRowCount(app, DATE, 'หลังร้าน จำนวนนัดเท่าเดิม', rowsBefore);
    await checkNoChange(app, page, 'U03', 250, before.codes);
  });
});

test('TC-PRICE-04 เพดานแต้มจนค่าบริการเหลือ ฿0 และแต้มจ่ายค่ารถไม่ได้', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      '15 ชุด: ฿800 − ฿750 = ฿50 · แต้ม 1,700 − 1,500 = 200',
      '16 ชุด: ฿800 − ฿800 = ฿0 · แต้ม 100 · `+` เพิ่มต่อไม่ได้',
      '17 ชุด: ถูกปฏิเสธด้วยสถานะ 4xx เพราะส่วนลด ฿850 เกินค่าบริการ ฿800 ไม่ใช่เพราะยอดไม่ตรง (`price-changed`) · แต้มยัง 1,700 · ไม่มีนัดใหม่ (ถ้าไม่กันเพดานจะได้ −฿50)',
      '16 ชุด รถ H04: ฿0 + ค่ารถ ฿300 = จ่าย ฿300 · แต้ม 100 · `+` เพิ่มต่อไม่ได้ (ถ้าแต้มจ่ายค่ารถได้ `+` จะไปถึง 17 ชุด = ฿1,100 − ฿850 = ฿250 · แต้ม 0)',
      'ย้อนคน: 3 คน 17 ชุด = ฿2,400 − ฿850 = ฿1,550 · ย้อนเป็น 1 คนแล้วเว็บปรับลงเป็น 16 ชุดหรือบอกให้ลด โดยไม่บอกว่าแลกแต้มไม่ได้เลย เพราะมี 1,700 แต้ม · จองจบที่ ฿0 · แต้ม 100',
    ].join('\n'),
    source: '[R] ⚠️A-32 · F-ร้าน 9',
    frbr: 'FR-32, BR-20',
    rules: 'R35',
    technique: 'Boundary, Negative, State',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  const summary = () => booking.toSummary({ service: 'S05', date: DATE, time: '12:00' });

  await test.step('1. แถว 15 ชุด: ตั้งชุด ยืนยัน รีโหลด อ่านแต้ม', async () => {
    await app.login(page, 'U11');
    await summary();
    await booking.redeemSets(15);
    await checkPay(app, booking, '15 ชุด ฿800 − ฿750 = ฿50', 50);
    await confirmBooking(app, booking, '15 ชุด ยืนยันสำเร็จ');
    await checkPoints(app, page, '15 ชุด แต้มเหลือ 200', 200);
  });

  await test.step('2. แถว 16 ชุด: ตั้งชุด ลองกด + ต่อ ยืนยัน รีโหลด', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U11');
    await summary();
    await booking.redeemSets(16);
    await checkPay(app, booking, '16 ชุด ฿800 − ฿800 = ฿0', 0);
    await checkIncBlocked(app, booking, '16 ชุด + เพิ่มต่อไม่ได้', 16);
    await confirmBooking(app, booking, '16 ชุด ยืนยันสำเร็จ');
    await checkPoints(app, page, '16 ชุด แต้มเหลือ 100', 100);
  });

  await test.step('3. แถว 17 ชุด: ดึงคำขอจาก 16 ชุด รีเซ็ต แล้วยิงเป็น 17 ชุด', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U11');
    await summary();
    await booking.redeemSets(16);
    const { request: captured } = await booking.confirm();
    await app.lockAndReset(LOCK);
    await app.login(page, 'U11');
    const before = await snapshot(app, page);
    const rowsBefore = await adminRowCount(app, DATE);
    const res = await app.replay(page, captured, { pointsToRedeem: 1700 }, { remove: ['expectedPayAtShop'] });
    await checkRejected(app, page, '17 ชุด ถูกปฏิเสธเพราะส่วนลดเกินค่าบริการ', res, /points-exceed-service|เกินค่าบริการ/);
    await checkAdminRowCount(app, DATE, 'หลังร้าน จำนวนนัดเท่าเดิม', rowsBefore);
    await checkNoChange(app, page, 'U11', 1700, before.codes);
  });

  await test.step('4. แถวรถ: เลือก H04 แลก 16 ชุด ลองกด + ต่อ ยืนยัน', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U11');
    await summary();
    await booking.shuttleHotel('H04');
    await booking.redeemSets(16);
    await checkLines(app, booking, '16 ชุด รถ H04 ฿0 + ฿300 = จ่าย ฿300', { transport: 300, points: 800, pay: 300 });
    await checkIncBlocked(app, booking, 'รถ H04 + เพิ่มต่อไม่ได้ แต้มจ่ายค่ารถไม่ได้', 16);
    await confirmBooking(app, booking, 'รถ H04 ยืนยันสำเร็จ');
    await checkPoints(app, page, 'รถ H04 แต้มเหลือ 100', 100);
  });

  await test.step('5-6. แถวย้อน: 3 คน 17 ชุด ย้อนเป็น 1 คน แล้วจองจบ', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U11');
    await booking.toSummary({ service: 'S05', party: 3, date: DATE, time: '12:00' });
    await booking.redeemSets(17);
    await checkLines(app, booking, '3 คน 17 ชุด ฿2,400 − ฿850 = ฿1,550', { full: 2400, points: 850, pay: 1550 });

    await booking.el('booking-step3-back').click();
    await booking.el('booking-screen-2').waitFor({ state: 'visible' });
    await booking.el('booking-step2-back').click();
    await booking.el('booking-screen-1').waitFor({ state: 'visible' });
    await booking.el('booking-party-1').click();
    await booking.nextFromStep1();
    await booking.chooseDate(DATE);
    await booking.chooseTherapist('any');
    await booking.chooseSlot('12:00');
    await booking.nextFromStep2();
    await booking.openPoints();

    const setsAfterBack = await readSets(booking);
    const pointsText = await booking.el('booking-extra-points').innerText();
    await app.check(booking.pointsValue(), 'ย้อนเป็น 1 คน เว็บปรับลงเป็น 16 ชุดหรือบอกให้ลด', async () => {
      expect.soft(setsAfterBack === 16 || /เกิน|กรุณาลด|ลดจำนวน|ลดชุด/.test(pointsText)).toBe(true);
    });
    await app.check(booking.el('booking-extra-points'), 'ไม่บอกว่าแลกแต้มไม่ได้เลย', async (el) => {
      await expect.soft(el).not.toContainText('แลกแต้มไม่ได้');
    });

    await reduceSetsTo(booking, 16);
    await checkSets(app, booking, 'ย้อนคนแล้วเหลือ 16 ชุด', 16);
    await checkPay(app, booking, 'ย้อนคนแล้วจ่าย ฿0', 0);
    await confirmBooking(app, booking, 'ย้อนคน ยืนยันสำเร็จ');
    await checkPoints(app, page, 'ย้อนคน แต้มเหลือ 100', 100);
  });
});

test('TC-PRICE-05 แลกเต็มเพดานแล้วเลือกเดือนเกิด เพดานลดตามค่าบริการใหม่', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'ก่อนเลือก: ฿800 − ฿800 = ฿0',
      'หลังเลือก: ค่าบริการ ฿800 − 20% (฿160) = ฿640 · เพดาน ฿640 ÷ ฿50 = 12 ชุด · ไม่ผูกว่าเว็บลดชุดเองหรือให้ลูกค้าลด (F-ร้าน 8)',
      '`birthday-result` ต้องไม่ขึ้นว่าส่วนลดอื่นมากกว่า เพราะ U11 Silver มีส่วนลดอื่น 0% (F-สร้าง 10)',
      '"แลกสูงสุด" ได้ 12 ชุด',
      'ยอดสุดท้าย: ฿640 − ฿600 = ฿40 (ถ้าไม่ได้ส่วนลดเดือนเกิด 12 ชุดจะได้ ฿800 − ฿600 = ฿200) · ถ้าต้องกด `−` เองหลังกด "แลกสูงสุด" ให้บันทึกข้อ "แลกสูงสุด ได้ 12 ชุด" เป็นไม่ผ่าน',
      'แต้ม 1,700 − 1,200 = 500 · หน้ายืนยันและหลังร้านแสดง ฿40',
    ].join('\n'),
    source: '[R] · F-ร้าน 8 · F-สร้าง 10',
    frbr: 'FR-32, FR-33, BR-20, BR-25',
    rules: 'R34',
    technique: 'State, Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(300_000);

  await test.step('1. ไปถึงหน้าสรุป แลก 16 ชุด อ่านยอด', async () => {
    await app.login(page, 'U11');
    await booking.toSummary({ service: 'S05', date: DATE, time: '12:00' });
    await booking.redeemSets(16);
    await checkPay(app, booking, 'ก่อนเลือกเดือนเกิด ฿800 − ฿800 = ฿0', 0);
  });

  await test.step('2. เลือกเดือนเกิด อ่านผล บรรทัดส่วนลด และจำนวนชุด', async () => {
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'เลือกเดือนเกิดได้', async () => {
      expect.soft(selected).toBe(true);
    });
    const texts = await page.locator('[data-testid="booking-birthday-result"], [data-testid="booking-extra-birthday"]').allInnerTexts();
    await app.check(booking.el('booking-extra-birthday'), 'ผลเดือนเกิดไม่ขึ้นว่าส่วนลดอื่นมากกว่า', async () => {
      expect.soft(texts.join(' ')).not.toMatch(/มากกว่า/);
    });
    await checkLines(app, booking, 'ค่าบริการ ฿800 − 20% (฿160)', { full: 800, pct: 20, discount: 160 });
  });

  await test.step('3. กด "แลกสูงสุด"', async () => {
    await booking.redeemMax();
    await checkSets(app, booking, 'แลกสูงสุด ได้ 12 ชุด', 12);
  });

  await test.step('4. ถ้าจำนวนชุดยังเกิน 12 ให้กด − จนเหลือ 12', async () => {
    await reduceSetsTo(booking, 12);
    await checkPay(app, booking, 'ยอดสุดท้าย ฿640 − ฿600 = ฿40', 40);
  });

  let code: string | null = null;
  await test.step('5. กดยืนยัน อ่านหน้ายืนยัน แล้วรีโหลด อ่านแต้ม', async () => {
    code = (await confirmBooking(app, booking, 'ยืนยันสำเร็จ')).code;
    await checkPay(app, booking, 'หน้ายืนยัน ฿40', 40);
    await checkPoints(app, page, 'แต้ม 1,700 − 1,200 = 500', 500);
    await checkAccountTotal(app, page, code, 'ยอดนัด ฿40 หลังรีโหลด', 40);
  });

  await test.step('6. ดูยอดของนัดในหลังร้าน', async () => {
    await checkAdminPay(app, DATE, code, 'หลังร้าน ฿40', 40);
  });
});

test('TC-PRICE-06 ตัวเลือกเดือนเกิดดูจากเดือนของวันนัด และไม่มีกับ P01 K01', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'K01: ไม่มีตัวเลือกเดือนเกิด · ฿15,000 (ถ้าให้ลด 20% จะได้ ฿12,000)',
      'P01: ไม่มีตัวเลือกเดือนเกิด · ฿2,900 − 0% = ฿2,900 · ค่ารถรวมแล้ว ฿0 (ถ้าให้ลด 20% จะได้ ฿2,320)',
      'U02 1 ก.ค.: เลือกไม่ได้ · ใช้ระดับ ฿1,000 − 10% = ฿900 (ถ้าดูเดือนของวันนี้จะได้ ฿800)',
      'U02 30 มิ.ย.: ฿1,000 − 20% (฿200) = ฿800 ทั้งก่อนและหลังรีโหลด',
      'U11 31 พ.ค.: เลือกไม่ได้ · ฿1,000 − 0% = ฿1,000 (ถ้าให้เลือกทั้งที่เดือนไม่ตรงจะได้ ฿800)',
      'U11 1 มิ.ย.: ฿1,000 − 20% (฿200) = ฿800 (ถ้าดูเดือนของวันนี้จะได้ ฿1,000)',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [R] ⚠️D-24',
    frbr: 'FR-33, BR-25, BR-28',
    rules: 'R45',
    technique: 'Boundary, Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(300_000);

  await test.step('1. U02 เปิดซื้อ K01 อ่านตัวเลือกและราคา แล้วไม่ซื้อ', async () => {
    await app.login(page, 'U02');
    await app.goto(page, '/th/wallet');
    await page.getByTestId('wallet-buy-course').click();
    const panel = page.getByTestId('wallet-buy-panel');
    await panel.waitFor({ state: 'visible' });
    const priceText = await page.getByTestId('wallet-buy-price').innerText();
    await app.check(panel, 'K01 ไม่มีตัวเลือกเดือนเกิด', async (el) => {
      await expect.soft(el.locator('[data-testid*="birthday"]')).toHaveCount(0);
      await expect.soft(el).not.toContainText('เดือนเกิด');
    });
    await app.check(page.getByTestId('wallet-buy-price'), 'K01 ฿15,000', async () => {
      expect.soft(lineAmount(priceText)).toBe(15000);
    });
    await page.getByTestId('wallet-buy-course-cancel').click();
  });

  await test.step('2. U02 จอง P01 1 คน รถ H04 17 มิ.ย. ถึงหน้าสรุป ไม่ยืนยัน', async () => {
    await booking.toSummary({ service: 'P01', date: DATE, time: '12:00' });
    // แพ็กเกจรวมค่ารถแล้ว ถ้าฟอร์มรถต่างจากบริการปกติ ให้เดินต่อไปตรวจยอดแทนการหยุด test
    // P01 ไม่มีช่องติ๊กรถ แผงรถเปิดอยู่แล้ว เลือกโรงแรมได้เลย
    await booking.el('booking-shuttle-mode-hotel').check();
    await booking.el('booking-shuttle-hotel').selectOption('H04');
    await booking.quoteReady();
    await app.check(page.locator('[data-testid="booking-use-birthday"], [data-testid="booking-toggle-birthday"]'), 'P01 ไม่มีตัวเลือกเดือนเกิด', async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await checkLines(app, booking, 'P01 ฿2,900 − 0% = ฿2,900 ค่ารถรวมแล้ว ฿0', { full: 2900, pct: 0, discount: 0, transport: 0, pay: 2900 });
  });

  await test.step('3. U02 จอง S01 1 ก.ค. พยายามเลือกเดือนเกิด ไม่ยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-07-01', time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'U02 1 ก.ค. เลือกเดือนเกิดไม่ได้', async () => {
      expect.soft(selected).toBe(false);
    });
    await checkLines(app, booking, 'U02 1 ก.ค. ฿1,000 − 10% = ฿900', { pct: 10, discount: 100, pay: 900 });
  });

  await test.step('4. U02 จอง S01 30 มิ.ย. เลือกเดือนเกิด ยืนยัน รีโหลด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-30', time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'U02 30 มิ.ย. เลือกเดือนเกิดได้', async () => {
      expect.soft(selected).toBe(true);
    });
    await checkLines(app, booking, 'U02 30 มิ.ย. ฿1,000 − 20% (฿200) = ฿800', { pct: 20, discount: 200, pay: 800 });
    const { code } = await confirmBooking(app, booking, 'U02 30 มิ.ย. ยืนยันสำเร็จ');
    await checkAccountTotal(app, page, code, 'U02 30 มิ.ย. ยังเป็น ฿800 หลังรีโหลด', 800);
  });

  await test.step('5. ล็อก 15 พ.ค. แล้วรีเซ็ต U11 จอง S01 31 พ.ค. พยายามเลือกเดือนเกิด ไม่ยืนยัน', async () => {
    await app.lockAndReset('2026-05-15T10:00:00+07:00');
    await app.login(page, 'U11');
    await booking.toSummary({ service: 'S01', date: '2026-05-31', time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'U11 31 พ.ค. เลือกเดือนเกิดไม่ได้', async () => {
      expect.soft(selected).toBe(false);
    });
    await checkLines(app, booking, 'U11 31 พ.ค. ฿1,000 − 0% = ฿1,000', { pct: 0, discount: 0, pay: 1000 });
  });

  await test.step('6. U11 จอง S01 1 มิ.ย. เลือกเดือนเกิด อ่านยอด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-01', time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'U11 1 มิ.ย. เลือกเดือนเกิดได้', async () => {
      expect.soft(selected).toBe(true);
    });
    await checkLines(app, booking, 'U11 1 มิ.ย. ฿1,000 − 20% (฿200) = ฿800', { pct: 20, discount: 200, pay: 800 });
  });
});

test('TC-PRICE-07 สิทธิ์เดือนเกิดใช้เมื่อกดเอง 1 ครั้งต่อปี และได้คืนเมื่อยกเลิกทัน', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'ขั้น 1: ตัวเลือกกดได้และยังไม่ถูกเลือก · ฿1,000 − 10% = ฿900 (ถ้าใช้สิทธิ์เองจะได้ ฿800)',
      'ขั้น 2: ยังใช้สิทธิ์ได้ · ฿1,000 − 20% (฿200) = ฿800 (ถ้าขั้น 1 กินสิทธิ์จะได้ ฿900)',
      'ขั้น 3: ใช้ครั้งที่ 2 ไม่ได้ · ฿1,000 − 10% = ฿900',
      'ขั้น 5: สิทธิ์คืนแล้ว · ฿1,000 − 20% = ฿800 (ถ้าไม่คืนจะได้ ฿900) · นัด 20 มิ.ย. ยัง ฿900 หลังรีโหลด',
      'ขั้น 6: U05 ได้ระดับ ฿1,000 − 5% = ฿950 ไม่ใช่ ฿800 · ไม่ผูกว่าตัวเลือกยังติ๊กได้หรือไม่ (F-สร้าง 12) แต่ยอดต้องไม่ลด 20%',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [D] §4 ยกเลิก · [D] §5 สถานะสิทธิ์ · [R] · F-สร้าง 12',
    frbr: 'FR-22, FR-33, BR-26',
    rules: '—',
    technique: 'State, Happy path, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(300_000);
  let code20: string | null = null;
  let code17: string | null = null;

  await test.step('1. U02 จอง S01 20 มิ.ย. อ่านตัวเลือก ยืนยันโดยไม่กดเลือก', async () => {
    await app.login(page, 'U02');
    await booking.toSummary({ service: 'S01', date: '2026-06-20', time: '12:00' });
    await booking.openBirthday();
    await app.check(booking.birthdayBox(), 'ตัวเลือกกดได้และยังไม่ถูกเลือก', async (el) => {
      await expect.soft(el).toBeEnabled();
      await expect.soft(el).not.toBeChecked();
    });
    await checkLines(app, booking, 'ขั้น 1 ฿1,000 − 10% = ฿900', { pct: 10, discount: 100, pay: 900 });
    code20 = (await confirmBooking(app, booking, 'นัด 20 มิ.ย. ยืนยันสำเร็จ')).code;
  });

  await test.step('2. U02 จอง S01 17 มิ.ย. เลือกเดือนเกิด ยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'ขั้น 2 ยังใช้สิทธิ์ได้', async () => {
      expect.soft(selected).toBe(true);
    });
    await checkLines(app, booking, 'ขั้น 2 ฿1,000 − 20% (฿200) = ฿800', { pct: 20, discount: 200, pay: 800 });
    code17 = (await confirmBooking(app, booking, 'นัด 17 มิ.ย. ยืนยันสำเร็จ')).code;
  });

  await test.step('3. U02 จอง S01 29 มิ.ย. พยายามเลือกเดือนเกิด ไม่ยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-29', time: '12:00' });
    await attemptBirthday(booking);
    await checkLines(app, booking, 'ขั้น 3 ใช้ครั้งที่ 2 ไม่ได้ ฿1,000 − 10% = ฿900', { pct: 10, discount: 100, pay: 900 });
  });

  await test.step('4. เปิดประวัติ แล้วยกเลิกนัด 17 มิ.ย.', async () => {
    await app.goto(page, '/th/account');
    await page.getByTestId('account-history-link').click();
    await page.getByTestId('history-page').waitFor({ state: 'visible' });
    await app.goto(page, '/th/account');
    const cancelBtn = page.getByTestId(`account-cancel-${code17 ?? ''}`);
    const canCancel = (await cancelBtn.count()) > 0;
    await app.checkValue(page, 'มีปุ่มยกเลิกนัด 17 มิ.ย.', canCancel, (v) => {
      expect.soft(v).toBe(true);
    });
    if (canCancel) {
      await cancelBtn.click();
      await page.getByTestId(`account-cancel-confirm-${code17 ?? ''}`).click();
      await page.getByTestId('account-cancel-done').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await app.check(page.getByTestId('account-cancel-done'), 'ยกเลิกนัด 17 มิ.ย. สำเร็จ', async (el) => {
        await expect.soft(el).toBeVisible();
      });
    }
  });

  await test.step('5. U02 จอง S01 29 มิ.ย. เลือกเดือนเกิด ยืนยัน รีโหลด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-29', time: '12:00' });
    await attemptBirthday(booking);
    await checkLines(app, booking, 'ขั้น 5 สิทธิ์คืนแล้ว ฿1,000 − 20% = ฿800', { pct: 20, discount: 200, pay: 800 });
    const { code } = await confirmBooking(app, booking, 'นัด 29 มิ.ย. ยืนยันสำเร็จ');
    await checkAccountTotal(app, page, code, 'นัด 29 มิ.ย. ฿800 หลังรีโหลด', 800);
    await checkAccountTotal(app, page, code20, 'นัด 20 มิ.ย. ยัง ฿900 หลังรีโหลด', 900);
  });

  await test.step('6. U05 จอง S01 17 มิ.ย. พยายามเลือกเดือนเกิด ไม่ยืนยัน', async () => {
    await app.login(page, 'U05');
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    await attemptBirthday(booking);
    await checkPay(app, booking, 'ขั้น 6 U05 ได้ระดับ ฿1,000 − 5% = ฿950 ไม่ใช่ ฿800', 950);
  });
});

test('TC-PRICE-08 ปีของสิทธิ์เดือนเกิดนับตามปีปฏิทินของวันนัด', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'นัด 20 ม.ค. 2026: ฿1,000 − 20% (฿200) = ฿800',
      'นัด 25 ม.ค. 2026: ใช้ซ้ำในปี 2026 ไม่ได้ · ฿1,000 − 0% = ฿1,000 (ถ้าไม่กันจะได้ ฿800)',
      'นัด 5 ม.ค. 2027 จองจากวันที่ 20 ธ.ค. 2026: เลือกได้ · ฿1,000 − 20% (฿200) = ฿800 (ถ้าใช้ปีของวันจองจะได้ ฿1,000)',
    ].join('\n'),
    source: '[R] ⚠️A-12 · [R] ⚠️TD-04 · [R] ⚠️D-24',
    frbr: 'FR-33, BR-27',
    rules: '—',
    technique: 'State, Boundary',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(300_000);

  await test.step('เตรียม: ล็อก 5 ม.ค. 2026 แล้วรีเซ็ต', async () => {
    try {
      await app.lockAndReset('2026-01-05T10:00:00+07:00');
    } catch (e) {
      throw new Error(`Blocked: ล็อกข้ามปีไม่ได้ ถอยไป unit test E126–E128 (${String(e)})`);
    }
    await app.login(page, 'U06');
  });

  await test.step('1. U06 จอง S01 20 ม.ค. 2026 เลือกเดือนเกิด ยืนยัน รีโหลด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-01-20', time: '12:00' });
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'นัด 20 ม.ค. 2026 เลือกเดือนเกิดได้', async () => {
      expect.soft(selected).toBe(true);
    });
    await checkLines(app, booking, 'นัด 20 ม.ค. 2026 ฿1,000 − 20% (฿200) = ฿800', { pct: 20, discount: 200, pay: 800 });
    const { code } = await confirmBooking(app, booking, 'นัด 20 ม.ค. 2026 ยืนยันสำเร็จ');
    await checkAccountTotal(app, page, code, 'นัด 20 ม.ค. 2026 ฿800 หลังรีโหลด', 800);
  });

  await test.step('2. U06 จอง S01 25 ม.ค. 2026 พยายามเลือกเดือนเกิด ไม่ยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-01-25', time: '12:00' });
    await attemptBirthday(booking);
    await checkLines(app, booking, 'นัด 25 ม.ค. 2026 ใช้ซ้ำไม่ได้ ฿1,000 − 0% = ฿1,000', { pct: 0, discount: 0, pay: 1000 });
  });

  await test.step('3. ล็อก 20 ธ.ค. 2026 โดยไม่รีเซ็ต', async () => {
    try {
      await app.lock('2026-12-20T10:00:00+07:00');
    } catch (e) {
      throw new Error(`Blocked: ล็อกข้ามปีไม่ได้ ถอยไป unit test E126–E128 (${String(e)})`);
    }
    await app.login(page, 'U06');
  });

  await test.step('4. U06 จอง S01 5 ม.ค. 2027 เลือกเดือนเกิด อ่านยอด ยืนยัน รีโหลด', async () => {
    try {
      await booking.toSummary({ service: 'S01', date: '2027-01-05', time: '12:00' });
    } catch (e) {
      throw new Error(`Blocked: จองวันนัดข้ามปีบนเว็บไม่ได้ ถอยไป unit test E126–E128 (${String(e)})`);
    }
    const selected = await attemptBirthday(booking);
    await app.check(booking.birthdayBox(), 'นัด 5 ม.ค. 2027 เลือกได้', async () => {
      expect.soft(selected).toBe(true);
    });
    await checkLines(app, booking, 'นัด 5 ม.ค. 2027 ฿1,000 − 20% (฿200) = ฿800', { pct: 20, discount: 200, pay: 800 });
    const { code } = await confirmBooking(app, booking, 'นัด 5 ม.ค. 2027 ยืนยันสำเร็จ');
    await checkAccountTotal(app, page, code, 'นัด 5 ม.ค. 2027 ฿800 หลังรีโหลด', 800);
  });
});

test('TC-PRICE-09 ใช้ส่วนลด % ที่มากที่สุดอันเดียว และยอดเป็นบาทเต็ม', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      'U08 3 คน: ฿3,000 − 5% (฿150) = ฿2,850 (กลุ่ม 3 คนไม่ลด)',
      'U08 4 คน: ฿4,000 − 10% (฿400) = ฿3,600 ไม่ใช่ ฿3,400 ที่ซ้อน 15%',
      'U02 4 คน ไม่เลือก: ฿4,000 − 10% = ฿3,600 ไม่ใช่ ฿3,200 ที่ซ้อน 20%',
      'U02 4 คน เลือก: ฿4,000 − 20% (฿800) = ฿3,200 ไม่ใช่ ฿2,800 ที่ซ้อน 30% · ยังเป็น ฿3,200 ทั้งหลังรีโหลดและในหลังร้าน',
      'U08 S06: ฿1,500 − 5% (฿75) = ฿1,425',
      'U02 เดือนเกิด: S02 ฿1,120 · S03 ฿960 · S04 ฿1,600 · S05 ฿640 · S06 ฿1,200 · S07 ฿1,440',
      'ทุกยอดเป็นบาทเต็ม ไม่มีสตางค์บนหน้าจอ',
    ].join('\n'),
    source: '[D] §4 ราคา · [D] §4 แต้มและระดับ',
    frbr: 'FR-27, BR-28, BR-29, BR-32',
    rules: '—',
    technique: 'Equivalence partition, Boundary',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(480_000);

  const checkWholeBaht = async (label: string) => {
    await app.check(booking.page.locator(LINE_SELECTOR), label, async () => {
      const texts = await booking.page.locator(LINE_SELECTOR).allInnerTexts();
      expect.soft(texts.join(' | ')).not.toMatch(/\d\.\d/);
    });
  };

  await test.step('1. แถว U08', async () => {
    await app.login(page, 'U08');
    await booking.toSummary({ service: 'S01', party: 3, date: DATE, time: '12:00' });
    await checkLines(app, booking, 'U08 3 คน ฿3,000 − 5% (฿150) = ฿2,850', { full: 3000, pct: 5, discount: 150, pay: 2850 });
    await booking.toSummary({ service: 'S01', party: 4, date: DATE, time: '12:00' });
    await checkLines(app, booking, 'U08 4 คน ฿4,000 − 10% (฿400) = ฿3,600', { full: 4000, pct: 10, discount: 400, pay: 3600 });
    await booking.toSummary({ service: 'S06', date: DATE, time: '12:00' });
    await checkLines(app, booking, 'U08 S06 ฿1,500 − 5% (฿75) = ฿1,425', { full: 1500, pct: 5, discount: 75, pay: 1425 });
    await checkWholeBaht('U08 S06 ทุกยอดเป็นบาทเต็ม');
  });

  await test.step('1. แถว U02 ไม่เลือกเดือนเกิด และเลือกเดือนเกิด S02–S07', async () => {
    await app.login(page, 'U02');
    await booking.toSummary({ service: 'S01', party: 4, date: DATE, time: '12:00' });
    await checkLines(app, booking, 'U02 4 คน ไม่เลือก ฿4,000 − 10% = ฿3,600', { full: 4000, pct: 10, discount: 400, pay: 3600 });
    const menu: [string, number][] = [['S02', 1120], ['S03', 960], ['S04', 1600], ['S05', 640], ['S06', 1200], ['S07', 1440]];
    for (const [service, pay] of menu) {
      await booking.toSummary({ service, date: DATE, time: '12:00' });
      await attemptBirthday(booking);
      await checkPay(app, booking, `U02 เดือนเกิด ${service} ฿${pay.toLocaleString('en-US')}`, pay);
      await checkWholeBaht(`U02 ${service} ทุกยอดเป็นบาทเต็ม`);
    }
  });

  let code: string | null = null;
  await test.step('2. แถว U02 4 คน เลือกเดือนเกิด ยืนยัน รีโหลด', async () => {
    await booking.toSummary({ service: 'S01', party: 4, date: DATE, time: '12:00' });
    await attemptBirthday(booking);
    await checkLines(app, booking, 'U02 4 คน เลือก ฿4,000 − 20% (฿800) = ฿3,200', { full: 4000, pct: 20, discount: 800, pay: 3200 });
    await checkWholeBaht('U02 4 คน ทุกยอดเป็นบาทเต็ม');
    code = (await confirmBooking(app, booking, 'U02 4 คน ยืนยันสำเร็จ')).code;
    await checkAccountTotal(app, page, code, 'U02 4 คน ยังเป็น ฿3,200 หลังรีโหลด', 3200);
  });

  await test.step('3. ดูยอดนัดนี้ในหลังร้าน', async () => {
    await checkAdminPay(app, DATE, code, 'หลังร้าน ฿3,200', 3200);
  });
});

test('TC-PRICE-10 ยอดจากผู้ส่งไม่ตรงและแต้มที่ถูกใช้จากแท็บอื่น', {
  tag: ['@P1', '@5.3'],
  annotation: plan({
    expected: [
      '`expectedPayAtShop` ผิด: ถูกปฏิเสธด้วยสถานะ 4xx · U03 ยัง 250 แต้ม · ไม่มีนัดใหม่',
      '`lines` ปลอม: ไม่มีผลกับยอด · ถ้าจองผ่าน นัดเป็น (฿1,000 − 0% − ฿50 = ฿950) ไม่ใช่ ฿1 และแต้ม 250 − 100 = 150 · ถ้าถูกปฏิเสธ แต้มต้องยัง 250 และไม่มีนัดใหม่',
      'ไม่ตรวจกรณีไม่ส่ง `expectedPayAtShop` เพราะยังรอคำตอบ F-สร้าง 9',
      'แท็บ B: ฿1,000 − 5% = ฿950 − ฿50 = ฿900 · แต้ม 100 − 100 = 0',
      'แท็บ A: มีข้อความแจ้งว่าแต้มไม่พอ · ไม่เกิดนัดรอบ 12:00 · แต้ม 0 ไม่ใช่ −100 · U05 มีนัดใหม่นัดเดียว · หน้าสรุปไม่ค้างยอด ฿900 กับ 1 ชุด แต่อัปเดตเป็นแต้ม 0 และยอด ฿950',
    ].join('\n'),
    source: '[R] · F-สร้าง 9',
    frbr: 'FR-27, FR-32, BR-18',
    rules: 'R54, R55',
    technique: 'Negative, Security, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);

  await test.step('1-3. ส่วน A: ดึงคำขอจริง รีเซ็ต แล้วยิงด้วยยอดผิดและ lines ปลอม', async () => {
    await app.login(page, 'U03');
    await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
    await booking.redeemSets(1);
    await checkPay(app, booking, 'U03 แลก 1 ชุด ยอดจริง ฿950', 950);
    const { request: captured } = await booking.confirm();

    await app.lockAndReset(LOCK);
    await app.login(page, 'U03');
    const before = await snapshot(app, page);
    const rowsBefore = await adminRowCount(app, DATE);

    const wrong = await app.replay(page, captured, { expectedPayAtShop: 1000 });
    await app.checkValue(page, '`expectedPayAtShop` ฿1,000 ถูกปฏิเสธ 4xx', { status: wrong.status, body: wrong.text.slice(0, 300) }, (v) => {
      expect.soft(v.status).toBeGreaterThanOrEqual(400);
      expect.soft(v.status).toBeLessThan(500);
    });
    await checkAdminRowCount(app, DATE, 'หลังร้าน จำนวนนัดเท่าเดิมหลังถูกปฏิเสธ', rowsBefore);
    await checkNoChange(app, page, 'U03', 250, before.codes);

    const fake = await app.replay(page, captured, {
      expectedPayAtShop: 950,
      lines: [{ label: 'fake', amount: 1 }],
    });
    const after = await snapshot(app, page);
    if (fake.status >= 200 && fake.status < 300) {
      const created = after.codes.filter((c) => !before.codes.includes(c));
      await app.checkValue(page, '`lines` ปลอม จองผ่านแล้วเกิดนัดใหม่ 1 นัด', created, (v) => {
        expect.soft(v).toHaveLength(1);
      });
      const code = created[0] ?? null;
      await checkAccountTotal(app, page, code, '`lines` ปลอม นัดเป็น ฿950 ไม่ใช่ ฿1', 950);
      await checkPoints(app, page, '`lines` ปลอม แต้ม 250 − 100 = 150', 150);
      await checkAdminPay(app, DATE, code, 'หลังร้าน `lines` ปลอม นัดเป็น ฿950', 950);
    } else {
      await app.checkValue(page, '`lines` ปลอมถูกปฏิเสธ 4xx', fake.status, (v) => {
        expect.soft(v).toBeGreaterThanOrEqual(400);
        expect.soft(v).toBeLessThan(500);
      });
      await checkNoChange(app, page, 'U03', 250, before.codes);
    }
  });

  await test.step('4. ส่วน B: U05 แท็บ A ไปถึงหน้าสรุปรอบ 12:00 แลก 1 ชุด ยังไม่ยืนยัน', async () => {
    await app.lockAndReset(LOCK);
    await app.ownerRelogin();
    await app.login(page, 'U05');
  });
  const before = await snapshot(app, page);
  const rowsBefore = await adminRowCount(app, DATE);
  await booking.toSummary({ service: 'S01', date: DATE, time: '12:00' });
  await booking.redeemSets(1);

  const tabB = await app.actor('แท็บ B');
  const bookingB = new BookingHelper(app, tabB.page);

  await test.step('5. แท็บ B จองรอบ 14:00 แลก 1 ชุด กดยืนยัน', async () => {
    await app.login(tabB.page, 'U05');
    await bookingB.toSummary({ service: 'S01', date: DATE, time: '14:00' });
    await bookingB.redeemSets(1);
    await checkPay(app, bookingB, 'แท็บ B ฿1,000 − 5% = ฿950 − ฿50 = ฿900', 900);
    await confirmBooking(app, bookingB, 'แท็บ B ยืนยันสำเร็จ');
    await checkPoints(app, tabB.page, 'แท็บ B แต้ม 100 − 100 = 0', 0);
  });

  await test.step('6. กลับแท็บ A กดยืนยัน อ่านข้อความและยอด แล้วรีโหลดแต้มและประวัติ', async () => {
    const { request, code } = await booking.confirm();
    await app.checkValue(page, 'แท็บ A ไม่เกิดนัดรอบ 12:00', { status: request.responseStatus, code }, (v) => {
      expect.soft(v.status).toBeGreaterThanOrEqual(400);
      expect.soft(v.status).toBeLessThan(500);
      expect.soft(v.code).toBeNull();
    });
    const flow = booking.el('booking-flow');
    await app.check(flow, 'แท็บ A มีข้อความแจ้งว่าแต้มไม่พอ', async (el) => {
      await expect.soft(el).toContainText('แต้มไม่พอ');
    });
    if ((await booking.pointsValue().count()) > 0) {
      await checkSets(app, booking, 'แท็บ A หน้าสรุปอัปเดตเป็น 0 ชุด ไม่ค้าง 1 ชุด', 0);
    } else {
      await app.checkValue(page, 'แท็บ A หน้าสรุปไม่ค้าง 1 ชุด', await booking.el('booking-line-points').innerText().catch(() => ''), (v) => {
        expect.soft(lineAmount(v)).toBe(0);
      });
    }
    await checkPay(app, booking, 'แท็บ A ยอดอัปเดตเป็น ฿950 ไม่ค้าง ฿900', 950);

    const after = await snapshot(app, page);
    await app.check(page.getByTestId('account-points'), 'U05 แต้ม 0 ไม่ใช่ −100', async () => {
      expect.soft(after.points).toBe(0);
    });
    await app.checkValue(page, 'U05 มีนัดใหม่นัดเดียว', after.codes.filter((c) => !before.codes.includes(c)), (v) => {
      expect.soft(v).toHaveLength(1);
    });
    await checkAdminRowCount(app, DATE, 'หลังร้าน นัดเพิ่มนัดเดียว', rowsBefore + 1);
  });
});
