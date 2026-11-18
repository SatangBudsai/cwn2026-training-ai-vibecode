/**
 * 5.5 คอร์สและ Wallet · TC-COURSE-01 ถึง TC-COURSE-10 (TEST-PLAN.md บรรทัด 932-1115)
 * ทุกตัวเลขและข้อความมาจากแผน ไม่ปรับตามที่เว็บแสดง
 */
import type { Page } from '@playwright/test';
import { test, expect, plan, money, settle, type App, type ApiResult, type BookingHelper, type CapturedRequest } from '../fixtures';

// ---------------------------------------------------------------- helper เฉพาะหัวข้อนี้

type WalletCourse = { id: string; serviceId: string; remaining: number; expiresOn: string; pricePaid: number };

const CANCEL_PATH = /\/api\/bookings\/[^/]+\/cancel$/;
const PURCHASE_PATH = /\/api\/courses\/purchase$/;

function remainingText(left: number) {
  return `เหลือ ${left} ครั้ง จาก 11 ครั้ง`;
}

function courseCards(page: Page) {
  return page.getByTestId(/^wallet-course-\d+$/);
}

/** การ์ดคอร์สตามรหัส ใช้กับบัญชีที่มีหลายคอร์ส (หาจากลิงก์จองของการ์ด) */
function courseCardById(page: Page, courseId: string) {
  return courseCards(page).filter({ has: page.locator(`a[href*="course=${courseId}"]`) });
}

/** เปิด Wallet ผ่าน header-wallet แบบไม่โหลดหน้าใหม่ เพื่อดูค่า "ทันที" */
async function openWallet(app: App, page: Page) {
  const link = page.getByTestId('header-wallet');
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.getByTestId('wallet-page').waitFor({ state: 'visible' });
    await page.waitForSelector('html[data-ready="true"]');
    await page.getByTestId('wallet-loading').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
    await settle(page);
  } else {
    await app.goto(page, '/th/wallet');
  }
}

/** เปิด Wallet แล้วอ่านรายการคอร์สจาก Network ถ้าหน้าไม่ได้เรียก API ใช้ session ของหน้ายิงอ่านเอง */
async function readWalletCourses(app: App, page: Page): Promise<WalletCourse[]> {
  const waiter = page
    .waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/wallet', { timeout: 8_000 })
    .catch(() => null);
  await app.goto(page, '/th/wallet');
  const resp = await waiter;
  let body: any = resp ? await resp.json().catch(() => null) : null;
  if (!body) body = (await app.send(page, 'GET', '/api/wallet')).body;
  return (body?.courses ?? []) as WalletCourse[];
}

async function checkRemaining(app: App, page: Page, label: string, left: number, index = 0) {
  await app.check(page.getByTestId(`wallet-course-remaining-${index}`), `${label}: ${remainingText(left)}`, async (el) => {
    await expect.soft(el).toHaveText(remainingText(left));
  });
}

/** ตรวจคอร์สใน Wallet ทั้งทันทีแล้วรีโหลด (index 0 ใช้กับบัญชีที่มีคอร์สเดียว) */
async function checkRemainingNowAndReload(app: App, page: Page, label: string, left: number) {
  await openWallet(app, page);
  await checkRemaining(app, page, `${label} ทันที`, left);
  await app.reload(page);
  await checkRemaining(app, page, `${label} หลังรีโหลด`, left);
}

/** กดจองจาก Wallet ถ้าไม่มีลิงก์ของคอร์สนั้นคืน false */
async function clickCourseLink(app: App, page: Page, courseId?: string): Promise<boolean> {
  if (!new URL(page.url()).pathname.endsWith('/wallet')) await app.goto(page, '/th/wallet');
  const link = courseId
    ? page.locator(`a[data-testid^="wallet-course-book-"][href*="course=${courseId}"]`)
    : page.getByTestId('wallet-course-book-0');
  if ((await link.count()) === 0) return false;
  await link.first().click();
  await page.getByTestId('booking-flow').waitFor({ state: 'visible' });
  await page.waitForSelector('html[data-ready="true"]');
  await settle(page);
  return true;
}

/** เดินจากการ์ดคอร์สจนถึงหน้าสรุปโดยยังไม่กดยืนยัน */
async function courseToSummary(app: App, booking: BookingHelper, o: { date: string; time: string; therapist: string; courseId?: string }) {
  const clicked = await clickCourseLink(app, booking.page, o.courseId);
  if (!clicked) throw new Error('ไม่พบลิงก์จองด้วยคอร์สใน Wallet');
  await booking.nextFromStep1();
  await booking.chooseDate(o.date);
  await booking.chooseTherapist(o.therapist);
  await booking.chooseSlot(o.time);
  await booking.nextFromStep2();
}

/** จองด้วยคอร์สผ่านหน้าเว็บจนจบ แล้วบันทึกจุดตรวจว่าจองสำเร็จ */
async function bookWithCourse(app: App, booking: BookingHelper, o: { date: string; time: string; therapist: string; courseId?: string }) {
  await courseToSummary(app, booking, o);
  const res = await booking.confirm();
  await app.checkValue(booking.page, `จองด้วยคอร์ส ${o.date} ${o.time} ${o.therapist} สำเร็จ`, res.code ?? `สถานะ ${res.request.responseStatus}`, () => {
    expect.soft(res.code, 'ต้องได้รหัสจอง').toBeTruthy();
  });
  return res;
}

/**
 * ลองจองด้วยคอร์สที่คาดว่าถูกปฏิเสธ: เดินหน้าเท่าที่หน้าเว็บยอมให้กด
 * ถ้าไม่มีลิงก์จองใน Wallet เปิด /th/booking?course=<รหัส> ตามแผน · ถ้าเว็บปล่อยจนถึงปุ่มยืนยันจะกดจริง เพื่อให้จุดนับนัดจับข้อผิดได้
 */
async function attemptCourseBooking(app: App, booking: BookingHelper, o: { date: string; time: string; therapist: string; courseId: string }) {
  const page = booking.page;
  if (!(await clickCourseLink(app, page, o.courseId))) await app.goto(page, `/th/booking?course=${o.courseId}`);
  const next1 = page.getByTestId('booking-step1-next');
  if ((await next1.count()) === 0 || (await next1.isDisabled())) return;
  await booking.nextFromStep1();
  await booking.chooseDate(o.date);
  const therapist = page.getByTestId(`booking-therapist-${o.therapist}`);
  if ((await therapist.count()) === 0 || (await therapist.isDisabled())) return;
  await booking.chooseTherapist(o.therapist);
  const slot = booking.slot(o.time);
  if ((await slot.count()) === 0 || (await slot.isDisabled())) return;
  await booking.chooseSlot(o.time);
  const next2 = page.getByTestId('booking-step2-next');
  if (await next2.isDisabled()) return;
  await booking.nextFromStep2();
  const confirm = booking.confirmButton();
  if ((await confirm.count()) === 0 || (await confirm.isDisabled())) return;
  await booking.confirm();
}

/** รหัสจองของนัดที่แสดงใน /th/account เรียงตามตัวอักษร */
async function accountCodes(app: App, page: Page): Promise<string[]> {
  await app.goto(page, '/th/account');
  const codes = await page.getByTestId(/^account-booking-code-/).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.testid!.replace('account-booking-code-', '')));
  return codes.sort();
}

async function checkNoNewBooking(app: App, page: Page, label: string, expected: string[]) {
  const codes = await accountCodes(app, page);
  await app.check(page.getByTestId('account-page'), `${label}: รายการนัดตรงตามที่คาด ${expected.join(', ') || '(ไม่มี)'}`, async () => {
    expect.soft(codes).toEqual([...expected].sort());
  });
}

/** ยกเลิกนัดบนหน้าบัญชี ถ้าไม่มีปุ่มยกเลิกบันทึกเป็นข้อล้มแล้วไปจุดตรวจถัดไป */
async function cancelOnAccount(app: App, page: Page, code: string) {
  await app.goto(page, '/th/account');
  const btn = page.getByTestId(`account-cancel-${code}`);
  const count = await btn.count();
  await app.checkValue(page, `มีปุ่มยกเลิกนัด ${code}`, count, (v) => {
    expect.soft(v).toBe(1);
  });
  if (count === 0) return;
  await btn.click();
  await page.getByTestId(`account-cancel-panel-${code}`).waitFor({ state: 'visible' });
  const req = await app.capture(page, CANCEL_PATH, () => page.getByTestId(`account-cancel-confirm-${code}`).click());
  await settle(page);
  await app.checkValue(page, `ยกเลิกนัด ${code} สำเร็จ`, req.responseStatus, (v) => {
    expect.soft(v).toBeLessThan(300);
  });
}

