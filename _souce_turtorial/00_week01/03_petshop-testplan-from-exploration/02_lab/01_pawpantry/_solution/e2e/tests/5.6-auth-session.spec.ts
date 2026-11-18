/**
 * หัวข้อ 5.6 สมัครสมาชิก เข้าสู่ระบบ และ session (REG, AUTH, SESS) — 51 test case ตาม TEST-PLAN.md
 * - annotation `expected` / `source` คัดลอกจากตารางในแผนตรงตัว
 * - TC-AUTH-008 / TC-AUTH-009 (@ratelimit) อยู่ท้ายไฟล์ตาม G3 และใช้บัญชีของตัวเอง ไม่ใช้ demo
 */
import type { APIRequestContext, APIResponse, Locator, Page, Response } from '@playwright/test';
import { test, expect, check, checkApi, blocked, runEmail, baseURL } from './support/pp';

// ---------------------------------------------------------------------------
// ค่าคงที่
// ---------------------------------------------------------------------------
const PW = 'Paw12345';
const DEMO_EMAIL = 'demo@pawpantry.test';
const DEMO_NAME = 'สมใจ ใจดี';
const MSG_LOGIN_FAIL = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
const MSG_PW_RULE = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข';
const MSG_DUP = 'อีเมลนี้ถูกใช้แล้ว';
const ADDR = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  address: '99/1 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  postcode: '10110',
};
/** origin ของเว็บที่ project นี้ทดสอบ (อ่านตอนรัน) */
const originOf = (): string => new URL(baseURL()).origin;

// ---------------------------------------------------------------------------
// ตัวช่วย
// ---------------------------------------------------------------------------
const siteHeader = (page: Page) => page.locator('header.site-header');
/** ลิงก์ "เข้าสู่ระบบ" ใน header (ไม่นับ nav#mobile-menu ซึ่งอยู่นอก header) รวมตัวที่ซ่อนอยู่ */
const headerLoginLinks = (page: Page) => siteHeader(page).locator('a', { hasText: 'เข้าสู่ระบบ' });

function pathAndQuery(url: string): string {
  const u = new URL(url);
  return u.pathname + u.search;
}
function nextOf(url: string): string | null {
  try {
    return new URL(url, baseURL()).searchParams.get('next');
  } catch {
    return null;
  }
}

async function apiLogin(page: Page, email = DEMO_EMAIL, password = PW): Promise<APIResponse> {
  return page.request.post('/api/auth/login', { data: { email, password } });
}
async function apiLogout(page: Page): Promise<APIResponse> {
  return page.request.post('/api/auth/logout');
}

type Pet = 'cat' | 'dog' | 'both';
function regBody(name: string, email: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { name, email, password: PW, confirm: PW, pet: 'cat', terms: true, ...extra };
}
async function apiRegister(req: APIRequestContext, body: Record<string, unknown>): Promise<APIResponse> {
  return req.post('/api/auth/register', { data: body });
}
function apiSetCookie(r: APIResponse): string {
  return r
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value)
    .join('\n');
}
async function respSetCookie(r: Response | null): Promise<string> {
  if (!r) return '';
  return (await r.headerValue('set-cookie').catch(() => null)) ?? '';
}
async function respJson(r: Response | null): Promise<any> {
  if (!r) return null;
  return r.json().catch(async () => r.text().catch(() => null));
}
async function apiJson(r: APIResponse): Promise<any> {
  return r.json().catch(async () => r.text().catch(() => null));
}
async function sessionCookie(page: Page): Promise<string | undefined> {
  return (await page.context().cookies(baseURL())).find((c) => c.name === 'pp_session')?.value;
}

type RegData = { name?: string; email?: string; password?: string; confirm?: string; pet?: Pet; terms?: boolean };
async function fillReg(page: Page, d: RegData): Promise<void> {
  if (d.name !== undefined) await page.getByTestId('reg-name').fill(d.name);
  if (d.email !== undefined) await page.getByTestId('reg-email').fill(d.email);
  if (d.password !== undefined) await page.getByTestId('reg-password').fill(d.password);
  if (d.confirm !== undefined) await page.getByTestId('reg-confirm').fill(d.confirm);
  if (d.pet) await page.getByTestId(`reg-pet-${d.pet}`).check();
  if (d.terms !== undefined) await page.getByTestId('reg-terms').setChecked(d.terms);
}
/** กดส่งฟอร์มสมัคร แล้วคืน response ของ POST /api/auth/register (null = ไม่มี request ภายในเวลาที่รอ) */
async function submitReg(page: Page, opts: { timeout?: number; enterIn?: string } = {}): Promise<Response | null> {
  const wait = page
    .waitForResponse((r) => r.url().includes('/api/auth/register') && r.request().method() === 'POST', {
      timeout: opts.timeout ?? 2500,
    })
    .catch(() => null);
  if (opts.enterIn) await page.getByTestId(opts.enterIn).press('Enter');
  else await page.getByTestId('reg-submit').click();
  const r = await wait;
  if (r && r.ok()) await page.waitForURL((u) => u.pathname !== '/register', { timeout: 10_000 }).catch(() => {});
  else await page.waitForTimeout(300);
  return r;
}
/** เปิดหน้าสมัคร กรอกครบ แล้วส่ง (ใช้กับกรณีที่ควรสมัครผ่าน) */
async function registerViaForm(page: Page, d: RegData, url = '/register'): Promise<Response | null> {
  await page.goto(url);
  await fillReg(page, { pet: 'cat', terms: true, password: PW, confirm: PW, ...d });
  return submitReg(page, { timeout: 10_000 });
}

/** กรอกฟอร์ม login แล้วส่ง คืน response ของ POST /api/auth/login (null = ไม่มี request) */
async function submitLogin(
  page: Page,
  email: string,
  password: string,
  opts: { enter?: boolean; timeout?: number } = {},
): Promise<Response | null> {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  const wait = page
    .waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', {
      timeout: opts.timeout ?? 10_000,
    })
    .catch(() => null);
  if (opts.enter) await page.getByTestId('login-password').press('Enter');
  else await page.getByTestId('login-submit').click();
  const r = await wait;
  if (r && r.ok()) {
    await page
      .waitForURL((u) => u.pathname !== '/login' || u.host !== new URL(baseURL()).host, { timeout: 8_000 })
      .catch(() => {});
    await page.waitForLoadState().catch(() => {});
  } else await page.waitForTimeout(300);
  return r;
}

/** กด "ออกจากระบบ" บนหัวเว็บ คืน response ของ POST /api/auth/logout */
async function logoutUi(page: Page): Promise<Response | null> {
  const wait = page
    .waitForResponse((r) => r.url().includes('/api/auth/logout'), { timeout: 10_000 })
    .catch(() => null);
  await page.getByTestId('logout-button').click();
  const r = await wait;
  await page.getByTestId('login-link').waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
  return r;
}

/** ดัก request ไป evil.example ทั้ง context (ตอบหน้าเปล่าแทนการออกเน็ตจริง) แล้วคืนรายการ URL ที่โดนเรียก */
async function guardEvil(page: Page): Promise<string[]> {
  const hits: string[] = [];
  const isEvil = (u: string) => {
    try {
      return new URL(u).hostname.includes('evil.example');
    } catch {
      return false;
    }
  };
  page.context().on('request', (r) => {
    if (isEvil(r.url())) hits.push(r.url());
  });
  await page
    .context()
    .route(
      (u) => u.hostname.includes('evil.example'),
      (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>evil</title><p>evil</p>' }),
    );
  return hits;
}
async function readLocation(page: Page): Promise<{ origin: string; pathname: string; href: string }> {
  return page
    .evaluate(() => ({ origin: location.origin, pathname: location.pathname, href: location.href }))
    .catch(() => {
      const u = new URL(page.url());
      return { origin: u.origin, pathname: u.pathname, href: u.href };
    });
}
/** นับ dialog (alert) ทั้งหมดของ page แล้วกดปิด */
function countDialogs(page: Page): { n: number } {
  const c = { n: 0 };
  page.on('dialog', async (d) => {
    c.n++;
    await d.dismiss().catch(() => {});
  });
  return c;
}

async function addToCart(page: Page, slug: string, opts: { size?: string; qty?: number } = {}): Promise<void> {
  await page.goto(`/products/${slug}`);
  if (opts.size) await page.locator(`[data-testid="size-option"][data-size="${opts.size}"]`).click();
  for (let i = 1; i < (opts.qty ?? 1); i++) await page.getByTestId('qty-plus').click();
  await page.getByTestId('add-to-cart').click();
  await page.waitForFunction((s) => (localStorage.getItem('pp-cart') ?? '').includes(s), slug, { timeout: 5_000 });
}
async function toggleWishOnPdp(page: Page, slug: string): Promise<void> {
  if (!new URL(page.url()).pathname.endsWith(`/products/${slug}`)) await page.goto(`/products/${slug}`);
  await page.getByTestId('wishlist-toggle').first().click();
  await page.waitForFunction((s) => (localStorage.getItem('pp-wishlist') ?? '').includes(s), slug, { timeout: 5_000 });
}
async function applyCoupon(page: Page, code: string): Promise<void> {
  await page.goto('/cart');
  await page.getByTestId('coupon-input').fill(code);
  await page.getByTestId('coupon-apply').click();
  await page.getByTestId('coupon-message').waitFor({ timeout: 5_000 }).catch(() => {});
}
async function fillCheckout(page: Page): Promise<void> {
  await page.getByTestId('ship-name').fill(ADDR.name);
  await page.getByTestId('ship-phone').fill(ADDR.phone);
  await page.getByTestId('ship-address').fill(ADDR.address);
  await page.getByTestId('ship-province').selectOption(ADDR.province);
  await page.getByTestId('ship-postcode').fill(ADDR.postcode);
  await page.getByTestId('shipping-standard').check();
  await page.getByTestId('pay-cod').check();
}
async function lsDump(page: Page): Promise<Record<string, string | null>> {
  return page.evaluate(() => ({
    'pp-cart': localStorage.getItem('pp-cart'),
    'pp-coupon': localStorage.getItem('pp-coupon'),
    'pp-wishlist': localStorage.getItem('pp-wishlist'),
    'pp-recent': localStorage.getItem('pp-recent'),
  }));
}
/** ค่าว่างตามแผน: null / "" / array ว่าง */
function lsEmpty(v: string | null): boolean {
  if (v === null || v.trim() === '' || v === 'null') return true;
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j.length === 0 : j === null || j === '';
  } catch {
    return false;
  }
}
/** ตัวนับบนหัวเว็บเป็น 0 หรือไม่แสดง */
async function badgeZeroOrHidden(loc: Locator): Promise<boolean> {
  if ((await loc.count()) === 0) return true;
  if (!(await loc.first().isVisible())) return true;
  return (await loc.first().innerText()).trim() === '0';
}
/** ข้อความทั้งหน้า ไม่นับกล่อง "บัญชีทดลอง" บนหน้า login (ซึ่งมีอีเมล demo เสมอ) */
async function pageTextWithoutDemoHint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const c = document.body.cloneNode(true) as HTMLElement;
    c.querySelectorAll('.demo-hint, script, style').forEach((e) => e.remove());
    return c.textContent ?? '';
  });
}
/** สำหรับ error ของฟอร์ม: ช่องที่ aria-invalid="true" ต้องมี aria-describedby ชี้ไป element ที่มีข้อความ error ของช่องนั้น */
async function describedByReport(page: Page, fieldTestIds: string[], fixedMsg?: string) {
  return page.evaluate(
    ({ ids, msg }) =>
      ids.map((tid) => {
        const el = document.querySelector(`[data-testid="${tid}"]`) as HTMLElement | null;
        if (!el) return { field: tid, invalid: null, describedBy: null, describedText: [], errorText: null, ok: false };
        const invalid = el.getAttribute('aria-invalid');
        const db = el.getAttribute('aria-describedby');
        const describedText = (db ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '');
        const errEl = el.closest('.field')?.querySelector('.field-error, [role="alert"]');
        const errorText = msg ?? errEl?.textContent?.trim() ?? null;
        const ok = invalid !== 'true' || (!!errorText && describedText.some((t) => t.includes(errorText)));
        return { field: tid, invalid, describedBy: db, describedText, errorText, ok };
      }),
    { ids: fieldTestIds, msg: fixedMsg ?? null },
  );
}
async function activeId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return '(none)';
    return a.dataset.testid || a.getAttribute('aria-label') || a.id || a.tagName.toLowerCase();
  });
}

// ===========================================================================
// F19 สมัครสมาชิก
// ===========================================================================

test("TC-REG-001 สมัครด้วยข้อมูลถูกครบ แล้วระบบล็อกอินให้อัตโนมัติ ใช้บัญชีใหม่ล็อกอินซ้ำได้", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 3: HTTP 201 · response มี `Set-Cookie: pp_session=` · URL ปลายทาง `/account?welcome=1` · ขั้น 4: หัวเว็บมี \"Q\", \"QA Reg 001\" และ \"ออกจากระบบ\" และไม่มีลิงก์ \"เข้าสู่ระบบ\" · `/account` แสดง `qa-reg-001-{run}@pawpantry.test` · ขั้น 5: `POST /api/auth/login` ได้ HTTP 2xx และไปที่ `/`" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R141 · R154 · Q33 · Q32 · ความเสี่ยง: สมัครแล้วใช้บัญชีไม่ได้ / หัวเว็บไม่บอกว่าล็อกอินเป็นใคร · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-001');
  let reg = null as Response | null;
  await test.step('1. เปิด /register', async () => {
    await page.goto('/register');
  });
  await test.step('2. กรอกตามข้อมูลทดสอบ (สัตว์เลี้ยงใช้ค่า "แมว" ที่ติ๊กไว้ให้) แล้วกดปุ่มส่งฟอร์มสมัคร', async () => {
    await fillReg(page, { name: 'QA Reg 001', email, password: PW, confirm: PW, terms: true });
    reg = await submitReg(page, { timeout: 10_000 });
  });
  await test.step('3. ดู request POST /api/auth/register และ URL ปลายทาง', async () => {
    const sc = await respSetCookie(reg);
    await checkApi('POST /api/auth/register ได้ HTTP 201', { status: reg?.status() ?? null }, () => {
      expect.soft(reg?.status()).toBe(201);
    });
    await checkApi('response มี Set-Cookie: pp_session=', sc, () => {
      expect.soft(sc).toMatch(/pp_session=[^;\s]+/);
    });
    await check(page, 'URL ปลายทาง /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
  await test.step('4. ดูหัวเว็บ แล้วเปิด /account', async () => {
    await check(page, 'หัวเว็บมี "Q"', siteHeader(page).locator('.avatar'), async (el) => {
      await expect.soft(el).toHaveText('Q');
    });
    await check(page, 'หัวเว็บมี "QA Reg 001"', page.getByTestId('user-menu'), async (el) => {
      await expect.soft(el).toContainText('QA Reg 001');
    });
    await check(page, 'หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
    await check(page, 'หัวเว็บไม่มีลิงก์ "เข้าสู่ระบบ"', siteHeader(page), async () => {
      await expect.soft(headerLoginLinks(page)).toHaveCount(0);
    });
    await page.goto('/account');
    await check(page, `/account แสดง ${email}`, page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(email);
    });
  });
  await test.step('5. กด "ออกจากระบบ" แล้วล็อกอินที่ /login ด้วยอีเมล/รหัสเดิม', async () => {
    await logoutUi(page);
    await page.goto('/login');
    const r = await submitLogin(page, email, PW);
    await checkApi('POST /api/auth/login ได้ HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'ไปที่ /', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/');
    });
  });
});

test("TC-REG-002 เลือกสัตว์เลี้ยง \"หมา\" และ \"ทั้งคู่\" แล้วค่าที่ส่งตรงกับที่เลือก", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "(ก) HTTP 201 · request body มี `\"pet\":\"dog\"` · response body `user.pet` = `\"dog\"` · (ข) HTTP 201 · request body มี `\"pet\":\"both\"` · response body `user.pet` = `\"both\"` · ทั้งสองครั้งไปที่ `/account?welcome=1`" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R137 · R138 · Q35 · ความเสี่ยง: ค่าสัตว์เลี้ยงถูกบันทึกเป็นแมวเงียบ ๆ · เทคนิค: Equivalence partition · Happy path" },
  ],
}, async ({ page }) => {
  const sets: { label: string; name: string; email: string; pet: Pet }[] = [
    { label: '(ก)', name: 'QA Reg 002', email: runEmail('qa-reg-002'), pet: 'dog' },
    { label: '(ข)', name: 'QA Reg 003', email: runEmail('qa-reg-003'), pet: 'both' },
  ];
  for (const s of sets) {
    let reg = null as Response | null;
    await test.step(`${s.label} 1–2. เปิด /register กรอก เลือกสัตว์เลี้ยง "${s.pet === 'dog' ? 'หมา' : 'ทั้งคู่'}" ติ๊กเงื่อนไข แล้วส่ง`, async () => {
      reg = await registerViaForm(page, { name: s.name, email: s.email, pet: s.pet });
    });
    await test.step(`${s.label} 3. ดู request body ของ POST /api/auth/register`, async () => {
      const reqBody = reg?.request().postDataJSON() ?? null;
      const body = await respJson(reg);
      await checkApi(`${s.label} HTTP 201`, { status: reg?.status() ?? null }, () => {
        expect.soft(reg?.status()).toBe(201);
      });
      await checkApi(`${s.label} request body มี "pet":"${s.pet}"`, reqBody, () => {
        expect.soft(reqBody?.pet).toBe(s.pet);
      });
      await checkApi(`${s.label} response body user.pet = "${s.pet}"`, body, () => {
        expect.soft(body?.user?.pet).toBe(s.pet);
      });
      await check(page, `${s.label} ไปที่ /account?welcome=1`, null, async () => {
        expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
      });
    });
    if (s.label === '(ก)') {
      await test.step('4. กด "ออกจากระบบ" แล้วทำขั้น 1–3 ซ้ำด้วยชุด (ข)', async () => {
        await logoutUi(page);
      });
    }
  }
});

