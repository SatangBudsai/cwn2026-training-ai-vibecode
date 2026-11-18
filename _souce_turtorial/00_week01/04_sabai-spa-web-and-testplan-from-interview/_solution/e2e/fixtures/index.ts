/**
 * Fixture กลางของชุดทดสอบ สบายใจ สปา
 *
 * import { test, expect, plan, LOCK, USERS } from '../fixtures';
 *
 * test('TC-XXX-01 ชื่อ', { tag: ['@P1', '@5.1'], annotation: plan({ expected, source, frbr, rules, technique }) },
 *   async ({ page, app, booking }) => { ... });
 *
 * - ก่อนทุก test: ล็อก LOCK แล้วรีเซ็ต อัตโนมัติ (ล็อกก่อนรีเซ็ตเสมอ)
 * - ทุก context อัดวิดีโอบน project chromium รวม app.actor() และ app.owner()
 * - app.check / app.checkValue ไฮไลต์กรอบแดง ตรวจด้วย expect.soft แล้วเก็บภาพตอนตรวจ
 */
import { test as base, expect, request as pwRequest, type APIRequestContext, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export { expect };

// ---------------------------------------------------------------- ข้อมูลจาก TEST-DATA.md

export const LOCK = '2026-06-15T10:00:00+07:00';

export const USERS = {
  U01: { email: 'nida@sabai.test', password: 'Nida#2026', name: 'คุณนิดา' },
  U02: { email: 'ton@sabai.test', password: 'Ton#2026', name: 'คุณต้น' },
  U03: { email: 'fon@sabai.test', password: 'Fon#2026', name: 'คุณฝน' },
  U04: { email: 'may@sabai.test', password: 'May#2026', name: 'คุณเมย์' },
  U05: { email: 'prae@sabai.test', password: 'Prae#2026', name: 'น้องแพร' },
  U06: { email: 'liwei@sabai.test', password: 'LiWei#2026', name: 'Mr. Li Wei' },
  U07: { email: 'owner@sabai.test', password: 'Owner#2026', name: 'คุณจันทร์' },
  U08: { email: 'kan@sabai.test', password: 'Kan#2026', name: 'คุณกานต์' },
  U09: { email: 'win@sabai.test', password: 'Win#2026', name: 'คุณวิน' },
  U10: { email: 'bee@sabai.test', password: 'Bee#2026', name: 'คุณบี' },
  U11: { email: 'por@sabai.test', password: 'Por#2026', name: 'คุณปอ' },
  U12: { email: 'muk@sabai.test', password: 'Muk#2026', name: 'คุณมุก' },
} as const;
export type UserKey = keyof typeof USERS;
export type Credentials = { email: string; password: string };

// ---------------------------------------------------------------- annotation จากแผน

export type PlanMeta = {
  /** ผลที่คาดหวังจากแผน (คัดลอกตัวเลขและข้อความตามแผน ห้ามเปลี่ยนตามเว็บ) */
  expected: string;
  /** ช่อง "ที่มา" ของแผน */
  source: string;
  /** ช่อง FR/BR */
  frbr: string;
  /** ช่อง "อ้างกฎ (R..)" */
  rules?: string;
  /** ช่อง "เทคนิค" */
  technique?: string;
  /** ช่อง "จังหวะตรวจ" */
  timing?: string;
};

export function plan(meta: PlanMeta) {
  const a = [
    { type: 'expected', description: meta.expected },
    { type: 'source', description: meta.source },
    { type: 'fr-br', description: meta.frbr },
  ];
  if (meta.rules) a.push({ type: 'rules', description: meta.rules });
  if (meta.technique) a.push({ type: 'technique', description: meta.technique });
  if (meta.timing) a.push({ type: 'timing', description: meta.timing });
  return a;
}

// ---------------------------------------------------------------- ค่าตัวเลขบนจอ

/** ดึงเลขเงินหรือจำนวนจากข้อความ: "จ่ายหน้าร้าน ฿1,300" → 1300 · "−฿50" → 50 · "1,000 泰铢" → 1000 · ไม่มีเลข → NaN */
export function money(text: string | null | undefined): number {
  const m = /(\d[\d,]*)(?:\.\d+)?/.exec(text ?? '');
  return m ? Number(m[1].replace(/,/g, '')) : NaN;
}

const CURRENCY_RE = /(฿\s?-?\d[\d,]*|\d[\d,]*\s?泰铢)/;
/** ยอดเงินตัวสุดท้ายในบรรทัด เช่น "ราคาเต็ม 2 คน ฿2,000" → 2000 (ไม่หยิบเลข 2 ของจำนวนคน) */
export function lineAmount(text: string | null | undefined): number {
  const all = (text ?? '').match(new RegExp(CURRENCY_RE, 'g'));
  return all?.length ? money(all[all.length - 1]) : NaN;
}

// ---------------------------------------------------------------- หลักฐาน

type CheckRecord = {
  n: number;
  label: string;
  pass: boolean;
  actual: string;
  shot: string;
  actor: string;
  /** มิลลิวินาทีนับจากต้นวิดีโอของ actor นี้ */
  t: number;
};

const REPORT_DIR = path.resolve('test-report');
const HOLD_MS = Number(process.env.EVIDENCE_HOLD_MS ?? 450);

type Actor = { label: string; context: BrowserContext; page: Page; pageStart: number };

function idOf(testInfo: TestInfo) {
  return testInfo.title.split(' ')[0];
}

const HIGHLIGHT_CSS = '3px solid #ff0000';

async function paintFrame(target: Locator, on: boolean) {
  await target.evaluateAll((els, args) => {
    for (const el of els as HTMLElement[]) {
      if (args.on) {
        el.dataset.e2ePrevOutline = el.style.outline || '';
        el.style.outline = args.css;
        el.style.outlineOffset = '2px';
      } else {
        el.style.outline = el.dataset.e2ePrevOutline || '';
        el.style.outlineOffset = '';
      }
    }
  }, { on, css: HIGHLIGHT_CSS }).catch(() => {});
}

// ---------------------------------------------------------------- ติดตามคำขอ API ของหน้า

type Tracked = { inflight: number; log: { method: string; url: string; postData: string | null; contentType: string; at: number }[] };
const trackers = new WeakMap<Page, Tracked>();

function track(page: Page): Tracked {
  const existing = trackers.get(page);
  if (existing) return existing;
  const t: Tracked = { inflight: 0, log: [] };
  trackers.set(page, t);
  page.on('request', (r) => {
    t.log.push({ method: r.method(), url: r.url(), postData: r.postData(), contentType: r.headers()['content-type'] ?? '', at: Date.now() });
    if (r.url().includes('/api/')) t.inflight++;
  });
  const done = (r: { url(): string }) => { if (r.url().includes('/api/')) t.inflight = Math.max(0, t.inflight - 1); };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  return t;
}

/** รอจนไม่มีคำขอ /api/ ค้างอย่างน้อย 250ms (ใช้ก่อนอ่านราคาบนจอหรือรอบเวลา) */
export async function settle(page: Page, timeoutMs = 10_000) {
  const t = track(page);
  const end = Date.now() + timeoutMs;
  let quietSince = 0;
  await page.waitForTimeout(60);
  while (Date.now() < end) {
    if (t.inflight === 0) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince >= 250) return;
    } else {
      quietSince = 0;
    }
    await page.waitForTimeout(40);
  }
}

