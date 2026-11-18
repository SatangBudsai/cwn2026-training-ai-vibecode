/**
 * ตัวช่วยร่วมของชุดทดสอบ Google Flights (ใช้ทุกไฟล์ใน tests/)
 *
 *   import { test, expect, U0, getU1 } from '../support/gf';
 *
 *   test('TC-XXX-01 · ชื่อ', {
 *     tag: ['@P1', '@5.1'],
 *     annotation: [
 *       { type: 'คาดหวัง', description: 'E1: ...ตามแผนคำต่อคำ...' },
 *       { type: 'ที่มา', description: 'plan/5.1-ฟอร์มค้นหา.md · TC-XXX-01 · R17 R19 · [R]' },
 *     ],
 *   }, async ({ page, gf }) => {
 *     await test.step('1. เปิด U1 รอโหลด', async () => { await gf.goto(getU1(), { search: 'เปิด U1' }); });
 *     await gf.check('E1 หัวผลลัพธ์เป็นเที่ยวเดียว', page.getByRole('combobox', { name: /ประเภทตั๋ว/ }), async () => {
 *       await expect.soft(page.getByRole('combobox', { name: /ประเภทตั๋ว/ })).toContainText('เที่ยวเดียว');
 *     });
 *   });
 *
 * สิ่งที่ fixture `gf` ทำให้อัตโนมัติ
 *  - ทำช้าแบบคน: เว้น 3–5 วินาทีระหว่างคลิก/พิมพ์ · ≥ 10 วินาทีหลังการค้นหา (TEST-PLAN 2.3, 7.3)
 *  - ตรวจ CAPTCHA / unusual traffic / หน้าบล็อก หลังทุกการกระทำ → หยุดทั้งชุดทันที (TEST-PLAN 6.6)
 *  - นับการค้นหา (เพดาน 105) และหน้า booking (เพดาน 20) ลง .state/searches.jsonl
 *  - gf.check(): ไฮไลต์กรอบแดง → ภาพหน้าจอแนบรายงาน → ตรวจด้วย expect.soft
 */
import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export { expect };

// ───────────────────────── ข้อมูลทดสอบ (TEST-PLAN หัวข้อ 7) ─────────────────────────
export const U0 = 'https://www.google.com/travel/flights?hl=th&curr=THB';
export const U1Q =
  'https://www.google.com/travel/flights?q=Flights%20to%20Tokyo%20from%20Bangkok%20on%202026-12-15%20one%20way&hl=th&curr=THB';
export const SEARCH_CAP = 105;
export const BOOKING_CAP = 20;

const E2E_ROOT = path.resolve(__dirname, '..');
export const STATE_DIR = path.join(E2E_ROOT, '.state');
const STOP_FILE = path.join(STATE_DIR, 'STOP.json');
const SEARCH_LOG = path.join(STATE_DIR, 'searches.jsonl');
const KV_FILE = path.join(STATE_DIR, 'kv.json');

function ensureState() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

// ───────────────────────── ค่าที่ test ส่งต่อกัน (U1, UB, D-BKG-… ฯลฯ) ─────────────────────────
export function saveState(key: string, value: unknown) {
  ensureState();
  let kv: Record<string, unknown> = {};
  try { kv = JSON.parse(fs.readFileSync(KV_FILE, 'utf8')); } catch { /* ไฟล์ยังไม่มี */ }
  kv[key] = value;
  fs.writeFileSync(KV_FILE, JSON.stringify(kv, null, 2), 'utf8');
}
export function loadState<T = string>(key: string): T | undefined {
  try { return JSON.parse(fs.readFileSync(KV_FILE, 'utf8'))[key] as T; } catch { return undefined; }
}
/** U1 ที่ TC-SRCH-01 เก็บไว้ (ถ้าไม่มีใช้ U1q ตาม EN6) */
export function getU1(): string {
  return loadState<string>('U1') || U1Q;
}

// ───────────────────────── หยุดทั้งชุด ─────────────────────────
export function stopInfo(): { reason: string; test: string; url: string; at: string } | undefined {
  try { return JSON.parse(fs.readFileSync(STOP_FILE, 'utf8')); } catch { return undefined; }
}
function writeStop(reason: string, test: string, url: string) {
  ensureState();
  if (!fs.existsSync(STOP_FILE)) {
    fs.writeFileSync(STOP_FILE, JSON.stringify({ reason, test, url, at: new Date().toISOString() }, null, 2), 'utf8');
  }
}

export class SuiteStopError extends Error {}

