/**
 * 5.2 จองคู่และจองกลุ่ม (TC-GROUP-01 ถึง TC-GROUP-10) ตาม TEST-PLAN.md บรรทัด 374-557
 *
 * หมายเหตุการเลือก 8 คน (TC-GROUP-07): หน้าเว็บมีปุ่มสูงสุด "7+" จึงทดสอบ 8 คนผ่านลิงก์ ?party=8
 */
import { test, expect, plan, LOCK, lineAmount, money, settle, type AdminHelper, type ApiResult, type App, type BookingHelper, type CapturedRequest } from '../fixtures';

// ---------------------------------------------------------------- ข้อมูลจาก TEST-DATA.md

const G = {
  G1: { name: 'คุณทดสอบ หนึ่ง', phone: '0890000001' },
  G2: { name: 'คุณทดสอบ สอง', phone: '0890000002' },
  G3: { name: 'คุณทดสอบ สาม', phone: '0890000003' },
  G4: { name: 'คุณทดสอบ สี่', phone: '0890000004' },
};

const THERAPIST_ID: Record<string, string> = {
  'พี่ศรี': 'T01',
  'พี่มาลี': 'T02',
  'พี่ภูมิ': 'T03',
  'น้องฟ้า': 'T04',
  'พี่ทิว': 'T05',
  'น้องแก้ว': 'T06',
};

const NO_CODE = 'ไม่มีรหัสจอง';

// ---------------------------------------------------------------- helper ของหัวข้อนี้

type Guest = { name: string; phone: string };
type BookOptions = { service: string; party: number; date: string; time: string; guest?: Guest };
type Row = { code: string; time: string; couple: boolean; party: number; therapists: string[]; pay: number; phone: string };
type RowExpect = {
  time?: string;
  couple?: boolean;
  party?: number;
  therapists?: string[];
  therapistsIn?: string[];
  therapistCount?: number;
  pay?: number;
};

const lines = (...s: string[]) => s.join('\n');
const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;
const sorted = (a: string[]) => [...a].sort();
const textOf = (l: ReturnType<BookingHelper['el']>) => l.innerText({ timeout: 3_000 }).catch(() => '');
const is2xx = (s: number) => s >= 200 && s < 300;
const is4xx = (s: number) => s >= 400 && s < 500;
const brief = (r: ApiResult) => ({ status: r.status, code: r.body?.error?.code ?? null, message: r.body?.error?.message ?? null });

function need(req: CapturedRequest | undefined): CapturedRequest {
  if (!req) throw new Error('ไม่มีคำขอจาก Network ของการกดยืนยันบนหน้าเว็บ จึงเตรียมคำขอยิงตรงไม่ได้');
  return req;
}

/** อ่านทุกแถวของวันที่เปิดอยู่ในหลังร้าน */
async function readRows(admin: AdminHelper): Promise<Row[]> {
  await settle(admin.page);
  const rows: Row[] = [];
  for (const code of await admin.codes()) {
    const names = await textOf(admin.therapists(code));
    rows.push({
      code,
      time: (await textOf(admin.time(code))).replace(/\s/g, ''),
      couple: (await textOf(admin.row(code))).includes('Couple Suite'),
      party: money(await textOf(admin.party(code))),
      therapists: names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => THERAPIST_ID[n] ?? n),
      pay: lineAmount(await textOf(admin.pay(code))),
      phone: (await textOf(admin.phone(code))).trim(),
    });
  }
  return rows;
}

async function reloadAdmin(app: App, admin: AdminHelper, date: string) {
  await app.reload(admin.page);
  await admin.page.getByTestId('admin-date').fill(date);
  await settle(admin.page);
}

/** ตรวจแถวการจองในหลังร้านตามค่าที่ระบุ · ไฮไลต์แถวนั้น */
async function checkRow(app: App, admin: AdminHelper, label: string, code: string, e: RowExpect) {
  const r = (await readRows(admin)).find((x) => x.code === code);
  await app.check(admin.row(code), label, async () => {
    expect.soft(r, `มีแถว ${code} ในหลังร้าน`).toBeTruthy();
    if (!r) return;
    if (e.time !== undefined) expect.soft(r.time, 'เวลา').toBe(e.time);
    if (e.couple !== undefined) expect.soft(r.couple, 'ใช้ห้อง Couple Suite').toBe(e.couple);
    if (e.party !== undefined) expect.soft(r.party, 'จำนวนคน').toBe(e.party);
    if (e.pay !== undefined) expect.soft(r.pay, 'ยอด').toBe(e.pay);
    if (e.therapists) expect.soft(sorted(r.therapists), 'นักบำบัด').toEqual(sorted(e.therapists));
    if (e.therapistCount !== undefined) expect.soft(r.therapists.length, 'จำนวนนักบำบัด').toBe(e.therapistCount);
    if (e.therapistsIn) for (const t of r.therapists) expect.soft(e.therapistsIn, `นักบำบัด ${t}`).toContain(t);
    expect.soft(new Set(r.therapists).size, 'ไม่มีชื่อนักบำบัดซ้ำในรายการ').toBe(r.therapists.length);
  });
}

/** ตรวจรหัสจองที่ใช้ Couple Suite ของวันที่เปิดอยู่ */
async function checkCoupleCodes(app: App, admin: AdminHelper, label: string, expected: string[]) {
  const rows = await readRows(admin);
  const codes = rows.filter((r) => r.couple).map((r) => r.code);
  await app.check(admin.page.getByTestId('admin-schedule'), label, async () => {
    expect.soft(sorted(codes), 'รายการใน Couple Suite').toEqual(sorted(expected));
  });
  return rows;
}

/** ยอดบนหน้าจอ เทียบเลขเต็ม */
async function checkPay(app: App, booking: BookingHelper, label: string, expected: number) {
  const value = await booking.pay().catch(() => NaN);
  await app.check(booking.el('booking-pay-at-shop'), `${label} ${baht(expected)}`, async () => {
    expect.soft(value, label).toBe(expected);
  });
}

/** บรรทัดราคาบนหน้าสรุป เทียบเลขเต็มทั้งราคาเต็ม ส่วนลด และยอดจ่าย */
async function checkQuote(app: App, booking: BookingHelper, label: string, e: { full: number; discount: number; pay: number }) {
  const l = await booking.lines();
  await app.check(booking.el('booking-pay-at-shop'), `${label} ${baht(e.pay)}`, async () => {
    expect.soft(l.full, `${label}: ราคาเต็ม`).toBe(e.full);
    expect.soft(l.discount, `${label}: ส่วนลด`).toBe(e.discount);
    expect.soft(l.pay, `${label}: จ่ายหน้าร้าน`).toBe(e.pay);
  });
}

/** หน้าสรุปไม่มีบรรทัดส่วนลดคู่ */
async function checkNoCoupleDiscount(app: App, booking: BookingHelper, label: string) {
  await app.check(booking.el('booking-screen-3'), label, async (el) => {
    await expect.soft(el).not.toContainText('ส่วนลดคู่');
  });
}

/** เปิดหน้าจอง เลือกบริการ จำนวนคน วัน แล้วรอรอบ (1 คนเลือก "ใครก็ได้") */
async function toSlots(booking: BookingHelper, service: string, party: number, date: string) {
  await booking.open();
  await booking.chooseService(service, party);
  await booking.nextFromStep1();
  await booking.chooseDate(date);
  if (party === 1) await booking.chooseTherapist('any');
  await settle(booking.page);
}

async function selectable(booking: BookingHelper, time: string): Promise<boolean> {
  const slot = booking.slot(time);
  return (await slot.count()) > 0 && (await slot.isEnabled());
}

/** รอบเลือกได้หรือไม่ได้ (ไม่แสดงหรือกดไม่ได้ ถือว่าเลือกไม่ได้) */
async function checkSlot(app: App, booking: BookingHelper, time: string, ok: boolean, label: string) {
  const can = await selectable(booking, time);
  await app.check(ok ? booking.slot(time) : booking.el('booking-screen-2'), label, async () => {
    expect.soft(can, label).toBe(ok);
  });
}

/** รอบต้องไม่แสดงบนหน้าจอ */
async function checkSlotHidden(app: App, booking: BookingHelper, time: string, label: string) {
  await app.check(booking.el('booking-screen-2'), label, async (el) => {
    await expect.soft(el.getByTestId(`booking-slot-${time.replace(':', '-')}`)).toHaveCount(0);
  });
}