/** ร้านกดใช้บริการเสร็จ ถ้าไม่มีปุ่มบันทึกเป็นข้อล้ม */
async function ownerComplete(app: App, date: string, code: string) {
  const admin = await app.admin();
  await admin.open(date);
  const btn = admin.page.getByTestId(`admin-complete-${code}`);
  const count = await btn.count();
  await app.checkValue(admin.page, `มีปุ่มใช้บริการเสร็จของ ${code}`, count, (v) => {
    expect.soft(v).toBe(1);
  });
  if (count === 0) return admin;
  const req = await admin.complete(code);
  await app.checkValue(admin.page, `ร้านกดใช้บริการเสร็จ ${code} สำเร็จ`, req.responseStatus, (v) => {
    expect.soft(v).toBeLessThan(300);
  });
  return admin;
}

/** ตรวจยอดสะสม ระดับ และแต้ม บนหน้าบัญชีที่เปิดอยู่ */
async function checkAccountValues(app: App, page: Page, label: string, want: { spend: number; tier: string; points?: number }) {
  await app.check(page.getByTestId('account-spend'), `${label}: ยอดสะสม ฿${want.spend.toLocaleString('en-US')}`, async (el) => {
    expect.soft(money(await el.innerText())).toBe(want.spend);
  });
  await app.check(page.getByTestId('account-tier'), `${label}: ระดับ ${want.tier}`, async (el) => {
    await expect.soft(el).toHaveText(want.tier);
  });
  if (want.points !== undefined) {
    const points = want.points;
    await app.check(page.getByTestId('account-points'), `${label}: แต้ม ${points}`, async (el) => {
      expect.soft(money(await el.innerText())).toBe(points);
    });
  }
}

/** ตรวจว่าคำขอถูกปฏิเสธ 4xx และเหตุตรงกับกฎที่ทดสอบ (กติกา 7.3) */
async function checkRejected(app: App, page: Page, label: string, res: ApiResult, reason: RegExp, opts: { statuses?: number[]; notStatuses?: number[] } = {}) {
  const actual = { status: res.status, error: res.body?.error ?? res.text.slice(0, 200) };
  await app.checkValue(page, label, actual, (v) => {
    if (opts.statuses) {
      expect.soft(opts.statuses).toContain(v.status);
    } else {
      expect.soft(v.status).toBeGreaterThanOrEqual(400);
      expect.soft(v.status).toBeLessThan(500);
    }
    if (opts.notStatuses) expect.soft(opts.notStatuses, '401 หรือ 404 ถือว่าเทสต์ไม่สมบูรณ์').not.toContain(v.status);
    expect.soft(JSON.stringify(v.error)).toMatch(reason);
  });
}

/** ซื้อคอร์สจาก Wallet คืนคำขอจาก Network */
async function buyCourse(app: App, page: Page): Promise<CapturedRequest> {
  await page.getByTestId('wallet-buy-course').click();
  await page.getByTestId('wallet-buy-course-confirm').waitFor({ state: 'visible' });
  const req = await app.capture(page, PURCHASE_PATH, () => page.getByTestId('wallet-buy-course-confirm').click());
  await settle(page);
  return req;
}

const REASON_EXPIRED = /course-expired|หมดอายุ/;

// ---------------------------------------------------------------- TC-COURSE-01

test('TC-COURSE-01 จองด้วยคอร์สแล้วกันครั้งทันที และยกเลิกทันเวลาแล้วคืนครั้ง', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 1: "เหลือ 7 ครั้ง จาก 11 ครั้ง" (11 − 4 − 0 = 7) · หมดอายุ 13 ก.ย. 2026',
      'ขั้น 2: ยอดจ่าย ฿0',
      'ขั้น 3: "เหลือ 6 ครั้ง จาก 11 ครั้ง" ทั้งทันทีและหลังรีโหลด (11 − 4 − 1 = 6) (ถ้าตัดตอนกดเสร็จเท่านั้นจะยังเห็น 7)',
      'ขั้น 5: "เหลือ 7 ครั้ง จาก 11 ครั้ง" ทั้งทันทีและหลังรีโหลด (ถ้าไม่คืนจะค้าง 6)',
    ].join('\n'),
    source: '[D] §4 คอร์ส · [D] §5 จำนวนครั้ง · [D][R] E193, E194',
    frbr: 'FR-38, FR-41',
    rules: 'R79, R83',
    technique: 'Happy path, State',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  await app.login(page, 'U01');

  await test.step('1. เปิด Wallet ผ่าน header-wallet อ่านคอร์ส', async () => {
    await openWallet(app, page);
    await checkRemaining(app, page, 'ก่อนจอง', 7);
    await app.check(page.getByTestId('wallet-course-expires-0'), 'หมดอายุ 13 ก.ย. 2026', async (el) => {
      await expect.soft(el).toHaveText('13 ก.ย. 2026');
    });
  });

  let code: string | null = null;
  await test.step('2. กดจองจากคอร์ส เลือก 17 มิ.ย. 12:00 T01 แล้วยืนยัน', async () => {
    await courseToSummary(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01' });
    await app.check(booking.el('booking-pay-at-shop'), 'ยอดจ่าย ฿0', async () => {
      expect.soft(await booking.pay()).toBe(0);
    });
    const res = await booking.confirm();
    code = res.code;
    await app.checkValue(page, 'จองด้วยคอร์สสำเร็จ', code ?? `สถานะ ${res.request.responseStatus}`, () => {
      expect.soft(res.code, 'ต้องได้รหัสจอง').toBeTruthy();
    });
  });

  await test.step('3. เปิด Wallet ทันที แล้วรีโหลด', async () => {
    await checkRemainingNowAndReload(app, page, 'หลังจอง', 6);
  });

  await test.step('4. ยกเลิกนัดนี้', async () => {
    if (code) await cancelOnAccount(app, page, code);
  });

  await test.step('5. เปิด Wallet ทันที แล้วรีโหลด', async () => {
    await checkRemainingNowAndReload(app, page, 'หลังยกเลิก', 7);
  });
});

// ---------------------------------------------------------------- TC-COURSE-02

test('TC-COURSE-02 ร้านกดใช้บริการเสร็จแล้วตัดครั้งจริงครั้งเดียว ได้ 0 แต้ม และยอดสะสมไม่เพิ่ม', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 1: "เหลือ 6 ครั้ง จาก 11 ครั้ง"',
      'ขั้น 3: ใช้ 4 + 1 = 5 · เหลือ 11 − 5 = 6 ยังเป็น "เหลือ 6 ครั้ง จาก 11 ครั้ง" (ถ้าตัดซ้ำกับที่กันไว้จะเหลือ 5 · ถ้าคืนที่กันไว้แล้วไม่ตัดจะเหลือ 7)',
      'แต้ม 99 + 0 = 99 (ถ้าให้แต้มจากบริการจะเกิน 99) · ยอดสะสม ฿12,400 + ฿0 = ฿12,400 ยังเป็น Gold',
      'ขั้น 4: นัดนี้แสดงว่าใช้บริการเสร็จแล้ว',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [D][R] E195',
    frbr: 'FR-79, FR-38, BR-23',
    rules: 'R79',
    technique: 'State, Happy path',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  await app.login(page, 'U01');
  let code: string | null = null;

  await test.step('1. U01 จองด้วยคอร์ส 17 มิ.ย. 12:00 T01 แล้วดู Wallet', async () => {
    const res = await bookWithCourse(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01' });
    code = res.code;
    await openWallet(app, page);
    await checkRemaining(app, page, 'หลังจอง', 6);
  });

  await test.step('2. เข้า /th/admin ด้วยบัญชีร้าน กดใช้บริการเสร็จที่นัดนี้', async () => {
    if (code) await ownerComplete(app, '2026-06-17', code);
  });

  await test.step('3. U01 เปิด Wallet และหน้าบัญชี แล้วรีโหลด', async () => {
    await checkRemainingNowAndReload(app, page, 'หลังร้านกดเสร็จ', 6);
    await app.check(page.getByTestId('wallet-course-used-0'), 'ใช้ไป 4 + 1 = 5 ครั้ง', async (el) => {
      expect.soft(money(await el.innerText())).toBe(5);
    });
    await app.goto(page, '/th/account');
    await checkAccountValues(app, page, 'หลังร้านกดเสร็จ', { spend: 12400, tier: 'Gold', points: 99 });
    await app.reload(page);
    await checkAccountValues(app, page, 'หลังรีโหลด', { spend: 12400, tier: 'Gold', points: 99 });
  });

  await test.step('4. เปิดนัดนี้ใน /th/admin อีกครั้ง', async () => {
    const admin = await app.admin();
    await admin.open('2026-06-17');
    const status = code ? admin.status(code) : admin.page.getByTestId('admin-schedule');
    await app.check(status, 'นัดนี้แสดงว่าใช้บริการเสร็จแล้ว', async (el) => {
      await expect.soft(el).toContainText('เสร็จ');
    });
  });
});

