/**
 * หัวข้อ 5.1 จองคิวพื้นฐาน (TC-BOOK-01 ถึง TC-BOOK-10) ตาม TEST-PLAN.md
 * ตัวเลขและข้อความทั้งหมดมาจากแผน ถ้าเว็บไม่ตรงแผน test ต้องล้ม
 */
import type { Page, Response as PwResponse } from '@playwright/test';
import { test, expect, plan, LOCK, USERS, lineAmount, settle, BookingHelper } from '../fixtures';
import type { AdminHelper, ApiResult, App, CapturedRequest } from '../fixtures';

// ---------------------------------------------------------------- ค่าจาก TEST-DATA.md

const D14 = '2026-06-14';
const D15 = '2026-06-15';
const D16 = '2026-06-16';
const D17 = '2026-06-17';
const D22 = '2026-06-22';
const D24 = '2026-06-24';
const JUL15 = '2026-07-15';
const JUL16 = '2026-07-16';

const NAME: Record<string, string> = {
  T01: 'พี่ศรี',
  T02: 'พี่มาลี',
  T03: 'พี่ภูมิ',
  T04: 'น้องฟ้า',
  T05: 'พี่ทิว',
  T06: 'น้องแก้ว',
};
const S01_NAME = 'นวดไทย 60 นาที';
const S06_NAME = 'ขัดผิวสมุนไพร';
const B10 = 'SJTEST10';
const SHOP_PHONE = '02-123-4567';
const SLOT_TAKEN = 'เวลานี้ถูกจองแล้ว';

/** เหตุที่ไม่เกี่ยวกับกฎที่ทดสอบ: ถ้าถูกปฏิเสธด้วยเหตุเหล่านี้ถือว่าไม่ได้ทดสอบกฎจริง (กติกา 7.3) */
const UNRELATED_REASONS: (string | null)[] = [
  'guest-info-required',
  'phone-invalid',
  'price-changed',
  'service-not-found',
  'unauthorized',
  'forbidden',
  'not-found',
];

// ---------------------------------------------------------------- helper ของหัวข้อนี้

type AdminRow = { code: string; time: string; therapists: string; pay: number; customer: string; phone: string; service: string };

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** อ่านทุกแถวของวันที่หลังร้านเปิดอยู่ */
async function readRows(admin: AdminHelper): Promise<AdminRow[]> {
  const text = async (l: ReturnType<AdminHelper['time']>) => clean(await l.innerText({ timeout: 2_000 }).catch(() => ''));
  const rows: AdminRow[] = [];
  for (const code of await admin.codes()) {
    rows.push({
      code,
      time: await text(admin.time(code)),
      therapists: await text(admin.therapists(code)),
      pay: lineAmount(await text(admin.pay(code))),
      customer: await text(admin.customer(code)),
      phone: await text(admin.phone(code)),
      service: await text(admin.service(code)),
    });
  }
  return rows;
}

/** รีโหลดหลังร้านแล้วเลือกวันเดิม เพราะวันที่อาจกลับเป็นค่าเริ่มต้นหลังรีโหลด */
async function reloadAdmin(app: App, admin: AdminHelper, date: string) {
  await app.reload(admin.page);
  await admin.page.getByTestId('admin-date').fill(date);
  await settle(admin.page);
}

/** เปิดหลังร้านที่วันที่ระบุ ตรวจจำนวนแถว แล้วคืนแถวทั้งหมด */
async function adminCount(app: App, admin: AdminHelper, date: string, expected: number, when = '') {
  await admin.open(date);
  await app.check(admin.page.getByTestId('admin-page'), `หลังร้าน ${date}${when ? ` ${when}` : ''} มี ${expected} รายการ`, async () => {
    await expect.soft(admin.rowsLocator()).toHaveCount(expected);
  });
  return readRows(admin);
}

/** รีโหลดหลังร้านแล้วตรวจจำนวนแถวซ้ำ */
async function adminCountAfterReload(app: App, admin: AdminHelper, date: string, expected: number) {
  await reloadAdmin(app, admin, date);
  await app.check(admin.page.getByTestId('admin-page'), `หลังรีโหลด หลังร้าน ${date} มี ${expected} รายการ`, async () => {
    await expect.soft(admin.rowsLocator()).toHaveCount(expected);
  });
  return readRows(admin);
}

/** login บัญชีร้านใหม่หลังรีเซ็ต */
async function freshAdmin(app: App) {
  await app.ownerRelogin();
  return app.admin();
}

/** ตรวจว่าคำขอถูกปฏิเสธ 4xx และเหตุไม่ใช่เรื่องที่ไม่เกี่ยวกับกฎที่ทดสอบ */
async function checkRejected(app: App, page: Page, label: string, res: ApiResult) {
  const code: string | null = res.body?.error?.code ?? null;
  const message: string | null = res.body?.error?.message ?? null;
  await app.checkValue(page, label, { status: res.status, code, message }, (v) => {
    expect.soft(v.status).toBeGreaterThanOrEqual(400);
    expect.soft(v.status).toBeLessThan(500);
    expect.soft(UNRELATED_REASONS).not.toContain(v.code);
  });
}

async function checkAccepted(app: App, page: Page, label: string, res: ApiResult) {
  await app.checkValue(page, label, { status: res.status, message: res.body?.error?.message ?? null }, (v) => {
    expect.soft(v.status).toBeGreaterThanOrEqual(200);
    expect.soft(v.status).toBeLessThan(300);
  });
}

/** ตรวจรอบบนหน้าจอ 2: รอบ ✓ ต้องกดได้ · รอบ ✗ ต้องไม่อยู่ในรายการ */
async function checkSlots(app: App, booking: BookingHelper, label: string, ok: string[], bad: string[]) {
  await settle(booking.page);
  await app.check(booking.el('booking-screen-2'), label, async () => {
    for (const t of ok) await expect.soft(booking.slot(t), `รอบ ${t} ต้องมี`).toBeEnabled();
    for (const t of bad) await expect.soft(booking.slot(t), `รอบ ${t} ต้องไม่มี`).toHaveCount(0);
  });
}

/** เปิดหน้าจอ 2 ของบริการ 1 คนที่วันที่ระบุ */
async function toScreen2(booking: BookingHelper, service: string, date: string) {
  await booking.open();
  await booking.chooseService(service, 1);
  await booking.nextFromStep1();
  await booking.chooseDate(date);
}

/** เลือกนักบำบัดเฉพาะเมื่อมีปุ่มบนจอ เพื่อไม่ให้ test หยุดก่อนถึงจุดตรวจ */
async function tryTherapist(booking: BookingHelper, therapist: string) {
  const id = therapist === 'any' ? 'booking-therapist-any' : `booking-therapist-${therapist}`;
  if (await booking.el(id).count()) await booking.chooseTherapist(therapist);
}

/** ยอดจ่ายหน้าร้าน ถ้าไม่มี element บนจอคืน NaN */
async function safePay(booking: BookingHelper): Promise<number> {
  await booking.quoteReady();
  if (!(await booking.el('booking-pay-at-shop').count())) return NaN;
  return booking.pay();
}

/** ตรวจคิว T01 ของวันที่เปิดอยู่จากแถวหลังร้าน */
function t01Times(rows: AdminRow[]) {
  return rows.filter((r) => r.therapists.includes(NAME.T01)).map((r) => r.time).sort();
}

function durationOf(text: string): number {
  const all = [...text.matchAll(/(\d+)\s*นาที/g)];
  return all.length ? Number(all[all.length - 1][1]) : NaN;
}

/** แบบ POST /api/bookings จากการจองแขกบนหน้าเว็บ */
const guestBody = (phone: string, name = 'คุณทดสอบ') => ({ guest: { name, phone } });

// ---------------------------------------------------------------- tests