// ---------------------------------------------------------------- คำขอที่ดึงจาก Network

export type CapturedRequest = {
  method: string;
  /** path เช่น /api/bookings */
  url: string;
  body: any;
  headers: Record<string, string>;
  responseStatus: number;
  responseBody: any;
};
export type ApiResult = { status: number; body: any; text: string; contentType: string };

// ---------------------------------------------------------------- App

export class App {
  private actors: Actor[] = [];
  private ownerActor?: Actor;
  private apis: APIRequestContext[] = [];
  private records: CheckRecord[] = [];
  private seq = 0;
  readonly id: string;
  readonly isChromium: boolean;

  constructor(
    private readonly browser: Browser,
    readonly testInfo: TestInfo,
    readonly baseURL: string,
    readonly main: Actor,
  ) {
    this.actors.push(main);
    this.id = idOf(testInfo);
    this.isChromium = testInfo.project.name === 'chromium';
    // รันซ้ำแล้วต้องไม่มีภาพหรือวิดีโอของรอบก่อนค้างปน
    fs.rmSync(path.join(REPORT_DIR, 'shots', testInfo.project.name, this.id), { recursive: true, force: true });
    if (this.isChromium) fs.rmSync(path.join(REPORT_DIR, 'videos', this.id), { recursive: true, force: true });
  }

  // ---- เครื่องมือของเว็บ