test("TC-REG-003 ส่งฟอร์มว่างทั้งหมดต้องได้ข้อความบอกทุกช่องที่ขาด", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "URL ยังเป็น `/register` · ไม่มี `POST /api/auth/register` ที่ได้ 201 · มีข้อความ \"กรุณากรอกชื่อ\" · \"กรุณากรอกอีเมล\" · ข้อความใต้ช่องรหัสผ่าน = \"รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข\" (สมมติฐาน Q36: รหัสว่างใช้ข้อความเดียวกับรหัสสั้น) · \"กรุณายอมรับเงื่อนไข\" · ช่องชื่อ อีเมล รหัสผ่าน มี `aria-invalid=\"true\"` · ช่องยืนยันรหัสไม่มีข้อความ error (ว่างทั้งคู่ถือว่าตรงกัน R135) (ตอนนี้ล้ม: ช่องอีเมลขึ้น \"อีเมลไม่ถูกต้อง\")" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R129 · R130 · R132 · R135 · R136 · Q36 · Q30 · ความเสี่ยง: ลูกค้าไม่รู้ว่าลืมกรอกช่องไหน · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const created: number[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/auth/register')) created.push(r.status());
  });
  await test.step('1. เปิด /register', async () => {
    await page.goto('/register');
  });
  await test.step('2. กดปุ่มส่งฟอร์มสมัครทันที', async () => {
    await submitReg(page);
  });
  await test.step('3. อ่านข้อความ error และ attribute ของแต่ละช่อง', async () => {
    await check(page, 'URL ยังเป็น /register', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/register');
    });
    await checkApi('ไม่มี POST /api/auth/register ที่ได้ 201', created, () => {
      expect.soft(created).not.toContain(201);
    });
    await check(page, 'ข้อความ "กรุณากรอกชื่อ"', page.getByTestId('error-name'), async (el) => {
      await expect.soft(el).toHaveText('กรุณากรอกชื่อ');
    });
    await check(page, 'ข้อความ "กรุณากรอกอีเมล"', page.getByTestId('error-email'), async (el) => {
      await expect.soft(el).toHaveText('กรุณากรอกอีเมล');
    });
    await check(page, `ข้อความใต้ช่องรหัสผ่าน = "${MSG_PW_RULE}"`, page.getByTestId('error-password'), async (el) => {
      await expect.soft(el).toHaveText(MSG_PW_RULE);
    });
    await check(page, 'ข้อความ "กรุณายอมรับเงื่อนไข"', page.getByTestId('error-terms'), async (el) => {
      await expect.soft(el).toHaveText('กรุณายอมรับเงื่อนไข');
    });
    for (const f of ['reg-name', 'reg-email', 'reg-password']) {
      await check(page, `ช่อง ${f} มี aria-invalid="true"`, page.getByTestId(f), async (el) => {
        await expect.soft(el).toHaveAttribute('aria-invalid', 'true');
      }, { actual: () => page.getByTestId(f).getAttribute('aria-invalid') });
    }
    await check(page, 'ช่องยืนยันรหัสไม่มีข้อความ error', page.getByTestId('reg-confirm').locator('xpath=..'), async () => {
      await expect.soft(page.getByTestId('error-confirm')).toHaveCount(0);
    });
  });
});