test('TC-BOOK-01 สมาชิก Gold จอง 1 คนจนจบใน 3 หน้าจอ ยอดตรงกันทุกจุด', {
  tag: ['@P1', '@5.1', '@mobile'],
  annotation: plan({
    expected: 'เมนูแสดงนาทีและราคา: S01 60 นาที ฿1,000 · S02 90 ฿1,400 · S03 60 ฿1,200 · S04 90 ฿2,000 · S05 60 ฿800 · S06 60 ฿1,500 · S07 60 ฿1,800 · P01 120 ฿2,900\nนับจากเลือกบริการถึงยืนยันไม่เกิน 3 หน้าจอ\nยอดหน้าสรุป = หน้ายืนยัน = หลังร้าน = ฿950 ต่างกัน ฿0 (฿1,000 − 5% (฿50) = ฿950 · ถ้าไม่ได้ส่วนลดจะได้ ฿1,000 · ถ้าแลกแต้มเองจะได้ ฿900)\nหลังร้านแสดง S01 · T01 · 17 มิ.ย. 20:00–21:00 ตรงรหัสจองเดียวกัน\nแต้ม U08 ยังเป็น 101 เพราะไม่ได้แลก และยังไม่ได้กดเสร็จ',
    source: '[D] §1 ชื่อ นาที ราคา · [D] §4 จองคิว · [D] บ.15 · [R] ⚠️A-41 · [R] ⚠️A-46',
    frbr: 'FR-01, FR-02, FR-05, NFR-03, NFR-11, BR-21',
    rules: 'R94',
    technique: 'Happy path',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const screens = new Set<string>();
  const markScreen = async () => {
    const ids = await page.locator('[data-testid^="booking-screen-"]').evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => (e as HTMLElement).dataset.testid!));
    ids.forEach((id) => screens.add(id));
  };
  let summaryPay = NaN;
  let confirmPay = NaN;
  let adminPay = NaN;
  let code: string | null = null;

  await test.step('1. เข้าสู่ระบบ U08 แล้วเปิดหน้าจอง นับหน้าจอเริ่มที่ 1', async () => {
    await app.login(page, 'U08');
    await booking.open();
  });

  await test.step('2. ดูรายการเมนูบนหน้าจอ 1 แล้วเลือก S01 1 คน', async () => {
    const menu: [string, number, number][] = [
      ['S01', 60, 1000], ['S02', 90, 1400], ['S03', 60, 1200], ['S04', 90, 2000],
      ['S05', 60, 800], ['S06', 60, 1500], ['S07', 60, 1800], ['P01', 120, 2900],
    ];
    for (const [id, minutes, price] of menu) {
      await app.check(booking.el(`booking-service-${id}`), `เมนู ${id} ${minutes} นาที ฿${price.toLocaleString('en-US')}`, async (el) => {
        const text = await el.innerText({ timeout: 3_000 }).catch(() => '');
        expect.soft(durationOf(text), `${id} นาที`).toBe(minutes);
        expect.soft(lineAmount(text), `${id} ราคา`).toBe(price);
      });
    }
    await markScreen();
    await booking.chooseService('S01', 1);
    await booking.nextFromStep1();
  });

  await test.step('3. เลือก 17 มิ.ย. รอบ 20:00 นักบำบัด T01', async () => {
    await markScreen();
    await booking.chooseDate(D17);
    await booking.chooseTherapist('T01');
    await booking.chooseSlot('20:00');
    await booking.nextFromStep2();
  });

  await test.step('4. จดยอดในหน้าสรุป โดยไม่แลกแต้ม', async () => {
    await markScreen();
    const lines = await booking.lines();
    summaryPay = lines.pay;
    await app.check(booking.el('booking-pay-at-shop'), 'หน้าสรุป ราคาเต็ม ฿1,000 ส่วนลด ฿50 ยอด ฿950', async () => {
      expect.soft(lines.full).toBe(1000);
      expect.soft(lines.discount).toBe(50);
      expect.soft(lines.points).toBe(0);
      expect.soft(lines.pay).toBe(950);
    });
  });

  await test.step('5. กดยืนยัน จดรหัสจองและยอดในหน้ายืนยัน', async () => {
    const res = await booking.confirm();
    code = res.code;
    await app.check(booking.el('booking-code'), 'หน้ายืนยันมีรหัสจอง', async (el) => {
      await expect.soft(el).toBeVisible();
      await expect.soft(el).not.toHaveText('');
    });
    confirmPay = await safePay(booking);
    await app.check(booking.el('booking-pay-at-shop'), 'ยอดหน้ายืนยัน ฿950', async () => {
      expect.soft(confirmPay).toBe(950);
    });
    await app.checkValue(page, 'นับหน้าจอจากเลือกบริการถึงยืนยัน ไม่เกิน 3', [...screens], (v) => {
      expect.soft(v.length).toBeLessThanOrEqual(3);
      expect.soft(v.length).toBeGreaterThan(0);
    });
  });

  await test.step('6. เข้า owner ที่ /th/admin ค้นการจองตามรหัส แล้วรีโหลด', async () => {
    const admin = await app.admin();
    await admin.open(D17);
    const readRow = async (when: string) => {
      if (!code) {
        await app.check(admin.page.getByTestId('admin-page'), `${when} ไม่มีรหัสจองให้ค้น`, async () => {
          expect.soft(code, 'ต้องได้รหัสจองจากหน้ายืนยัน').not.toBeNull();
        });
        return;
      }
      const row = admin.row(code);
      await app.check(row, `${when} หลังร้าน S01 · T01 · 17 มิ.ย. 20:00–21:00 ยอด ฿950 รหัส ${code}`, async () => {
        await expect.soft(row).toHaveCount(1);
        await expect.soft(admin.time(code!)).toHaveText('20:00–21:00');
        await expect.soft(admin.service(code!)).toContainText(S01_NAME);
        await expect.soft(admin.therapists(code!)).toHaveText(NAME.T01);
        adminPay = lineAmount(await admin.pay(code!).innerText({ timeout: 2_000 }).catch(() => ''));
        expect.soft(adminPay).toBe(950);
      });
    };
    await readRow('ทันที');
    await reloadAdmin(app, admin, D17);
    await readRow('หลังรีโหลด');
  });

  await test.step('7. กลับบัญชี U08 ดูแต้มและประวัติผ่าน account-history-link', async () => {
    const account = await app.readAccount(page);
    await app.check(page.getByTestId('account-points'), 'แต้ม U08 ยังเป็น 101', async () => {
      expect.soft(account.points).toBe(101);
    });
    const link = page.getByTestId('account-history-link');
    await app.check(link, 'มีลิงก์ประวัติ', async (el) => { await expect.soft(el).toBeVisible(); });
    if (await link.count()) {
      await link.click();
      await page.waitForSelector('html[data-ready="true"]');
      await settle(page);
    }
    await app.check(page.getByTestId('history-page'), 'เปิดหน้าประวัติได้', async (el) => { await expect.soft(el).toBeVisible(); });
    await app.checkValue(page, 'ยอด หน้าสรุป = หน้ายืนยัน = หลังร้าน = ฿950', { summaryPay, confirmPay, adminPay }, (v) => {
      expect.soft(v).toEqual({ summaryPay: 950, confirmPay: 950, adminPay: 950 });
    });
  });
});