/** จองผ่านหน้าเว็บจนยืนยัน · ขั้นที่พังถูกบันทึกเป็นข้อล้มโดยไม่ทำให้จุดตรวจถัดไปหาย */
async function bookVia(
  app: App,
  booking: BookingHelper,
  label: string,
  o: BookOptions,
  pay?: number,
  onSummary?: () => Promise<void>,
): Promise<{ code: string; request?: CapturedRequest }> {
  let code: string | null = null;
  let request: CapturedRequest | undefined;
  let detail = '';
  try {
    await booking.toSummary(o);
    if (onSummary) await onSummary();
    if (pay !== undefined) await checkPay(app, booking, `${label}: ยอดหน้าสรุป`, pay);
    if (o.guest) await booking.guest(o.guest.name, o.guest.phone);
    const res = await booking.confirm();
    code = res.code;
    request = res.request;
    detail = `HTTP ${res.request.responseStatus} ${JSON.stringify(res.request.responseBody?.error ?? null)}`;
  } catch (e) {
    detail = e instanceof Error ? e.message : String(e);
  }
  await app.checkValue(booking.page, `${label}: จองสำเร็จได้รหัสจอง`, { code, detail: code ? '' : detail }, (v) => {
    expect.soft(v.code, `${label}: ${v.detail}`).toBeTruthy();
  });
  return { code: code ?? NO_CODE, request };
}

/**
 * ลองเดินไปถึงหน้าสรุปโดยไม่ยืนยัน คืนจุดที่ไปต่อไม่ได้
 * ตรวจก่อนกดทุกขั้น เพื่อให้ค่าที่ถูกห้ามตั้งแต่ปุ่มจำนวนคนไม่ทำให้ test ค้าง
 */
async function probe(booking: BookingHelper, service: string, party: number, date: string, time: string): Promise<string> {
  await booking.open();
  await booking.el(`booking-service-${service}`).click();
  const partyBtn = booking.el(`booking-party-${party}`);
  if (await partyBtn.isDisabled()) return 'เลือกจำนวนคนไม่ได้';
  await partyBtn.click();
  await settle(booking.page);
  if ((await partyBtn.getAttribute('aria-pressed')) !== 'true') return 'จำนวนคนไม่ถูกเลือก';
  const next1 = booking.el('booking-step1-next');
  if (await next1.isDisabled()) return 'ไปหน้าเลือกวันไม่ได้';
  await next1.click();
  await booking.el('booking-screen-2').waitFor({ state: 'visible' });
  await booking.chooseDate(date);
  if (party === 1) await booking.chooseTherapist('any');
  await settle(booking.page);
  if (!(await selectable(booking, time))) return 'เลือกรอบไม่ได้';
  await booking.chooseSlot(time);
  const next2 = booking.el('booking-step2-next');
  if (await next2.isDisabled()) return 'ไปหน้าสรุปไม่ได้';
  await next2.click();
  await booking.el('booking-screen-3').waitFor({ state: 'visible' });
  await booking.quoteReady();
  return 'ถึงหน้าสรุป';
}

// ---------------------------------------------------------------- TC-GROUP-01

test('TC-GROUP-01 สมาชิกจองคู่ใน Couple Suite ไม่มีส่วนลดคู่ และผู้จองรับแต้มกับยอดสะสมของทั้งการจอง', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'รอบ A: ฿3,600 (฿2,000 × 2 = ฿4,000 − 10% ระดับ ฿400 = ฿3,600) · ไม่มีบรรทัดส่วนลดคู่ · หลังร้านแสดงห้อง Couple Suite เวลา 18:00–19:30 และนักบำบัด 2 คนจาก T01, T05, T03',
      'รอบ B: ฿1,600 (฿1,000 × 2 = ฿2,000 − 20% ฿400 = ฿1,600) (ถ้าลดคนเดียวจะได้ ฿1,800)',
      'หลังกดเสร็จรอบ B: U02 แต้ม 0 + (฿1,600 ÷ 100 = 16) = 16 แต้ม · ยอด ฿30,000 + ฿1,600 = ฿31,600 (ถ้าแบ่งครึ่งจะได้ 8 แต้ม และ ฿30,800) · รอบ A ที่ยังไม่เสร็จไม่เพิ่มแต้มหรือยอด',
    ),
    source: '[D] บ.12 · [R] ⚠️A-11',
    frbr: 'FR-14, FR-15, FR-17, FR-31, BR-06, BR-08',
    rules: 'R10, R13',
    technique: 'Happy path, Boundary, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  let codeA = NO_CODE;
  let codeB = NO_CODE;

  await test.step('1. เข้าระบบ U02 เลือก S04 2 คน 19 มิ.ย. รอบ 18:00', async () => {
    await app.login(page, 'U02');
  });

  await test.step('2. ดูสรุปราคา ยืนยันการจอง แล้วรีโหลดหน้า', async () => {
    const res = await bookVia(app, booking, 'รอบ A', { service: 'S04', party: 2, date: '2026-06-19', time: '18:00' }, undefined, async () => {
      await checkQuote(app, booking, 'รอบ A', { full: 4000, discount: 400, pay: 3600 });
      await checkNoCoupleDiscount(app, booking, 'รอบ A ไม่มีบรรทัดส่วนลดคู่');
    });
    codeA = res.code;
    await app.reload(page);
    await app.goto(page, '/th/account');
    const row = page.locator('[data-testid^="account-booking-"]').filter({ hasText: codeA }).first();
    await app.check(row, 'หลังรีโหลด รอบ A ยอด ฿3,600 ในหน้าบัญชี', async (el) => {
      await expect.soft(el).toContainText(/฿3,600(?![\d,])/);
    });
  });

  const admin = await app.admin();

  await test.step('3. เข้าหลังร้านดูการจองนี้', async () => {
    await admin.open('2026-06-19');
    await checkRow(app, admin, 'หลังร้าน รอบ A Couple Suite 18:00–19:30 นักบำบัด 2 คนจาก T01, T05, T03 ฿3,600', codeA, {
      time: '18:00–19:30',
      couple: true,
      party: 2,
      therapistCount: 2,
      therapistsIn: ['T01', 'T05', 'T03'],
      pay: 3600,
    });
  });

  await test.step('4. ทำรอบ B ด้วยบัญชี U02', async () => {
    const res = await bookVia(app, booking, 'รอบ B', { service: 'S01', party: 2, date: '2026-06-17', time: '12:00' }, undefined, async () => {
      const used = await booking.tryUseBirthday();
      await app.checkValue(page, 'รอบ B เลือกเดือนเกิดได้', used, (v) => { expect.soft(v).toBe(true); });
      await checkQuote(app, booking, 'รอบ B', { full: 2000, discount: 400, pay: 1600 });
    });
    codeB = res.code;
  });

  await test.step('5. เจ้าของกดเสร็จเฉพาะการจองรอบ B', async () => {
    await admin.open('2026-06-17');
    const btn = admin.page.getByTestId(`admin-complete-${codeB}`);
    const canComplete = (await btn.count()) > 0;
    await app.check(admin.row(codeB), 'หลังร้าน รอบ B มีปุ่มใช้บริการเสร็จ', async () => {
      expect.soft(canComplete, 'ปุ่มใช้บริการเสร็จของรอบ B').toBe(true);
    });
    if (canComplete) {
      const req = await admin.complete(codeB);
      await app.checkValue(admin.page, 'กดใช้บริการเสร็จรอบ B สำเร็จ', req.responseStatus, (v) => {
        expect.soft(is2xx(v), `สถานะ ${v}`).toBe(true);
      });
    }
    await admin.open('2026-06-19');
    await app.check(admin.page.getByTestId(`admin-complete-${codeA}`), 'รอบ A ยังไม่เสร็จ ยังมีปุ่มใช้บริการเสร็จ', async (el) => {
      await expect.soft(el).toHaveCount(1);
    });
  });

  await test.step('6. ดูแต้มและยอดสะสมของ U02 แล้วรีโหลด', async () => {
    const now = await app.readAccount(page);
    await app.check(page.getByTestId('account-spend'), 'ยอดสะสม ฿31,600', async () => { expect.soft(now.spend).toBe(31600); });
    await app.check(page.getByTestId('account-points'), 'แต้ม 16', async () => { expect.soft(now.points).toBe(16); });
    await app.reload(page);
    const after = await app.readAccount(page);
    await app.check(page.getByTestId('account-spend'), 'หลังรีโหลด ยอดสะสม ฿31,600', async () => { expect.soft(after.spend).toBe(31600); });
    await app.check(page.getByTestId('account-points'), 'หลังรีโหลด แต้ม 16 (ไม่รวมรอบ A)', async () => { expect.soft(after.points).toBe(16); });
  });
});

// ---------------------------------------------------------------- TC-GROUP-02

