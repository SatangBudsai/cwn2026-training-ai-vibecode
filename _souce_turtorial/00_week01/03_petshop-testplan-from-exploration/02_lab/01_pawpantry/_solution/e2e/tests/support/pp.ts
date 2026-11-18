/**
 * ตัวช่วยกลางของชุดทดสอบ PawPantry — ทุกไฟล์ spec import จากที่นี่
 *   import { test, expect, check, checkApi, runEmail, baseURL } from './support/pp';
 *
 * - fixture `resetSite` (auto) เรียก POST /api/test/reset ก่อนทุก test
 * - check()    : ไฮไลต์ element ด้วยกรอบแดง → ถ่ายภาพแนบ → ตรวจด้วย expect.soft → เก็บค่าจริงแนบไว้
 * - checkApi() : แบบเดียวกันสำหรับผลที่ได้จาก API (แนบ JSON แทนภาพ)
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';

export { expect };

/**
 * URL ของเว็บที่ project นี้ใช้ (ตั้งใน playwright.config.ts ต่อ project: chromium → :3000, mobile-chrome → :3001)
 * เรียกได้เฉพาะระหว่างรัน test (อ่านจาก test.info()) · ห้ามเขียน http://localhost:3000 ตายตัวใน spec
 */
export function baseURL(): string {
  const u = base.info().project.use.baseURL;
  if (!u) throw new Error(`project ${base.info().project.name} ไม่ได้ตั้ง baseURL`);
  return u.replace(/\/$/, '');
}

/** รหัสรอบ {run} ตาม G2 ของแผน = ชื่อ project + เวลาเริ่มรอบ */
export function runId(): string {
  const stamp = process.env.PP_STAMP ?? 'local';
  return `${base.info().project.name}-${stamp}`;
}
/** อีเมลบัญชีใหม่ที่ไม่ชนกันข้ามรอบ/ข้าม project เช่น runEmail('qa-reg-001') → qa-reg-001-chromium-20261103T0915@pawpantry.test */
export function runEmail(prefix: string): string {
  return `${prefix}-${runId()}@pawpantry.test`.toLowerCase();
}

let checkNo = 0;

export const test = base.extend<{ resetSite: void }, { siteHealth: void }>({
  /** Entry E2 (หัวข้อ 6.1): เช็ก /api/health ของเว็บของ project นี้ 1 ครั้งต่อ worker ก่อนเริ่ม test ใด ๆ — ไม่ผ่าน = หยุดทั้ง project (Suspend) */
  siteHealth: [
    async ({ playwright }, use, workerInfo) => {
      const url = workerInfo.project.use.baseURL;
      const ctx = await playwright.request.newContext({ baseURL: url });
      const h = await ctx.get('/api/health').catch((e) => {
        throw new Error(`E2 ไม่ผ่าน: เรียก ${url}/api/health ไม่ได้ (${e})`);
      });
      const body = await h.text();
      if (h.status() !== 200 || !/"ok"\s*:\s*true/.test(body)) throw new Error(`E2 ไม่ผ่าน: ${url}/api/health ตอบ ${h.status()} ${body}`);
      console.log(`[entry] ${workerInfo.project.name} → ${url}/api/health = ${body}`);
      await ctx.dispose();
      await use();
    },
    { scope: 'worker', auto: true },
  ],
  /** reset เว็บของ project นี้ก่อนทุก test (request fixture ใช้ baseURL ของ project) */
  resetSite: [
    async ({ request }, use) => {
      checkNo = 0;
      const r = await request.post('/api/test/reset');
      if (!r.ok()) throw new Error(`reset ล้ม: HTTP ${r.status()}`);
      await use();
    },
    { auto: true },
  ],
});


const HL_ATTR = 'data-pp-hl';

/** ใส่กรอบแดงให้ element (ลบกรอบเดิมก่อน) · ถ้า locator เจอหลายตัวจะไฮไลต์สูงสุด 10 ตัว */
export async function highlight(page: Page, target: Locator | null | undefined): Promise<void> {
  await page
    .evaluate((attr) => {
      document.querySelectorAll(`[${attr}]`).forEach((el) => {
        const h = el as HTMLElement;
        h.style.outline = h.getAttribute(attr) || '';
        h.removeAttribute(attr);
      });
    }, HL_ATTR)
    .catch(() => {});
  if (!target) return;
  const n = Math.min(await target.count().catch(() => 0), 10);
  for (let i = 0; i < n; i++) {
    await target
      .nth(i)
      .evaluate(
        (el, attr) => {
          const h = el as HTMLElement;
          h.setAttribute(attr, h.style.outline || '');
          h.style.outline = '4px solid red';
          h.style.outlineOffset = '2px';
        },
        HL_ATTR,
        { timeout: 2000 },
      )
      .catch(() => {});
  }
  if (n > 0) await target.first().scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
}