test('TC-BOOK-02 รอบเริ่ม 10:00 ห่าง 30 นาที จบไม่เกิน 22:00 ทั้งรายการรอบและยิงตรง', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'S01: 09:30 ✗ · 10:00 ✓ · 10:15 ✗ · 10:30 ✓ · 20:30 ✓ · 21:00 ✓ (21:00 + 60 นาที = 22:00) · 21:30 ✗ (21:30 + 60 นาที = 22:30)\nS02: 20:00 ✓ · 20:30 ✓ (20:30 + 90 นาที = 22:00) · 21:00 ✗ (21:00 + 90 นาที = 22:30)\nP01: 19:30 ✓ · 20:00 ✓ (20:00 + 120 นาที = 22:00) · 20:30 ✗ (20:30 + 120 นาที = 22:30)\nS04: 20:30 ✓ · 21:00 ✗\nK01: 21:00 ✓ · 21:30 ✗\nS03, S05, S06, S07: 21:00 ✓ · 21:30 ✗\nรอบ ✗ ไม่อยู่ในรายการรอบ · ยิงตรง 3 ค่าถูกปฏิเสธด้วยสถานะ 4xx\nค่าควบคุม 10:00 สำเร็จ 2xx · หลังร้านมีการจอง 17 มิ.ย. 1 รายการ คือ 10:00',
    source: '[D] บ.9 · [D] §1 นาที · [R] E05–E18',
    frbr: 'FR-02, BR-01, BR-02',
    rules: 'R01, R03',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(6 * 60_000);
  const guest = guestBody('0890000101', 'ทดสอบรอบ');
  let captured!: CapturedRequest;

  await test.step('1. ในฐานะแขก เลือกแต่ละบริการและวันที่ 17 มิ.ย. แล้วจดรายการรอบ', async () => {
    const table: [string, string[], string[]][] = [
      ['S01', ['10:00', '10:30', '20:30', '21:00'], ['09:30', '10:15', '21:30']],
      ['S02', ['20:00', '20:30'], ['21:00']],
      ['P01', ['19:30', '20:00'], ['20:30']],
      ['S04', ['20:30'], ['21:00']],
      ['S03', ['21:00'], ['21:30']],
      ['S05', ['21:00'], ['21:30']],
      ['S06', ['21:00'], ['21:30']],
      ['S07', ['21:00'], ['21:30']],
    ];
    for (const [service, ok, bad] of table) {
      await toScreen2(booking, service, D17);
      await checkSlots(app, booking, `${service} ✓ ${ok.join(' ')} · ✗ ${bad.join(' ')}`, ok, bad);
    }
  });

  await test.step('2. เข้าสู่ระบบ U01 เลือก K01 ด้วย C01 แล้วจดรอบ 21:00 และ 21:30', async () => {
    await app.login(page, 'U01');
    await booking.open();
    await booking.el('booking-use-course').click();
    await settle(page);
    await booking.nextFromStep1();
    await booking.chooseDate(D17);
    await checkSlots(app, booking, 'K01 ✓ 21:00 · ✗ 21:30', ['21:00'], ['21:30']);
  });

  await test.step('3. ออกจากระบบ U01 แล้วจอง S01 10:00 แบบแขก เพื่อดึงคำขอจาก Network แล้วล็อกและรีเซ็ตใหม่', async () => {
    await app.logout(page);
    const res = await booking.book({ service: 'S01', date: D17, time: '10:00', therapist: 'T01', guest: guest.guest });
    captured = res.request;
    await app.lockAndReset(LOCK);
  });

  const admin = await freshAdmin(app);
  await test.step('4. ยิงแบบแขก: S01 รอบ 09:30, 10:15, 21:30 แล้วปิดด้วยค่าควบคุม 10:00', async () => {
    await adminCount(app, admin, D17, 0, 'ก่อนยิง');
    const api = await app.guestApi();
    for (const time of ['09:30', '10:15', '21:30']) {
      const res = await app.replay(api, captured, { date: D17, time, ...guest });
      await checkRejected(app, page, `ยิงตรง S01 ${time} ถูกปฏิเสธ 4xx`, res);
    }
    await adminCount(app, admin, D17, 0, 'หลังยิงรอบผิด');
    const control = await app.replay(api, captured, { date: D17, time: '10:00', ...guest });
    await checkAccepted(app, page, 'ค่าควบคุม 10:00 สำเร็จ 2xx', control);
  });

  await test.step('5. เข้า /th/admin นับการจองวันที่ 17 มิ.ย. แล้วรีโหลด', async () => {
    await adminCount(app, admin, D17, 1, 'หลังยิงทั้งหมด');
    const rows = await adminCountAfterReload(app, admin, D17, 1);
    await app.checkValue(page, 'หลังร้าน 17 มิ.ย. มี 1 รายการ คือ 10:00', rows.map((r) => r.time), (v) => {
      expect.soft(v).toEqual(['10:00–11:00']);
    });
  });
});

test('TC-BOOK-03 ช่วงวันจองคือพรุ่งนี้ถึงวันนี้ + 30 ทั้งหน้าจอและยิงตรง', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: '15 มิ.ย. (วันนี้ + 0): หน้าจอ ✗ แจ้งว่าจองในเว็บไม่ได้ และให้โทร 02-123-4567 · ยิงตรงถูกปฏิเสธด้วยสถานะ 4xx\n16 มิ.ย. (วันนี้ + 1): หน้าจอเห็นรอบ 12:00 · ยิงตรงจองได้\n15 ก.ค. (วันนี้ + 30): หน้าจอเห็นรอบ 12:00 เป็นวันสุดท้าย · ยิงตรงจองได้\n16 ก.ค. (วันนี้ + 31): หน้าจอเลือกไม่ได้ · ยิงตรงถูกปฏิเสธด้วยสถานะ 4xx\n(ถ้านับวันคลาด 1 วัน จะเห็น 15 ก.ค. ✗ หรือ 16 ก.ค. ✓)\n14 มิ.ย. (อดีต): ยิงตรงถูกปฏิเสธด้วยสถานะ 4xx · หลังร้าน 0 รายการ (ย้ายจาก TC-BOOK-04 เพื่อคงการตรวจนี้ไว้ที่ P1)\nจำนวนการจองหลังยิง: 15 มิ.ย. 2 รายการ · 16 มิ.ย. 2 รายการ (B07 + รายการใหม่) · 15 ก.ค. 1 รายการ · 16 ก.ค. 0 รายการ',
    source: '[D] บ.11 · [R] ⚠️A-07 · [R] E19–E24',
    frbr: 'FR-03, FR-04, BR-03, BR-04',
    rules: 'R04',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const guest = guestBody('0890000201', 'ทดสอบวันจอง');
  let captured!: CapturedRequest;

  await test.step('1. เลือก S01 แล้วพิมพ์วันที่ทั้ง 4 วันทีละวัน จดผลของแต่ละวัน', async () => {
    await toScreen2(booking, 'S01', D15);
    await tryTherapist(booking, 'T01');
    await settle(page);
    await app.check(booking.el('error-same-day-call'), '15 มิ.ย. แจ้งจองในเว็บไม่ได้ ให้โทร 02-123-4567', async (el) => {
      await expect.soft(el).toContainText(/ในเว็บไม่ได้/);
      await expect.soft(el).toContainText(SHOP_PHONE);
    });
    await checkSlots(app, booking, '15 มิ.ย. ไม่มีรอบ 12:00', [], ['12:00']);

    await booking.chooseDate(D16);
    await tryTherapist(booking, 'T01');
    await checkSlots(app, booking, '16 มิ.ย. เห็นรอบ 12:00', ['12:00'], []);

    await booking.chooseDate(JUL15);
    await tryTherapist(booking, 'T01');
    await checkSlots(app, booking, '15 ก.ค. เห็นรอบ 12:00', ['12:00'], []);
    await app.check(booking.el('booking-date-range'), '15 ก.ค. เป็นวันสุดท้าย', async (el) => {
      await expect.soft(el).toContainText('15 ก.ค. 2026');
    });

    await booking.chooseDate(JUL16);
    await tryTherapist(booking, 'T01');
    await checkSlots(app, booking, '16 ก.ค. เลือกไม่ได้ ไม่มีรอบ 12:00', [], ['12:00']);
  });

  await test.step('2. จองวันที่ถูกต้อง 1 ครั้งบนหน้าเว็บ เพื่อดึงคำขอจาก Network แล้วล็อกและรีเซ็ตใหม่', async () => {
    const res = await booking.book({ service: 'S01', date: D16, time: '12:00', therapist: 'T01', guest: guest.guest });
    captured = res.request;
    await app.lockAndReset(LOCK);
  });

  const admin = await freshAdmin(app);
  await test.step('3. นับการจองของ 15 มิ.ย. และ 16 ก.ค. ในหลังร้าน', async () => {
    await adminCount(app, admin, D15, 2, 'ก่อนยิง');
    await adminCount(app, admin, JUL16, 0, 'ก่อนยิง');
  });

  await test.step('4. ยิงซ้ำครบ 4 วัน และวันอดีต 14 มิ.ย. รอบ 12:00', async () => {
    const api = await app.guestApi();
    const fire = (date: string) => app.replay(api, captured, { date, time: '12:00', ...guest });
    await checkRejected(app, page, 'ยิงตรง 15 มิ.ย. ถูกปฏิเสธ 4xx', await fire(D15));
    await checkAccepted(app, page, 'ยิงตรง 16 มิ.ย. จองได้', await fire(D16));
    await checkAccepted(app, page, 'ยิงตรง 15 ก.ค. จองได้', await fire(JUL15));
    await checkRejected(app, page, 'ยิงตรง 16 ก.ค. ถูกปฏิเสธ 4xx', await fire(JUL16));
    await checkRejected(app, page, 'ยิงตรง 14 มิ.ย. ถูกปฏิเสธ 4xx', await fire(D14));
  });

  await test.step('5. รีโหลดหลังร้าน แล้วนับการจองของทั้ง 4 วัน', async () => {
    const counts: Record<string, number> = {};
    for (const [date, n] of [[D14, 0], [D15, 2], [D16, 2], [JUL15, 1], [JUL16, 0]] as [string, number][]) {
      await adminCount(app, admin, date, n, 'หลังยิง');
      counts[date] = (await adminCountAfterReload(app, admin, date, n)).length;
    }
    await app.checkValue(page, 'จำนวนการจอง 14 มิ.ย. 0 · 15 มิ.ย. 2 · 16 มิ.ย. 2 · 15 ก.ค. 1 · 16 ก.ค. 0', counts, (v) => {
      expect.soft(v).toEqual({ [D14]: 0, [D15]: 2, [D16]: 2, [JUL15]: 1, [JUL16]: 0 });
    });
  });
});

