/**
 * 5.4 รถรับส่งและ Bangkok Relax (TC-RIDE-01 ถึง TC-RIDE-10) ตาม TEST-PLAN.md บรรทัด 745-930
 * ตัวเลขทุกค่ามาจากแผน ห้ามเปลี่ยนตามที่เว็บแสดง
 */
import { test, expect, plan, LOCK, lineAmount, money, settle, type App, type BookingHelper, type CapturedRequest, type HotelCode } from '../fixtures';
import type { Locator, Page } from '@playwright/test';

const D17 = '2026-06-17';
const NOON = '12:00';
const GUEST = 'คุณทดสอบ';

let phoneSeq = 0;
/** เบอร์แขกไม่ซ้ำกันตามกติกา 7.3 */
const nextPhone = () => `0895400${String(++phoneSeq).padStart(3, '0')}`;

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;
/** ยอดเต็มแบบมีขอบเขต ไม่จับ ฿1,3000 */
const bahtRe = (n: number) => new RegExp(`฿\\s?${n.toLocaleString('en-US')}(?![\\d,])`);
const is2xx = (s: number | null) => s !== null && s >= 200 && s < 300;
const is4xx = (s: number | null) => s !== null && s >= 400 && s < 500;

function errorsOn(page: Page, re: RegExp): Locator {
  return page.locator('[data-testid^="error-"]').filter({ hasText: re });
}

async function amountOf(booking: BookingHelper, id: string): Promise<number> {
  await booking.quoteReady();
  const el = booking.el(id);
  if (!(await el.count())) return NaN;
  return lineAmount(await el.innerText());
}

/** จำนวนคันจากบรรทัดค่ารถ เช่น "ค่ารถรับส่ง 2 คัน ฿600" (ตัดยอดเงินออกก่อน ใช้ได้ทุกภาษา) */
function carsOf(text: string): number {
  const m = /\d+/.exec(text.replace(/฿\s?-?[\d,]+|[\d,]+\s?泰铢/g, ''));
  return m ? Number(m[0]) : NaN;
}

/** อ่านค่ารถและยอดจ่ายหลังราคาหยุดคำนวณ แล้วเทียบเลขเต็ม */
async function checkFeeAndPay(app: App, booking: BookingHelper, label: string, fee: number, pay: number, cars?: number) {
  const gotFee = await amountOf(booking, 'booking-line-transport');
  const gotPay = await amountOf(booking, 'booking-pay-at-shop');
  const feeLine = booking.el('booking-line-transport');
  const feeText = (await feeLine.count()) ? await feeLine.innerText() : '';
  await app.check(feeLine, `${label} · ค่ารถ ${baht(fee)}${cars === undefined ? '' : ` ${cars} คัน`}`, async () => {
    expect.soft(gotFee, `${label}: ค่ารถ`).toBe(fee);
    if (cars !== undefined) expect.soft(carsOf(feeText), `${label}: จำนวนคัน`).toBe(cars);
  });
  await app.check(booking.el('booking-pay-at-shop'), `${label} · ยอด ${baht(pay)}`, async () => {
    expect.soft(gotPay, `${label}: ยอดจ่ายหน้าร้าน`).toBe(pay);
  });
}

type ConfirmTry = { disabled: boolean; created: boolean; status: number | null };

/** ลองกดยืนยัน: ถ้าปุ่มปิดไม่กด · ถ้าปุ่มเปิดกดจริงแล้วดูว่าเกิดการจองหรือไม่ */
async function tryConfirm(booking: BookingHelper): Promise<ConfirmTry> {
  const page = booking.page;
  const btn = booking.confirmButton();
  await booking.quoteReady();
  if (await btn.isDisabled()) return { disabled: true, created: false, status: null };
  const waiting = page
    .waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/bookings', { timeout: 6_000 })
    .catch(() => null);
  await btn.click();
  const res = await waiting;
  await settle(page);
  const status = res ? res.status() : null;
  return { disabled: false, created: is2xx(status) || (await booking.el('booking-code').count()) > 0, status };
}

/** ยืนยันไม่ได้: ถ้าระบบปล่อยผ่านจะบันทึกข้อล้ม แล้วเปิดหน้าสรุปใหม่เพื่อให้จุดตรวจถัดไปยังทำงาน */
async function checkCannotConfirm(app: App, booking: BookingHelper, label: string, reopen: () => Promise<void>) {
  const r = await tryConfirm(booking);
  await app.checkValue(booking.page, label, r, (v) => {
    expect.soft(v.created, `${label}: ต้องไม่เกิดการจอง`).toBe(false);
  });
  if (r.created) await reopen();
}

/** กดยืนยันที่ต้องสำเร็จ คืนรหัสจอง หรือ null ถ้าทำไม่ได้ (บันทึกเป็นข้อล้ม) */
async function confirmMustSucceed(app: App, booking: BookingHelper, label: string) {
  await booking.quoteReady();
  if (await booking.confirmButton().isDisabled()) {
    await app.checkValue(booking.page, label, 'ปุ่มยืนยันกดไม่ได้', (v) => {
      expect.soft(v, `${label}: ปุ่มยืนยันต้องกดได้`).toBe('กดได้');
    });
    return null;
  }
  const { code, request } = await booking.confirm();
  await app.checkValue(booking.page, label, { status: request.responseStatus, code }, (v) => {
    expect.soft(is2xx(v.status), `${label}: สถานะ ${v.status}`).toBe(true);
    expect.soft(v.code, `${label}: ต้องได้รหัสจอง`).toBeTruthy();
  });
  return { code, request };
}

/** เปิดคิวหลังร้านด้วยบัญชีร้าน นับแถวบนหน้าจอ */
async function checkQueue(app: App, date: string, expected: number, label: string) {
  const admin = await app.admin();
  await admin.open(date);
  await app.check(admin.page.getByTestId('admin-page'), label, async () => {
    await expect.soft(admin.rowsLocator(), label).toHaveCount(expected);
  });
  return { admin, count: await admin.rowCount() };
}

/** แสดงผลนับคิวซ้ำบนหน้าหลัก เพื่อเป็นภาพท้าย GIF */
async function finalQueue(app: App, page: Page, label: string, count: number, expected: number) {
  await app.checkValue(page, label, count, (v) => { expect.soft(v, label).toBe(expected); });
}

/** P01 ไม่มีช่องติ๊กรถ (รวมรถอยู่แล้ว) จึงใช้ helper รถของ fixture ไม่ได้ */
async function p01Hotel(booking: BookingHelper, hotel: HotelCode) {
  await booking.el('booking-shuttle-mode-hotel').check();
  await booking.el('booking-shuttle-hotel').selectOption(hotel);
  await booking.quoteReady();
}
async function p01Distance(booking: BookingHelper, km: string) {
  await booking.el('booking-shuttle-mode-distance').check();
  await booking.el('booking-shuttle-distance').fill(km);
  await booking.el('booking-shuttle-distance').blur();
  await booking.quoteReady();
}

// ----------------------------------------------------------------