test('TC-GROUP-02 ห้องคู่เต็ม ลูกค้าต้องเห็น "เวลานี้ถูกจองแล้ว" และไม่มีตัวเลือกย้ายห้อง', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'จองคู่รอบ 18:00: หน้าจอแสดง "เวลานี้ถูกจองแล้ว" (ถ้ารอบหายเฉย ๆ โดยไม่มีข้อความ ถือว่าไม่ผ่าน) · ไม่มีตัวเลือกย้ายห้อง',
      'ตัวเทียบ 1 คน: รอบ 18:00 ยังเลือกได้ เพราะ T02, T03, T04, T06 ว่างและไม่ใช้ Couple Suite',
      'คำขอตรงรอบ 18:00: สถานะ 409 ข้อความ เวลานี้ถูกจองแล้ว (R10) · สถานะหรือเหตุอื่นถือว่าคำขอเตรียมผิด ให้แก้แล้วยิงใหม่',
      'ข้อมูลไม่เปลี่ยน: Couple Suite เวลา 18:00–19:00 มีแค่ `SJTEST09` · U02 ยอด ฿30,000 แต้ม 0',
    ),
    source: '[D] บ.12 · F-ร้าน 4',
    frbr: 'FR-14, BR-06',
    rules: 'R10, R11',
    technique: 'Negative, Boundary',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  let captured: CapturedRequest | undefined;

  await test.step('1. เข้าระบบ U02 เลือก S01 2 คน 20 มิ.ย.', async () => {
    await app.login(page, 'U02');
    await toSlots(booking, 'S01', 2, '2026-06-20');
  });

  await test.step('2. ดูรอบ 18:00 แล้วลองกดเลือกรอบนี้ถ้ากดได้', async () => {
    if (await selectable(booking, '18:00')) await booking.chooseSlot('18:00');
    await settle(page);
    await app.check(booking.el('booking-flow'), 'จองคู่รอบ 18:00 แสดงข้อความ เวลานี้ถูกจองแล้ว', async () => {
      await expect.soft(page.locator('body')).toContainText('เวลานี้ถูกจองแล้ว');
    });
    await app.check(booking.el('booking-flow'), 'ไม่มีตัวเลือกย้ายห้อง', async (el) => {
      await expect.soft(el).not.toContainText(/ย้ายห้อง|ห้องอื่น|เปลี่ยนห้อง/);
    });
  });

  await test.step('3. เปลี่ยนเป็น 1 คน แล้วดูรอบ 18:00 โดยยังไม่ยืนยัน', async () => {
    await booking.el('booking-step2-back').click();
    await booking.el('booking-screen-1').waitFor({ state: 'visible' });
    await booking.el('booking-party-1').click();
    await settle(page);
    await booking.nextFromStep1();
    await booking.chooseDate('2026-06-20');
    await booking.chooseTherapist('any');
    await checkSlot(app, booking, '18:00', true, 'ตัวเทียบ 1 คน รอบ 18:00 ยังเลือกได้');
  });

  await test.step('4. ดึง URL จาก Network ตอนกดยืนยันจองคู่รอบอื่น แล้วล็อกกับรีเซ็ตใหม่', async () => {
    const res = await bookVia(app, booking, 'จองคู่รอบอื่น (12:00)', { service: 'S01', party: 2, date: '2026-06-20', time: '12:00' });
    captured = res.request;
    await app.lockAndReset(LOCK);
    await app.login(page, 'U02');
  });

  await test.step('5. ยิงจองคู่ S01 รอบ 19:00 เป็นตัวคุม แล้วยิงรอบ 18:00', async () => {
    const req = need(captured);
    const control = await app.replay(page, req, { time: '19:00' });
    await app.checkValue(page, 'ตัวคุมรอบ 19:00 สำเร็จ 2xx', brief(control), (v) => {
      expect.soft(is2xx(v.status), `สถานะ ${v.status}`).toBe(true);
    });
    const taken = await app.replay(page, req, { time: '18:00' });
    await app.checkValue(page, 'คำขอตรงรอบ 18:00 ได้ 409 เวลานี้ถูกจองแล้ว', brief(taken), (v) => {
      expect.soft(v.status).toBe(409);
      expect.soft(v.message).toBe('เวลานี้ถูกจองแล้ว');
    });
  });

  await test.step('6. เข้าหลังร้านดูการจองวันที่ 20 มิ.ย. แล้วรีโหลด', async () => {
    const admin = await app.admin();
    await app.ownerRelogin();
    await admin.open('2026-06-20');
    const checkOnly09 = async (label: string) => {
      const rows = await readRows(admin);
      const inRoom = rows.filter((r) => r.couple && r.time === '18:00–19:00').map((r) => r.code);
      await app.check(admin.page.getByTestId('admin-schedule'), label, async () => {
        expect.soft(inRoom).toEqual(['SJTEST09']);
      });
    };
    await checkOnly09('Couple Suite 18:00–19:00 มีแค่ SJTEST09');
    await reloadAdmin(app, admin, '2026-06-20');
    await checkOnly09('หลังรีโหลด Couple Suite 18:00–19:00 มีแค่ SJTEST09');

    const account = await app.readAccount(page);
    await app.check(page.getByTestId('account-spend'), 'U02 ยอด ฿30,000', async () => { expect.soft(account.spend).toBe(30000); });
    await app.check(page.getByTestId('account-points'), 'U02 แต้ม 0', async () => { expect.soft(account.points).toBe(0); });
  });
});

// ---------------------------------------------------------------- TC-GROUP-03

test('TC-GROUP-03 จองคู่รอบเดียวกันแข่งกัน 3 คำขอ ได้คู่เดียว', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      '1 คำขอสำเร็จ · 2 คำขอถูกปฏิเสธด้วยสถานะ 4xx',
      'หลังร้าน: การจองคู่รอบนี้มี 1 รายการ ใช้นักบำบัด 2 คน · แขกของ 2 คำขอที่ถูกปฏิเสธไม่มีการจอง',
      'คำขอเดี่ยวของ G4 ได้ 409 ทั้งที่นักบำบัดเหลือ 4 คน จึงยืนยันว่าห้องเป็นตัวปฏิเสธ',
      'นักบำบัดที่เหลือ 6 − 2 = 4 คน จึงยังจอง 1 คน รอบ 12:00 ได้',
    ),
    source: '[D] บ.12 · [R]',
    frbr: 'FR-14, BR-06',
    rules: 'R10',
    technique: 'Negative, Boundary, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  let captured: CapturedRequest | undefined;
  const guests = [G.G1, G.G2, G.G3];
  let results: ApiResult[] = [];

  await test.step('1. จองคู่ S01 รอบอื่นบนหน้าเว็บ แล้วดึง URL และ body จาก Network', async () => {
    const res = await bookVia(app, booking, 'จองคู่รอบ 14:00', {
      service: 'S01', party: 2, date: '2026-06-17', time: '14:00', guest: { name: 'คุณทดสอบ', phone: '0890520301' },
    });
    captured = res.request;
  });

  await test.step('2. ล็อกแล้วรีเซ็ตใหม่', async () => {
    await app.lockAndReset(LOCK);
  });

  await test.step('3. ยิง 3 คำขอพร้อมกันด้วยข้อมูล G1, G2, G3', async () => {
    const req = need(captured);
    const apis = await Promise.all(guests.map(() => app.guestApi()));
    results = await Promise.all(guests.map((g, i) => app.replay(apis[i], req, { time: '12:00', guest: g })));
    await app.checkValue(page, '3 คำขอ: สำเร็จ 1 ถูกปฏิเสธ 4xx 2', results.map(brief), (v) => {
      expect.soft(v.filter((r) => is2xx(r.status)).length, 'จำนวนที่สำเร็จ').toBe(1);
      expect.soft(v.filter((r) => is4xx(r.status)).length, 'จำนวนที่ถูกปฏิเสธ 4xx').toBe(2);
    });
  });

  await test.step('4. ยิงคู่ S01 12:00 แบบเดี่ยวด้วย G4 แล้วเข้าหลังร้านดู 17 มิ.ย. 12:00 และรีโหลด', async () => {
    const api = await app.guestApi();
    const g4 = await app.replay(api, need(captured), { time: '12:00', guest: G.G4 });
    await app.checkValue(page, 'คำขอเดี่ยวของ G4 ได้ 409', brief(g4), (v) => { expect.soft(v.status).toBe(409); });

    await app.ownerRelogin();
    const admin = await app.admin();
    await admin.open('2026-06-17');
    const rejected = guests.filter((_, i) => !is2xx(results[i]?.status ?? 0)).map((g) => g.phone);
    const checkRound = async (when: string) => {
      const noon = (await readRows(admin)).filter((r) => r.time.startsWith('12:00'));
      await app.check(admin.page.getByTestId('admin-schedule'), `${when}การจองคู่รอบนี้มี 1 รายการ นักบำบัด 2 คน`, async () => {
        expect.soft(noon.length, 'จำนวนรายการ 12:00').toBe(1);
        expect.soft(noon[0]?.couple, 'ใช้ Couple Suite').toBe(true);
        expect.soft(noon[0]?.therapists.length, 'จำนวนนักบำบัด').toBe(2);
        expect.soft(new Set(noon[0]?.therapists ?? []).size, 'นักบำบัดไม่ซ้ำ').toBe(2);
        expect.soft(noon.filter((r) => rejected.includes(r.phone)).length, 'แขกที่ถูกปฏิเสธไม่มีการจอง').toBe(0);
      });
    };
    await checkRound('');
    await reloadAdmin(app, admin, '2026-06-17');
    await checkRound('หลังรีโหลด ');
  });

  await test.step('5. เปิดหน้าจอง เลือก S01 1 คน 17 มิ.ย. ดูรอบ 12:00', async () => {
    await toSlots(booking, 'S01', 1, '2026-06-17');
    await checkSlot(app, booking, '12:00', true, 'นักบำบัดเหลือ 4 คน S01 1 คน รอบ 12:00 ยังจองได้');
  });
});