test('TC-BOOK-04 /api/quote ไม่ให้ราคารอบที่ไม่มีจริง และวันอดีตไม่บอกว่าเป็น "วันนี้"', {
  tag: ['@P2', '@5.1'],
  annotation: plan({
    expected: 'quote 10:00 (ค่าเปรียบเทียบ): ได้ราคา ฿1,000\nquote 09:30 และ 10:15: ถูกปฏิเสธด้วยสถานะ 4xx และคำตอบไม่มีราคา ฿1,000 (ถ้าไม่ตรวจรอบจะได้ 200 พร้อม ฿1,000)\n14 มิ.ย. บนหน้าจอ quote และคำขอจอง: ถูกปฏิเสธทั้ง 3 ทาง ด้วยสถานะ 4xx ในทาง API\nข้อความของ 14 มิ.ย. ทั้ง 3 ทางไม่มีคำว่า "วันนี้" (คำตอบผิดที่คาดไว้: "จองวันนี้ในเว็บไม่ได้")\nหลังร้านมีการจองวันที่ 14 มิ.ย. 0 รายการ และ 17 มิ.ย. 0 รายการ',
    source: '[R] R02 · F-สร้าง 3 · [R] R05 · F-ร้าน 1 · F-สร้าง 1',
    frbr: 'FR-02, FR-03, BR-01, BR-03',
    rules: 'R02, R05',
    technique: 'Negative, Boundary',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const guest = guestBody('0890000251', 'ทดสอบวันอดีต');
  let quoteReq!: CapturedRequest;
  let bookReq!: CapturedRequest;
  const hasFullPrice = (text: string) => /\b1000\b|1,000/.test(text);

  await test.step('1. จองแบบแขก 17 มิ.ย. 10:00 เพื่อดึงคำขอ quote และคำขอจอง ยืนยันว่าสำเร็จ 2xx แล้วล็อกและรีเซ็ตใหม่', async () => {
    await toScreen2(booking, 'S01', D17);
    await booking.chooseTherapist('T01');
    quoteReq = await app.capture(page, /\/api\/quote$/, async () => {
      await booking.chooseSlot('10:00');
      await booking.nextFromStep2();
    });
    await booking.guest(guest.guest.name, guest.guest.phone);
    const res = await booking.confirm();
    bookReq = res.request;
    await app.checkValue(page, 'ค่าควบคุม จองแขก 17 มิ.ย. 10:00 สำเร็จ 2xx', bookReq.responseStatus, (v) => {
      expect.soft(v).toBeGreaterThanOrEqual(200);
      expect.soft(v).toBeLessThan(300);
    });
    await app.lockAndReset(LOCK);
  });

  const api = await app.guestApi();
  await test.step('2. ยิง /api/quote ที่ 17 มิ.ย. รอบ 10:00, 09:30, 10:15', async () => {
    const ok = await app.replay(api, quoteReq, { date: D17, time: '10:00' });
    await app.checkValue(page, 'quote 10:00 ได้ราคา ฿1,000', { status: ok.status, fullPrice: ok.body?.lines?.fullPrice ?? null }, (v) => {
      expect.soft(v.status).toBe(200);
      expect.soft(v.fullPrice).toBe(1000);
    });
    for (const time of ['09:30', '10:15']) {
      const res = await app.replay(api, quoteReq, { date: D17, time });
      await checkRejected(app, page, `quote ${time} ถูกปฏิเสธ 4xx`, res);
      await app.checkValue(page, `คำตอบ quote ${time} ไม่มีราคา ฿1,000`, res.text, (v) => {
        expect.soft(hasFullPrice(v)).toBe(false);
      });
    }
  });

  await test.step('3. บนหน้าจอพิมพ์วันที่ 14 มิ.ย. จดข้อความ', async () => {
    await toScreen2(booking, 'S01', D14);
    await checkSlots(app, booking, '14 มิ.ย. บนหน้าจอไม่มีรอบ 12:00', [], ['12:00']);
    const errors = page.locator('[data-testid^="error-"]');
    await app.check(errors, 'ข้อความ 14 มิ.ย. บนหน้าจอถูกปฏิเสธและไม่มีคำว่า "วันนี้"', async (el) => {
      await expect.soft(el.first()).toBeVisible();
      await expect.soft(el.first()).not.toContainText('วันนี้');
    });
    const text = await errors.first().innerText({ timeout: 1_000 }).catch(() => '');
    test.info().annotations.push({ type: 'pending-answer', description: `F-ร้าน 1: ข้อความวันอดีตจะให้โทรร้านหรือไม่ รอคำตอบ · ผลจริงบนหน้าจอ: ${text}` });
    await app.checkValue(page, 'รอคำตอบ F-ร้าน 1: ข้อความวันอดีตให้โทรร้านหรือไม่ (ไม่นับเป็นข้อล้ม)', text, () => {});
  });

  await test.step('4. ยิง /api/quote และคำขอจองที่ 14 มิ.ย. รอบ 12:00 โดยส่ง x-locale: th จดข้อความ', async () => {
    const quote = await app.replay(api, quoteReq, { date: D14, time: '12:00' }, { locale: 'th' });
    await checkRejected(app, page, 'quote 14 มิ.ย. ถูกปฏิเสธ 4xx', quote);
    await app.checkValue(page, 'ข้อความ quote 14 มิ.ย. ไม่มีคำว่า "วันนี้"', quote.text, (v) => {
      expect.soft(v).not.toContain('วันนี้');
    });
    const made = await app.replay(api, bookReq, { date: D14, time: '12:00', ...guest }, { locale: 'th' });
    await checkRejected(app, page, 'คำขอจอง 14 มิ.ย. ถูกปฏิเสธ 4xx', made);
    await app.checkValue(page, 'ข้อความคำขอจอง 14 มิ.ย. ไม่มีคำว่า "วันนี้"', made.text, (v) => {
      expect.soft(v).not.toContain('วันนี้');
    });
  });

  await test.step('5. เข้า /th/admin นับการจองวันที่ 14 และ 17 มิ.ย. แล้วรีโหลด', async () => {
    const admin = await freshAdmin(app);
    await adminCount(app, admin, D14, 0);
    await adminCountAfterReload(app, admin, D14, 0);
    await adminCount(app, admin, D17, 0);
    const rows = await adminCountAfterReload(app, admin, D17, 0);
    await app.checkValue(page, 'หลังร้าน 17 มิ.ย. 0 รายการ (14 มิ.ย. ตรวจแล้วด้านบน)', rows.length, (v) => {
      expect.soft(v).toBe(0);
    });
  });
});

test('TC-BOOK-05 จองซ้อนนักบำบัดไม่ได้ ทั้งขอบคิว คำขอพร้อมกัน และค้างหน้า ส่วนพัก 0 นาทีจองได้', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: '13:00 ✓ จบ 14:00 พอดี · 13:30 ✗ (คาบ 14:00–14:30) · 14:00 ✗ HTTP 409 "เวลานี้ถูกจองแล้ว" · 14:30 ✗ (คาบ 14:30–15:00) · 15:00 ✓ พัก 0 นาที · 15:30 ✓\nหน้าจอไม่แสดงรอบ 13:30, 14:00, 14:30 ของ T01 · 13:30 และ 14:30 ที่ยิงตรงถูกปฏิเสธด้วยสถานะ 4xx\nหลังแถว ✗ ทุกแถว: T01 วันนั้นมี 1 คิว คือ B10 14:00–15:00 เวลาเดิม\nคำขอพร้อมกัน 5 รายการ: สำเร็จ 1 · ได้ 409 4 รายการ · T01 มี 2 คิว (B10 + 16:00)\nบริบท A: ขึ้น "เวลานี้ถูกจองแล้ว" · T01 มี 2 คิว (B10 + 15:00 ของบริบท B)',
    source: '[D] §2 · [D] บ.10 · [R] E25–E30',
    frbr: 'FR-06, BR-05',
    rules: 'R06, R07',
    technique: 'Boundary, Negative, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(8 * 60_000);
  let captured!: CapturedRequest;
  const fire = (ctx: Parameters<App['replay']>[0], time: string, phone: string) =>
    app.replay(ctx, captured, { date: D22, time, ...guestBody(phone) });

  await test.step('1. เลือก S01 T01 22 มิ.ย. จดรายการรอบ', async () => {
    await toScreen2(booking, 'S01', D22);
    await booking.chooseTherapist('T01');
    await checkSlots(app, booking, 'T01 22 มิ.ย. ✓ 13:00 15:00 15:30 · ✗ 13:30 14:00 14:30', ['13:00', '15:00', '15:30'], ['13:30', '14:00', '14:30']);
  });

  await test.step('2. จองรอบ 15:00 บนหน้าเว็บ เพื่อดึงคำขอจาก Network แล้วล็อกและรีเซ็ตใหม่', async () => {
    const res = await booking.book({ service: 'S01', date: D22, time: '15:00', therapist: 'T01', guest: guestBody('0890000301').guest });
    captured = res.request;
    await app.lockAndReset(LOCK);
  });

  await test.step('3. ยิงแถว ✗ ตามลำดับ 13:30, 14:00, 14:30 นับคิว T01 แล้วล็อกและรีเซ็ตก่อนแถว ✓ แต่ละแถว', async () => {
    let admin = await freshAdmin(app);
    await adminCount(app, admin, D22, 1, 'ก่อนยิงแถว ✗');
    const api = await app.guestApi();
    await checkRejected(app, page, 'ยิงตรง 13:30 ถูกปฏิเสธ 4xx', await fire(api, '13:30', '0890000302'));
    const at14 = await fire(api, '14:00', '0890000303');
    await app.checkValue(page, '14:00 ✗ HTTP 409 "เวลานี้ถูกจองแล้ว"', { status: at14.status, message: at14.body?.error?.message ?? null }, (v) => {
      expect.soft(v.status).toBe(409);
      expect.soft(v.message).toBe(SLOT_TAKEN);
    });
    await checkRejected(app, page, 'ยิงตรง 14:30 ถูกปฏิเสธ 4xx', await fire(api, '14:30', '0890000304'));
    const rows = await adminCount(app, admin, D22, 1, 'หลังยิงแถว ✗');
    await app.checkValue(page, 'หลังแถว ✗ T01 มี 1 คิว คือ B10 14:00–15:00', rows.map((r) => ({ code: r.code, time: r.time, t01: r.therapists.includes(NAME.T01) })), (v) => {
      expect.soft(v).toEqual([{ code: B10, time: '14:00–15:00', t01: true }]);
    });

    const okRows: [string, string, string][] = [
      ['13:00', '0890000305', '13:00–14:00'],
      ['15:00', '0890000306', '15:00–16:00'],
      ['15:30', '0890000307', '15:30–16:30'],
    ];
    for (const [time, phone, range] of okRows) {
      await app.lockAndReset(LOCK);
      admin = await freshAdmin(app);
      const res = await fire(await app.guestApi(), time, phone);
      await checkAccepted(app, page, `ยิงตรง ${time} จองได้ 2xx`, res);
      const after = await adminCount(app, admin, D22, 2, `หลังจอง ${time}`);
      await app.checkValue(page, `T01 มี B10 และ ${range}`, t01Times(after), (v) => {
        expect.soft(v).toEqual(['14:00–15:00', range].sort());
      });
    }
  });

  await test.step('4. ล็อกและรีเซ็ต แล้วส่ง 5 คำขอพร้อมกันที่ 16:00 แล้วนับคิว T01', async () => {
    await app.lockAndReset(LOCK);
    const admin = await freshAdmin(app);
    const api = await app.guestApi();
    const phones = ['0890000308', '0890000309', '0890000310', '0890000311', '0890000312'];
    const results = await Promise.all(phones.map((p) => fire(api, '16:00', p)));
    const statuses = results.map((r) => r.status);
    await app.checkValue(page, 'พร้อมกัน 5 คำขอ: สำเร็จ 1 · ได้ 409 4 รายการ', statuses, (v) => {
      expect.soft(v.filter((s) => s >= 200 && s < 300).length).toBe(1);
      expect.soft(v.filter((s) => s === 409).length).toBe(4);
    });
    const rows = await adminCount(app, admin, D22, 2, 'หลังส่งพร้อมกัน');
    await app.checkValue(page, 'T01 มี 2 คิว (B10 + 16:00)', t01Times(rows), (v) => {
      expect.soft(v).toEqual(['14:00–15:00', '16:00–17:00']);
    });
  });

  await test.step('5. เปิด 2 บริบทถึงหน้าสรุป 15:00 บริบท B ยืนยันก่อน แล้วบริบท A ยืนยัน แล้วนับคิว T01', async () => {
    await app.lockAndReset(LOCK);
    const admin = await freshAdmin(app);
    const contextB = await app.actor('บริบท B');
    const bookingB = new BookingHelper(app, contextB.page);
    const summary = { service: 'S01', date: D22, time: '15:00', therapist: 'T01' };
    await booking.toSummary(summary);
    await booking.guest('คุณทดสอบ', '0890000314');
    await bookingB.toSummary(summary);
    await bookingB.guest('คุณทดสอบ', '0890000313');
    const b = await bookingB.confirm();
    await app.check(bookingB.el('booking-code'), 'บริบท B จองสำเร็จ', async (el) => { await expect.soft(el).toBeVisible(); });
    const a = await booking.confirm();
    await app.check(booking.el('booking-flow'), 'บริบท A ขึ้น "เวลานี้ถูกจองแล้ว"', async (el) => {
      await expect.soft(el).toContainText(SLOT_TAKEN);
    });
    await adminCount(app, admin, D22, 2, 'หลังบริบท A ยืนยัน');
    const rows = await adminCountAfterReload(app, admin, D22, 2);
    await app.checkValue(page, 'บริบท A ถูกปฏิเสธ · T01 มี 2 คิว (B10 + 15:00 ของบริบท B)', {
      a: a.code,
      times: t01Times(rows),
      hasB: b.code ? rows.some((r) => r.code === b.code) : false,
    }, (v) => {
      expect.soft(v.a).toBeNull();
      expect.soft(v.times).toEqual(['14:00–15:00', '15:00–16:00']);
      expect.soft(v.hasB).toBe(true);
    });
  });
});

test('TC-BOOK-06 ดับเบิลคลิกปุ่มยืนยันต้องเกิดการจองเดียว ทั้งเลือกนักบำบัดและใครก็ได้', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'แต่ละแถวมีคำขอจองที่สำเร็จ 1 ครั้ง และเห็นหน้ายืนยันพร้อมรหัสจอง 1 รหัส ไม่ขึ้น "เวลานี้ถูกจองแล้ว" จากคลิกที่ 2\nหลังร้าน: U08 วันที่ 17 มิ.ย. มี 2 รายการ คือ T01 12:00–13:00 ฿950 และ T01 13:00–14:00 ฿950 (฿1,000 − 5% (฿50) = ฿950 · ใครก็ได้ได้ T01 เพราะคะแนนสูงสุดและว่าง)\nถ้าเกิดคิวซ้ำจะเห็นรายการที่ 3 ของ T05 13:00 ยอดรวมของ U08 จะเพิ่มอีก ฿950',
    source: '[R] R93 · [D] บ.10',
    frbr: 'FR-05, FR-06, FR-08, BR-21',
    rules: 'R93',
    technique: 'State, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const postStatuses: number[] = [];
  const onResponse = (r: PwResponse) => {
    if (r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/bookings') postStatuses.push(r.status());
  };
  page.on('response', onResponse);

  const doubleClickRow = async (rowName: string, therapist: string, time: string) => {
    postStatuses.length = 0;
    await booking.toSummary({ service: 'S01', date: D17, time, therapist });
    await app.clickTwice(booking.confirmButton());
    await booking.el('booking-code').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await settle(page);
    await app.checkValue(page, `แถว ${rowName} คำขอจองสำเร็จ 1 ครั้ง`, [...postStatuses], (v) => {
      expect.soft(v.filter((s) => s >= 200 && s < 300).length).toBe(1);
    });
    await app.check(booking.el('booking-flow'), `แถว ${rowName} หน้ายืนยันมีรหัสจอง 1 รหัส ไม่ขึ้นเวลานี้ถูกจองแล้ว`, async (el) => {
      await expect.soft(el.getByTestId('booking-code')).toHaveCount(1);
      await expect.soft(el).not.toContainText(SLOT_TAKEN);
    });
  };

  await test.step('1. เข้าสู่ระบบ U08 ไปถึงหน้าสรุปของแถว A', async () => {
    await app.login(page, 'U08');
  });
  await test.step('2-3. ดับเบิลคลิกปุ่มยืนยันแถว A นับคำขอ จดข้อความและรหัสจอง', async () => {
    await doubleClickRow('A', 'T01', '12:00');
  });
  await test.step('4. ทำซ้ำกับแถว B (ใครก็ได้ รอบ 13:00)', async () => {
    await doubleClickRow('B', 'any', '13:00');
  });

  await test.step('5. เข้า /th/admin นับการจองของ U08 วันที่ 17 มิ.ย. แล้วรีโหลด', async () => {
    const admin = await app.admin();
    const view = (rows: AdminRow[]) => rows
      .filter((r) => r.customer.includes(USERS.U08.name))
      .map((r) => ({ time: r.time, therapist: r.therapists, pay: r.pay }))
      .sort((x, y) => x.time.localeCompare(y.time));
    const expected = [
      { time: '12:00–13:00', therapist: NAME.T01, pay: 950 },
      { time: '13:00–14:00', therapist: NAME.T01, pay: 950 },
    ];
    await app.checkValue(page, 'ทันที U08 มี 2 รายการ T01 12:00 และ 13:00 ยอดละ ฿950', view(await adminCount(app, admin, D17, 2)), (v) => {
      expect.soft(v).toEqual(expected);
    });
    const rows = await adminCountAfterReload(app, admin, D17, 2);
    await app.checkValue(page, 'หลังรีโหลด U08 มี 2 รายการ T01 12:00 และ 13:00 ยอดละ ฿950', view(rows), (v) => {
      expect.soft(v).toEqual(expected);
    });
  });
  page.off('response', onResponse);
});

test('TC-BOOK-07 รายชื่อนักบำบัดเฉพาะคนทำบริการได้ และใครก็ได้เลือกคนว่างคะแนนสูงสุด', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'S07: แสดง T04, T05 เท่านั้น · ไม่มีน้องบัว\nS01 ว่างทุกคน → T01 (5.0)\nS01 22 มิ.ย. 14:00 → T05 (4.6) (ถ้าไม่ตรวจคิวจะได้ T01 ที่ติด B10)\nS06 17 มิ.ย. 14:00 → T03 (4.4) ก่อน T04 ที่ไม่มีรีวิว\nS06 24 มิ.ย. 12:00 → T04 คนเดียวที่เหลือ\nS06 + T01 ถูกปฏิเสธด้วยสถานะ 4xx · หลังร้านมีนัด S06 วันที่ 17 มิ.ย. 1 รายการ คือ T03 14:00 ไม่มี T01',
    source: '[D] §2 · [D] §4 จองคิว · [R] ⚠️A-06 · [R] E232–E235, E237',
    frbr: 'FR-07, FR-08, FR-09, BR-05',
    rules: 'R90',
    technique: 'Happy path, Equivalence partition, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  let captured!: CapturedRequest;
  const made: { code: string | null; date: string; therapist: string }[] = [];

  await test.step('1. เลือก S07 แล้วจดรายชื่อนักบำบัด', async () => {
    await toScreen2(booking, 'S07', D17);
    const ids = await page.locator('[data-testid^="booking-therapist-T"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.testid!).filter((id) => /^booking-therapist-T\d+$/.test(id)).sort());
    await app.check(booking.el('booking-screen-2'), 'S07 แสดง T04, T05 เท่านั้น ไม่มีน้องบัว', async (el) => {
      expect.soft(ids).toEqual(['booking-therapist-T04', 'booking-therapist-T05']);
      await expect.soft(el).not.toContainText('น้องบัว');
    });
  });

  await test.step('2. จองแบบใครก็ได้ทีละแถวบนหน้าเว็บ จดนักบำบัดในหน้ายืนยัน', async () => {
    const table: [string, string, string, string, string][] = [
      ['S01', D17, '12:00', 'T01', '0890000401'],
      ['S01', D22, '14:00', 'T05', '0890000402'],
      ['S06', D17, '14:00', 'T03', '0890000403'],
      ['S06', D24, '12:00', 'T04', '0890000404'],
    ];
    for (const [service, date, time, therapist, phone] of table) {
      const res = await booking.book({ service, date, time, therapist: 'any', guest: guestBody(phone).guest });
      captured = res.request;
      made.push({ code: res.code, date, therapist });
      await app.check(page.locator('[data-testid^="booking-assigned-"]'), `${service} ${date} ${time} → ${therapist}`, async (el) => {
        await expect.soft(el).toHaveCount(1);
        await expect.soft(el.first()).toHaveAttribute('data-testid', `booking-assigned-${therapist}`);
      });
    }
  });

  await test.step('3. ยิงซ้ำเป็น S06 + T01 วันที่ 17 มิ.ย. 16:00', async () => {
    const admin = await app.admin();
    await adminCount(app, admin, D17, 2, 'ก่อนยิง S06 + T01');
    const res = await app.replay(await app.guestApi(), captured, {
      serviceId: 'S06', therapistId: 'T01', date: D17, time: '16:00', ...guestBody('0890000405'),
    });
    await checkRejected(app, page, 'S06 + T01 ถูกปฏิเสธ 4xx', res);
  });

  await test.step('4. เข้า /th/admin ตรวจนักบำบัดของแต่ละรหัสจอง และนัด S06 วันที่ 17 มิ.ย. แล้วรีโหลด', async () => {
    const admin = await app.admin();
    for (const m of made) {
      await admin.open(m.date);
      const code = m.code;
      if (!code) {
        await app.checkValue(page, `แถว ${m.date} ${m.therapist} ต้องได้รหัสจอง`, code, (v) => { expect.soft(v).not.toBeNull(); });
        continue;
      }
      await app.check(admin.row(code), `รหัส ${code} นักบำบัด ${m.therapist}`, async () => {
        await expect.soft(admin.therapists(code)).toHaveText(NAME[m.therapist]);
      });
    }
    await adminCount(app, admin, D17, 2, 'หลังยิง S06 + T01');
    const rows = await adminCountAfterReload(app, admin, D17, 2);
    const s06 = rows.filter((r) => r.service.includes(S06_NAME)).map((r) => ({ therapist: r.therapists, time: r.time }));
    await app.checkValue(page, 'นัด S06 17 มิ.ย. 1 รายการ คือ T03 14:00 ไม่มี T01', s06, (v) => {
      expect.soft(v).toEqual([{ therapist: NAME.T03, time: '14:00–15:00' }]);
    });
  });
});

test('TC-BOOK-08 ใครก็ได้ส่งพร้อมกัน 8 คำขอ ขณะว่าง 6 คน ต้องจองครบ 6 คน', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'ทุกรอบ: สำเร็จ 6 คำขอ · อีก 2 คำขอถูกปฏิเสธด้วยสถานะ 4xx\nหลังร้านมี 6 รายการ รอบ 12:00–13:00 นักบำบัดไม่ซ้ำกัน ครบ T01, T05, T02, T03, T06, T04\n(คำตอบผิดที่คาดไว้: สำเร็จ 4 รายการ และได้ 409 อีก 4 รายการ ทั้งที่ T06, T04 ว่าง)',
    source: '[R] R08 · F-สร้าง 2 · [R] ⚠️A-06',
    frbr: 'FR-08, BR-05, BR-11',
    rules: 'R08',
    technique: 'State, Boundary',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(6 * 60_000);
  let captured!: CapturedRequest;
  const phones = ['0890000501', '0890000502', '0890000503', '0890000504', '0890000505', '0890000506', '0890000507', '0890000508'];
  const allNames = ['T01', 'T05', 'T02', 'T03', 'T06', 'T04'].map((t) => NAME[t]).sort();

  await test.step('1. จอง S01 ใครก็ได้บนหน้าเว็บ เพื่อดึงคำขอจาก Network', async () => {
    const res = await booking.book({ service: 'S01', date: D17, time: '12:00', therapist: 'any', guest: guestBody(phones[0]).guest });
    captured = res.request;
  });

  for (const round of [1, 2, 3]) {
    await test.step(`2-4. รอบที่ ${round}: ล็อกและรีเซ็ต ส่ง 8 คำขอพร้อมกัน แล้วนับคิวหลังร้าน`, async () => {
      await app.lockAndReset(LOCK);
      const admin = await freshAdmin(app);
      const api = await app.guestApi();
      const results = await Promise.all(phones.map((p) => app.replay(api, captured, { date: D17, time: '12:00', ...guestBody(p) })));
      const summary = results.map((r) => ({
        status: r.status,
        code: r.body?.error?.code ?? null,
        therapists: (r.body?.therapists ?? r.body?.booking?.therapists ?? []).map((t: { id?: string }) => t.id ?? null),
      }));
      await app.checkValue(page, `รอบ ${round} สำเร็จ 6 คำขอ · อีก 2 คำขอ 4xx`, summary, (v) => {
        expect.soft(v.filter((s) => s.status >= 200 && s.status < 300).length).toBe(6);
        expect.soft(v.filter((s) => s.status >= 400 && s.status < 500).length).toBe(2);
      });
      await adminCount(app, admin, D17, 6, `รอบ ${round}`);
      const rows = await adminCountAfterReload(app, admin, D17, 6);
      await app.checkValue(page, `รอบ ${round} หลังร้าน 6 รายการ 12:00–13:00 นักบำบัดครบ T01, T05, T02, T03, T06, T04`, {
        times: [...new Set(rows.map((r) => r.time))],
        therapists: rows.map((r) => r.therapists).sort(),
      }, (v) => {
        expect.soft(v.times).toEqual(['12:00–13:00']);
        expect.soft(v.therapists).toEqual(allNames);
      });
    });
  }
});

