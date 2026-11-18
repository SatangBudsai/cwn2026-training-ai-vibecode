/**
 * 5.7 ยกเลิก บัญชี หลังร้าน และสิทธิ์ (TC-ACCT-01 ถึง TC-ACCT-10)
 * ที่มา: TEST-PLAN.md หัวข้อ 5.7 · กติกาการรัน 7.3
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, plan, LOCK, money, lineAmount, settle, App, BookingHelper, type CapturedRequest, type UserKey } from '../fixtures';

const T_0959 = '2026-06-15T09:59:00+07:00';
const T_1001 = '2026-06-15T10:01:00+07:00';
const SHOP_PHONE = '02-123-4567';
const TODAY = '2026-06-15';

// ---------------------------------------------------------------- helper เฉพาะหัวข้อนี้

function must<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

/** อ่านตัวเลขจาก element แล้วเทียบเท่ากันทั้งจำนวน (ไม่ใช้ toContainText เพื่อไม่ให้ ฿950 จับ ฿9,500) */
async function checkAmount(app: App, target: Locator, label: string, expected: number, parse: (s: string) => number = money) {
  await app.check(target, label, async (el) => {
    const text = await el.first().innerText({ timeout: 3_000 }).catch(() => '');
    expect.soft(parse(text), `${label} (อ่านได้: ${text})`).toBe(expected);
  });
}

/** อ่านบัญชีจากหน้าจอจริงแล้วตรวจเฉพาะค่าที่ส่งมา */
async function checkAccount(app: App, page: Page, who: string, want: { points?: number; spend?: number; tier?: string }) {
  await app.goto(page, '/th/account');
  await page.getByTestId('account-points').waitFor({ state: 'visible' }).catch(() => {});
  if (want.tier !== undefined) {
    const tier = want.tier;
    await app.check(page.getByTestId('account-tier'), `${who}: ระดับ ${tier}`, async (el) => {
      await expect.soft(el).toContainText(tier);
    });
  }
  if (want.spend !== undefined) {
    await checkAmount(app, page.getByTestId('account-spend'), `${who}: ยอดสะสม ฿${want.spend.toLocaleString('en-US')}`, want.spend);
  }
  if (want.points !== undefined) {
    await checkAmount(app, page.getByTestId('account-points'), `${who}: แต้ม ${want.points}`, want.points);
  }
}

async function checkStatus2xx(app: App, page: Page, label: string, status: number) {
  await app.checkValue(page, label, status, (v) => {
    expect.soft(v).toBeGreaterThanOrEqual(200);
    expect.soft(v).toBeLessThan(300);
  });
}

/** เปิดหน้าบัญชีแล้วอ่าน URL และรหัสการจองจาก Network ของรอบนี้ */
async function bookingIdFromNetwork(app: App, page: Page, code: string): Promise<string> {
  const req = await app.capture(page, /\/api\/me\/bookings$/, () => app.goto(page, '/th/account'), 'GET');
  const found = (req.responseBody?.bookings ?? []).find((b: any) => b.bookingCode === code);
  return must<string>(found?.id, `ไม่พบ ${code} ใน Network ของหน้าบัญชี`);
}

/** แทนรหัสการจองใน URL ที่ดึงจาก Network */
function swapId(url: string, id: string): string {
  return url.replace(/(\/api\/(?:admin\/)?bookings\/)[^/]+/, `$1${id}`);
}

/** กดยกเลิกจากหน้าบัญชีและยืนยัน · ถ้าไม่มีปุ่มหรือแผงยืนยัน คืน null */
async function cancelOnAccount(app: App, page: Page, code: string): Promise<CapturedRequest | null> {
  await app.goto(page, '/th/account');
  const button = page.getByTestId(`account-cancel-${code}`);
  if (!(await button.count())) return null;
  await button.click();
  const confirm = page.getByTestId(`account-cancel-confirm-${code}`);
  await confirm.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (!(await confirm.count())) return null;
  const req = await app.capture(page, /\/api\/bookings\/[^/]+\/cancel$/, () => confirm.click());
  await settle(page);
  return req;
}

/** เปิดหน้าจอ 2 ของการจองจนเห็นรอบของนักบำบัดคนนั้น */
async function openSlots(booking: BookingHelper, service: string, date: string, therapist: string) {
  await booking.open();
  await booking.chooseService(service, 1);
  await booking.nextFromStep1();
  await booking.chooseDate(date);
  await booking.chooseTherapist(therapist);
}

/** รอบว่างคือมีปุ่มและกดได้ · รอบไม่ว่างคือไม่มีปุ่มหรือปุ่มกดไม่ได้ */
async function checkSlotFree(app: App, booking: BookingHelper, label: string, time: string) {
  await app.check(booking.slot(time), label, async (el) => {
    await expect.soft(el).toBeEnabled();
  });
}

async function checkSlotTaken(app: App, booking: BookingHelper, label: string, time: string) {
  await app.check(booking.el('booking-screen-2'), label, async () => {
    const slot = booking.slot(time);
    if (await slot.count()) await expect.soft(slot).toBeDisabled();
    else await expect.soft(slot).toHaveCount(0);
  });
}

async function fillGuestCancel(app: App, page: Page, code: string, phone: string) {
  await app.goto(page, '/th/booking/cancel');
  await page.getByTestId('cancel-code').fill(code);
  await page.getByTestId('cancel-phone').fill(phone);
}

async function submitGuestCancel(app: App, page: Page): Promise<CapturedRequest> {
  const req = await app.capture(page, /\/api\/bookings\/cancel-guest$/, () => page.getByTestId('cancel-submit').click());
  await settle(page);
  return req;
}

async function mustBook(booking: BookingHelper, o: { service: string; date: string; time: string }): Promise<string> {
  const { code, request } = await booking.book(o);
  return must(code, `จอง ${o.service} ${o.date} ${o.time} ไม่สำเร็จ: ${request.responseStatus} ${JSON.stringify(request.responseBody)}`);
}

/** เก็บค่าตัวเลขของ key ที่ชื่อตรงกับ regex จาก JSON ทุกชั้น */
function numbersOfKey(value: unknown, re: RegExp): number[] {
  if (Array.isArray(value)) return value.flatMap((v) => numbersOfKey(v, re));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      re.test(k) && typeof v === 'number' ? [v] : numbersOfKey(v, re));
  }
  return [];
}

// ---------------------------------------------------------------- TC-ACCT-01