test('TC-RIDE-01 ค่ารถตรงขอบ 5.0 และ 15.0 กม. และระยะเกินถูกปฏิเสธก่อนยืนยัน', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      '4.9 กม. → ค่ารถ ฿0 ยอด ฿1,000 (1 คัน × ฿0)',
      'H02 5.0 → ค่ารถ ฿0 ยอด ฿1,000 (ถ้าใช้ < 5.0 จะได้ ฿1,300)',
      'H03 5.1 → ค่ารถ ฿300 ยอด ฿1,300 (฿1,000 + ฿300 · ถ้าปัดเป็น 5 จะได้ ฿1,000)',
      '14.9 กม. → ค่ารถ ฿300 ยอด ฿1,300',
      'H05 15.0 → ค่ารถ ฿300 ยอด ฿1,300 (ถ้าใช้ < 15.0 จะถูกปฏิเสธ)',
      'พิมพ์ 5.0 → ค่ารถ ฿0 ยอด ฿1,000 (ถ้าใช้ < 5.0 จะได้ ฿1,300) · พิมพ์ 5.1 → ค่ารถ ฿300 ยอด ฿1,300 (ถ้าปัดเป็น 5 จะได้ ฿1,000) · พิมพ์ 15.0 → ค่ารถ ฿300 ยอด ฿1,300 (ถ้าใช้ < 15.0 จะถูกปฏิเสธ)',
      'H06 15.1 และพิมพ์ 15.1 → มีข้อความแจ้งว่าไม่รับระยะนี้ก่อนยืนยัน และกดยืนยันไม่ได้ (ถ้าปล่อยผ่านจะได้ ฿1,300)',
      'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. ในหลังร้านเป็น 0 รายการ',
    ].join('\n'),
    source: '[D] §4 รถรับส่ง · [D] §3 ระยะโรงแรม · [D] บ.20',
    frbr: 'FR-53, FR-54, BR-34, BR-35',
    rules: 'R58, R59',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const reopen = async () => {
    await booking.toSummary({ service: 'S01', date: D17, time: NOON });
    await booking.guest(GUEST, nextPhone());
  };

  await test.step('1. เริ่มจอง S01 1 คน 17 มิ.ย. 12:00 ไปหน้าจอ 3', reopen);

  await test.step('2-3. ติ๊กรถ ใส่ค่าทีละแถว อ่านค่ารถและยอด', async () => {
    const rows: { name: string; apply: () => Promise<void>; fee: number; pay: number }[] = [
      { name: 'พิมพ์ 4.9', apply: () => booking.shuttleDistance('4.9'), fee: 0, pay: 1000 },
      { name: 'H02 5.0', apply: () => booking.shuttleHotel('H02'), fee: 0, pay: 1000 },
      { name: 'H03 5.1', apply: () => booking.shuttleHotel('H03'), fee: 300, pay: 1300 },
      { name: 'พิมพ์ 14.9', apply: () => booking.shuttleDistance('14.9'), fee: 300, pay: 1300 },
      { name: 'H05 15.0', apply: () => booking.shuttleHotel('H05'), fee: 300, pay: 1300 },
      { name: 'พิมพ์ 5.0', apply: () => booking.shuttleDistance('5.0'), fee: 0, pay: 1000 },
      { name: 'พิมพ์ 5.1', apply: () => booking.shuttleDistance('5.1'), fee: 300, pay: 1300 },
      { name: 'พิมพ์ 15.0', apply: () => booking.shuttleDistance('15.0'), fee: 300, pay: 1300 },
    ];
    for (const r of rows) {
      await r.apply();
      await checkFeeAndPay(app, booking, r.name, r.fee, r.pay);
    }
  });

  await test.step('4. ที่ H06 และ 15.1 กม. ลองกดยืนยัน', async () => {
    await booking.shuttleHotel('H06');
    await app.check(errorsOn(page, /ไม่รับ/), 'H06 15.1 มีข้อความแจ้งว่าไม่รับระยะนี้', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'H06 15.1 กดยืนยันไม่ได้', reopen);

    await booking.shuttleDistance('15.1');
    await app.check(errorsOn(page, /ไม่รับ/), 'พิมพ์ 15.1 มีข้อความแจ้งว่าไม่รับระยะนี้', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'พิมพ์ 15.1 กดยืนยันไม่ได้', reopen);
  });

  await test.step('5. รีโหลด แล้วเปิดคิว 17 มิ.ย. ที่หลังร้าน', async () => {
    await app.reload(page);
    const { count } = await checkQueue(app, D17, 0, 'คิว 17 มิ.ย. เป็น 0 รายการ');
    await finalQueue(app, page, 'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ', count, 0);
  });
});

test('TC-RIDE-02 จำนวนคันปัดขึ้นทุก 4 คน และยอดรวมถูกเมื่อมีส่วนลดกลุ่มกับค่ารถ', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      '3 คน H04 → 1 คัน ค่ารถ ฿300 ยอด ฿3,300 (฿3,000 + ฿300 · ถ้าลดกลุ่ม 10% จะได้ ฿3,000)',
      '4 คน H04 → 1 คัน ค่ารถ ฿300 ยอด ฿3,900 (฿4,000 − 10% = ฿3,600 + ฿300 · ถ้าคิด 2 คันจะได้ ฿4,200 ถ้าไม่ลดกลุ่มจะได้ ฿4,300)',
      '5 คน H04 → 2 คัน ค่ารถ ฿600 ยอด ฿5,100 (฿5,000 − 10% = ฿4,500 + ฿600 · ถ้าคิด 1 คันจะได้ ฿4,800)',
      '6 คน H04 → 2 คัน ค่ารถ ฿600 ยอด ฿6,000 (฿6,000 − 10% = ฿5,400 + ฿600 · ถ้าคิด 3 คันจะได้ ฿6,300)',
      '5 คน H02 → 2 คัน ค่ารถ ฿0 ยอด ฿4,500 (2 × ฿0 · ถ้าเก็บเพราะเกิน 4 คนจะได้ ฿5,100)',
      'แถว 6 คน: หน้าสรุป หน้ายืนยัน และหลังร้าน ต่างเป็น ฿6,000',
    ].join('\n'),
    source: '[D] §4 รถรับส่ง · [D][R] E173–E177',
    frbr: 'FR-53, BR-34, BR-36',
    rules: 'R61',
    technique: 'Boundary, Happy path',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  await test.step('1. แขก 3 คน H04', async () => {
    await booking.toSummary({ service: 'S01', party: 3, date: D17, time: NOON });
    await booking.shuttleHotel('H04');
    await checkFeeAndPay(app, booking, '3 คน H04', 300, 3300, 1);
  });

  await test.step('1. U06 4 คน H04 ที่ /zh', async () => {
    await app.login(page, 'U06', 'zh');
    await booking.toSummary({ service: 'S01', party: 4, date: D17, time: NOON, locale: 'zh' });
    await booking.shuttleHotel('H04');
    await checkFeeAndPay(app, booking, '4 คน H04', 300, 3900, 1);
    await page.context().clearCookies();
  });

  await test.step('2. แถวแขกที่เหลือ โดยยังไม่กดยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', party: 5, date: D17, time: NOON });
    await booking.shuttleHotel('H04');
    await checkFeeAndPay(app, booking, '5 คน H04', 600, 5100, 2);

    await booking.toSummary({ service: 'S01', party: 5, date: D17, time: NOON });
    await booking.shuttleHotel('H02');
    await checkFeeAndPay(app, booking, '5 คน H02', 0, 4500, 2);
  });

  let code: string | null = null;
  await test.step('3. แขก 6 คน H04 กดยืนยัน รีโหลดหน้ายืนยัน', async () => {
    await booking.toSummary({ service: 'S01', party: 6, date: D17, time: NOON });
    await booking.shuttleHotel('H04');
    await checkFeeAndPay(app, booking, '6 คน H04 หน้าสรุป', 600, 6000, 2);
    await booking.guest(GUEST, nextPhone());
    const done = await confirmMustSucceed(app, booking, 'ยืนยันแถว 6 คน H04');
    code = done?.code ?? null;
    if (!code) return;
    await app.check(booking.el('booking-confirmation'), 'หน้ายืนยัน 6 คน ยอด ฿6,000', async (el) => {
      await expect.soft(el).toContainText(/จ่ายหน้าร้าน\s*฿\s?6,000(?![\d,])/);
    });
    await app.reload(page);
    const confirmation = booking.el('booking-confirmation');
    if (await confirmation.count()) {
      await app.check(confirmation, 'หลังรีโหลดหน้ายืนยัน ยอด ฿6,000', async (el) => {
        await expect.soft(el).toContainText(/จ่ายหน้าร้าน\s*฿\s?6,000(?![\d,])/);
      });
    } else {
      // กติกา 7.3: หน้ายืนยันอาจหายเมื่อรีโหลด ยอดหลังรีโหลดอ่านจากหลังร้านในขั้น 4
      await app.checkValue(page, 'หน้ายืนยันหายเมื่อรีโหลด อ่านยอดจากหลังร้านแทน', page.url(), () => {});
    }
  });

  await test.step('4. เปิดคิว 17 มิ.ย. ที่หลังร้าน อ่านยอด', async () => {
    const admin = await app.admin();
    await admin.open(D17);
    if (!code) {
      await app.check(admin.page.getByTestId('admin-page'), 'ต้องมีการจอง 6 คนในคิว 17 มิ.ย.', async () => {
        await expect.soft(admin.rowsLocator()).toHaveCount(1);
      });
      return;
    }
    const pay = lineAmount(await admin.pay(code).innerText().catch(() => ''));
    await app.check(admin.pay(code), 'หลังร้าน ยอด ฿6,000', async () => {
      expect.soft(pay, 'ยอดในหลังร้าน').toBe(6000);
    });
    await app.checkValue(page, 'แถว 6 คน: ยอดหลังร้าน ฿6,000', pay, (v) => { expect.soft(v).toBe(6000); });
  });
});