// ---------------------------------------------------------------- TC-GROUP-04

test('TC-GROUP-04 Couple Suite ใช้ต่อได้ทันที เตรียมห้อง 0 นาที และห้องซ้อนนับข้ามบริการ', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'S01 18:30 ✗ (18:30–19:30 คาบ 18:00–19:00)',
      'S01 19:00 ✓ ฿1,800 (฿2,000 − 10% ฿200) เวลา 19:00–20:00 ห้อง Couple Suite (ถ้าบวกเวลาเตรียมห้อง รอบนี้จะหาย)',
      'S01 19:30 ✓ ฿1,800',
      'S06 17:30 ✗ (17:30–18:30 คาบ B09 แม้ T03, T04 ว่าง)',
      'S06 17:00 ✓ ฿2,700 (฿1,500 × 2 = ฿3,000 − 10% ฿300) เวลา 17:00–18:00 นักบำบัด T03, T04',
      'จบข้อ 2: Couple Suite วันนั้นมี 2 รายการ `SJTEST09` และ S01 19:00 · จบข้อ 5: มี 2 รายการ `SJTEST09` และ S06 17:00 · ไม่มีรายการเริ่ม 18:30 หรือ 17:30',
    ),
    source: '[R] ⚠️A-04',
    frbr: 'FR-14, BR-06, BR-07',
    rules: 'R12',
    technique: 'Boundary, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const date = '2026-06-20';
  let finalRows: Row[] = [];
  let finalCode = NO_CODE;

  await test.step('1. เลือก S01 2 คน ดูรอบ 18:30', async () => {
    await app.login(page, 'U02');
    await toSlots(booking, 'S01', 2, date);
    await checkSlot(app, booking, '18:30', false, 'S01 คู่ รอบ 18:30 เลือกไม่ได้ (คาบ B09)');
  });

  await test.step('2. จองรอบ 19:00 จนยืนยัน แล้วดูในหลังร้าน', async () => {
    const { code } = await bookVia(app, booking, 'S01 คู่ 19:00', { service: 'S01', party: 2, date, time: '19:00' }, 1800);
    const admin = await app.admin();
    await admin.open(date);
    await checkRow(app, admin, 'S01 19:00 เวลา 19:00–20:00 ห้อง Couple Suite ฿1,800', code, { time: '19:00–20:00', couple: true, pay: 1800 });
    const rows = await checkCoupleCodes(app, admin, 'จบข้อ 2 Couple Suite มี SJTEST09 และ S01 19:00', ['SJTEST09', code]);
    await app.check(admin.page.getByTestId('admin-schedule'), 'ไม่มีรายการเริ่ม 18:30', async () => {
      expect.soft(rows.filter((r) => r.time.startsWith('18:30')).map((r) => r.code)).toEqual([]);
    });
  });

  await test.step('3. ล็อกกับรีเซ็ต แล้วจองรอบ 19:30 จนยืนยัน', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U02');
    await bookVia(app, booking, 'S01 คู่ 19:30', { service: 'S01', party: 2, date, time: '19:30' }, 1800);
  });

  await test.step('4. ล็อกกับรีเซ็ต เลือก S06 2 คน ดูรอบ 17:30', async () => {
    await app.lockAndReset(LOCK);
    await app.login(page, 'U02');
    await toSlots(booking, 'S06', 2, date);
    await checkSlot(app, booking, '17:30', false, 'S06 คู่ รอบ 17:30 เลือกไม่ได้ (คาบ B09 แม้ T03, T04 ว่าง)');
  });

  await test.step('5. จอง S06 รอบ 17:00 จนยืนยัน แล้วดูในหลังร้าน รีโหลด', async () => {
    const { code } = await bookVia(app, booking, 'S06 คู่ 17:00', { service: 'S06', party: 2, date, time: '17:00' }, 2700);
    finalCode = code;
    await app.ownerRelogin();
    const admin = await app.admin();
    await admin.open(date);
    await checkRow(app, admin, 'S06 17:00 เวลา 17:00–18:00 นักบำบัด T03, T04 ฿2,700', code, {
      time: '17:00–18:00', couple: true, therapists: ['T03', 'T04'], pay: 2700,
    });
    await reloadAdmin(app, admin, date);
    finalRows = await checkCoupleCodes(app, admin, 'จบข้อ 5 หลังรีโหลด Couple Suite มี SJTEST09 และ S06 17:00', ['SJTEST09', code]);
    await app.check(admin.page.getByTestId('admin-schedule'), 'ไม่มีรายการเริ่ม 18:30 หรือ 17:30', async () => {
      expect.soft(finalRows.filter((r) => /^(18:30|17:30)/.test(r.time)).map((r) => r.code)).toEqual([]);
    });
  });

  await app.checkValue(page, 'สรุป Couple Suite วันนั้นมี 2 รายการ SJTEST09 และ S06 17:00', finalRows.filter((r) => r.couple).map((r) => `${r.code} ${r.time}`), (v) => {
    expect.soft(sorted(v)).toEqual(sorted([`SJTEST09 18:00–19:00`, `${finalCode} 17:00–18:00`]));
  });
});

// ---------------------------------------------------------------- TC-GROUP-05

test('TC-GROUP-05 ห้องว่างแต่นักบำบัดไม่พอ จองคู่ไม่ได้ ขณะที่ 1 คนรอบเดียวกันจองได้', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'คู่ S04 รอบ 11:00 ไม่แสดง (T01, T05, T03 เหลือ T05 คนเดียว)',
      'คู่ S07 รอบ 16:00 ไม่แสดงหรือจองไม่ได้ (T05, T04 เหลือ T05 คนเดียว)',
      'คู่ S01 รอบ 11:00 เลือกได้ ยืนยันว่าห้องว่าง (เหลือ T05, T02, T06, T04)',
      'ก่อนจองข้อ 5 หลังร้าน 28 มิ.ย. 11:00 มี 2 รายการ คือ `SJTEST17`, `SJTEST18`',
      '1 คน S04: ✓ ได้ T05 ฿2,000 ไม่ใช้ Couple Suite · หลังร้านเพิ่มเป็น 3 รายการ',
    ),
    source: '[R] ⚠️A-02 · [D][R] E60',
    frbr: 'FR-15, BR-11',
    rules: 'R17',
    technique: 'Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const date = '2026-06-28';
  const at11 = async (admin: AdminHelper) => (await readRows(admin)).filter((r) => r.time.startsWith('11:00'));
  let code = NO_CODE;
  let finalCount = -1;

  await test.step('1. เลือก S04 2 คน 28 มิ.ย. ดูรอบ 11:00', async () => {
    await toSlots(booking, 'S04', 2, date);
    await checkSlotHidden(app, booking, '11:00', 'คู่ S04 รอบ 11:00 ไม่แสดง');
  });

  await test.step('2. เลือก S07 2 คน 23 มิ.ย. ดูรอบ 16:00', async () => {
    await toSlots(booking, 'S07', 2, '2026-06-23');
    await checkSlot(app, booking, '16:00', false, 'คู่ S07 รอบ 16:00 ไม่แสดงหรือจองไม่ได้');
  });

  await test.step('3. เลือก S01 2 คน 28 มิ.ย. ดูรอบ 11:00 โดยไม่ยืนยัน', async () => {
    await toSlots(booking, 'S01', 2, date);
    await checkSlot(app, booking, '11:00', true, 'คู่ S01 รอบ 11:00 เลือกได้ ยืนยันว่าห้องว่าง');
  });

  const admin = await app.admin();

  await test.step('4. เข้าหลังร้านนับการจอง 28 มิ.ย. 11:00', async () => {
    await admin.open(date);
    const rows = await at11(admin);
    await app.check(admin.page.getByTestId('admin-schedule'), 'ก่อนจอง 28 มิ.ย. 11:00 มี 2 รายการ SJTEST17, SJTEST18', async () => {
      expect.soft(sorted(rows.map((r) => r.code))).toEqual(['SJTEST17', 'SJTEST18']);
    });
  });

  await test.step('5. จอง S04 1 คน 28 มิ.ย. 11:00 แบบใครก็ได้ จนยืนยัน', async () => {
    const res = await bookVia(app, booking, 'S04 1 คน 11:00', {
      service: 'S04', party: 1, date, time: '11:00', guest: G.G1,
    }, 2000);
    code = res.code;
  });

  await test.step('6. ดูการจองใหม่ในหลังร้าน แล้วรีโหลด', async () => {
    await admin.open(date);
    await checkRow(app, admin, 'การจองใหม่ได้ T05 ฿2,000 ไม่ใช้ Couple Suite', code, { therapists: ['T05'], pay: 2000, couple: false });
    await reloadAdmin(app, admin, date);
    const rows = await at11(admin);
    finalCount = rows.length;
    await app.check(admin.page.getByTestId('admin-schedule'), 'หลังรีโหลด 28 มิ.ย. 11:00 เพิ่มเป็น 3 รายการ', async () => {
      expect.soft(rows.length).toBe(3);
    });
    await app.checkValue(page, 'สรุป: 28 มิ.ย. 11:00 ในหลังร้านเพิ่มเป็น 3 รายการ', finalCount, (v) => { expect.soft(v).toBe(3); });
  });
});