  /** ล็อกก่อนแล้วรีเซ็ตตาม D-24 · cookie ของผู้ใช้ยังอยู่ แต่แผนหลายข้อสั่งให้ login ใหม่ */
  async lockAndReset(now: string = LOCK) {
    await this.lock(now);
    const api = await this.guestApi();
    const res = await api.post('/api/test/reset', { data: { now } });
    if (!res.ok()) throw new Error(`reset ไม่สำเร็จ ${res.status()}`);
  }

  /** ล็อกอย่างเดียว ไม่รีเซ็ต */
  async lock(now: string) {
    const api = await this.guestApi();
    const res = await api.post('/api/test/lock', { data: { now } });
    if (!res.ok()) throw new Error(`lock ไม่สำเร็จ ${res.status()}`);
  }

  // ---- หน้าเว็บ

  /** เปิดหน้าแล้วรอ html[data-ready=true] ตาม SPEC ข้อ 2 */
  async goto(page: Page, urlPath: string) {
    track(page);
    await page.goto(urlPath);
    await page.waitForSelector('html[data-ready="true"]', { timeout: 20_000 });
    await settle(page);
  }

  async reload(page: Page) {
    await page.reload();
    await page.waitForSelector('html[data-ready="true"]', { timeout: 20_000 });
    await settle(page);
  }