test('TC-RIDE-03 Bangkok Relax ไม่ลด % ทุกระดับ ไม่เก็บค่ารถ และแต้มกับ Gift Card ถูก', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      'หน้าแพ็กเกจ: ฿2,900/คน และบอกครบ นวดไทย ประคบสมุนไพร รถรับส่ง',
      'U05 Gold → ส่วนลด ฿0 ค่ารถ ฿0 ยอด ฿2,900 (ถ้าลด 5% จะได้ ฿2,755)',
      'U10 Platinum → ส่วนลด ฿0 ค่ารถ ฿0 ยอด ฿2,900 (ถ้าลด 10% จะได้ ฿2,610)',
      'U03 Silver → ค่ารถ ฿0 ยอด ฿2,900 (ถ้าเก็บค่ารถจะได้ ฿3,200)',
      'U03 แลกแต้มและใช้บัตร → จ่าย ฿2,300 (฿2,900 − ฿100 = ฿2,800 + ฿0 − ฿500 · ถ้าเก็บค่ารถจะได้ ฿2,600)',
      'หลังกดเสร็จ: ได้ 23 แต้ม เหลือ 73 แต้ม (250 − 200 + 23 · ฐาน ฿2,300 ÷ 100 · ถ้าฐาน ฿2,800 จะเหลือ 78 ถ้าฐาน ฿2,900 จะเหลือ 79) · บัตรเหลือ ฿0 (฿500 − ฿500) · ยอดสะสม ฿12,299 ระดับ Gold (฿9,999 + ฿2,300)',
    ].join('\n'),
    source: '[D] §4 Bangkok Relax · [D] บ.19 · [D][R] E145–E147 · [R] ⚠️A-33 · [R] ⚠️A-09 · [R] ⚠️A-10',
    frbr: 'FR-51, FR-52, BR-30, BR-37',
    rules: 'R47',
    technique: 'Happy path, Equivalence partition',
    timing: 'ทันที · ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  await test.step('1. เปิดหน้าแพ็กเกจ อ่านราคาและสิ่งที่รวม', async () => {
    await app.goto(page, '/th/packages/bangkok-relax');
    await app.check(page.getByTestId('package-price'), 'ราคา ฿2,900/คน', async (el) => {
      await expect.soft(el).toHaveText(/฿2,900(?![\d,])\s*\/\s*คน/);
    });
    await app.check(page.getByTestId('package-includes'), 'รวม นวดไทย ประคบสมุนไพร รถรับส่ง', async (el) => {
      await expect.soft(el).toContainText('นวดไทย');
      await expect.soft(el).toContainText('ประคบสมุนไพร');
      await expect.soft(el).toContainText('รถรับส่ง');
    });
  });

  const summary = async () => {
    await booking.toSummary({ service: 'P01', date: D17, time: NOON });
    await p01Hotel(booking, 'H04');
  };

  await test.step('2. U05 Gold จอง P01 ไม่แลกแต้ม อ่านหน้าสรุป', async () => {
    await app.login(page, 'U05');
    await summary();
    const discount = await amountOf(booking, 'booking-line-discount');
    await app.check(booking.el('booking-line-discount'), 'U05 ส่วนลด ฿0', async () => { expect.soft(discount).toBe(0); });
    await checkFeeAndPay(app, booking, 'U05 Gold', 0, 2900);
  });

  await test.step('3. ทำซ้ำด้วย U10 และ U03', async () => {
    await app.login(page, 'U10');
    await summary();
    const discount = await amountOf(booking, 'booking-line-discount');
    await app.check(booking.el('booking-line-discount'), 'U10 ส่วนลด ฿0', async () => { expect.soft(discount).toBe(0); });
    await checkFeeAndPay(app, booking, 'U10 Platinum', 0, 2900);

    await app.login(page, 'U03');
    await summary();
    await checkFeeAndPay(app, booking, 'U03 Silver', 0, 2900);
  });

  let code: string | null = null;
  await test.step('4. U03 แลก 200 แต้ม ใส่ GIFT-500 แล้วกดยืนยัน', async () => {
    await booking.redeemSets(2);
    await booking.giftCard('GIFT-500');
    await checkFeeAndPay(app, booking, 'U03 แลก 200 แต้ม + GIFT-500', 0, 2300);
    const done = await confirmMustSucceed(app, booking, 'U03 ยืนยันการจอง');
    code = done?.code ?? null;
  });

  await test.step('5. ร้านกดใช้บริการเสร็จ', async () => {
    const admin = await app.admin();
    await admin.open(D17);
    if (!code) {
      await app.check(admin.page.getByTestId('admin-page'), 'ต้องมีการจองของ U03 ในคิว', async () => {
        await expect.soft(admin.rowsLocator()).toHaveCount(1);
      });
      return;
    }
    const req = await admin.complete(code);
    await app.checkValue(admin.page, 'กดใช้บริการเสร็จสำเร็จ', req.responseStatus, (v) => {
      expect.soft(is2xx(v), `สถานะ ${v}`).toBe(true);
    });
  });

  await test.step('6. กลับบัญชี U03 รีโหลด อ่านยอดบัตร แต้ม ระดับ', async () => {
    await app.reload(page);
    const card = await app.readGiftCard(page, 'GIFT-500');
    await app.check(page.getByTestId('giftcard-check-section'), 'GIFT-500 เหลือ ฿0', async () => {
      expect.soft(card.balance, 'ยอดบัตรคงเหลือ').toBe(0);
    });
    const acc = await app.readAccount(page);
    await app.check(page.getByTestId('account-spend'), 'ยอดสะสม ฿12,299', async () => {
      expect.soft(acc.spend, 'ยอดสะสม').toBe(12299);
    });
    await app.check(page.getByTestId('account-tier'), 'ระดับ Gold', async (el) => {
      await expect.soft(el).toContainText('Gold');
    });
    await app.check(page.getByTestId('account-points'), 'เหลือ 73 แต้ม', async () => {
      expect.soft(acc.points, 'แต้มคงเหลือ').toBe(73);
    });
  });
});