// ---------------------------------------------------------------- TC-GROUP-06

test('TC-GROUP-06 จำนวนคนต้องไม่เกินนักบำบัดที่ทำบริการนั้นได้และว่าง', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'ว่างครบ:',
      'S01 6 คน ✓',
      'S03 3 คน ✓ · 4 คน ✓ · 5 คน ✗ (T01, T02, T05, T06)',
      'S04 3 คน ✓ · 4 คน ✗ (T01, T03, T05)',
      'S05 5 คน ✓ · 6 คน ✗ (T05 ทำ S05 ไม่ได้)',
      'S06 3 คน ✗ (T03, T04) · S07 3 คน ✗ (T04, T05)',
      'มีคนไม่ว่าง:',
      'S01 22 มิ.ย. 14:00: 4 คน ✓ · 5 คน ✓ (6 − 1 = 5) · 6 คน ✗',
      'S01 26 มิ.ย. 12:00: 1 คน ✗ รอบไม่แสดง (ว่าง 0 คน)',
      'S06 23 มิ.ย. 1 คน: 15:00 ✓ · 15:30 ✗ · 16:00 ✗ · 16:30 ✗ · 17:00 ✓',
      'การจอง S01 5 คน: ฿4,500 (฿1,000 × 5 = ฿5,000 − 10% ฿500) · หลังร้านแสดง T05, T02, T03, T06, T04 ไม่มี T01 (ถ้ามี T01 คือจองซ้อน)',
      'ข้อมูลไม่เปลี่ยน: ค่าที่ ✗ ไม่เกิดการจองใหม่ · ทั้งชุดเพิ่มการจอง 1 รายการเท่านั้น',
    ),
    source: '[D] §4 จองคิว · [D][R] E48, E50, E51, E53–E58',
    frbr: 'FR-16, BR-11, BR-13',
    rules: 'R17',
    technique: 'Boundary, Equivalence partition, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(600_000);
  const days = ['2026-06-17', '2026-06-22', '2026-06-23', '2026-06-26'];
  const admin = await app.admin();
  const before: Record<string, string[]> = {};

  await test.step('นับการจองของวันที่จะลองก่อนเริ่ม', async () => {
    for (const d of days) {
      await admin.open(d);
      before[d] = await admin.codes();
    }
  });

  await test.step('1-2. ลองตามตาราง ค่า ✓ ไปถึงหน้าสรุปโดยไม่ยืนยัน ค่า ✗ เลือกรอบหรือไปต่อไม่ได้', async () => {
    const cases: [string, number, string, string, boolean][] = [
      ['S01', 6, '2026-06-17', '12:00', true],
      ['S03', 3, '2026-06-17', '12:00', true],
      ['S03', 4, '2026-06-17', '12:00', true],
      ['S03', 5, '2026-06-17', '12:00', false],
      ['S04', 3, '2026-06-17', '12:00', true],
      ['S04', 4, '2026-06-17', '12:00', false],
      ['S05', 5, '2026-06-17', '12:00', true],
      ['S05', 6, '2026-06-17', '12:00', false],
      ['S06', 3, '2026-06-17', '12:00', false],
      ['S07', 3, '2026-06-17', '12:00', false],
      ['S01', 4, '2026-06-22', '14:00', true],
      ['S01', 5, '2026-06-22', '14:00', true],
      ['S01', 6, '2026-06-22', '14:00', false],
      ['S01', 1, '2026-06-26', '12:00', false],
      ['S06', 1, '2026-06-23', '15:00', true],
      ['S06', 1, '2026-06-23', '15:30', false],
      ['S06', 1, '2026-06-23', '16:00', false],
      ['S06', 1, '2026-06-23', '16:30', false],
      ['S06', 1, '2026-06-23', '17:00', true],
    ];
    for (const [service, party, date, time, ok] of cases) {
      const label = `${service} ${party} คน ${date} ${time} ${ok ? '✓' : '✗'}`;
      const reached = await probe(booking, service, party, date, time);
      await app.checkValue(page, label, reached, (v) => {
        if (ok) expect.soft(v, label).toBe('ถึงหน้าสรุป');
        else expect.soft(v, label).not.toBe('ถึงหน้าสรุป');
      });
      if (service === 'S01' && date === '2026-06-26') {
        await checkSlotHidden(app, booking, time, 'S01 26 มิ.ย. 12:00 1 คน รอบไม่แสดง (ว่าง 0 คน)');
      }
    }
  });

  let code = NO_CODE;
  await test.step('3. จอง S01 5 คน 22 มิ.ย. 14:00 จนยืนยัน', async () => {
    const res = await bookVia(app, booking, 'S01 5 คน 22 มิ.ย. 14:00', {
      service: 'S01', party: 5, date: '2026-06-22', time: '14:00', guest: G.G1,
    }, 4500);
    code = res.code;
  });

  await test.step('4. เข้าหลังร้านดูการจองใหม่ แล้วรีโหลด', async () => {
    await admin.open('2026-06-22');
    const expected: RowExpect = { therapists: ['T05', 'T02', 'T03', 'T06', 'T04'], pay: 4500, party: 5 };
    await checkRow(app, admin, 'S01 5 คน ฿4,500 นักบำบัด T05, T02, T03, T06, T04 ไม่มี T01', code, expected);
    await reloadAdmin(app, admin, '2026-06-22');
    await checkRow(app, admin, 'หลังรีโหลด S01 5 คน ฿4,500 ไม่มี T01', code, expected);
  });

  await test.step('5. นับจำนวนการจองทั้งหมดของวันที่ลองค่า ✗', async () => {
    const added: Record<string, string[]> = {};
    for (const d of days) {
      await admin.open(d);
      const now = await admin.codes();
      added[d] = now.filter((c) => !before[d].includes(c));
      await app.check(admin.page.getByTestId('admin-schedule'), `${d} จำนวนการจองตามที่คาด`, async () => {
        expect.soft(added[d], d).toEqual(d === '2026-06-22' ? [code] : []);
      });
    }
    await app.checkValue(page, 'ทั้งชุดเพิ่มการจอง 1 รายการเท่านั้น', Object.values(added).flat(), (v) => {
      expect.soft(v).toEqual([code]);
    });
  });
});

// ---------------------------------------------------------------- TC-GROUP-07