/**
 * ตรวจหนึ่งจุด:
 *   await check(page, 'ยอดชำระ ฿518', page.getByTestId('cart-total'), async (el) => {
 *     await expect.soft(el).toHaveText(/฿518/);
 *   });
 * - target = element ที่ตรวจ (ไฮไลต์กรอบแดง) · ถ้าตรวจค่าที่ไม่ใช่ element (localStorage, URL) ให้ส่ง null แล้วจะถ่ายทั้งหน้า
 * - ภายใน assert ต้องใช้ expect.soft เท่านั้น
 */
export async function check<T extends Locator | null>(
  page: Page,
  label: string,
  target: T,
  assert: (el: T) => Promise<unknown>,
  opts: { actual?: () => Promise<unknown> } = {},
): Promise<void> {
  await test.step(`ตรวจ: ${label}`, async () => {
    const info = test.info();
    const n = ++checkNo;
    await highlight(page, target ?? null);
    if (/chromium/.test(info.project.name)) await page.waitForTimeout(400); // ให้กรอบแดงติดในวิดีโอ
    try {
      const file = info.outputPath(`check-${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ timeout: 5000, path: file });
      await info.attach(`check-${String(n).padStart(2, '0')}: ${label}`, { path: file, contentType: 'image/png' });
    } catch {
      /* หน้าอาจปิดไปแล้ว */
    }
    const errsBefore = info.errors.length;
    await assert(target);
    let actual: unknown;
    try {
      if (opts.actual) actual = await opts.actual();
      else if (target) {
        const cnt = await target.count();
        const first = target.first();
        const tag = cnt === 0 ? '' : await first.evaluate((el) => el.tagName, null, { timeout: 1000 }).catch(() => '');
        actual =
          cnt === 0
            ? '(ไม่พบ element)'
            : /^(INPUT|TEXTAREA|SELECT)$/.test(tag)
              ? `value = ${JSON.stringify(await first.inputValue({ timeout: 1000 }))}`
              : await first.innerText({ timeout: 1000 });
      } else actual = page.url();
    } catch (e) {
      actual = `(อ่านค่าไม่ได้: ${(e as Error).message.split('\n')[0]})`;
    }
    const ok = info.errors.length === errsBefore;
    await info.attach(`actual-${String(n).padStart(2, '0')}: ${label}`, {
      body: `${ok ? 'PASS' : 'FAIL'}\n${typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2)}`.slice(0, 2000),
      contentType: 'text/plain',
    });
  });
}

/**
 * ตรวจผลจาก API (ไม่มีหน้าเว็บ) — แนบข้อมูลที่ได้เป็นหลักฐาน
 *   await checkApi('POST /api/orders ราคาปลอม → 400', { status: r.status(), body }, async () => {
 *     expect.soft(r.status()).toBe(400);
 *   });
 */
export async function checkApi(label: string, actual: unknown, assert: () => Promise<unknown> | unknown): Promise<void> {
  await test.step(`ตรวจ: ${label}`, async () => {
    const info = test.info();
    const n = ++checkNo;
    const errsBefore = info.errors.length;
    await assert();
    const ok = info.errors.length === errsBefore;
    await info.attach(`actual-${String(n).padStart(2, '0')}: ${label}`, {
      body: `${ok ? 'PASS' : 'FAIL'}\n${typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2)}`.slice(0, 4000),
      contentType: 'text/plain',
    });
  });
}

/** ค่าที่ตรวจไม่ได้ในสภาพแวดล้อมนี้ → นับเป็นไม่ผ่าน (blocked) ตามหัวข้อ 6.2 */
export function blocked(reason: string): void {
  test.info().annotations.push({ type: 'blocked', description: reason });
  expect.soft(false, `BLOCKED: ${reason}`).toBe(true);
}