// ---------------------------------------------------------------- TC-COURSE-03

async function checkNewCourse(app: App, page: Page, label: string) {
  const newCard = courseCards(page).filter({ hasText: remainingText(11) });
  await app.check(newCard, `${label}: คอร์สใหม่ ${remainingText(11)}`, async (el) => {
    await expect.soft(el).toHaveCount(1);
  });
  await app.check(newCard.getByTestId(/^wallet-course-expires-\d+$/), `${label}: หมดอายุ 12 ธ.ค. 2026`, async (el) => {
    await expect.soft(el).toHaveText('12 ธ.ค. 2026');
  });
}

async function buyAndVerify(app: App, page: Page, want: { spend: number; tier: string }) {
  await app.goto(page, '/th/wallet');
  await app.check(page.getByTestId('wallet-buy-price'), 'ราคาคอร์ส ฿15,000', async (el) => {
    expect.soft(money(await el.innerText())).toBe(15000);
  });
  const req = await buyCourse(app, page);
  await app.checkValue(page, 'ซื้อคอร์สสำเร็จ', req.responseStatus, (v) => {
    expect.soft(v).toBeLessThan(300);
  });
  await checkNewCourse(app, page, 'ทันที');
  await app.reload(page);
  await checkNewCourse(app, page, 'หลังรีโหลด');
  const courses = (await app.send(page, 'GET', '/api/wallet')).body?.courses as WalletCourse[] | undefined;
  const bought = (courses ?? []).filter((c) => c.remaining === 11);
  await app.checkValue(page, 'ราคาที่จ่ายจริงของคอร์สใหม่ ฿15,000', bought.map((c) => c.pricePaid), (v) => {
    expect.soft(v).toEqual([15000]);
  });
  await app.goto(page, '/th/account');
  await checkAccountValues(app, page, 'หลังซื้อ', want);
  await app.reload(page);
  await checkAccountValues(app, page, 'หลังรีโหลด', want);
}

test('TC-COURSE-03 ซื้อคอร์ส K01 ราคาเท่ากันทุกระดับ ได้ 11 ครั้ง ยอดสะสมไม่เพิ่ม และวันหมดอายุนับวันซื้อเป็นวันที่ 0', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ราคาและยอดสะสมหลังซื้อ:',
      'U01: ฿15,000 · ยอด ฿12,400 + ฿0 = ฿12,400 ยัง Gold (ถ้าบวกจะได้ ฿27,400)',
      'U03: ฿15,000 − 0% = ฿15,000 · ยอด ฿9,999 ยัง Silver (ถ้าบวกจะได้ ฿24,999 เป็น Gold)',
      'U05: ฿15,000 − 0% = ฿15,000 · ยอด ฿29,999 ยัง Gold (ถ้าลด 5% จะได้ ฿14,250 · ถ้าบวกยอดจะได้ ฿44,999 เป็น Platinum)',
      'U02: ฿15,000 − 0% = ฿15,000 · ยอด ฿30,000 ยัง Platinum (ถ้าลด 10% จะได้ ฿13,500)',
      'ทุกบัญชี: คอร์สใหม่ "เหลือ 11 ครั้ง จาก 11 ครั้ง" (10 + แถม 1) · หมดอายุ 12 ธ.ค. 2026 (15 มิ.ย. 2026 + 180 วัน · ถ้านับวันซื้อเป็นวันที่ 1 จะได้ 11 ธ.ค.)',
      'U01: C01 ยังเป็น "เหลือ 7 ครั้ง จาก 11 ครั้ง" แยกจากคอร์สใหม่ (ถ้ารวมกันจะเห็น 18 จาก 22)',
    ].join('\n'),
    source: '[D] §4 แต้มและระดับ · [D] §1 · [R] ⚠️A-27 · [R] ⚠️A-30',
    frbr: 'FR-30, FR-37, BR-23, BR-45, BR-46',
    rules: 'R37, R78',
    technique: 'Happy path, Boundary, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  test.setTimeout(480_000);

  await test.step('1-3. U01 อ่านราคา กดยืนยันซื้อ เปิด Wallet และหน้าบัญชี แล้วรีโหลด', async () => {
    await app.login(page, 'U01');
    await buyAndVerify(app, page, { spend: 12400, tier: 'Gold' });
    await app.goto(page, '/th/wallet');
    await app.check(courseCards(page).filter({ hasText: remainingText(7) }), `U01: C01 ยังเป็น ${remainingText(7)} แยกจากคอร์สใหม่`, async (el) => {
      await expect.soft(el).toHaveCount(1);
    });
    await app.check(courseCards(page), 'U01: มี 2 คอร์สแยกกัน ไม่รวมเป็น 18 จาก 22', async (el) => {
      await expect.soft(el).toHaveCount(2);
    });
  });

  await test.step('4. ทำซ้ำกับ U03', async () => {
    await app.login(page, 'U03');
    await buyAndVerify(app, page, { spend: 9999, tier: 'Silver' });
  });

  await test.step('4. ทำซ้ำกับ U05', async () => {
    await app.login(page, 'U05');
    await buyAndVerify(app, page, { spend: 29999, tier: 'Gold' });
  });

  await test.step('4. ทำซ้ำกับ U02', async () => {
    await app.login(page, 'U02');
    await buyAndVerify(app, page, { spend: 30000, tier: 'Platinum' });
    await app.goto(page, '/th/wallet');
    await checkNewCourse(app, page, 'U02 สุดท้าย');
  });
});

// ---------------------------------------------------------------- TC-COURSE-04