test("TC-REG-004 ชื่อเป็นช่องว่างล้วนต้องถูกปฏิเสธเหมือนชื่อว่าง", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ข้อความ \"กรุณากรอกชื่อ\" · URL ยัง `/register` · ไม่มี 201 · ขั้น 3: HTTP 201 ไป `/account?welcome=1` (ยืนยันว่าขั้น 2 ไม่ได้สร้างบัญชีด้วยอีเมลนี้)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R129 · Q33 · ความเสี่ยง: บัญชีไม่มีชื่อ หัวเว็บ/ใบส่งของว่าง · เทคนิค: Boundary · Negative" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-004');
  let r2: Response | null = null;
  await test.step('1. เปิด /register', async () => {
    await page.goto('/register');
  });
  await test.step('2. กรอกชื่อเป็นเว้นวรรค 3 ตัว ช่องอื่นถูก แล้วส่ง', async () => {
    await fillReg(page, { name: '   ', email, password: PW, confirm: PW, pet: 'cat', terms: true });
    r2 = await submitReg(page);
    await check(page, 'ข้อความ "กรุณากรอกชื่อ"', page.getByTestId('error-name'), async (el) => {
      await expect.soft(el).toHaveText('กรุณากรอกชื่อ');
    });
    await check(page, 'URL ยัง /register', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/register');
    });
    await checkApi('ไม่มี 201', { status: r2?.status() ?? '(ไม่มี request)' }, () => {
      expect.soft(r2?.status()).not.toBe(201);
    });
  });
  await test.step('3. แก้ชื่อเป็น QA Reg 004 แล้วส่งอีกครั้ง', async () => {
    if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
    await fillReg(page, { name: 'QA Reg 004', email, password: PW, confirm: PW, pet: 'cat', terms: true });
    const r3 = await submitReg(page, { timeout: 10_000 });
    await checkApi('HTTP 201 (ขั้น 2 ไม่ได้สร้างบัญชีด้วยอีเมลนี้)', { status: r3?.status() ?? null, body: await respJson(r3) }, () => {
      expect.soft(r3?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

test("TC-REG-005 อีเมลผิดรูปแบบทุกแบบต้องถูกปฏิเสธ อีเมลถูกรูปแบบผ่าน", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2–3 ทุกค่า: URL ยัง `/register` · ไม่มี 201 · ช่องอีเมล `aria-invalid=\"true\"` และมีข้อความ \"อีเมลไม่ถูกต้อง\" ที่ช่องอีเมล · ขั้น 4: HTTP 201 ไป `/account?welcome=1`" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R131 · R130 · Q33 · ความเสี่ยง: บัญชีที่อีเมลใช้ไม่ได้ ติดต่อลูกค้าไม่ได้ · เทคนิค: Equivalence partition · Negative" },
  ],
}, async ({ page }) => {
  const bad = ['abc', 'a@b', 'a@@b.com', 'a b@pawpantry.test', 'qa@pawpantry'];
  await test.step('1. เปิด /register', async () => {
    await page.goto('/register');
  });
  for (const [i, e] of bad.entries()) {
    await test.step(`${i === 0 ? '2' : '3'}. ใส่อีเมลผิดค่าที่ ${i + 1} "${e}" ช่องอื่นถูกครบ แล้วส่ง`, async () => {
      if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
      await fillReg(page, { name: 'QA Reg 005', email: e, password: PW, confirm: PW, pet: 'cat', terms: true });
      const r = await submitReg(page);
      await check(page, `"${e}": URL ยัง /register`, null, async () => {
        expect.soft(new URL(page.url()).pathname).toBe('/register');
      });
      await checkApi(`"${e}": ไม่มี 201`, { status: r?.status() ?? '(ไม่มี request)' }, () => {
        expect.soft(r?.status()).not.toBe(201);
      });
      await check(page, `"${e}": ช่องอีเมล aria-invalid="true"`, page.getByTestId('reg-email'), async (el) => {
        await expect.soft(el).toHaveAttribute('aria-invalid', 'true');
      }, { actual: () => page.getByTestId('reg-email').getAttribute('aria-invalid') });
      await check(page, `"${e}": ข้อความ "อีเมลไม่ถูกต้อง" ที่ช่องอีเมล`, page.getByTestId('error-email'), async (el) => {
        await expect.soft(el).toHaveText('อีเมลไม่ถูกต้อง');
      });
    });
  }
  await test.step('4. ใส่อีเมลค่าถูก แล้วส่ง', async () => {
    if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
    await fillReg(page, { name: 'QA Reg 005', email: runEmail('qa-reg-005'), password: PW, confirm: PW, pet: 'cat', terms: true });
    const r = await submitReg(page, { timeout: 10_000 });
    await checkApi('HTTP 201', { status: r?.status() ?? null }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

/** แบบแผนร่วมของ REG-006/007: ค่าที่ต้องไม่ผ่าน แล้วค่าที่ต้องผ่าน (บัญชีเดียวกัน) */
async function pwBoundary(page: Page, name: string, email: string, badPw: string, goodPw: string): Promise<void> {
  await test.step('1. เปิด /register', async () => {
    await page.goto('/register');
  });
  await test.step(`2. กรอกรหัส/ยืนยัน "${badPw}" ช่องอื่นถูก แล้วส่ง`, async () => {
    await fillReg(page, { name, email, password: badPw, confirm: badPw, pet: 'cat', terms: true });
    const r = await submitReg(page);
    await check(page, `ข้อความ "${MSG_PW_RULE}"`, page.getByTestId('error-password'), async (el) => {
      await expect.soft(el).toHaveText(MSG_PW_RULE);
    });
    await check(page, 'URL ยัง /register', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/register');
    });
    await checkApi('ไม่มี 201', { status: r?.status() ?? '(ไม่มี request)' }, () => {
      expect.soft(r?.status()).not.toBe(201);
    });
  });
  await test.step(`3. เปลี่ยนรหัส/ยืนยันเป็น "${goodPw}" แล้วส่ง`, async () => {
    if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
    await fillReg(page, { name, email, password: goodPw, confirm: goodPw, pet: 'cat', terms: true });
    const r = await submitReg(page, { timeout: 10_000 });
    await checkApi('HTTP 201', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
}

test("TC-REG-006 ขอบความยาวรหัสผ่าน 7 ตัวไม่ผ่าน 8 ตัวผ่าน", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ข้อความ \"รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข\" · URL ยัง `/register` · ไม่มี 201 · ขั้น 3: HTTP 201 ไป `/account?welcome=1`" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R132 · Q30 · Q33 · ความเสี่ยง: รหัสสั้นกว่ากำหนดหลุดเข้าระบบ · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await pwBoundary(page, 'QA Reg 006', runEmail('qa-reg-006'), 'Paw1234', 'Paw12345');
});

test("TC-REG-007 รหัส 8 ตัวที่ไม่มีตัวเลขไม่ผ่าน มีตัวเลข 1 ตัวผ่าน", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ข้อความ \"รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข\" · ไม่มี 201 · ขั้น 3: HTTP 201 ไป `/account?welcome=1`" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R132 · Q30 · Q33 · ความเสี่ยง: กฎ \"มีตัวเลข\" ไม่ถูกบังคับ · เทคนิค: Equivalence partition · Boundary" },
  ],
}, async ({ page }) => {
  await pwBoundary(page, 'QA Reg 007', runEmail('qa-reg-007'), 'Pawsssss', 'Pawssss1');
});

test("TC-REG-008 รหัสตัวเลขล้วน `12345678` สมัครได้และล็อกอินได้", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: HTTP 201 ไป `/account?welcome=1` · ขั้น 3: `POST /api/auth/login` HTTP 2xx หัวเว็บมี \"QA Reg 008\" และ \"ออกจากระบบ\"" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R133 · Q30 · Q33 · ความเสี่ยง: กฎจริงต่างจากคำใบ้ ลูกค้าสมัครไม่ผ่านโดยไม่รู้เหตุ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-008');
  await test.step('1. เปิด /register กรอก (รหัส 12345678) แล้วส่ง', async () => {
    const r = await registerViaForm(page, { name: 'QA Reg 008', email, password: '12345678', confirm: '12345678' });
    await checkApi('HTTP 201', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
  await test.step('2. กด "ออกจากระบบ"', async () => {
    if (await page.getByTestId('logout-button').count()) await logoutUi(page);
    else await apiLogout(page);
  });
  await test.step('3. ล็อกอินที่ /login ด้วยอีเมลเดิม / 12345678', async () => {
    await page.goto('/login');
    const r = await submitLogin(page, email, '12345678');
    await checkApi('POST /api/auth/login HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'หัวเว็บมี "QA Reg 008"', page.getByTestId('user-menu'), async (el) => {
      await expect.soft(el).toContainText('QA Reg 008');
    });
    await check(page, 'หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
});

test("TC-REG-009 รหัสที่มีช่องว่างหัว/ท้ายต้องนับหลัง trim (7 ตัว + ช่องว่าง ต้องไม่ผ่าน)", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2: ข้อความ \"รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข\" · URL ยัง `/register` · ไม่มี 201 · ขั้น 3: HTTP 201 ไป `/account?welcome=1` (ยืนยันว่าขั้น 1 ไม่ได้สร้างบัญชี) (ตอนนี้ล้ม: `Paw1234␠` สมัครผ่านในขั้น 1 เพราะนับช่องว่างเป็นตัวที่ 8 ขั้น 3 จึงได้ \"อีเมลนี้ถูกใช้แล้ว\")" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R134 · R132 · Q30 · ความเสี่ยง: ลูกค้าสมัครผ่านแต่ล็อกอินไม่ได้ · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const sets = [
    { label: '(ก) ช่องว่างท้าย', name: 'QA Reg 009', email: runEmail('qa-reg-009'), pw: 'Paw1234 ' },
    { label: '(ข) ช่องว่างหน้า', name: 'QA Reg 010', email: runEmail('qa-reg-010'), pw: ' Paw1234' },
  ];
  for (const [i, s] of sets.entries()) {
    await test.step(`${i + 1}. เปิด /register กรอกชุด ${s.label} รหัส/ยืนยัน "${s.pw}" แล้วส่ง`, async () => {
      await apiLogout(page);
      await page.goto('/register');
      await fillReg(page, { name: s.name, email: s.email, password: s.pw, confirm: s.pw, pet: 'cat', terms: true });
      const r = await submitReg(page);
      await check(page, `${s.label}: ข้อความ "${MSG_PW_RULE}"`, page.getByTestId('error-password'), async (el) => {
        await expect.soft(el).toHaveText(MSG_PW_RULE);
      });
      await check(page, `${s.label}: URL ยัง /register`, null, async () => {
        expect.soft(new URL(page.url()).pathname).toBe('/register');
      });
      await checkApi(`${s.label}: ไม่มี 201`, { status: r?.status() ?? '(ไม่มี request)' }, () => {
        expect.soft(r?.status()).not.toBe(201);
      });
    });
  }
  await test.step('3. สมัครใหม่ด้วยอีเมลชุด (ก) ชื่อ QA Reg 009 รหัส/ยืนยัน Paw12345', async () => {
    await apiLogout(page);
    const r = await registerViaForm(page, { name: 'QA Reg 009', email: sets[0].email });
    await checkApi('HTTP 201 (ขั้น 1 ไม่ได้สร้างบัญชี)', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

test("TC-REG-010 ยืนยันรหัสผ่านไม่ตรงกัน (ต่างตัวเลข / ต่างตัวพิมพ์) ต้องถูกปฏิเสธ", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2: ข้อความ \"รหัสผ่านไม่ตรงกัน\" · ช่องยืนยัน `aria-invalid=\"true\"` · ไม่มี 201 · ขั้น 3: HTTP 201 ไป `/account?welcome=1`" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R135 · Q33 · ความเสี่ยง: ลูกค้าพิมพ์รหัสผิดแล้วล็อกอินไม่ได้ · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-011');
  await page.goto('/register');
  for (const [i, c] of ['Paw12346', 'paw12345'].entries()) {
    await test.step(`${i + 1}. กรอกยืนยันแบบ ${i === 0 ? '(ก)' : '(ข)'} "${c}" แล้วส่ง`, async () => {
      await fillReg(page, { name: 'QA Reg 011', email, password: PW, confirm: c, pet: 'cat', terms: true });
      const r = await submitReg(page);
      await check(page, `"${c}": ข้อความ "รหัสผ่านไม่ตรงกัน"`, page.getByTestId('error-confirm'), async (el) => {
        await expect.soft(el).toHaveText('รหัสผ่านไม่ตรงกัน');
      });
      await check(page, `"${c}": ช่องยืนยัน aria-invalid="true"`, page.getByTestId('reg-confirm'), async (el) => {
        await expect.soft(el).toHaveAttribute('aria-invalid', 'true');
      }, { actual: () => page.getByTestId('reg-confirm').getAttribute('aria-invalid') });
      await checkApi(`"${c}": ไม่มี 201`, { status: r?.status() ?? '(ไม่มี request)' }, () => {
        expect.soft(r?.status()).not.toBe(201);
      });
      if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
    });
  }
  await test.step('3. เปลี่ยนยืนยันเป็น Paw12345 แล้วส่ง', async () => {
    await fillReg(page, { name: 'QA Reg 011', email, password: PW, confirm: PW, pet: 'cat', terms: true });
    const r = await submitReg(page, { timeout: 10_000 });
    await checkApi('HTTP 201', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

test("TC-REG-011 ไม่ติ๊กยอมรับเงื่อนไขต้องสมัครไม่ได้", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ข้อความ \"กรุณายอมรับเงื่อนไข\" · URL ยัง `/register` · ไม่มี 201 · ขั้น 2: HTTP 201 ไป `/account?welcome=1`" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R136 · Q33 · ความเสี่ยง: เก็บข้อมูลลูกค้าโดยไม่มีความยินยอม · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-012');
  await test.step('1. เปิด /register กรอกตามข้อมูล ไม่ติ๊กเงื่อนไข แล้วส่ง', async () => {
    await page.goto('/register');
    await fillReg(page, { name: 'QA Reg 012', email, password: PW, confirm: PW, pet: 'cat', terms: false });
    const r = await submitReg(page);
    await check(page, 'ข้อความ "กรุณายอมรับเงื่อนไข"', page.getByTestId('error-terms'), async (el) => {
      await expect.soft(el).toHaveText('กรุณายอมรับเงื่อนไข');
    });
    await check(page, 'URL ยัง /register', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/register');
    });
    await checkApi('ไม่มี 201', { status: r?.status() ?? '(ไม่มี request)' }, () => {
      expect.soft(r?.status()).not.toBe(201);
    });
  });
  await test.step('2. ติ๊กเงื่อนไข แล้วส่งอีกครั้ง', async () => {
    if (new URL(page.url()).pathname !== '/register') await page.goto('/register');
    await fillReg(page, { name: 'QA Reg 012', email, password: PW, confirm: PW, pet: 'cat', terms: true });
    const r = await submitReg(page, { timeout: 10_000 });
    await checkApi('HTTP 201', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

test("TC-REG-012 ไม่เลือกสัตว์เลี้ยงเลย (เอาค่าที่ติ๊กไว้ออก) ต้องสมัครไม่ได้", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "URL ยัง `/register` · ไม่มี 201 (ถ้ามี request ต้องได้ HTTP 400) · มีข้อความ error ที่กลุ่มสัตว์เลี้ยง (ตอนนี้ล้ม: สมัครผ่าน บัญชีถูกตั้งเป็น \"ทาสแมว 🐱\" เงียบ ๆ)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R137 · Q35 · ความเสี่ยง: ข้อมูลสัตว์เลี้ยงผิด คำแนะนำสินค้าผิด · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  let r = null as Response | null;
  await test.step('1. เปิด /register กรอกตามข้อมูล', async () => {
    await page.goto('/register');
    await fillReg(page, { name: 'QA Reg 013', email: runEmail('qa-reg-013'), password: PW, confirm: PW, terms: true });
  });
  await test.step('2. ตั้ง checked = false ให้ input ทุกตัวในกลุ่มสัตว์เลี้ยง (แมว/หมา/ทั้งคู่)', async () => {
    await page.evaluate(() => {
      document.querySelectorAll<HTMLInputElement>('input[name="pet"]').forEach((i) => (i.checked = false));
    });
  });
  await test.step('3. ส่งฟอร์ม', async () => {
    r = await submitReg(page);
  });
  await check(page, 'URL ยัง /register', null, async () => {
    expect.soft(new URL(page.url()).pathname).toBe('/register');
  });
  await checkApi('ไม่มี 201 (ถ้ามี request ต้องได้ HTTP 400)', { status: r?.status() ?? '(ไม่มี request)', body: await respJson(r) }, () => {
    if (r) expect.soft(r.status()).toBe(400);
    else expect.soft(r).toBeNull();
  });
  if (new URL(page.url()).pathname === '/register') {
    const group = page.locator('fieldset.pet-choice');
    await check(page, 'มีข้อความ error ที่กลุ่มสัตว์เลี้ยง', group, async (el) => {
      await expect.soft(el.locator('.field-error, [role="alert"]')).toHaveCount(1);
    }, { actual: () => group.innerText() });
  } else {
    await check(page, 'มีข้อความ error ที่กลุ่มสัตว์เลี้ยง (หน้าเปลี่ยนไปแล้ว ไม่มีฟอร์ม)', null, async () => {
      expect.soft(new URL(page.url()).pathname, 'สมัครผ่านแล้วออกจากหน้าสมัคร จึงไม่มี error ที่กลุ่มสัตว์เลี้ยง').toBe('/register');
    });
  }
});

test("TC-REG-013 API สมัครด้วย `pet` ที่ไม่รู้จักหรือไม่ส่ง `pet` ต้องได้ 400 ไม่สร้างบัญชี", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2: HTTP 400 · ไม่มี `Set-Cookie: pp_session` · ขั้น 3: HTTP 201 (ยืนยันว่าขั้น 1 ไม่ได้สร้างบัญชี) (ตอนนี้ล้ม: 201 แล้วบันทึกเป็น `\"pet\":\"cat\"`)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R138 · R140 · Q35 · ความเสี่ยง: ยิง API ข้ามการตรวจหน้าเว็บ ข้อมูลผิดถูกบันทึกเงียบ ๆ · เทคนิค: Security · Negative" },
  ],
}, async ({ page, request }) => {
  const emailA = runEmail('qa-reg-014');
  const emailB = runEmail('qa-reg-015');
  await test.step('1. ยิง POST /api/auth/register ด้วย body (ก) "pet":"fish"', async () => {
    const r = await apiRegister(request, regBody('QA Reg 014', emailA, { pet: 'fish' }));
    const sc = apiSetCookie(r);
    await checkApi('(ก) HTTP 400', { status: r.status(), body: await apiJson(r) }, () => {
      expect.soft(r.status()).toBe(400);
    });
    await checkApi('(ก) ไม่มี Set-Cookie: pp_session', sc, () => {
      expect.soft(sc).not.toContain('pp_session');
    });
  });
  await test.step('2. ยิงด้วย body (ข) ลบ key pet ออก', async () => {
    const body = regBody('QA Reg 015', emailB);
    delete body.pet;
    const r = await apiRegister(request, body);
    const sc = apiSetCookie(r);
    await checkApi('(ข) HTTP 400', { status: r.status(), body: await apiJson(r) }, () => {
      expect.soft(r.status()).toBe(400);
    });
    await checkApi('(ข) ไม่มี Set-Cookie: pp_session', sc, () => {
      expect.soft(sc).not.toContain('pp_session');
    });
  });
  await test.step('3. สมัครผ่านฟอร์ม /register ด้วยอีเมลชุด (ก) ข้อมูลถูกครบ', async () => {
    const r = await registerViaForm(page, { name: 'QA Reg 014', email: emailA });
    await checkApi('HTTP 201 (ขั้น 1 ไม่ได้สร้างบัญชี)', { status: r?.status() ?? null, body: await respJson(r) }, () => {
      expect.soft(r?.status()).toBe(201);
    });
  });
});

test("TC-REG-014 อีเมลซ้ำต้องสมัครไม่ได้ ไม่สนตัวพิมพ์และช่องว่างหน้า-หลัง และไม่ทับรหัสเดิม", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2 ทุกค่า: ข้อความ \"อีเมลนี้ถูกใช้แล้ว\" · ไม่มี 201 · URL ยัง `/register` · ขั้น 3: \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" · ขั้น 4: ล็อกอินสำเร็จ HTTP 2xx (รหัสของ demo ไม่ถูกเปลี่ยน)" },
    { type: 'source', description: "[D]+[R] · R139 · ความเสี่ยง: สมัครทับบัญชีลูกค้าเดิม / บัญชีซ้ำ · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page, request }) => {
  const own = runEmail('qa-reg-016');
  await test.step('เงื่อนไขก่อนเริ่ม: สมัครบัญชี qa-reg-016 / Paw12345 ไว้ก่อน (context แยก — หน้าเว็บยังไม่ล็อกอิน)', async () => {
    await apiRegister(request, regBody('QA Reg 016', own));
  });
  const dups = [
    { label: '(ก)', email: 'demo@pawpantry.test' },
    { label: '(ข)', email: 'DEMO@PawPantry.test' },
    { label: '(ค)', email: '  demo@pawpantry.test  ' },
    { label: '(ง)', email: own.toUpperCase() },
  ];
  await page.goto('/register');
  for (const [i, d] of dups.entries()) {
    await test.step(`${i === 0 ? '1' : '2'}. เปิด /register กรอกอีเมล ${d.label} "${d.email}" แล้วส่ง`, async () => {
      if (new URL(page.url()).pathname !== '/register') {
        await apiLogout(page);
        await page.goto('/register');
      }
      await fillReg(page, { name: 'QA Reg Dup', email: d.email, password: 'Pawdup123', confirm: 'Pawdup123', pet: 'cat', terms: true });
      const r = await submitReg(page, { timeout: 5_000 });
      await check(page, `${d.label}: ข้อความ "${MSG_DUP}"`, page.getByTestId('error-email'), async (el) => {
        await expect.soft(el).toHaveText(MSG_DUP);
      });
      await checkApi(`${d.label}: ไม่มี 201`, { status: r?.status() ?? '(ไม่มี request)' }, () => {
        expect.soft(r?.status()).not.toBe(201);
      });
      await check(page, `${d.label}: URL ยัง /register`, null, async () => {
        expect.soft(new URL(page.url()).pathname).toBe('/register');
      });
    });
  }
  await test.step('3. ไป /login ล็อกอิน demo@pawpantry.test / Pawdup123', async () => {
    await apiLogout(page);
    await page.goto('/login');
    await submitLogin(page, DEMO_EMAIL, 'Pawdup123');
    await check(page, `ข้อความ "${MSG_LOGIN_FAIL}"`, page.getByTestId('login-error'), async (el) => {
      await expect.soft(el).toHaveText(MSG_LOGIN_FAIL);
    });
  });
  await test.step('4. ล็อกอิน demo@pawpantry.test / Paw12345', async () => {
    if (new URL(page.url()).pathname !== '/login') {
      await apiLogout(page);
      await page.goto('/login');
    }
    const r = await submitLogin(page, DEMO_EMAIL, PW);
    await checkApi('ล็อกอินสำเร็จ HTTP 2xx (รหัสของ demo ไม่ถูกเปลี่ยน)', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
  });
});

test("TC-REG-015 server ตรวจรหัสผ่านซ้ำเมื่อยิง API ตรง (ไม่พึ่ง JS หน้าเว็บ)", {
  tag: ["@P1","@5.6","@api"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2 ทุกชุด: HTTP 400 · `errors.password` = \"รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข\" (ตรงกับหน้าเว็บ) · ไม่มี `Set-Cookie: pp_session` · ขั้น 3 ทุกชุด: HTTP 401 \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" (ตอนนี้คาดว่าล้มที่ชุด (ง): หน้าเว็บรับ `Paw1234␠` ตาม R134 — EXPLORATION ยังไม่เคยยิงค่านี้ตรงที่ API)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R140 · R132 · R134 · Q30 · ความเสี่ยง: ยิง API สร้างบัญชีรหัสอ่อนได้ · เทคนิค: Security · Negative · Boundary" },
  ],
}, async ({ request }) => {
  const sets = [
    { label: '(ก)', pw: 'abc', email: runEmail('qa-reg-017') },
    { label: '(ข)', pw: 'Pawsssss', email: runEmail('qa-reg-018') },
    { label: '(ค)', pw: 'Paw1234', email: runEmail('qa-reg-019') },
    { label: '(ง)', pw: 'Paw1234 ', email: runEmail('qa-reg-020') },
  ];
  await test.step('1–2. ยิง POST /api/auth/register ทีละชุด (ก)–(ง) แล้วอ่าน status และ errors', async () => {
    for (const s of sets) {
      const r = await apiRegister(request, regBody('QA Reg 015', s.email, { password: s.pw, confirm: s.pw }));
      const body = await apiJson(r);
      const sc = apiSetCookie(r);
      await checkApi(`${s.label} รหัส "${s.pw}": HTTP 400`, { status: r.status(), body }, () => {
        expect.soft(r.status()).toBe(400);
      });
      await checkApi(`${s.label} errors.password = "${MSG_PW_RULE}"`, body, () => {
        expect.soft(body?.errors?.password).toBe(MSG_PW_RULE);
      });
      await checkApi(`${s.label} ไม่มี Set-Cookie: pp_session`, sc, () => {
        expect.soft(sc).not.toContain('pp_session');
      });
    }
  });
  await test.step('3. ล็อกอินด้วยอีเมลของแต่ละชุด + รหัสที่ใช้', async () => {
    for (const s of sets) {
      const r = await request.post('/api/auth/login', { data: { email: s.email, password: s.pw } });
      const body = await apiJson(r);
      await checkApi(`${s.label} ล็อกอิน: HTTP 401 "${MSG_LOGIN_FAIL}"`, { status: r.status(), body }, () => {
        expect.soft(r.status()).toBe(401);
        expect.soft(JSON.stringify(body)).toContain(MSG_LOGIN_FAIL);
      });
    }
  });
});

test("TC-REG-016 server ตรวจช่องอื่นซ้ำเมื่อยิง API ตรง (ยืนยันรหัส เงื่อนไข ชื่อ อีเมล อีเมลซ้ำ)", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "(ก) 400 ข้อความ \"รหัสผ่านไม่ตรงกัน\" ที่ช่องยืนยัน · (ข) 400 \"กรุณายอมรับเงื่อนไข\" · (ค) 400 `errors.name` = \"กรุณากรอกชื่อ\" ทั้งสองค่า · (ง) 400 `errors.email` = \"อีเมลไม่ถูกต้อง\" · (จ) 400 `errors.email` = \"กรุณากรอกอีเมล\" (สมมติฐาน Q36) (ตอนนี้ล้ม: \"อีเมลไม่ถูกต้อง\" ตาม R130) · (ฉ) 400 หรือ 409 \"อีเมลนี้ถูกใช้แล้ว\" · ทุกชุดไม่มี `Set-Cookie: pp_session` · ขั้น 3: 201 ทุกอีเมล (ขั้น 1 ไม่ได้สร้างบัญชี)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R140 · R129 · R130 · R131 · R135 · R136 · R139 · Q36 · ความเสี่ยง: ข้ามการตรวจหน้าเว็บสร้างบัญชีผิดกฎ · เทคนิค: Security · Negative" },
  ],
}, async ({ page, request }) => {
  const e21 = runEmail('qa-reg-021');
  const e22 = runEmail('qa-reg-022');
  const e23 = runEmail('qa-reg-023');
  type Case = { label: string; body: Record<string, unknown>; field: string; msg: string; statuses: number[] };
  const cases: Case[] = [
    { label: '(ก) ยืนยันรหัส Paw12346', body: regBody('QA Reg 021', e21, { confirm: 'Paw12346' }), field: 'confirm', msg: 'รหัสผ่านไม่ตรงกัน', statuses: [400] },
    { label: '(ข) terms:false', body: regBody('QA Reg 022', e22, { terms: false }), field: 'terms', msg: 'กรุณายอมรับเงื่อนไข', statuses: [400] },
    { label: '(ค) ชื่อ ""', body: regBody('', e23), field: 'name', msg: 'กรุณากรอกชื่อ', statuses: [400] },
    { label: '(ค) ชื่อ "   "', body: regBody('   ', e23), field: 'name', msg: 'กรุณากรอกชื่อ', statuses: [400] },
    { label: '(ง) อีเมล notanemail', body: regBody('QA Reg 016', 'notanemail'), field: 'email', msg: 'อีเมลไม่ถูกต้อง', statuses: [400] },
    { label: '(จ) อีเมล ""', body: regBody('QA Reg 016', ''), field: 'email', msg: 'กรุณากรอกอีเมล', statuses: [400] },
    { label: '(ฉ) อีเมล demo@pawpantry.test', body: regBody('QA Reg 016', DEMO_EMAIL), field: 'email', msg: MSG_DUP, statuses: [400, 409] },
  ];
  await test.step('1–2. ยิง POST /api/auth/register ทีละชุด (ก)–(ฉ) อ่าน status และ errors.<ช่อง>', async () => {
    for (const c of cases) {
      const r = await apiRegister(request, c.body);
      const body = await apiJson(r);
      const sc = apiSetCookie(r);
      await checkApi(`${c.label}: HTTP ${c.statuses.join(' หรือ ')}`, { status: r.status(), body }, () => {
        expect.soft(c.statuses, `status ${r.status()}`).toContain(r.status());
      });
      await checkApi(`${c.label}: errors.${c.field} = "${c.msg}"`, body, () => {
        expect.soft(body?.errors?.[c.field]).toBe(c.msg);
      });
      await checkApi(`${c.label}: ไม่มี Set-Cookie: pp_session`, sc, () => {
        expect.soft(sc).not.toContain('pp_session');
      });
    }
  });
  await test.step('3. สมัครผ่านฟอร์มด้วยอีเมล qa-reg-021 ถึง qa-reg-023 ข้อมูลถูก', async () => {
    for (const [n, e] of [['021', e21], ['022', e22], ['023', e23]] as const) {
      await apiLogout(page);
      const r = await registerViaForm(page, { name: `QA Reg ${n}`, email: e });
      await checkApi(`qa-reg-${n}: HTTP 201 (ขั้น 1 ไม่ได้สร้างบัญชี)`, { status: r?.status() ?? null, body: await respJson(r) }, () => {
        expect.soft(r?.status()).toBe(201);
      });
    }
  });
});

test("TC-REG-017 ชื่อที่เป็น HTML/script ต้องแสดงเป็นข้อความ ไม่ถูกรัน (หัวเว็บ + บัญชี)", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "จำนวน dialog = 0 ตลอดทุกขั้น · หัวเว็บแสดงข้อความตรงตัว \"<img src=x onerror=alert(1)>\" · ผลจาก Console = 0 · `/account` แสดงชื่อเป็นข้อความตรงตัวเดียวกัน ไม่มี `img[src=\"x\"]` ในหน้า" },
    { type: 'source', description: "[R] · R144 · ความเสี่ยง: Stored XSS ผ่านชื่อผู้ใช้ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const xss = '<img src=x onerror=alert(1)>';
  const dlg = countDialogs(page);
  await test.step('1. เปิด /register กรอกชื่อ payload แล้วส่ง', async () => {
    await registerViaForm(page, { name: xss, email: runEmail('qa-reg-024') });
  });
  await test.step('2. ดูหัวเว็บ รัน document.querySelectorAll(\'header img[src="x"]\').length', async () => {
    await check(page, 'หัวเว็บแสดงข้อความตรงตัว "<img src=x onerror=alert(1)>"', page.getByTestId('user-menu'), async (el) => {
      await expect.soft(el).toContainText(xss);
    });
    const n = await page.evaluate(() => document.querySelectorAll('header img[src="x"]').length);
    await check(page, 'ผลจาก Console = 0', siteHeader(page), async () => {
      expect.soft(n).toBe(0);
    }, { actual: async () => n });
  });
  await test.step('3. เปิด /account แล้ว reload 1 ครั้ง', async () => {
    await page.goto('/account');
    await page.reload();
    await check(page, '/account แสดงชื่อเป็นข้อความตรงตัวเดียวกัน', page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(xss);
    });
    const n = await page.locator('img[src="x"]').count();
    await check(page, 'ไม่มี img[src="x"] ในหน้า', null, async () => {
      expect.soft(n).toBe(0);
    }, { actual: async () => n });
  });
  await check(page, 'จำนวน dialog = 0 ตลอดทุกขั้น', null, async () => {
    expect.soft(dlg.n).toBe(0);
  }, { actual: async () => dlg.n });
});

test("TC-REG-018 payload XSS แบบอื่นในชื่อ ต้องไม่ถูกรันในหัวเว็บ บัญชี และช่องชื่อผู้รับที่ checkout เติมให้", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "จำนวน dialog = 0 ทุกขั้น · หัวเว็บและ `/account` แสดงชื่อเป็นข้อความตรงตัว · ไม่มี element `script`/`svg` ที่เกิดจากชื่อในหัวเว็บ (`header svg[onload]` = 0) · ช่องชื่อผู้รับมี value เท่ากับสตริงชื่อตรงตัว · ปุ่ม \"ยืนยันสั่งซื้อ ฿85\" (฿35 + ส่ง ฿50 = ฿85)" },
    { type: 'source', description: "[D]+[R] · R144 · ความเสี่ยง: XSS ในจุดอื่นที่นำชื่อไปใช้ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const dlg = countDialogs(page);
  const sets = [
    { label: '(ก)', name: '<script>alert(1)</script>', email: runEmail('qa-reg-025') },
    { label: '(ข)', name: '"><svg onload=alert(1)>', email: runEmail('qa-reg-026') },
  ];
  for (const [i, s] of sets.entries()) {
    if (i > 0) {
      await test.step('4. ออกจากระบบ ล้าง localStorage แล้วทำขั้น 1–3 ด้วยชุด (ข)', async () => {
        if (await page.getByTestId('logout-button').count()) await logoutUi(page);
        else await apiLogout(page);
        await page.evaluate(() => localStorage.clear());
      });
    }
    await test.step(`${s.label} 1. สมัครด้วยชื่อ ${s.name}`, async () => {
      await registerViaForm(page, { name: s.name, email: s.email });
    });
    await test.step(`${s.label} 2. ดูหัวเว็บ และ /account`, async () => {
      await check(page, `${s.label} หัวเว็บแสดงชื่อเป็นข้อความตรงตัว`, page.getByTestId('user-menu'), async (el) => {
        await expect.soft(el).toContainText(s.name);
      });
      const counts = await page.evaluate(() => ({
        svgOnload: document.querySelectorAll('header svg[onload]').length,
        script: document.querySelectorAll('header script').length,
      }));
      await check(page, `${s.label} ไม่มี element script/svg ที่เกิดจากชื่อในหัวเว็บ (header svg[onload] = 0)`, siteHeader(page), async () => {
        expect.soft(counts.svgOnload).toBe(0);
        expect.soft(counts.script).toBe(0);
      }, { actual: async () => counts });
      await page.goto('/account');
      await check(page, `${s.label} /account แสดงชื่อเป็นข้อความตรงตัว`, page.getByTestId('profile-card'), async (el) => {
        await expect.soft(el).toContainText(s.name);
      });
    });
    await test.step(`${s.label} 3. ใส่ทูน่าซอง ×1 ลงตะกร้า ไป /checkout อ่าน value ของช่องชื่อผู้รับ`, async () => {
      await addToCart(page, 'tuna-pouch');
      await page.goto('/checkout');
      await check(page, `${s.label} ช่องชื่อผู้รับมี value เท่ากับสตริงชื่อตรงตัว`, page.getByTestId('ship-name'), async (el) => {
        await expect.soft(el).toHaveValue(s.name);
      });
      await check(page, `${s.label} ปุ่ม "ยืนยันสั่งซื้อ ฿85" (฿35 + ส่ง ฿50 = ฿85)`, page.getByTestId('place-order'), async (el) => {
        await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿85');
      });
    });
  }
  await check(page, 'จำนวน dialog = 0 ทุกขั้น', null, async () => {
    expect.soft(dlg.n).toBe(0);
  }, { actual: async () => dlg.n });
});

test("TC-REG-019 สมัครเสร็จต้องพาไปตาม `next` ที่เป็น path ภายใน (รวมเส้นทางจาก checkout)", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: URL ปลายทาง `/wishlist` · ขั้น 3: URL `/login` ที่ `next` = `/checkout` · ขั้น 5: URL ปลายทาง `/checkout` · ตะกร้ายังมีลูกแมวแซลมอน 400 g ×1 · ปุ่ม \"ยืนยันสั่งซื้อ ฿239\" (฿189 + ส่ง ฿50 = ฿239) (ตอนนี้ล้ม: ไป `/account?welcome=1` ทั้งสองกรณี)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R] · R141 · Q33 · ความเสี่ยง: ลูกค้าที่สมัครระหว่าง checkout หลุดเส้นทางซื้อ · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /register?next=%2Fwishlist สมัครชุด (ก) ดู URL ปลายทาง', async () => {
    await registerViaForm(page, { name: 'QA Reg 027', email: runEmail('qa-reg-027') }, '/register?next=%2Fwishlist');
    await check(page, 'ขั้น 1: URL ปลายทาง /wishlist', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/wishlist');
    });
  });
  await test.step('2. ออกจากระบบ ล้าง localStorage', async () => {
    if (await page.getByTestId('logout-button').count()) await logoutUi(page);
    else await apiLogout(page);
    await page.evaluate(() => localStorage.clear());
  });
  await test.step('3. ใส่ลูกแมวแซลมอน 400 g ×1 ไป /cart กด "ดำเนินการชำระเงิน →"', async () => {
    await addToCart(page, 'kitten-salmon-dry', { size: '400 g' });
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => {});
    await check(page, 'ขั้น 3: URL /login ที่ next = /checkout', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
      expect.soft(nextOf(page.url())).toBe('/checkout');
    });
  });
  await test.step('4. ในหน้า /login?next=… กดลิงก์ "สมัครสมาชิก" แล้วสมัครชุด (ข)', async () => {
    await page.getByTestId('register-link').click();
    await page.waitForURL(/\/register/, { timeout: 10_000 }).catch(() => {});
    await fillReg(page, { name: 'QA Reg 028', email: runEmail('qa-reg-028'), password: PW, confirm: PW, pet: 'cat', terms: true });
    await submitReg(page, { timeout: 10_000 });
    await page.waitForLoadState().catch(() => {});
  });
  await test.step('5. ดู URL ปลายทางและปุ่มยืนยัน', async () => {
    await check(page, 'ขั้น 5: URL ปลายทาง /checkout', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/checkout');
    });
    const cart = await page.evaluate(() => localStorage.getItem('pp-cart'));
    await check(page, 'ตะกร้ายังมีลูกแมวแซลมอน 400 g ×1', null, async () => {
      const items = (() => {
        try {
          return JSON.parse(cart ?? '[]') as { slug: string; size: string; qty: number }[];
        } catch {
          return [];
        }
      })();
      expect.soft(items).toEqual([expect.objectContaining({ slug: 'kitten-salmon-dry', size: '400 g', qty: 1 })]);
    }, { actual: async () => cart });
    await check(page, 'ปุ่ม "ยืนยันสั่งซื้อ ฿239" (฿189 + ส่ง ฿50 = ฿239)', page.getByTestId('place-order'), async (el) => {
      await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿239');
    });
  });
});

test("TC-REG-020 `next` ที่ชี้ออกนอกเว็บบนหน้าสมัครต้องไม่พาออกนอกเว็บ", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ทุกชุด: HTTP 201 · `location.origin` = origin ของเว็บที่ทดสอบ (`http://localhost:3000`) · `location.pathname` = `/` (สมมติฐาน Q33: หน้าสมัครทำตาม `next` และปัด next อันตรายไป `/`; ถ้าทีมตอบว่าไป `/account?welcome=1` เสมอ ให้คาดหวัง `/account`) · Network ไม่มี request ไป `evil.example` · ตัดสินผล Security (open redirect) จาก `location.origin` และ Network เท่านั้น — ถ้าล้มเฉพาะ pathname ให้บันทึกเป็นบั๊กเรื่อง Q33 ไม่ใช่ open redirect (ตอนนี้ล้มเฉพาะ pathname: ไป `/account?welcome=1` ซึ่งยังอยู่ในเว็บ — ส่วน origin ผ่าน)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R141 · Q32 · Q33 · ความเสี่ยง: open redirect ทันทีที่หน้าสมัครเริ่มใช้ `next` · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const hits = await guardEvil(page);
  const sets = [
    { label: '(ก)', url: '/register?next=/%5Cevil.example', email: runEmail('qa-reg-029') },
    { label: '(ข)', url: '/register?next=https%3A%2F%2Fevil.example', email: runEmail('qa-reg-030') },
    { label: '(ค)', url: '/register?next=%2F%2Fevil.example', email: runEmail('qa-reg-031') },
  ];
  for (const [i, s] of sets.entries()) {
    await test.step(`${i === 0 ? '1–2' : '3'}. เปิด ${s.url} สมัคร รอจนหน้าโหลดเสร็จ แล้วอ่าน location.origin / pathname`, async () => {
      await apiLogout(page);
      const r = await registerViaForm(page, { name: `QA Reg 0${29 + i}`, email: s.email }, s.url);
      await page.waitForLoadState().catch(() => {});
      const loc = await readLocation(page);
      await checkApi(`${s.label} HTTP 201`, { status: r?.status() ?? null }, () => {
        expect.soft(r?.status()).toBe(201);
      });
      await check(page, `${s.label} location.origin = ${originOf()}`, null, async () => {
        expect.soft(loc.origin).toBe(originOf());
      }, { actual: async () => loc });
      await check(page, `${s.label} location.pathname = / (สมมติฐาน Q33)`, null, async () => {
        expect.soft(loc.pathname).toBe('/');
      }, { actual: async () => loc });
    });
  }
  await checkApi('Network ไม่มี request ไป evil.example', hits, () => {
    expect.soft(hits).toEqual([]);
  });
});

test("TC-REG-021 ลิงก์ \"เข้าสู่ระบบ\" ในหน้าสมัครต้องส่ง `next` ต่อ", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: `href` มี `next=` ที่ถอดรหัสแล้วเท่ากับ `/account` · ขั้น 3: URL ปลายทาง `/account` แสดง `demo@pawpantry.test` (ตอนนี้ล้ม: ลิงก์เป็น `/login` เฉย ๆ next หาย ไปที่ `/`)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[D] · R142 · Q33 · ความเสี่ยง: ลูกค้าที่สลับไปล็อกอินหลุดเส้นทาง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const link = page.locator('main').getByRole('link', { name: 'เข้าสู่ระบบ' });
  await test.step('1. เปิด /register?next=%2Faccount', async () => {
    await page.goto('/register?next=%2Faccount');
  });
  await test.step('2. อ่าน href ของลิงก์ "เข้าสู่ระบบ"', async () => {
    const href = await link.getAttribute('href');
    await check(page, 'href มี next= ที่ถอดรหัสแล้วเท่ากับ /account', link, async () => {
      expect.soft(nextOf(href ?? '')).toBe('/account');
    }, { actual: async () => href });
  });
  await test.step('3. กดลิงก์ แล้วล็อกอินด้วยบัญชี demo', async () => {
    await link.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => {});
    await submitLogin(page, DEMO_EMAIL, PW);
    await check(page, 'URL ปลายทาง /account', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/account');
    });
    await check(page, 'แสดง demo@pawpantry.test', page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(DEMO_EMAIL);
    });
  });
});

test("TC-REG-022 คนที่ล็อกอินอยู่เปิด `/login` `/register` ยังเห็นฟอร์ม และสมัครใหม่แล้วสลับเป็นบัญชีใหม่ทั้งหมด", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: URL ยัง `/login` มีช่องอีเมลและรหัสผ่าน · ขั้น 3: URL ยัง `/register` มีฟอร์มสมัคร · ขั้น 5: หัวเว็บมี \"QA Reg 032\" ไม่มีชื่อ demo · `/account` แสดง `qa-reg-032-{run}@pawpantry.test` ไม่ใช่ `demo@pawpantry.test` · `pp_session` ไม่เท่ากับค่าที่จดในขั้น 1" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[D] · R143 · Q34 · ความเสี่ยง: ข้อมูลบัญชีเก่าปนกับบัญชีใหม่ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const email = runEmail('qa-reg-032');
  let before: string | undefined;
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo', async () => {
    await apiLogin(page);
    await page.goto('/');
  });
  await test.step('1. จดค่า pp_session', async () => {
    before = await sessionCookie(page);
  });
  await test.step('2. เปิด /login ดู URL และฟอร์ม', async () => {
    await page.goto('/login');
    await page.waitForLoadState();
    await check(page, 'URL ยัง /login', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
    });
    await check(page, 'มีช่องอีเมลและรหัสผ่าน', page.locator('[data-testid="login-email"], [data-testid="login-password"]'), async (el) => {
      await expect.soft(el).toHaveCount(2);
    });
  });
  await test.step('3. เปิด /register ดู URL และฟอร์ม', async () => {
    await page.goto('/register');
    await page.waitForLoadState();
    await check(page, 'URL ยัง /register', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/register');
    });
    await check(page, 'มีฟอร์มสมัคร', page.getByTestId('reg-submit'), async (el) => {
      await expect.soft(el).toBeVisible();
    });
  });
  await test.step('4. สมัครบัญชีใหม่', async () => {
    await registerViaForm(page, { name: 'QA Reg 032', email });
  });
  await test.step('5. ดูหัวเว็บ /account และค่า pp_session', async () => {
    await check(page, 'หัวเว็บมี "QA Reg 032"', page.getByTestId('user-menu'), async (el) => {
      await expect.soft(el).toContainText('QA Reg 032');
    });
    await check(page, 'หัวเว็บไม่มีชื่อ demo', siteHeader(page), async (el) => {
      await expect.soft(el).not.toContainText(DEMO_NAME);
    });
    await page.goto('/account');
    await check(page, `/account แสดง ${email} ไม่ใช่ demo@pawpantry.test`, page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(email);
      await expect.soft(el).not.toContainText(DEMO_EMAIL);
    });
    const after = await sessionCookie(page);
    await check(page, 'pp_session ไม่เท่ากับค่าที่จดในขั้น 1', null, async () => {
      expect.soft(after).toBeTruthy();
      expect.soft(after).not.toBe(before);
    }, { actual: async () => ({ before, after }) });
  });
});