test('TC-RIDE-04 Bangkok Relax ต้องระบุโรงแรมหรือระยะ รวมค่ารถถึง 15.0 กม. และไม่รับเกินนั้น', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      'ไม่ระบุ → ไปต่อไม่ได้ และมีข้อความแจ้งให้ระบุโรงแรมหรือระยะ (ถ้าปล่อยผ่านจะได้การจอง ฿2,900 ที่ไม่มีจุดรับ)',
      'พิมพ์ 15.1 และ H06 → มีข้อความแจ้งว่าไม่รับระยะนี้ และยืนยันไม่ได้ (ถ้าปล่อยผ่านจะได้ ฿2,900)',
      'ข้อมูลไม่เปลี่ยน: ขั้น 3 คิว 17 มิ.ย. เป็น 0 รายการ',
      '14.9 กม. → ค่ารถ ฿0 ยอด ฿2,900 (ถ้าเก็บค่ารถจะได้ ฿3,200)',
      'H05 15.0 → ค่ารถ ฿0 ยอด ฿2,900 (ถ้าใช้ < 15.0 จะถูกปฏิเสธ)',
      'ขั้น 6 คิว 17 มิ.ย. เป็น 1 รายการ ยอด ฿2,900',
    ].join('\n'),
    source: '[D] §4 Bangkok Relax · [R] ⚠️A-33',
    frbr: 'FR-52, BR-37',
    rules: 'R63',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const reopen = async () => {
    await booking.toSummary({ service: 'P01', date: D17, time: NOON });
    await booking.guest(GUEST, nextPhone());
  };

  await test.step('1. เริ่มจอง P01 ไม่ระบุอะไร ลองไปต่อ', async () => {
    await reopen();
    await app.check(errorsOn(page, /โรงแรม.*ระยะ/), 'แจ้งให้ระบุโรงแรมหรือระยะ', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'ไม่ระบุ ไปต่อไม่ได้', reopen);
  });

  await test.step('2. พิมพ์ 15.1 แล้วเลือก H06 ลองไปต่อ', async () => {
    await p01Distance(booking, '15.1');
    await app.check(errorsOn(page, /ไม่รับ/), 'พิมพ์ 15.1 แจ้งว่าไม่รับระยะนี้', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'พิมพ์ 15.1 ยืนยันไม่ได้', reopen);

    await p01Hotel(booking, 'H06');
    await app.check(errorsOn(page, /ไม่รับ/), 'H06 แจ้งว่าไม่รับระยะนี้', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'H06 ยืนยันไม่ได้', reopen);
  });

  await test.step('3. เปิดคิว 17 มิ.ย. ใน context แยก โดยไม่ปิดหน้าจองของแขก', async () => {
    await checkQueue(app, D17, 0, 'ขั้น 3 คิว 17 มิ.ย. 0 รายการ');
  });

  await test.step('4. กลับมาพิมพ์ 14.9 อ่านยอด', async () => {
    await p01Distance(booking, '14.9');
    await checkFeeAndPay(app, booking, 'P01 พิมพ์ 14.9', 0, 2900);
  });

  let code: string | null = null;
  await test.step('5. เลือก H05 อ่านยอด แล้วกดยืนยัน', async () => {
    await p01Hotel(booking, 'H05');
    await checkFeeAndPay(app, booking, 'P01 H05 15.0', 0, 2900);
    const done = await confirmMustSucceed(app, booking, 'ยืนยัน P01 H05');
    code = done?.code ?? null;
  });

  await test.step('6. รีโหลด แล้วเปิดคิว 17 มิ.ย. อีกครั้ง', async () => {
    await app.reload(page);
    const { admin, count } = await checkQueue(app, D17, 1, 'ขั้น 6 คิว 17 มิ.ย. 1 รายการ');
    const codes = await admin.codes();
    const rowCode = code ?? codes[0];
    let pay = NaN;
    if (rowCode) {
      pay = lineAmount(await admin.pay(rowCode).innerText().catch(() => ''));
      await app.check(admin.pay(rowCode), 'ยอดในหลังร้าน ฿2,900', async () => { expect.soft(pay).toBe(2900); });
    }
    await app.checkValue(page, 'ขั้น 6 คิว 1 รายการ ยอด ฿2,900', { count, pay }, (v) => {
      expect.soft(v.count).toBe(1);
      expect.soft(v.pay).toBe(2900);
    });
  });
});