test('TC-COURSE-04 Gift Card ใช้ซื้อคอร์สไม่ได้ แต่ใช้จ่ายค่ารถของการจองด้วยคอร์สได้', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 1–2: จ่ายคอร์สด้วยบัตรไม่ได้ · ถูกปฏิเสธด้วยสถานะ 4xx หรือคิดราคาเต็ม ฿15,000 โดยไม่แตะบัตร (ถ้าหักบัตรจะจ่าย ฿14,500 และบัตรเหลือ ฿0)',
      'ขั้น 3: ยอดบัตรก่อนหักยังเป็น ฿500 · ราคาคอร์ส ฿0 + ค่ารถ ฿300 = ฿300 − หักบัตร ฿300 = จ่าย ฿0 · บัตรเหลือ ฿500 − ฿300 = ฿200 (ถ้าไม่ให้บัตรจ่ายค่ารถจะจ่าย ฿300 และบัตรเหลือ ฿500)',
      'ขั้น 4: C01 "เหลือ 6 ครั้ง จาก 11 ครั้ง"',
      'ขั้น 5: แต้มยัง 99 (ค่ารถไม่เข้าฐานแต้ม)',
    ].join('\n'),
    source: '[R] ⚠️A-27 · [R] ⚠️D-09 · [D] §4 Gift Card',
    frbr: 'FR-49, FR-50, BR-16, BR-33',
    rules: 'R84',
    technique: 'Negative, Happy path',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  await app.login(page, 'U01');
  const c01 = (await readWalletCourses(app, page))[0]?.id ?? '';
  let purchase: CapturedRequest | undefined;

  await test.step('1. เปิดหน้าซื้อคอร์ส หาช่องใส่บัตร ถ้ามีให้ใส่ GIFT-500 แล้วกดซื้อ', async () => {
    await app.goto(page, '/th/wallet');
    await page.getByTestId('wallet-buy-course').click();
    await page.getByTestId('wallet-buy-course-confirm').waitFor({ state: 'visible' });
    const giftInput = page.getByTestId('wallet-buy-panel').locator('input[data-testid*="gift" i], input[placeholder*="gift" i], input[placeholder*="บัตร"]');
    const hasInput = (await giftInput.count()) > 0;
    await app.checkValue(page, 'ช่องใส่บัตรในหน้าซื้อคอร์ส (บันทึกเป็นข้อมูล)', hasInput ? 'มีช่องใส่บัตร' : 'ไม่มีช่องใส่บัตร', () => {});
    if (hasInput) await giftInput.first().fill('GIFT-500');
    purchase = await app.capture(page, PURCHASE_PATH, () => page.getByTestId('wallet-buy-course-confirm').click());
    await settle(page);
    const rejected = purchase.responseStatus >= 400 && purchase.responseStatus < 500;
    const courses = ((await app.send(page, 'GET', '/api/wallet')).body?.courses ?? []) as WalletCourse[];
    await app.checkValue(page, 'ซื้อผ่านหน้าเว็บ: ปฏิเสธ 4xx หรือคิดเต็ม ฿15,000 (ไม่ใช่ ฿14,500)', { status: purchase.responseStatus, prices: courses.map((c) => c.pricePaid) }, (v) => {
      expect.soft(rejected || v.prices.every((p) => p === 15000)).toBe(true);
    });
  });

  await test.step('2. ยิงคำขอซื้อซ้ำโดยแนบ GIFT-500 ในช่องเดียวกับที่หน้าจองใช้ส่งบัตร', async () => {
    if (!purchase) return;
    // คำขอซื้อจริงอาจไม่มี body จึงตั้งเป็น object ว่างเพื่อให้ replay แนบรหัสบัตรได้
    const res = await app.replay(page, { ...purchase, body: purchase.body ?? {} }, { giftCardCode: 'GIFT-500' });
    const rejected = res.status >= 400 && res.status < 500;
    const courses = ((await app.send(page, 'GET', '/api/wallet')).body?.courses ?? []) as WalletCourse[];
    await app.checkValue(page, 'ยิงแนบบัตร: ปฏิเสธ 4xx หรือคิดเต็ม ฿15,000 (ไม่ใช่ ฿14,500)', { status: res.status, prices: courses.map((c) => c.pricePaid) }, (v) => {
      expect.soft(rejected || v.prices.every((p) => p === 15000)).toBe(true);
    });
    const card = await app.readGiftCard(page, 'GIFT-500');
    await app.check(page.getByTestId('giftcard-check-section'), 'บัตร GIFT-500 ยังเหลือ ฿500 ไม่ถูกแตะ', async () => {
      expect.soft(card.balance).toBe(500);
    });
  });

  let code: string | null = null;
  await test.step('3. จองด้วยคอร์ส C01 เลือกรถ H04 ใส่ GIFT-500 อ่านยอดบัตรก่อนหัก แล้วยืนยัน', async () => {
    await courseToSummary(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01', courseId: c01 });
    await booking.shuttleHotel('H04');
    await booking.giftCard('GIFT-500');
    await app.check(booking.el('booking-giftcard-info'), 'ยอดบัตรก่อนหัก ฿500 · หัก ฿300 · เหลือ ฿200', async (el) => {
      await expect.soft(el).toContainText(/ยอดในบัตร\s*฿500(?![\d,])/);
      await expect.soft(el).toContainText(/ใช้\s*฿300(?![\d,])/);
      await expect.soft(el).toContainText(/เหลือ\s*฿200(?![\d,])/);
    });
    const lines = await booking.lines();
    await app.check(booking.el('booking-line-full-price'), 'ราคาคอร์ส ฿0', async () => {
      expect.soft(lines.full).toBe(0);
    });
    await app.check(booking.el('booking-line-transport'), 'ค่ารถ ฿300', async () => {
      expect.soft(lines.transport).toBe(300);
    });
    await app.check(booking.el('booking-line-giftcard'), 'หักบัตร ฿300', async () => {
      expect.soft(lines.giftcard).toBe(300);
    });
    await app.check(booking.el('booking-pay-at-shop'), 'จ่าย ฿0', async () => {
      expect.soft(lines.pay).toBe(0);
    });
    const res = await booking.confirm();
    code = res.code;
    await app.checkValue(page, 'จองด้วยคอร์สพร้อมรถและบัตรสำเร็จ', code ?? `สถานะ ${res.request.responseStatus}`, () => {
      expect.soft(res.code, 'ต้องได้รหัสจอง').toBeTruthy();
    });
    const after = await app.readGiftCard(page, 'GIFT-500');
    await app.check(page.getByTestId('giftcard-check-section'), 'บัตรเหลือ ฿500 − ฿300 = ฿200', async () => {
      expect.soft(after.balance).toBe(200);
    });
  });

  await test.step('4. เปิด Wallet แล้วรีโหลด', async () => {
    const remainingOfC01 = courseCardById(page, c01).getByTestId(/^wallet-course-remaining-\d+$/);
    await openWallet(app, page);
    await app.check(remainingOfC01, `C01 ${remainingText(6)} ทันที`, async (el) => {
      await expect.soft(el).toHaveText(remainingText(6));
    });
    await app.reload(page);
    await app.check(remainingOfC01, `C01 ${remainingText(6)} หลังรีโหลด`, async (el) => {
      await expect.soft(el).toHaveText(remainingText(6));
    });
  });

  await test.step('5. เข้า /th/admin กดใช้บริการเสร็จที่นัดนี้ แล้วดูแต้มของ U01', async () => {
    if (code) await ownerComplete(app, '2026-06-17', code);
    await app.goto(page, '/th/account');
    await app.check(page.getByTestId('account-points'), 'แต้มยัง 99', async (el) => {
      expect.soft(money(await el.innerText())).toBe(99);
    });
  });
});

// ---------------------------------------------------------------- TC-COURSE-05