test('TC-GROUP-07 จำนวนคนแบ่งประเภทการจองถูกต้อง 7 คนหยุดให้โทรร้าน และค่าจำนวนคนผิดถูกปฏิเสธเมื่อยิงตรง', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      '1 คน: ฿1,000 ไม่ใช้ Couple Suite ไม่ลดกลุ่ม',
      '2 คน: ฿2,000 (฿1,000 × 2) ใช้ Couple Suite ไม่มีบรรทัดส่วนลดคู่',
      '3 คน: ฿3,000 (฿1,000 × 3 ไม่ลด) เป็นจองกลุ่ม ไม่ใช้ Couple Suite นักบำบัด 3 คน',
      '7 คน และ 8 คน: หยุดจอง แสดงให้โทร 02-123-4567 ไม่มีปุ่มไปขั้นถัดไป',
      'ยิงตรง 0, -1, "3", 2.5, 7: ถูกปฏิเสธด้วยสถานะ 4xx ทุกค่า โดยเหตุเป็นเรื่องจำนวนคน ไม่ใช่ยอดไม่ตรง · ตัวคุม 15:00 สำเร็จ 2xx',
      'ข้อมูลไม่เปลี่ยน: หลังร้าน 17 มิ.ย. มี 4 รายการ คือ 3 รายการจากข้อ 1–3 และตัวคุม 15:00 ไม่มีรายการเวลา 14:00',
    ),
    source: '[D] บ.12 · [R] ⚠️A-01',
    frbr: 'FR-18, FR-19, BR-08, BR-09, BR-10',
    rules: 'R13, R14, R15',
    technique: 'Boundary, Equivalence partition, Negative',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const date = '2026-06-17';
  let code1 = NO_CODE;
  let code2 = NO_CODE;
  let code3 = NO_CODE;
  let captured: CapturedRequest | undefined;

  await test.step('1. จอง S01 1 คน จนยืนยัน', async () => {
    const res = await bookVia(app, booking, 'S01 1 คน', { service: 'S01', party: 1, date, time: '12:00', guest: G.G1 }, undefined, async () => {
      await checkQuote(app, booking, '1 คน', { full: 1000, discount: 0, pay: 1000 });
    });
    code1 = res.code;
  });

  await test.step('2. จอง S01 2 คน จนยืนยัน แล้วดึง URL และ body จาก Network', async () => {
    const res = await bookVia(app, booking, 'S01 2 คน', { service: 'S01', party: 2, date, time: '12:00', guest: G.G1 }, undefined, async () => {
      await checkQuote(app, booking, '2 คน', { full: 2000, discount: 0, pay: 2000 });
      await checkNoCoupleDiscount(app, booking, '2 คน ไม่มีบรรทัดส่วนลดคู่');
    });
    code2 = res.code;
    captured = res.request;
  });

  await test.step('3. จอง S01 3 คน จนยืนยัน', async () => {
    const res = await bookVia(app, booking, 'S01 3 คน', { service: 'S01', party: 3, date, time: '12:00', guest: G.G1 }, undefined, async () => {
      await checkQuote(app, booking, '3 คน', { full: 3000, discount: 0, pay: 3000 });
    });
    code3 = res.code;
  });

  await test.step('4. เลือก 7 คน และ 8 คน ดูหน้าจอ', async () => {
    const checkStop = async (who: string) => {
      await app.check(booking.el('booking-call-shop'), `${who}: หยุดจอง แสดงให้โทร 02-123-4567`, async (el) => {
        await expect.soft(el).toContainText('02-123-4567');
      });
      await app.check(booking.el('booking-screen-1'), `${who}: ไม่มีปุ่มไปขั้นถัดไป`, async (el) => {
        await expect.soft(el.getByTestId('booking-step1-next')).toHaveCount(0);
      });
    };
    await booking.open();
    await booking.chooseService('S01', 7);
    await checkStop('7 คน');
    // หน้าเว็บมีปุ่มสูงสุด 7+ จึงเลือก 8 คนผ่านลิงก์
    await booking.open('th', '?service=S01&party=8');
    await checkStop('8 คน');
  });

  await test.step('5. ยิงตรงด้วยจำนวนคนผิด รอบ 14:00 แล้วยิงตัวคุมรอบ 15:00', async () => {
    const req = need(captured);
    const wrongCause = ['price-changed', 'guest-info-required', 'phone-invalid', 'invalid-slot', 'slot-taken', 'date-out-of-range', 'same-day-call', 'service-not-found'];
    const values: unknown[] = [0, -1, '3', 2.5, 7];
    for (let i = 0; i < values.length; i++) {
      const api = await app.guestApi();
      const res = await app.replay(api, req, {
        partySize: values[i], time: '14:00', guest: { name: 'คุณทดสอบ', phone: `08905207${String(i).padStart(2, '0')}` },
      }, { remove: ['expectedPayAtShop'] });
      await app.checkValue(page, `ยิงตรงจำนวนคน ${JSON.stringify(values[i])} ถูกปฏิเสธ 4xx เพราะจำนวนคน`, brief(res), (v) => {
        expect.soft(is4xx(v.status), `สถานะ ${v.status}`).toBe(true);
        expect.soft(wrongCause, `เหตุ ${v.code} ${v.message}`).not.toContain(v.code);
      });
    }
    const api = await app.guestApi();
    const control = await app.replay(api, req, {
      partySize: 2, time: '15:00', guest: { name: 'คุณทดสอบ', phone: '0890520710' },
    }, { remove: ['expectedPayAtShop'] });
    await app.checkValue(page, 'ตัวคุมจำนวน 2 รอบ 15:00 สำเร็จ 2xx', brief(control), (v) => {
      expect.soft(is2xx(v.status), `สถานะ ${v.status}`).toBe(true);
    });
  });

  await test.step('6. เข้าหลังร้านดูการจองของวันนี้ แล้วรีโหลด', async () => {
    const admin = await app.admin();
    await admin.open(date);
    await checkRow(app, admin, '1 คน ฿1,000 ไม่ใช้ Couple Suite', code1, { party: 1, couple: false, pay: 1000 });
    await checkRow(app, admin, '2 คน ฿2,000 ใช้ Couple Suite', code2, { party: 2, couple: true, pay: 2000, therapistCount: 2 });
    await checkRow(app, admin, '3 คน ฿3,000 ไม่ใช้ Couple Suite นักบำบัด 3 คน', code3, { party: 3, couple: false, pay: 3000, therapistCount: 3 });
    await reloadAdmin(app, admin, date);
    const rows = await readRows(admin);
    await app.check(admin.page.getByTestId('admin-schedule'), 'หลังรีโหลด 17 มิ.ย. มี 4 รายการ ไม่มีเวลา 14:00', async () => {
      expect.soft(rows.length, 'จำนวนรายการ').toBe(4);
      expect.soft(rows.filter((r) => r.time.startsWith('14:00')).map((r) => r.code), 'รายการเวลา 14:00').toEqual([]);
      expect.soft(rows.filter((r) => r.time.startsWith('15:00')).length, 'รายการตัวคุม 15:00').toBe(1);
    });
    await app.checkValue(page, 'สรุป: หลังร้าน 17 มิ.ย. มี 4 รายการ', rows.map((r) => `${r.code} ${r.time} ${r.party} คน`), (v) => {
      expect.soft(v.length).toBe(4);
    });
  });
});

// ---------------------------------------------------------------- TC-GROUP-08