test('TC-RIDE-05 Bangkok Relax จองได้สูงสุด 3 คน และนับนักบำบัดที่ถูกจองไปแล้ว', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      '2 คน → ฿5,800 (฿2,900 × 2 · ถ้าเก็บรถจะได้ ฿6,100) ห้องเป็น Couple Suite',
      '3 คน → ฿8,700 (฿2,900 × 3 · ถ้าลดกลุ่ม 10% จะได้ ฿7,830 ถ้าเก็บรถจะได้ ฿9,000) นักบำบัดคือ T01, T02, T06',
      '4 คน → จองไม่ได้ มีข้อความแจ้ง (ถ้าปล่อยผ่านจะได้ ฿11,600) · ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. ก่อนรีเซ็ต 0 รายการ',
      '3 คน 24 มิ.ย. 10:00 → จองไม่ได้ เหลือ 3 − 1 = 2 คน (ถ้าไม่นับ B13 จะได้ ฿8,700) · ข้อมูลไม่เปลี่ยน: คิว 24 มิ.ย. 2 รายการ คือ `SJTEST13` (T02 10:00–12:00) และ `SJTEST14` (T03 12:00–13:00)',
    ].join('\n'),
    source: '[D] §2 นักบำบัด · [R] ⚠️A-34 · [R] ⚠️D-01 · F-ร้าน 6',
    frbr: 'FR-52, BR-12',
    rules: 'R18',
    technique: 'Boundary, Negative, State',
    timing: 'ทันที · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(8 * 60_000);

  await test.step('1. แถว 2 คน: จองและยืนยัน อ่านยอดและห้อง', async () => {
    await booking.toSummary({ service: 'P01', party: 2, date: D17, time: NOON });
    await p01Hotel(booking, 'H04');
    await checkFeeAndPay(app, booking, 'P01 2 คน H04', 0, 5800);
    await booking.guest(GUEST, nextPhone());
    const done = await confirmMustSucceed(app, booking, 'ยืนยัน P01 2 คน');
    if (done) {
      await app.checkValue(page, 'ห้องเป็น Couple Suite', done.request.responseBody?.booking?.isCoupleSuite, (v) => {
        expect.soft(v, 'isCoupleSuite').toBe(true);
      });
    }
  });

  await test.step('2. รีเซ็ต แถว 3 คน: จองและยืนยัน ดูนักบำบัดในหลังร้าน', async () => {
    await app.lockAndReset(LOCK);
    await booking.toSummary({ service: 'P01', party: 3, date: D17, time: NOON });
    await p01Hotel(booking, 'H04');
    await checkFeeAndPay(app, booking, 'P01 3 คน H04', 0, 8700);
    await booking.guest(GUEST, nextPhone());
    const done = await confirmMustSucceed(app, booking, 'ยืนยัน P01 3 คน');
    const code = done?.code;
    await app.ownerRelogin();
    const admin = await app.admin();
    await admin.open(D17);
    if (code) {
      const names = (await admin.therapists(code).innerText().catch(() => ''))
        .split(/[,،、\n]/).map((s) => s.trim()).filter(Boolean).sort();
      await app.check(admin.therapists(code), 'นักบำบัด T01, T02, T06', async () => {
        expect.soft(names, 'นักบำบัด').toEqual(['น้องแก้ว', 'พี่มาลี', 'พี่ศรี'].sort());
      });
    }
  });

  await test.step('3. รีเซ็ต U06 ลองจอง 4 คน แล้วเปิดคิว 17 มิ.ย.', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U06');
    await booking.open();
    await booking.chooseService('P01', 4);
    await app.check(booking.el('booking-screen-1'), 'P01 4 คน มีข้อความแจ้งว่าเกิน 3 คน', async (el) => {
      await expect.soft(el).toContainText(/ไม่เกิน 3 คน/);
    });
    await app.check(booking.el('booking-step1-next'), 'P01 4 คน ไปต่อไม่ได้', async (el) => {
      await expect.soft(el).toBeDisabled();
    });
    await app.ownerRelogin();
    await checkQueue(app, D17, 0, 'คิว 17 มิ.ย. ก่อนรีเซ็ต 0 รายการ');
    await page.context().clearCookies();
  });

  await test.step('4. รีเซ็ต แขกลองจอง 3 คน รอบ 24 มิ.ย. 10:00 แล้วเปิดคิว 24 มิ.ย.', async () => {
    await app.lockAndReset(LOCK);
    await booking.open();
    await booking.chooseService('P01', 3);
    const next = booking.el('booking-step1-next');
    let created = false;
    let slotState = 'ไปหน้าจอ 2 ไม่ได้';
    if (await next.isEnabled()) {
      await booking.nextFromStep1();
      await booking.chooseDate('2026-06-24');
      const slot = booking.slot('10:00');
      const shown = (await slot.count()) > 0;
      const usable = shown && (await slot.isEnabled());
      slotState = !shown ? 'ไม่มีรอบ 10:00' : usable ? 'เลือกรอบ 10:00 ได้' : 'รอบ 10:00 กดไม่ได้';
      if (usable) {
        await slot.click();
        await settle(page);
        await booking.nextFromStep2();
        await p01Hotel(booking, 'H04');
        await booking.guest(GUEST, nextPhone());
        created = (await tryConfirm(booking)).created;
      }
    }
    await app.checkValue(page, '3 คน 24 มิ.ย. 10:00 จองไม่ได้', { slotState, created }, (v) => {
      expect.soft(v.created, 'ต้องไม่เกิดการจอง').toBe(false);
    });

    await app.ownerRelogin();
    const { admin } = await checkQueue(app, '2026-06-24', 2, 'คิว 24 มิ.ย. 2 รายการ');
    const codes = (await admin.codes()).sort();
    await app.check(admin.time('SJTEST13'), 'SJTEST13 10:00–12:00', async (el) => {
      await expect.soft(el).toContainText('10:00–12:00');
    });
    await app.check(admin.therapists('SJTEST13'), 'SJTEST13 นักบำบัด T02', async (el) => {
      await expect.soft(el).toHaveText(/^\s*พี่มาลี\s*$/);
    });
    await app.check(admin.time('SJTEST14'), 'SJTEST14 12:00–13:00', async (el) => {
      await expect.soft(el).toContainText('12:00–13:00');
    });
    await app.check(admin.therapists('SJTEST14'), 'SJTEST14 นักบำบัด T03', async (el) => {
      await expect.soft(el).toHaveText(/^\s*พี่ภูมิ\s*$/);
    });
    await app.checkValue(page, 'ข้อมูลไม่เปลี่ยน: คิว 24 มิ.ย. คือ SJTEST13 และ SJTEST14', codes, (v) => {
      expect.soft(v).toEqual(['SJTEST13', 'SJTEST14']);
    });
  });
});

test('TC-RIDE-06 ระยะที่พิมพ์รับเฉพาะค่าไม่ติดลบ ทศนิยมไม่เกิน 1 ตำแหน่ง ไม่ปัดเอง', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      'กลุ่ม ก: `0.0` → ค่ารถ ฿0 ยอด ฿1,000 ไปต่อได้',
      '`−0.1` → ปฏิเสธเพราะติดลบ',
      '`5.05` → ปฏิเสธเพราะมีทศนิยม 2 ตำแหน่ง (ถ้าปัดเป็น 5.1 จะได้ ฿1,300 ถ้าปัดเป็น 5.0 จะได้ ฿1,000)',
      '`abc`, `1e1`, ว่าง, `5.00` → ปฏิเสธ ไปต่อไม่ได้ (ถ้ารับ `1e1` เป็น 10 กม. จะได้ ฿1,300)',
      'กลุ่ม ข: แต่ละค่าต้องเป็นอย่างใดอย่างหนึ่ง คือ รับแล้วคิดตามค่านั้น หรือ ปฏิเสธโดยข้อความบอกว่ารูปแบบตัวเลขผิด · ปฏิเสธด้วยข้อความที่ไม่บอกเหตุถือว่าไม่ผ่าน',
      'ค่าที่รับได้: `.5`, `5.`, `−0`, `+5`, `๕`, ` 5.0 ` → ค่ารถ ฿0 ยอด ฿1,000 · `00012` → 12 กม. ค่ารถ ฿300 ยอด ฿1,300',
      'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ',
    ].join('\n'),
    source: '[R] ⚠️A-35 · [R] · F-สร้าง 16',
    frbr: 'FR-53, BR-38',
    rules: 'R64, R65',
    technique: 'Boundary, Negative, Equivalence partition',
    timing: 'ทันที · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(8 * 60_000);

  const reopen = async () => {
    await booking.toSummary({ service: 'S01', date: D17, time: NOON });
    await booking.guest(GUEST, nextPhone());
  };
  const readState = async () => {
    await booking.quoteReady();
    return {
      enabled: await booking.confirmButton().isEnabled(),
      fee: await amountOf(booking, 'booking-line-transport'),
      pay: await amountOf(booking, 'booking-pay-at-shop'),
      errors: (await page.locator('[data-testid^="error-"]').allInnerTexts()).join(' | '),
    };
  };

  await test.step('1. เริ่มจอง S01 ไปหน้าจอ 3 ติ๊กรถ เลือกโหมดพิมพ์ระยะ', reopen);

  await test.step('2-3. กลุ่ม ก ใส่ค่าทีละตัว', async () => {
    const groupA: { value: string; reason?: RegExp }[] = [
      { value: '-0.1', reason: /ติดลบ/ },
      { value: '0.0' },
      { value: '5.05', reason: /ทศนิยม/ },
      { value: 'abc' },
      { value: '1e1' },
      { value: '' },
      { value: '5.00' },
    ];
    for (const { value, reason } of groupA) {
      await booking.shuttleDistance(value);
      const s = await readState();
      const label = `กลุ่ม ก ค่า "${value}"`;
      if (value === '0.0') {
        await app.checkValue(page, `${label}: ค่ารถ ฿0 ยอด ฿1,000 ไปต่อได้`, s, (v) => {
          expect.soft(v.fee, `${label} ค่ารถ`).toBe(0);
          expect.soft(v.pay, `${label} ยอด`).toBe(1000);
          expect.soft(v.enabled, `${label} ปุ่มยืนยันต้องกดได้`).toBe(true);
        });
        continue;
      }
      await app.checkValue(page, `${label}: ถูกปฏิเสธ`, s, (v) => {
        if (reason) expect.soft(v.errors, `${label} เหตุที่ปฏิเสธ`).toMatch(reason);
        else expect.soft(v.errors, `${label} ต้องมีข้อความปฏิเสธ`).not.toBe('');
      });
      await checkCannotConfirm(app, booking, `${label}: ไปต่อไม่ได้`, reopen);
    }
  });

  await test.step('2-3. กลุ่ม ข ใส่ค่าทีละตัว บันทึกผลแยกทีละค่า', async () => {
    const groupB: { value: string; fee: number; pay: number }[] = [
      { value: '.5', fee: 0, pay: 1000 },
      { value: '5.', fee: 0, pay: 1000 },
      { value: '-0', fee: 0, pay: 1000 },
      { value: '+5', fee: 0, pay: 1000 },
      { value: '๕', fee: 0, pay: 1000 },
      { value: ' 5.0 ', fee: 0, pay: 1000 },
      { value: '00012', fee: 300, pay: 1300 },
    ];
    for (const { value, fee, pay } of groupB) {
      await booking.shuttleDistance(value);
      const s = await readState();
      const label = `กลุ่ม ข ค่า "${value}"`;
      await app.checkValue(page, `${label}: ${s.enabled ? 'รับ' : 'ปฏิเสธ'}`, s, (v) => {
        if (v.enabled) {
          expect.soft(v.fee, `${label} รับแล้วค่ารถต้องตามค่านั้น`).toBe(fee);
          expect.soft(v.pay, `${label} รับแล้วยอดต้องตามค่านั้น`).toBe(pay);
        } else {
          expect.soft(v.errors, `${label} ปฏิเสธต้องบอกว่ารูปแบบตัวเลขผิด`).toMatch(/รูปแบบ|ตัวเลข/);
        }
      });
    }
  });

  await test.step('4. เปิดคิว 17 มิ.ย. ที่หลังร้าน', async () => {
    const { count } = await checkQueue(app, D17, 0, 'คิว 17 มิ.ย. 0 รายการ');
    await finalQueue(app, page, 'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ', count, 0);
  });
});