test("TC-REG-023 response ของการสมัครต้องไม่คืนรหัสผ่าน/แฮช", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ทุกครั้ง: HTTP 201 · body มี object `user` · ไม่มี key `password`/`passwordHash`/`hash`/`salt` และไม่มีสตริง `Paw12345` · `Set-Cookie` ของ `pp_session` มี `HttpOnly` · จดค่า `user.id` สองบัญชีไว้ในรายงาน (ข้อสังเกตเรื่อง id เรียงต่อกัน ไม่ใช้ตัดสินผ่าน/ล้ม)" },
    { type: 'source', description: "[R] · R145 · R156 · ความเสี่ยง: ข้อมูลลับรั่วจาก API / เดาจำนวนผู้ใช้ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const sets = [
    { label: '(ก)', name: 'QA Reg 033', email: runEmail('qa-reg-033') },
    { label: '(ข)', name: 'QA Reg 034', email: runEmail('qa-reg-034') },
  ];
  const ids: unknown[] = [];
  for (const [i, s] of sets.entries()) {
    await test.step(`${i === 0 ? '1–2' : '3'}. ${i ? 'ออกจากระบบ ' : ''}สมัคร ${s.label} ผ่านฟอร์ม เปิด response ของ POST /api/auth/register ค้นคำ password/hash/salt/Paw12345`, async () => {
      await apiLogout(page);
      const r = await registerViaForm(page, { name: s.name, email: s.email });
      const text = r ? await r.text().catch(() => '') : '';
      let body: any = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      const sc = await respSetCookie(r);
      const keys: string[] = [];
      const walk = (o: unknown) => {
        if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) (keys.push(k), walk(v));
      };
      walk(body);
      ids.push(body?.user?.id);
      await checkApi(`${s.label} HTTP 201`, { status: r?.status() ?? null }, () => {
        expect.soft(r?.status()).toBe(201);
      });
      await checkApi(`${s.label} body มี object user`, body, () => {
        expect.soft(typeof body?.user).toBe('object');
        expect.soft(body?.user).not.toBeNull();
      });
      await checkApi(`${s.label} ไม่มี key password/passwordHash/hash/salt`, keys, () => {
        for (const k of ['password', 'passwordHash', 'hash', 'salt']) expect.soft(keys, `key ${k}`).not.toContain(k);
      });
      await checkApi(`${s.label} ไม่มีสตริง Paw12345`, text, () => {
        expect.soft(text).not.toContain(PW);
      });
      await checkApi(`${s.label} Set-Cookie ของ pp_session มี HttpOnly`, sc, () => {
        expect.soft(sc).toMatch(/pp_session=[^;]*;.*HttpOnly/i);
      });
    });
  }
  await checkApi('จด user.id สองบัญชี (ข้อสังเกต ไม่ใช้ตัดสินผ่าน/ล้ม)', { 'user.id (ก)': ids[0], 'user.id (ข)': ids[1] }, () => {});
  test.info().annotations.push({ type: 'note', description: `user.id ของ (ก) = ${String(ids[0])}, (ข) = ${String(ids[1])}` });
});

test("TC-REG-024 ใช้ฟอร์มสมัครด้วยคีย์บอร์ดและโปรแกรมอ่านจอได้ (label, ลำดับ Tab, Enter, error ผูกช่อง)", {
  tag: ["@P2","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ทุกค่า ≥ 1 · ขั้น 2: ลำดับโฟกัสตรงกับลำดับที่ตาเห็นบนจอ (บนลงล่าง) ไม่ข้ามช่อง (กลุ่มสัตว์เลี้ยงนับเป็น 1 จุดโฟกัสถ้าเป็น radio) · ขั้น 3: ช่องที่ error มี `aria-invalid=\"true\"` และ `aria-describedby` ชี้ไป id ของ element ที่มีข้อความ error ของช่องนั้น (เช่น \"กรุณากรอกชื่อ\") · ขั้น 4: HTTP 201 ไป `/account?welcome=1` (ตอนนี้ล้ม: ขั้น 3 มีแค่ `aria-invalid` ไม่มี `aria-describedby`)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R153 · R129 · Q36 · ความเสี่ยง: ผู้ใช้โปรแกรมอ่านจอไม่รู้ว่าช่องไหนผิด · เทคนิค: Happy path · Negative" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /register รัน labels.length ของ input ทุกตัวในฟอร์ม', async () => {
    await page.goto('/register');
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLInputElement>('form input:not([type=hidden])')].map((i) => ({
        id: i.dataset.testid || i.id,
        labels: i.labels?.length ?? 0,
      })),
    );
    await check(page, 'ทุกค่า labels.length ≥ 1', page.locator('form.auth-form input:not([type=hidden])'), async () => {
      for (const l of labels) expect.soft(l.labels, `${l.id}`).toBeGreaterThanOrEqual(1);
    }, { actual: async () => labels });
  });
  await test.step('2. กด Tab จากช่องแรกไปจนถึงปุ่มส่ง จดลำดับ', async () => {
    await page.getByTestId('reg-name').focus();
    const order: string[] = [await activeId(page)];
    for (let i = 0; i < 12 && order[order.length - 1] !== 'reg-submit'; i++) {
      await page.keyboard.press('Tab');
      order.push(await activeId(page));
    }
    const norm = order.map((o) => (o.startsWith('reg-pet-') ? 'pet' : o));
    await check(page, 'ลำดับโฟกัสตรงกับลำดับที่ตาเห็น (บนลงล่าง) ไม่ข้ามช่อง (กลุ่มสัตว์เลี้ยงนับ 1 จุด)', page.locator('form.auth-form'), async () => {
      expect.soft(norm).toEqual(['reg-name', 'reg-email', 'reg-password', 'reg-confirm', 'pet', 'reg-terms', 'reg-submit']);
    }, { actual: async () => order });
  });
  await test.step('3. กด Enter ในช่องชื่อตอนฟอร์มว่าง อ่าน aria-invalid และ aria-describedby ของช่องที่ error', async () => {
    await page.goto('/register');
    await page.getByTestId('reg-name').press('Enter');
    await page.getByTestId('error-name').waitFor({ timeout: 5_000 }).catch(() => {});
    const rep = await describedByReport(page, ['reg-name', 'reg-email', 'reg-password', 'reg-confirm', 'reg-terms']);
    await check(page, 'ช่องชื่อมี aria-invalid="true" และ aria-describedby ชี้ไปข้อความ "กรุณากรอกชื่อ"', page.getByTestId('reg-name'), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-invalid', 'true');
      const db = (await el.getAttribute('aria-describedby')) ?? '';
      const texts = await page.evaluate((ids) => ids.map((id) => document.getElementById(id)?.textContent ?? ''), db.split(/\s+/).filter(Boolean));
      expect.soft(texts.some((t) => t.includes('กรุณากรอกชื่อ')), `aria-describedby="${db}"`).toBe(true);
    }, { actual: async () => rep[0] });
    await check(page, 'ทุกช่องที่ error มี aria-describedby ชี้ไป element ที่มีข้อความ error ของช่องนั้น', page.locator('form.auth-form [aria-invalid="true"]'), async () => {
      for (const f of rep) expect.soft(f.ok, `${f.field}: aria-describedby=${f.describedBy}`).toBe(true);
    }, { actual: async () => rep });
  });
  await test.step('4. กรอกข้อมูลถูกครบ แล้วกด Enter ในช่องยืนยันรหัส', async () => {
    await fillReg(page, { name: 'QA Reg 035', email: runEmail('qa-reg-035'), password: PW, confirm: PW, pet: 'cat', terms: true });
    const r = await submitReg(page, { timeout: 10_000, enterIn: 'reg-confirm' });
    await checkApi('HTTP 201', { status: r?.status() ?? null }, () => {
      expect.soft(r?.status()).toBe(201);
    });
    await check(page, 'ไป /account?welcome=1', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/account?welcome=1');
    });
  });
});

// ===========================================================================
// F20 เข้าสู่ระบบ
// ===========================================================================