test('TC-GROUP-08 จองกลุ่ม 6 คนและ 3+3 คน ระบบจัดนักบำบัดไม่ซ้อน ไม่ตรวจจำนวนห้อง และนักบำบัดถูกกินจริง', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'รอบ A: ฿5,400 (฿1,000 × 6 = ฿6,000 − 10% ฿600) · หลังร้านแสดงนักบำบัด 6 คน T01, T05, T02, T03, T06, T04 เวลา 12:00–13:00 ทุกคน · ไม่ใช้ Couple Suite',
      'หลังรอบ A: S01 1 คน รอบ 12:00 ไม่แสดง (ว่าง 0 คน) · 11:00 และ 13:00 ยังเลือกได้',
      'รอบ B: 2 รายการสำเร็จ รายการละ ฿3,000 · รายการแรก T01, T05, T02 · รายการที่สอง T03, T06, T04 · ไม่มีชื่อซ้ำ (ถ้าตรวจห้องกลุ่มที่สองจะจองไม่ได้)',
      'หลังรอบ B: S01 1 คน รอบ 12:00 ไม่แสดง',
      'รอบ C: สำเร็จอย่างน้อย 1 และไม่เกิน 2 คำขอ (6 ÷ 3 = 2) · ที่เหลือถูกปฏิเสธ · ไม่มีชื่อนักบำบัดซ้ำข้ามรายการในเวลา 12:00–13:00 · ถ้าสำเร็จ 1 รายการทั้งที่เหลือ 3 คน ให้บันทึกโยง R08 และ F-สร้าง 2',
    ),
    source: '[D] บ.12 · [D] §4 จองคิว · [R] ⚠️A-03, ⚠️A-05, ⚠️A-06',
    frbr: 'FR-16, FR-17, BR-09, BR-10, BR-11, BR-13',
    rules: 'R14, R17',
    technique: 'Happy path, Boundary, State',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);
  const date = '2026-06-17';
  const time = '12:00';
  let captured: CapturedRequest | undefined;

  await test.step('1. จอง S01 6 คน ตรวจว่าไม่มีช่องเลือกนักบำบัด แล้วยืนยัน', async () => {
    await toSlots(booking, 'S01', 6, date);
    await app.check(booking.el('booking-screen-2'), 'จอง 6 คน ไม่มีช่องเลือกนักบำบัด', async (el) => {
      await expect.soft(el.locator('[data-testid^="booking-therapist-"]')).toHaveCount(0);
    });
  });

  let codeA = NO_CODE;
  await test.step('1. (ต่อ) ยืนยันการจอง 6 คน', async () => {
    const res = await bookVia(app, booking, 'รอบ A S01 6 คน', { service: 'S01', party: 6, date, time, guest: G.G1 }, 5400);
    codeA = res.code;
  });

  await test.step('2. เข้าหลังร้านดูการจอง แล้วรีโหลด', async () => {
    const admin = await app.admin();
    await admin.open(date);
    const e: RowExpect = {
      time: '12:00–13:00', couple: false, party: 6, pay: 5400,
      therapists: ['T01', 'T05', 'T02', 'T03', 'T06', 'T04'],
    };
    await checkRow(app, admin, 'รอบ A นักบำบัด 6 คน 12:00–13:00 ฿5,400 ไม่ใช้ Couple Suite', codeA, e);
    await reloadAdmin(app, admin, date);
    await checkRow(app, admin, 'หลังรีโหลด รอบ A นักบำบัด 6 คน ฿5,400', codeA, e);
  });

  await test.step('3. เลือก S01 1 คน วันเดียวกัน ดูรอบ 11:00, 12:00, 13:00', async () => {
    await toSlots(booking, 'S01', 1, date);
    await checkSlot(app, booking, '11:00', true, 'หลังรอบ A รอบ 11:00 ยังเลือกได้');
    await checkSlotHidden(app, booking, '12:00', 'หลังรอบ A รอบ 12:00 ไม่แสดง (ว่าง 0 คน)');
    await checkSlot(app, booking, '13:00', true, 'หลังรอบ A รอบ 13:00 ยังเลือกได้');
  });

  let codeB1 = NO_CODE;
  let codeB2 = NO_CODE;
  await test.step('4. ล็อกกับรีเซ็ต แล้วจอง G1 3 คน และ G2 3 คน รอบ 12:00', async () => {
    await app.lockAndReset(LOCK);
    const first = await bookVia(app, booking, 'รอบ B G1 3 คน', { service: 'S01', party: 3, date, time, guest: G.G1 }, 3000);
    codeB1 = first.code;
    captured = first.request;
    const second = await bookVia(app, booking, 'รอบ B G2 3 คน', { service: 'S01', party: 3, date, time, guest: G.G2 }, 3000);
    codeB2 = second.code;
  });

  await test.step('5. ดูหลังร้าน แล้วเลือก S01 1 คน ดูรอบ 12:00', async () => {
    await app.ownerRelogin();
    const admin = await app.admin();
    await admin.open(date);
    await checkRow(app, admin, 'รอบ B รายการแรก T01, T05, T02 ฿3,000', codeB1, { therapists: ['T01', 'T05', 'T02'], pay: 3000, couple: false });
    await checkRow(app, admin, 'รอบ B รายการที่สอง T03, T06, T04 ฿3,000', codeB2, { therapists: ['T03', 'T06', 'T04'], pay: 3000, couple: false });
    await toSlots(booking, 'S01', 1, date);
    await checkSlotHidden(app, booking, '12:00', 'หลังรอบ B รอบ 12:00 ไม่แสดง');
  });

  await test.step('6. รอบ C: ล็อกกับรีเซ็ต ยิง S01 3 คน 12:00 พร้อมกัน 3 คำขอ แล้วดูหลังร้าน', async () => {
    await app.lockAndReset(LOCK);
    const req = need(captured);
    const guests = [G.G1, G.G2, G.G3];
    const apis = await Promise.all(guests.map(() => app.guestApi()));
    const results = await Promise.all(guests.map((g, i) => app.replay(apis[i], req, { time, guest: g })));
    const successes = results.filter((r) => is2xx(r.status)).length;
    await app.checkValue(page, 'รอบ C สำเร็จอย่างน้อย 1 และไม่เกิน 2 ที่เหลือถูกปฏิเสธ', results.map(brief), (v) => {
      expect.soft(successes, 'จำนวนที่สำเร็จ').toBeGreaterThanOrEqual(1);
      expect.soft(successes, 'จำนวนที่สำเร็จ').toBeLessThanOrEqual(2);
      expect.soft(v.filter((r) => is4xx(r.status)).length, 'จำนวนที่ถูกปฏิเสธ 4xx').toBe(3 - successes);
    });
    if (successes === 1) {
      test.info().annotations.push({ type: 'note', description: 'รอบ C สำเร็จ 1 รายการทั้งที่เหลือนักบำบัด 3 คน โยง R08 และ F-สร้าง 2' });
    }

    await app.ownerRelogin();
    const admin = await app.admin();
    await admin.open(date);
    const rows = (await readRows(admin)).filter((r) => r.time.startsWith('12:00'));
    const names = rows.flatMap((r) => r.therapists);
    await app.check(admin.page.getByTestId('admin-schedule'), 'รอบ C หลังร้านไม่มีชื่อนักบำบัดซ้ำข้ามรายการ', async () => {
      expect.soft(rows.length, 'จำนวนรายการตรงกับคำขอที่สำเร็จ').toBe(successes);
      expect.soft(new Set(names).size, 'ไม่มีชื่อซ้ำ').toBe(names.length);
    });
    await app.checkValue(page, 'สรุปรอบ C: นักบำบัดไม่ซ้ำข้ามรายการ', { successes, names }, (v) => {
      expect.soft(new Set(v.names).size).toBe(v.names.length);
      expect.soft(v.names.length).toBe(v.successes * 3);
    });
  });
});

// ---------------------------------------------------------------- TC-GROUP-09