test('TC-RIDE-07 เปลี่ยนค่าระหว่างกรอกแล้วไม่มียอดเก่าค้าง', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      'ขั้น 1: ยอด ฿1,300',
      'ขั้น 2: ไม่เห็นยอด ฿1,300 บนหน้าจอ และยืนยันไม่ได้ มีข้อความแจ้งว่าไม่รับระยะนี้',
      'ขั้น 3: ยอด ฿1,300 ไปต่อได้',
      'ขั้น 4: ยอด ฿1,000 (ถ้าค่ารถค้างจะได้ ฿1,300)',
      'ขั้น 5: ไปต่อไม่ได้ ต้องกรอกระยะหรือเลือกโรงแรม',
      'ขั้น 6: H04 ยอด ฿1,300 · พิมพ์ 4.9 ยอด ฿1,000 (ถ้าใช้ H04 ค้างจะได้ ฿1,300)',
      'ขั้น 7: คิว 17 มิ.ย. 1 รายการ ยอด ฿1,000',
    ].join('\n'),
    source: '[R] · F-สร้าง 14 · [D][R] กฎเดียวกันทั้งการติ๊กและสลับโหมด',
    frbr: 'FR-53, FR-54, BR-35',
    rules: 'R60, R66',
    technique: 'State, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const reopen = async () => {
    await booking.toSummary({ service: 'S01', date: D17, time: NOON });
    await booking.guest(GUEST, nextPhone());
  };
  const checkPay = async (label: string, expected: number) => {
    const got = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), `${label} ยอด ${baht(expected)}`, async () => {
      expect.soft(got, `${label} ยอด`).toBe(expected);
    });
  };

  await test.step('1. หน้าจอ 3 ติ๊กรถ พิมพ์ 14.9 อ่านยอด', async () => {
    await reopen();
    await booking.shuttleDistance('14.9');
    await checkPay('ขั้น 1', 1300);
  });

  await test.step('2. แก้เป็น 15.1 อ่านยอดและปุ่มยืนยัน', async () => {
    await booking.shuttleDistance('15.1');
    await app.check(booking.el('booking-screen-3'), 'ขั้น 2 ไม่เห็นยอด ฿1,300 บนหน้าจอ', async (el) => {
      await expect.soft(el).not.toContainText(bahtRe(1300));
    });
    await app.check(errorsOn(page, /ไม่รับ/), 'ขั้น 2 แจ้งว่าไม่รับระยะนี้', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await app.check(booking.confirmButton(), 'ขั้น 2 ยืนยันไม่ได้', async (el) => {
      await expect.soft(el).toBeDisabled();
    });
  });

  await test.step('3. แก้กลับเป็น 14.9 อ่านยอด', async () => {
    await booking.shuttleDistance('14.9');
    await checkPay('ขั้น 3', 1300);
    await app.check(booking.confirmButton(), 'ขั้น 3 ไปต่อได้', async (el) => {
      await expect.soft(el).toBeEnabled();
    });
  });

  await test.step('4. ติ๊กรถออก อ่านยอด', async () => {
    await booking.shuttleOff();
    await checkPay('ขั้น 4', 1000);
  });

  await test.step('5. ติ๊กรถใหม่โดยไม่กรอก ลองไปต่อ', async () => {
    await booking.el('booking-shuttle-toggle').check();
    await booking.quoteReady();
    await app.check(errorsOn(page, /โรงแรม.*ระยะ/), 'ขั้น 5 แจ้งให้กรอกระยะหรือเลือกโรงแรม', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
    await checkCannotConfirm(app, booking, 'ขั้น 5 ไปต่อไม่ได้', reopen);
  });

  let code: string | null = null;
  await test.step('6. เลือก H04 อ่านยอด สลับเป็นพิมพ์ 4.9 อ่านยอด แล้วกดยืนยัน', async () => {
    await booking.shuttleHotel('H04');
    await checkPay('ขั้น 6 H04', 1300);
    await booking.shuttleDistance('4.9');
    await checkPay('ขั้น 6 พิมพ์ 4.9', 1000);
    const done = await confirmMustSucceed(app, booking, 'ขั้น 6 กดยืนยัน');
    code = done?.code ?? null;
  });

  await test.step('7. รีโหลด แล้วเปิดคิว 17 มิ.ย.', async () => {
    await app.reload(page);
    const { admin, count } = await checkQueue(app, D17, 1, 'ขั้น 7 คิว 17 มิ.ย. 1 รายการ');
    const rowCode = code ?? (await admin.codes())[0];
    let pay = NaN;
    if (rowCode) {
      pay = lineAmount(await admin.pay(rowCode).innerText().catch(() => ''));
      await app.check(admin.pay(rowCode), 'ขั้น 7 ยอดในหลังร้าน ฿1,000', async () => { expect.soft(pay).toBe(1000); });
    }
    await app.checkValue(page, 'ขั้น 7 คิว 1 รายการ ยอด ฿1,000', { count, pay }, (v) => {
      expect.soft(v.count).toBe(1);
      expect.soft(v.pay).toBe(1000);
    });
  });
});