test("TC-AUTH-001 ล็อกอินบัญชี demo โดยไม่มี `next` แล้วหัวเว็บแสดงชื่อผู้ใช้", {
  tag: ["@P1","@5.6","@mobile-too"],
  annotation: [
    { type: 'expected', description: "ขั้น 3: HTTP 2xx · มี `Set-Cookie: pp_session=` · URL ปลายทาง `/` · ขั้น 4: หัวเว็บมีชื่อผู้ใช้ (ตรงกับชื่อใน `/account`) และ \"ออกจากระบบ\" · ใน `header` (ไม่นับ `nav#mobile-menu`) ไม่มีลิงก์ \"เข้าสู่ระบบ\" · `/account` แสดง `demo@pawpantry.test`" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R149 · R154 · Q32 · ความเสี่ยง: ลูกค้าเดิมล็อกอินไม่ได้ ซื้อไม่ได้ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  let r = null as Response | null;
  await test.step('1. เปิด /login', async () => {
    await page.goto('/login');
  });
  await test.step('2. กรอกอีเมล/รหัส แล้วกดปุ่มเข้าสู่ระบบ', async () => {
    r = await submitLogin(page, DEMO_EMAIL, PW);
  });
  await test.step('3. ดู request POST /api/auth/login และ URL ปลายทาง', async () => {
    const sc = await respSetCookie(r);
    await checkApi('HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await checkApi('มี Set-Cookie: pp_session=', sc, () => {
      expect.soft(sc).toMatch(/pp_session=[^;\s]+/);
    });
    await check(page, 'URL ปลายทาง /', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/');
    });
  });
  await test.step('4. ดูหัวเว็บ แล้วเปิด /account', async () => {
    await check(page, 'หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toBeVisible();
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
    await check(page, 'ใน header (ไม่นับ nav#mobile-menu) ไม่มีลิงก์ "เข้าสู่ระบบ"', siteHeader(page), async () => {
      await expect.soft(headerLoginLinks(page)).toHaveCount(0);
    });
    await page.goto('/account');
    const name = ((await page.locator('[data-testid="profile-card"] h1, [data-testid="profile-card"] .profile-name').first().textContent().catch(() => '')) ?? '').trim();
    await check(page, `หัวเว็บมีชื่อผู้ใช้ (ตรงกับชื่อใน /account = "${name}")`, page.getByTestId('user-menu'), async (el) => {
      expect.soft(name, 'ชื่อใน /account').not.toBe('');
      await expect.soft(el).toContainText(name || '(ไม่พบชื่อใน /account)');
    });
    await check(page, '/account แสดง demo@pawpantry.test', page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(DEMO_EMAIL);
    });
  });
});

test("TC-AUTH-002 `next` ที่เป็น path ภายใน (รวม query string) พาไปหน้าที่ขอ", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "(ก) URL ปลายทาง `/account` แสดง `demo@pawpantry.test` · (ข) URL ปลายทาง `/products?pet=cat` ครบทั้ง path และ query" },
    { type: 'source', description: "[D]+[R] · R149 · Q32 · ความเสี่ยง: next ทำงานผิด ลูกค้าหลุดหน้าที่ตั้งใจ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /login?next=%2Faccount ล็อกอินด้วยบัญชี demo', async () => {
    await page.goto('/login?next=%2Faccount');
    await submitLogin(page, DEMO_EMAIL, PW);
  });
  await test.step('2. ดู URL ปลายทาง', async () => {
    await check(page, '(ก) URL ปลายทาง /account', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/account');
    });
    await check(page, '(ก) แสดง demo@pawpantry.test', page.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(DEMO_EMAIL);
    });
  });
  await test.step('3. ออกจากระบบ แล้วทำซ้ำกับ /login?next=%2Fproducts%3Fpet%3Dcat', async () => {
    await apiLogout(page);
    await page.goto('/login?next=%2Fproducts%3Fpet%3Dcat');
    await submitLogin(page, DEMO_EMAIL, PW);
    await check(page, '(ข) URL ปลายทาง /products?pet=cat ครบทั้ง path และ query', null, async () => {
      expect.soft(pathAndQuery(page.url())).toBe('/products?pet=cat');
    });
  });
});

test("TC-AUTH-004 `next` ชี้ path ภายในที่ไม่มีอยู่จริง ล็อกอินสำเร็จและได้หน้า 404 ของเว็บ", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "URL `/nope` · หน้ามีคำว่า \"ไม่พบ\" · หัวเว็บยังมี \"ออกจากระบบ\" (ยังล็อกอินอยู่) · ขั้น 3: HTTP 404" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R149 · Q8 · ความเสี่ยง: next เสียทำให้หน้าพัง/หลุด session · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /login?next=%2Fnope ล็อกอิน', async () => {
    await page.goto('/login?next=%2Fnope');
    await submitLogin(page, DEMO_EMAIL, PW);
  });
  await test.step('2. ดู URL และเนื้อหาหน้า', async () => {
    await check(page, 'URL /nope', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/nope');
    });
    await check(page, 'หน้ามีคำว่า "ไม่พบ"', page.locator('main'), async (el) => {
      await expect.soft(el).toContainText('ไม่พบ');
    });
    await check(page, 'หัวเว็บยังมี "ออกจากระบบ" (ยังล็อกอินอยู่)', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
  await test.step('3. reload หน้า ดู HTTP status ของเอกสาร', async () => {
    const res = await page.reload();
    await check(page, 'HTTP 404', null, async () => {
      expect.soft(res?.status()).toBe(404);
    }, { actual: async () => res?.status() ?? null });
  });
});

test("TC-AUTH-005 รหัสผ่านผิดของบัญชีที่มีจริง ต้องเข้าไม่ได้และได้ข้อความกลาง", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "HTTP 401 · ข้อความ \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" · ไม่มี `Set-Cookie: pp_session` · URL ยัง `/login` · หัวเว็บยังมี \"เข้าสู่ระบบ\"" },
    { type: 'source', description: "[D]+[R] · R146 · ความเสี่ยง: เข้าบัญชีได้ด้วยรหัสผิด · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  let r = null as Response | null;
  await test.step('1. เปิด /login', async () => {
    await page.goto('/login');
  });
  await test.step('2. กรอก demo@pawpantry.test / Paw12346 แล้วกดเข้าสู่ระบบ', async () => {
    r = await submitLogin(page, DEMO_EMAIL, 'Paw12346');
  });
  await test.step('3. ดู status ข้อความ คุกกี้ และหัวเว็บ', async () => {
    const sc = await respSetCookie(r);
    await checkApi('HTTP 401', { status: r?.status() ?? null }, () => {
      expect.soft(r?.status()).toBe(401);
    });
    await check(page, `ข้อความ "${MSG_LOGIN_FAIL}"`, page.getByTestId('login-error'), async (el) => {
      await expect.soft(el).toHaveText(MSG_LOGIN_FAIL);
    });
    await checkApi('ไม่มี Set-Cookie: pp_session', sc, () => {
      expect.soft(sc).not.toContain('pp_session');
    });
    await check(page, 'URL ยัง /login', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
    });
    await check(page, 'หัวเว็บยังมี "เข้าสู่ระบบ"', page.getByTestId('login-link'), async (el) => {
      await expect.soft(el).toHaveText('เข้าสู่ระบบ');
    });
  });
});

test("TC-AUTH-006 อีเมลที่ไม่มีจริง / ผิดรูปแบบ / ช่องว่างทั้งคู่ ได้ข้อความเดียวกับรหัสผิดทุกตัวอักษร", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ทุกชุด: ข้อความ \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" เหมือนกับ TC-AUTH-005 ทุกตัวอักษร · ไม่มี `Set-Cookie: pp_session` · URL ยัง `/login` · ชุด (ก) HTTP 401 เท่ากับกรณีรหัสผิด" },
    { type: 'source', description: "[R] · R146 · ความเสี่ยง: ใช้หน้า login เดาว่าอีเมลไหนเป็นลูกค้า · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  const sets = [
    { label: '(ก) nobody@pawpantry.test / Paw12345', email: 'nobody@pawpantry.test', pw: PW },
    { label: '(ข) abc / Paw12345', email: 'abc', pw: PW },
    { label: '(ค) อีเมลว่าง / รหัสว่าง', email: '', pw: '' },
  ];
  for (const [i, s] of sets.entries()) {
    await test.step(`${i === 0 ? '1' : '2'}. เปิด /login กรอกชุด ${s.label} แล้วส่ง`, async () => {
      await page.goto('/login');
      const r = await submitLogin(page, s.email, s.pw, { timeout: 4_000 });
      const sc = await respSetCookie(r);
      await check(page, `${s.label}: ข้อความ "${MSG_LOGIN_FAIL}" เหมือน TC-AUTH-005 ทุกตัวอักษร`, page.getByTestId('login-error'), async (el) => {
        await expect.soft(el).toHaveText(MSG_LOGIN_FAIL);
      });
      await checkApi(`${s.label}: ไม่มี Set-Cookie: pp_session`, sc, () => {
        expect.soft(sc).not.toContain('pp_session');
      });
      await check(page, `${s.label}: URL ยัง /login`, null, async () => {
        expect.soft(new URL(page.url()).pathname).toBe('/login');
      });
      if (i === 0) {
        await checkApi('(ก) HTTP 401 เท่ากับกรณีรหัสผิด', { status: r?.status() ?? null }, () => {
          expect.soft(r?.status()).toBe(401);
        });
      }
    });
  }
});

test("TC-AUTH-007 อีเมลไม่สนตัวพิมพ์/ช่องว่างหน้า-หลัง แต่รหัสผ่านต้องตรงตัวพิมพ์", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "(ก)(ข): HTTP 2xx หัวเว็บมี \"ออกจากระบบ\" · (ค)(ง): HTTP 401 \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" ไม่มี `Set-Cookie: pp_session`" },
    { type: 'source', description: "[D]+[R] · R147 · ความเสี่ยง: ลูกค้าล็อกอินไม่ได้เพราะพิมพ์ตัวใหญ่ / รหัสไม่สนตัวพิมพ์ทำให้เดาง่าย · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const sets = [
    { label: '(ก)', email: 'DEMO@PAWPANTRY.TEST', pw: PW, ok: true },
    { label: '(ข)', email: '  demo@pawpantry.test  ', pw: PW, ok: true },
    { label: '(ค)', email: DEMO_EMAIL, pw: 'paw12345', ok: false },
    { label: '(ง)', email: DEMO_EMAIL, pw: 'PAW12345', ok: false },
  ];
  for (const [i, s] of sets.entries()) {
    await test.step(`${i === 0 ? '1' : '2'}. ล็อกอินชุด ${s.label} "${s.email}" / "${s.pw}" ดูผล แล้วออกจากระบบ`, async () => {
      await apiLogout(page);
      await page.goto('/login');
      const r = await submitLogin(page, s.email, s.pw);
      const sc = await respSetCookie(r);
      if (s.ok) {
        await checkApi(`${s.label}: HTTP 2xx`, { status: r?.status() ?? null }, () => {
          expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
        });
        await check(page, `${s.label}: หัวเว็บมี "ออกจากระบบ"`, page.getByTestId('logout-button'), async (el) => {
          await expect.soft(el).toContainText('ออกจากระบบ');
        });
      } else {
        await checkApi(`${s.label}: HTTP 401`, { status: r?.status() ?? null }, () => {
          expect.soft(r?.status()).toBe(401);
        });
        await check(page, `${s.label}: "${MSG_LOGIN_FAIL}"`, page.getByTestId('login-error'), async (el) => {
          await expect.soft(el).toHaveText(MSG_LOGIN_FAIL);
        });
        await checkApi(`${s.label}: ไม่มี Set-Cookie: pp_session`, sc, () => {
          expect.soft(sc).not.toContain('pp_session');
        });
      }
    });
  }
});

/** ล็อกอินด้วย next ที่ชี้ออกนอกเว็บ แล้วตรวจ origin / pathname (ใช้ร่วม AUTH-010/011/012/013) */
async function openRedirectCase(page: Page, payload: string, hits: string[], stepNo: string): Promise<void> {
  await test.step(`${stepNo}. เปิด /login?next=${payload} ล็อกอินบัญชี demo รอจนหน้าโหลดเสร็จ อ่าน location.origin / pathname`, async () => {
    await apiLogout(page);
    await page.goto(`/login?next=${payload}`);
    await submitLogin(page, DEMO_EMAIL, PW);
    const loc = await readLocation(page);
    await check(page, `next=${payload}: location.origin = ${originOf()}`, null, async () => {
      expect.soft(loc.origin).toBe(originOf());
    }, { actual: async () => loc });
    await check(page, `next=${payload}: location.pathname = /`, null, async () => {
      expect.soft(loc.pathname).toBe('/');
    }, { actual: async () => loc });
    if (new URL(page.url()).host !== new URL(baseURL()).host) await page.goto('/');
  });
}

test("TC-AUTH-010 `next` ที่ชี้ออกนอกเว็บทั้ง 7 แบบต้องถูกปัดไปหน้าแรก", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ทุก payload: `location.origin` = origin ของเว็บที่ทดสอบ (`http://localhost:3000`) · `location.pathname` = `/` · Network ไม่มี request ไป `evil.example` · จำนวน dialog = 0" },
    { type: 'source', description: "[D]+[R] · R150 · Q32 · ความเสี่ยง: open redirect พาลูกค้าไปเว็บหลอก · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const dlg = countDialogs(page);
  const hits = await guardEvil(page);
  const payloads = [
    'https://evil.example',
    '//evil.example',
    '%2F%2Fevil.example',
    '%5C%5Cevil.example',
    'https:evil.example',
    'javascript:alert(1)',
    '%5C%2Fevil.example',
  ];
  for (const [i, p] of payloads.entries()) await openRedirectCase(page, p, hits, i === 0 ? '1–2' : '3');
  await checkApi('Network ไม่มี request ไป evil.example', hits, () => {
    expect.soft(hits).toEqual([]);
  });
  await check(page, 'จำนวน dialog = 0', null, async () => {
    expect.soft(dlg.n).toBe(0);
  }, { actual: async () => dlg.n });
});

test("TC-AUTH-011 `next=/%5Cevil.example` (ขึ้นต้น `/\\`) ต้องถูกกันเหมือน `//`", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "`location.origin` = origin ของเว็บที่ทดสอบ · `location.pathname` = `/` · ไม่มี request ไป `evil.example` (ตอนนี้ล้ม: เบราว์เซอร์ไปที่ `http://evil.example/`)" },
    { type: 'source', description: "[D]+[R] · R151 · Q32 · ความเสี่ยง: open redirect ที่ยืนยันแล้ว · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const hits = await guardEvil(page);
  await openRedirectCase(page, '/%5Cevil.example', hits, '1–2');
  await checkApi('ไม่มี request ไป evil.example', hits, () => {
    expect.soft(hits).toEqual([]);
  });
});

test("TC-AUTH-012 `next=/%09/evil.example` (มี tab) ต้องถูกกันเหมือน `//`", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "`location.origin` = origin ของเว็บที่ทดสอบ · `location.pathname` = `/` · ไม่มี request ไป `evil.example` (ตอนนี้ล้ม: เบราว์เซอร์ไปที่ `http://evil.example/`)" },
    { type: 'source', description: "[D]+[R] · R151 · Q32 · ความเสี่ยง: open redirect ที่ยืนยันแล้ว · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const hits = await guardEvil(page);
  await openRedirectCase(page, '/%09/evil.example', hits, '1–2');
  await checkApi('ไม่มี request ไป evil.example', hits, () => {
    expect.soft(hits).toEqual([]);
  });
});

test("TC-AUTH-013 รูปแบบเลี่ยงอื่นของ `next` (control char, `/\\` แบบเข้ารหัสทั้งหมด, `///`) ต้องไปหน้าแรก", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ทุก payload: `location.origin` = origin ของเว็บที่ทดสอบ · `location.pathname` = `/` · ไม่มี request ไป `evil.example`" },
    { type: 'source', description: "[D]+[R] · R151 · R150 · Q32 · ความเสี่ยง: แก้เฉพาะ 2 payload ที่รายงาน แต่ยังมีทางเลี่ยงอื่น · เทคนิค: Security · Equivalence partition" },
  ],
}, async ({ page }) => {
  const hits = await guardEvil(page);
  const payloads = ['/%0A/evil.example', '/%0D/evil.example', '/%5C/evil.example', '%2F%5Cevil.example', '/%2F%2Fevil.example'];
  for (const [i, p] of payloads.entries()) await openRedirectCase(page, p, hits, i === 0 ? '1–2' : '3');
  await checkApi('ไม่มี request ไป evil.example', hits, () => {
    expect.soft(hits).toEqual([]);
  });
});

test("TC-AUTH-014 `next` อันตรายที่ถูกส่งต่อผ่านลิงก์ \"สมัครสมาชิก\" ↔ \"เข้าสู่ระบบ\" ต้องยังถูกกันปลายทาง", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2 และ 4: `location.origin` = origin ของเว็บที่ทดสอบ · ไม่มี request ไป `evil.example` ตลอดทุกขั้น · ขั้น 4: `location.pathname` = `/` · ขั้น 2: `location.pathname` = `/` (สมมติฐาน Q33 เหมือน TC-REG-020; ถ้าทีมตอบว่าหน้าสมัครไป `/account?welcome=1` เสมอ ให้คาดหวัง `/account`) · ตัดสินผล Security (open redirect) จาก `location.origin` และ Network เท่านั้น — ถ้าล้มเฉพาะ pathname ให้บันทึกเป็นบั๊กเรื่อง Q33 (ตอนนี้ล้ม ขั้น 2: ไป `/account?welcome=1` เพราะหน้าสมัครไม่สน next ตาม R141 — origin ผ่าน ไม่ใช่ open redirect)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R151 · R142 · R141 · Q32 · Q33 · ความเสี่ยง: เมื่อแก้ให้ส่ง next ต่อ (Q33) ช่องโหว่ย้ายไปหน้าอื่น · เทคนิค: Security · State" },
  ],
}, async ({ page }) => {
  const hits = await guardEvil(page);
  const start = '/login?next=/%5Cevil.example';
  await test.step('1. เปิด /login?next=/%5Cevil.example อ่าน href ลิงก์ "สมัครสมาชิก" แล้วกด', async () => {
    await page.goto(start);
    const href = await page.getByTestId('register-link').getAttribute('href');
    test.info().annotations.push({ type: 'note', description: `href ลิงก์ "สมัครสมาชิก" = ${href}` });
    await page.getByTestId('register-link').click();
    await page.waitForURL(/\/register/, { timeout: 10_000 }).catch(() => {});
  });
  await test.step('2. สมัครชุด (ก) อ่าน location.origin / pathname', async () => {
    await fillReg(page, { name: 'QA Reg 104', email: runEmail('qa-reg-104'), password: PW, confirm: PW, pet: 'cat', terms: true });
    await submitReg(page, { timeout: 10_000 });
    await page.waitForLoadState().catch(() => {});
    const loc = await readLocation(page);
    await check(page, `ขั้น 2: location.origin = ${originOf()}`, null, async () => {
      expect.soft(loc.origin).toBe(originOf());
    }, { actual: async () => loc });
    await check(page, 'ขั้น 2: location.pathname = / (สมมติฐาน Q33)', null, async () => {
      expect.soft(loc.pathname).toBe('/');
    }, { actual: async () => loc });
  });
  await test.step('3. ออกจากระบบ เปิด URL เดิม กด "สมัครสมาชิก" แล้วในหน้าสมัครกด "เข้าสู่ระบบ"', async () => {
    if (new URL(page.url()).host !== new URL(baseURL()).host) await page.goto('/');
    await apiLogout(page);
    await page.goto(start);
    await page.getByTestId('register-link').click();
    await page.waitForURL(/\/register/, { timeout: 10_000 }).catch(() => {});
    await page.locator('main').getByRole('link', { name: 'เข้าสู่ระบบ' }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => {});
  });
  await test.step('4. ล็อกอินบัญชี demo อ่าน location.origin / pathname', async () => {
    await submitLogin(page, DEMO_EMAIL, PW);
    const loc = await readLocation(page);
    await check(page, `ขั้น 4: location.origin = ${originOf()}`, null, async () => {
      expect.soft(loc.origin).toBe(originOf());
    }, { actual: async () => loc });
    await check(page, 'ขั้น 4: location.pathname = /', null, async () => {
      expect.soft(loc.pathname).toBe('/');
    }, { actual: async () => loc });
  });
  await checkApi('ไม่มี request ไป evil.example ตลอดทุกขั้น', hits, () => {
    expect.soft(hits).toEqual([]);
  });
});