test('TC-ACCT-01 ยกเลิกเองได้เมื่อเหลืออย่างน้อย 24 ชม. ทั้งหน้าเว็บและ API และยกเลิกไม่ทันให้โทรร้าน', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'เวลาเหลือนับเป็นนาที:',
      '09:59 เหลือ 24:01 → ✓ ยกเลิกได้ T02 ว่าง',
      '10:00 เหลือ 24:00 → ✓ ยกเลิกได้ T02 ว่าง (ถ้าเทียบเป็น "มากกว่า 24 ชม." แถวนี้จะถูกปฏิเสธ)',
      '10:01 เหลือ 23:59 → ✗ เห็นเบอร์ 02-123-4567 · API ถูกปฏิเสธด้วยสถานะ 4xx ที่ไม่ใช่ 401 และ 404 · B07 ยังอยู่ในบัญชี · T02 16 มิ.ย. 10:00 ยังถูกจอง (ถ้าตรวจเฉพาะหน้าเว็บ API จะยกเลิกสำเร็จ)',
      'B05 เหลือ 3:00 → ✗ เห็นเบอร์ 02-123-4567 · B05 ยังอยู่ · แต้ม U09 ยัง 199 · ไม่มีค่าปรับในหน้าเว็บ',
    ].join('\n'),
    source: '[D] §4 ยกเลิก · [D][R] E71–E74 · [R] ⚠️A-13',
    frbr: 'FR-20, FR-21, FR-23, BR-14',
    rules: 'R21',
    technique: 'Boundary, Negative, Security',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  let cancelReq: CapturedRequest | null = null;

  await test.step('1. ล็อก 10:00 รีเซ็ต · U01 ยกเลิก B07 เก็บ URL แล้วดู T02 16 มิ.ย. 10:00', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U01');
    cancelReq = await cancelOnAccount(app, page, 'SJTEST07');
    await checkStatus2xx(app, page, '10:00 เหลือ 24:00 ยกเลิก B07 สำเร็จ', cancelReq?.responseStatus ?? 0);
    await openSlots(booking, 'S01', '2026-06-16', 'T02');
    await checkSlotFree(app, booking, '10:00 ยกเลิกแล้ว T02 16 มิ.ย. 10:00 ว่าง', '10:00');
  });

  await test.step('2. ล็อก 09:59 รีเซ็ต · U01 ยกเลิก B07 บนหน้าเว็บ', async () => {
    await app.lockAndReset(T_0959);
    await app.login(page, 'U01');
    const req = await cancelOnAccount(app, page, 'SJTEST07');
    await checkStatus2xx(app, page, '09:59 เหลือ 24:01 ยกเลิก B07 สำเร็จ', req?.responseStatus ?? 0);
    await openSlots(booking, 'S01', '2026-06-16', 'T02');
    await checkSlotFree(app, booking, '09:59 ยกเลิกแล้ว T02 16 มิ.ย. 10:00 ว่าง', '10:00');
  });

  await test.step('3. ล็อก 10:01 รีเซ็ต · U01 ลองยกเลิก B07 บนหน้าเว็บ', async () => {
    await app.lockAndReset(T_1001);
    await app.login(page, 'U01');
    await cancelOnAccount(app, page, 'SJTEST07');
    await app.check(page.getByTestId('account-booking-SJTEST07'), '10:01 เหลือ 23:59 เห็นเบอร์ 02-123-4567 ในนัด B07', async (el) => {
      await expect.soft(el).toContainText(SHOP_PHONE);
    });
  });

  await test.step('4. ยังล็อก 10:01 · อ่านรหัส B07 จาก Network ยิง API ในชื่อ U01 แล้วรีโหลดบัญชี', async () => {
    const id = await bookingIdFromNetwork(app, page, 'SJTEST07');
    const captured = must(cancelReq, 'Blocked: ไม่ได้ URL ยกเลิกจากขั้น 1');
    const res = await app.replay(page, captured, {}, { url: swapId(captured.url, id) });
    await app.checkValue(page, '10:01 API ยกเลิก B07 ถูกปฏิเสธ 4xx ที่ไม่ใช่ 401 และ 404', res.status, (v) => {
      expect.soft(v).toBeGreaterThanOrEqual(400);
      expect.soft(v).toBeLessThan(500);
      expect.soft(v).not.toBe(401);
      expect.soft(v).not.toBe(404);
    });
    await app.checkValue(page, '10:01 เหตุที่ปฏิเสธตรงกฎ 24 ชม.', res.text, (v) => {
      expect.soft(v).toMatch(/24|02-123-4567/);
    });
    await app.reload(page);
    await app.check(page.getByTestId('account-booking-SJTEST07'), '10:01 หลังรีโหลด B07 ยังอยู่ในบัญชี', async (el) => {
      await expect.soft(el).toBeVisible();
    });
    await openSlots(booking, 'S01', '2026-06-16', 'T02');
    await checkSlotTaken(app, booking, '10:01 T02 16 มิ.ย. 10:00 ยังถูกจอง', '10:00');
  });

  await test.step('5. ล็อก 10:00 รีเซ็ต · U09 ลองยกเลิก B05 แล้วอ่านแต้ม', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U09');
    await cancelOnAccount(app, page, 'SJTEST05');
    await app.reload(page);
    await app.check(page.getByTestId('account-booking-SJTEST05'), 'B05 เหลือ 3:00 เห็นเบอร์ 02-123-4567 และ B05 ยังอยู่', async (el) => {
      await expect.soft(el).toBeVisible();
      await expect.soft(el).toContainText(SHOP_PHONE);
    });
    await app.check(page.getByTestId('account-page'), 'B05 ไม่มีค่าปรับในหน้าเว็บ (ไม่มีจำนวนเงินค่าปรับ)', async (el) => {
      await expect.soft(el).not.toContainText(/(ค่าปรับ|ปรับเงิน)\s*:?\s*฿/);
    });
    await checkAccount(app, page, 'U09', { points: 199 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-02

test('TC-ACCT-02 ยกเลิกทันเวลาแล้วคืนแต้ม บัตร สิทธิ์เดือนเกิด ครั้งคอร์ส และรอบนักบำบัดครบ ยกเลิกซ้ำพร้อมกันคืนครั้งเดียว', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'ส่วน ก:',
      'แต้ม 300 + 200 = 500',
      'บัตร ฿500 + ฿500 = ฿1,000',
      'T03 25 มิ.ย. 14:00 ว่าง',
      'สิทธิ์เดือนเกิดคืน: S01 ฿1,000 − 20% (฿200) = ฿800 (U12 Silver ถ้าสิทธิ์ไม่คืนจะได้ ฿1,000)',
      'C06 7 + 1 = เหลือ 8 ครั้ง จาก 11 ครั้ง',
      'ส่วน ข:',
      'สำเร็จ 1 ครั้ง อีกครั้งถูกปฏิเสธด้วยสถานะ 4xx',
      'แต้ม 500 (ถ้าคืนซ้ำจะได้ 700)',
      'บัตร ฿1,000 (ถ้าคืนซ้ำจะได้ ฿1,500)',
    ].join('\n'),
    source: '[D] §4 ยกเลิก · [D] §4 แต้มและระดับ · [D][R] E75, E76 · [R] R22',
    frbr: 'FR-22, FR-38',
    rules: 'R22',
    technique: 'Happy path, State, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  let cancelReq: CapturedRequest | null = null;
  const balance = () => page.getByTestId('giftcard-check-balance');

  await test.step('1. U12 อ่านแต้ม ยอดบัตร และดูว่า T03 25 มิ.ย. 14:00 ไม่ว่าง', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U12');
    await checkAccount(app, page, 'U12 ก่อนยกเลิก', { points: 300 });
    await app.readGiftCard(page, 'GIFT-REFUND');
    await checkAmount(app, balance(), 'GIFT-REFUND ก่อนยกเลิก ฿500', 500, lineAmount);
    await openSlots(booking, 'S04', '2026-06-25', 'T03');
    await checkSlotTaken(app, booking, 'T03 25 มิ.ย. 14:00 ไม่ว่างก่อนยกเลิก', '14:00');
  });

  await test.step('2. ยกเลิก B15 ยืนยัน เก็บ URL', async () => {
    cancelReq = await cancelOnAccount(app, page, 'SJTEST15');
    await checkStatus2xx(app, page, 'ยกเลิก B15 สำเร็จ', cancelReq?.responseStatus ?? 0);
  });

  await test.step('3. อ่านแต้ม ยอดบัตร และรอบ T03 อีกครั้ง', async () => {
    await checkAccount(app, page, 'U12 หลังยกเลิก', { points: 500 });
    await app.readGiftCard(page, 'GIFT-REFUND');
    await checkAmount(app, balance(), 'GIFT-REFUND หลังยกเลิก ฿1,000', 1000, lineAmount);
    await openSlots(booking, 'S04', '2026-06-25', 'T03');
    await checkSlotFree(app, booking, 'T03 25 มิ.ย. 14:00 ว่าง', '14:00');
  });

  await test.step('4. เริ่มจอง S01 17 มิ.ย. 12:00 ติ๊กเดือนเกิด อ่านยอด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-17', time: '12:00' });
    const ticked = await booking.tryUseBirthday().catch(() => false);
    await app.checkValue(page, 'ติ๊กสิทธิ์เดือนเกิดได้ (สิทธิ์คืนแล้ว)', ticked, (v) => {
      expect.soft(v).toBe(true);
    });
    const pay = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), 'สิทธิ์เดือนเกิดคืน S01 ฿800', async () => {
      expect.soft(pay).toBe(800);
    });
  });

  await test.step('5. ยกเลิก B08 แล้วอ่านครั้งคงเหลือของ C06 ใน Wallet', async () => {
    const req = await cancelOnAccount(app, page, 'SJTEST08');
    await checkStatus2xx(app, page, 'ยกเลิก B08 สำเร็จ', req?.responseStatus ?? 0);
    await app.goto(page, '/th/wallet');
    await app.check(page.getByTestId('wallet-course-remaining-0'), 'C06 เหลือ 8 ครั้ง จาก 11 ครั้ง', async (el) => {
      await expect.soft(el).toContainText(/(^|\s)8 ครั้ง จาก 11 ครั้ง/);
    });
  });

  await test.step('6. ส่วน ข รีเซ็ต U12 login อ่านรหัส B15 จาก Network ยิงพร้อมกัน 2 ครั้ง', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U12');
    const id = await bookingIdFromNetwork(app, page, 'SJTEST15');
    const captured = must(cancelReq, 'Blocked: ไม่ได้ URL ยกเลิกจากขั้น 2');
    const url = swapId(captured.url, id);
    const results = await Promise.all([
      app.replay(page, captured, {}, { url }),
      app.replay(page, captured, {}, { url }),
    ]);
    const statuses = results.map((r) => r.status);
    await app.checkValue(page, 'ยิงพร้อมกัน: สำเร็จ 1 ครั้ง', statuses, (v) => {
      expect.soft(v.filter((s) => s >= 200 && s < 300)).toHaveLength(1);
    });
    await app.checkValue(page, 'ยิงพร้อมกัน: อีกครั้งถูกปฏิเสธ 4xx', statuses, (v) => {
      expect.soft(v.filter((s) => s >= 400 && s < 500)).toHaveLength(1);
    });
    const rejected = results.find((r) => r.status >= 400 && r.status < 500);
    await app.checkValue(page, 'เหตุที่ปฏิเสธตรงกฎ ยกเลิกแล้วยกเลิกซ้ำไม่ได้', rejected?.text ?? '', (v) => {
      expect.soft(v).toMatch(/ยกเลิก/);
    });
  });

  await test.step('7. อ่านแต้มและยอดบัตร', async () => {
    await app.readGiftCard(page, 'GIFT-REFUND');
    await checkAmount(app, balance(), 'GIFT-REFUND ยัง ฿1,000 ไม่คืนซ้ำ', 1000, lineAmount);
    await checkAccount(app, page, 'U12 หลังยิงพร้อมกัน', { points: 500 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-03

test('TC-ACCT-03 แขกยกเลิกด้วยรหัสคู่เบอร์ กลุ่มยกเลิกได้ทั้งการจองเท่านั้น คืนเงินเข้าบัตรหมดอายุแต่บัตรยังใช้ไม่ได้', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'B10 เบอร์ผิด → ✗ "ไม่พบการจอง" · นัดยังอยู่ · T01 ยังถูกจอง',
      'B10 เบอร์ถูก → ✓ ยกเลิกสำเร็จ · T01 ว่าง',
      'B16 → ไม่มีตัวเลือกยกเลิก 1 คน · ยกเลิกทั้งการจองแล้ว T01–T06 ว่างครบ 6 คน (ถ้าคืนแค่คนเดียวจะว่าง 1 คน)',
      'B19 → บัตร ฿200 + ฿300 = ฿500 (ถ้าไม่คืนจะยัง ฿200) · สถานะยังหมดอายุ 14 มิ.ย. 2026',
      'ใช้บัตรจองไม่ได้ · มีข้อความแจ้งว่าใช้บัตรไม่ได้ · ยอดจ่าย S01 แขกยัง ฿1,000 (ถ้าใช้ได้จะเหลือ ฿500) · บัตรยัง ฿500',
    ].join('\n'),
    source: '[R] ⚠️A-17 E79, E80 · [R] ⚠️A-15 E78 · [R] ⚠️D-05 E77 · [R] R23',
    frbr: 'FR-24, FR-26, FR-22',
    rules: 'R22, R23',
    technique: 'Happy path, Negative, Equivalence partition, State',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);

  await test.step('1. SJTEST10 กับเบอร์ผิด แล้วดู T01 22 มิ.ย. 14:00', async () => {
    await fillGuestCancel(app, page, 'SJTEST10', '0890000099');
    const req = await submitGuestCancel(app, page);
    await app.check(page.getByTestId('cancel-form'), 'B10 เบอร์ผิด เห็น "ไม่พบการจอง"', async (el) => {
      await expect.soft(el).toContainText('ไม่พบการจอง');
    });
    await app.checkValue(page, 'B10 เบอร์ผิดถูกปฏิเสธ 4xx', req.responseStatus, (v) => {
      expect.soft(v).toBeGreaterThanOrEqual(400);
      expect.soft(v).toBeLessThan(500);
    });
    await openSlots(booking, 'S01', '2026-06-22', 'T01');
    await checkSlotTaken(app, booking, 'B10 เบอร์ผิด T01 22 มิ.ย. 14:00 ยังถูกจอง', '14:00');
  });

  await test.step('2. SJTEST10 กับเบอร์ถูก แล้วดู T01 อีกครั้ง', async () => {
    await fillGuestCancel(app, page, 'SJTEST10', '0890000003');
    const req = await submitGuestCancel(app, page);
    await checkStatus2xx(app, page, 'B10 เบอร์ถูก ยกเลิกสำเร็จ', req.responseStatus);
    await app.check(page.getByTestId('cancel-result'), 'B10 เห็นผลยกเลิกสำเร็จ', async (el) => {
      await expect.soft(el).toContainText('SJTEST10');
    });
    await openSlots(booking, 'S01', '2026-06-22', 'T01');
    await checkSlotFree(app, booking, 'B10 ยกเลิกแล้ว T01 22 มิ.ย. 14:00 ว่าง', '14:00');
  });

  await test.step('3. SJTEST16 ดูตัวเลือกบนหน้าจอ ก่อนยืนยันยกเลิกทั้งการจอง', async () => {
    await fillGuestCancel(app, page, 'SJTEST16', '0890000006');
    await app.check(page.getByTestId('cancel-form'), 'B16 ไม่มีตัวเลือกยกเลิก 1 คน', async (el) => {
      await expect.soft(el.locator('input[type="radio"], input[type="checkbox"], select')).toHaveCount(0);
      await expect.soft(el.getByRole('button')).toHaveCount(1);
      await expect.soft(el).not.toContainText(/1 คน|คนเดียว|บางคน/);
    });
    const req = await submitGuestCancel(app, page);
    await checkStatus2xx(app, page, 'B16 ยกเลิกทั้งการจองสำเร็จ', req.responseStatus);
  });

  await test.step('4. เริ่มจอง S01 26 มิ.ย. 12:00 ดูรายชื่อนักบำบัดที่ว่าง', async () => {
    const all = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'];
    const free: string[] = [];
    await openSlots(booking, 'S01', '2026-06-26', 'T01');
    for (const therapist of all) {
      if (!(await booking.el(`booking-therapist-${therapist}`).count())) continue;
      await booking.chooseTherapist(therapist);
      const slot = booking.slot('12:00');
      if ((await slot.count()) && (await slot.isEnabled())) free.push(therapist);
    }
    await app.checkValue(page, 'T01–T06 ว่างครบ 6 คน ที่ 26 มิ.ย. 12:00', free, (v) => {
      expect.soft(v).toEqual(all);
    });
  });

  await test.step('5. ตรวจยอด GIFT-EXPREF · ยกเลิก SJTEST19 · ตรวจยอดอีกครั้ง', async () => {
    await app.readGiftCard(page, 'GIFT-EXPREF');
    await checkAmount(app, page.getByTestId('giftcard-check-balance'), 'GIFT-EXPREF ก่อนยกเลิก ฿200', 200, lineAmount);
    await fillGuestCancel(app, page, 'SJTEST19', '0890000007');
    const req = await submitGuestCancel(app, page);
    await checkStatus2xx(app, page, 'B19 ยกเลิกสำเร็จ', req.responseStatus);
    await app.readGiftCard(page, 'GIFT-EXPREF');
    await checkAmount(app, page.getByTestId('giftcard-check-balance'), 'GIFT-EXPREF หลังยกเลิก ฿500', 500, lineAmount);
    await app.check(page.getByTestId('giftcard-check-status'), 'GIFT-EXPREF สถานะยังหมดอายุ', async (el) => {
      await expect.soft(el).toContainText('หมดอายุ');
    });
    await app.check(page.getByTestId('giftcard-check-expires'), 'GIFT-EXPREF หมดอายุ 14 มิ.ย. 2026', async (el) => {
      await expect.soft(el).toContainText(/(^|\D)14 มิ\.ย\. 2026/);
    });
  });

  await test.step('6. จอง S01 17 มิ.ย. 12:00 แบบแขก กรอกบัตร GIFT-EXPREF แล้วดูยอด', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-17', time: '12:00' });
    await booking.guest('คุณทดสอบ', '0890077031');
    await booking.giftCard('GIFT-EXPREF');
    await app.check(booking.el('booking-extra-giftcard'), 'มีข้อความแจ้งว่าใช้บัตรไม่ได้', async (el) => {
      await expect.soft(el).toContainText(/หมดอายุ|ใช้.*ไม่ได้/);
    });
    const pay = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), 'ยอดจ่าย S01 แขกยัง ฿1,000', async () => {
      expect.soft(pay).toBe(1000);
    });
    await app.readGiftCard(page, 'GIFT-EXPREF');
    await checkAmount(app, page.getByTestId('giftcard-check-balance'), 'GIFT-EXPREF ยัง ฿500', 500, lineAmount);
  });
});