test('TC-RIDE-08 API ที่ได้รับ hotelId และ distanceKm ขัดกัน ต้องไม่คิดเงินแล้วเงียบ', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      'ทั้ง 2 คำขอถูกปฏิเสธด้วยสถานะ 4xx โดยเหตุเป็นเรื่องระยะ · เหตุอื่นเช่นข้อมูลแขกหรือรอบชนถือว่ายังตัดสินไม่ได้ (ถ้าเชื่อ `hotelId` อย่างเดียวแล้วเงียบจะได้ ฿1,000 ทั้งที่ส่ง 15.1 กม.)',
      'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ',
      'หากคนสร้างเว็บตอบ F-สร้าง 15 ว่ามีกติกาค่าใดชนะ ให้ปรับข้อนี้ตามกติกาที่เขียนไว้ และถือว่าเงียบโดยไม่มีกติกาไม่ผ่าน',
    ].join('\n'),
    source: '[R] · F-สร้าง 15',
    frbr: 'FR-53, BR-35',
    rules: 'R67',
    technique: 'Negative',
    timing: 'ทันที · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const distanceReason = /distance|ระยะ/i;
  const checkRejected = async (label: string, res: { status: number; text: string }) => {
    await app.checkValue(page, `${label} ถูกปฏิเสธ 4xx`, { status: res.status, body: res.text.slice(0, 300) }, (v) => {
      expect.soft(is4xx(v.status), `${label}: สถานะ ${v.status}`).toBe(true);
    });
    if (is4xx(res.status) && !distanceReason.test(res.text)) {
      // เหตุอื่นตามแผนถือว่ายังตัดสินไม่ได้ จึงไม่ assert เหตุ
      test.info().annotations.push({ type: 'pending-answer', description: `${label} ถูกปฏิเสธด้วยเหตุอื่น: ${res.text.slice(0, 200)}` });
      await app.checkValue(page, `${label} เหตุอื่น ยังตัดสินไม่ได้`, res.text.slice(0, 300), () => {});
    } else if (is4xx(res.status)) {
      await app.checkValue(page, `${label} เหตุเป็นเรื่องระยะ`, res.text.slice(0, 300), (v) => {
        expect.soft(v).toMatch(distanceReason);
      });
    }
  };

  let quoteReq: CapturedRequest | undefined;
  let bookReq: CapturedRequest | undefined;

  await test.step('1. จอง S01 รถ H01 วันที่ 19 มิ.ย. เก็บรูปแบบคำขอ แล้วยิงค่าควบคุมที่ 18 มิ.ย.', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-19', time: NOON });
    await booking.guest(GUEST, nextPhone());
    await booking.openShuttle();
    await booking.el('booking-shuttle-toggle').check();
    await booking.el('booking-shuttle-mode-hotel').check();
    await booking.quoteReady();
    quoteReq = await app.capture(page, /\/api\/quote$/, () => booking.el('booking-shuttle-hotel').selectOption('H01'));
    await booking.quoteReady();
    const done = await confirmMustSucceed(app, booking, 'จอง H01 วันที่ 19 มิ.ย. บนหน้าเว็บ');
    bookReq = done?.request;

    const guestApi = await app.guestApi();
    const quoteOk = await app.replay(guestApi, quoteReq, { date: '2026-06-18' });
    await app.checkValue(page, 'ค่าควบคุม /api/quote 18 มิ.ย. สำเร็จ', quoteOk.status, (v) => {
      expect.soft(is2xx(v), `สถานะ ${v}`).toBe(true);
    });
    if (bookReq) {
      const bookOk = await app.replay(guestApi, bookReq, { date: '2026-06-18', guest: { name: GUEST, phone: nextPhone() } });
      await app.checkValue(page, 'ค่าควบคุมยืนยันการจอง 18 มิ.ย. สำเร็จ', bookOk.status, (v) => {
        expect.soft(is2xx(v), `สถานะ ${v}`).toBe(true);
      });
    }
  });

  await test.step('2. ยิง /api/quote 17 มิ.ย. ใส่ทั้ง hotelId และ distanceKm 15.1', async () => {
    const guestApi = await app.guestApi();
    const shuttle = { ...(quoteReq!.body?.shuttle ?? {}), distanceKm: '15.1' };
    const res = await app.replay(guestApi, quoteReq!, { date: D17, shuttle });
    await checkRejected('/api/quote', res);
  });

  await test.step('3. ยิง URL ยืนยันการจองแบบเดียวกัน', async () => {
    if (!bookReq) {
      await app.checkValue(page, 'Blocked: ไม่มีคำขอยืนยันจาก Network', 'ไม่มี', (v) => {
        expect.soft(v, 'Blocked: จองบนหน้าเว็บไม่สำเร็จจึงยิงคำขอยืนยันไม่ได้').toBe('มี');
      });
      return;
    }
    const guestApi = await app.guestApi();
    const shuttle = { ...(bookReq.body?.shuttle ?? {}), distanceKm: '15.1' };
    const res = await app.replay(guestApi, bookReq, { date: D17, shuttle, guest: { name: GUEST, phone: nextPhone() } });
    await checkRejected('POST ยืนยันการจอง', res);
  });

  await test.step('4. เปิดคิว 17 มิ.ย. ที่หลังร้าน', async () => {
    const { count } = await checkQueue(app, D17, 0, 'คิว 17 มิ.ย. 0 รายการ');
    await finalQueue(app, page, 'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ', count, 0);
  });
});