  /** เข้าสู่ระบบผ่านหน้าเว็บ · ถ้า user เป็นรหัส เช่น 'U08' ใช้ค่าจาก USERS */
  async login(page: Page, user: UserKey | Credentials, locale = 'th') {
    const u = typeof user === 'string' ? USERS[user] : user;
    await page.context().clearCookies();
    await this.goto(page, `/${locale}/login`);
    await page.getByTestId('login-email').fill(u.email);
    await page.getByTestId('login-password').fill(u.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 });
    await page.waitForSelector('html[data-ready="true"]');
    await settle(page);
  }

  /** ออกจากระบบผ่านปุ่มในหน้าบัญชี */
  async logout(page: Page, locale = 'th') {
    await this.goto(page, `/${locale}/account`);
    await page.getByTestId('account-logout').click();
    await page.getByTestId('header-login').waitFor({ state: 'visible', timeout: 10_000 });
    await settle(page);
  }

  /** อ่านระดับ ยอด แต้ม จาก /account บนหน้าจอ */
  async readAccount(page: Page, locale = 'th') {
    await this.goto(page, `/${locale}/account`);
    await page.getByTestId('account-points').waitFor({ state: 'visible' });
    return {
      tier: (await page.getByTestId('account-tier').innerText()).trim(),
      spend: money(await page.getByTestId('account-spend').innerText()),
      points: money(await page.getByTestId('account-points').innerText()),
      nextTier: await page.getByTestId('account-next-tier').innerText({ timeout: 800 }).catch(() => ''),
    };
  }

  /** ตรวจยอดบัตรบนหน้า /gift-cards · คืน { found, balance, status, expires, initial, errorText } */
  async readGiftCard(page: Page, code: string, locale = 'th') {
    await this.goto(page, `/${locale}/gift-cards`);
    await page.getByTestId('giftcard-check-code').fill(code);
    await page.getByTestId('giftcard-check-submit').click();
    await settle(page);
    const result = page.getByTestId('giftcard-check-result');
    const found = await result.isVisible().catch(() => false);
    if (!found) {
      const errorText = await page.getByTestId('giftcard-check-section').innerText().catch(() => '');
      return { found, balance: NaN, status: '', expires: '', initial: NaN, errorText };
    }
    return {
      found,
      balance: lineAmount(await page.getByTestId('giftcard-check-balance').innerText()),
      status: await page.getByTestId('giftcard-check-status').innerText().catch(() => ''),
      expires: await page.getByTestId('giftcard-check-expires').innerText().catch(() => ''),
      initial: lineAmount(await page.getByTestId('giftcard-check-initial').innerText().catch(() => '')),
      errorText: '',
    };
  }

  // ---- context เพิ่ม

  /** browser context แยก อัดวิดีโอด้วย เช่น บริบท A/B หรือลูกค้าคนที่สอง */
  async actor(label: string): Promise<Actor> {
    const a = await createActor(this.browser, this.testInfo, this.baseURL, label);
    this.actors.push(a);
    return a;
  }

  /** หน้าของบัญชีร้าน U07 ใน context แยก login แล้วและเปิดซ้ำได้ตลอด test */
  async owner(): Promise<Page> {
    if (!this.ownerActor) {
      this.ownerActor = await this.actor('owner');
      await this.login(this.ownerActor.page, 'U07');
    }
    return this.ownerActor.page;
  }

  /** ให้ context ของร้าน login ใหม่ (ใช้ถ้าแผนสั่ง login ใหม่) */
  async ownerRelogin(): Promise<Page> {
    const page = await this.owner();
    await page.context().clearCookies();
    await this.login(page, 'U07');
    return page;
  }

  /** ตัวช่วยหลังร้าน ถ้าไม่ส่ง page ใช้บัญชีร้าน */
  async admin(page?: Page) {
    return new AdminHelper(this, page ?? (await this.owner()));
  }

  // ---- API

  /** คำขอแบบไม่มี cookie (แขก) ส่ง x-locale ตามภาษา · context ใหม่ทุกครั้งที่เรียก */
  async guestApi(locale = 'th'): Promise<APIRequestContext> {
    const api = await pwRequest.newContext({ baseURL: this.baseURL, extraHTTPHeaders: { 'x-locale': locale } });
    this.apis.push(api);
    return api;
  }

  /** ยิง POST/GET ใน session ของหน้า (page.request ใช้ cookie ร่วมกับหน้านั้น) หรือจาก guestApi() */
  async send(ctx: APIRequestContext | Page, method: string, url: string, body?: unknown, locale = 'th'): Promise<ApiResult> {
    const api = 'request' in ctx ? (ctx as Page).request : (ctx as APIRequestContext);
    const res = await api.fetch(url, { method, data: body === undefined ? undefined : (body as any), headers: { 'x-locale': locale }, failOnStatusCode: false });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* ไม่ใช่ JSON */ }
    return { status: res.status(), body: parsed, text, contentType: res.headers()['content-type'] ?? '' };
  }

  /**
   * ดึงคำขอจริงจาก Network ของการกดบนหน้าเว็บ ตามแผนข้อ 2.4:
   *   const req = await app.capture(page, /\/api\/bookings$/, () => page.getByTestId('booking-confirm').click());
   * ได้ path, body และผลตอบกลับ
   */
  async capture(page: Page, urlPattern: RegExp, action: () => Promise<unknown>, method = 'POST'): Promise<CapturedRequest> {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === method && urlPattern.test(new URL(r.url()).pathname), { timeout: 20_000 }),
      action(),
    ]);
    const req = response.request();
    let responseBody: any = null;
    try { responseBody = await response.json(); } catch { /* ไม่ใช่ JSON */ }
    const u = new URL(req.url());
    return {
      method: req.method(),
      url: u.pathname + u.search,
      body: req.postDataJSON(),
      headers: req.headers(),
      responseStatus: response.status(),
      responseBody,
    };
  }

  /** ยิงคำขอที่ capture ไว้ซ้ำ โดยแก้ body (patch) และลบ key ได้ เช่น remove:['expectedPayAtShop'] */
  async replay(ctx: APIRequestContext | Page, captured: CapturedRequest, patch: Record<string, unknown> = {}, opts: { remove?: string[]; locale?: string; url?: string } = {}): Promise<ApiResult> {
    const body = captured.body == null ? undefined : { ...captured.body, ...patch };
    for (const k of opts.remove ?? []) if (body) delete body[k];
    return this.send(ctx, captured.method, opts.url ?? captured.url, body, opts.locale ?? 'th');
  }

  /** คลิกเมาส์จริง 2 ครั้งติดกันที่กลาง element ไม่รอคำตอบระหว่างคลิก (ไม่ใช่ dblclick) สำหรับ test "กดซ้ำ" */
  async clickTwice(target: Locator) {
    const page = target.page();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error('หา element ที่จะคลิกซ้ำไม่พบ');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.mouse.click(x, y);
  }

  /** รายการคำขอทั้งหมดของหน้านี้ตั้งแต่เปิด (ใช้ตรวจว่าไม่มี request ออกนอกเว็บหรือมีข้อมูลรูป) */
  requestsOf(page: Page) {
    return track(page).log;
  }

  // ---- จุดตรวจ

  private actorOf(page: Page): Actor | undefined {
    return this.actors.find((a) => a.page === page);
  }

  private async shoot(page: Page, label: string, pass: boolean, actual: string) {
    const n = ++this.seq;
    const dir = path.join(REPORT_DIR, 'shots', this.testInfo.project.name, this.id);
    fs.mkdirSync(dir, { recursive: true });
    const name = `${String(n).padStart(3, '0')}.jpg`;
    const actor = this.actorOf(page);
    await page.screenshot({ path: path.join(dir, name), type: 'jpeg', quality: 72 }).catch(() => {});
    this.records.push({
      n, label, pass, actual: actual.slice(0, 500),
      shot: `shots/${this.testInfo.project.name}/${this.id}/${name}`,
      actor: actor?.label ?? 'main',
      t: Date.now() - (actor?.pageStart ?? Date.now()),
    });
  }

  /**
   * จุดตรวจบนหน้าเว็บ: ไฮไลต์ `target` ด้วยกรอบแดง → รัน assertions (ใช้ expect.soft เท่านั้น) → เก็บภาพ
   *   await app.check(page.getByTestId('booking-pay-at-shop'), 'ยอดหน้าสรุป ฿950', async (el) => {
   *     await expect.soft(el).toContainText('฿950');
   *   });
   * ตรวจว่าไม่มี element: ส่ง target เป็นกล่องที่ครอบอยู่ แล้วตรวจ toHaveCount(0) ใน assertions
   */
  async check(target: Locator, label: string, assertions: (el: Locator) => Promise<unknown>) {
    const page = target.page();
    const before = this.testInfo.errors.length;
    await target.first().waitFor({ state: 'attached', timeout: 2_500 }).catch(() => {});
    await target.first().scrollIntoViewIfNeeded({ timeout: 1_500 }).catch(() => {});
    await paintFrame(target, true);
    await page.waitForTimeout(HOLD_MS);
    let thrown: unknown;
    try { await assertions(target); } catch (e) { thrown = e; }
    await paintFrame(target, true); // เผื่อ element ถูก render ใหม่ระหว่างรอ
    const actual = await target.first().innerText({ timeout: 800 }).catch(async () => target.first().inputValue({ timeout: 300 }).catch(() => '(ไม่พบ element)'));
    const pass = !thrown && this.testInfo.errors.length === before;
    await this.shoot(page, label, pass, actual.replace(/\s+/g, ' '));
    await page.waitForTimeout(HOLD_MS);
    await paintFrame(target, false);
    if (thrown) throw thrown;
  }

  /**
   * จุดตรวจค่าที่ไม่ได้อยู่บนจอ เช่น ผล API: แสดงกล่องกรอบแดงทับหน้า (actual ที่อ่านได้) → ตรวจ → เก็บภาพ
   *   await app.checkValue(page, 'ยิง 09:30 ถูกปฏิเสธ 4xx', res.status, (v) => {
   *     expect.soft(v).toBeGreaterThanOrEqual(400); expect.soft(v).toBeLessThan(500);
   *   });
   */
  async checkValue<T>(page: Page, label: string, actual: T, assertions: (value: T) => unknown) {
    const before = this.testInfo.errors.length;
    const shown = typeof actual === 'string' ? actual : JSON.stringify(actual);
    await page.evaluate(({ label, shown }) => {
      document.getElementById('__e2e_value')?.remove();
      const box = document.createElement('div');
      box.id = '__e2e_value';
      box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;background:#fff;color:#111;border:3px solid #ff0000;padding:12px 16px;font:15px/1.5 system-ui,Tahoma,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.35);max-height:45vh;overflow:hidden;white-space:pre-wrap;word-break:break-word';
      const t = document.createElement('b'); t.textContent = label;
      const v = document.createElement('div'); v.textContent = 'ผลที่อ่านได้: ' + String(shown).slice(0, 600);
      box.append(t, v);
      (document.body ?? document.documentElement).append(box);
    }, { label, shown }).catch(() => {});
    await page.waitForTimeout(HOLD_MS);
    let thrown: unknown;
    try { await assertions(actual); } catch (e) { thrown = e; }
    const pass = !thrown && this.testInfo.errors.length === before;
    await this.shoot(page, label, pass, shown);
    await page.waitForTimeout(HOLD_MS);
    await page.evaluate(() => document.getElementById('__e2e_value')?.remove()).catch(() => {});
    if (thrown) throw thrown;
  }

  // ---- ปิดท้าย (เรียกจาก fixture)

  async finish() {
    for (const api of this.apis) await api.dispose().catch(() => {});
    const project = this.testInfo.project.name;
    const videos: Record<string, { file: string }> = {};
    const closing = this.actors.map(async (a) => {
      const video = a.page.video();
      await a.context.close().catch(() => {});
      if (video && this.isChromium) {
        const rel = `videos/${this.id}/${a.label.replace(/[^\w-]/g, '_')}.webm`;
        const dest = path.join(REPORT_DIR, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await video.saveAs(dest).then(() => { videos[a.label] = { file: rel }; }).catch(() => {});
      }
    });
    await Promise.all(closing);
    const dir = path.join(REPORT_DIR, 'evidence', project);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${this.id}.json`), JSON.stringify({ id: this.id, checks: this.records, videos }, null, 2));
  }
}

// ---------------------------------------------------------------- หลังร้าน

export class AdminHelper {
  constructor(private readonly app: App, readonly page: Page) {}

  /** เปิด /th/admin ที่วันที่ระบุ (YYYY-MM-DD) */
  async open(date: string) {
    await this.app.goto(this.page, '/th/admin');
    await this.page.getByTestId('admin-date').fill(date);
    await settle(this.page);
    return this;
  }

  rowsLocator() {
    return this.page.locator('[data-testid^="admin-booking-"]');
  }

  /** รหัสจองทุกแถวของวันที่เปิดอยู่ */
  async codes(): Promise<string[]> {
    return this.rowsLocator().evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid!.replace('admin-booking-', '')));
  }

  async rowCount() { return this.rowsLocator().count(); }

  row(code: string) { return this.page.getByTestId(`admin-booking-${code}`); }
  pay(code: string) { return this.page.getByTestId(`admin-pay-${code}`); }
  time(code: string) { return this.page.getByTestId(`admin-time-${code}`); }
  therapists(code: string) { return this.page.getByTestId(`admin-therapists-${code}`); }
  status(code: string) { return this.page.getByTestId(`admin-status-${code}`); }
  service(code: string) { return this.page.getByTestId(`admin-service-${code}`); }
  party(code: string) { return this.page.getByTestId(`admin-party-${code}`); }
  customer(code: string) { return this.page.getByTestId(`admin-customer-${code}`); }
  phone(code: string) { return this.page.getByTestId(`admin-phone-${code}`); }

  /** กด "ใช้บริการเสร็จ" บนหน้าจอ แล้วคืนคำขอจาก Network (url, responseStatus, responseBody) */
  async complete(code: string): Promise<CapturedRequest> {
    const req = await this.app.capture(this.page, /\/api\/admin\/bookings\/[^/]+\/complete$/, () =>
      this.page.getByTestId(`admin-complete-${code}`).click());
    await settle(this.page);
    return req;
  }
}

// ---------------------------------------------------------------- flow จอง 3 หน้าจอ

export type HotelCode = 'H01' | 'H02' | 'H03' | 'H04' | 'H05' | 'H06';

export class BookingHelper {
  constructor(private readonly app: App, readonly page: Page) {}

  private t(id: string) { return this.page.getByTestId(id); }

  /** เปิด /{locale}/booking (query เช่น '?service=S01') */
  async open(locale = 'th', query = '') {
    await this.app.goto(this.page, `/${locale}/booking${query}`);
  }

  /** หน้าจอ 1: เลือกบริการและจำนวนคน (7 = ปุ่ม 7+) */
  async chooseService(service: string, party = 1) {
    await this.t(`booking-service-${service}`).click();
    await this.t(`booking-party-${Math.min(party, 7)}`).click();
    await settle(this.page);
  }

  async nextFromStep1() {
    await this.t('booking-step1-next').click();
    await this.t('booking-screen-2').waitFor({ state: 'visible' });
  }

  /** หน้าจอ 2: พิมพ์วันที่ YYYY-MM-DD แล้วรอรอบเวลา */
  async chooseDate(date: string) {
    await this.t('booking-date').fill(date);
    await settle(this.page);
  }

  /** เลือกนักบำบัด 'T01'...'T06' หรือ 'any' · ต้องเลือกก่อนรอบ เพราะเปลี่ยนนักบำบัดแล้วรอบถูกล้าง */
  async chooseTherapist(therapist: string) {
    await this.t(therapist === 'any' ? 'booking-therapist-any' : `booking-therapist-${therapist}`).click();
    await settle(this.page);
  }

  slot(time: string) { return this.t(`booking-slot-${time.replace(':', '-')}`); }

  async chooseSlot(time: string) {
    await this.slot(time).click();
    await settle(this.page);
  }

  /** รายการรอบที่แสดงอยู่ เช่น ['10:00','10:30',...] */
  async slots(): Promise<string[]> {
    await settle(this.page);
    return this.page.locator('[data-testid^="booking-slot-"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.testid!.replace('booking-slot-', '').replace('-', ':'))
        .filter((s) => /^\d\d:\d\d$/.test(s)));
  }

  async nextFromStep2() {
    await this.t('booking-step2-next').click();
    await this.t('booking-screen-3').waitFor({ state: 'visible' });
    await this.quoteReady();
  }

  /**
   * เดินจากต้นจนถึงหน้าสรุป (หน้าจอ 3)
   * therapist: คู่และกลุ่มไม่ต้องส่ง (ระบบจัด) · 1 คนไม่ส่ง = 'any'
   */
  async toSummary(o: { service: string; party?: number; date: string; time: string; therapist?: string; locale?: string; query?: string }) {
    const party = o.party ?? 1;
    await this.open(o.locale ?? 'th', o.query ?? '');
    await this.chooseService(o.service, party);
    await this.nextFromStep1();
    await this.chooseDate(o.date);
    if (party === 1) await this.chooseTherapist(o.therapist ?? 'any');
    await this.chooseSlot(o.time);
    await this.nextFromStep2();
  }

  /** รอราคาที่มาจาก /api/quote ให้นิ่งก่อนอ่าน */
  async quoteReady() {
    await settle(this.page);
    await this.t('booking-quote-loading').waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
    await settle(this.page);
  }

  /** ยอด "จ่ายหน้าร้าน" หลังราคาหยุดคำนวณ */
  async pay(): Promise<number> {
    await this.quoteReady();
    return lineAmount(await this.t('booking-pay-at-shop').innerText());
  }

  /** อ่านทุกบรรทัดราคาหลังหยุดคำนวณ */
  async lines() {
    await this.quoteReady();
    const read = async (id: string) => lineAmount(await this.t(id).innerText().catch(() => ''));
    return {
      full: await read('booking-line-full-price'),
      discount: await read('booking-line-discount'),
      points: await read('booking-line-points'),
      transport: await read('booking-line-transport'),
      giftcard: await read('booking-line-giftcard'),
      pay: await read('booking-pay-at-shop'),
      discountText: await this.t('booking-line-discount').innerText().catch(() => ''),
    };
  }

  /** เปิดแผงเสริมบนหน้าจอ 3 ถ้ายังปิดอยู่ */
  private async openExtra(toggle: 'points' | 'birthday' | 'shuttle' | 'giftcard', probe: string) {
    if (!(await this.t(probe).isVisible().catch(() => false))) {
      await this.t(`booking-toggle-${toggle}`).click();
      await this.t(probe).waitFor({ state: 'visible', timeout: 5_000 });
    }
  }

  async openPoints() { await this.openExtra('points', 'booking-points-value'); }
  /** กด + ทีละครั้งจนครบ n ชุด (อ่านราคาใหม่ทุกครั้ง) */
  async redeemSets(n: number) {
    await this.openPoints();
    for (let i = 0; i < n; i++) {
      await this.t('booking-points-inc').click();
      await this.quoteReady();
    }
  }
  async redeemMax() {
    await this.openPoints();
    await this.t('booking-points-max').click();
    await this.quoteReady();
  }
  pointsValue() { return this.t('booking-points-value'); }
  pointsInc() { return this.t('booking-points-inc'); }
  pointsDec() { return this.t('booking-points-dec'); }

  async openBirthday() { await this.openExtra('birthday', 'booking-use-birthday'); }
  birthdayBox() { return this.t('booking-use-birthday'); }
  /** ติ๊กเดือนเกิด · ถ้าตัวเลือกปิดอยู่จะไม่ติ๊กและคืน false */
  async tryUseBirthday(): Promise<boolean> {
    await this.openBirthday();
    const box = this.birthdayBox();
    if (await box.isDisabled()) return false;
    await box.check();
    await this.quoteReady();
    return true;
  }

  async openShuttle() { await this.openExtra('shuttle', 'booking-shuttle-toggle'); }
  /** ติ๊กรถแล้วเลือกโรงแรม H01–H06 */
  async shuttleHotel(hotel: HotelCode) {
    await this.openShuttle();
    await this.t('booking-shuttle-toggle').check();
    await this.t('booking-shuttle-mode-hotel').check();
    await this.t('booking-shuttle-hotel').selectOption(hotel);
    await this.quoteReady();
  }
  /** ติ๊กรถแล้วพิมพ์ระยะ (ส่ง string ตรงตัว เช่น '5.05') */
  async shuttleDistance(km: string) {
    await this.openShuttle();
    await this.t('booking-shuttle-toggle').check();
    await this.t('booking-shuttle-mode-distance').check();
    await this.t('booking-shuttle-distance').fill(km);
    await this.t('booking-shuttle-distance').blur();
    await this.quoteReady();
  }
  async shuttleOff() {
    await this.openShuttle();
    await this.t('booking-shuttle-toggle').uncheck();
    await this.quoteReady();
  }

  async openGiftCard() { await this.openExtra('giftcard', 'booking-giftcard-code'); }
  async giftCard(code: string) {
    await this.openGiftCard();
    await this.t('booking-giftcard-code').fill(code);
    await this.t('booking-giftcard-apply').click();
    await this.quoteReady();
  }

  async guest(name: string, phone: string) {
    await this.t('booking-guest-name').fill(name);
    await this.t('booking-guest-phone').fill(phone);
    await this.quoteReady();
  }

  confirmButton() { return this.t('booking-confirm'); }

  /** กดยืนยัน รอผลจาก POST /api/bookings · ถ้าสำเร็จคืนรหัสจองใน code */
  async confirm(): Promise<{ code: string | null; request: CapturedRequest }> {
    const request = await this.app.capture(this.page, /\/api\/bookings$/, () => this.confirmButton().click());
    let code: string | null = null;
    if (request.responseStatus >= 200 && request.responseStatus < 300) {
      await this.t('booking-code').waitFor({ state: 'visible', timeout: 10_000 });
      code = (await this.t('booking-code').innerText()).trim();
    }
    await settle(this.page);
    return { code, request };
  }

  /**
   * จองผ่านหน้าเว็บจนจบ คืนรหัสจอง
   * guest: ส่งเมื่อเป็นแขก (ถ้าไม่ส่งและเป็นแขก ใช้ คุณทดสอบ + เบอร์ที่ส่งใน phone)
   */
  async book(o: { service: string; party?: number; date: string; time: string; therapist?: string; locale?: string; query?: string; guest?: { name: string; phone: string } }) {
    await this.toSummary(o);
    if (o.guest) await this.guest(o.guest.name, o.guest.phone);
    return this.confirm();
  }

  /** ไฮไลต์ได้โดยตรงจากรหัส testid */
  el(id: string) { return this.t(id); }
}

// ---------------------------------------------------------------- สร้าง context

async function createActor(browser: Browser, testInfo: TestInfo, baseURL: string, label: string): Promise<Actor> {
  const u = testInfo.project.use as any;
  const options: Parameters<Browser['newContext']>[0] = {
    baseURL,
    locale: u.locale,
    timezoneId: u.timezoneId,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
  };
  if (testInfo.project.name === 'chromium') {
    options.recordVideo = { dir: testInfo.outputPath('video-raw'), size: { width: 1280, height: 720 } };
  }
  const context = await browser.newContext(options);
  context.setDefaultTimeout(u.actionTimeout || 15_000);
  context.setDefaultNavigationTimeout(u.navigationTimeout || 30_000);
  const pageStart = Date.now();
  const page = await context.newPage();
  track(page);
  return { label, context, page, pageStart };
}

// ---------------------------------------------------------------- fixture

type Fixtures = {
  app: App;
  /** BookingHelper ของ page หลัก · หน้าอื่นใช้ new BookingHelper(app, otherPage) */
  booking: BookingHelper;
  context: BrowserContext;
  page: Page;
};

export const test = base.extend<Fixtures>({
  // override เพื่ออัดวิดีโอและเก็บไฟล์ถาวรเอง · ทุก test ต้องเริ่มจากเว็บที่ล็อกและรีเซ็ตแล้ว
  app: [async ({ browser, baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('ไม่มี baseURL');
    const main = await createActor(browser, testInfo, baseURL, 'main');
    const app = new App(browser, testInfo, baseURL, main);
    await app.lockAndReset(LOCK);
    await use(app);
    await app.finish();
  }, { auto: true }],

  context: async ({ app }, use) => {
    await use(app.main.context);
  },

  page: async ({ app }, use) => {
    await use(app.main.page);
  },

  booking: async ({ app, page }, use) => {
    await use(new BookingHelper(app, page));
  },
});