test('TC-COURSE-05 ขอบคอร์สเหลือ 0, 1, 2 และครั้งที่ถูกกันไว้นับรวมจนยกเลิกแล้วคืน', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ค่าเหลือ 0 (U10): ✗ "คอร์สนี้ใช้ครบแล้ว" · C04 ยังเหลือ 0 · ไม่มีนัดใหม่',
      'ค่าเหลือ 2 (U08): ✓ 2 − 1 = เหลือ 1',
      'ค่าเหลือ 1 (U11): ✓ 1 − 1 = เหลือ 0 ทันที',
      'ขั้น 4: ✗ มีข้อความแจ้งว่าใช้คอร์สไม่ได้ · C05 ยังเหลือ 0 · U11 ยังมีนัดเดียว (ถ้าคิด 11 − 10 ไม่หัก reserved จะจองผ่าน)',
      'ขั้น 5: คืนเป็น "เหลือ 1 ครั้ง จาก 11 ครั้ง" (ถ้าไม่คืนจะค้าง 0)',
      'ขั้น 6: ✓ 1 − 1 = เหลือ 0',
      'หมายเหตุ: ถ้อยคำขั้น 4 ตอนนี้ใช้ "คอร์สนี้ใช้ครบแล้ว" ตาม FR-40 ทั้งที่ยังยกเลิกคืนได้ รอร้านตอบ F-ร้าน 14 จึงไม่ถือเป็นข้อล้มในรอบนี้',
    ].join('\n'),
    source: '[D] บ.17 · [D] E184 · [D][R] E185, E186 · [R] ⚠️A-48 · F-ร้าน 14',
    frbr: 'FR-38, FR-40, BR-39',
    rules: 'R71, R82',
    technique: 'Boundary, State, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(480_000);
  let u10Before: string[] = [];
  let c04 = '';

  await test.step('1. U10 จองด้วย C04', async () => {
    await app.login(page, 'U10');
    u10Before = await accountCodes(app, page);
    c04 = (await readWalletCourses(app, page))[0]?.id ?? '';
    await attemptCourseBooking(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01', courseId: c04 });
    await app.check(page.getByTestId('booking-flow'), 'U10 เห็นข้อความ "คอร์สนี้ใช้ครบแล้ว"', async (el) => {
      await expect.soft(el).toContainText('คอร์สนี้ใช้ครบแล้ว');
    });
    await checkRemainingNowAndReload(app, page, 'U10 C04', 0);
    await checkNoNewBooking(app, page, 'U10 ไม่มีนัดใหม่', u10Before);
  });

  let captured: CapturedRequest | undefined;
  await test.step('2. U08 จองด้วย C02 17 มิ.ย. 12:00 ดู Wallet แล้วรีโหลด', async () => {
    await app.login(page, 'U08');
    const res = await bookWithCourse(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01' });
    captured = res.request;
    await checkRemainingNowAndReload(app, page, 'U08 C02 2 − 1', 1);
  });

  await test.step('2 (ต่อ). ยืนยันฝั่ง API ว่า C04 ของ U10 ถูกปฏิเสธเช่นกัน', async () => {
    if (!captured) return;
    await app.login(page, 'U10');
    const res = await app.replay(page, captured, { coursePurchaseId: c04, date: '2026-06-18', time: '12:00', therapistId: 'T01' });
    await checkRejected(app, page, 'ยิงด้วย C04 ถูกปฏิเสธ เหตุคอร์สใช้ครบ', res, /course-used-up|ใช้ครบแล้ว/);
    await checkRemainingNowAndReload(app, page, 'U10 C04 หลังยิงตรง', 0);
    await checkNoNewBooking(app, page, 'U10 ไม่มีนัดใหม่หลังยิงตรง', u10Before);
  });

  let c05 = '';
  let first: string | null = null;
  let u11Captured: CapturedRequest | undefined;
  await test.step('3. U11 จองด้วย C05 17 มิ.ย. 12:00 ดู Wallet แล้วรีโหลด', async () => {
    await app.login(page, 'U11');
    c05 = (await readWalletCourses(app, page))[0]?.id ?? '';
    // T01 ของรอบนี้ U08 จองไปแล้วในขั้น 2 จึงใช้ T05 ซึ่งเป็นนักบำบัดคอร์สอีกคน
    const res = await bookWithCourse(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T05', courseId: c05 });
    first = res.code;
    u11Captured = res.request;
    await checkRemainingNowAndReload(app, page, 'U11 C05 1 − 1', 0);
  });

  await test.step('4. U11 จองด้วย C05 อีกครั้ง 18 มิ.ย. 12:00', async () => {
    await attemptCourseBooking(app, booking, { date: '2026-06-18', time: '12:00', therapist: 'T01', courseId: c05 });
    const errors = page.getByTestId(/^error-/);
    const message = (await errors.allInnerTexts()).join(' | ');
    test.info().annotations.push({ type: 'pending-answer', description: `F-ร้าน 14 ถ้อยคำขั้น 4 ที่เว็บแสดงจริง: ${message || '(ไม่มีข้อความ)'}` });
    await app.check(page.getByTestId('booking-flow'), 'มีข้อความแจ้งว่าใช้คอร์สไม่ได้ (ถ้อยคำรอ F-ร้าน 14 ไม่ assert)', async () => {
      expect.soft(await errors.count()).toBeGreaterThan(0);
    });
    if (u11Captured) {
      const res = await app.replay(page, u11Captured, { date: '2026-06-18', time: '12:00', therapistId: 'T01', coursePurchaseId: c05 });
      await checkRejected(app, page, 'ยิงตรงขณะเหลือ 0 จากการกันไว้ถูกปฏิเสธ เหตุเกี่ยวกับคอร์ส', res, /course-|คอร์ส/);
    }
    await checkRemainingNowAndReload(app, page, 'U11 C05 ยังเหลือ 0', 0);
    await checkNoNewBooking(app, page, 'U11 ยังมีนัดเดียว', first ? [first] : []);
  });

  await test.step('5. U11 ยกเลิกนัด 17 มิ.ย. ดู Wallet แล้วรีโหลด', async () => {
    if (first) await cancelOnAccount(app, page, first);
    await checkRemainingNowAndReload(app, page, 'U11 คืนครั้ง', 1);
  });

  await test.step('6. U11 จองด้วย C05 18 มิ.ย. 12:00 อีกครั้ง', async () => {
    await bookWithCourse(app, booking, { date: '2026-06-18', time: '12:00', therapist: 'T01', courseId: c05 });
    await checkRemainingNowAndReload(app, page, 'U11 C05 1 − 1 รอบใหม่', 0);
  });
});

// ---------------------------------------------------------------- TC-COURSE-06

test('TC-COURSE-06 คอร์สใช้ได้ถึงวันที่ 180 โดยดูจากวันนัด ไม่ใช่วันนี้ และคอร์สหมดอายุใช้ครั้งที่เหลือไม่ได้ ทั้งหน้าจอและ API', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      '19 มิ.ย. วันที่ 179: ✓ เหลือ 2 − 1 = 1 (22 ธ.ค. 2025 + 179)',
      '20 มิ.ย. วันที่ 180: ✓ เหลือ 1 (ถ้านับวันซื้อเป็นวันที่ 1 จะถูกปฏิเสธ)',
      '21 มิ.ย. วันที่ 181: ✗ "หมดอายุสำหรับวันนี้" บนหน้าเว็บ · API ถูกปฏิเสธด้วยสถานะ 4xx โดยเหตุเป็นคอร์สหมดอายุ (401 หรือ 404 ถือว่าเทสต์ไม่สมบูรณ์ ให้ทำซ้ำ) · C02 ยังเหลือ 2 · ไม่มีนัดใหม่ (ถ้าดูวันล็อก 15 มิ.ย. แทนวันนัดจะจองผ่าน)',
      'U09 Wallet: "เหลือ 5 ครั้ง จาก 11 ครั้ง" · หมดอายุ 14 มิ.ย. 2026 · ไม่มีปุ่มต่ออายุ',
      '16 มิ.ย. วันที่ 182: ✗ บนหน้าเว็บมีข้อความแจ้งว่าคอร์สหมดอายุ · API ถูกปฏิเสธด้วยสถานะ 4xx โดยเหตุเป็นคอร์สหมดอายุ (401 หรือ 404 ถือว่าเทสต์ไม่สมบูรณ์ ให้ทำซ้ำ) · C03 ยังเหลือ 5 · ไม่มีนัดใหม่ (ถ้าดูแค่จำนวนครั้งเหลือจะจองผ่าน)',
    ].join('\n'),
    source: '[D] §4 คอร์ส · [D][R] E187–E189 · [R] ⚠️A-29',
    frbr: 'FR-42, BR-40',
    rules: 'R72',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(480_000);
  let captured: CapturedRequest | undefined;

  await test.step('1. U08 จองด้วย C02 วันที่ 19 มิ.ย. ดู Wallet แล้วรีโหลด', async () => {
    await app.login(page, 'U08');
    await bookWithCourse(app, booking, { date: '2026-06-19', time: '12:00', therapist: 'T01' });
    await checkRemainingNowAndReload(app, page, 'วันที่ 179', 1);
  });

  await test.step('2. ล็อก รีเซ็ต แล้ว U08 จองด้วย C02 วันที่ 20 มิ.ย. จับคำขอจาก Network', async () => {
    await app.lockAndReset();
    await app.login(page, 'U08');
    const res = await bookWithCourse(app, booking, { date: '2026-06-20', time: '12:00', therapist: 'T01' });
    captured = res.request;
    await checkRemainingNowAndReload(app, page, 'วันที่ 180', 1);
  });

  let u08Before: string[] = [];
  await test.step('3. ล็อก รีเซ็ต แล้ว U08 เลือก C02 วันที่ 21 มิ.ย. บนหน้าเว็บ', async () => {
    await app.lockAndReset();
    await app.login(page, 'U08');
    u08Before = await accountCodes(app, page);
    const c02 = (await readWalletCourses(app, page))[0]?.id ?? '';
    await attemptCourseBooking(app, booking, { date: '2026-06-21', time: '12:00', therapist: 'T01', courseId: c02 });
    await app.check(page.getByTestId('booking-flow'), 'วันที่ 181 เห็น "หมดอายุสำหรับวันนี้"', async (el) => {
      await expect.soft(el).toContainText('หมดอายุสำหรับวันนี้');
    });
  });

  await test.step('4. เข้าระบบ U08 ใหม่ อ่านรหัส C02 ใหม่จาก Network แล้วยิงวันที่ 21 มิ.ย.', async () => {
    if (captured) {
      const req = captured;
      const fire = async () => {
        await app.login(page, 'U08');
        const id = (await readWalletCourses(app, page))[0]?.id ?? '';
        return app.replay(page, req, { coursePurchaseId: id, date: '2026-06-21', time: '12:00' });
      };
      let res = await fire();
      // แผนให้ทำซ้ำเมื่อได้ 401 หรือ 404 เพราะถือว่าเทสต์ไม่สมบูรณ์
      if (res.status === 401 || res.status === 404) res = await fire();
      await checkRejected(app, page, 'ยิงวันที่ 181 ถูกปฏิเสธ 4xx เหตุคอร์สหมดอายุ', res, REASON_EXPIRED, { notStatuses: [401, 404] });
    }
    await checkRemainingNowAndReload(app, page, 'C02 ยังเหลือ', 2);
    await checkNoNewBooking(app, page, 'U08 ไม่มีนัดใหม่', u08Before);
  });

  let c03 = '';
  let u09Before: string[] = [];
  await test.step('5. U09 เปิด Wallet อ่านรหัส C03 แล้วลองจองด้วย C03 วันที่ 16 มิ.ย.', async () => {
    await app.login(page, 'U09');
    u09Before = await accountCodes(app, page);
    c03 = (await readWalletCourses(app, page))[0]?.id ?? '';
    await checkRemaining(app, page, 'U09 Wallet', 5);
    await app.check(page.getByTestId('wallet-course-expires-0'), 'U09 หมดอายุ 14 มิ.ย. 2026', async (el) => {
      await expect.soft(el).toHaveText('14 มิ.ย. 2026');
    });
    await app.check(page.getByTestId('wallet-course-0'), 'U09 ไม่มีปุ่มต่ออายุ', async (el) => {
      await expect.soft(el.getByRole('button', { name: /ต่ออายุ/ })).toHaveCount(0);
      await expect.soft(el.getByRole('link', { name: /ต่ออายุ/ })).toHaveCount(0);
    });
    await attemptCourseBooking(app, booking, { date: '2026-06-16', time: '12:00', therapist: 'T01', courseId: c03 });
    await app.check(page.getByTestId('booking-flow'), 'วันที่ 182 มีข้อความแจ้งว่าคอร์สหมดอายุ', async (el) => {
      await expect.soft(el).toContainText('หมดอายุ');
    });
  });

  await test.step('6. U09 ยิงคำขอแบบเดียวกันด้วยรหัส C03 และวัน 16 มิ.ย.', async () => {
    if (captured) {
      const req = captured;
      const fire = () => app.replay(page, req, { coursePurchaseId: c03, date: '2026-06-16', time: '12:00' });
      let res = await fire();
      if (res.status === 401 || res.status === 404) {
        await app.login(page, 'U09');
        c03 = (await readWalletCourses(app, page))[0]?.id ?? c03;
        res = await fire();
      }
      await checkRejected(app, page, 'ยิงวันที่ 182 ถูกปฏิเสธ 4xx เหตุคอร์สหมดอายุ', res, REASON_EXPIRED, { notStatuses: [401, 404] });
    }
    await checkNoNewBooking(app, page, 'U09 ไม่มีนัดใหม่', u09Before);
    await checkRemainingNowAndReload(app, page, 'C03 ยังเหลือ', 5);
  });
});