test("TC-AUTH-015 ปุ่ม 👁️ สลับแสดง/ซ่อนรหัสผ่าน โดยไม่ส่งฟอร์มและไม่เปลี่ยนค่า", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: `type=\"password\"` · ปุ่ม `aria-label=\"แสดงรหัสผ่าน\"` · ขั้น 2: `type=\"text\"` · ช่องแสดง \"Paw12345\" · ไอคอน 🙈 · `aria-label=\"ซ่อนรหัสผ่าน\"` · ไม่มี `POST /api/auth/login` · URL ยัง `/login` · ขั้น 3: `type=\"password\"` · `aria-label=\"แสดงรหัสผ่าน\"` · ไอคอน 👁️ · ขั้น 4: ล็อกอินสำเร็จ HTTP 2xx หัวเว็บมี \"ออกจากระบบ\"" },
    { type: 'source', description: "[D]+[R] · R152 · ความเสี่ยง: ปุ่มส่งฟอร์มเอง / แก้ค่ารหัส / โปรแกรมอ่านจอไม่รู้สถานะ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const loginReqs: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/auth/login') && r.method() === 'POST') loginReqs.push(r.url());
  });
  const pw = page.getByTestId('login-password');
  const eye = page.locator('.pw-wrap').getByRole('button');
  await test.step('1. เปิด /login พิมพ์รหัส Paw12345 อ่าน type ของช่องรหัสและ aria-label ของปุ่ม', async () => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(DEMO_EMAIL);
    await pw.fill(PW);
    await check(page, 'ขั้น 1: type="password"', pw, async (el) => {
      await expect.soft(el).toHaveAttribute('type', 'password');
    }, { actual: () => pw.getAttribute('type') });
    await check(page, 'ขั้น 1: ปุ่ม aria-label="แสดงรหัสผ่าน"', eye, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-label', 'แสดงรหัสผ่าน');
    }, { actual: () => eye.getAttribute('aria-label') });
  });
  await test.step('2. กดปุ่ม 👁️ อ่านค่าอีกครั้ง', async () => {
    await eye.click();
    await page.waitForTimeout(300);
    await check(page, 'ขั้น 2: type="text"', pw, async (el) => {
      await expect.soft(el).toHaveAttribute('type', 'text');
    }, { actual: () => pw.getAttribute('type') });
    await check(page, 'ขั้น 2: ช่องแสดง "Paw12345"', pw, async (el) => {
      await expect.soft(el).toHaveValue(PW);
    });
    await check(page, 'ขั้น 2: ไอคอน 🙈', eye, async (el) => {
      await expect.soft(el).toHaveText('🙈');
    });
    await check(page, 'ขั้น 2: aria-label="ซ่อนรหัสผ่าน"', eye, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-label', 'ซ่อนรหัสผ่าน');
    }, { actual: () => eye.getAttribute('aria-label') });
    await checkApi('ขั้น 2: ไม่มี POST /api/auth/login', loginReqs, () => {
      expect.soft(loginReqs).toEqual([]);
    });
    await check(page, 'ขั้น 2: URL ยัง /login', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
    });
  });
  await test.step('3. กดปุ่มอีกครั้ง อ่านค่า', async () => {
    await eye.click();
    await page.waitForTimeout(300);
    await check(page, 'ขั้น 3: type="password"', pw, async (el) => {
      await expect.soft(el).toHaveAttribute('type', 'password');
    }, { actual: () => pw.getAttribute('type') });
    await check(page, 'ขั้น 3: aria-label="แสดงรหัสผ่าน"', eye, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-label', 'แสดงรหัสผ่าน');
    }, { actual: () => eye.getAttribute('aria-label') });
    await check(page, 'ขั้น 3: ไอคอน 👁️', eye, async (el) => {
      await expect.soft(el).toHaveText('👁️');
    });
  });
  await test.step('4. กดปุ่มให้เป็นแสดงรหัส แล้วกดเข้าสู่ระบบ', async () => {
    await eye.click();
    const wait = page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST', { timeout: 10_000 }).catch(() => null);
    await page.getByTestId('login-submit').click();
    const r = await wait;
    await page.waitForURL((u) => u.pathname !== '/login', { timeout: 8_000 }).catch(() => {});
    await checkApi('ขั้น 4: ล็อกอินสำเร็จ HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'ขั้น 4: หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
});

test("TC-AUTH-016 ฟอร์ม login ใช้ด้วยคีย์บอร์ดได้ และข้อความ error ผูกกับช่อง", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ทั้งสองช่อง ≥ 1 · ขั้น 2: ลำดับ อีเมล → รหัสผ่าน → ปุ่ม 👁️ → ปุ่มเข้าสู่ระบบ (ตรงกับที่ตาเห็น) · ขั้น 3: Enter ส่งฟอร์ม (มี `POST /api/auth/login` ได้ 401) · มีอย่างน้อย 1 ช่อง (อีเมลหรือรหัสผ่าน) ที่มี `aria-invalid=\"true\"` และทุกช่องที่มี `aria-invalid=\"true\"` มี `aria-describedby` ชี้ไป id ของ element ที่มีข้อความ \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\" · ขั้น 4: HTTP 2xx หัวเว็บมี \"ออกจากระบบ\" (ตอนนี้ล้ม: ไม่มี `aria-describedby`)" },
    { type: 'source', description: "[D]+[R] · R153 · R146 · Q36 · ความเสี่ยง: ผู้ใช้คีย์บอร์ด/โปรแกรมอ่านจอล็อกอินไม่ได้หรือไม่รู้ว่าผิด · เทคนิค: Happy path · Negative" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /login ตรวจ labels.length ของช่องอีเมลและรหัส', async () => {
    await page.goto('/login');
    const labels = await page.evaluate(() =>
      ['login-email', 'login-password'].map((t) => ({
        id: t,
        labels: (document.querySelector(`[data-testid="${t}"]`) as HTMLInputElement | null)?.labels?.length ?? 0,
      })),
    );
    await check(page, 'ทั้งสองช่อง labels.length ≥ 1', page.locator('[data-testid="login-email"], [data-testid="login-password"]'), async () => {
      for (const l of labels) expect.soft(l.labels, l.id).toBeGreaterThanOrEqual(1);
    }, { actual: async () => labels });
  });
  await test.step('2. กด Tab จากช่องอีเมลไปจนถึงปุ่มส่ง จดลำดับ', async () => {
    await page.getByTestId('login-email').focus();
    const order: string[] = [await activeId(page)];
    for (let i = 0; i < 8 && order[order.length - 1] !== 'login-submit'; i++) {
      await page.keyboard.press('Tab');
      order.push(await activeId(page));
    }
    const norm = order.map((o) => (o === 'แสดงรหัสผ่าน' || o === 'ซ่อนรหัสผ่าน' ? 'eye' : o));
    await check(page, 'ลำดับ อีเมล → รหัสผ่าน → ปุ่ม 👁️ → ปุ่มเข้าสู่ระบบ', page.locator('form.auth-form'), async () => {
      expect.soft(norm).toEqual(['login-email', 'login-password', 'eye', 'login-submit']);
    }, { actual: async () => order });
  });
  await test.step('3. กรอกรหัสผิด กด Enter ในช่องรหัส อ่าน aria-invalid และ aria-describedby', async () => {
    const r = await submitLogin(page, DEMO_EMAIL, 'Paw12346', { enter: true });
    await page.getByTestId('login-error').waitFor({ timeout: 5_000 }).catch(() => {});
    await checkApi('Enter ส่งฟอร์ม (มี POST /api/auth/login ได้ 401)', { status: r?.status() ?? '(ไม่มี request)' }, () => {
      expect.soft(r?.status()).toBe(401);
    });
    const rep = await describedByReport(page, ['login-email', 'login-password'], MSG_LOGIN_FAIL);
    await check(page, 'มีอย่างน้อย 1 ช่อง (อีเมลหรือรหัสผ่าน) ที่มี aria-invalid="true"', page.locator('[data-testid="login-email"], [data-testid="login-password"]'), async () => {
      expect.soft(rep.filter((f) => f.invalid === 'true').length).toBeGreaterThanOrEqual(1);
    }, { actual: async () => rep });
    await check(page, `ทุกช่องที่ aria-invalid="true" มี aria-describedby ชี้ไป element ที่มีข้อความ "${MSG_LOGIN_FAIL}"`, page.locator('form.auth-form [aria-invalid="true"]'), async () => {
      for (const f of rep) expect.soft(f.ok, `${f.field}: aria-describedby=${f.describedBy}`).toBe(true);
    }, { actual: async () => rep });
  });
  await test.step('4. แก้เป็นรหัสถูก กด Enter', async () => {
    const r = await submitLogin(page, DEMO_EMAIL, PW, { enter: true });
    await checkApi('ขั้น 4: HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'ขั้น 4: หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
});

test("TC-AUTH-017 ข้อความบัญชีทดลองแสดงเฉพาะ environment ทดสอบ และใช้ได้จริง", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: มีข้อความ \"บัญชีทดลอง: demo@pawpantry.test / Paw12345\" ตรงตัว · ขั้น 2: HTTP 2xx หัวเว็บมี \"ออกจากระบบ\" · ขั้น 3: ไม่พบคำว่า \"บัญชีทดลอง\" และไม่พบ `Paw12345` ใน HTML · ถ้ายังไม่มี build production ให้บันทึกขั้น 3 เป็น Blocked (ไม่นับว่าผ่าน) และ TC นี้ยังไม่ปิดจนกว่าจะตรวจขั้น 3 ได้ก่อนขึ้นระบบจริง" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R155 · Q37 · ความเสี่ยง: รหัสผ่านบัญชีหลุดขึ้นเว็บจริง · เทคนิค: Happy path · Security" },
  ],
}, async ({ page }) => {
  const hint = page.getByText(/บัญชีทดลอง/);
  let shown = { email: '', pw: '' };
  await test.step('1. เปิด /login บน environment ทดสอบ หาข้อความบัญชีทดลอง', async () => {
    await page.goto('/login');
    await check(page, 'มีข้อความ "บัญชีทดลอง: demo@pawpantry.test / Paw12345" ตรงตัว', hint, async (el) => {
      await expect.soft(el).toHaveText('บัญชีทดลอง: demo@pawpantry.test / Paw12345');
    });
    const codes = await hint.locator('code').allTextContents().catch(() => [] as string[]);
    shown = { email: codes[0] ?? '', pw: codes[1] ?? '' };
  });
  await test.step('2. ล็อกอินด้วยค่าที่แสดง', async () => {
    const r = await submitLogin(page, shown.email, shown.pw);
    await checkApi('HTTP 2xx', { status: r?.status() ?? null, shown }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
  await test.step('3. เปิด /login บน build ที่ตั้ง NODE_ENV=production ค้นคำว่า "บัญชีทดลอง" และ Paw12345 ใน HTML', async () => {
    blocked(
      'ขั้น 3 ต้องใช้ build production (NODE_ENV=production) ซึ่งยังไม่มีในสภาพแวดล้อมทดสอบนี้ (Q37) — ตามหัวข้อ 6.2 นับเป็น Blocked ไม่ใช่ผ่าน และ TC นี้ยังปิดไม่ได้จนกว่าจะตรวจขั้น 3 ก่อนขึ้นระบบจริง',
    );
  });
});

test("TC-AUTH-018 ล็อกอินทุกครั้งต้องได้ session ใหม่ (กัน session fixation)", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ค่า A ≠ ค่าที่ตั้งเอง · ค่า B ≠ ค่า A · A และ B เป็น hex 48 ตัว · ขั้น 4: ไม่ได้ 200 ที่มี `demo@pawpantry.test` (ได้ 3xx ไป `/login` หรือ 401)" },
    { type: 'source', description: "[D]+[R] · R156 · ความเสี่ยง: ผู้โจมตีฝังคุกกี้ไว้ก่อนแล้วใช้ session ของเหยื่อ · เทคนิค: Security" },
  ],
}, async ({ page, request }) => {
  const planted = 'a'.repeat(48);
  let A: string | undefined;
  let B: string | undefined;
  await test.step('1. เปิด /login ตั้งคุกกี้ pp_session=aaaa… (48 ตัว)', async () => {
    await page.goto('/login');
    await page.context().addCookies([{ name: 'pp_session', value: planted, url: baseURL() }]);
  });
  await test.step('2. ล็อกอินบัญชี demo จดค่า pp_session ใหม่ (ค่า A)', async () => {
    await page.reload();
    await submitLogin(page, DEMO_EMAIL, PW);
    A = await sessionCookie(page);
  });
  await test.step('3. ออกจากระบบ แล้วล็อกอินอีกครั้ง จดค่า B', async () => {
    if (await page.getByTestId('logout-button').count()) await logoutUi(page);
    else await apiLogout(page);
    await page.goto('/login');
    await submitLogin(page, DEMO_EMAIL, PW);
    B = await sessionCookie(page);
  });
  await check(page, 'ค่า A ≠ ค่าที่ตั้งเอง', null, async () => {
    expect.soft(A).toBeTruthy();
    expect.soft(A).not.toBe(planted);
  }, { actual: async () => ({ A, planted }) });
  await check(page, 'ค่า B ≠ ค่า A', null, async () => {
    expect.soft(B).toBeTruthy();
    expect.soft(B).not.toBe(A);
  }, { actual: async () => ({ A, B }) });
  await check(page, 'A และ B เป็น hex 48 ตัว', null, async () => {
    expect.soft(A ?? '').toMatch(/^[0-9a-f]{48}$/);
    expect.soft(B ?? '').toMatch(/^[0-9a-f]{48}$/);
  }, { actual: async () => ({ A, B }) });
  await test.step('4. ใช้ API client ยิง GET /account ด้วย Cookie: pp_session=aaaa… (ค่าที่ตั้งเอง)', async () => {
    const r = await request.get('/account', { headers: { Cookie: `pp_session=${planted}` }, maxRedirects: 0 });
    const text = await r.text().catch(() => '');
    await checkApi('ขั้น 4: ไม่ได้ 200 ที่มี demo@pawpantry.test (ได้ 3xx ไป /login หรือ 401)', { status: r.status(), location: r.headers()['location'] ?? null }, () => {
      expect.soft(r.status() === 200 && text.includes(DEMO_EMAIL), 'ได้ 200 ที่มีอีเมล demo').toBe(false);
      const s = r.status();
      expect.soft((s >= 300 && s < 400 && (r.headers()['location'] ?? '').includes('/login')) || s === 401, `status ${s}`).toBe(true);
    });
  });
});

// ===========================================================================
// F21 session และออกจากระบบ
// ===========================================================================

test("TC-SESS-001 ออกจากระบบแล้ว session ถูกยกเลิก คุกกี้ถูกลบ หัวเว็บกลับเป็น guest", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 3: `POST /api/auth/logout` HTTP 2xx · response ลบคุกกี้ (`Set-Cookie: pp_session=` ที่มี `Max-Age=0` หรือวันหมดอายุในอดีต) · Cookies ไม่มี `pp_session` · หัวเว็บมี \"เข้าสู่ระบบ\" ไม่มี \"ออกจากระบบ\" · หน้าไม่แสดง `demo@pawpantry.test`" },
    { type: 'source', description: "[D]+[R] · R157 · ความเสี่ยง: ออกจากระบบไม่จริง คนถัดไปเข้าบัญชีได้ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  let r = null as Response | null;
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo อยู่ที่ /account', async () => {
    await apiLogin(page);
    await page.goto('/account');
  });
  await test.step('1–2. กด "ออกจากระบบ" บนหัวเว็บ', async () => {
    r = await logoutUi(page);
    await page.waitForLoadState().catch(() => {});
  });
  await test.step('3. ดู request POST /api/auth/logout คุกกี้ และหัวเว็บ', async () => {
    const sc = await respSetCookie(r);
    await checkApi('POST /api/auth/logout HTTP 2xx', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await checkApi('response ลบคุกกี้ (Set-Cookie: pp_session= ที่มี Max-Age=0 หรือวันหมดอายุในอดีต)', sc, () => {
      const m = sc.split('\n').find((c) => c.trim().startsWith('pp_session=')) ?? '';
      const maxAge0 = /max-age=0\b/i.test(m);
      const exp = /expires=([^;]+)/i.exec(m)?.[1];
      const past = !!exp && new Date(exp).getTime() < Date.now();
      expect.soft(m, 'มี Set-Cookie: pp_session=').not.toBe('');
      expect.soft(maxAge0 || past, m).toBe(true);
    });
    const cookies = await page.context().cookies(baseURL());
    await check(page, 'Cookies ไม่มี pp_session', null, async () => {
      expect.soft(cookies.map((c) => c.name)).not.toContain('pp_session');
    }, { actual: async () => cookies.map((c) => `${c.name}=${c.value}`) });
    await check(page, 'หัวเว็บมี "เข้าสู่ระบบ"', page.getByTestId('login-link'), async (el) => {
      await expect.soft(el).toHaveText('เข้าสู่ระบบ');
    });
    await check(page, 'หัวเว็บไม่มี "ออกจากระบบ"', siteHeader(page), async (el) => {
      await expect.soft(el).not.toContainText('ออกจากระบบ');
    });
    const text = await pageTextWithoutDemoHint(page);
    await check(page, 'หน้าไม่แสดง demo@pawpantry.test', page.locator('main'), async () => {
      expect.soft(text).not.toContain(DEMO_EMAIL);
    }, { actual: async () => page.url() });
  });
});