test('TC-BOOK-09 แขกจองด้วยชื่อและเบอร์ 9–10 หลัก ไม่ได้ส่วนลด ฟอร์มผิดจองไม่ได้', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'ชื่อว่าง เบอร์ว่าง 8 หลัก 11 หลัก: มีข้อความแจ้งให้แก้ชื่อหรือเบอร์ · ยังอยู่หน้าสรุป · การจองวันที่ 17 มิ.ย. 0 รายการ\nเบอร์ 9 และ 10 หลัก: หน้ายืนยันแสดงรหัสจองและลิงก์ยกเลิก\nยอดหน้ายืนยัน = หลังร้าน = ฿1,000 ต่อการจอง (ไม่ลด เพราะแขกไม่มีส่วนลดสมาชิก · ถ้าได้ส่วนลด Gold จะเห็น ฿950)\nหลังร้าน: 17 มิ.ย. มี 2 รายการ ชื่อ ทดสอบแขก เบอร์ 021111111 และ 0890000601 ตรงตามที่กรอก',
    source: '[D] §4 จองคิว · [R] R92',
    frbr: 'FR-05, FR-10',
    rules: 'R92',
    technique: 'Happy path, Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const NAME_OK = 'ทดสอบแขก';
  const codes: { code: string | null; phone: string; pay: number }[] = [];

  await test.step('1. เปิดหน้าจอง เลือก S01 T01 17 มิ.ย. รอบ 12:00 ไปถึงหน้าสรุป', async () => {
    await booking.toSummary({ service: 'S01', date: D17, time: '12:00', therapist: 'T01' });
  });

  await test.step('2. ลองกดยืนยันด้วยชื่อว่าง เบอร์ว่าง 8 หลัก และ 11 หลัก ทีละค่า', async () => {
    const bad: [string, string, string][] = [
      ['ชื่อว่าง', '', '0890000602'],
      ['เบอร์ว่าง', NAME_OK, ''],
      ['เบอร์ 8 หลัก', NAME_OK, '12345678'],
      ['เบอร์ 11 หลัก', NAME_OK, '08900006011'],
    ];
    for (const [label, name, phone] of bad) {
      await booking.guest(name, phone);
      const button = booking.confirmButton();
      if (await button.isEnabled().catch(() => false)) await button.click();
      await settle(page);
      await app.check(booking.el('booking-screen-3'), `${label}: มีข้อความแจ้งให้แก้ และยังอยู่หน้าสรุป`, async (el) => {
        await expect.soft(el).toBeVisible();
        await expect.soft(page.locator('[data-testid^="error-"]').first()).toContainText(/ชื่อ|เบอร์/);
        await expect.soft(booking.el('booking-code')).toHaveCount(0);
      });
    }
  });

  await test.step('3. ในบริบท B เปิด /th/admin นับการจองวันที่ 17 มิ.ย. โดยบริบท A ยังค้างหน้าสรุป', async () => {
    await adminCount(app, await app.admin(), D17, 0, 'หลังฟอร์มผิดทุกค่า');
  });

  const verifyDone = async (phone: string) => {
    await app.check(booking.el('booking-code'), `เบอร์ ${phone}: หน้ายืนยันแสดงรหัสจอง`, async (el) => {
      await expect.soft(el).toBeVisible();
    });
    await app.check(booking.el('booking-link-cancel'), `เบอร์ ${phone}: มีลิงก์ยกเลิก`, async (el) => {
      await expect.soft(el).toBeVisible();
    });
    const pay = await safePay(booking);
    await app.check(booking.el('booking-pay-at-shop'), `เบอร์ ${phone}: ยอดหน้ายืนยัน ฿1,000`, async () => {
      expect.soft(pay).toBe(1000);
    });
    return pay;
  };

  await test.step('4. กรอกเบอร์ 9 หลักแล้วยืนยัน จดรหัสจอง ยอด และลิงก์ยกเลิก', async () => {
    await booking.guest(NAME_OK, '021111111');
    const res = await booking.confirm();
    codes.push({ code: res.code, phone: '021111111', pay: await verifyDone('021111111') });
  });

  await test.step('5. จองรอบ 13:00 ด้วยเบอร์ 10 หลัก', async () => {
    const res = await booking.book({ service: 'S01', date: D17, time: '13:00', therapist: 'T01', guest: { name: NAME_OK, phone: '0890000601' } });
    codes.push({ code: res.code, phone: '0890000601', pay: await verifyDone('0890000601') });
  });

  await test.step('6. ในหน้าร้าน ค้นทั้ง 2 รหัสจอง แล้วรีโหลด', async () => {
    const admin = await app.admin();
    const expected = codes.map((c) => ({ code: c.code, customer: NAME_OK, phone: c.phone, pay: 1000 }));
    const view = (rows: AdminRow[]) => codes.map((c) => {
      const r = rows.find((x) => x.code === c.code);
      return { code: c.code, customer: r?.customer ?? '', phone: r?.phone ?? '', pay: r?.pay ?? NaN };
    });
    await app.checkValue(page, 'ทันที หลังร้านมี 2 รหัส ชื่อ ทดสอบแขก เบอร์ตามที่กรอก ยอด ฿1,000', view(await adminCount(app, admin, D17, 2)), (v) => {
      for (let i = 0; i < expected.length; i++) {
        expect.soft(v[i].code).not.toBeNull();
        expect.soft(v[i].customer).toContain(expected[i].customer);
        expect.soft(v[i].phone).toBe(expected[i].phone);
        expect.soft(v[i].pay).toBe(expected[i].pay);
      }
    });
    const rows = await adminCountAfterReload(app, admin, D17, 2);
    await app.checkValue(page, 'หลังรีโหลด หลังร้านมี 2 รายการ ยอด ฿1,000 ทั้งหมด = หน้ายืนยัน', { admin: view(rows), confirm: codes.map((c) => c.pay) }, (v) => {
      expect.soft(v.admin.map((r) => r.pay)).toEqual([1000, 1000]);
      expect.soft(v.admin.map((r) => r.phone)).toEqual(['021111111', '0890000601']);
      expect.soft(v.confirm).toEqual([1000, 1000]);
    });
  });
});