// ---------------------------------------------------------------- TC-COURSE-07

test('TC-COURSE-07 จองด้วยคอร์สได้ครั้งละ 1 คน กับ T01 หรือ T05 ครั้งละ 60 นาทีเท่านั้น', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 1: รายชื่อมีเฉพาะ T01, T05 รวม 2 คน (ถ้าเห็น T02 แปลว่าไม่กรองตามคนทำได้)',
      'ขั้น 2: เลือก 2 คนไม่ได้ หรือมีข้อความแจ้งว่าจองด้วยคอร์สได้ครั้งละ 1 คน',
      'ขั้น 3: เวลานัด 12:00–13:00 (60 นาที) · C01 เหลือ 6',
      'หลังยกเลิกขั้น 4: C01 เหลือ 7',
      'ขั้น 4–5: ถูกปฏิเสธด้วยสถานะ 4xx · C01 ยังเหลือ 7 · ไม่มีนัดใหม่ (ถ้าตัด 2 ครั้งจาก 2 คนจะเหลือ 5)',
    ].join('\n'),
    source: '[R] ⚠️A-28 · [D] §1, §2 นาทีและคนทำ · [D][R] E192',
    frbr: 'FR-39',
    rules: 'R80, R90',
    technique: 'Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  await app.login(page, 'U01');

  await test.step('1. กดจองจากคอร์ส C01 ดูตัวเลือกจำนวนคนและรายชื่อนักบำบัด', async () => {
    await clickCourseLink(app, page);
    await booking.nextFromStep1();
    const therapists = page.getByTestId(/^booking-therapist-T\d+$/);
    await therapists.first().waitFor({ state: 'visible' }); // รายชื่อมาจาก API ต้องรอก่อนอ่าน
    await settle(page);
    const ids = await therapists.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid!.replace('booking-therapist-', '')).sort());
    await app.check(therapists, 'รายชื่อมีเฉพาะ T01, T05 รวม 2 คน', async () => {
      expect.soft(ids).toEqual(['T01', 'T05']);
    });
    await page.getByTestId('booking-step2-back').click();
    await page.getByTestId('booking-screen-1').waitFor({ state: 'visible' });
  });

  await test.step('2. ลองเลือก 2 คนบนหน้าเว็บ', async () => {
    const party2 = page.getByTestId('booking-party-2');
    const disabled = await party2.isDisabled();
    if (!disabled) {
      await party2.click();
      await settle(page);
    }
    const message = await page.getByTestId('booking-flow').getByText('จองด้วยคอร์สได้ครั้งละ 1 คน').count();
    await app.check(party2, 'เลือก 2 คนไม่ได้ หรือมีข้อความแจ้งว่าจองด้วยคอร์สได้ครั้งละ 1 คน', async () => {
      expect.soft(disabled || message > 0).toBe(true);
    });
    if (!disabled) {
      await page.getByTestId('booking-party-1').click();
      await settle(page);
    }
  });

  let captured: CapturedRequest | undefined;
  let code: string | null = null;
  await test.step('3. จอง 1 คน กับ T01 จนเสร็จ จับ URL และคำขอจาก Network', async () => {
    await booking.nextFromStep1();
    await booking.chooseDate('2026-06-17');
    await booking.chooseTherapist('T01');
    await booking.chooseSlot('12:00');
    await booking.nextFromStep2();
    const res = await booking.confirm();
    captured = res.request;
    code = res.code;
    await app.check(booking.el('booking-done-when'), 'เวลานัด 12:00–13:00 (60 นาที)', async (el) => {
      await expect.soft(el).toContainText(/12:00\s*[–-]\s*13:00/);
    });
    await checkRemainingNowAndReload(app, page, 'C01 เหลือ 6', 6);
  });

  let baseline: string[] = [];
  await test.step('4. ยกเลิกนัดนี้ แล้วยิงคำขอซ้ำโดยแก้จำนวนคนเป็น 2', async () => {
    if (code) await cancelOnAccount(app, page, code);
    await checkRemainingNowAndReload(app, page, 'หลังยกเลิก C01 เหลือ 7', 7);
    baseline = await accountCodes(app, page);
    if (captured) {
      // การจอง 2 คนจริงไม่ส่ง therapistId (ระบบจัด) จึงเอาออก เพื่อให้เหตุปฏิเสธมาจากกฎ 1 คน ไม่ใช่ข้อมูลผิดรูปแบบ
      const res = await app.replay(page, captured, { partySize: 2 }, { remove: ['therapistId'] });
      await checkRejected(app, page, 'ยิง 2 คนถูกปฏิเสธ เหตุจองด้วยคอร์สได้ครั้งละ 1 คน', res, /course-one-person|ครั้งละ 1 คน/);
    }
  });

  await test.step('5. ยิงคำขอซ้ำโดยแก้นักบำบัดเป็น T02', async () => {
    if (captured) {
      const res = await app.replay(page, captured, { therapistId: 'T02' });
      await checkRejected(app, page, 'ยิงด้วย T02 ถูกปฏิเสธ เหตุนักบำบัดไม่ได้ทำบริการนี้', res, /therapist-cannot-perform|ไม่ได้ทำบริการนี้/);
    }
    await checkNoNewBooking(app, page, 'ไม่มีนัดใหม่', baseline);
    await checkRemainingNowAndReload(app, page, 'C01 ยังเหลือ', 7);
  });
});

// ---------------------------------------------------------------- TC-COURSE-08