// ───────────────────────── นับการค้นหา ─────────────────────────
function readSearchLog(): { test: string; kind: 'search' | 'booking'; reason: string; at: string }[] {
  try {
    return fs.readFileSync(SEARCH_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}
export function searchTotals() {
  const log = readSearchLog();
  return { search: log.filter((l) => l.kind === 'search').length, booking: log.filter((l) => l.kind === 'booking').length };
}

const BLOCK_TEXT = /unusual traffic|our systems have detected|not a robot|การเข้าชมที่ผิดปกติ|ตรวจพบการเข้าชมที่ผิดปกติ|ไม่ใช่โปรแกรมอัตโนมัติ|ไม่ใช่หุ่นยนต์/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

export type CheckRecord = { n: number; label: string; status: 'pass' | 'fail' | 'na'; shot?: string; t: number; note?: string };

export class GF {
  readonly t0 = Date.now();
  private checkNo = 0;
  readonly checks: CheckRecord[] = [];
  /** หน้าที่ใช้ทำงานอยู่ (เปลี่ยนได้เมื่อเปิดแท็บใหม่ ใช้ gf.use(newPage)) */
  page: Page;

  constructor(page: Page, private testInfo: TestInfo) {
    this.page = page;
    page.on('response', (res) => {
      try {
        if (res.request().isNavigationRequest() && res.request().frame() === page.mainFrame()) {
          const st = res.status();
          if (st === 429 || (st === 403 && /google\./.test(res.url()))) {
            writeStop(`HTTP ${st} (หน้าถูกบล็อก)`, this.testId(), res.url());
          }
        }
      } catch { /* ignore */ }
    });
  }

  testId(): string {
    return (this.testInfo.title.match(/TC-[A-Z]+-\d+/) || [this.testInfo.title])[0];
  }

  /** ใช้หน้าอื่น (เช่น แท็บใหม่) เป็นหน้าทำงาน */
  use(page: Page) { this.page = page; return page; }

  // ── จังหวะแบบคน ──
  async pause(min = 3000, max = 5000) {
    await sleep(rand(min, max));
    await this.assertNotBlocked();
  }

  /** ตรวจ CAPTCHA / unusual traffic / หน้าบล็อก → ถ้าเจอ หยุดทั้งชุดทันที */
  async assertNotBlocked(page: Page = this.page) {
    const stop = stopInfo();
    if (stop) throw new SuiteStopError(`🛑 หยุดทั้งชุด: ${stop.reason} (เจอใน ${stop.test} · ${stop.url})`);
    let reason = '';
    const url = page.url();
    if (/google\.[a-z.]+\/sorry\//.test(url) || /\/sorry\/index/.test(url)) reason = 'หน้า google.com/sorry (unusual traffic)';
    if (!reason) {
      const cap = page.locator('iframe[src*="recaptcha"], iframe[title*="reCAPTCHA" i], #captcha-form, form[action*="sorry"]');
      const n = await cap.count().catch(() => 0);
      for (let i = 0; i < n && !reason; i++) {
        const box = await cap.nth(i).boundingBox().catch(() => null);
        if (box && box.width > 60 && box.height > 40) reason = 'พบ reCAPTCHA บนหน้า';
      }
    }
    if (!reason) {
      const body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      // หน้าบล็อกมักสั้น — ตรวจเฉพาะข้อความต้นหน้าเพื่อเลี่ยงคำที่บังเอิญอยู่ในเนื้อหา
      if (BLOCK_TEXT.test(body.slice(0, 3000))) reason = 'ข้อความ unusual traffic / ยืนยันว่าไม่ใช่โปรแกรมอัตโนมัติ';
    }
    if (reason) {
      writeStop(reason, this.testId(), url);
      const shot = this.testInfo.outputPath('BLOCKED.png');
      await page.screenshot({ path: shot }).catch(() => {});
      await this.testInfo.attach('หลักฐาน CAPTCHA/บล็อก', { path: shot, contentType: 'image/png' }).catch(() => {});
      this.testInfo.annotations.push({ type: 'blocked', description: reason });
      throw new SuiteStopError(`🛑 เจอ ${reason} ที่ ${url} → หยุดทั้งชุดทันที`);
    }
  }

  // ── นับการค้นหา ──
  private log(kind: 'search' | 'booking', reason: string) {
    ensureState();
    const totals = searchTotals();
    if (kind === 'search' && totals.search >= SEARCH_CAP) {
      writeStop(`งบการค้นหาครบ ${SEARCH_CAP} ครั้ง`, this.testId(), this.page.url());
      throw new SuiteStopError(`🛑 งบการค้นหาครบ ${SEARCH_CAP} ครั้งแล้ว (TEST-PLAN 6.6)`);
    }
    if (kind === 'booking' && totals.booking >= BOOKING_CAP) {
      writeStop(`หน้า booking ครบ ${BOOKING_CAP} หน้า`, this.testId(), this.page.url());
      throw new SuiteStopError(`🛑 หน้า booking ครบ ${BOOKING_CAP} หน้าแล้ว`);
    }
    fs.appendFileSync(SEARCH_LOG, JSON.stringify({ test: this.testId(), kind, reason, at: new Date().toISOString() }) + '\n', 'utf8');
    this.testInfo.annotations.push({ type: kind === 'search' ? 'การค้นหา' : 'หน้า booking', description: reason });
  }

  /** บันทึกว่าการกระทำที่เพิ่งทำโหลดผลเที่ยวบินใหม่ (= 1 การค้นหา) แล้วรอ ≥ 10 วินาที */
  async searched(reason: string, waitMs = 10_000) {
    this.log('search', reason);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(waitMs + rand(0, 2000));
    await this.assertNotBlocked();
  }

  /** บันทึกการเปิดหน้า booking 1 หน้า แล้วรอ ≥ 10 วินาที */
  async bookingOpened(reason: string, waitMs = 10_000) {
    this.log('booking', reason);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(waitMs + rand(0, 2000));
    await this.assertNotBlocked();
  }

  // ── การกระทำแบบคน ──
  /** เปิด URL · ถ้า search ระบุ = นับเป็นการค้นหาและรอ ≥ 10 วิ · ถ้า booking ระบุ = นับเป็นหน้า booking */
  async goto(url: string, opts: { search?: string; booking?: string } = {}) {
    await this.assertNotBlocked();
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.assertNotBlocked();
    if (opts.search) await this.searched(opts.search);
    else if (opts.booking) await this.bookingOpened(opts.booking);
    else await this.pause();
  }

  /** คลิกแบบคน: เลื่อนให้เห็น → hover → รอ → คลิก → รอ 3–5 วิ (ถ้า search ระบุ = นับการค้นหาและรอ ≥ 10 วิ) */
  async click(target: Locator, opts: { search?: string; booking?: string; force?: boolean } = {}) {
    await this.assertNotBlocked();
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.hover({ timeout: 10_000 }).catch(() => {});
    await sleep(rand(400, 900));
    await target.click({ force: opts.force });
    if (opts.search) await this.searched(opts.search);
    else if (opts.booking) await this.bookingOpened(opts.booking);
    else await this.pause();
  }

  /** พิมพ์ทีละตัวแบบคน (ล้างของเดิมก่อนถ้า clear = true) */
  async type(target: Locator, text: string, opts: { clear?: boolean; enter?: boolean; search?: string } = {}) {
    await this.assertNotBlocked();
    await target.click();
    await sleep(rand(300, 700));
    if (opts.clear) {
      await target.press('Control+A');
      await target.press('Backspace');
      await sleep(rand(300, 600));
    }
    await target.pressSequentially(text, { delay: rand(110, 180) });
    if (opts.enter) { await sleep(rand(500, 900)); await target.press('Enter'); }
    if (opts.search) await this.searched(opts.search);
    else await this.pause();
  }

  /** กดปุ่มคีย์บอร์ด (Escape, Enter, ...) */
  async press(key: string, opts: { search?: string } = {}) {
    await this.page.keyboard.press(key);
    if (opts.search) await this.searched(opts.search);
    else await this.pause();
  }

  // ── ไฮไลต์ + ตรวจ ──
  private async highlight(targets: Locator[], label: string) {
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    for (const t of targets) {
      const n = Math.min(await t.count().catch(() => 0), 40);
      for (let i = 0; i < n; i++) {
        const el = n === 1 ? t : t.nth(i);
        if (boxes.length === 0) await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
        const b = await el.boundingBox().catch(() => null);
        if (b && b.width > 0 && b.height > 0) boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height });
      }
    }
    await this.page.evaluate(({ boxes, label }) => {
      document.querySelectorAll('[data-e2e-hl]').forEach((e) => e.remove());
      const sx = window.scrollX, sy = window.scrollY;
      for (const b of boxes) {
        const d = document.createElement('div');
        d.setAttribute('data-e2e-hl', '1');
        Object.assign(d.style, {
          position: 'absolute', left: `${b.x + sx - 4}px`, top: `${b.y + sy - 4}px`, width: `${b.w + 8}px`, height: `${b.h + 8}px`,
          border: '4px solid #ff0000', borderRadius: '6px', boxSizing: 'border-box', zIndex: '2147483647', pointerEvents: 'none',
          boxShadow: '0 0 0 2px rgba(255,255,255,.85)',
        });
        document.body.appendChild(d);
      }
      const tag = document.createElement('div');
      tag.setAttribute('data-e2e-hl', '1');
      tag.textContent = '🔍 ' + label;
      Object.assign(tag.style, {
        position: 'fixed', left: '8px', bottom: '8px', maxWidth: '90vw', padding: '6px 10px', background: '#d00000', color: '#fff',
        font: '600 14px/1.35 sans-serif', borderRadius: '6px', zIndex: '2147483647', pointerEvents: 'none',
      });
      document.body.appendChild(tag);
    }, { boxes, label }).catch(() => {});
    return boxes.length;
  }

  private async unhighlight() {
    await this.page.evaluate(() => document.querySelectorAll('[data-e2e-hl]').forEach((e) => e.remove())).catch(() => {});
  }

  /**
   * ตรวจ 1 จุด: ไฮไลต์ element ที่ตรวจด้วยกรอบแดง → ภาพหน้าจอ (แนบรายงาน) → รัน assertion (ใช้ expect.soft ภายใน)
   * error ที่ throw ภายใน assertion จะถูกแปลงเป็นความล้มแบบ soft ของจุดนั้น (test เดินต่อ)
   */
  async check(label: string, target: Locator | Locator[] | null, assertion: () => Promise<unknown> | unknown) {
    await this.assertNotBlocked();
    const n = ++this.checkNo;
    return base.step(`ตรวจ ${label}`, async () => {
      const targets = target ? (Array.isArray(target) ? target : [target]) : [];
      const t = Date.now() - this.t0;
      await this.highlight(targets, label);
      await sleep(500);
      const shot = this.testInfo.outputPath(`check-${String(n).padStart(2, '0')}.png`);
      await this.page.screenshot({ path: shot }).catch(() => {});
      await this.testInfo.attach(`ตรวจ ${String(n).padStart(2, '0')}: ${label}`, { path: shot, contentType: 'image/png' }).catch(() => {});
      const before = this.testInfo.errors.length;
      let note: string | undefined;
      try {
        await assertion();
      } catch (e: any) {
        if (e instanceof SuiteStopError) throw e;
        note = String(e?.message || e).split('\n')[0];
        expect.soft(note, `${label}`).toBe('(ผ่าน)');
      }
      const status: CheckRecord['status'] = this.testInfo.errors.length > before ? 'fail' : 'pass';
      const rec: CheckRecord = { n, label, status, shot: path.basename(shot), t, note };
      this.checks.push(rec);
      this.testInfo.annotations.push({ type: 'check', description: JSON.stringify(rec) });
      await sleep(1000);
      await this.unhighlight();
      await sleep(rand(800, 1500));
      return status;
    });
  }

  /** บันทึกจุดตรวจที่เป็น N/A ตามเงื่อนไขในแผน (เช่น วันรันไม่มีแถว codeshare) — ไม่นับเป็นล้ม */
  na(label: string, reason: string) {
    const n = ++this.checkNo;
    const rec: CheckRecord = { n, label, status: 'na', t: Date.now() - this.t0, note: reason };
    this.checks.push(rec);
    this.testInfo.annotations.push({ type: 'check', description: JSON.stringify(rec) });
    this.testInfo.annotations.push({ type: 'N/A', description: `${label}: ${reason}` });
  }

  /** เรียกท้าย test: ถ้าไม่มีจุดไหนตรวจได้จริงเลย (N/A ทั้งข้อ ตาม 6.2) → ทำเครื่องหมายข้าม */
  finishNA() {
    if (this.checks.length > 0 && this.checks.every((c) => c.status === 'na')) {
      this.testInfo.annotations.push({ type: 'na-all', description: 'N/A ทั้งข้อ: ไม่มีผลที่คาดหวังข้อไหนตรวจได้ในวันรัน' });
      base.skip(true, 'N/A ทั้งข้อ (TEST-PLAN 6.2)');
    }
  }
}

type Fixtures = { gf: GF };

export const test = base.extend<Fixtures>({
  gf: async ({ page }, use, testInfo) => {
    const stop = stopInfo();
    if (stop) {
      testInfo.annotations.push({ type: 'not-run', description: `ไม่ได้รัน: หยุดทั้งชุดเพราะ ${stop.reason} (${stop.test})` });
      base.skip(true, `ไม่ได้รัน: หยุดทั้งชุดเพราะ ${stop.reason}`);
    }
    const gf = new GF(page, testInfo);
    page.context().on('page', (p) => {
      p.on('response', (res) => {
        try {
          if (res.request().isNavigationRequest() && (res.status() === 429)) writeStop('HTTP 429 (แท็บใหม่)', gf.testId(), res.url());
        } catch { /* ignore */ }
      });
    });
    await use(gf);
    // ตรวจรอบสุดท้ายหลังจบ test (ไม่ทับ error เดิม)
    if (!stopInfo()) {
      for (const p of page.context().pages()) {
        await gf.assertNotBlocked(p).catch((e) => {
          if (e instanceof SuiteStopError) testInfo.annotations.push({ type: 'blocked', description: e.message });
        });
      }
    }
  },
});