test('TC-GROUP-09 ราคากลุ่มและคู่ ลดกลุ่มเมื่อ 4 คนขึ้นไป ใช้ % เดียวที่มากสุด แขกใช้บัตรหลังลดได้', {
  tag: ['@P1', '@5.2'],
  annotation: plan({
    expected: lines(
      'แขก S01 3 คน ฿3,000 ไม่ลด · 4 คน ฿3,600 (฿4,000 − 10% ฿400) · 5 คน ฿4,500 (฿5,000 − 10% ฿500)',
      'แขก คู่ S04 ฿4,000 (฿2,000 × 2) ไม่มีบรรทัดส่วนลดคู่',
      'U08 S01 3 คน ฿2,850 (฿3,000 − 5% ฿150)',
      'U08 S01 4 คน ฿3,600 (ใช้กลุ่ม 10%) ไม่ใช่ ฿3,400 ที่ซ้อน 15%',
      'U02 S01 4 คน ไม่เลือกเดือนเกิด ฿3,600 ไม่ใช่ ฿3,200 ที่ซ้อน 20%',
      'U02 S01 4 คน เลือกเดือนเกิด ฿3,200 (฿4,000 − 20% ฿800) ไม่ใช่ ฿2,800 ที่ซ้อน 30%',
      'แขก S01 4 คน กับบัตร: ฿3,100 (฿4,000 − 10% ฿400 = ฿3,600 − ฿500) (ถ้าหักบัตรก่อนลดจะได้ ฿3,150) · ไม่ได้แต้ม',
      'ใช้ `GIFT-500` ซ้ำ: มีข้อความว่าบัตรไม่มีมูลค่าเหลือ · ยอดยัง ฿1,000 · หน้าตรวจยอดแสดง ฿0',
    ),
    source: '[D] บ.12 · [D] §4 ราคา · [R] ⚠️A-11, ⚠️A-18',
    frbr: 'FR-11, FR-14, FR-31, BR-13, BR-29',
    rules: 'R20',
    technique: 'Boundary, Equivalence partition, Happy path',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  test.setTimeout(420_000);
  const date = '2026-06-17';
  const time = '12:00';
  const summary = (service: string, party: number) => booking.toSummary({ service, party, date, time });

  await test.step('1. เลือกแต่ละกรณีตามตารางจนถึงหน้าสรุป จดราคา โดยไม่ยืนยัน', async () => {
    await summary('S01', 3);
    await checkQuote(app, booking, 'แขก S01 3 คน', { full: 3000, discount: 0, pay: 3000 });
    await summary('S01', 4);
    await checkQuote(app, booking, 'แขก S01 4 คน', { full: 4000, discount: 400, pay: 3600 });
    await summary('S01', 5);
    await checkQuote(app, booking, 'แขก S01 5 คน', { full: 5000, discount: 500, pay: 4500 });
    await summary('S04', 2);
    await checkQuote(app, booking, 'แขก คู่ S04', { full: 4000, discount: 0, pay: 4000 });
    await checkNoCoupleDiscount(app, booking, 'แขก คู่ S04 ไม่มีบรรทัดส่วนลดคู่');

    await app.login(page, 'U08');
    await summary('S01', 3);
    await checkQuote(app, booking, 'U08 S01 3 คน', { full: 3000, discount: 150, pay: 2850 });
    await summary('S01', 4);
    await checkQuote(app, booking, 'U08 S01 4 คน', { full: 4000, discount: 400, pay: 3600 });

    await app.login(page, 'U02');
    await summary('S01', 4);
    await checkQuote(app, booking, 'U02 S01 4 คน ไม่เลือกเดือนเกิด', { full: 4000, discount: 400, pay: 3600 });
    const used = await booking.tryUseBirthday();
    await app.checkValue(page, 'U02 เลือกเดือนเกิดได้', used, (v) => { expect.soft(v).toBe(true); });
    await checkQuote(app, booking, 'U02 S01 4 คน เลือกเดือนเกิด', { full: 4000, discount: 800, pay: 3200 });
    await page.context().clearCookies();
  });

  let code = NO_CODE;
  await test.step('2. แขก S01 4 คน ใส่ GIFT-500 แล้วยืนยัน รีโหลดหน้า', async () => {
    const res = await bookVia(app, booking, 'แขก S01 4 คน กับบัตร', { service: 'S01', party: 4, date, time, guest: G.G1 }, undefined, async () => {
      await booking.giftCard('GIFT-500');
      const l = await booking.lines();
      await app.check(booking.el('booking-line-giftcard'), 'หักบัตร ฿500', async () => { expect.soft(l.giftcard).toBe(500); });
      await checkQuote(app, booking, 'แขก S01 4 คน กับบัตร', { full: 4000, discount: 400, pay: 3100 });
    });
    code = res.code;
    const earned = booking.el('booking-points-earned');
    const points = (await earned.count()) > 0 ? money(await textOf(earned)) : 0;
    await app.checkValue(page, 'แขกไม่ได้แต้ม', points, (v) => { expect.soft(v).toBe(0); });
    await app.reload(page);
  });

  await test.step('3. เข้าหลังร้านดูยอดของการจองนี้', async () => {
    const admin = await app.admin();
    await admin.open(date);
    await checkRow(app, admin, 'หลังร้าน ยอดการจองนี้ ฿3,100', code, { party: 4, pay: 3100 });
  });

  await test.step('4. เริ่มจองแขก S01 1 คน ใส่ GIFT-500 อีกครั้ง แล้วเปิดหน้าตรวจยอด', async () => {
    await booking.toSummary({ service: 'S01', party: 1, date, time });
    await booking.giftCard('GIFT-500');
    await app.check(booking.el('booking-extra-giftcard'), 'ใช้บัตรซ้ำ มีข้อความว่าบัตรไม่มีมูลค่าเหลือ', async (el) => {
      await expect.soft(el).toContainText('ไม่มีมูลค่าเหลือ');
    });
    await checkPay(app, booking, 'ใช้บัตรซ้ำ ยอดยัง', 1000);
    const card = await app.readGiftCard(page, 'GIFT-500');
    await app.check(page.getByTestId('giftcard-check-balance'), 'หน้าตรวจยอด GIFT-500 แสดง ฿0', async () => {
      expect.soft(card.balance).toBe(0);
    });
  });
});

// ---------------------------------------------------------------- TC-GROUP-10

test('TC-GROUP-10 deep link ที่ค่าจำนวนคนผิด หรือระบุนักบำบัดกับจองคู่ ต้องแจ้งลูกค้า ไม่เปลี่ยนค่าเงียบ ๆ', {
  tag: ['@P2', '@5.2'],
  annotation: plan({
    expected: lines(
      '`party=0`, `-1`, `abc`: จำนวนคนไม่ใช่ 0, -1 หรือ abc · ใช้ค่าเริ่มต้น 1 คน และมีข้อความแจ้งว่าจำนวนที่ส่งมาไม่ถูกต้อง (ถ้าเป็น 1 คนเงียบ ๆ ถือว่าไม่ผ่าน) · ไม่เกิดการจองใหม่',
      '`party=3`: แสดง 3 คน',
      '`party=2&therapist=T03`: แสดง 2 คน และมีข้อความแจ้งว่าจองคู่ระบบเป็นผู้จัดนักบำบัด ไม่ถือว่าเลือก T03 (ถ้าทิ้ง T03 เงียบ ๆ ถือว่าไม่ผ่าน)',
      'การจอง: ฿4,000 (฿2,000 × 2) ใช้ Couple Suite นักบำบัด 2 คน',
    ),
    source: '[R] · F-ร้าน 3 · F-สร้าง 8',
    frbr: 'FR-17, BR-10',
    rules: 'R16, R91',
    technique: 'Negative, Equivalence partition',
    timing: 'ทันที · หลังรีโหลด · ในหน้าร้าน',
  }),
}, async ({ page, app, booking }) => {
  const date = '2026-06-17';
  const admin = await app.admin();
  await admin.open(date);
  const before = await admin.codes();

  const pressed = () => page.locator('[data-testid^="booking-party-"][aria-pressed="true"]');
  const pressedIds = () => pressed().evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid ?? ''));

  // ข้อความแจ้งต้องพูดถึงจำนวนคนว่าไม่ถูกต้อง ไม่ใช่แค่แสดง 1 คน
  const INVALID_PARTY = /จำนวน[^\n]*(ไม่ถูกต้อง|ผิด|ไม่รองรับ)|(ไม่ถูกต้อง|ผิด)[^\n]*จำนวน/;
  // ข้อความแจ้งต้องบอกว่าไม่ถือว่าเลือกนักบำบัดนั้น ไม่นับข้อความทั่วไป "ระบบจัดนักบำบัด 2 ท่าน..." บนหน้าจอ 2
  const THERAPIST_IGNORED = /ไม่ถือว่า[^\n]*เลือก|เลือกนักบำบัด[^\n]*ไม่ได้|ไม่สามารถเลือกนักบำบัด|ระบบ(เป็นผู้)?จัด[^\n]*(ไม่|แทน)[^\n]*(พี่ภูมิ|T03|เลือก)|ไม่(ได้)?ใช้[^\n]*(พี่ภูมิ|T03)/;

  await test.step('1. เปิดลิงก์ party=0, party=-1, party=abc ทีละลิงก์', async () => {
    for (const value of ['0', '-1', 'abc']) {
      await booking.open('th', `?party=${value}`);
      const ids = await pressedIds();
      await app.check(pressed(), `party=${value} ใช้ค่าเริ่มต้น 1 คน`, async () => {
        expect.soft(ids).toEqual(['booking-party-1']);
      });
      await app.check(booking.el('booking-flow'), `party=${value} มีข้อความแจ้งว่าจำนวนที่ส่งมาไม่ถูกต้อง`, async () => {
        await expect.soft(page.locator('body')).toContainText(INVALID_PARTY);
      });
    }
  });

  await test.step('2. เปิดลิงก์ party=3 ดูจำนวนคน', async () => {
    await booking.open('th', '?party=3');
    const ids = await pressedIds();
    await app.check(pressed(), 'party=3 แสดง 3 คน', async () => {
      expect.soft(ids).toEqual(['booking-party-3']);
    });
  });

  await test.step('3. เปิดลิงก์ party=2&therapist=T03 ดูจำนวนคน นักบำบัด และข้อความ', async () => {
    await booking.open('th', '?service=S04&party=2&therapist=T03');
    const ids = await pressedIds();
    await app.check(pressed(), 'party=2&therapist=T03 แสดง 2 คน', async () => {
      expect.soft(ids).toEqual(['booking-party-2']);
    });
    await app.check(booking.el('booking-flow'), 'มีข้อความแจ้งว่าจองคู่ระบบเป็นผู้จัดนักบำบัด ไม่ถือว่าเลือก T03', async () => {
      await expect.soft(page.locator('body')).toContainText(THERAPIST_IGNORED);
    });
  });

  let code = NO_CODE;
  await test.step('4. จากลิงก์ข้อ 3 เลือก 17 มิ.ย. 2026 12:00 ไปจนยืนยันด้วยแขก G1', async () => {
    let detail = '';
    let done: string | null = null;
    try {
      await booking.nextFromStep1();
      await booking.chooseDate(date);
      await booking.chooseSlot('12:00');
      await booking.nextFromStep2();
      await checkPay(app, booking, 'การจองจากลิงก์ ยอดหน้าสรุป', 4000);
      await booking.guest(G.G1.name, G.G1.phone);
      const res = await booking.confirm();
      done = res.code;
      detail = `HTTP ${res.request.responseStatus}`;
    } catch (e) {
      detail = e instanceof Error ? e.message : String(e);
    }
    await app.checkValue(page, 'จองจากลิงก์สำเร็จได้รหัสจอง', { code: done, detail: done ? '' : detail }, (v) => {
      expect.soft(v.code, v.detail).toBeTruthy();
    });
    code = done ?? NO_CODE;
  });

  await test.step('5. เข้าหลังร้านดูการจอง แล้วรีโหลด', async () => {
    await admin.open(date);
    const e: RowExpect = { party: 2, couple: true, therapistCount: 2, pay: 4000 };
    await checkRow(app, admin, 'การจอง ฿4,000 ใช้ Couple Suite นักบำบัด 2 คน', code, e);
    await reloadAdmin(app, admin, date);
    await checkRow(app, admin, 'หลังรีโหลด การจอง ฿4,000 ใช้ Couple Suite นักบำบัด 2 คน', code, e);
    const added = (await admin.codes()).filter((c) => !before.includes(c));
    await app.check(admin.page.getByTestId('admin-schedule'), 'ลิงก์ค่าผิดไม่เกิดการจองใหม่ เพิ่มเฉพาะการจองจากข้อ 4', async () => {
      expect.soft(added).toEqual([code]);
    });
    await app.checkValue(page, 'สรุป: เพิ่มการจองเฉพาะจากข้อ 4', added, (v) => { expect.soft(v).toEqual([code]); });
  });
});