test('TC-COURSE-08 ลูกค้าที่ไม่มีคอร์สเปิดจอง K01 ต้องรู้เหตุผลว่าใช้คอร์สเท่านั้น และจองไม่ได้', {
  tag: ['@P2', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 2: มีข้อความแจ้งว่า K01 จองได้ด้วยคอร์สเท่านั้น (ถ้าไม่มีข้อความใดเลย ถือว่าไม่ผ่าน) · ตอนนี้คำถาม F-สร้าง 19 ยังไม่มีคำตอบว่าควรพาไปซื้อด้วยหรือไม่ จึงไม่ตรวจปลายทางของปุ่ม',
      'ขั้น 4: ถูกปฏิเสธด้วยสถานะ 4xx โดยเหตุคือต้องมีคอร์ส (R81 `course-required`) · เหตุอื่นถือว่ายังไม่ได้พิสูจน์กฎนี้',
      'ขั้น 5: U04 มีนัดเดียวคือ S01 17 มิ.ย. ไม่มีนัด K01 · Wallet ไม่มีคอร์ส (ถ้าจองผ่านจะได้ K01 ฟรีโดยไม่มีคอร์ส)',
    ].join('\n'),
    source: '[D] ตามแถว R81 ใน EXPLORATION ส่วน C · F-สร้าง 19',
    frbr: 'FR-39',
    rules: 'R81',
    technique: 'Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  await app.login(page, 'U04');

  await test.step('1-2. เปิด /th/booking?service=K01 อ่านข้อความบนหน้าและปุ่มที่กดต่อได้', async () => {
    await booking.open('th', '?service=K01');
    await app.check(page.getByTestId('booking-flow'), 'มีข้อความแจ้งว่า K01 จองได้ด้วยคอร์สเท่านั้น', async (el) => {
      await expect.soft(el).toContainText('ด้วยคอร์สเท่านั้น');
    });
    const actions = await page.getByTestId('booking-flow').locator('a:visible, button:not([disabled]):visible').allInnerTexts();
    const summary = actions.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20).join(' | ');
    test.info().annotations.push({ type: 'pending-answer', description: `F-สร้าง 19 ปุ่มที่กดต่อได้บนหน้า K01: ${summary || '(ไม่มี)'}` });
    await app.checkValue(page, 'ปุ่มที่กดต่อได้ (รอ F-สร้าง 19 ไม่ assert)', summary || '(ไม่มี)', () => {});
  });

  let captured: CapturedRequest | undefined;
  let code: string | null = null;
  await test.step('3. จอง S01 17 มิ.ย. 12:00 กับ T01 จนเสร็จ จับ URL และคำขอจาก Network', async () => {
    const res = await booking.book({ service: 'S01', date: '2026-06-17', time: '12:00', therapist: 'T01' });
    captured = res.request;
    code = res.code;
    await app.checkValue(page, 'จอง S01 สำเร็จ', code ?? `สถานะ ${res.request.responseStatus}`, () => {
      expect.soft(res.code, 'ต้องได้รหัสจอง').toBeTruthy();
    });
  });

  await test.step('4. ยิงคำขอซ้ำโดยแก้บริการเป็น K01 วัน 18 มิ.ย. 12:00 คง T01 และลบ expectedPayAtShop', async () => {
    if (!captured) return;
    const res = await app.replay(page, captured, { serviceId: 'K01', date: '2026-06-18', time: '12:00', therapistId: 'T01' }, { remove: ['expectedPayAtShop'] });
    await checkRejected(app, page, 'ยิง K01 ไม่มีคอร์สถูกปฏิเสธ เหตุ course-required', res, /course-required/);
  });

  await test.step('5. เปิดรายการนัดของ U04 แล้วรีโหลด', async () => {
    await checkNoNewBooking(app, page, 'U04 มีนัดเดียวคือ S01', code ? [code] : []);
    await app.reload(page);
    if (code) {
      await app.check(page.getByTestId(`account-booking-service-${code}`), 'นัดเป็น S01 นวดไทย 60 นาที', async (el) => {
        await expect.soft(el).toHaveText('นวดไทย 60 นาที');
      });
      await app.check(page.getByTestId(`account-booking-date-${code}`), 'นัดวันที่ 17 มิ.ย. 2026', async (el) => {
        await expect.soft(el).toHaveText('17 มิ.ย. 2026');
      });
    }
    await app.check(page.getByTestId('account-bookings'), 'ไม่มีนัด K01', async (el) => {
      await expect.soft(el).not.toContainText('คอร์สกระชับสัดส่วน');
    });
    await app.goto(page, '/th/wallet');
    await app.check(page.getByTestId('wallet-courses'), 'Wallet ไม่มีคอร์ส', async (el) => {
      await expect.soft(el.getByTestId(/^wallet-course-\d+$/)).toHaveCount(0);
      await expect.soft(el.getByTestId('wallet-courses-empty')).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------- TC-COURSE-09

test('TC-COURSE-09 ใช้คอร์สของคนอื่นจองจริงไม่ได้ และแขกใช้คอร์สไม่ได้', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 3: ถูกปฏิเสธด้วยสถานะ 401/403/404',
      'ขั้น 4: ยิงแบบแขกถูกปฏิเสธด้วยสถานะ 401/403/404 · Wallet ไม่แสดงคอร์สใด',
      'ขั้น 5: C05 ยัง "เหลือ 1 ครั้ง จาก 11 ครั้ง" (ถ้าตัดคอร์สคนอื่นจะเหลือ 0) · C01 ยัง "เหลือ 6 ครั้ง จาก 11 ครั้ง" จากนัดขั้น 2 เท่านั้น (ถ้าตกไปตัดคอร์สตัวเองจะเหลือ 5) · U01 มีนัดคอร์สใหม่รายการเดียว ไม่มีนัด 18 มิ.ย. · Wallet ของ U01 ไม่เห็น C05',
    ].join('\n'),
    source: '[R] ตามแถว R85 ใน EXPLORATION ส่วน C',
    frbr: 'FR-38, FR-41',
    rules: 'R85',
    technique: 'Security, Negative',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app, booking }) => {
  const DENIED = [401, 403, 404];
  const patchTo18 = (id: string) => ({ coursePurchaseId: id, date: '2026-06-18', time: '12:00', therapistId: 'T01' });
  let c05 = '';

  await test.step('1. U11 กดจองจาก C05 อ่านรหัสคอร์สจาก URL โดยไม่กดยืนยัน แล้วออกจากระบบ', async () => {
    await app.login(page, 'U11');
    await app.goto(page, '/th/wallet');
    await clickCourseLink(app, page);
    c05 = new URL(page.url()).searchParams.get('course') ?? (await readWalletCourses(app, page))[0]?.id ?? '';
    await app.checkValue(page, 'อ่านรหัส C05 ของ U11 ได้', c05, (v) => {
      expect.soft(v).not.toBe('');
    });
    await app.logout(page);
  });

  let captured: CapturedRequest | undefined;
  let u01Before: string[] = [];
  let code: string | null = null;
  await test.step('2. U01 จองด้วย C01 17 มิ.ย. 12:00 จับ URL และคำขอจาก Network', async () => {
    await app.login(page, 'U01');
    u01Before = await accountCodes(app, page);
    const res = await bookWithCourse(app, booking, { date: '2026-06-17', time: '12:00', therapist: 'T01' });
    captured = res.request;
    code = res.code;
  });

  await test.step('3. U01 ยิงคำขอซ้ำ แก้รหัสคอร์สเป็นของ U11 และแก้วันเป็น 18 มิ.ย. 12:00', async () => {
    if (!captured) return;
    const res = await app.replay(page, captured, patchTo18(c05));
    await checkRejected(app, page, 'ใช้คอร์สของคนอื่นถูกปฏิเสธ 401/403/404', res, /course-not-found|forbidden|unauthorized|not-found|course-login-required/, { statuses: DENIED });
  });

  await test.step('4. ออกจากระบบ ยิงคำขอเดียวกันแบบแขก และเปิด Wallet แบบแขก', async () => {
    await app.logout(page);
    if (captured) {
      const guest = await app.guestApi();
      // กติกา 7.3: ใส่ข้อมูลแขกครบ เพื่อให้การปฏิเสธมาจากกฎคอร์ส ไม่ใช่ข้อมูลแขกขาด
      const res = await app.replay(guest, captured, { ...patchTo18(c05), guest: { name: 'คุณทดสอบ', phone: '0890075091' } });
      await checkRejected(app, page, 'แขกใช้คอร์สถูกปฏิเสธ 401/403/404', res, /course-login-required|course-not-found|forbidden|unauthorized|not-found/, { statuses: DENIED });
    }
    await app.goto(page, '/th/wallet');
    await app.check(page.locator('body'), 'แขกเปิด Wallet ไม่เห็นคอร์สใด', async (el) => {
      await expect.soft(el.getByTestId(/^wallet-course-\d+$/)).toHaveCount(0);
    });
  });

  await test.step('5. U11 และ U01 เปิด Wallet แล้วรีโหลด', async () => {
    await app.login(page, 'U11');
    await checkRemainingNowAndReload(app, page, 'C05 ของ U11 ยัง', 1);
    await app.login(page, 'U01');
    await checkNoNewBooking(app, page, 'U01 มีนัดคอร์สใหม่รายการเดียว ไม่มีนัด 18 มิ.ย.', code ? [...u01Before, code] : u01Before);
    await checkRemainingNowAndReload(app, page, 'C01 ของ U01', 6);
    await app.check(courseCards(page), 'Wallet ของ U01 มีแค่ C01 ไม่เห็น C05', async (el) => {
      await expect.soft(el).toHaveCount(1);
      await expect.soft(page.locator(`a[href*="course=${c05}"]`)).toHaveCount(0);
    });
    await checkRemaining(app, page, 'สรุป C01', 6);
  });
});

// ---------------------------------------------------------------- TC-COURSE-10

const HISTORY_ORDER = ['SJHIST04', 'SJHIST03', 'SJHIST02', 'SJHIST01'];
const HISTORY_DATE: Record<string, string> = {
  SJHIST04: '26 พ.ค. 2026',
  SJHIST03: '5 พ.ค. 2026',
  SJHIST02: '14 เม.ย. 2026',
  SJHIST01: '24 มี.ค. 2026',
};

async function checkHistoryList(app: App, page: Page, label: string) {
  const items = page.getByTestId(/^history-item-/);
  await app.check(page.getByTestId('history-list'), `${label}: 4 รายการ เรียง B04, B03, B02, B01`, async () => {
    const codes = await items.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid!.replace('history-item-', '')));
    expect.soft(codes).toEqual(HISTORY_ORDER);
  });
  for (const code of HISTORY_ORDER) {
    await app.check(page.getByTestId(`history-date-${code}`), `${label}: ${code} วันที่ ${HISTORY_DATE[code]}`, async (el) => {
      await expect.soft(el).toContainText(new RegExp(`(^|\\s)${HISTORY_DATE[code]}`));
    });
  }
}