test('TC-BOOK-10 รีโหลดหน้าสรุปไม่เสียสิ่งที่เลือก และออกจากระบบกลางทางไม่เจอทางตัน', {
  tag: ['@P1', '@5.1'],
  annotation: plan({
    expected: 'หลังรีโหลด: ยังเป็น S01 · 17 มิ.ย. · 12:00 · T01 · ฿950 (คำตอบผิดที่คาดไว้: กลับหน้าจอ 1 และวัน รอบหาย)\nหลังออกจากระบบ: ไปหน้าเข้าสู่ระบบ หรือเปิดฟอร์มแขกที่มีช่องชื่อและเบอร์ 2 ช่อง (คำตอบผิดที่คาดไว้: ขึ้น "กรุณากรอกชื่อและเบอร์โทร" แต่มีช่องกรอก 0 ช่อง)\nก่อนทำต่อ: การจองวันที่ 17 มิ.ย. 0 รายการ · แต้ม U08 101\nจองต่อเป็นแขก: ยอด ฿1,000 ทั้งหน้าจอและหลังร้าน (ถ้าค้างราคาสมาชิกจะเห็น ฿950) · เข้าสู่ระบบ U08 กลับมา: ยอด ฿950\nจบแล้ว 17 มิ.ย. มี 1 รายการ · แต้ม U08 ยังเป็น 101',
    source: '[R] R56 · F-สร้าง 6 · [R] R57 · F-สร้าง 5',
    frbr: 'FR-05, FR-10, FR-27, BR-21',
    rules: 'R56, R57',
    technique: 'State, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const summary = { service: 'S01', date: D17, time: '12:00', therapist: 'T01' };
  let route: 'login' | 'guest' | 'dead-end' = 'dead-end';

  await test.step('1. เข้าสู่ระบบ U08 ไปถึงหน้าสรุป เห็น ฿950', async () => {
    await app.login(page, 'U08');
    await booking.toSummary(summary);
    const pay = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), 'หน้าสรุป U08 ฿950', async () => {
      expect.soft(pay).toBe(950);
    });
  });

  await test.step('2. รีโหลดหน้า แล้วจดบริการ วัน รอบ นักบำบัด และยอด', async () => {
    await app.reload(page);
    await app.check(booking.el('booking-recap-service'), 'หลังรีโหลด ยังเป็น S01', async (el) => {
      await expect.soft(el).toContainText(S01_NAME);
    });
    await app.check(booking.el('booking-recap-when'), 'หลังรีโหลด ยังเป็น 17 มิ.ย. 12:00', async (el) => {
      await expect.soft(el).toContainText(/17 มิ\.ย\..*12:00/);
    });
    await app.check(booking.el('booking-recap-therapist'), 'หลังรีโหลด ยังเป็น T01', async (el) => {
      await expect.soft(el).toContainText(NAME.T01);
    });
    const pay = await safePay(booking);
    await app.check(booking.el('booking-pay-at-shop'), 'หลังรีโหลด ยอด ฿950', async () => {
      expect.soft(pay).toBe(950);
    });
  });

  await test.step('3. ล็อกและรีเซ็ต ไปถึงหน้าสรุปใหม่โดยไม่รีโหลด แล้วเปิดแท็บที่ 2 กดออกจากระบบ', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U08');
    await booking.toSummary(summary);
    const pay = await booking.pay();
    await app.check(booking.el('booking-pay-at-shop'), 'หน้าสรุปใหม่ U08 ฿950 โดยไม่รีโหลด', async () => {
      expect.soft(pay).toBe(950);
    });
    const tab2 = await page.context().newPage();
    await app.logout(tab2);
    await tab2.close();
    await page.bringToFront();
  });

  await test.step('4. กลับแท็บแรกซึ่งอยู่หน้าสรุป กดยืนยัน นับช่องกรอกบนหน้าจอ', async () => {
    await booking.confirmButton().click();
    await settle(page);
    // เว็บอาจพาไปหน้าเข้าสู่ระบบหลังคำตอบกลับมาแล้ว รอสั้น ๆ ก่อนตัดสินว่าเป็นทางไหน
    await page.waitForURL((url) => url.pathname.endsWith('/login'), { timeout: 1_500 }).catch(() => {});
    await settle(page);
    const onLogin = new URL(page.url()).pathname.endsWith('/login');
    const inputs = await page.locator('[data-testid="booking-guest-name"], [data-testid="booking-guest-phone"]').count();
    route = onLogin ? 'login' : inputs === 2 ? 'guest' : 'dead-end';
    await app.checkValue(page, 'หลังออกจากระบบ: ไปหน้าเข้าสู่ระบบ หรือมีช่องกรอก 2 ช่อง', { url: new URL(page.url()).pathname, inputs, route }, (v) => {
      expect.soft(v.route).not.toBe('dead-end');
    });
  });

  const admin = await freshAdmin(app);
  const pointsActor = await app.actor('U08 ตรวจแต้ม');
  await app.login(pointsActor.page, 'U08');

  await test.step('ก่อนทำต่อ: การจองวันที่ 17 มิ.ย. 0 รายการ · แต้ม U08 101', async () => {
    await adminCount(app, admin, D17, 0, 'ก่อนทำต่อ');
    const account = await app.readAccount(pointsActor.page);
    await app.check(pointsActor.page.getByTestId('account-points'), 'ก่อนทำต่อ แต้ม U08 101', async () => {
      expect.soft(account.points).toBe(101);
    });
  });

  let expectedPay = 1000;
  let code: string | null = null;
  let screenPay = NaN;
  await test.step('5. ทำต่อตามทางที่เว็บเปิดให้ จนจองสำเร็จ', async () => {
    if (route === 'login') {
      expectedPay = 950;
      await page.getByTestId('login-email').fill(USERS.U08.email);
      await page.getByTestId('login-password').fill(USERS.U08.password);
      await page.getByTestId('login-submit').click();
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 });
      await page.waitForSelector('html[data-ready="true"]');
      await settle(page);
      if (!(await booking.el('booking-screen-3').count())) await booking.toSummary(summary);
    } else {
      // ทางตัน: บันทึกข้อล้มแล้วที่ขั้น 4 จึงเริ่มจองแขกใหม่ เพื่อให้จุดตรวจที่เหลือยังทำงาน
      if (route === 'dead-end') await booking.toSummary(summary);
      await booking.guest('ทดสอบแขก', '0890000701');
    }
    let res = await booking.confirm();
    if (!res.code) {
      await booking.quoteReady();
      const button = booking.confirmButton();
      if ((await button.count()) && (await button.isEnabled())) res = await booking.confirm();
    }
    code = res.code;
    screenPay = await safePay(booking);
    await app.check(booking.el('booking-pay-at-shop'), `จองสำเร็จ ยอดบนจอ ฿${expectedPay.toLocaleString('en-US')} (ทาง ${route})`, async () => {
      expect.soft(code, 'ต้องจองสำเร็จและได้รหัสจอง').not.toBeNull();
      expect.soft(screenPay).toBe(expectedPay);
    });
  });

  await test.step('6. เข้า /th/admin นับการจองวันที่ 17 มิ.ย. และตรวจยอด แล้วรีโหลด', async () => {
    await adminCount(app, admin, D17, 1, 'จบแล้ว');
    const rows = await adminCountAfterReload(app, admin, D17, 1);
    const account = await app.readAccount(pointsActor.page);
    await app.check(pointsActor.page.getByTestId('account-points'), 'จบแล้ว แต้ม U08 ยังเป็น 101', async () => {
      expect.soft(account.points).toBe(101);
    });
    await app.checkValue(page, `จบแล้ว 17 มิ.ย. มี 1 รายการ ยอด ฿${expectedPay.toLocaleString('en-US')} ตรงรหัสเดียวกัน`, rows.map((r) => ({ code: r.code, pay: r.pay })), (v) => {
      expect.soft(v).toEqual([{ code, pay: expectedPay }]);
    });
  });
});