test("TC-SESS-002 หลังออกจากระบบ กด Back หรือเปิดหน้าที่ต้องล็อกอิน ต้องไม่เห็นข้อมูลบัญชี", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ไม่เห็น `demo@pawpantry.test` และประวัติการสั่งซื้อ · URL เป็น `/login` ที่ `next` = `/account` · ขั้น 3: ไม่เห็นฟอร์ม checkout และไม่มีชื่อหรืออีเมลของ demo ในหน้า · URL เป็น `/login` ที่ `next` = `/checkout` หรือ `/cart` (ตะกร้าอาจถูกล้างตอนออกจากระบบตาม TC-SESS-007 และ EXPLORATION ไม่ระบุว่า `/checkout` ตรวจการล็อกอินหรือตะกร้าว่างก่อน — การ redirect ไป `/login?next=/checkout` ตรวจใน TC-CHK-002) · ขั้น 4: URL `/login` ที่ `next` = `/account`" },
    { type: 'source', description: "[D]+[R] · R157 · ความเสี่ยง: ข้อมูลบัญชีค้างใน history ให้คนถัดไปเห็น · เทคนิค: Negative · State" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo · ตะกร้ามีทูน่าซอง ×1 · อยู่ที่ /account', async () => {
    await apiLogin(page);
    await addToCart(page, 'tuna-pouch');
    await page.goto('/account');
  });
  await test.step('1. กด "ออกจากระบบ"', async () => {
    await logoutUi(page);
    // รอให้เว็บพาออกจาก /account หลังออกจากระบบเสร็จก่อน ไม่งั้น Back จะย้อนจาก /account ไปหน้าก่อนหน้าแทน
    await page.waitForURL((u) => u.pathname !== '/account', { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState().catch(() => {});
  });
  await test.step('2. กดปุ่ม Back ของเบราว์เซอร์', async () => {
    await page.goBack().catch(() => {});
    await page.waitForLoadState().catch(() => {});
    await page.waitForURL((u) => u.pathname !== '/account', { timeout: 5_000 }).catch(() => {});
    const text = await pageTextWithoutDemoHint(page);
    await check(page, 'ขั้น 2: ไม่เห็น demo@pawpantry.test (ไม่นับกล่องบัญชีทดลองของหน้า login)', page.locator('main'), async () => {
      expect.soft(text).not.toContain(DEMO_EMAIL);
    }, { actual: async () => page.url() });
    await check(page, 'ขั้น 2: ไม่เห็นประวัติการสั่งซื้อ', page.locator('[data-testid="order-history"], [data-testid="order-row"]'), async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await check(page, 'ขั้น 2: URL เป็น /login ที่ next = /account', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
      expect.soft(nextOf(page.url())).toBe('/account');
    });
  });
  await test.step('3. เปิด /checkout ตรง ๆ', async () => {
    await page.goto('/checkout');
    await page.waitForLoadState().catch(() => {});
    const text = await pageTextWithoutDemoHint(page);
    await check(page, 'ขั้น 3: ไม่เห็นฟอร์ม checkout', page.locator('[data-testid="ship-name"], [data-testid="place-order"]'), async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await check(page, 'ขั้น 3: ไม่มีชื่อหรืออีเมลของ demo ในหน้า', page.locator('body'), async () => {
      expect.soft(text).not.toContain(DEMO_EMAIL);
      expect.soft(text).not.toContain(DEMO_NAME);
    }, { actual: async () => page.url() });
    await check(page, 'ขั้น 3: URL เป็น /login ที่ next = /checkout หรือ /cart', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
      expect.soft(['/checkout', '/cart']).toContain(nextOf(page.url()));
    });
  });
  await test.step('4. เปิด /account ตรง ๆ', async () => {
    await page.goto('/account');
    await page.waitForLoadState().catch(() => {});
    await check(page, 'ขั้น 4: URL /login ที่ next = /account', null, async () => {
      expect.soft(new URL(page.url()).pathname).toBe('/login');
      expect.soft(nextOf(page.url())).toBe('/account');
    });
  });
});

test("TC-SESS-003 คุกกี้ `pp_session` เก่าที่ยิงซ้ำหลังออกจากระบบต้องใช้ไม่ได้ทั้งหน้าและ API", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ยอดชำระ ฿85 (฿35 + ส่ง ฿50 = ฿85) · ขั้น 3: HTTP 3xx ที่ `Location` ไป `/login` (หรือ 401) body ไม่มี `demo@pawpantry.test` · ขั้น 4: HTTP 401 ไม่มีข้อมูลคำสั่ง · ขั้น 5: HTTP 401 · ขั้น 6: จำนวนคำสั่งเท่ากับที่จดในขั้น 1 (ไม่มีคำสั่งใหม่)" },
    { type: 'source', description: "[D]+[R] · R157 · R156 · ความเสี่ยง: คุกกี้ที่ถูกขโมยยังใช้ได้หลังออกจากระบบ · เทคนิค: Security · Negative" },
  ],
}, async ({ page, request }) => {
  let orderId = '';
  let ordersBefore = -1;
  let orderBody = '';
  let oldCookie = '';
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo', async () => {
    await apiLogin(page);
  });
  await test.step('1. สั่งทูน่าซอง ×1 จนได้หน้ายืนยัน จดเลข PP-… ยอด จำนวนคำสั่งใน /account และ body ของ POST /api/orders', async () => {
    await addToCart(page, 'tuna-pouch');
    await page.goto('/checkout');
    await fillCheckout(page);
    const wait = page.waitForRequest((r) => r.url().includes('/api/orders') && r.method() === 'POST', { timeout: 10_000 });
    await page.getByTestId('place-order').click();
    orderBody = (await wait).postData() ?? '';
    await page.waitForURL(/\/orders\/PP-/, { timeout: 15_000 });
    orderId = ((await page.getByTestId('order-id').textContent()) ?? '').trim();
    await check(page, 'ขั้น 1: ยอดชำระ ฿85 (฿35 + ส่ง ฿50 = ฿85)', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText('฿85');
    });
    await page.goto('/account');
    ordersBefore = await page.getByTestId('order-row').count();
    test.info().annotations.push({ type: 'note', description: `คำสั่ง ${orderId} · จำนวนคำสั่งใน /account = ${ordersBefore}` });
  });
  await test.step('2. จดค่า pp_session แล้วกด "ออกจากระบบ"', async () => {
    oldCookie = (await sessionCookie(page)) ?? '';
    await logoutUi(page);
  });
  await test.step('3. ยิง GET /account ด้วย Cookie: pp_session=<ค่าเก่า>', async () => {
    const r = await request.get('/account', { headers: { Cookie: `pp_session=${oldCookie}` }, maxRedirects: 0 });
    const text = await r.text().catch(() => '');
    const loc = r.headers()['location'] ?? '';
    await checkApi('ขั้น 3: HTTP 3xx ที่ Location ไป /login (หรือ 401) body ไม่มี demo@pawpantry.test', { status: r.status(), location: loc }, () => {
      const s = r.status();
      expect.soft((s >= 300 && s < 400 && loc.includes('/login')) || s === 401, `status ${s} location ${loc}`).toBe(true);
      expect.soft(text).not.toContain(DEMO_EMAIL);
    });
  });
  await test.step('4. ยิง GET /api/orders/<เลข PP> ด้วยคุกกี้เก่า', async () => {
    const r = await request.get(`/api/orders/${orderId}`, { headers: { Cookie: `pp_session=${oldCookie}` } });
    const text = await r.text().catch(() => '');
    await checkApi('ขั้น 4: HTTP 401 ไม่มีข้อมูลคำสั่ง', { status: r.status(), body: text.slice(0, 500) }, () => {
      expect.soft(r.status()).toBe(401);
      expect.soft(text).not.toContain(orderId);
    });
  });
  await test.step('5. ยิง POST /api/orders ด้วยคุกกี้เก่าและ body ที่ copy ไว้', async () => {
    const r = await request.post('/api/orders', {
      headers: { Cookie: `pp_session=${oldCookie}`, 'content-type': 'application/json' },
      data: orderBody,
    });
    await checkApi('ขั้น 5: HTTP 401', { status: r.status(), body: await apiJson(r) }, () => {
      expect.soft(r.status()).toBe(401);
    });
  });
  await test.step('6. ล็อกอิน demo ใหม่ เปิด /account', async () => {
    await apiLogin(page);
    await page.goto('/account');
    const n = await page.getByTestId('order-row').count();
    await check(page, `ขั้น 6: จำนวนคำสั่งเท่ากับที่จดในขั้น 1 (${ordersBefore})`, page.getByTestId('order-history'), async () => {
      expect.soft(n).toBe(ordersBefore);
    }, { actual: async () => ({ before: ordersBefore, now: n }) });
  });
});

test("TC-SESS-004 คุกกี้ปลอม/ผิดรูปแบบต้องถูกมองเป็น guest และไม่ทำให้ server error", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ทุกแบบ HTTP 3xx ไป `/login` (หรือ 401) ไม่ใช่ 5xx · ขั้น 2: ทุกแบบ HTTP 401 ไม่ใช่ 5xx · ขั้น 3: หัวเว็บมี \"เข้าสู่ระบบ\"" },
    { type: 'source', description: "[R] · R156 · R157 · ความเสี่ยง: เดา/ปลอม session เข้าบัญชีได้ หรือทำ server ล่ม · เทคนิค: Security · Negative" },
  ],
}, async ({ page, request }) => {
  const variants = [
    { label: '(ก) 0×48', header: `pp_session=${'0'.repeat(48)}` },
    { label: '(ข) abc', header: 'pp_session=abc' },
    { label: '(ค) ค่าว่าง', header: 'pp_session=' },
  ];
  await test.step('1. ยิง GET /account ด้วยคุกกี้แต่ละแบบ', async () => {
    for (const v of variants) {
      const r = await request.get('/account', { headers: { Cookie: v.header }, maxRedirects: 0 });
      const loc = r.headers()['location'] ?? '';
      await checkApi(`${v.label}: HTTP 3xx ไป /login (หรือ 401) ไม่ใช่ 5xx`, { status: r.status(), location: loc }, () => {
        const s = r.status();
        expect.soft(s, 'ไม่ใช่ 5xx').toBeLessThan(500);
        expect.soft((s >= 300 && s < 400 && loc.includes('/login')) || s === 401, `status ${s} location ${loc}`).toBe(true);
      });
    }
  });
  await test.step('2. ยิง GET /api/orders/PP-100001 ด้วยคุกกี้แต่ละแบบ', async () => {
    for (const v of variants) {
      const r = await request.get('/api/orders/PP-100001', { headers: { Cookie: v.header } });
      await checkApi(`${v.label}: HTTP 401 ไม่ใช่ 5xx`, { status: r.status(), body: await apiJson(r) }, () => {
        expect.soft(r.status()).toBe(401);
      });
    }
  });
  await test.step('3. ตั้งคุกกี้ (ก) ในเบราว์เซอร์ แล้วเปิด /', async () => {
    await page.context().addCookies([{ name: 'pp_session', value: '0'.repeat(48), url: baseURL() }]);
    await page.goto('/');
    await check(page, 'ขั้น 3: หัวเว็บมี "เข้าสู่ระบบ"', page.getByTestId('login-link'), async (el) => {
      await expect.soft(el).toHaveText('เข้าสู่ระบบ');
    });
  });
});

test("TC-SESS-005 attribute ของคุกกี้ `pp_session` ปลอดภัย และ JS อ่านไม่ได้", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ค่า `pp_session` ตรงรูป `^[0-9a-f]{48}$` · มี `HttpOnly` · `SameSite=Lax` (ไม่สนตัวพิมพ์) · `Path=/` · `Max-Age=604800` (7 วัน) · ขั้น 3: ผลไม่มีคำว่า `pp_session` · ขั้น 4: บน HTTPS ต้องมี `Secure` (บน `http://localhost` ไม่บังคับ)" },
    { type: 'source', description: "[D]+[R] · R156 · ความเสี่ยง: XSS ขโมย session ได้ / CSRF ข้ามเว็บ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  let r = null as Response | null;
  await test.step('1. ล็อกอินบัญชี demo ผ่านฟอร์ม', async () => {
    await page.goto('/login');
    r = await submitLogin(page, DEMO_EMAIL, PW);
  });
  await test.step('2. อ่าน header Set-Cookie ของ POST /api/auth/login', async () => {
    const sc = (await respSetCookie(r)).split('\n').find((c) => c.trim().startsWith('pp_session=')) ?? '';
    const value = /^\s*pp_session=([^;]*)/.exec(sc)?.[1] ?? '';
    const attrs = sc.split(';').slice(1).map((a) => a.trim());
    await checkApi('ค่า pp_session ตรงรูป ^[0-9a-f]{48}$', sc, () => {
      expect.soft(value).toMatch(/^[0-9a-f]{48}$/);
    });
    await checkApi('มี HttpOnly', attrs, () => {
      expect.soft(attrs.map((a) => a.toLowerCase())).toContain('httponly');
    });
    await checkApi('SameSite=Lax (ไม่สนตัวพิมพ์)', attrs, () => {
      expect.soft(attrs.map((a) => a.toLowerCase())).toContain('samesite=lax');
    });
    await checkApi('Path=/', attrs, () => {
      expect.soft(attrs).toContain('Path=/');
    });
    await checkApi('Max-Age=604800 (7 วัน)', attrs, () => {
      expect.soft(attrs.map((a) => a.toLowerCase())).toContain('max-age=604800');
    });
    test.info().annotations.push({ type: 'note', description: `Set-Cookie: ${sc}` });
    await test.step('4. (ถ้า environment ทดสอบเป็น HTTPS) ตรวจ Secure', async () => {
      const https = new URL(baseURL()).protocol === 'https:';
      await checkApi(`Secure: ${https ? 'HTTPS ต้องมี Secure' : 'บน http://localhost ไม่บังคับ'}`, { base: baseURL(), attrs }, () => {
        if (https) expect.soft(attrs.map((a) => a.toLowerCase())).toContain('secure');
      });
    });
  });
  await test.step('3. รัน document.cookie ใน Console', async () => {
    const dc = await page.evaluate(() => document.cookie);
    await check(page, 'ผลไม่มีคำว่า pp_session', null, async () => {
      expect.soft(dc).not.toContain('pp_session');
    }, { actual: async () => dc });
  });
});

test("TC-SESS-006 session คงอยู่หลัง reload และปิดแท็บแล้วเปิดใหม่", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2–3: URL ยัง `/account` · แสดง `demo@pawpantry.test` · หัวเว็บมี \"ออกจากระบบ\" · ค่า `pp_session` เท่าเดิม" },
    { type: 'source', description: "[D]+[R] · R156 · ความเสี่ยง: ลูกค้าหลุดล็อกอินกลางการซื้อ · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  let original: string | undefined;
  await test.step('1. ล็อกอินบัญชี demo เปิด /account', async () => {
    await apiLogin(page);
    await page.goto('/account');
    original = await sessionCookie(page);
  });
  const verify = async (p: Page, tag: string) => {
    await check(p, `${tag}: URL ยัง /account`, null, async () => {
      expect.soft(new URL(p.url()).pathname).toBe('/account');
    });
    await check(p, `${tag}: แสดง demo@pawpantry.test`, p.getByTestId('profile-card'), async (el) => {
      await expect.soft(el).toContainText(DEMO_EMAIL);
    });
    await check(p, `${tag}: หัวเว็บมี "ออกจากระบบ"`, p.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
    const now = await sessionCookie(p);
    await check(p, `${tag}: ค่า pp_session เท่าเดิม`, null, async () => {
      expect.soft(now).toBeTruthy();
      expect.soft(now).toBe(original);
    }, { actual: async () => ({ original, now }) });
  };
  await test.step('2. reload หน้า', async () => {
    await page.reload();
    await verify(page, 'ขั้น 2');
  });
  await test.step('3. ปิดแท็บ แล้วเปิดแท็บใหม่ใน browser context เดิม ไปที่ /account', async () => {
    const ctx = page.context();
    const keep = await ctx.newPage(); // กัน context ปิดตามแท็บสุดท้าย
    await page.close();
    await keep.goto('/account');
    await verify(keep, 'ขั้น 3');
  });
});

test("TC-SESS-007 ออกจากระบบแล้วต้องล้างตะกร้า คูปอง รายการโปรด และประวัติการดูในเครื่อง", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 2: ยอดชำระ ฿259 (฿189 + ฿35×2 = ฿259 < ฿999 ค่าส่งปกติ ฿50 · FREESHIP ส่ง ฿0 → ฿259 + ฿0 = ฿259) · ขั้น 3: กล่อง \"สินค้าที่คุณเพิ่งดู\" มีการ์ด `adult-chicken-dry` · ขั้น 5: ทั้ง 4 key เป็น `null` หรือไม่มีสินค้า/โค้ด (array ว่าง) · `pp-coupon` ไม่มี `FREESHIP` · ตัวนับ 🛒 และ ♥ เป็น 0 หรือไม่แสดง · `/cart` ว่าง (ไม่มีรายการสินค้า) และไม่มี \"FREESHIP\" · `/wishlist` ว่าง ไม่มีทูน่าซอง · `/` ไม่มีกล่อง \"สินค้าที่คุณเพิ่งดู\" (จึงไม่มีการ์ด `adult-chicken-dry`) (ตอนนี้ล้ม: `pp-cart` `pp-coupon` `pp-wishlist` และประวัติการดูยังอยู่ครบ หัวเว็บยังขึ้น 🛒/♥ ตามเดิม)" },
    { type: 'source', description: "[D]+[R] · R71 · Q24 · ความเสี่ยง: ข้อมูลส่วนตัวค้างเครื่องให้คนถัดไป · เทคนิค: Security · State" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo', async () => {
    await apiLogin(page);
  });
  await test.step('1. ใส่ลูกแมวแซลมอน 400 g ×1 และทูน่าซอง ×2 ลงตะกร้า กด ♥ ที่ทูน่าซอง แล้วเปิด /products/adult-chicken-dry', async () => {
    await addToCart(page, 'kitten-salmon-dry', { size: '400 g' });
    await addToCart(page, 'tuna-pouch', { qty: 2 });
    await toggleWishOnPdp(page, 'tuna-pouch');
    await page.goto('/products/adult-chicken-dry');
    await page.waitForFunction(() => (localStorage.getItem('pp-recent') ?? '').includes('adult-chicken-dry'), null, { timeout: 5_000 }).catch(() => {});
  });
  await test.step('2. ไป /cart ใส่ FREESHIP ตรวจยอด', async () => {
    await applyCoupon(page, 'FREESHIP');
    await check(page, 'ขั้น 2: ยอดชำระ ฿259 (฿189 + ฿35×2 = ฿259 · FREESHIP ส่ง ฿0)', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText('฿259');
    });
  });
  await test.step('3. ตรวจว่า pp-cart pp-coupon (มี FREESHIP) pp-wishlist pp-recent มีค่า และ / มีกล่อง "สินค้าที่คุณเพิ่งดู" ที่มีการ์ด adult-chicken-dry', async () => {
    const ls = await lsDump(page);
    test.info().annotations.push({ type: 'note', description: `localStorage ก่อนออกจากระบบ: ${JSON.stringify(ls)}` });
    await page.goto('/');
    const recent = page.getByTestId('recently-viewed');
    await check(page, 'ขั้น 3: กล่อง "สินค้าที่คุณเพิ่งดู" มีการ์ด adult-chicken-dry', recent, async (el) => {
      await expect.soft(el.locator('[data-testid="product-card"][data-slug="adult-chicken-dry"]')).toHaveCount(1);
    });
  });
  await test.step('4. กด "ออกจากระบบ"', async () => {
    await logoutUi(page);
    await page.waitForLoadState().catch(() => {});
  });
  await test.step('5. อ่าน localStorage ทั้ง 4 key ดูตัวนับ 🛒/♥ แล้วเปิด /cart /wishlist และ /', async () => {
    const ls = await lsDump(page);
    await check(page, 'ทั้ง 4 key เป็น null หรือไม่มีสินค้า/โค้ด (array ว่าง)', null, async () => {
      for (const [k, v] of Object.entries(ls)) expect.soft(lsEmpty(v), `${k} = ${v}`).toBe(true);
    }, { actual: async () => ls });
    await check(page, 'pp-coupon ไม่มี FREESHIP', null, async () => {
      expect.soft(ls['pp-coupon'] ?? '').not.toContain('FREESHIP');
    }, { actual: async () => ls['pp-coupon'] });
    await check(page, 'ตัวนับ 🛒 เป็น 0 หรือไม่แสดง', page.getByTestId('cart-count'), async (el) => {
      expect.soft(await badgeZeroOrHidden(el)).toBe(true);
    });
    await check(page, 'ตัวนับ ♥ เป็น 0 หรือไม่แสดง', page.getByTestId('wishlist-count'), async (el) => {
      expect.soft(await badgeZeroOrHidden(el)).toBe(true);
    });
    await page.goto('/cart');
    await check(page, '/cart ว่าง (ไม่มีรายการสินค้า)', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('cart-item')).toHaveCount(0);
    });
    await check(page, '/cart ไม่มี "FREESHIP"', page.locator('main'), async (el) => {
      await expect.soft(el).not.toContainText('FREESHIP');
    });
    await page.goto('/wishlist');
    await check(page, '/wishlist ว่าง ไม่มีทูน่าซอง', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('wishlist-item')).toHaveCount(0);
    });
    await page.goto('/');
    await check(page, '/ ไม่มีกล่อง "สินค้าที่คุณเพิ่งดู" (จึงไม่มีการ์ด adult-chicken-dry)', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('recently-viewed')).toHaveCount(0);
      await expect.soft(page.locator('main').getByText('สินค้าที่คุณเพิ่งดู')).toHaveCount(0);
    });
  });
});