test('TC-RIDE-09 เครื่องคำนวณ /shuttle ตรงกับหน้าจอง บอกช่องที่ผิด และลิงก์จองพาค่าไปต่อ', {
  tag: ['@P3', '@5.4'],
  annotation: plan({
    expected: [
      '4 คน H04 → 1 คัน ฿300 · 5 คน H04 → 2 คัน ฿600 (ถ้า 1 คันจะได้ ฿300) · 5 คน H02 → 2 คัน ฿0 (ถ้าเก็บจะได้ ฿600) · 1 คน H06 → แจ้งว่าไม่รับ เหมือนหน้าจอง',
      'จำนวนคนผิดทุกค่า → ไม่แสดงจำนวนรถและค่ารถ และข้อความบอกว่าช่องจำนวนคนผิด (ถ้าปัด `1.5` เป็น 2 จะแสดง 1 คัน ฿300)',
      'หลังกดลิงก์ → หน้าจองยังเป็น 5 คน ติ๊กรถ และเลือก H04 ไว้ (ถ้าค่าไม่ตามมาจะกลับเป็น 1 คน ยอด ฿1,000) · หน้าสรุป S01 ยอด ฿5,100 (฿5,000 − 10% = ฿4,500 + ฿600)',
      'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ',
    ].join('\n'),
    source: '[D][R] กฎเดียวกับหน้าจอง · [R] · F-สร้าง 17 · [R] · F-สร้าง 13',
    frbr: 'FR-53, BR-36',
    rules: 'R62, R66, R68',
    technique: 'Equivalence partition, Negative',
    timing: 'ทันที · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const t = (id: string) => page.getByTestId(id);
  const calculate = async (party: string, hotel: HotelCode) => {
    await t('shuttle-mode-hotel').check();
    await t('shuttle-hotel').selectOption(hotel);
    await t('shuttle-party').fill(party);
    await t('shuttle-calc-submit').click();
    await settle(page);
  };

  await test.step('1. เปิด /th/shuttle ใส่ค่าถูกทีละแถว', async () => {
    await app.goto(page, '/th/shuttle');
    const rows: { party: string; hotel: HotelCode; cars: number; fee: number }[] = [
      { party: '4', hotel: 'H04', cars: 1, fee: 300 },
      { party: '5', hotel: 'H04', cars: 2, fee: 600 },
      { party: '5', hotel: 'H02', cars: 2, fee: 0 },
    ];
    for (const r of rows) {
      await calculate(r.party, r.hotel);
      const label = `${r.party} คน ${r.hotel}`;
      const carsEl = t('shuttle-result-cars');
      const feeEl = t('shuttle-result-fee');
      const cars = (await carsEl.count()) ? money(await carsEl.innerText()) : NaN;
      const fee = (await feeEl.count()) ? lineAmount(await feeEl.innerText()) : NaN;
      await app.check(t('shuttle-result'), `${label} → ${r.cars} คัน ${baht(r.fee)}`, async () => {
        expect.soft(cars, `${label} จำนวนรถ`).toBe(r.cars);
        expect.soft(fee, `${label} ค่ารถ`).toBe(r.fee);
      });
    }
    await calculate('1', 'H06');
    await app.check(errorsOn(page, /ไม่รับ/), '1 คน H06 แจ้งว่าไม่รับ เหมือนหน้าจอง', async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
  });

  await test.step('2. ใส่จำนวนคนผิดทีละค่าคู่กับ H04', async () => {
    for (const party of ['0', '-1', '1.5', '']) {
      await calculate(party, 'H04');
      const label = `จำนวนคน "${party}"`;
      await app.check(t('shuttle-calc-section'), `${label} ไม่แสดงจำนวนรถและค่ารถ`, async () => {
        await expect.soft(t('shuttle-result-cars'), `${label} จำนวนรถ`).toHaveCount(0);
        await expect.soft(t('shuttle-result-fee'), `${label} ค่ารถ`).toHaveCount(0);
      });
      await app.check(errorsOn(page, /จำนวนคน/), `${label} ข้อความบอกว่าช่องจำนวนคนผิด`, async (el) => {
        await expect.soft(el.first()).toBeVisible();
      });
    }
  });

  await test.step('3. ใส่ 5 คน H04 แล้วกดลิงก์จองคิวพร้อมรถรับส่ง', async () => {
    await calculate('5', 'H04');
    await t('shuttle-book-link').click();
    await page.waitForURL(/\/booking/);
    await page.waitForSelector('html[data-ready="true"]');
    await settle(page);
  });

  await test.step('4. อ่านจำนวนคนและรถที่หน้าจอง เลือก S01 ไปหน้าสรุป ไม่ยืนยัน', async () => {
    await app.check(t('booking-party-5'), 'หน้าจองยังเป็น 5 คน', async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    });
    await t('booking-service-S01').click();
    await settle(page);
    const stillFive = (await t('booking-party-5').getAttribute('aria-pressed')) === 'true';
    await booking.nextFromStep1();
    await booking.chooseDate(D17);
    if (!stillFive) await booking.chooseTherapist('any');
    await booking.chooseSlot(NOON);
    await booking.nextFromStep2();
    await booking.openShuttle();
    await app.check(t('booking-shuttle-toggle'), 'ติ๊กรถไว้แล้ว', async (el) => {
      await expect.soft(el).toBeChecked();
    });
    await app.check(t('booking-shuttle-hotel'), 'เลือก H04 ไว้แล้ว', async (el) => {
      await expect.soft(el).toHaveValue('H04');
    });
    const pay = await booking.pay();
    await app.check(t('booking-pay-at-shop'), 'หน้าสรุป S01 ยอด ฿5,100', async () => {
      expect.soft(pay, 'ยอดหน้าสรุป').toBe(5100);
    });
  });

  await test.step('5. เปิดคิว 17 มิ.ย. ที่หลังร้าน', async () => {
    const { count } = await checkQueue(app, D17, 0, 'คิว 17 มิ.ย. 0 รายการ');
    await finalQueue(app, page, 'ข้อมูลไม่เปลี่ยน: คิว 17 มิ.ย. 0 รายการ', count, 0);
  });
});

test('TC-RIDE-10 ตารางหลังร้านแสดงจุดรับและจำนวนรถบนหน้าจอ', {
  tag: ['@P1', '@5.4'],
  annotation: plan({
    expected: [
      '17 มิ.ย.: บนหน้าจอเห็นระยะ 14.9 กม. และ 1 คัน ยอด ฿1,300 (฿1,000 + ฿300)',
      '26 มิ.ย. `SJTEST16`: บนหน้าจอเห็น โรงแรมกล้วยไม้ พาเลซ ระยะ 12.0 กม. และ 2 คัน (6 ÷ 4 ปัดขึ้น) ยอด ฿6,000',
      'ต้องอ่านจากหน้าจอ ข้อมูลใน JSON ของ API อย่างเดียวไม่นับว่าผ่าน',
    ].join('\n'),
    source: '[R] · F-ร้าน 10 · F-สร้าง 28 · [D] §4 หลังร้านและข้อมูลส่วนตัว',
    frbr: 'FR-78, BR-36',
    rules: 'R70',
    technique: 'Happy path',
    timing: 'ในหน้าร้าน · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  const D26 = '2026-06-26';
  let code: string | null = null;

  const checkRow17 = async (when: string) => {
    if (!code) return;
    const admin = await app.admin();
    const pay = lineAmount(await admin.pay(code).innerText().catch(() => ''));
    await app.check(admin.row(code), `${when} 17 มิ.ย. เห็น 14.9 กม. และ 1 คัน`, async (el) => {
      await expect.soft(el).toContainText(/(?<![\d.])14\.9\s*กม/);
      await expect.soft(el).toContainText(/(?<!\d)1\s*คัน/);
    });
    await app.check(admin.pay(code), `${when} 17 มิ.ย. ยอด ฿1,300`, async () => { expect.soft(pay).toBe(1300); });
  };
  const checkRow26 = async (when: string) => {
    const admin = await app.admin();
    const pay = lineAmount(await admin.pay('SJTEST16').innerText().catch(() => ''));
    await app.check(admin.row('SJTEST16'), `${when} SJTEST16 เห็นโรงแรม ระยะ 12.0 กม. และ 2 คัน`, async (el) => {
      await expect.soft(el).toContainText('โรงแรมกล้วยไม้ พาเลซ');
      await expect.soft(el).toContainText(/(?<![\d.])12\.0\s*กม/);
      await expect.soft(el).toContainText(/(?<!\d)2\s*คัน/);
    });
    await app.check(admin.pay('SJTEST16'), `${when} SJTEST16 ยอด ฿6,000`, async () => { expect.soft(pay).toBe(6000); });
  };

  await test.step('1. แขกจอง S01 1 คน พิมพ์ 14.9 กม. แล้วยืนยัน', async () => {
    await booking.toSummary({ service: 'S01', date: D17, time: NOON });
    await booking.guest(GUEST, nextPhone());
    await booking.shuttleDistance('14.9');
    const done = await confirmMustSucceed(app, booking, 'แขกจองสำเร็จ');
    code = done?.code ?? null;
  });

  await test.step('2. เข้าหลังร้าน เลือกวันที่ 17 มิ.ย. อ่านแถวของการจองนี้', async () => {
    const admin = await app.admin();
    await admin.open(D17);
    await checkRow17('ขั้น 2');
  });

  await test.step('3. เลือกวันที่ 26 มิ.ย. อ่านแถว SJTEST16', async () => {
    const admin = await app.admin();
    await admin.open(D26);
    await checkRow26('ขั้น 3');
  });

  await test.step('4. รีโหลด อ่านซ้ำ', async () => {
    const admin = await app.admin();
    await app.reload(admin.page);
    if ((await admin.page.getByTestId('admin-date').inputValue()) !== D26) {
      await admin.page.getByTestId('admin-date').fill(D26);
      await settle(admin.page);
    }
    await checkRow26('หลังรีโหลด');
    const row16 = await admin.row('SJTEST16').innerText().catch(() => '');

    await app.reload(admin.page);
    await admin.page.getByTestId('admin-date').fill(D17);
    await settle(admin.page);
    await checkRow17('หลังรีโหลด');

    // แสดงผลที่อ่านจากหน้าจอหลังร้านซ้ำบนหน้าหลัก เพื่อเป็นภาพท้าย GIF
    await app.checkValue(page, 'แถว SJTEST16 บนจอหลังร้านมีจุดรับ ระยะ และจำนวนรถ', row16.replace(/\s+/g, ' '), (v) => {
      expect.soft(v).toContain('โรงแรมกล้วยไม้ พาเลซ');
      expect.soft(v).toMatch(/(?<![\d.])12\.0\s*กม/);
      expect.soft(v).toMatch(/(?<!\d)2\s*คัน/);
    });
  });
});