// ---------------------------------------------------------------- TC-ACCT-04

test('TC-ACCT-04 สมาชิกแก้ของคนอื่นไม่ได้: ยกเลิกนัดคนอื่น กดเสร็จเอง เปิดการจองคนอื่น และเข้าหลังร้าน', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'U02 ยกเลิก B07 → ถูกปฏิเสธด้วยสถานะ 403/404 · B07 ยังอยู่ในบัญชี U01 · T02 16 มิ.ย. 10:00 ยังถูกจอง',
      'U02 เปิด URL B07 → ถูกปฏิเสธ',
      'U02 เปิด `/th/admin` → มีข้อความแจ้งว่าไม่มีสิทธิ์เข้าถึง และไม่เห็นคิว · ไม่มีปุ่ม `header-admin` · ปฏิเสธครบ 2 จาก 2 ครั้ง',
      'U09 กดเสร็จ B05 → ถูกปฏิเสธด้วยสถานะ 401/403/404 · แต้มยัง 199 (ถ้าผ่านจะได้ 208) · ยอดยัง ฿10,001 (ถ้าผ่านจะได้ ฿10,951) · U07 ยิง URL เดียวกันสำเร็จ 200 แล้ว U09 แต้ม 208 ยอด ฿10,951 (ยืนยันว่า URL ชี้ B05 จริง)',
    ].join('\n'),
    source: '[R] ⚠️A-46 E252 · [R] R96 ข้อที่ยังไม่ได้ลองยกเลิกนัดคนอื่น',
    frbr: 'NFR-12, FR-20, FR-80',
    rules: 'R96',
    technique: 'Security, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  let b07Id = '';
  let completeReq: CapturedRequest | null = null;
  let b05CompleteUrl = '';
  let u02CancelReq: CapturedRequest | null = null;

  await test.step('1. U01 เปิด B07 ในบัญชี ดึงรหัสจาก Network แล้วออกจากระบบ', async () => {
    await app.login(page, 'U01');
    b07Id = await bookingIdFromNetwork(app, page, 'SJTEST07');
    await app.logout(page);
  });

  await test.step('2. U02 จอง S01 17 มิ.ย. 12:00 แล้วกดยกเลิกนัดของตัวเอง ดึง URL', async () => {
    await app.login(page, 'U02');
    const code = await mustBook(booking, { service: 'S01', date: '2026-06-17', time: '12:00' });
    u02CancelReq = await cancelOnAccount(app, page, code);
    await checkStatus2xx(app, page, 'U02 ยกเลิกนัดของตัวเองสำเร็จ', u02CancelReq?.responseStatus ?? 0);
  });

  await test.step('3. เปลี่ยนรหัสเป็น B07 ยิงซ้ำในชื่อ U02', async () => {
    const captured = must(u02CancelReq, 'Blocked: ไม่ได้ URL ยกเลิกจากขั้น 2');
    const res = await app.replay(page, captured, {}, { url: swapId(captured.url, b07Id) });
    await app.checkValue(page, 'U02 ยกเลิก B07 ถูกปฏิเสธ 403/404', res.status, (v) => {
      expect.soft([403, 404]).toContain(v);
    });
  });

  await test.step('4. U02 เปิด URL การจอง B07 และเปิด /th/admin', async () => {
    let rejected = 0;
    const res = await app.send(page, 'GET', `/api/bookings/${b07Id}`);
    if (res.status >= 400 && res.status < 500 && !res.text.includes('SJTEST07')) rejected++;
    await app.checkValue(page, 'U02 เปิด URL B07 ถูกปฏิเสธ', { status: res.status, body: res.text.slice(0, 200) }, (v) => {
      expect.soft(v.status).toBeGreaterThanOrEqual(400);
      expect.soft(v.status).toBeLessThan(500);
      expect.soft(v.body).not.toContain('SJTEST07');
    });

    await app.goto(page, '/th/admin');
    const forbidden = page.getByTestId('admin-forbidden');
    const forbiddenVisible = await forbidden.isVisible().catch(() => false);
    await app.check(forbidden, 'U02 เปิด /th/admin เห็นข้อความไม่มีสิทธิ์เข้าถึง', async (el) => {
      await expect.soft(el).toContainText('ไม่มีสิทธิ์');
    });
    const queue = page.locator('[data-testid="admin-schedule"], [data-testid^="admin-booking-"]');
    const noQueue = (await queue.count()) === 0;
    if (forbiddenVisible && noQueue) rejected++;
    await app.check(page.locator('body'), 'U02 ไม่เห็นคิวหลังร้าน', async (el) => {
      await expect.soft(el.locator('[data-testid="admin-schedule"], [data-testid^="admin-booking-"]')).toHaveCount(0);
      await expect.soft(el).not.toContainText('SJTEST05');
    });
    await app.check(page.getByTestId('header'), 'U02 ไม่มีปุ่ม header-admin', async (el) => {
      await expect.soft(el.getByTestId('header-admin')).toHaveCount(0);
    });
    await app.checkValue(page, 'ปฏิเสธครบ 2 จาก 2 ครั้ง', rejected, (v) => {
      expect.soft(v).toBe(2);
    });
  });

  await test.step('5. U01 login ดูบัญชี · เริ่มจอง S01 T02 16 มิ.ย. ดูรอบ 10:00', async () => {
    await app.login(page, 'U01');
    await app.goto(page, '/th/account');
    await app.check(page.getByTestId('account-booking-SJTEST07'), 'B07 ยังอยู่ในบัญชี U01', async (el) => {
      await expect.soft(el).toBeVisible();
    });
    await openSlots(booking, 'S01', '2026-06-16', 'T02');
    await checkSlotTaken(app, booking, 'T02 16 มิ.ย. 10:00 ยังถูกจอง', '10:00');
  });

  await test.step('6. U07 กดใช้บริการเสร็จของ B06 ดึง URL แล้วออกจากระบบ', async () => {
    const owner = await app.owner();
    const admin = await app.admin(owner);
    await admin.open(TODAY);
    completeReq = await admin.complete('SJTEST06');
    await app.logout(owner);
  });

  await test.step('7. U09 อ่านรหัส B05 จาก Network แล้วยิงซ้ำในชื่อ U09', async () => {
    await app.login(page, 'U09');
    const id = await bookingIdFromNetwork(app, page, 'SJTEST05');
    const captured = must(completeReq, 'Blocked: ไม่ได้ URL กดเสร็จจากขั้น 6');
    b05CompleteUrl = swapId(captured.url, id);
    const res = await app.replay(page, captured, {}, { url: b05CompleteUrl });
    await app.checkValue(page, 'U09 กดเสร็จ B05 ถูกปฏิเสธ 401/403/404', res.status, (v) => {
      expect.soft([401, 403, 404]).toContain(v);
    });
  });

  await test.step('8. อ่านแต้มและยอด U09 · U07 ยิง URL เดียวกัน · U09 อ่านอีกครั้ง', async () => {
    await checkAccount(app, page, 'U09 หลังถูกปฏิเสธ', { points: 199, spend: 10001 });
    await app.logout(page);
    const owner = await app.ownerRelogin();
    const captured = must(completeReq, 'Blocked: ไม่ได้ URL กดเสร็จจากขั้น 6');
    const res = await app.replay(owner, captured, {}, { url: b05CompleteUrl });
    await app.checkValue(owner, 'U07 ยิง URL เดียวกันสำเร็จ 200', res.status, (v) => {
      expect.soft(v).toBe(200);
    });
    await app.login(page, 'U09');
    await checkAccount(app, page, 'U09 หลัง U07 กดเสร็จ', { points: 208, spend: 10951 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-05

test('TC-ACCT-05 เรียก API ที่ต้อง login โดยไม่ login ไม่ได้ข้อมูล และออกจากระบบแล้วกดย้อนกลับไม่เห็นข้อมูลเดิม', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'กดย้อนกลับ → ไม่เห็น "คุณนิดา" ฿12,400 หรือ 99 แต้ม',
      'API Wallet และบัญชี → สถานะ 401 · เนื้อหาไม่มี คุณนิดา, 12400, C01 หรือจำนวนครั้ง 7',
      'API คิวหลังร้าน → สถานะ 401 · เนื้อหาไม่มี `SJTEST05` และ `SJTEST06`',
      'API กดเสร็จ B05 → สถานะ 401 · แต้ม U09 ยัง 199 (ถ้าผ่านจะได้ 208)',
    ].join('\n'),
    source: '[R] R98 · [R] ⚠️A-46 E252 · [D] §4 หลังร้านและข้อมูลส่วนตัว',
    frbr: 'NFR-12, FR-12, FR-77',
    rules: 'R96, R98',
    technique: 'Security, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  test.setTimeout(420_000);
  const memberUrls: string[] = [];
  let scheduleUrl = '';
  let b05Id = '';
  let completeReq: CapturedRequest | null = null;

  const checkOldDataGone = async (label: string) => {
    await app.check(page.locator('body'), label, async (el) => {
      await expect.soft(el).not.toContainText('คุณนิดา');
      await expect.soft(el).not.toContainText('12,400');
      await expect.soft(el).not.toContainText(/(^|\D)99\s*แต้ม/);
      await expect.soft(el.getByTestId('account-points')).toHaveCount(0);
    });
  };

  await test.step('1. U01 login กด header-wallet และเปิดบัญชี ดึง URL ของ API', async () => {
    await app.login(page, 'U01');
    const wallet = await app.capture(page, /\/api\/wallet$/, () => page.getByTestId('header-wallet').click(), 'GET');
    await settle(page);
    const [me, bookings] = await Promise.all([
      app.capture(page, /\/api\/me$/, () => app.goto(page, '/th/account'), 'GET'),
      app.capture(page, /\/api\/me\/bookings$/, async () => {}, 'GET'),
    ]);
    memberUrls.push(wallet.url, me.url, bookings.url);
    await app.check(page.getByTestId('account-spend'), 'U01 ก่อนออกจากระบบเห็นยอด ฿12,400', async (el) => {
      expect.soft(money(await el.innerText().catch(() => ''))).toBe(12400);
    });
  });

  await test.step('2. ออกจากระบบแล้วกดย้อนกลับของเบราว์เซอร์', async () => {
    await page.getByTestId('account-logout').click();
    await page.getByTestId('header-login').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page);
    await page.goBack();
    await settle(page);
    await checkOldDataGone('กดย้อนกลับ ไม่เห็น คุณนิดา ฿12,400 หรือ 99 แต้ม');
    await app.reload(page);
    await checkOldDataGone('กดย้อนกลับแล้วรีโหลด ไม่เห็นข้อมูลเดิม');
  });

  await test.step('3. ยิง URL จากขั้น 1 ซ้ำโดยไม่ login', async () => {
    const guest = await app.guestApi();
    for (const url of memberUrls) {
      const res = await app.send(guest, 'GET', url);
      await app.checkValue(page, `${url} ไม่ login ได้สถานะ 401`, res.status, (v) => {
        expect.soft(v).toBe(401);
      });
      await app.checkValue(page, `${url} เนื้อหาไม่มีข้อมูล U01`, res.text, (v) => {
        expect.soft(v).not.toMatch(/คุณนิดา|12400|12,400|C01|"remaining"\s*:\s*7/);
      });
    }
  });

  await test.step('4. U07 ดูคิว 15 มิ.ย. กดใช้บริการเสร็จของ B06 ดึง URL แล้วออกจากระบบ', async () => {
    const owner = await app.owner();
    const admin = await app.admin(owner);
    const schedule = await app.capture(owner, /\/api\/admin\/schedule$/, () => admin.open(TODAY), 'GET');
    scheduleUrl = schedule.url;
    b05Id = must<string>((schedule.responseBody?.bookings ?? []).find((b: any) => b.bookingCode === 'SJTEST05')?.id, 'ไม่พบ SJTEST05 ในคิว');
    completeReq = await admin.complete('SJTEST06');
    await app.logout(owner);
  });

  await test.step('5. ยิง URL คิวและกดเสร็จ B05 โดยไม่ login', async () => {
    const guest = await app.guestApi();
    const queue = await app.send(guest, 'GET', scheduleUrl);
    await app.checkValue(page, 'API คิวหลังร้าน ไม่ login ได้สถานะ 401', queue.status, (v) => {
      expect.soft(v).toBe(401);
    });
    await app.checkValue(page, 'API คิวหลังร้าน เนื้อหาไม่มี SJTEST05 และ SJTEST06', queue.text, (v) => {
      expect.soft(v).not.toContain('SJTEST05');
      expect.soft(v).not.toContain('SJTEST06');
    });
    const captured = must(completeReq, 'Blocked: ไม่ได้ URL กดเสร็จจากขั้น 4');
    const res = await app.replay(guest, captured, {}, { url: swapId(captured.url, b05Id) });
    await app.checkValue(page, 'API กดเสร็จ B05 ไม่ login ได้สถานะ 401', res.status, (v) => {
      expect.soft(v).toBe(401);
    });
  });

  await test.step('6. U09 login อ่านแต้ม', async () => {
    await app.login(page, 'U09');
    await checkAccount(app, page, 'U09 หลังยิงกดเสร็จโดยไม่ login', { points: 199 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-06

test('TC-ACCT-06 รูปร่างกาย before/after ของลูกค้าเปิดตรงจาก URL โดยไม่ login ไม่ได้', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'U01 เปิด URL จาก Network ได้ 200 และเป็น `image/jpeg`',
      'แขกทุก URL → สถานะไม่ใช่ 200 · เนื้อหาไม่ใช่ `image/jpeg` (จาก EXPLORATION ตอนนี้ได้ 200 จึงคาดว่าข้อนี้ไม่ผ่านจนกว่าจะแก้)',
      'U02 ทุก URL → สถานะไม่ใช่ 200 · เนื้อหาไม่ใช่ `image/jpeg`',
    ].join('\n'),
    source: '[R] R97 · F-สร้าง 24',
    frbr: 'NFR-12',
    rules: 'R97',
    technique: 'Security, Negative',
    timing: 'ทันที',
  }),
}, async ({ page, app }) => {
  const fixed = ['/placeholder/nida-before-body.jpg', '/placeholder/nida-after-body.jpg'];
  let networkUrls: string[] = [];
  const allUrls = () => [...new Set([...networkUrls, ...fixed])];
  const actual: Record<string, string> = {};

  const checkBlocked = async (who: string) => {
    for (const url of allUrls()) {
      const ctx = who === 'แขก' ? await app.guestApi() : page;
      const res = await app.send(ctx, 'GET', url);
      actual[`${who} ${url}`] = `${res.status} ${res.contentType}`;
      await app.checkValue(page, `${who} เปิด ${url} ไม่ได้`, { status: res.status, contentType: res.contentType }, (v) => {
        expect.soft(v.status).not.toBe(200);
        expect.soft(v.contentType).not.toContain('image/jpeg');
      });
    }
  };

  await test.step('1. U01 เปิด Wallet ดึง URL รูปจริงจาก Network แล้วเปิดในชื่อ U01', async () => {
    await app.login(page, 'U01');
    await app.goto(page, '/th/wallet');
    for (const i of [0, 1]) {
      await page.getByTestId(`wallet-photo-${i}`).scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(600);
    }
    networkUrls = [...new Set(app.requestsOf(page)
      .map((r) => r.url)
      .filter((u) => /nida-(before|after)/.test(decodeURIComponent(u)))
      .map((u) => { const parsed = new URL(u); return parsed.pathname + parsed.search; }))];
    await app.checkValue(page, 'Network มี URL รูป before และ after', networkUrls, (v) => {
      expect.soft(v.some((u) => decodeURIComponent(u).includes('nida-before'))).toBe(true);
      expect.soft(v.some((u) => decodeURIComponent(u).includes('nida-after'))).toBe(true);
    });
    for (const url of networkUrls) {
      const res = await app.send(page, 'GET', url);
      actual[`U01 ${url}`] = `${res.status} ${res.contentType}`;
      await app.checkValue(page, `U01 เปิด ${url} ได้ 200 image/jpeg`, { status: res.status, contentType: res.contentType }, (v) => {
        expect.soft(v.status).toBe(200);
        expect.soft(v.contentType).toContain('image/jpeg');
      });
    }
    for (const url of fixed) {
      const res = await app.send(page, 'GET', url);
      actual[`U01 ${url}`] = `${res.status} ${res.contentType}`;
    }
  });

  await test.step('2. แขกยิง GET ทุก URL', async () => {
    await checkBlocked('แขก');
  });

  await test.step('3. U02 login แล้วยิง GET ทุก URL', async () => {
    await app.login(page, 'U02');
    await checkBlocked('U02');
    test.info().annotations.push({ type: 'pending-answer', description: `F-สร้าง 24 ผลจริง: ${JSON.stringify(actual)}` });
  });
});

// ---------------------------------------------------------------- TC-ACCT-07

test('TC-ACCT-07 ร้านดูคิวและกดใช้บริการเสร็จผ่านหน้าจอหลังร้านจริง แต้มและยอดเพิ่มครั้งเดียว แขกไม่ได้แต้ม', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'คิว 15 มิ.ย.: B05 ฿950 (฿1,000 − 5% = ฿950) · B06 ฿800',
      'B05: แต้ม ฿950 ÷ 100 = 9 → 199 + 9 = 208 (ถ้าคิดจากราคาเต็ม ฿1,000 จะได้ 209) · ยอด ฿10,001 + ฿950 = ฿10,951 (ถ้าคิดจากราคาเต็มจะได้ ฿11,001)',
      'กดซ้ำ B05 → ✗ HTTP 409 · แต้มยัง 208 (ถ้าให้ซ้ำจะได้ 217) · ยอดยัง ฿10,951',
      'B06 → แต้ม 0 (ถ้าคิดให้แขกจะได้ ฿800 ÷ 100 = 8) · ไม่มียอดสะสม · แต้ม U09 ยัง 208',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [D][R] E245, E246 · [R] ⚠️A-14 E247',
    frbr: 'FR-77, FR-78, FR-79, FR-80, BR-15',
    rules: 'R24, R25',
    technique: 'Happy path, Negative, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app }) => {
  test.setTimeout(420_000);
  let completeReq: CapturedRequest | null = null;

  await test.step('1. U07 เลือกวันที่ 15 มิ.ย. 2026 อ่านยอดของ B05 และ B06', async () => {
    await app.goto(page, '/th');
    const admin = await app.admin();
    await admin.open(TODAY);
    await checkAmount(app, admin.pay('SJTEST05'), 'คิว 15 มิ.ย. B05 ฿950', 950, lineAmount);
    await checkAmount(app, admin.pay('SJTEST06'), 'คิว 15 มิ.ย. B06 ฿800', 800, lineAmount);
  });

  await test.step('2. กด "ใช้บริการเสร็จ" ของ B05 ดึง URL', async () => {
    const admin = await app.admin();
    completeReq = await admin.complete('SJTEST05');
    await app.checkValue(admin.page, 'กดเสร็จ B05 สำเร็จ', completeReq.responseStatus, (v) => {
      expect.soft(v).toBe(200);
    });
  });

  await test.step('3. รีโหลดหลังร้าน · U09 อ่านแต้มและยอด', async () => {
    const admin = await app.admin();
    await admin.open(TODAY);
    await app.check(admin.row('SJTEST05'), 'หลังรีโหลด B05 ไม่มีปุ่มใช้บริการเสร็จแล้ว', async (el) => {
      await expect.soft(el.getByTestId('admin-complete-SJTEST05')).toHaveCount(0);
    });
    await app.login(page, 'U09');
    await checkAccount(app, page, 'U09 หลังกดเสร็จ B05', { spend: 10951, points: 208 });
  });

  await test.step('4. ยิง URL ซ้ำในชื่อ U07 อ่านสถานะ แล้ว U09 อ่านแต้มอีกครั้ง', async () => {
    const owner = await app.owner();
    const res = await app.replay(owner, must(completeReq, 'Blocked: ไม่ได้ URL กดเสร็จจากขั้น 2'));
    await app.checkValue(owner, 'กดซ้ำ B05 ได้ HTTP 409', res.status, (v) => {
      expect.soft(v).toBe(409);
    });
    await checkAccount(app, page, 'U09 หลังกดซ้ำ', { spend: 10951, points: 208 });
  });

  await test.step('5. U07 กด "ใช้บริการเสร็จ" ของ B06 อ่านค่าแต้มในผลตอบกลับ', async () => {
    const admin = await app.admin();
    await admin.open(TODAY);
    const req = await admin.complete('SJTEST06');
    await app.checkValue(admin.page, 'กดเสร็จ B06 สำเร็จ', req.responseStatus, (v) => {
      expect.soft(v).toBe(200);
    });
    const earned = numbersOfKey(req.responseBody, /^pointsEarned$/);
    await app.checkValue(admin.page, 'B06 แขกได้แต้ม 0 ในผลตอบกลับ', { earned, body: req.responseBody }, (v) => {
      expect.soft(v.earned.length).toBeGreaterThan(0);
      expect.soft(v.earned.every((n) => n === 0)).toBe(true);
    });
    const spend = numbersOfKey(req.responseBody, /spend/i);
    await app.checkValue(admin.page, 'B06 แขกไม่มียอดสะสม', spend, (v) => {
      expect.soft(v.every((n) => n === 0)).toBe(true);
    });
    await checkAccount(app, page, 'U09 หลังกดเสร็จ B06', { points: 208 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-08

test('TC-ACCT-08 จ่ายค่าบริการแล้วยอดสะสมเพิ่มและขึ้น Gold ทันที ราคานัดเดิมไม่เปลี่ยน แต้มกับยอดของการจองครบ 5 ขั้นคิดตรง', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'ส่วน ก:',
      'ยอด ฿9,999 + ฿800 = ฿10,799 → Gold ทันที (ไม่ใช่ Silver จนสิ้นรอบ)',
      'แต้ม ฿800 ÷ 100 = 8 → 250 + 8 = 258',
      'นัดใหม่ S01 ฿1,000 − 5% (฿50) = ฿950 (ถ้าระดับยังไม่ขึ้นจะได้ ฿1,000)',
      'นัดเดิม S01 ยัง ฿1,000 (ถ้าคิดใหม่จะได้ ฿950)',
      'ส่วน ข:',
      'จ่าย ฿2,000 − 200 แต้ม (฿100) = ฿1,900 + รถ ฿300 = ฿2,200 − บัตร ฿500 = ฿1,700',
      'ส่วนค่าบริการ ฿1,900 − ฿500 = ฿1,400 ÷ 100 = 14 แต้ม → 250 − 200 + 14 = 64 (ถ้าคิดรวมค่ารถจะได้ 17 แต้ม เหลือ 67)',
      'ยอด ฿9,999 + ฿1,400 = ฿11,399 → Gold (ถ้าคิดรวมค่ารถจะได้ ฿11,699)',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [D][R] E112, E248 · [R] ⚠️D-11 E249 · [R] ⚠️A-09, A-10 E244',
    frbr: 'FR-34, FR-79, BR-23, BR-17',
    rules: 'R29, R38, R40',
    technique: 'Boundary, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  const DATE = '2026-06-17';
  let s05Code = '';
  let s01Code = '';
  let s04Code = '';

  await test.step('1. U03 จอง S05 17 มิ.ย. 12:00 และ S01 17 มิ.ย. 14:00 อ่านยอดทั้งสองนัด', async () => {
    await app.login(page, 'U03');
    s05Code = await mustBook(booking, { service: 'S05', date: DATE, time: '12:00' });
    s01Code = await mustBook(booking, { service: 'S01', date: DATE, time: '14:00' });
    await app.goto(page, '/th/account');
    await checkAmount(app, page.getByTestId(`account-booking-total-${s05Code}`), 'นัด S05 ฿800', 800, lineAmount);
    await checkAmount(app, page.getByTestId(`account-booking-total-${s01Code}`), 'นัด S01 ฿1,000', 1000, lineAmount);
  });

  await test.step('2. U07 เลือกวันที่ 17 มิ.ย. 2026 กด "ใช้บริการเสร็จ" ของนัด S05 เท่านั้น', async () => {
    const admin = await app.admin();
    await admin.open(DATE);
    const req = await admin.complete(s05Code);
    await app.checkValue(admin.page, 'กดเสร็จนัด S05 สำเร็จ', req.responseStatus, (v) => {
      expect.soft(v).toBe(200);
    });
  });

  await test.step('3. U03 อ่านระดับ ยอด และแต้มในบัญชี', async () => {
    await checkAccount(app, page, 'U03 หลังกดเสร็จ S05', { tier: 'Gold', spend: 10799, points: 258 });
  });

  await test.step('4. U03 เริ่มจอง S01 18 มิ.ย. 12:00 อ่านยอดในหน้าสรุป', async () => {
    await booking.toSummary({ service: 'S01', date: '2026-06-18', time: '12:00' });
    const pay = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), 'นัดใหม่ S01 ฿950', async () => {
      expect.soft(pay).toBe(950);
    });
  });

  await test.step('5. ดูยอดนัด S01 17 มิ.ย. 14:00 ในบัญชี และในคิวหลังร้าน', async () => {
    await app.goto(page, '/th/account');
    await checkAmount(app, page.getByTestId(`account-booking-total-${s01Code}`), 'นัดเดิม S01 ในบัญชียัง ฿1,000', 1000, lineAmount);
    const admin = await app.admin();
    await admin.open(DATE);
    await checkAmount(app, admin.pay(s01Code), 'นัดเดิม S01 ในคิวหลังร้านยัง ฿1,000', 1000, lineAmount);
  });

  await test.step('6. ส่วน ข รีเซ็ต · U03 จอง S04 17 มิ.ย. 12:00 แลก 200 แต้ม รถ H04 บัตร GIFT-500', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U03');
    await booking.toSummary({ service: 'S04', date: DATE, time: '12:00' });
    await booking.redeemSets(2);
    await booking.shuttleHotel('H04');
    await booking.giftCard('GIFT-500');
    const lines = await booking.lines();
    await app.checkValue(page, 'แลก 200 แต้ม ลด ฿100 รถ ฿300 บัตร ฿500', { points: lines.points, transport: lines.transport, giftcard: lines.giftcard }, (v) => {
      expect.soft(v.points).toBe(100);
      expect.soft(v.transport).toBe(300);
      expect.soft(v.giftcard).toBe(500);
    });
    await app.check(booking.el('booking-pay-at-shop'), 'จ่าย ฿1,700', async () => {
      expect.soft(lines.pay).toBe(1700);
    });
    const { code, request } = await booking.confirm();
    s04Code = must(code, `จอง S04 ไม่สำเร็จ: ${request.responseStatus} ${JSON.stringify(request.responseBody)}`);
  });

  await test.step('7. U07 กด "ใช้บริการเสร็จ" ของนัดนี้ · U03 อ่านแต้มและยอด', async () => {
    const owner = await app.ownerRelogin();
    const admin = await app.admin(owner);
    await admin.open(DATE);
    const req = await admin.complete(s04Code);
    await app.checkValue(owner, 'กดเสร็จนัด S04 สำเร็จ', req.responseStatus, (v) => {
      expect.soft(v).toBe(200);
    });
    await checkAccount(app, page, 'U03 หลังกดเสร็จ S04', { tier: 'Gold', spend: 11399, points: 64 });
  });
});

// ---------------------------------------------------------------- TC-ACCT-09

test('TC-ACCT-09 สมัครใหม่แล้ว login ได้ ยอดถึงระดับถัดไปตรงทุกระดับ แก้วันเกิดไม่ได้ ไม่มีปุ่มเปลี่ยนเวลา และฟอร์มไม่มีช่องไฟล์', {
  tag: ['@P1', '@5.7'],
  annotation: plan({
    expected: [
      'สมาชิกใหม่: Silver · 0 แต้ม · ฿10,000 − ฿0 = "อีก ฿10,000 ถึง Gold"',
      'ช่องไฟล์: ฟอร์มสมัคร 0 ช่อง · ฟอร์มจอง 0 ช่อง',
      'วันเกิด: ไม่มีช่องแก้ · แสดงอย่างเดียว',
      'U01 → ฿30,000 − ฿12,400 = "อีก ฿17,600 ถึง Platinum"',
      'U03 → ฿10,000 − ฿9,999 = "อีก ฿1 ถึง Gold"',
      'U08 → ฿30,000 − ฿10,000 = "อีก ฿20,000 ถึง Platinum" (ถ้าเทียบ ฿10,000 เป็น Silver จะขึ้น "อีก ฿0 ถึง Gold")',
      'U02 → Platinum ไม่แสดงยอด (ถ้าเทียบผิดจะขึ้น "อีก ฿0 ถึง Platinum")',
      'B07: ปุ่มเปลี่ยนเวลา 0 ปุ่ม · มีเฉพาะการยกเลิก',
    ].join('\n'),
    source: '[D] §4 จองคิว · [D] บ.22 · [D][R] E238, E239, E241, E242 · [R] ⚠️A-22 E243 · [R] ⚠️A-12 · [R] ⚠️A-16',
    frbr: 'FR-12, FR-13, FR-25, FR-34, FR-35, FR-73, NFR-08',
    rules: 'R115',
    technique: 'Happy path, Equivalence partition, Boundary',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);
  const NEW_USER = { email: 'new57@sabai.test', password: 'New57#2026' };

  const checkFileInputs = async (label: string) => {
    await app.check(booking.el('booking-flow'), label, async (el) => {
      await expect.soft(el.locator('input[type="file"]')).toHaveCount(0);
    });
  };

  await test.step('1. เปิด /th/register นับ input[type=file] แล้วสมัคร', async () => {
    await app.goto(page, '/th/register');
    await app.check(page.getByTestId('register-form'), 'ฟอร์มสมัครไม่มีช่องไฟล์ 0 ช่อง', async (el) => {
      await expect.soft(el.locator('input[type="file"]')).toHaveCount(0);
    });
    await page.getByTestId('register-email').fill(NEW_USER.email);
    await page.getByTestId('register-password').fill(NEW_USER.password);
    await page.getByTestId('register-name').fill('ทดสอบ ห้าเจ็ด');
    await page.getByTestId('register-phone').fill('0810000057');
    await page.getByTestId('register-birth-date').fill('1990-01-15');
    const req = await app.capture(page, /\/api\/auth\/register$/, () => page.getByTestId('register-submit').click());
    await settle(page);
    await checkStatus2xx(app, page, 'สมัครสมาชิกสำเร็จ', req.responseStatus);
  });

  await test.step('2. ออกจากระบบ แล้ว login ด้วยบัญชีใหม่ อ่านระดับ แต้ม และยอดถึงระดับถัดไป', async () => {
    await app.goto(page, '/th/account');
    if (await page.getByTestId('account-logout').count()) await app.logout(page);
    await app.login(page, NEW_USER);
    await checkAccount(app, page, 'สมาชิกใหม่', { tier: 'Silver', points: 0 });
    await app.check(page.getByTestId('account-next-tier'), 'สมาชิกใหม่ อีก ฿10,000 ถึง Gold', async (el) => {
      await expect.soft(el).toContainText('อีก ฿10,000 ถึง Gold');
    });
  });

  await test.step('3. เปิดหน้าจอจอง S01 ทุกขั้นจนถึงหน้าจอกรอกข้อมูล นับ input[type=file]', async () => {
    await booking.open();
    await checkFileInputs('ฟอร์มจองหน้าจอ 1 ไม่มีช่องไฟล์');
    await booking.chooseService('S01', 1);
    await booking.nextFromStep1();
    await checkFileInputs('ฟอร์มจองหน้าจอ 2 ไม่มีช่องไฟล์');
    await booking.chooseDate('2026-06-17');
    await booking.chooseTherapist('any');
    await booking.chooseSlot('12:00');
    await booking.nextFromStep2();
    await checkFileInputs('ฟอร์มจองหน้าจอ 3 ไม่มีช่องไฟล์ 0 ช่อง');
  });

  await test.step('4. ในบัญชีของสมาชิกใหม่ มองหาช่องแก้วันเกิด', async () => {
    await app.goto(page, '/th/account');
    await app.check(page.getByTestId('account-page'), 'วันเกิด ไม่มีช่องแก้', async (el) => {
      await expect.soft(el.locator('input[type="date"], input[name*="birth" i], [data-testid*="birth"] input')).toHaveCount(0);
    });
    await app.check(page.getByTestId('account-birth-date'), 'วันเกิด แสดงอย่างเดียว 15 ม.ค. 1990', async (el) => {
      await expect.soft(el).toContainText(/(^|\D)15 ม\.ค\. 1990/);
    });
  });

  await test.step('5. login U01, U03, U08, U02 ทีละคน อ่านยอดถึงระดับถัดไป', async () => {
    const rows: { user: UserKey; text: string }[] = [
      { user: 'U01', text: 'อีก ฿17,600 ถึง Platinum' },
      { user: 'U03', text: 'อีก ฿1 ถึง Gold' },
      { user: 'U08', text: 'อีก ฿20,000 ถึง Platinum' },
    ];
    for (const { user, text } of rows) {
      await app.login(page, user);
      await app.goto(page, '/th/account');
      await app.check(page.getByTestId('account-next-tier'), `${user} ${text}`, async (el) => {
        await expect.soft(el).toContainText(text);
      });
    }
    await app.login(page, 'U02');
    await checkAccount(app, page, 'U02', { tier: 'Platinum' });
    await app.check(page.getByTestId('account-page'), 'U02 Platinum ไม่แสดงยอดถึงระดับถัดไป', async (el) => {
      await expect.soft(el).not.toContainText(/อีก\s*฿/);
    });
  });

  await test.step('6. U01 เปิดนัด B07 ในบัญชี มองหาปุ่มเปลี่ยนเวลา', async () => {
    await app.login(page, 'U01');
    await app.goto(page, '/th/account');
    await app.check(page.getByTestId('account-booking-SJTEST07'), 'B07 ปุ่มเปลี่ยนเวลา 0 ปุ่ม มีเฉพาะการยกเลิก', async (el) => {
      await expect.soft(el.getByRole('button', { name: /เปลี่ยนเวลา|เลื่อนนัด|เปลี่ยนนัด/ })).toHaveCount(0);
      await expect.soft(el.getByRole('link', { name: /เปลี่ยนเวลา|เลื่อนนัด|เปลี่ยนนัด/ })).toHaveCount(0);
      await expect.soft(el.getByTestId('account-cancel-SJTEST07')).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------- TC-ACCT-10

test('TC-ACCT-10 /api/* ที่ไม่มีจริงตอบ error ไม่ใช่หน้า HTML', {
  tag: ['@P3', '@5.7'],
  annotation: plan({
    expected: [
      '`/api/health` ตอบ 200 เป็นตัวยืนยันว่าเว็บทำงาน',
      '`/api/nope` สถานะ 4xx · content-type ไม่ใช่ `text/html` · เนื้อหาไม่มี `<html` (จาก EXPLORATION ตอนนี้ได้ 200 เป็น HTML จึงต้องรอคำตอบ F-สร้าง 25)',
    ].join('\n'),
    source: '[O-ยังไม่ยืนยัน] · F-สร้าง 25',
    frbr: '—',
    rules: '—',
    technique: 'Negative',
    timing: 'ทันที',
  }),
}, async ({ page, app }) => {
  await app.goto(page, '/th');
  const guest = await app.guestApi();

  await test.step('1. ยิง GET /api/health อ่านสถานะ', async () => {
    const health = await app.send(guest, 'GET', '/api/health');
    await app.checkValue(page, '/api/health ตอบ 200', health.status, (v) => {
      expect.soft(v).toBe(200);
    });
  });

  await test.step('2. ยิง GET /api/nope อ่านสถานะ content-type และเนื้อหา', async () => {
    const nope = await app.send(guest, 'GET', '/api/nope');
    test.info().annotations.push({ type: 'pending-answer', description: `F-สร้าง 25 ผลจริง: ${nope.status} ${nope.contentType}` });
    await app.checkValue(page, '/api/nope content-type ไม่ใช่ text/html', nope.contentType, (v) => {
      expect.soft(v).not.toContain('text/html');
    });
    await app.checkValue(page, '/api/nope เนื้อหาไม่มี <html', nope.text.slice(0, 300), () => {
      expect.soft(nope.text).not.toContain('<html');
    });
    await app.checkValue(page, '/api/nope สถานะ 4xx', nope.status, (v) => {
      expect.soft(v).toBeGreaterThanOrEqual(400);
      expect.soft(v).toBeLessThan(500);
    });
  });
});