test("TC-SESS-008 คนถัดไปที่ล็อกอินในเครื่องเดียวกันต้องไม่เห็นตะกร้า/คูปอง/รายการโปรดของคนก่อน", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 4: ตัวนับ 🛒 และ ♥ เป็น 0 หรือไม่แสดง · `/cart` ว่างไม่มี \"PAW10\" · `/wishlist` ว่าง · `/` ไม่มีกล่อง \"สินค้าที่คุณเพิ่งดู\" (ตอนนี้ล้ม: บัญชีใหม่เห็นตะกร้า คูปอง และ ♥ ของ demo ครบ)" },
    { type: 'source', description: "[D]+[R] · R71 · Q24 · ความเสี่ยง: คนถัดไปสั่งซื้อของ/ใช้คูปองของคนก่อน · เทคนิค: Security · State" },
  ],
}, async ({ page, request }) => {
  const next = runEmail('qa-reg-201');
  await test.step('เงื่อนไขก่อนเริ่ม: สมัคร qa-reg-201 / Paw12345 ไว้แล้ว (context แยก — ไม่ล็อกอินค้าง)', async () => {
    await apiRegister(request, regBody('QA Reg 201', next));
  });
  await test.step('1. ล็อกอิน demo ใส่ลูกแมวแซลมอน 400 g ×1 ใส่ PAW10 กด ♥ ทูน่าซอง', async () => {
    await apiLogin(page);
    await addToCart(page, 'kitten-salmon-dry', { size: '400 g' });
    await applyCoupon(page, 'PAW10');
    await toggleWishOnPdp(page, 'tuna-pouch');
  });
  await test.step('2. กด "ออกจากระบบ"', async () => {
    await logoutUi(page);
  });
  await test.step('3. ล็อกอิน qa-reg-201 / Paw12345', async () => {
    await page.goto('/login');
    await submitLogin(page, next, PW);
  });
  await test.step('4. ดูตัวนับ 🛒/♥ เปิด /cart /wishlist และ /', async () => {
    await check(page, 'ตัวนับ 🛒 เป็น 0 หรือไม่แสดง', page.getByTestId('cart-count'), async (el) => {
      expect.soft(await badgeZeroOrHidden(el)).toBe(true);
    });
    await check(page, 'ตัวนับ ♥ เป็น 0 หรือไม่แสดง', page.getByTestId('wishlist-count'), async (el) => {
      expect.soft(await badgeZeroOrHidden(el)).toBe(true);
    });
    await page.goto('/cart');
    await check(page, '/cart ว่าง', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('cart-item')).toHaveCount(0);
    });
    await check(page, '/cart ไม่มี "PAW10"', page.locator('main'), async (el) => {
      await expect.soft(el).not.toContainText('PAW10');
    });
    await page.goto('/wishlist');
    await check(page, '/wishlist ว่าง', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('wishlist-item')).toHaveCount(0);
    });
    await page.goto('/');
    await check(page, '/ ไม่มีกล่อง "สินค้าที่คุณเพิ่งดู"', page.locator('main'), async () => {
      await expect.soft(page.getByTestId('recently-viewed')).toHaveCount(0);
      await expect.soft(page.locator('main').getByText('สินค้าที่คุณเพิ่งดู')).toHaveCount(0);
    });
  });
});

test("TC-SESS-009 ออกจากระบบในแท็บหนึ่ง แท็บอื่นต้องทำงานที่ต้องล็อกอินต่อไม่ได้", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ปุ่ม \"ยืนยันสั่งซื้อ ฿85\" (฿35 + ส่ง ฿50 = ฿85) · ขั้น 3: `POST /api/orders` HTTP 401 · ไม่ได้หน้า `/orders/PP-…` · ขั้น 4: URL `/login` ที่ `next` = `/account` · ขั้น 5: จำนวนคำสั่งเท่ากับที่จดไว้" },
    { type: 'source', description: "[D]+[R] · R158 · R157 · ความเสี่ยง: แท็บค้างสั่งซื้อในนามบัญชีที่ออกจากระบบแล้ว · เทคนิค: State · Security" },
  ],
}, async ({ page }) => {
  let ordersBefore = -1;
  const tabA = page;
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอินเป็น demo · ตะกร้ามีทูน่าซอง ×1 · จดจำนวนคำสั่งใน /account', async () => {
    await apiLogin(page);
    await addToCart(page, 'tuna-pouch');
    await page.goto('/account');
    ordersBefore = await page.getByTestId('order-row').count();
    test.info().annotations.push({ type: 'note', description: `จำนวนคำสั่งก่อนเริ่ม = ${ordersBefore}` });
  });
  await test.step('1. แท็บ A เปิด /checkout กรอกที่อยู่ให้ครบ', async () => {
    await tabA.goto('/checkout');
    await fillCheckout(tabA);
    await check(tabA, 'ขั้น 1: ปุ่ม "ยืนยันสั่งซื้อ ฿85" (฿35 + ส่ง ฿50 = ฿85)', tabA.getByTestId('place-order'), async (el) => {
      await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿85');
    });
  });
  await test.step('2. แท็บ B (อยู่ที่ /) กด "ออกจากระบบ"', async () => {
    const tabB = await page.context().newPage();
    await tabB.goto('/');
    await logoutUi(tabB);
    await tabB.close();
  });
  await test.step('3. กลับแท็บ A กด "ยืนยันสั่งซื้อ ฿85" ดู Network', async () => {
    await tabA.bringToFront();
    const wait = tabA.waitForResponse((r) => r.url().includes('/api/orders') && r.request().method() === 'POST', { timeout: 10_000 }).catch(() => null);
    await tabA.getByTestId('place-order').click();
    const r = await wait;
    await tabA.waitForTimeout(1_000);
    await checkApi('ขั้น 3: POST /api/orders HTTP 401', { status: r?.status() ?? '(ไม่มี request)' }, () => {
      expect.soft(r?.status()).toBe(401);
    });
    await check(tabA, 'ขั้น 3: ไม่ได้หน้า /orders/PP-…', null, async () => {
      expect.soft(new URL(tabA.url()).pathname).not.toMatch(/^\/orders\/PP-/);
    });
  });
  await test.step('4. แท็บ A เปิด /account', async () => {
    await tabA.goto('/account');
    await check(tabA, 'ขั้น 4: URL /login ที่ next = /account', null, async () => {
      expect.soft(new URL(tabA.url()).pathname).toBe('/login');
      expect.soft(nextOf(tabA.url())).toBe('/account');
    });
  });
  await test.step('5. ล็อกอิน demo ใหม่ ดูจำนวนคำสั่ง', async () => {
    await apiLogin(tabA);
    await tabA.goto('/account');
    const n = await tabA.getByTestId('order-row').count();
    await check(tabA, `ขั้น 5: จำนวนคำสั่งเท่ากับที่จดไว้ (${ordersBefore})`, tabA.getByTestId('order-history'), async () => {
      expect.soft(n).toBe(ordersBefore);
    }, { actual: async () => ({ before: ordersBefore, now: n }) });
  });
});

test("TC-SESS-010 เรียกออกจากระบบตอนไม่มี session หรือซ้ำ 2 ครั้ง ต้องไม่ error", {
  tag: ["@P1","@5.6"],
  annotation: [
    { type: 'expected', description: "ขั้น 1–2: HTTP 2xx หรือ 401 ไม่ใช่ 5xx · ขั้น 3: หัวเว็บมี \"เข้าสู่ระบบ\"" },
    { type: 'source', description: "[D]+[R] · R157 · ความเสี่ยง: ปุ่มออกจากระบบพังเมื่อกดซ้ำ/ข้ามแท็บ · เทคนิค: Negative" },
  ],
}, async ({ page, request }) => {
  await test.step('1. ยิง POST /api/auth/logout โดยไม่มีคุกกี้', async () => {
    const r = await request.post('/api/auth/logout');
    await checkApi('ขั้น 1: HTTP 2xx หรือ 401 ไม่ใช่ 5xx', { status: r.status(), body: await apiJson(r) }, () => {
      expect.soft(r.ok() || r.status() === 401, `status ${r.status()}`).toBe(true);
    });
  });
  await test.step('2. ล็อกอิน demo จดคุกกี้ กด "ออกจากระบบ" แล้วยิง POST /api/auth/logout ซ้ำด้วยคุกกี้เก่า', async () => {
    await apiLogin(page);
    await page.goto('/');
    const old = (await sessionCookie(page)) ?? '';
    await logoutUi(page);
    const r = await request.post('/api/auth/logout', { headers: { Cookie: `pp_session=${old}` } });
    await checkApi('ขั้น 2: HTTP 2xx หรือ 401 ไม่ใช่ 5xx', { status: r.status(), body: await apiJson(r) }, () => {
      expect.soft(r.ok() || r.status() === 401, `status ${r.status()}`).toBe(true);
    });
  });
  await test.step('3. เปิด /', async () => {
    await page.goto('/');
    await check(page, 'ขั้น 3: หัวเว็บมี "เข้าสู่ระบบ"', page.getByTestId('login-link'), async (el) => {
      await expect.soft(el).toHaveText('เข้าสู่ระบบ');
    });
  });
});

// ===========================================================================
// @ratelimit — รันท้ายสุดของ project ด้วยบัญชีของตัวเอง ไม่ใช้ demo (G3)
// ===========================================================================

/** หลังจบ test rate limit: reset แล้วล็อกอิน demo ต้องได้ 2xx (ถ้าได้ 429 = ตัวนับไม่ถูกล้าง/จำกัดต่อ IP — Q31) */
async function afterRateLimitDemoCheck(request: APIRequestContext): Promise<void> {
  await test.step('หลังจบ: เรียก reset แล้วล็อกอิน demo ต้องได้ HTTP 2xx', async () => {
    await request.post('/api/test/reset');
    const r = await request.post('/api/auth/login', { data: { email: DEMO_EMAIL, password: PW } });
    await checkApi('หลังจบ: reset แล้วล็อกอิน demo ได้ HTTP 2xx (ถ้า 429 ให้หยุดก่อนรัน project ถัดไปและแจ้งทีม — Q31)', { status: r.status() }, () => {
      expect.soft(r.ok(), `status ${r.status()}`).toBe(true);
    });
    await request.post('/api/auth/logout');
  });
}

test("TC-AUTH-008 ล็อกอินผิด 5 ครั้งติดกัน ครั้งที่ 6 ต้องถูกจำกัดแม้รหัสถูก (server บังคับ ไม่ใช่แค่หน้าเว็บ)", {
  tag: ["@P1","@5.6","@ratelimit"],
  annotation: [
    { type: 'expected', description: "ครั้งที่ 1–5: HTTP 401 · ครั้งที่ 6: HTTP 429 (หรือ 4xx ที่ข้อความไม่ใช่ \"อีเมลหรือรหัสผ่านไม่ถูกต้อง\") · เกณฑ์ 5 ครั้งเป็นสมมติฐานหัวข้อ 8.3 ปรับตามคำตอบ Q31 · ไม่มี `Set-Cookie: pp_session` · หัวเว็บยังมี \"เข้าสู่ระบบ\" (ตอนนี้ล้ม: ทุกครั้งได้ 401 ไม่หน่วง ไม่ล็อก ครั้งที่ใส่รหัสถูกเข้าได้ทันที)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R148 · Q31 · ความเสี่ยง: เดารหัสผ่านได้ไม่จำกัด · เทคนิค: Security · Negative" },
  ],
}, async ({ page, request }) => {
  const email = runEmail('qa-reg-101');
  await test.step('เงื่อนไขก่อนเริ่ม: สมัคร qa-reg-101 / Paw12345 ไว้แล้ว (context แยก — ไม่ล็อกอินค้าง)', async () => {
    await apiRegister(request, regBody('QA Reg 101', email));
    await request.post('/api/auth/logout');
  });
  await test.step('1. ยิง POST /api/auth/login ด้วยอีเมล qa-reg-101 + Wrong1234 4 ครั้งติดกัน', async () => {
    for (let i = 1; i <= 4; i++) {
      const r = await request.post('/api/auth/login', { data: { email, password: 'Wrong1234' } });
      await checkApi(`ครั้งที่ ${i}: HTTP 401`, { status: r.status(), body: await apiJson(r) }, () => {
        expect.soft(r.status()).toBe(401);
      });
    }
  });
  await test.step('2. ครั้งที่ 5 ใส่ Wrong1234 ผ่านฟอร์ม /login', async () => {
    await page.goto('/login');
    const r = await submitLogin(page, email, 'Wrong1234');
    await checkApi('ครั้งที่ 5: HTTP 401', { status: r?.status() ?? null }, () => {
      expect.soft(r?.status()).toBe(401);
    });
  });
  await test.step('3–4. ครั้งที่ 6 ใส่ Paw12345 ผ่านฟอร์ม ดู status ข้อความ และคุกกี้', async () => {
    await page.goto('/login');
    const r = await submitLogin(page, email, PW);
    const sc = await respSetCookie(r);
    const body = await respJson(r);
    await checkApi('ครั้งที่ 6: HTTP 429 (หรือ 4xx ที่ข้อความไม่ใช่ "อีเมลหรือรหัสผ่านไม่ถูกต้อง")', { status: r?.status() ?? null, body }, () => {
      const s = r?.status() ?? 0;
      const ok = s === 429 || (s >= 400 && s < 500 && !JSON.stringify(body ?? '').includes(MSG_LOGIN_FAIL));
      expect.soft(ok, `status ${s}`).toBe(true);
    });
    await checkApi('ไม่มี Set-Cookie: pp_session', sc, () => {
      expect.soft(sc).not.toContain('pp_session');
    });
    await check(page, 'หัวเว็บยังมี "เข้าสู่ระบบ"', page.getByTestId('login-link'), async (el) => {
      await expect.soft(el).toHaveText('เข้าสู่ระบบ');
    });
  });
  await apiLogout(page);
  await afterRateLimitDemoCheck(request);
});

test("TC-AUTH-009 ขอบเกณฑ์จำกัด: ผิด 4 ครั้งแล้วถูกยังเข้าได้ · การจำกัดเป็นรายบัญชี ไม่กระทบบัญชีอื่น", {
  tag: ["@P1","@5.6","@ratelimit"],
  annotation: [
    { type: 'expected', description: "ขั้น 1: ครั้งที่ 5 HTTP 2xx ล็อกอินสำเร็จ (ขอบ 4/5 ครั้งเป็นสมมติฐานหัวข้อ 8.3 ปรับตามคำตอบ Q31) · ขั้น 4: `qa-reg-105-{run}` ล็อกอินได้ HTTP 2xx (สมมติฐาน Q31: จำกัดต่อบัญชี — การจำกัด `qa-reg-103-{run}` ไม่ลามไปบัญชีอื่น; ถ้าทีมตอบว่าจำกัดต่อ IP ให้คาดหวัง 429)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R148 · Q31 · ความเสี่ยง: จำกัดเร็วเกินจนลูกค้าจริงเข้าไม่ได้ / จำกัดผิดบัญชี · เทคนิค: Boundary · Security" },
  ],
}, async ({ page, request }) => {
  const e102 = runEmail('qa-reg-102');
  const e103 = runEmail('qa-reg-103');
  const e105 = runEmail('qa-reg-105');
  await test.step('เงื่อนไขก่อนเริ่ม: สมัคร qa-reg-102 / 103 / 105 (รหัส Paw12345) ไว้แล้ว ออกจากระบบ', async () => {
    for (const [n, e] of [['102', e102], ['103', e103], ['105', e105]] as const) await apiRegister(request, regBody(`QA Reg ${n}`, e));
    await request.post('/api/auth/logout');
  });
  await test.step('1. qa-reg-102 ใส่ Wrong1234 4 ครั้ง แล้วครั้งที่ 5 ใส่ Paw12345', async () => {
    for (let i = 1; i <= 4; i++) await request.post('/api/auth/login', { data: { email: e102, password: 'Wrong1234' } });
    await page.goto('/login');
    const r = await submitLogin(page, e102, PW);
    await checkApi('ขั้น 1: ครั้งที่ 5 HTTP 2xx ล็อกอินสำเร็จ', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
    await check(page, 'ขั้น 1: หัวเว็บมี "ออกจากระบบ"', page.getByTestId('logout-button'), async (el) => {
      await expect.soft(el).toContainText('ออกจากระบบ');
    });
  });
  await test.step('2. ออกจากระบบ', async () => {
    if (await page.getByTestId('logout-button').count()) await logoutUi(page);
    else await apiLogout(page);
  });
  await test.step('3. qa-reg-103 ใส่ Wrong1234 5 ครั้ง (ให้ถูกจำกัด)', async () => {
    const st: number[] = [];
    for (let i = 1; i <= 5; i++) st.push((await request.post('/api/auth/login', { data: { email: e103, password: 'Wrong1234' } })).status());
    test.info().annotations.push({ type: 'note', description: `qa-reg-103 status 5 ครั้ง: ${st.join(', ')}` });
  });
  await test.step('4. ทันทีหลังขั้น 3 ล็อกอิน qa-reg-105 / Paw12345', async () => {
    await page.goto('/login');
    const r = await submitLogin(page, e105, PW);
    await checkApi('ขั้น 4: qa-reg-105 ล็อกอินได้ HTTP 2xx (การจำกัด qa-reg-103 ไม่ลามไปบัญชีอื่น)', { status: r?.status() ?? null }, () => {
      expect.soft(r?.ok(), `status ${r?.status()}`).toBe(true);
    });
  });
  await apiLogout(page);
  await afterRateLimitDemoCheck(request);
});