test('TC-COURSE-10 กราฟรอบเอวและประวัติทรีตเมนต์แสดงตัวเลขและลำดับตรง เฉพาะของเจ้าของบัญชี', {
  tag: ['@P1', '@5.5'],
  annotation: plan({
    expected: [
      'ขั้น 1: 4 จุดเรียงตามวันที่ 82.0 → 81.0 → 79.5 → 78.0 ซม. · "ลดลง 4.0 ซม." (82.0 − 78.0 = 4.0 · ถ้าเทียบจุดก่อนหน้าจะได้ 1.5)',
      'ขั้น 2: ไม่มีช่องกรอกและไม่มีปุ่มอัปโหลด',
      'ขั้น 3–4: 4 รายการ เรียง B04, B03, B02, B01 (ถ้าเรียงเก่าไปใหม่จะขึ้น B01 ก่อน)',
      'ขั้น 5: ไม่เห็น B01–B04 และไม่เห็นกราฟ 82.0 → 78.0 ของ U01',
      'ขั้น 6: ไปหน้าเข้าสู่ระบบ ไม่เห็นรายการ B01–B04',
    ].join('\n'),
    source: '[D] §5 · [D][R] E250, E251 · [R] ⚠️A-22 · [R] ⚠️A-45',
    frbr: 'FR-43, FR-44, FR-45',
    rules: 'R83, R96, R98',
    technique: 'Happy path, Negative, Security',
    timing: 'ทันที · หลังรีโหลด',
  }),
}, async ({ page, app }) => {
  await app.login(page, 'U01');
  const u01Items = /^history-item-SJHIST0[1-4]$/;

  await test.step('1. U01 เปิด Wallet อ่านกราฟรอบเอวและยอดที่ลดลง', async () => {
    await openWallet(app, page);
    await app.check(page.getByTestId('wallet-waist-chart'), '4 จุด 82.0 → 81.0 → 79.5 → 78.0 ซม.', async () => {
      const points = (await page.getByTestId(/^wallet-waist-point-\d+$/).allTextContents()).map((t) => t.trim());
      expect.soft(points).toEqual(['82.0', '81.0', '79.5', '78.0']);
    });
    const waist = (await app.send(page, 'GET', '/api/wallet')).body?.waist;
    const dates: string[] = (waist?.points ?? []).map((p: { date: string }) => p.date);
    await app.checkValue(page, 'จุดรอบเอวเรียงตามวันที่', dates, (v) => {
      expect.soft(v).toHaveLength(4);
      expect.soft(v).toEqual([...v].sort());
    });
    await app.check(page.getByTestId('wallet-waist-reduced'), '"ลดลง 4.0 ซม."', async (el) => {
      await expect.soft(el).toHaveText('ลดลง 4.0 ซม.');
    });
  });

  await test.step('2. หาช่องกรอกรอบเอวหรือปุ่มอัปโหลดรูปในหน้า Wallet', async () => {
    await app.check(page.getByTestId('wallet-page'), 'ไม่มีช่องกรอกและไม่มีปุ่มอัปโหลด', async (el) => {
      await expect.soft(el.locator('input, textarea, select')).toHaveCount(0);
      await expect.soft(el.getByRole('button', { name: /อัปโหลด|upload|บันทึกรอบเอว|เพิ่มรูป/i })).toHaveCount(0);
      await expect.soft(el.getByRole('link', { name: /อัปโหลด|upload|บันทึกรอบเอว|เพิ่มรูป/i })).toHaveCount(0);
    });
  });

  await test.step('3. กด wallet-history-link อ่านรายการประวัติ แล้วรีโหลด', async () => {
    await page.getByTestId('wallet-history-link').click();
    await page.getByTestId('history-page').waitFor({ state: 'visible' });
    await page.waitForSelector('html[data-ready="true"]');
    await settle(page);
    await checkHistoryList(app, page, 'จาก Wallet');
    await app.reload(page);
    await checkHistoryList(app, page, 'หลังรีโหลด');
  });

  await test.step('4. กลับหน้าบัญชี กด account-history-link อ่านรายการอีกครั้ง', async () => {
    await app.goto(page, '/th/account');
    await page.getByTestId('account-history-link').click();
    await page.getByTestId('history-page').waitFor({ state: 'visible' });
    await page.waitForSelector('html[data-ready="true"]');
    await settle(page);
    await checkHistoryList(app, page, 'จากหน้าบัญชี');
  });

  await test.step('5. ออกจากระบบ เข้า U02 เปิด /th/account/history และ Wallet', async () => {
    await app.logout(page);
    await app.login(page, 'U02');
    await app.goto(page, '/th/account/history');
    await app.check(page.locator('body'), 'U02 ไม่เห็นประวัติ B01–B04', async (el) => {
      await expect.soft(el.getByTestId(u01Items)).toHaveCount(0);
    });
    await app.goto(page, '/th/wallet');
    await app.check(page.getByTestId('wallet-page'), 'U02 ไม่เห็นกราฟ 82.0 → 78.0 ของ U01', async (el) => {
      await expect.soft(el).not.toContainText('82.0 → 78.0');
      await expect.soft(el.getByTestId(/^wallet-waist-point-\d+$/).filter({ hasText: '82.0' })).toHaveCount(0);
    });
  });

  await test.step('6. ออกจากระบบ เปิด /th/account/history แบบแขก', async () => {
    await app.logout(page);
    await app.goto(page, '/th/account/history');
    await app.check(page.locator('body'), 'แขกไปหน้าเข้าสู่ระบบ ไม่เห็นรายการ B01–B04', async (el) => {
      await expect.soft(page).toHaveURL(/\/th\/login/);
      await expect.soft(el.getByTestId(u01Items)).toHaveCount(0);
    });
  });
});
