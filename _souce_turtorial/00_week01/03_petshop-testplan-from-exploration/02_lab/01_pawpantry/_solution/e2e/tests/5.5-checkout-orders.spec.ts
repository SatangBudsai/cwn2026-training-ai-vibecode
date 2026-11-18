/**
 * หัวข้อ 5.5 ชำระเงิน คำสั่งซื้อ และบัญชี (TEST-PLAN.md) — 47 test case: CHK, ORD, CONF, ACC
 *
 * locator ที่ใช้ (สำรวจด้วย playwright-cli):
 *   /cart      : cart-item · item-qty · coupon-input · coupon-apply · coupon-remove · checkout-button · cart-count (หัวเว็บ)
 *   /checkout  : ship-name · ship-phone · ship-postcode · ship-address · ship-province · shipping-standard/express
 *                pay-cod/pay-promptpay · promptpay-qr · summary-subtotal/discount/shipping/total · place-order
 *                error-ship-* (p role=alert ถัดจาก input ใน div.field) · order-error
 *   /orders/id : order-success · order-id · order-timeline · timeline-step · order-item · summary-* · ลิงก์ "ดูประวัติการสั่งซื้อ"
 *   /account   : profile-card (dt/dd "คำสั่งซื้อ", "ยอดซื้อสะสม") · order-history · order-row (href=/orders/<id>)
 *   /login     : login-email · login-password · login-submit · หัวเว็บ logout-button
 * body แม่แบบของ POST /api/orders (ดักจากหน้าเว็บจริง): {items:[{slug,size,qty}], coupon, shipping, payment,
 *   address:{name,phone,address,province,postcode}} · response 201 = {order:{...}, id}
 */
import type { APIRequestContext, Page, Request, Response } from '@playwright/test';
import { test, expect, check, checkApi, runEmail, baseURL } from './support/pp';

const PW = 'Paw12345';
const DEMO = 'demo@pawpantry.test';
const ADDR = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  address: '99/1 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  postcode: '10110',
};
type Addr = typeof ADDR;
type Item = { slug: string; size: string; qty: unknown; [k: string]: unknown };
type Ship = 'standard' | 'express';
type Pay = 'cod' | 'promptpay';

const KITTEN = (qty: unknown = 1): Item => ({ slug: 'kitten-salmon-dry', size: '400 g', qty });
const HAIRBALL = (qty: unknown = 1): Item => ({ slug: 'hairball-control-dry', size: '1.5 kg', qty });
const TUNA = (qty: unknown = 1): Item => ({ slug: 'tuna-pouch', size: 'ซอง 85 g', qty });
const FD_CHICKEN = (qty: unknown = 1): Item => ({ slug: 'freeze-dried-chicken-cat', size: '50 g', qty });
const LICKABLE = (qty: unknown = 1): Item => ({ slug: 'lickable-salmon-treat', size: '4 ซอง', qty });

const ORDER_URL = /\/orders\/PP-\d{6}$/;
const ORDER_ID = /^PP-\d{6}$/;
const HAS_ORDER_NO = /PP-\d{6}/;
/** ส่วนลดบนหน้าเว็บ: แผนเขียนเครื่องหมายลบเป็น "−" (U+2212) รับทั้ง "−" และ "-" เพราะต่างกันแค่ตัวอักษร ตัวเลขต้องตรงแผน */
const minus = (n: number) => new RegExp(`^\\s*[−-]\\s*฿${n.toLocaleString('en-US')}\\s*$`);
const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;
const num = (s: unknown) => Number(String(s ?? '').replace(/[^\d.]/g, '') || NaN);

const isOrderPost = (r: Request) => r.method() === 'POST' && new URL(r.url()).pathname === '/api/orders';
const orderIdFromUrl = (page: Page) => decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '');

/* ---------------- API ---------------- */

/** body แม่แบบจาก TC-CHK-001 (ลูกแมว สูตรแซลมอน 400 g ×1 · ส่งธรรมดา · เก็บเงินปลายทาง) แก้ทีละส่วนได้ */
function orderBody(over: { address?: Partial<Addr>; [k: string]: unknown } = {}) {
  const { address, ...rest } = over;
  return {
    items: [KITTEN(1)],
    coupon: null as string | null,
    shipping: 'standard',
    payment: 'cod',
    ...rest,
    address: { ...ADDR, ...(address ?? {}) },
  };
}

async function login(req: APIRequestContext, email = DEMO, password = PW) {
  const r = await req.post('/api/auth/login', { data: { email, password } });
  if (!r.ok()) throw new Error(`ล็อกอิน ${email} ไม่ได้: HTTP ${r.status()} ${await r.text()}`);
}

/** สมัครบัญชีใหม่ (ระบบล็อกอินให้อัตโนมัติ) · ถ้าอีเมลมีอยู่แล้วจากรอบก่อน ให้ล็อกอินแทน */
async function register(req: APIRequestContext, prefix: string, name = 'คิวเอ ทดสอบ') {
  const email = runEmail(prefix);
  const r = await req.post('/api/auth/register', {
    data: { name, email, password: PW, confirm: PW, confirmPassword: PW, pet: 'cat', terms: true },
  });
  if (r.status() !== 201) await login(req, email);
  return email;
}

async function apiOrder(req: APIRequestContext, body: unknown) {
  const r = await req.post('/api/orders', { data: body as Record<string, unknown> });
  const text = await r.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ไม่ใช่ JSON */
  }
  return { status: r.status(), text, json, id: (json?.id ?? json?.order?.id ?? null) as string | null };
}

async function getOrder(req: APIRequestContext, id: string) {
  const r = await req.get(`/api/orders/${id}`);
  const text = await r.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ไม่ใช่ JSON */
  }
  return { status: r.status(), text, json, order: (json?.order ?? json) as any };
}

async function stocks(req: APIRequestContext): Promise<Record<string, number>> {
  const r = await req.get('/api/products');
  const j = await r.json();
  return Object.fromEntries((j.items as { slug: string; stock: number }[]).map((p) => [p.slug, p.stock]));
}

/* ---------------- หน้าเว็บ ---------------- */

/** นับ POST /api/orders ที่หน้าเว็บส่ง (ทุกแท็บใน context) */
function trackOrderPosts(page: Page) {
  const t = { posts: 0, statuses: [] as number[], bodies: [] as string[] };
  page.context().on('request', (r) => {
    if (isOrderPost(r)) {
      t.posts++;
      t.bodies.push(r.postData() ?? '');
    }
  });
  page.context().on('response', (r) => {
    if (isOrderPost(r.request())) t.statuses.push(r.status());
  });
  return t;
}

/** ตั้งตะกร้า (pp-cart) แล้วเปิด /cart · ถ้ามีคูปองใส่ผ่านช่อง "ใช้โค้ด" */
async function seedCart(page: Page, items: Item[], coupon?: string) {
  await page.goto('/cart');
  await page.evaluate((it) => {
    localStorage.setItem('pp-cart', JSON.stringify(it));
    localStorage.removeItem('pp-coupon');
  }, items);
  await page.reload();
  await page.getByTestId('cart-item').first().waitFor();
  if (coupon) {
    await page.getByTestId('coupon-input').fill(coupon);
    await page.getByTestId('coupon-apply').click();
    await page.getByTestId('coupon-remove').waitFor();
  }
}

/** เปิด /checkout (ตรง ๆ หรือกดปุ่มจาก /cart) แล้วรอให้ชื่อผู้รับถูกเติมก่อน กันค่าเติมอัตโนมัติทับค่าที่พิมพ์ */
async function gotoCheckout(page: Page, viaCart = false) {
  if (viaCart) {
    await page.goto('/cart');
    await page.getByTestId('checkout-button').click();
    await page.waitForURL(/\/checkout$/);
  } else {
    await page.goto('/checkout');
  }
  await page.getByTestId('place-order').waitFor();
  await page
    .waitForFunction(() => !!(document.querySelector('[data-testid="ship-name"]') as HTMLInputElement | null)?.value, null, {
      timeout: 5000,
    })
    .catch(() => {});
}

/** กรอกที่อยู่ (ค่าเริ่มต้น = ที่อยู่มาตรฐานของแผน) · ไม่แตะชื่อผู้รับถ้าไม่ได้ส่ง name มา */
async function fillAddress(page: Page, a: Partial<Addr> = {}) {
  if (a.name !== undefined) await page.getByTestId('ship-name').fill(a.name);
  await page.getByTestId('ship-phone').fill(a.phone ?? ADDR.phone);
  await page.getByTestId('ship-postcode').fill(a.postcode ?? ADDR.postcode);
  await page.getByTestId('ship-address').fill(a.address ?? ADDR.address);
  await page.getByTestId('ship-province').selectOption({ label: a.province ?? ADDR.province });
}

async function setMethods(page: Page, shipping?: Ship, payment?: Pay) {
  if (shipping) await page.getByTestId(shipping === 'express' ? 'shipping-express' : 'shipping-standard').check();
  if (payment) await page.getByTestId(payment === 'promptpay' ? 'pay-promptpay' : 'pay-cod').check();
}

/** กดปุ่มยืนยันสั่งซื้อ แล้วรอ response ของ POST /api/orders (wait สั้นเมื่อคาดว่าฟอร์มไม่ส่ง) */
async function submitOrder(page: Page, wait = 15_000) {
  const respP = page.waitForResponse((r) => isOrderPost(r.request()), { timeout: wait }).catch(() => null);
  await page.getByTestId('place-order').click();
  const resp = await respP;
  const json: any = resp ? await resp.json().catch(() => null) : null;
  if (resp?.status() === 201) await page.waitForURL(ORDER_URL, { timeout: 10_000 }).catch(() => {});
  return {
    status: (resp?.status() ?? null) as number | null,
    json,
    reqBody: resp?.request().postData() ?? null,
    id: (json?.id ?? json?.order?.id ?? null) as string | null,
  };
}

/** สั่งซื้อผ่านหน้าเว็บจนถึง /orders/<id> (ใช้เป็นเงื่อนไขก่อนเริ่ม/ขั้นตอนสั่งซื้อ) คืนเลขคำสั่งจาก URL */
async function orderViaUI(
  page: Page,
  o: { items: Item[]; coupon?: string; shipping?: Ship; payment?: Pay; addr?: Partial<Addr> },
) {
  await seedCart(page, o.items, o.coupon);
  await gotoCheckout(page);
  await fillAddress(page, o.addr ?? {});
  await setMethods(page, o.shipping, o.payment);
  const r = await submitOrder(page);
  if (r.status !== 201) throw new Error(`สั่งซื้อไม่สำเร็จ: HTTP ${r.status} ${JSON.stringify(r.json)}`);
  await page.waitForURL(ORDER_URL);
  return orderIdFromUrl(page);
}

const statDd = (page: Page, label: string) =>
  page
    .getByTestId('profile-card')
    .locator('dt', { hasText: new RegExp(`^\\s*${label}\\s*$`) })
    .locator('xpath=following-sibling::dd[1]');

/** อ่านจำนวนคำสั่ง ยอดซื้อสะสม และเลขคำสั่งทุกแถวใน /account */
async function accountStats(page: Page) {
  await page.goto('/account');
  await page.getByTestId('profile-card').waitFor();
  const ids = await page
    .getByTestId('order-row')
    .evaluateAll((els) => els.map((e) => decodeURIComponent((e.getAttribute('href') ?? '').split('/').pop() ?? '')));
  return {
    count: num(await statDd(page, 'คำสั่งซื้อ').innerText()),
    total: num(await statDd(page, 'ยอดซื้อสะสม').innerText()),
    ids,
  };
}

const orderRow = (page: Page, id: string) => page.locator(`[data-testid="order-row"][href$="/orders/${id}"]`);

/** ตรวจว่ามีข้อความ error ผูกกับช่องนั้น (aria-describedby หรือ element ถัดจาก input ใน container เดียวกัน) · msg ว่าง = error ใดก็ได้ */
async function checkFieldError(page: Page, testid: string, msg?: string, label?: string) {
  const input = page.getByTestId(testid);
  const field = input.locator('xpath=..');
  if (msg) await field.getByText(msg).first().waitFor({ timeout: 3000 }).catch(() => {});
  await check(page, label ?? `error ที่ช่อง ${testid}${msg ? `: "${msg}"` : ''}`, field, async () => {
    const ok = await input.evaluate((el, m) => {
      const has = (t: string | null | undefined) => (m ? (t ?? '').includes(m) : (t ?? '').trim().length > 0);
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      const byAria = ids.some((id) => has(document.getElementById(id)?.textContent));
      const bySibling = [...(el.parentElement?.children ?? [])].some(
        (c) => c !== el && c.tagName !== 'LABEL' && has(c.textContent),
      );
      return byAria || bySibling;
    }, msg ?? '');
    expect.soft(ok, `ช่อง ${testid} ต้องมีข้อความ error${msg ? ` "${msg}"` : ''}`).toBe(true);
  }, { actual: () => field.innerText() });
}

async function loginViaForm(page: Page, email: string, password = PW) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

async function logoutViaUI(page: Page) {
  const done = page.waitForResponse((r) => r.url().includes('/api/auth/logout'), { timeout: 10_000 }).catch(() => null);
  await page.getByTestId('logout-button').click();
  await done;
}


test("TC-CHK-001 กรอกฟอร์มถูกครบแล้วสั่งซื้อสำเร็จ (ส่งธรรมดา · เก็บเงินปลายทาง) และชื่อผู้รับถูกเติมจากบัญชี", {
  tag: ["@P1", "@5.5", "@mobile-too"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ช่องชื่อผู้รับมีค่าเท่ากับชื่อโปรไฟล์ใน `/account` (ที่สำรวจเห็น \"สมใจ ใจดี\") · ช่องเบอร์/รหัสไปรษณีย์/ที่อยู่ว่าง · จังหวัดเริ่มต้น \"กรุงเทพมหานคร\" · ข้อ 4: ปุ่มเขียน \"ยืนยันสั่งซื้อ ฿239\" (฿189×1 + ส่ง ฿50 = ฿239) · `POST /api/orders` ได้ HTTP 201 · URL ปลายทางตรง `^/orders/PP-\\d{6}$` · ไม่มีข้อความ error ใต้ช่องใดเลย" },
    { type: 'source', description: "[D]+[R] · R98 · R99 · R105 · ความเสี่ยง: ลูกค้าที่กรอกถูกสั่งซื้อไม่ได้ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว สูตรแซลมอน 400 g ×1 · ไม่มีคูปอง', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
  });
  await test.step('1. ใน /cart กด "ดำเนินการชำระเงิน →"', async () => {
    await gotoCheckout(page, true);
  });
  let profileName = '';
  await test.step('2. ดูค่าช่องชื่อผู้รับ เทียบกับชื่อโปรไฟล์ใน /account (เปิดอีกแท็บ)', async () => {
    const acc = await page.context().newPage();
    await acc.goto('/account');
    profileName = (await acc.getByTestId('profile-card').getByRole('heading', { level: 1 }).innerText()).trim();
    await acc.close();
    await page.bringToFront();
  });
  await check(page, `ช่องชื่อผู้รับ = ชื่อโปรไฟล์ใน /account ("${profileName}")`, page.getByTestId('ship-name'), async (el) => {
    await expect.soft(el).toHaveValue(profileName);
    expect.soft(profileName, 'ชื่อโปรไฟล์ต้องไม่ว่าง').not.toBe('');
  }, { actual: async () => `ช่องชื่อ="${await page.getByTestId('ship-name').inputValue()}" · โปรไฟล์="${profileName}"` });
  await check(page, 'ช่องเบอร์/รหัสไปรษณีย์/ที่อยู่ว่าง', page.locator('[data-testid="ship-phone"], [data-testid="ship-postcode"], [data-testid="ship-address"]'), async () => {
    await expect.soft(page.getByTestId('ship-phone')).toHaveValue('');
    await expect.soft(page.getByTestId('ship-postcode')).toHaveValue('');
    await expect.soft(page.getByTestId('ship-address')).toHaveValue('');
  });
  await check(page, 'จังหวัดเริ่มต้น "กรุงเทพมหานคร"', page.getByTestId('ship-province'), async (el) => {
    await expect.soft(el).toHaveValue('กรุงเทพมหานคร');
  });
  await test.step('3. กรอกเบอร์ รหัสไปรษณีย์ ที่อยู่ เลือกจังหวัด ส่งธรรมดา เก็บเงินปลายทาง', async () => {
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
  });
  await check(page, 'ปุ่มเขียน "ยืนยันสั่งซื้อ ฿239" (฿189×1 + ส่ง ฿50)', page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿239');
  });
  let r = { status: null as number | null, json: null as any, reqBody: null as string | null, id: null as string | null };
  let errorsRightAfter = -1;
  await test.step('4. กดปุ่มยืนยันสั่งซื้อ (ดัก POST /api/orders)', async () => {
    const respP = page.waitForResponse((x) => isOrderPost(x.request()), { timeout: 15_000 }).catch(() => null);
    await page.getByTestId('place-order').click();
    errorsRightAfter = await page.locator('[data-testid^="error-ship-"]').count();
    const resp = await respP;
    r = { status: resp?.status() ?? null, json: await resp?.json().catch(() => null), reqBody: resp?.request().postData() ?? null, id: null };
    await page.waitForURL(ORDER_URL, { timeout: 10_000 }).catch(() => {});
  });
  await checkApi('POST /api/orders ได้ HTTP 201', { status: r.status, body: r.json }, () => {
    expect.soft(r.status).toBe(201);
  });
  await check(page, 'URL ปลายทางตรง ^/orders/PP-\\d{6}$', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
  await check(page, 'ไม่มีข้อความ error ใต้ช่องใดเลย', page.locator('[data-testid^="error-ship-"]'), async () => {
    expect.soft(errorsRightAfter, 'จำนวนข้อความ error ใต้ช่องตอนกดยืนยัน').toBe(0);
    expect.soft(t.posts, 'กดครั้งเดียวต้องส่ง POST /api/orders 1 ครั้ง').toBe(1);
  }, { actual: async () => `error ใต้ช่องตอนกด = ${errorsRightAfter} · POST = ${t.posts}` });
  await test.step('5. เก็บ body ของ POST /api/orders ไว้เป็น "body แม่แบบ"', async () => {
    await test.info().attach('body แม่แบบ POST /api/orders', { body: r.reqBody ?? '(ไม่มี request)', contentType: 'application/json' });
  });
});

test("TC-CHK-002 ไม่ล็อกอินพิมพ์ `/checkout` ตรง ๆ ต้องถูกส่งไปหน้าล็อกอินพร้อม `next=/checkout`", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: URL = `/login?next=/checkout` (หรือ `next=%2Fcheckout`) · ไม่เห็นฟอร์มที่อยู่และไม่มีปุ่ม \"ยืนยันสั่งซื้อ\" · `POST /api/orders` = 0 ครั้ง" },
    { type: 'source', description: "[R] · R98 · ล็อกอินแล้วกลับ checkout พร้อมตะกร้าเดิม ดู TC-CART-026 · ความเสี่ยง: คนไม่ล็อกอินเข้าฟอร์มสั่งซื้อได้ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ไม่ล็อกอิน · ตะกร้า ลูกแมว สูตรแซลมอน 400 g ×1', async () => {
    await seedCart(page, [KITTEN(1)]);
  });
  await test.step('1. พิมพ์ /checkout ในแถบที่อยู่', async () => {
    await page.goto('/checkout');
  });
  await check(page, 'URL = /login?next=/checkout (หรือ next=%2Fcheckout)', null, async () => {
    await expect.soft(page).toHaveURL(/\/login\?next=(\/|%2F)checkout$/);
  });
  await check(page, 'ไม่เห็นฟอร์มที่อยู่และไม่มีปุ่ม "ยืนยันสั่งซื้อ"', page.locator('main'), async () => {
    await expect.soft(page.getByTestId('ship-address')).toHaveCount(0);
    await expect.soft(page.getByTestId('place-order')).toHaveCount(0);
    await expect.soft(page.getByRole('button', { name: /ยืนยันสั่งซื้อ/ })).toHaveCount(0);
  });
  await check(page, 'POST /api/orders = 0 ครั้ง', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
});

test("TC-CHK-003 ล็อกอินแล้วแต่ตะกร้าว่าง เปิด checkout ไม่ได้", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "URL ปลายทาง = `/cart` · ไม่มีปุ่ม \"ยืนยันสั่งซื้อ\" บนหน้า · ไม่มี request `POST /api/orders` (0 ครั้ง)" },
    { type: 'source', description: "[R] · R98 · ความเสี่ยง: สร้างคำสั่งยอด ฿0/ค่าส่งอย่างเดียว · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้าว่าง', async () => {
    await login(page.request);
  });
  await test.step('1. พิมพ์ /checkout ในแถบที่อยู่', async () => {
    await page.goto('/checkout');
  });
  await check(page, 'URL ปลายทาง = /cart', null, async () => {
    await expect.soft(page).toHaveURL(/\/cart$/);
  });
  await check(page, 'ไม่มีปุ่ม "ยืนยันสั่งซื้อ" บนหน้า', page.locator('main'), async () => {
    await expect.soft(page.getByTestId('place-order')).toHaveCount(0);
    await expect.soft(page.getByRole('button', { name: /ยืนยันสั่งซื้อ/ })).toHaveCount(0);
  });
  await check(page, 'ไม่มี request POST /api/orders (0 ครั้ง)', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
});

test("TC-CHK-004 ส่งฟอร์มที่ว่างทุกช่อง ต้องไม่ส่งและบอก error ครบทุกช่อง", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "`POST /api/orders` = 0 ครั้ง · URL ยังเป็น `/checkout` · มีข้อความ error ครบ 4 ช่องในการกดครั้งเดียว (ข้อความของฟอร์ม: \"กรุณากรอกชื่อผู้รับ\" / \"เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0\" / \"รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก\" / \"กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)\") · แต่ละข้อความอยู่ใน element ที่ช่องนั้นอ้างด้วย `aria-describedby` หรือเป็น element ถัดจาก input ใน container เดียวกัน และตรงช่อง (\"กรุณากรอกชื่อผู้รับ\" อยู่กับช่องชื่อ ฯลฯ) (WCAG 3.3.1)" },
    { type: 'source', description: "[R] · R99 · ความเสี่ยง: คำสั่งซื้อไม่มีที่อยู่ส่งของ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · อยู่ที่ /checkout', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
  });
  await test.step('1. ลบค่าช่องชื่อผู้รับ', async () => {
    await page.getByTestId('ship-name').fill('');
  });
  await test.step('2. กดปุ่มยืนยันสั่งซื้อ (ครั้งเดียว)', async () => {
    await submitOrder(page, 2000);
  });
  await check(page, 'POST /api/orders = 0 ครั้ง', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  await check(page, 'URL ยังเป็น /checkout', null, async () => {
    await expect.soft(page).toHaveURL(/\/checkout$/);
  });
  await checkFieldError(page, 'ship-name', 'กรุณากรอกชื่อผู้รับ');
  await checkFieldError(page, 'ship-phone', 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0');
  await checkFieldError(page, 'ship-postcode', 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก');
  await checkFieldError(page, 'ship-address', 'กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)');
});

test("TC-CHK-005 ชื่อผู้รับว่าง / ช่องว่างล้วน ถูกปฏิเสธ · ชื่อ 1 ตัวอักษรผ่าน", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1–2: error ที่ช่องชื่อ (ข้อความของฟอร์ม: \"กรุณากรอกชื่อผู้รับ\") · `POST /api/orders` = 0 ครั้ง · ข้อ 3: HTTP 201 · URL `/orders/PP-\\d{6}`" },
    { type: 'source', description: "[R] · R100 · ความเสี่ยง: พัสดุไม่มีชื่อผู้รับ · เทคนิค: Boundary, Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  for (const [i, v] of [['1', ''], ['2', '   ']] as const) {
    await test.step(`${i}. ใส่ชื่อ ${JSON.stringify(v)} กดยืนยัน`, async () => {
      await page.getByTestId('ship-name').fill(v);
      await submitOrder(page, 2000);
    });
    await checkFieldError(page, 'ship-name', 'กรุณากรอกชื่อผู้รับ', `ชื่อ ${JSON.stringify(v)}: error ที่ช่องชื่อ "กรุณากรอกชื่อผู้รับ"`);
  }
  await check(page, 'ข้อ 1–2: POST /api/orders = 0 ครั้ง', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let r = { status: null as number | null };
  await test.step('3. ใส่ "ก" กดยืนยัน', async () => {
    await page.getByTestId('ship-name').fill('ก');
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 3: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await check(page, 'ข้อ 3: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
});

test("TC-CHK-006 Boundary เบอร์โทร 9 / 10 / 11 หลัก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: error ที่ช่องเบอร์ (ข้อความของฟอร์ม: \"เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0\") · `POST /api/orders` = 0 · ข้อ 2: ถูกปฏิเสธแบบข้อ 1 หรือช่องรับได้แค่ 10 ตัว (`value.length` = 10) — ห้ามมีค่า 11 หลักถูกส่งใน body · ข้อ 3: HTTP 201 · URL `/orders/PP-\\d{6}`" },
    { type: 'source', description: "[R] · R101 · ความเสี่ยง: โทรหาผู้รับไม่ได้ · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  await test.step('1. ใส่ 9 หลัก 081234567 กดยืนยัน', async () => {
    await page.getByTestId('ship-phone').fill('081234567');
    await submitOrder(page, 2000);
  });
  await checkFieldError(page, 'ship-phone', 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0', 'ข้อ 1: error ที่ช่องเบอร์ "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0"');
  await check(page, 'ข้อ 1: POST /api/orders = 0', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let valueLen = -1;
  let r2 = { status: null as number | null };
  await test.step('2. ใส่ 11 หลัก 08123456789 (ดู value ของช่องก่อนกด) แล้วกดยืนยัน', async () => {
    await page.getByTestId('ship-phone').fill('08123456789');
    valueLen = (await page.getByTestId('ship-phone').inputValue()).length;
    r2 = await submitOrder(page, 2000);
  });
  await check(page, 'ข้อ 2: ถูกปฏิเสธแบบข้อ 1 หรือช่องรับได้แค่ 10 ตัว (value.length = 10)', page.getByTestId('ship-phone').locator('xpath=..'), async () => {
    const rejected = r2.status === null && (await page.getByText('เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0').count()) > 0;
    expect.soft(rejected || valueLen === 10, `ถูกปฏิเสธ=${rejected} · value.length=${valueLen}`).toBe(true);
  }, { actual: async () => `value.length ก่อนกด = ${valueLen} · POST status = ${r2.status}` });
  await check(page, 'ข้อ 2: ห้ามมีค่า 11 หลักถูกส่งใน body', null, async () => {
    expect.soft(t.bodies.filter((b) => b.includes('08123456789')).length).toBe(0);
  }, { actual: async () => t.bodies.join('\n') || '(ไม่มี POST)' });
  let r3 = { status: r2.status };
  await test.step('3. ใส่ 10 หลัก 0812345678 กดยืนยัน', async () => {
    if (/\/checkout$/.test(page.url())) {
      await page.getByTestId('ship-phone').fill('0812345678');
      r3 = await submitOrder(page);
    }
  });
  await checkApi('ข้อ 3: HTTP 201', { status: r3.status }, () => {
    expect.soft(r3.status).toBe(201);
  });
  await check(page, 'ข้อ 3: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
});

test("TC-CHK-007 เบอร์รูปแบบผิด (ไม่ขึ้นต้น 0, มีขีด, +66, เลขไทย) ถูกปฏิเสธ · มีช่องว่างหัวท้ายถูก trim", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ทั้ง 4 ค่ามี error ที่ช่องเบอร์ · `POST /api/orders` = 0 · ข้อ 2: HTTP 201 · ข้อ 3: เบอร์ที่เก็บ = `0812345678` (ไม่มีช่องว่าง)" },
    { type: 'source', description: "[R] · R101 · ความเสี่ยง: เก็บเบอร์ที่โทรไม่ได้ · เทคนิค: Equivalence partition, Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  for (const v of ['1812345678', '081-234-5678', '+66812345678', '๐๘๑๒๓๔๕๖๗๘']) {
    await test.step(`1. ใส่เบอร์ ${v} กดยืนยัน`, async () => {
      await page.getByTestId('ship-phone').fill(v);
      await submitOrder(page, 2000);
    });
    await checkFieldError(page, 'ship-phone', undefined, `ข้อ 1: เบอร์ ${v} มี error ที่ช่องเบอร์`);
  }
  await check(page, 'ข้อ 1: POST /api/orders = 0', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let r = { status: null as number | null, id: null as string | null };
  await test.step('2. ใส่ " 0812345678 " กดยืนยัน', async () => {
    await page.getByTestId('ship-phone').fill(' 0812345678 ');
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 2: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await test.step('3. GET /api/orders/<id> ของคำสั่งที่ได้', async () => {
    const id = r.id ?? orderIdFromUrl(page);
    const o = await getOrder(page.request, id);
    await checkApi('ข้อ 3: เบอร์ที่เก็บ = "0812345678" (ไม่มีช่องว่าง)', o.json, () => {
      expect.soft(o.order?.address?.phone).toBe('0812345678');
    });
  });
});

test("TC-CHK-008 Boundary รหัสไปรษณีย์ 4 / 5 / 6 หลัก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: error ที่ช่องรหัสไปรษณีย์ (ข้อความของฟอร์ม: \"รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก\") · `POST /api/orders` = 0 · ข้อ 2: ถูกปฏิเสธแบบข้อ 1 หรือช่องรับได้แค่ 5 ตัว (`value.length` = 5) — ห้ามมีค่า 6 หลักใน body · ข้อ 3: HTTP 201 · URL `/orders/PP-\\d{6}`" },
    { type: 'source', description: "[R] · R102 · ความเสี่ยง: ส่งพัสดุไม่ถึง · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · กรุงเทพมหานคร · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  await test.step('1. ใส่ 4 หลัก 1011 กดยืนยัน', async () => {
    await page.getByTestId('ship-postcode').fill('1011');
    await submitOrder(page, 2000);
  });
  await checkFieldError(page, 'ship-postcode', 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก', 'ข้อ 1: error ที่ช่องรหัสไปรษณีย์ "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"');
  await check(page, 'ข้อ 1: POST /api/orders = 0', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let valueLen = -1;
  let r2 = { status: null as number | null };
  await test.step('2. ใส่ 6 หลัก 101100 (ดู value ก่อนกด) แล้วกดยืนยัน', async () => {
    await page.getByTestId('ship-postcode').fill('101100');
    valueLen = (await page.getByTestId('ship-postcode').inputValue()).length;
    r2 = await submitOrder(page, 2000);
  });
  await check(page, 'ข้อ 2: ถูกปฏิเสธแบบข้อ 1 หรือช่องรับได้แค่ 5 ตัว (value.length = 5)', page.getByTestId('ship-postcode').locator('xpath=..'), async () => {
    const rejected = r2.status === null && (await page.getByText('รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก').count()) > 0;
    expect.soft(rejected || valueLen === 5, `ถูกปฏิเสธ=${rejected} · value.length=${valueLen}`).toBe(true);
  }, { actual: async () => `value.length ก่อนกด = ${valueLen} · POST status = ${r2.status}` });
  await check(page, 'ข้อ 2: ห้ามมีค่า 6 หลักใน body', null, async () => {
    expect.soft(t.bodies.filter((b) => b.includes('101100')).length).toBe(0);
  }, { actual: async () => t.bodies.join('\n') || '(ไม่มี POST)' });
  let r3 = { status: r2.status };
  await test.step('3. ใส่ 5 หลัก 10110 กดยืนยัน', async () => {
    if (/\/checkout$/.test(page.url())) {
      await page.getByTestId('ship-postcode').fill('10110');
      r3 = await submitOrder(page);
    }
  });
  await checkApi('ข้อ 3: HTTP 201', { status: r3.status }, () => {
    expect.soft(r3.status).toBe(201);
  });
  await check(page, 'ข้อ 3: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
});

test("TC-CHK-009 รหัสไปรษณีย์ที่ไม่ใช่เลขอารบิก 5 ตัวถูกปฏิเสธ · ช่องว่างท้ายถูก trim", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ทั้ง 4 ค่ามี error ที่ช่องรหัสไปรษณีย์ · `POST /api/orders` = 0 · ข้อ 2: HTTP 201 · ข้อ 3: รหัสที่เก็บ = `10110`" },
    { type: 'source', description: "[R] · R102 · ความเสี่ยง: ระบบขนส่งอ่านรหัสไม่ได้ · เทคนิค: Equivalence partition, Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · กรุงเทพมหานคร · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  for (const v of ['abcde', '10 110', '１０１１０', '๑๐๑๑๐']) {
    await test.step(`1. ใส่รหัสไปรษณีย์ ${v} กดยืนยัน`, async () => {
      await page.getByTestId('ship-postcode').fill(v);
      await submitOrder(page, 2000);
    });
    await checkFieldError(page, 'ship-postcode', undefined, `ข้อ 1: รหัส ${v} มี error ที่ช่องรหัสไปรษณีย์`);
  }
  await check(page, 'ข้อ 1: POST /api/orders = 0', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let r = { status: null as number | null, id: null as string | null };
  await test.step('2. ใส่ "10110 " กดยืนยัน', async () => {
    await page.getByTestId('ship-postcode').fill('10110 ');
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 2: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await test.step('3. GET /api/orders/<id>', async () => {
    const o = await getOrder(page.request, r.id ?? orderIdFromUrl(page));
    await checkApi('ข้อ 3: รหัสที่เก็บ = "10110"', o.json, () => {
      expect.soft(o.order?.address?.postcode).toBe('10110');
    });
  });
});

test("TC-CHK-010 Boundary ที่อยู่ 9 / 10 ตัวอักษรหลัง trim", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ทั้ง 3 ค่ามี error ที่ช่องที่อยู่ (ข้อความของฟอร์ม: \"กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)\") · `POST /api/orders` = 0 · ข้อ 2: HTTP 201 · URL `/orders/PP-\\d{6}` (กฎตรงกับที่ฟอร์มประกาศเองในข้อความ error)" },
    { type: 'source', description: "[R] · R103 · ความเสี่ยง: ที่อยู่สั้นเกินจนส่งไม่ได้ / ช่องว่างล้วนผ่าน · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
  });
  for (const [label, v] of [
    ['123456789 (9)', '123456789'],
    ['ช่องว่าง 10 ตัว', ' '.repeat(10)],
    ['" 123456789 " (หลัง trim 9)', ' 123456789 '],
  ] as const) {
    await test.step(`1. ใส่ที่อยู่ ${label} กดยืนยัน`, async () => {
      await page.getByTestId('ship-address').fill(v);
      await submitOrder(page, 2000);
    });
    await checkFieldError(page, 'ship-address', 'กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)', `ข้อ 1: ที่อยู่ ${label} มี error "กรุณากรอกที่อยู่ (อย่างน้อย 10 ตัวอักษร)"`);
  }
  await check(page, 'ข้อ 1: POST /api/orders = 0', null, async () => {
    expect.soft(t.posts).toBe(0);
  }, { actual: async () => `POST /api/orders = ${t.posts}` });
  let r = { status: null as number | null };
  await test.step('2. ใส่ 1234567890 กดยืนยัน', async () => {
    await page.getByTestId('ship-address').fill('1234567890');
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 2: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await check(page, 'ข้อ 2: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
});

test("TC-CHK-011 dropdown จังหวัดต้องมีครบ 77 จังหวัด และสั่งไปจังหวัดนอก 10 จังหวัดเดิมได้", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: 77 ตัวเลือก ไม่มีชื่อซ้ำ · ค่าเริ่มต้น \"กรุงเทพมหานคร\" · ข้อ 2: พบครบ 3 ชื่อ · ข้อ 3: HTTP 201 · ข้อ 4: หน้ายืนยันมีข้อความ \"บึงกาฬ\" และ \"38000\" (ตอนนี้ล้ม: มีแค่ 10 จังหวัด ไม่มีบึงกาฬ)" },
    { type: 'source', description: "[R] · R104 · Q27 · ความเสี่ยง: ลูกค้า 67 จังหวัดสั่งซื้อไม่ได้ · เทคนิค: Equivalence partition, Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · อยู่ที่ /checkout', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
  });
  const select = page.getByTestId('ship-province');
  const options = async () =>
    select.locator('option').evaluateAll((os) => os.map((o) => ({ v: (o as HTMLOptionElement).value, t: (o.textContent ?? '').trim() })).filter((o) => o.v !== ''));
  await test.step('1. นับ option ใน select จังหวัด (ไม่นับตัวเลือกคำแนะนำว่าง)', async () => {});
  await check(page, 'ข้อ 1: 77 ตัวเลือก ไม่มีชื่อซ้ำ', select, async () => {
    const os = await options();
    expect.soft(os.length, 'จำนวนจังหวัด').toBe(77);
    expect.soft(new Set(os.map((o) => o.t)).size, 'ชื่อไม่ซ้ำ').toBe(os.length);
  }, { actual: async () => (await options()).map((o) => o.t).join(', ') });
  await check(page, 'ข้อ 1: ค่าเริ่มต้น "กรุงเทพมหานคร"', select, async (el) => {
    await expect.soft(el).toHaveValue('กรุงเทพมหานคร');
  });
  await test.step('2. หา "แม่ฮ่องสอน" "นราธิวาส" "บึงกาฬ"', async () => {});
  await check(page, 'ข้อ 2: พบครบ 3 ชื่อ แม่ฮ่องสอน · นราธิวาส · บึงกาฬ', select, async () => {
    const names = (await options()).map((o) => o.t);
    for (const n of ['แม่ฮ่องสอน', 'นราธิวาส', 'บึงกาฬ']) expect.soft(names, `มี ${n}`).toContain(n);
  }, { actual: async () => (await options()).map((o) => o.t).join(', ') });
  let r = { status: null as number | null };
  await test.step('3. เลือก บึงกาฬ + 38000 กดยืนยัน', async () => {
    const hasBk = (await options()).some((o) => o.t === 'บึงกาฬ');
    await fillAddress(page, { postcode: '38000' });
    if (hasBk) {
      await select.selectOption({ label: 'บึงกาฬ' });
      r = await submitOrder(page);
    }
  });
  await checkApi('ข้อ 3: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status, 'เลือกบึงกาฬแล้วสั่งซื้อ (ถ้าไม่มีตัวเลือกบึงกาฬ จะไม่มี POST)').toBe(201);
  });
  await test.step('4. ดูหน้ายืนยัน', async () => {});
  await check(page, 'ข้อ 4: หน้ายืนยันมีข้อความ "บึงกาฬ" และ "38000"', page.locator('main'), async (el) => {
    await expect.soft(page).toHaveURL(ORDER_URL);
    await expect.soft(el).toContainText('บึงกาฬ');
    await expect.soft(el).toContainText('38000');
  });
});

test("TC-CHK-012 รหัสไปรษณีย์ต้องตรงกับจังหวัด (หน้าเว็บ)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: error ที่ช่องรหัสไปรษณีย์หรือจังหวัด · ไม่มี `POST /api/orders` ที่ได้ 201 · URL ยังเป็น `/checkout` · ข้อ 2: HTTP 201 · ข้อ 3: มีข้อความ \"เชียงใหม่\" และ \"50200\" (ตอนนี้ล้ม: (ก) สั่งผ่าน หน้ายืนยันโชว์ \"ไปที่ กรุงเทพมหานคร 50200\")" },
    { type: 'source', description: "[R] · R106 · Q27 · ความเสี่ยง: ส่งของผิดจังหวัด · เทคนิค: Negative, Equivalence partition" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ช่องอื่นกรอกค่าถูก', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
  });
  let r1 = { status: null as number | null };
  await test.step('1. เลือกกรุงเทพมหานคร ใส่ 50200 กดยืนยัน', async () => {
    await fillAddress(page, { province: 'กรุงเทพมหานคร', postcode: '50200' });
    r1 = await submitOrder(page, 3000);
  });
  await check(page, 'ข้อ 1: error ที่ช่องรหัสไปรษณีย์หรือจังหวัด', page.locator('[data-testid="ship-postcode"], [data-testid="ship-province"]').locator('xpath=..'), async () => {
    const hasErr = async (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        return (
          ids.some((i) => (document.getElementById(i)?.textContent ?? '').trim() !== '') ||
          [...(el.parentElement?.children ?? [])].some((c) => c !== el && c.tagName !== 'LABEL' && (c.textContent ?? '').trim() !== '')
        );
      }).catch(() => false);
    const pc = await hasErr('ship-postcode');
    const pv = await hasErr('ship-province');
    expect.soft(pc || pv, `error ที่รหัสไปรษณีย์=${pc} · จังหวัด=${pv}`).toBe(true);
  }, { actual: async () => `URL=${page.url()} · POST status=${r1.status}` });
  await check(page, 'ข้อ 1: ไม่มี POST /api/orders ที่ได้ 201', null, async () => {
    expect.soft(r1.status).not.toBe(201);
  }, { actual: async () => `status ข้อ 1 = ${r1.status}` });
  await check(page, 'ข้อ 1: URL ยังเป็น /checkout', null, async () => {
    await expect.soft(page).toHaveURL(/\/checkout$/);
  });
  let r2 = { status: null as number | null };
  await test.step('2. เปลี่ยนเป็นเชียงใหม่ กดยืนยัน', async () => {
    if (!/\/checkout$/.test(page.url())) {
      // ข้อ 1 สั่งผ่านไปแล้ว (defect) — ตั้งตะกร้าใหม่เพื่อทำข้อ 2 ต่อได้
      await seedCart(page, [KITTEN(1)]);
      await gotoCheckout(page);
      await fillAddress(page, { province: 'กรุงเทพมหานคร', postcode: '50200' });
    }
    await page.getByTestId('ship-province').selectOption({ label: 'เชียงใหม่' });
    r2 = await submitOrder(page);
  });
  await checkApi('ข้อ 2: HTTP 201', { status: r2.status, all: t.statuses }, () => {
    expect.soft(r2.status).toBe(201);
  });
  await test.step('3. ดูหน้ายืนยัน', async () => {});
  await check(page, 'ข้อ 3: มีข้อความ "เชียงใหม่" และ "50200"', page.locator('main'), async (el) => {
    await expect.soft(page).toHaveURL(ORDER_URL);
    await expect.soft(el).toContainText('เชียงใหม่');
    await expect.soft(el).toContainText('50200');
  });
});

test("TC-CHK-013 ข้อความยาวมากต้องมีเพดาน และหน้าไม่แตก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ทั้งสองช่องมี `maxlength` เป็นตัวเลข > 0 · ข้อ 2: `/checkout` มี `scrollWidth` ≤ 1280 · ข้อ 3: `/orders/<id>` `scrollWidth` ≤ 1280 (ข้อความตัดบรรทัด) · ข้อ 4: HTTP 400 ไม่สร้างคำสั่ง (จำนวนคำสั่งใน `/account` ไม่เพิ่ม) (ตอนนี้ล้ม: ไม่มี maxlength ทั้งฟอร์มและ server · หน้ายืนยัน scrollWidth 2035 > 1280)" },
    { type: 'source', description: "[R] · R107 · ความเสี่ยง: หน้าคำสั่งซื้อแตก / ฐานข้อมูลรับข้อความไม่จำกัด · เทคนิค: Boundary, Negative" },
  ],
}, async ({ page }) => {
  const longName = 'ก'.repeat(220);
  const longAddr = '99/1 ' + 'ก'.repeat(1005);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · จอ 1280×800', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
  });
  const nameMax = await page.getByTestId('ship-name').getAttribute('maxlength');
  await test.step('1. ดู attribute maxlength ของช่องชื่อและที่อยู่', async () => {});
  await check(page, 'ข้อ 1: ช่องชื่อและที่อยู่มี maxlength เป็นตัวเลข > 0', page.locator('[data-testid="ship-name"], [data-testid="ship-address"]'), async () => {
    for (const id of ['ship-name', 'ship-address']) {
      const v = await page.getByTestId(id).getAttribute('maxlength');
      expect.soft(Number(v) > 0 && /^\d+$/.test(v ?? ''), `${id} maxlength=${v}`).toBe(true);
    }
  }, { actual: async () => `ship-name maxlength=${await page.getByTestId('ship-name').getAttribute('maxlength')} · ship-address maxlength=${await page.getByTestId('ship-address').getAttribute('maxlength')}` });
  let r = { status: null as number | null, id: null as string | null };
  let checkoutSW = -1;
  await test.step('2. วางข้อความยาวลงทั้งสองช่อง กดยืนยัน', async () => {
    await fillAddress(page, { name: longName, address: longAddr });
    checkoutSW = await page.evaluate(() => document.documentElement.scrollWidth);
    r = await submitOrder(page, 5000);
    if (/\/checkout$/.test(page.url())) checkoutSW = Math.max(checkoutSW, await page.evaluate(() => document.documentElement.scrollWidth));
  });
  await check(page, 'ข้อ 2: /checkout มี scrollWidth ≤ 1280', null, async () => {
    expect.soft(checkoutSW).toBeLessThanOrEqual(1280);
  }, { actual: async () => `scrollWidth /checkout = ${checkoutSW}` });
  await test.step('3. ถ้าได้คำสั่ง เปิด /orders/<id> วัด scrollWidth', async () => {
    if (r.status === 201) {
      const id = r.id ?? orderIdFromUrl(page);
      await page.goto(`/orders/${id}`);
      await page.getByTestId('order-id').waitFor();
      await check(page, 'ข้อ 3: /orders/<id> scrollWidth ≤ 1280 (ข้อความตัดบรรทัด)', null, async () => {
        expect.soft(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
      }, { actual: async () => `scrollWidth /orders/${id} = ${await page.evaluate(() => document.documentElement.scrollWidth)}` });
    }
  });
  const before = await accountStats(page);
  const overName = 'ก'.repeat(Number(nameMax) > 0 ? Number(nameMax) + 1 : 220);
  let r4 = { status: 0, text: '' };
  await test.step(`4. ยิง POST /api/orders ด้วย body แม่แบบ ที่ชื่อยาวเกิน maxlength 1 ตัว (${overName.length} ตัว)`, async () => {
    r4 = await apiOrder(page.request, orderBody({ address: { name: overName } }));
  });
  await checkApi('ข้อ 4: HTTP 400 ไม่สร้างคำสั่ง', { status: r4.status, body: r4.text }, () => {
    expect.soft(r4.status).toBe(400);
    expect.soft(r4.text).not.toMatch(HAS_ORDER_NO);
  });
  const after = await accountStats(page);
  await check(page, 'ข้อ 4: จำนวนคำสั่งใน /account ไม่เพิ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อนข้อ 4 = ${before.count} · หลัง = ${after.count}` });
});

test("TC-CHK-014 XSS: HTML/สคริปต์ในชื่อและที่อยู่ต้องแสดงเป็นข้อความ (กรอกผ่านหน้าเว็บ)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 201 · ข้อ 1–3: dialog = 0 ครั้ง · ไม่มี element `<b>` ที่มีข้อความ \"ทดสอบ\" และไม่มี `<script>` ที่มาจากข้อมูลผู้รับใน DOM · ถ้าหน้าแสดงชื่อ/ที่อยู่ ต้องเห็นเป็นข้อความตรงตัว เช่น `<script>alert(1)</script> O'Neil 😺` · ถ้ายังไม่แสดง (R124) ให้ข้ามเกณฑ์นี้ — การไม่แสดงนับล้มที่ TC-CONF-002 เท่านั้น · ข้อ 4: ชื่อและที่อยู่ที่เก็บตรงกับที่กรอกทุกตัวอักษร" },
    { type: 'source', description: "[R] · R108 · R124 · Q27 · ความเสี่ยง: Stored XSS บนหน้าคำสั่งซื้อ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const name = 'สมใจ Somjai <b>ทดสอบ</b> & "Q"';
  const addr = "<script>alert(1)</script> O'Neil 😺 ถนนสุขุมวิท";
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    d.dismiss().catch(() => {});
  });
  const injected = () =>
    page.evaluate(() => ({
      b: [...document.querySelectorAll('b')].filter((e) => (e.textContent ?? '').includes('ทดสอบ')).length,
      script: [...document.scripts].filter((s) => (s.textContent ?? '').trim() === 'alert(1)').length,
    }));
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1 · ตั้ง page.on("dialog") นับ dialog', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
  });
  let r = { status: null as number | null, id: null as string | null };
  await test.step('1. กรอกชื่อ/ที่อยู่ที่มี HTML แล้วกดยืนยัน', async () => {
    await fillAddress(page, { name, address: addr });
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 1: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  const id = r.id ?? orderIdFromUrl(page);
  await test.step('2. เปิด /orders/<id> reload 1 ครั้ง', async () => {
    await page.goto(`/orders/${id}`);
    await page.reload();
    await page.getByTestId('order-id').waitFor().catch(() => {});
  });
  await check(page, 'ข้อ 2 (/orders/<id>): dialog = 0 · ไม่มี <b> "ทดสอบ" และ <script> จากข้อมูลผู้รับ', page.locator('main'), async () => {
    const x = await injected();
    expect.soft(dialogs, 'dialog').toBe(0);
    expect.soft(x.b, '<b> ที่มีข้อความ "ทดสอบ"').toBe(0);
    expect.soft(x.script, '<script> ที่มาจากข้อมูลผู้รับ').toBe(0);
  }, { actual: async () => JSON.stringify({ dialogs, ...(await injected()) }) });
  await check(page, 'ข้อ 2: ถ้าหน้าแสดงชื่อ/ที่อยู่ ต้องเห็นเป็นข้อความตรงตัว', page.locator('main'), async (el) => {
    const text = await el.innerText();
    if (text.includes('Somjai')) expect.soft(text, 'ชื่อแสดงตรงตัว').toContain(name);
    if (text.includes("O'Neil")) expect.soft(text, 'ที่อยู่แสดงตรงตัว').toContain("<script>alert(1)</script> O'Neil 😺");
  });
  await test.step('3. เปิด /account', async () => {
    await page.goto('/account');
    await page.getByTestId('profile-card').waitFor();
  });
  await check(page, 'ข้อ 3 (/account): dialog = 0 · ไม่มี <b> "ทดสอบ" และ <script> จากข้อมูลผู้รับ', page.locator('main'), async () => {
    const x = await injected();
    expect.soft(dialogs, 'dialog').toBe(0);
    expect.soft(x.b).toBe(0);
    expect.soft(x.script).toBe(0);
  }, { actual: async () => JSON.stringify({ dialogs, ...(await injected()) }) });
  await test.step('4. GET /api/orders/<id>', async () => {
    const o = await getOrder(page.request, id);
    await checkApi('ข้อ 4: ชื่อและที่อยู่ที่เก็บตรงกับที่กรอกทุกตัวอักษร', o.json, () => {
      expect.soft(o.order?.address?.name).toBe(name);
      expect.soft(o.order?.address?.address).toBe(addr);
    });
  });
});

test("TC-CHK-015 XSS: payload ที่ยิงผ่าน API (ข้ามหน้าเว็บ) ต้องไม่ทำงานบนหน้ายืนยันและหน้าบัญชี", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 201 (หรือ 400 ถ้า server ปฏิเสธอักขระ — ถือว่าผ่าน) · ข้อ 2–3: dialog = 0 ครั้ง · `document.querySelectorAll('img[onerror], svg[onload]').length` = 0 · ถ้าแสดงชื่อ เห็นเป็นข้อความ `<img src=x onerror=alert(1)>`" },
    { type: 'source', description: "[R] · R108 · R109 · ความเสี่ยง: Stored XSS ที่หลบการตรวจหน้าเว็บ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const xName = '<img src=x onerror=alert(1)>';
  const xAddr = '"><svg onload=alert(2)>99/1 ถนนสุขุมวิท';
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    d.dismiss().catch(() => {});
  });
  const bad = () => page.evaluate(() => document.querySelectorAll('img[onerror], svg[onload]').length);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo (cookie pp_session ใน page.request) · ตั้ง page.on("dialog")', async () => {
    await login(page.request);
  });
  let r = { status: 0, text: '', id: null as string | null };
  await test.step('1. POST /api/orders ด้วย body แม่แบบที่ชื่อ/ที่อยู่เป็น payload', async () => {
    r = await apiOrder(page.request, orderBody({ address: { name: xName, address: xAddr } }));
  });
  await checkApi('ข้อ 1: HTTP 201 (หรือ 400 ถ้า server ปฏิเสธอักขระ — ถือว่าผ่าน)', { status: r.status, body: r.text }, () => {
    expect.soft([201, 400]).toContain(r.status);
  });
  await test.step('2. เปิด /orders/<id> ที่ได้', async () => {
    if (r.status === 201 && r.id) {
      await page.goto(`/orders/${r.id}`);
      await page.getByTestId('order-id').waitFor().catch(() => {});
      await check(page, 'ข้อ 2 (/orders/<id>): dialog = 0 · img[onerror], svg[onload] = 0', page.locator('main'), async () => {
        expect.soft(dialogs, 'dialog').toBe(0);
        expect.soft(await bad(), "querySelectorAll('img[onerror], svg[onload]').length").toBe(0);
      }, { actual: async () => `dialog=${dialogs} · img[onerror]/svg[onload]=${await bad()}` });
      await check(page, 'ข้อ 2: ถ้าแสดงชื่อ เห็นเป็นข้อความ <img src=x onerror=alert(1)>', page.locator('main'), async (el) => {
        const text = await el.innerText();
        if (text.includes('onerror')) expect.soft(text).toContain(xName);
      });
    }
  });
  await test.step('3. เปิด /account', async () => {
    await page.goto('/account');
    await page.getByTestId('profile-card').waitFor();
  });
  await check(page, 'ข้อ 3 (/account): dialog = 0 · img[onerror], svg[onload] = 0', page.locator('main'), async () => {
    expect.soft(dialogs, 'dialog').toBe(0);
    expect.soft(await bad()).toBe(0);
  }, { actual: async () => `dialog=${dialogs} · img[onerror]/svg[onload]=${await bad()}` });
});

test("TC-CHK-016 server ต้องตรวจชื่อ/เบอร์/รหัสไปรษณีย์/ที่อยู่ซ้ำ (ยิง API ข้ามหน้าเว็บ)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทั้ง 6 ครั้ง HTTP 400 · ไม่มีเลขคำสั่งใน response · จำนวนคำสั่งใน `/account` ไม่เพิ่ม · สต็อกลูกแมว สูตรแซลมอน ยัง 25" },
    { type: 'source', description: "[R] · R109 · ความเสี่ยง: ยิง API สร้างคำสั่งที่ไม่มีที่อยู่ส่งได้ · เทคนิค: Security, Negative" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · จดจำนวนคำสั่งใน /account และสต็อกลูกแมว สูตรแซลมอน', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const results: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง POST /api/orders 6 ครั้ง ครั้งละ 1 ค่า', async () => {
    const cases: [string, Partial<Addr>][] = [
      ['ชื่อ ""', { name: '' }],
      ['ชื่อ "   "', { name: '   ' }],
      ['เบอร์ "12"', { phone: '12' }],
      ['เบอร์ 081234567', { phone: '081234567' }],
      ['รหัส 1011', { postcode: '1011' }],
      ['ที่อยู่ 123456789', { address: '123456789' }],
    ];
    for (const [label, a] of cases) {
      const x = await apiOrder(page.request, orderBody({ address: a }));
      results.push({ label, status: x.status, text: x.text });
    }
  });
  await test.step('2. ดู status และ body', async () => {});
  for (const x of results) {
    await checkApi(`${x.label}: HTTP 400 · ไม่มีเลขคำสั่งใน response`, x, () => {
      expect.soft(x.status).toBe(400);
      expect.soft(x.text).not.toMatch(HAS_ORDER_NO);
    });
  }
  await test.step('3. ดู /account และ GET /api/products', async () => {});
  const after = await accountStats(page);
  await check(page, 'จำนวนคำสั่งใน /account ไม่เพิ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
  const st = await stocks(page.request);
  await checkApi('สต็อกลูกแมว สูตรแซลมอน ยัง 25', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
    expect.soft(st['kitten-salmon-dry']).toBe(25);
  });
});

test("TC-CHK-017 server ต้องปฏิเสธรหัสไปรษณีย์ที่ไม่ตรงจังหวัด (API)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทั้ง 2 ครั้ง HTTP 400 · จำนวนคำสั่งใน `/account` ไม่เพิ่ม (ตอนนี้ล้ม: สั่งผ่านเหมือน PP-100002)" },
    { type: 'source', description: "[R] · R106 · R109 · Q27 · ความเสี่ยง: ที่อยู่ส่งผิดจังหวัดผ่าน API · เทคนิค: Security, Negative" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo (ยิงด้วย page.request)', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const res: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง POST /api/orders 2 ครั้ง (กรุงเทพมหานคร + 50200 · เชียงใหม่ + 10110)', async () => {
    for (const [label, a] of [
      ['กรุงเทพมหานคร + 50200', { province: 'กรุงเทพมหานคร', postcode: '50200' }],
      ['เชียงใหม่ + 10110', { province: 'เชียงใหม่', postcode: '10110' }],
    ] as const) {
      const x = await apiOrder(page.request, orderBody({ address: a }));
      res.push({ label, status: x.status, text: x.text });
    }
  });
  await test.step('2. ดู status', async () => {});
  for (const x of res) {
    await checkApi(`${x.label}: HTTP 400`, x, () => {
      expect.soft(x.status).toBe(400);
    });
  }
  await test.step('3. ดูจำนวนคำสั่งใน /account', async () => {});
  const after = await accountStats(page);
  await check(page, 'จำนวนคำสั่งใน /account ไม่เพิ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-CHK-018 PromptPay: ยอดใน QR ตรงกับยอดชำระทุกครั้งที่เปลี่ยนวิธีส่ง · ยืนยันแล้วได้สถานะ \"รับคำสั่งซื้อ\" และตัดสต็อกทันที", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ยอดใน QR \"฿520\" (฿520 − NEWCAT50 ฿50 + ส่ง ฿50 = ฿520) · ข้อ 2: ยอดใน QR และปุ่ม \"฿590\" (฿520 − NEWCAT50 ฿50 + ด่วน ฿120 = ฿590) · ข้อ 3: HTTP 201 URL `/orders/PP-\\d{6}` · ข้อ 4: สถานะ \"รับคำสั่งซื้อ\" ยอดชำระ ฿590 · ข้อ 5: สต็อก 2 (3 − 1)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R110 · Q29 · ความเสี่ยง: ยอดที่ให้สแกนไม่ตรงยอดคำสั่ง · เทคนิค: Happy path, State" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน 1.5 kg ×1 + คูปอง NEWCAT50 · สต็อก 3', async () => {
    await login(page.request);
    await seedCart(page, [HAIRBALL(1)], 'NEWCAT50');
  });
  const qr = page.getByTestId('promptpay-qr');
  await test.step('1. ใน /checkout เลือก PromptPay + ส่งธรรมดา ดูยอดในกล่อง QR', async () => {
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'standard', 'promptpay');
  });
  await check(page, 'ข้อ 1: ยอดใน QR "฿520" (฿520 − NEWCAT50 ฿50 + ส่ง ฿50)', qr, async (el) => {
    await expect.soft(el).toContainText(/฿520(?!\d)/);
  });
  await test.step('2. เปลี่ยนเป็นส่งด่วน ดูยอดในกล่อง QR และบนปุ่ม', async () => {
    await setMethods(page, 'express');
  });
  await check(page, 'ข้อ 2: ยอดใน QR "฿590"', qr, async (el) => {
    await expect.soft(el).toContainText(/฿590(?!\d)/);
  });
  await check(page, 'ข้อ 2: ปุ่ม "฿590" (฿520 − ฿50 + ด่วน ฿120)', page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿590');
  });
  let r = { status: null as number | null };
  await test.step('3. กดยืนยัน', async () => {
    r = await submitOrder(page);
  });
  await checkApi('ข้อ 3: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await check(page, 'ข้อ 3: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
  await test.step('4. ดูสถานะบนหน้ายืนยัน', async () => {});
  await check(page, 'ข้อ 4: สถานะ "รับคำสั่งซื้อ"', page.getByTestId('order-timeline').locator('[aria-current="step"]'), async (el) => {
    await expect.soft(el).toContainText('รับคำสั่งซื้อ');
  });
  await check(page, 'ข้อ 4: ยอดชำระ ฿590', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText('฿590');
  });
  await test.step('5. GET /api/products ดูสต็อกสูตรลดก้อนขน', async () => {
    const st = await stocks(page.request);
    await checkApi('ข้อ 5: สต็อก 2 (3 − 1)', { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
      expect.soft(st['hairball-control-dry']).toBe(2);
    });
  });
});

test("TC-ORD-001 สั่งซื้อสำเร็จแล้วสต็อกลดตามจำนวน และตะกร้าถูกล้าง", {
  tag: ["@P1", "@5.5", "@mobile-too"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ปุ่ม \"ยืนยันสั่งซื้อ ฿617\" (฿189×3 + ส่ง ฿50 = ฿617) · ข้อ 2: HTTP 201 · URL `/orders/PP-\\d{6}` · ข้อ 3: `pp-cart` ว่าง (ไม่มีรายการ) ตัวนับ 🛒 = 0 · ข้อ 4: สต็อก 22 (25 − 3)" },
    { type: 'source', description: "[D]+[R] · R112 · ความเสี่ยง: ขายแล้วสต็อกไม่ลด → ขายเกินของจริง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว สูตรแซลมอน 400 g ×3 · ไม่มีคูปอง · สต็อกเริ่ม 25', async () => {
    await login(page.request);
    await seedCart(page, [KITTEN(3)]);
  });
  await test.step('1. /checkout กรอกที่อยู่', async () => {
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
  });
  await check(page, 'ข้อ 1: ปุ่ม "ยืนยันสั่งซื้อ ฿617" (฿189×3 + ส่ง ฿50)', page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿617');
  });
  let r = { status: null as number | null };
  await test.step('1. กดยืนยัน', async () => {
    r = await submitOrder(page);
  });
  await test.step('2. ดู status ของ POST /api/orders และ URL', async () => {});
  await checkApi('ข้อ 2: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await check(page, 'ข้อ 2: URL /orders/PP-\\d{6}', null, async () => {
    await expect.soft(page).toHaveURL(ORDER_URL);
  });
  await test.step('3. ดู pp-cart และตัวนับ 🛒', async () => {});
  const cartItems = () =>
    page.evaluate(() => {
      const v = localStorage.getItem('pp-cart');
      try {
        const a = JSON.parse(v ?? '[]');
        return Array.isArray(a) ? a.length : -1;
      } catch {
        return -1;
      }
    });
  await check(page, 'ข้อ 3: pp-cart ว่าง (ไม่มีรายการ)', null, async () => {
    expect.soft(await cartItems()).toBe(0);
  }, { actual: () => page.evaluate(() => localStorage.getItem('pp-cart')) });
  await check(page, 'ข้อ 3: ตัวนับ 🛒 = 0', page.getByTestId('cart-count'), async (el) => {
    await expect.soft(el).toHaveText('0');
  });
  await test.step('4. GET /api/products ดูสต็อก kitten-salmon-dry', async () => {
    const st = await stocks(page.request);
    await checkApi('ข้อ 4: สต็อก 22 (25 − 3)', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
      expect.soft(st['kitten-salmon-dry']).toBe(22);
    });
  });
});

test("TC-ORD-002 ยอดเงินตรงกันทุกจุด: checkout = หน้ายืนยัน = `/account` = API", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ยอดสินค้า ฿520 · ส่วนลด −฿50 · ค่าส่ง ฿120 · ยอดชำระ ฿590 · ปุ่ม \"ยืนยันสั่งซื้อ ฿590\" (฿520 − NEWCAT50 ฿50 + ด่วน ฿120 = ฿590) · ข้อ 2: 4 บรรทัดเดียวกัน ฿520 / −฿50 / ฿120 / ฿590 · ข้อ 3: ยอดสุทธิ ฿590 · ข้อ 4: ยอดรวม 590 ส่วนลด 50 ค่าส่ง 120" },
    { type: 'source', description: "[D]+[R] · R111 · R122 · ความเสี่ยง: ลูกค้าถูกเก็บเงินไม่ตรงกับที่เห็น · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน 1.5 kg ×1 + NEWCAT50', async () => {
    await login(page.request);
    await seedCart(page, [HAIRBALL(1)], 'NEWCAT50');
  });
  await test.step('1. /checkout เลือกส่งด่วน ดูสรุปยอดและปุ่ม', async () => {
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'express', 'cod');
  });
  const summary = async (where: string) => {
    await check(page, `${where}: ยอดสินค้า ฿520`, page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText('฿520');
    });
    await check(page, `${where}: ส่วนลด −฿50`, page.getByTestId('summary-discount'), async (el) => {
      await expect.soft(el).toHaveText(minus(50));
    });
    await check(page, `${where}: ค่าส่ง ฿120`, page.getByTestId('summary-shipping'), async (el) => {
      await expect.soft(el).toHaveText('฿120');
    });
    await check(page, `${where}: ยอดชำระ ฿590`, page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText('฿590');
    });
  };
  await summary('ข้อ 1 (/checkout)');
  await check(page, 'ข้อ 1: ปุ่ม "ยืนยันสั่งซื้อ ฿590" (฿520 − NEWCAT50 ฿50 + ด่วน ฿120)', page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿590');
  });
  let r = { status: null as number | null, id: null as string | null };
  await test.step('1. กดยืนยัน', async () => {
    r = await submitOrder(page);
    if (r.status !== 201) throw new Error(`สั่งซื้อไม่สำเร็จ HTTP ${r.status}`);
  });
  const id = orderIdFromUrl(page);
  await test.step('2. ดูสรุปยอดบน /orders/<id>', async () => {
    await page.getByTestId('order-id').waitFor();
  });
  await summary('ข้อ 2 (/orders/<id>)');
  await test.step('3. ดูแถวคำสั่งนี้ใน /account', async () => {
    await page.goto('/account');
  });
  await check(page, 'ข้อ 3: แถวคำสั่งนี้ยอดสุทธิ ฿590', orderRow(page, id), async (el) => {
    await expect.soft(el).toHaveCount(1);
    await expect.soft(el).toContainText('฿590');
  });
  await test.step('4. GET /api/orders/<id>', async () => {
    const o = await getOrder(page.request, id);
    await checkApi('ข้อ 4: ยอดรวม 590 ส่วนลด 50 ค่าส่ง 120', o.json, () => {
      expect.soft(o.order?.total).toBe(590);
      expect.soft(o.order?.discount).toBe(50);
      expect.soft(o.order?.shipping).toBe(120);
    });
  });
});

test("TC-ORD-003 สั่งสูตรลดก้อนขนเท่าสต็อกพอดี (3) ได้ สต็อกเหลือ 0 ไม่ติดลบ", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ปุ่ม \"ยืนยันสั่งซื้อ ฿1,560\" (฿520×3 = ฿1,560 ≥ ฿999 จึงส่งฟรี ฿0) · ข้อ 2: HTTP 201 · ข้อ 3: สต็อก 0 (3 − 3)" },
    { type: 'source', description: "[D]+[R] · R112 · ความเสี่ยง: ชิ้นสุดท้ายขายไม่ได้ / สต็อกติดลบ · เทคนิค: Boundary, Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน 1.5 kg ×3 · สต็อกเริ่ม 3', async () => {
    await login(page.request);
    await seedCart(page, [HAIRBALL(3)]);
  });
  await test.step('1. /checkout กรอกที่อยู่ ส่งธรรมดา เก็บเงินปลายทาง', async () => {
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
  });
  await check(page, 'ข้อ 1: ปุ่ม "ยืนยันสั่งซื้อ ฿1,560" (฿520×3 ≥ ฿999 ส่งฟรี)', page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText('ยืนยันสั่งซื้อ ฿1,560');
  });
  let r = { status: null as number | null };
  await test.step('1. กดยืนยัน', async () => {
    r = await submitOrder(page);
  });
  await test.step('2. ดู status', async () => {});
  await checkApi('ข้อ 2: HTTP 201', { status: r.status }, () => {
    expect.soft(r.status).toBe(201);
  });
  await test.step('3. GET /api/products ดูสต็อกสูตรลดก้อนขน', async () => {
    const st = await stocks(page.request);
    await checkApi('ข้อ 3: สต็อก 0 (3 − 3)', { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
      expect.soft(st['hairball-control-dry']).toBe(0);
    });
  });
});

test("TC-ORD-004 ยิง API สั่งสูตรลดก้อนขน 4 ชิ้น (เกินสต็อก 3) ข้ามหน้าเว็บ ต้องได้ 409 ไม่สร้างคำสั่ง ไม่ตัดสต็อก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 409 · ไม่มีเลขคำสั่งใน response · ข้อ 2: สต็อกสูตรลดก้อนขน 3 · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม" },
    { type: 'source', description: "[D]+[R] · R117 · R53 · ฝั่ง UI (แก้ `pp-cart`) ดู TC-CART-013/015 · ความเสี่ยง: ขายเกินสต็อกโดยยิง API ข้ามหน้าเว็บ · เทคนิค: Boundary, Negative, Security" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · สต็อกสูตรลดก้อนขน 3 · จดจำนวนคำสั่งใน /account', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  let r = { status: 0, text: '' };
  await test.step('1. ยิง POST /api/orders items = สูตรลดก้อนขน 1.5 kg qty 4', async () => {
    r = await apiOrder(page.request, orderBody({ items: [HAIRBALL(4)] }));
  });
  await checkApi('ข้อ 1: HTTP 409 · ไม่มีเลขคำสั่งใน response', { status: r.status, body: r.text }, () => {
    expect.soft(r.status).toBe(409);
    expect.soft(r.text).not.toMatch(HAS_ORDER_NO);
  });
  await test.step('2. GET /api/products และ /account', async () => {});
  const st = await stocks(page.request);
  await checkApi('ข้อ 2: สต็อกสูตรลดก้อนขน 3', { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
    expect.soft(st['hairball-control-dry']).toBe(3);
  });
  const after = await accountStats(page);
  await check(page, 'ข้อ 2: จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-ORD-005 ยิง API สั่งสินค้าหมด ไก่ฟรีซดราย (0) ต้องได้ 409 และคำสั่งที่ปนของหมดถูกปฏิเสธทั้งคำสั่ง", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 409 · ไม่มีเลขคำสั่งใน response · ข้อ 2: HTTP 409 ทั้งคำสั่ง (ไม่ตัดเฉพาะชิ้นที่หมด ขนมแมวเลียก็ไม่ถูกสั่ง) · ไม่มีเลขคำสั่งใน response · ข้อ 3: สต็อกไก่ฟรีซดราย 0 (ไม่ใช่ −1) · ขนมแมวเลีย 80 · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R117 · R53 · Q9 (ปฏิเสธทั้งคำสั่ง ไม่ตัดเฉพาะชิ้นที่หมด) · ฝั่ง UI (แก้ `pp-cart`) ดู TC-CART-013/015 · ความเสี่ยง: ขายของที่ไม่มีจริง · เทคนิค: Negative, Security" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · สต็อกไก่ฟรีซดราย 0 · ขนมแมวเลีย 80 · จดจำนวนคำสั่งใน /account', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  let a = { status: 0, text: '' };
  let b = { status: 0, text: '' };
  await test.step('1. ยิง (ก) freeze-dried-chicken-cat 50 g qty 1', async () => {
    a = await apiOrder(page.request, orderBody({ items: [FD_CHICKEN(1)] }));
  });
  await checkApi('ข้อ 1: HTTP 409 · ไม่มีเลขคำสั่งใน response', { status: a.status, body: a.text }, () => {
    expect.soft(a.status).toBe(409);
    expect.soft(a.text).not.toMatch(HAS_ORDER_NO);
  });
  await test.step('2. ยิง (ข) freeze-dried-chicken-cat 50 g qty 1 + lickable-salmon-treat 4 ซอง qty 1', async () => {
    b = await apiOrder(page.request, orderBody({ items: [FD_CHICKEN(1), LICKABLE(1)] }));
  });
  await checkApi('ข้อ 2: HTTP 409 ทั้งคำสั่ง · ไม่มีเลขคำสั่งใน response', { status: b.status, body: b.text }, () => {
    expect.soft(b.status).toBe(409);
    expect.soft(b.text).not.toMatch(HAS_ORDER_NO);
  });
  await test.step('3. GET /api/products และ /account', async () => {});
  const st = await stocks(page.request);
  await checkApi('ข้อ 3: สต็อกไก่ฟรีซดราย 0 (ไม่ใช่ −1) · ขนมแมวเลีย 80', { 'freeze-dried-chicken-cat': st['freeze-dried-chicken-cat'], 'lickable-salmon-treat': st['lickable-salmon-treat'] }, () => {
    expect.soft(st['freeze-dried-chicken-cat']).toBe(0);
    expect.soft(st['lickable-salmon-treat']).toBe(80);
  });
  const after = await accountStats(page);
  await check(page, 'ข้อ 3: จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-ORD-006 แท็บที่ค้างหน้า checkout ไว้ ขณะอีกแท็บซื้อหมดไปแล้ว ต้องสั่งไม่ได้", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 201 ยอด ฿1,560 (฿520×3 ส่งฟรี) · ข้อ 2: `POST /api/orders` HTTP 409 · ข้อ 3: แท็บ A แสดงข้อความที่มีชื่อ \"สูตรลดก้อนขน\" URL ยังเป็น `/checkout` · ข้อ 4: สต็อก 0 · `/account` เพิ่มจากก่อนเริ่ม 1 คำสั่งเท่านั้น" },
    { type: 'source', description: "[D]+[R] · R115 · ความเสี่ยง: ขายชิ้นเดียวกันสองครั้ง · เทคนิค: State, Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  let tabB = page;
  let before = { count: 0, total: 0, ids: [] as string[] };
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน ×3 · เปิด /checkout 2 แท็บ (A, B) กรอกที่อยู่ถูกทั้งคู่', async () => {
    await login(page.request);
    before = await accountStats(page);
    await seedCart(page, [HAIRBALL(3)]);
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
    tabB = await page.context().newPage();
    await gotoCheckout(tabB);
    await fillAddress(tabB);
    await setMethods(tabB, 'standard', 'cod');
  });
  let rb = { status: null as number | null, json: null as any };
  await test.step('1. แท็บ B กดยืนยัน', async () => {
    await tabB.bringToFront();
    rb = await submitOrder(tabB);
  });
  await checkApi('ข้อ 1: แท็บ B HTTP 201 ยอด ฿1,560 (฿520×3 ส่งฟรี)', { status: rb.status, body: rb.json }, () => {
    expect.soft(rb.status).toBe(201);
    expect.soft(rb.json?.order?.total).toBe(1560);
  });
  let ra = { status: null as number | null, json: null as any };
  await test.step('2. แท็บ A (ไม่ reload) กดยืนยัน', async () => {
    await page.bringToFront();
    ra = await submitOrder(page, 10_000);
  });
  await checkApi('ข้อ 2: แท็บ A POST /api/orders HTTP 409', { status: ra.status, body: ra.json, all: t.statuses }, () => {
    expect.soft(ra.status).toBe(409);
  });
  await test.step('3. ดู status ข้อความ และ URL ของแท็บ A', async () => {});
  await check(page, 'ข้อ 3: แท็บ A แสดงข้อความที่มีชื่อ "สูตรลดก้อนขน"', page.getByTestId('order-error'), async (el) => {
    await expect.soft(el).toContainText('สูตรลดก้อนขน');
  });
  await check(page, 'ข้อ 3: URL แท็บ A ยังเป็น /checkout', null, async () => {
    await expect.soft(page).toHaveURL(/\/checkout$/);
  });
  await test.step('4. GET /api/products และ /account', async () => {
    await tabB.close();
  });
  const st = await stocks(page.request);
  await checkApi('ข้อ 4: สต็อก 0', { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
    expect.soft(st['hairball-control-dry']).toBe(0);
  });
  const after = await accountStats(page);
  await check(page, 'ข้อ 4: /account เพิ่มจากก่อนเริ่ม 1 คำสั่งเท่านั้น', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count - before.count).toBe(1);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-ORD-007 สองคำสั่งยิงพร้อมกันที่รวมแล้วเกินสต็อก ต้องผ่านแค่คำสั่งเดียว", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ได้ 201 หนึ่งตัว และ 409 หนึ่งตัว · ข้อ 3: สต็อก 1 (3 − 2) · `/account` เพิ่ม 1 คำสั่ง ยอด ฿1,040 (X: ฿520×2 = ฿1,040 ส่งฟรี) หรือ ฿1,160 (Y: ฿1,040 + ด่วน ฿120)" },
    { type: 'source', description: "[D]+[R] · R116 · ความเสี่ยง: race condition ตัดสต็อกติดลบ · เทคนิค: State, Boundary, Negative" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · สต็อกสูตรลดก้อนขน 3', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  let x = { status: 0, text: '', id: null as string | null };
  let y = { status: 0, text: '', id: null as string | null };
  await test.step('1. ยิง X (×2 ส่งธรรมดา) และ Y (×2 ส่งด่วน) พร้อมกันด้วย Promise.all', async () => {
    [x, y] = await Promise.all([
      apiOrder(page.request, orderBody({ items: [HAIRBALL(2)], shipping: 'standard' })),
      apiOrder(page.request, orderBody({ items: [HAIRBALL(2)], shipping: 'express' })),
    ]);
  });
  await test.step('2. ดู status ทั้งคู่', async () => {});
  await checkApi('ข้อ 2: ได้ 201 หนึ่งตัว และ 409 หนึ่งตัว', { X: { status: x.status, body: x.text }, Y: { status: y.status, body: y.text } }, () => {
    expect.soft([x.status, y.status].sort()).toEqual([201, 409]);
  });
  await test.step('3. GET /api/products และ /account', async () => {});
  const st = await stocks(page.request);
  await checkApi('ข้อ 3: สต็อก 1 (3 − 2)', { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
    expect.soft(st['hairball-control-dry']).toBe(1);
  });
  const after = await accountStats(page);
  await check(page, 'ข้อ 3: /account เพิ่ม 1 คำสั่ง', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count - before.count).toBe(1);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
  const okId = x.status === 201 ? x.id : y.status === 201 ? y.id : null;
  const newRow = okId ? orderRow(page, okId) : page.getByTestId('order-row').first();
  await check(page, 'ข้อ 3: คำสั่งที่เพิ่มยอด ฿1,040 (X) หรือ ฿1,160 (Y)', newRow, async (el) => {
    await expect.soft(el).toContainText(/฿1,040|฿1,160/);
  });
});

test("TC-ORD-008 กดยืนยันซ้ำในจังหวะเดียวต้องได้ 1 คำสั่ง (dblclick และ `click()` 3 ครั้ง)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทุกรอบ: เกิดคำสั่งใหม่ 1 รายการเท่านั้น · `/account` เพิ่ม 1 คำสั่ง ยอดซื้อสะสมเพิ่ม ฿520 (฿520 − NEWCAT50 ฿50 + ส่ง ฿50 = ฿520) · สต็อกสูตรลดก้อนขน 2 (3 − 1) (ตอนนี้ล้ม: รอบ (ข) ได้ POST 201 ×3 สามคำสั่ง สต็อกเหลือ 0)" },
    { type: 'source', description: "[D]+[R] · R113 · Q25 · ความเสี่ยง: เก็บเงินซ้ำ ตัดสต็อกซ้ำ ใช้คูปองซ้ำ · เทคนิค: Negative, State" },
  ],
}, async ({ page }) => {
  for (const round of ['ก', 'ข'] as const) {
    let before = { count: 0, total: 0, ids: [] as string[] };
    const ok201: number[] = [];
    const onResp = (r: Response) => {
      if (isOrderPost(r.request()) && r.status() === 201) ok201.push(201);
    };
    await test.step(`${round === 'ก' ? '1' : '2'}. รอบ (${round}): reset · ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน ×1 + NEWCAT50 · กรอกที่อยู่ถูก · ส่งธรรมดา`, async () => {
      if (round === 'ข') {
        const rs = await page.request.post('/api/test/reset');
        if (!rs.ok()) throw new Error(`reset ล้ม HTTP ${rs.status()}`);
      }
      await login(page.request);
      before = await accountStats(page);
      await seedCart(page, [HAIRBALL(1)], 'NEWCAT50');
      await gotoCheckout(page);
      await fillAddress(page);
      await setMethods(page, 'standard', 'cod');
    });
    await test.step(round === 'ก' ? 'รอบ (ก): dblclick ปุ่มยืนยัน' : 'รอบ (ข): page.evaluate หา btn แล้ว btn.click(); btn.click(); btn.click()', async () => {
      page.on('response', onResp);
      if (round === 'ก') {
        await page.getByTestId('place-order').dblclick();
      } else {
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="place-order"]') as HTMLButtonElement;
          btn.click();
          btn.click();
          btn.click();
        });
      }
      await page.waitForURL(ORDER_URL, { timeout: 15_000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1000); // ให้ request ที่ยิงซ้ำ (ถ้ามี) ตอบกลับครบ
      page.off('response', onResp);
    });
    await test.step(`3. รอบ (${round}): นับ response 201 ของ POST /api/orders ดู /account และ GET /api/products`, async () => {});
    await checkApi(`รอบ (${round}): เกิดคำสั่งใหม่ 1 รายการเท่านั้น (response 201 = 1)`, { response201: ok201.length }, () => {
      expect.soft(ok201.length).toBe(1);
    });
    const after = await accountStats(page);
    await check(page, `รอบ (${round}): /account เพิ่ม 1 คำสั่ง`, statDd(page, 'คำสั่งซื้อ'), async () => {
      expect.soft(after.count - before.count).toBe(1);
    }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
    await check(page, `รอบ (${round}): ยอดซื้อสะสมเพิ่ม ฿520 (฿520 − NEWCAT50 ฿50 + ส่ง ฿50)`, statDd(page, 'ยอดซื้อสะสม'), async () => {
      expect.soft(after.total - before.total).toBe(520);
    }, { actual: async () => `ก่อน = ${baht(before.total)} · หลัง = ${baht(after.total)}` });
    const st = await stocks(page.request);
    await checkApi(`รอบ (${round}): สต็อกสูตรลดก้อนขน 2 (3 − 1)`, { 'hairball-control-dry': st['hairball-control-dry'] }, () => {
      expect.soft(st['hairball-control-dry']).toBe(2);
    });
  }
});

test("TC-ORD-009 กด back หลังสั่ง และ reload หน้ายืนยัน ต้องไม่สร้างคำสั่งซ้ำ", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: URL = `/cart` (ตะกร้าว่าง) · ข้อ 3–4: ไม่มี `POST /api/orders` เพิ่ม (0 ครั้ง) · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากหลังสั่ง (ยังเพิ่มจากก่อนสั่งแค่ 1 คำสั่ง ยอดซื้อสะสมเพิ่ม ฿239) · สต็อก kitten-salmon-dry 24 (25 − 1)" },
    { type: 'source', description: "[D]+[R] · R114 · ความเสี่ยง: คำสั่งซ้ำจาก back/reload · เทคนิค: State, Negative" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  let before = { count: 0, total: 0, ids: [] as string[] };
  let id = '';
  let postsAfterOrder = 0;
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · เพิ่งสั่ง ลูกแมว 400 g ×1 สำเร็จ (฿239) อยู่ที่ /orders/<id>', async () => {
    await login(page.request);
    before = await accountStats(page);
    id = await orderViaUI(page, { items: [KITTEN(1)] });
    postsAfterOrder = t.posts;
  });
  await test.step('1. กด back ของเบราว์เซอร์', async () => {
    await page.goBack();
    await page.waitForURL(/\/cart$/, { timeout: 10_000 }).catch(() => {});
  });
  await test.step('2. ดู URL', async () => {});
  await check(page, 'ข้อ 2: URL = /cart (ตะกร้าว่าง)', null, async () => {
    await expect.soft(page).toHaveURL(/\/cart$/);
    await expect.soft(page.getByTestId('cart-item')).toHaveCount(0);
  });
  await test.step('3. กลับไป /orders/<id> แล้ว reload 2 ครั้ง', async () => {
    await page.goto(`/orders/${id}`);
    await page.reload();
    await page.reload();
    await page.getByTestId('order-id').waitFor().catch(() => {});
  });
  await test.step('4. ดู Network และ /account', async () => {});
  await check(page, 'ข้อ 3–4: ไม่มี POST /api/orders เพิ่ม (0 ครั้ง)', null, async () => {
    expect.soft(t.posts - postsAfterOrder).toBe(0);
  }, { actual: async () => `POST หลังสั่งซื้อ = ${t.posts - postsAfterOrder}` });
  const after = await accountStats(page);
  await check(page, 'ข้อ 4: จำนวนคำสั่งใน /account เพิ่มจากก่อนสั่งแค่ 1 คำสั่ง', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count - before.count).toBe(1);
  }, { actual: async () => `ก่อนสั่ง = ${before.count} · ตอนนี้ = ${after.count}` });
  await check(page, 'ข้อ 4: ยอดซื้อสะสมเพิ่ม ฿239', statDd(page, 'ยอดซื้อสะสม'), async () => {
    expect.soft(after.total - before.total).toBe(239);
  }, { actual: async () => `ก่อนสั่ง = ${baht(before.total)} · ตอนนี้ = ${baht(after.total)}` });
  const st = await stocks(page.request);
  await checkApi('ข้อ 4: สต็อก kitten-salmon-dry 24 (25 − 1)', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
    expect.soft(st['kitten-salmon-dry']).toBe(24);
  });
});

test("TC-ORD-010 API ต้องปฏิเสธรายการสินค้าที่ผิด (qty ติดลบ/ศูนย์, size/slug ไม่มีจริง, items ว่าง)", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทั้ง 5 ครั้ง HTTP 400 · ไม่มีเลขคำสั่งใน response · สต็อก kitten-salmon-dry ยัง 25 · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม" },
    { type: 'source', description: "[R] · R118 · ความเสี่ยง: qty ติดลบทำให้สต็อกเพิ่ม/ยอดติดลบ · เทคนิค: Security, Negative" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · จดสต็อก kitten-salmon-dry (25)', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const res: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง POST /api/orders 5 ครั้ง', async () => {
    const cases: [string, Item[]][] = [
      ['qty -1', [KITTEN(-1)]],
      ['qty 0', [KITTEN(0)]],
      ['size "99 kg"', [{ slug: 'kitten-salmon-dry', size: '99 kg', qty: 1 }]],
      ['slug "no-such-item"', [{ slug: 'no-such-item', size: '400 g', qty: 1 }]],
      ['items: []', []],
    ];
    for (const [label, items] of cases) {
      const x = await apiOrder(page.request, orderBody({ items }));
      res.push({ label, status: x.status, text: x.text });
    }
  });
  await test.step('2. ดู status', async () => {});
  for (const x of res) {
    await checkApi(`${x.label}: HTTP 400 · ไม่มีเลขคำสั่งใน response`, x, () => {
      expect.soft(x.status).toBe(400);
      expect.soft(x.text).not.toMatch(HAS_ORDER_NO);
    });
  }
  await test.step('3. GET /api/products และ /account', async () => {});
  const st = await stocks(page.request);
  await checkApi('สต็อก kitten-salmon-dry ยัง 25', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
    expect.soft(st['kitten-salmon-dry']).toBe(25);
  });
  const after = await accountStats(page);
  await check(page, 'จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-ORD-011 API ต้องปฏิเสธ qty ที่เป็นทศนิยมหรือสตริง ไม่ปัดให้เงียบ ๆ", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทั้ง 3 ครั้ง HTTP 400 · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม · สต็อก kitten-salmon-dry 25 (ตอนนี้ล้ม: `1.5` ได้ 201 ปัดเป็น 1 · `\"2\"` ได้ 201 เป็น 2)" },
    { type: 'source', description: "[R] · R119 · Q26 · ความเสี่ยง: จำนวนในคำสั่งไม่ตรงที่ลูกค้าส่ง · เทคนิค: Negative, Equivalence partition" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo (ยิงด้วย page.request)', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const res: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง 3 ครั้ง qty 1.5 · "2" · "abc"', async () => {
    for (const q of [1.5, '2', 'abc']) {
      const x = await apiOrder(page.request, orderBody({ items: [KITTEN(q)] }));
      res.push({ label: `qty ${JSON.stringify(q)}`, status: x.status, text: x.text });
    }
  });
  await test.step('2. ดู status', async () => {});
  for (const x of res) {
    await checkApi(`${x.label}: HTTP 400`, x, () => {
      expect.soft(x.status).toBe(400);
    });
  }
  await test.step('3. ดู /account และสต็อก', async () => {});
  const after = await accountStats(page);
  await check(page, 'จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
  const st = await stocks(page.request);
  await checkApi('สต็อก kitten-salmon-dry 25', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
    expect.soft(st['kitten-salmon-dry']).toBe(25);
  });
});

test("TC-ORD-012 คูปองหมดอายุ (SUMMER20) / ไม่มีจริง ต้องถูกปฏิเสธตอนสั่ง ไม่ใช่เก็บเงินเต็มเงียบ ๆ", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ทั้งคู่ HTTP 400 ไม่สร้างคำสั่ง · ข้อ 2 แบบ A: `/checkout` แสดงข้อความว่าคูปองใช้ไม่ได้ (เช่น \"คูปองนี้หมดอายุแล้ว\") ก่อนกดยืนยัน → ผ่าน · แบบ B: `POST /api/orders` ได้ 400 หน้าแสดง error URL ยังเป็น `/checkout` → ผ่าน · ล้มเมื่อได้ 201 (คำสั่ง ฿239 = ฿189 + ส่ง ฿50 ไม่มีส่วนลด) โดยไม่มีข้อความใดก่อนกด · ข้อ 3 (แบบ A และ B): จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม (ตอนนี้ล้ม: 201 คูปองถูกเปลี่ยนเป็น null จ่ายเต็มโดยไม่รู้)" },
    { type: 'source', description: "[D]+[R] · R120 · Q26 · (ค) เป็นเจ้าของเรื่อง \"ต้องแจ้งลูกค้าก่อนเก็บเงินเต็ม\" ส่วนยอดบน `/cart`/`/checkout` เมื่อแก้ `pp-coupon` ดู TC-CPN-022 · ความเสี่ยง: ลูกค้าเสียส่วนลดโดยไม่รู้ตัว · เทคนิค: Negative, Security" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const res: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง (ก) coupon SUMMER20 (ข) coupon FAKE99', async () => {
    for (const c of ['SUMMER20', 'FAKE99']) {
      const x = await apiOrder(page.request, orderBody({ coupon: c }));
      res.push({ label: `coupon ${c}`, status: x.status, text: x.text });
    }
  });
  for (const x of res) {
    await checkApi(`ข้อ 1: ${x.label} HTTP 400 ไม่สร้างคำสั่ง`, x, () => {
      expect.soft(x.status).toBe(400);
      expect.soft(x.text).not.toMatch(HAS_ORDER_NO);
    });
  }
  await test.step('2. (ค) ตะกร้า ลูกแมว 400 g ×1 ใส่ PAW10 ใน /cart แล้วแก้ pp-coupon เป็น SUMMER20 · ไป /checkout กรอกที่อยู่', async () => {
    await seedCart(page, [KITTEN(1)], 'PAW10');
    await page.evaluate(() => localStorage.setItem('pp-coupon', 'SUMMER20'));
    await gotoCheckout(page);
    await fillAddress(page);
  });
  const couponMsg = page.locator('main').getByText(/คูปอง[^\n]{0,40}(หมดอายุ|ใช้ไม่ได้|ไม่ถูกต้อง|ไม่สามารถ|ไม่พบ)/);
  const typeA = (await couponMsg.count()) > 0;
  if (typeA) {
    await check(page, 'ข้อ 2 แบบ A: /checkout แสดงข้อความว่าคูปองใช้ไม่ได้ก่อนกดยืนยัน', couponMsg, async (el) => {
      await expect.soft(el.first()).toBeVisible();
    });
  } else {
    let r = { status: null as number | null, json: null as any };
    await test.step('2. ไม่มีข้อความเรื่องคูปองก่อนกด → กดยืนยัน (แบบ B) ดู status และ URL', async () => {
      r = await submitOrder(page, 10_000);
    });
    await checkApi('ข้อ 2 แบบ B: POST /api/orders ได้ 400 (ล้มเมื่อได้ 201 โดยไม่มีข้อความใดก่อนกด)', { status: r.status, body: r.json }, () => {
      expect.soft(r.status).toBe(400);
    });
    await check(page, 'ข้อ 2 แบบ B: หน้าแสดง error · URL ยังเป็น /checkout', page.getByTestId('order-error'), async (el) => {
      await expect.soft(page).toHaveURL(/\/checkout$/);
      await expect.soft(el).toBeVisible();
    });
  }
  await test.step('3. ดู /account', async () => {});
  const after = await accountStats(page);
  await check(page, 'ข้อ 3: จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count} · POST จากหน้าเว็บ = ${t.posts}` });
});

test("TC-ORD-013 จังหวัด/วิธีส่ง/วิธีจ่ายที่ไม่มีในระบบต้องได้ 400", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ทั้ง 3 ครั้ง HTTP 400 · จำนวนคำสั่งใน `/account` ไม่เพิ่มจากก่อนเริ่ม (ตอนนี้ล้ม: 201 แล้วเปลี่ยนเป็น กรุงเทพมหานคร / standard / cod เงียบ ๆ)" },
    { type: 'source', description: "[R] · R121 · Q26 · ความเสี่ยง: ส่งผิดจังหวัด/คิดค่าส่งผิดโดยลูกค้าไม่รู้ · เทคนิค: Negative, Equivalence partition" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo (ยิงด้วย page.request)', async () => {
    await login(page.request);
  });
  const before = await accountStats(page);
  const res: { label: string; status: number; text: string }[] = [];
  await test.step('1. ยิง 3 ครั้ง province "ดาวอังคาร" · shipping "free" · payment "credit"', async () => {
    const cases: [string, Parameters<typeof orderBody>[0]][] = [
      ['province "ดาวอังคาร"', { address: { province: 'ดาวอังคาร' } }],
      ['shipping "free"', { shipping: 'free' }],
      ['payment "credit"', { payment: 'credit' }],
    ];
    for (const [label, over] of cases) {
      const x = await apiOrder(page.request, orderBody(over));
      res.push({ label, status: x.status, text: x.text });
    }
  });
  await test.step('2. ดู status', async () => {});
  for (const x of res) {
    await checkApi(`${x.label}: HTTP 400`, x, () => {
      expect.soft(x.status).toBe(400);
    });
  }
  await test.step('3. ดู /account', async () => {});
  const after = await accountStats(page);
  await check(page, 'จำนวนคำสั่งใน /account ไม่เพิ่มจากก่อนเริ่ม', statDd(page, 'คำสั่งซื้อ'), async () => {
    expect.soft(after.count).toBe(before.count);
  }, { actual: async () => `ก่อน = ${before.count} · หลัง = ${after.count}` });
});

test("TC-ORD-014 ส่งราคาปลอมไปใน body ต้องไม่มีผล server คิดราคาเอง", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: body มีแค่ key `items[{slug,size,qty}]` `coupon` `shipping` `payment` `address` ไม่มีราคา · ข้อ 2: HTTP 201 หรือ 400 · ข้อ 3 (ถ้า 201): ยอดชำระ ฿239 (฿189 + ส่ง ฿50 = ฿239) ทั้ง API และหน้า · ส่วนลด ฿0 · ไม่มีจุดไหนเป็น ฿1 หรือ ฿0" },
    { type: 'source', description: "[D]+[R] · R122 · ความเสี่ยง: ลูกค้าตั้งราคาเองได้ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo', async () => {
    await login(page.request);
  });
  let sent: any = null;
  await test.step('1. ดู body ที่หน้าเว็บส่งจริง (สั่งแบบ TC-CHK-001: ลูกแมว 400 g ×1 ส่งธรรมดา เก็บเงินปลายทาง)', async () => {
    await seedCart(page, [KITTEN(1)]);
    await gotoCheckout(page);
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
    const r = await submitOrder(page);
    try {
      sent = JSON.parse(r.reqBody ?? 'null');
    } catch {
      sent = r.reqBody;
    }
  });
  await checkApi('ข้อ 1: body มีแค่ key items[{slug,size,qty}] coupon shipping payment address ไม่มีราคา', sent, () => {
    expect.soft(Object.keys(sent ?? {}).sort()).toEqual(['address', 'coupon', 'items', 'payment', 'shipping']);
    for (const it of (sent?.items ?? []) as object[]) expect.soft(Object.keys(it).sort()).toEqual(['qty', 'size', 'slug']);
    expect.soft(JSON.stringify(sent ?? '')).not.toMatch(/price|total|subtotal|discount|shippingFee/i);
  });
  let r = { status: 0, text: '', id: null as string | null };
  await test.step('2. ยิง body ปลอม (items[0].price 1 · total 1 · subtotal 1 · discount 189 · shippingFee 0)', async () => {
    const b = orderBody({ total: 1, subtotal: 1, discount: 189, shippingFee: 0 });
    b.items = [{ ...KITTEN(1), price: 1 }];
    r = await apiOrder(page.request, b);
  });
  await checkApi('ข้อ 2: HTTP 201 หรือ 400', { status: r.status, body: r.text }, () => {
    expect.soft([201, 400]).toContain(r.status);
  });
  await test.step('3. ถ้า 201 เปิด GET /api/orders/<id> และ /orders/<id>', async () => {
    if (r.status !== 201 || !r.id) return;
    const o = await getOrder(page.request, r.id);
    await checkApi('ข้อ 3 (API): ยอดชำระ 239 (฿189 + ส่ง ฿50) · ส่วนลด 0 · ไม่มีจุดไหนเป็น 1 หรือ 0', o.json, () => {
      expect.soft(o.order?.total).toBe(239);
      expect.soft(o.order?.discount).toBe(0);
      expect.soft(o.order?.subtotal).toBe(189);
      expect.soft(o.order?.shipping).toBe(50);
      expect.soft(o.order?.items?.[0]?.price).toBe(189);
    });
    await page.goto(`/orders/${r.id}`);
    await check(page, 'ข้อ 3 (หน้า): ยอดชำระ ฿239', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText('฿239');
    });
    await check(page, 'ข้อ 3 (หน้า): ส่วนลด ฿0', page.getByTestId('summary-discount'), async (el) => {
      await expect.soft(el).toHaveText(/^\s*[−-]?\s*฿0\s*$/);
    });
    await check(page, 'ข้อ 3 (หน้า): ยอดสินค้า ฿189 · ค่าส่ง ฿50 (ไม่มีจุดไหนเป็น ฿1 หรือ ฿0)', page.locator('[data-testid="summary-subtotal"], [data-testid="summary-shipping"]'), async () => {
      await expect.soft(page.getByTestId('summary-subtotal')).toHaveText('฿189');
      await expect.soft(page.getByTestId('summary-shipping')).toHaveText('฿50');
    });
  });
});

test("TC-ORD-015 แก้ราคา/จำนวนใน `pp-cart` แล้วสั่งซื้อ ต้องใช้ราคาจริงและไม่เกินสต็อก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ยอดชำระ ฿120 (฿35×2 + ส่ง ฿50 = ฿120) ทั้งหน้าและ API · สต็อกทูน่า 58 (60 − 2) · ข้อ 3: ไม่เกิดคำสั่ง 61 ชิ้น — ผ่านเมื่อตะกร้าตัดเหลือ ≤ 60 พร้อมเตือน (Q9) หรือ API 409 · ข้อ 4: สต็อกทูน่าไม่ติดลบ (60 ถ้าได้ 409 · 0 ถ้าตะกร้าตัดเหลือ 60 แล้วสั่ง)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R117 · R122 · Q9 · ความเสี่ยง: แก้ localStorage แล้วซื้อถูก/เกินสต็อก · เทคนิค: Security, Boundary" },
  ],
}, async ({ page }) => {
  const addTunaViaUI = async () => {
    await page.goto('/products/tuna-pouch');
    await page.getByTestId('qty-plus').click();
    await page.getByTestId('add-to-cart').click();
    await page
      .waitForFunction(() => (JSON.parse(localStorage.getItem('pp-cart') ?? '[]') as { slug: string; qty: number }[]).some((i) => i.slug === 'tuna-pouch' && i.qty === 2), null, { timeout: 5000 })
      .catch(() => {});
  };
  const editTuna = (patch: Record<string, unknown>) =>
    page.evaluate((p) => {
      const cart = JSON.parse(localStorage.getItem('pp-cart') ?? '[]') as Record<string, unknown>[];
      localStorage.setItem('pp-cart', JSON.stringify(cart.map((i) => (i.slug === 'tuna-pouch' ? { ...i, ...p } : i))));
    }, patch);
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ใส่ ทูน่าซอง ×2 ผ่านหน้าเว็บ · สต็อกทูน่า 60', async () => {
    await login(page.request);
    await addTunaViaUI();
  });
  let id = '';
  await test.step('1. (ก) แก้ pp-cart ฟิลด์ราคาเป็น 1 qty 2 · reload /cart ไป /checkout กดยืนยัน', async () => {
    await editTuna({ price: 1, qty: 2 });
    await page.goto('/cart');
    await page.reload();
    await gotoCheckout(page, true);
    await fillAddress(page);
    await setMethods(page, 'standard', 'cod');
    const r = await submitOrder(page);
    if (r.status !== 201) throw new Error(`(ก) สั่งซื้อไม่สำเร็จ HTTP ${r.status} ${JSON.stringify(r.json)}`);
    id = orderIdFromUrl(page);
  });
  await test.step('2. ดูยอดบน /orders/<id> และ API', async () => {});
  await check(page, 'ข้อ 2 (หน้า): ยอดชำระ ฿120 (฿35×2 + ส่ง ฿50)', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText('฿120');
  });
  const o = await getOrder(page.request, id);
  await checkApi('ข้อ 2 (API): ยอดชำระ 120', o.json, () => {
    expect.soft(o.order?.total).toBe(120);
  });
  const st1 = await stocks(page.request);
  await checkApi('ข้อ 2: สต็อกทูน่า 58 (60 − 2)', { 'tuna-pouch': st1['tuna-pouch'] }, () => {
    expect.soft(st1['tuna-pouch']).toBe(58);
  });
  let cartQty = NaN;
  let warned = false;
  let r2 = { status: null as number | null, json: null as any };
  await test.step('3. reset ตั้งตะกร้าใหม่ (ทูน่า ×2 ผ่านหน้าเว็บ) ทำ (ข) แก้ qty เป็น 61 แล้วไป checkout กดยืนยัน', async () => {
    const rs = await page.request.post('/api/test/reset');
    if (!rs.ok()) throw new Error(`reset ล้ม HTTP ${rs.status()}`);
    await login(page.request);
    await page.goto('/cart');
    await page.evaluate(() => localStorage.removeItem('pp-cart'));
    await addTunaViaUI();
    await editTuna({ qty: 61 });
    await page.goto('/cart');
    await page.getByTestId('cart-item').first().waitFor();
    cartQty = Number(await page.getByTestId('item-qty').first().inputValue());
    warned = (await page.locator('main').getByText(/สต็อก|คงเหลือ|เหลือ\s*\d+|ไม่พอ|เกินจำนวน|ปรับจำนวน/).count()) > 0;
    const btn = page.getByTestId('checkout-button');
    if ((await btn.count()) > 0 && (await btn.isEnabled())) {
      await btn.click();
      await page.waitForURL(/\/checkout$/, { timeout: 10_000 }).catch(() => {});
    }
    if (/\/checkout$/.test(page.url())) {
      await page.getByTestId('place-order').waitFor();
      await fillAddress(page);
      r2 = await submitOrder(page, 10_000);
    }
  });
  const orderedQty = Number(r2.json?.order?.items?.find((i: { slug: string }) => i.slug === 'tuna-pouch')?.qty ?? 0);
  await checkApi('ข้อ 3: ไม่เกิดคำสั่ง 61 ชิ้น — ผ่านเมื่อตะกร้าตัดเหลือ ≤ 60 พร้อมเตือน หรือ API 409', { cartQtyAfterReload: cartQty, warned, status: r2.status, orderedQty }, () => {
    expect.soft(r2.status === 201 && orderedQty > 60, 'เกิดคำสั่งเกิน 60 ชิ้น').toBe(false);
    expect.soft(r2.status === 409 || (cartQty <= 60 && warned), `409=${r2.status === 409} · ตะกร้าตัดเหลือ ${cartQty} พร้อมเตือน=${warned}`).toBe(true);
  });
  await test.step('4. GET /api/products', async () => {});
  const st2 = await stocks(page.request);
  const expectStock = 60 - (r2.status === 201 ? orderedQty : 0);
  await checkApi(`ข้อ 4: สต็อกทูน่าไม่ติดลบ (60 ถ้าได้ 409 · 0 ถ้าตะกร้าตัดเหลือ 60 แล้วสั่ง) → คาด ${expectStock}`, { 'tuna-pouch': st2['tuna-pouch'], status: r2.status, orderedQty }, () => {
    expect.soft(st2['tuna-pouch']).toBeGreaterThanOrEqual(0);
    expect.soft(st2['tuna-pouch']).toBe(expectStock);
  });
});

test("TC-ORD-016 ไม่ล็อกอินยิง `POST /api/orders` ต้องได้ 401 ไม่สร้างคำสั่ง", {
  tag: ["@P1", "@5.5", "@api"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 401 · ไม่มีเลขคำสั่งใน response · ข้อ 2: สต็อก kitten-salmon-dry 25" },
    { type: 'source', description: "[R] · R98 · ความเสี่ยง: สั่งซื้อแบบไม่มีเจ้าของบัญชี · เทคนิค: Security, Negative" },
  ],
}, async ({ request }) => {
  let r = { status: 0, text: '' };
  await test.step('1. ยิง POST /api/orders ด้วย request context ที่ไม่มี cookie (body แม่แบบ ลูกแมว 400 g ×1)', async () => {
    r = await apiOrder(request, orderBody());
  });
  await checkApi('ข้อ 1: HTTP 401 · ไม่มีเลขคำสั่งใน response', { status: r.status, body: r.text }, () => {
    expect.soft(r.status).toBe(401);
    expect.soft(r.text).not.toMatch(HAS_ORDER_NO);
  });
  await test.step('2. GET /api/products', async () => {
    const st = await stocks(request);
    await checkApi('ข้อ 2: สต็อก kitten-salmon-dry 25', { 'kitten-salmon-dry': st['kitten-salmon-dry'] }, () => {
      expect.soft(st['kitten-salmon-dry']).toBe(25);
    });
  });
});

test("TC-ORD-017 รูปแบบเลขคำสั่งซื้อ `PP-` + 6 หลัก ไม่ซ้ำกัน และตรงกันทุกจุด", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "N1 และ N2 ตรง `^PP-\\d{6}$` · N2 ≠ N1 · เลขในหน้ายืนยัน แถว `/account` และ API ตรงกับ URL ทุกตัว (ไม่ใช้เลข PP-1000NN จากการสำรวจเป็นค่าคาดหวัง · ไม่ตรวจว่าเลขเรียงทีละ 1 จนกว่าทีมตอบ Q53)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R123 · Q53 · ความเสี่ยง: เลขซ้ำ/อ้างคำสั่งผิดใบ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo', async () => {
    await login(page.request);
  });
  let n1 = '';
  let n2 = '';
  await test.step('1. สั่งครั้งที่ 1 (ลูกแมว 400 g ×1 ฿239) จดเลข N1 จาก URL', async () => {
    n1 = await orderViaUI(page, { items: [KITTEN(1)] });
  });
  await test.step('2. สั่งครั้งที่ 2 จดเลข N2', async () => {
    n2 = await orderViaUI(page, { items: [KITTEN(1)] });
  });
  await checkApi('N1 และ N2 ตรง ^PP-\\d{6}$ · N2 ≠ N1', { N1: n1, N2: n2 }, () => {
    expect.soft(n1).toMatch(ORDER_ID);
    expect.soft(n2).toMatch(ORDER_ID);
    expect.soft(n2).not.toBe(n1);
  });
  await test.step('3. เทียบเลขบนหน้ายืนยัน แถว /account และ GET /api/orders/<id>', async () => {});
  for (const id of [n1, n2]) {
    await page.goto(`/orders/${id}`);
    await check(page, `หน้ายืนยัน ${id}: เลขบนหน้า = URL`, page.getByTestId('order-id'), async (el) => {
      await expect.soft(el).toHaveText(id);
    });
  }
  await page.goto('/account');
  for (const id of [n1, n2]) {
    await check(page, `/account มีแถว ${id}`, orderRow(page, id), async (el) => {
      await expect.soft(el).toHaveCount(1);
      await expect.soft(el).toContainText(id);
    });
  }
  for (const id of [n1, n2]) {
    const o = await getOrder(page.request, id);
    await checkApi(`GET /api/orders/${id}: id ตรงกับ URL`, o.json, () => {
      expect.soft(o.status).toBe(200);
      expect.soft(o.order?.id).toBe(id);
    });
  }
});

test("TC-ORD-018 `POST /api/test/reset` คืนสต็อก (สูตรลดก้อนขนกลับเป็น 3)", {
  tag: ["@P1", "@5.5", "@api"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: สต็อก 0 · ข้อ 2: HTTP 200 body `{\"ok\":true}` · ข้อ 3: สต็อกสูตรลดก้อนขน 3 · ไก่ฟรีซดราย 0" },
    { type: 'source', description: "[D] · R112 · ความเสี่ยง: test ถัดไปเริ่มจากสต็อกค้าง ผลไม่ซ้ำได้ · เทคนิค: State" },
  ],
}, async ({ request }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo', async () => {
    await login(request);
  });
  let r = { status: 0, text: '' };
  await test.step('1. สั่ง สูตรลดก้อนขน ×3 (฿1,560) แล้ว GET /api/products ยืนยันสต็อกสูตรลดก้อนขน 0', async () => {
    r = await apiOrder(request, orderBody({ items: [HAIRBALL(3)] }));
  });
  const s1 = await stocks(request);
  await checkApi('ข้อ 1: สต็อก 0', { order: { status: r.status }, 'hairball-control-dry': s1['hairball-control-dry'] }, () => {
    expect.soft(r.status).toBe(201);
    expect.soft(s1['hairball-control-dry']).toBe(0);
  });
  let rs = { status: 0, text: '' };
  await test.step('2. POST /api/test/reset', async () => {
    const x = await request.post('/api/test/reset');
    rs = { status: x.status(), text: await x.text() };
  });
  await checkApi('ข้อ 2: HTTP 200 body {"ok":true}', rs, () => {
    expect.soft(rs.status).toBe(200);
    let j: unknown = null;
    try {
      j = JSON.parse(rs.text);
    } catch {
      /* ไม่ใช่ JSON */
    }
    expect.soft(j).toEqual({ ok: true });
  });
  await test.step('3. GET /api/products', async () => {
    const s3 = await stocks(request);
    await checkApi('ข้อ 3: สต็อกสูตรลดก้อนขน 3 · ไก่ฟรีซดราย 0', { 'hairball-control-dry': s3['hairball-control-dry'], 'freeze-dried-chicken-cat': s3['freeze-dried-chicken-cat'] }, () => {
      expect.soft(s3['hairball-control-dry']).toBe(3);
      expect.soft(s3['freeze-dried-chicken-cat']).toBe(0);
    });
  });
});

test("TC-CONF-001 หน้ายืนยันแสดงเลขคำสั่ง รายการ วิธีส่ง/จ่าย จังหวัด+รหัสไปรษณีย์ และสรุปยอดครบ", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: เลขคำสั่งบนหน้า = `<id>` ใน URL (ตรง `PP-\\d{6}`) · มีรายการ \"สูตรลดก้อนขน\" 1.5 kg ×1 ฿520 · ยอดสินค้า ฿520 · ส่วนลด −฿52 · ค่าส่ง ฿50 · ยอดชำระ ฿518 (฿520 − PAW10 10% = ฿52 ไม่มีเศษ → ฿468 < ฿999 จึงเสียค่าส่ง ฿50 → ฿518) · มีข้อความ \"กรุงเทพมหานคร\" และ \"10110\" · วิธีส่ง = ธรรมดา วิธีจ่าย = PromptPay · ข้อ 3: เนื้อหาเหมือนเดิมทุกครั้ง ไม่มี `POST /api/orders` เกิดขึ้นใน Network ระหว่าง reload/back/forward · ข้อ 4: URL `/account` มีแถว `<id>` และจำนวนคำสั่งเพิ่มจากก่อนเริ่ม 1 แถวพอดี (ไม่เกิดคำสั่งซ้ำ)" },
    { type: 'source', description: "[D]+[R] · R124 · R111 · R113 · ความเสี่ยง: ลูกค้าตรวจคำสั่งตัวเองไม่ได้ · เทคนิค: Happy path, State" },
  ],
}, async ({ page }) => {
  const t = trackOrderPosts(page);
  let before = { count: 0, total: 0, ids: [] as string[] };
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า สูตรลดก้อนขน 1.5 kg ×1 + PAW10', async () => {
    await login(page.request);
    before = await accountStats(page);
  });
  let id = '';
  await test.step('1. สั่งซื้อ (ที่อยู่มาตรฐาน · ส่งธรรมดา · PromptPay) จน URL เป็น /orders/<id>', async () => {
    id = await orderViaUI(page, { items: [HAIRBALL(1)], coupon: 'PAW10', shipping: 'standard', payment: 'promptpay' });
  });
  const main = page.locator('main');
  const snapshot = () => main.innerText();
  await test.step('2. อ่านเนื้อหาหน้า', async () => {
    await page.getByTestId('order-id').waitFor();
  });
  await check(page, 'ข้อ 2: เลขคำสั่งบนหน้า = <id> ใน URL (ตรง PP-\\d{6})', page.getByTestId('order-id'), async (el) => {
    expect.soft(id).toMatch(ORDER_ID);
    await expect.soft(el).toHaveText(id);
  });
  await check(page, 'ข้อ 2: รายการ "สูตรลดก้อนขน" 1.5 kg ×1 ฿520', page.getByTestId('order-item'), async (el) => {
    await expect.soft(el).toHaveCount(1);
    await expect.soft(el).toContainText('สูตรลดก้อนขน');
    await expect.soft(el).toContainText('1.5 kg');
    await expect.soft(el).toContainText(/×\s*1(?!\d)/);
    await expect.soft(el).toContainText(/฿520(?!\d)/);
  });
  await check(page, 'ข้อ 2: ยอดสินค้า ฿520', page.getByTestId('summary-subtotal'), async (el) => {
    await expect.soft(el).toHaveText('฿520');
  });
  await check(page, 'ข้อ 2: ส่วนลด −฿52 (PAW10 10% ของ ฿520)', page.getByTestId('summary-discount'), async (el) => {
    await expect.soft(el).toHaveText(minus(52));
  });
  await check(page, 'ข้อ 2: ค่าส่ง ฿50 (฿468 < ฿999)', page.getByTestId('summary-shipping'), async (el) => {
    await expect.soft(el).toHaveText('฿50');
  });
  await check(page, 'ข้อ 2: ยอดชำระ ฿518', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText('฿518');
  });
  await check(page, 'ข้อ 2: มีข้อความ "กรุงเทพมหานคร" และ "10110"', main, async (el) => {
    await expect.soft(el).toContainText('กรุงเทพมหานคร');
    await expect.soft(el).toContainText('10110');
  });
  await check(page, 'ข้อ 2: วิธีส่ง = ธรรมดา · วิธีจ่าย = PromptPay', main, async (el) => {
    await expect.soft(el).toContainText('ธรรมดา');
    await expect.soft(el).toContainText('PromptPay');
  });
  const original = await snapshot();
  const postsAfterOrder = t.posts;
  const same = async (label: string) => {
    await page.getByTestId('order-id').waitFor({ timeout: 10_000 }).catch(() => {});
    await check(page, `ข้อ 3: ${label} — URL เดิม และเนื้อหาเหมือนเดิม`, main, async () => {
      await expect.soft(page).toHaveURL(new RegExp(`/orders/${id}$`));
      expect.soft(await snapshot()).toBe(original);
    });
  };
  await test.step('3. reload 1 ครั้ง', async () => {
    await page.reload();
  });
  await same('หลัง reload');
  await test.step('3. กด back ของเบราว์เซอร์ 1 ครั้ง แล้ว forward กลับมา', async () => {
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.goForward();
  });
  await same('หลัง back → forward');
  await check(page, 'ข้อ 3: ไม่มี POST /api/orders ระหว่าง reload/back/forward', null, async () => {
    expect.soft(t.posts - postsAfterOrder).toBe(0);
  }, { actual: async () => `POST หลังสั่งซื้อ = ${t.posts - postsAfterOrder}` });
  await test.step('4. กด "ดูประวัติการสั่งซื้อ"', async () => {
    if (!new RegExp(`/orders/${id}$`).test(page.url())) await page.goto(`/orders/${id}`);
    await page.getByRole('link', { name: 'ดูประวัติการสั่งซื้อ', exact: true }).click();
    await page.waitForURL(/\/account$/).catch(() => {});
    await page.getByTestId('profile-card').waitFor();
  });
  await check(page, 'ข้อ 4: URL /account มีแถว <id>', orderRow(page, id), async (el) => {
    await expect.soft(page).toHaveURL(/\/account$/);
    await expect.soft(el).toHaveCount(1);
  });
  await check(page, 'ข้อ 4: จำนวนคำสั่งเพิ่มจากก่อนเริ่ม 1 แถวพอดี (ไม่เกิดคำสั่งซ้ำ)', page.getByTestId('order-row'), async (el) => {
    await expect.soft(el).toHaveCount(before.ids.length + 1);
    await expect.soft(statDd(page, 'คำสั่งซื้อ')).toHaveText(String(before.count + 1));
  }, { actual: async () => `แถวก่อน = ${before.ids.length} · ตอนนี้ = ${await page.getByTestId('order-row').count()}` });
});

test("TC-CONF-002 หน้ายืนยันต้องแสดงชื่อ ที่อยู่เต็ม และเบอร์โทร ตรงกับที่กรอก", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: เห็นครบ 5 ค่า \"สมใจ ใจดี\" · \"0812345678\" · \"99/1 ถนนสุขุมวิท แขวงคลองเตย\" · \"กรุงเทพมหานคร\" · \"10110\" · ข้อ 3: API เก็บ 5 ค่าเดียวกันตรงตัว (ตอนนี้ล้ม: หน้ายืนยันโชว์แค่ \"กรุงเทพมหานคร 10110\")" },
    { type: 'source', description: "[R] · R124 · Q27 · ความเสี่ยง: ที่อยู่ส่งผิดแต่ไม่มีใครเห็น · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo · ตะกร้า ลูกแมว 400 g ×1', async () => {
    await login(page.request);
  });
  let id = '';
  await test.step('1. สั่งซื้อ (฿239) ชื่อ "สมใจ ใจดี" เบอร์ 0812345678 ที่อยู่มาตรฐาน กรุงเทพมหานคร 10110', async () => {
    id = await orderViaUI(page, { items: [KITTEN(1)], addr: { name: 'สมใจ ใจดี' } });
  });
  await test.step('2. อ่านส่วนที่อยู่บน /orders/<id>', async () => {
    await page.getByTestId('order-id').waitFor();
  });
  for (const v of ['สมใจ ใจดี', '0812345678', '99/1 ถนนสุขุมวิท แขวงคลองเตย', 'กรุงเทพมหานคร', '10110']) {
    await check(page, `ข้อ 2: หน้ายืนยันแสดง "${v}"`, page.locator('main'), async (el) => {
      await expect.soft(el).toContainText(v);
    });
  }
  await test.step('3. GET /api/orders/<id>', async () => {
    const o = await getOrder(page.request, id);
    await checkApi('ข้อ 3: API เก็บ 5 ค่าเดียวกันตรงตัว', o.json, () => {
      expect.soft(o.order?.address).toEqual(expect.objectContaining({ ...ADDR }));
    });
  });
});

test("TC-CONF-003 ไม่ล็อกอินเปิดหน้าคำสั่งซื้อ/API ต้องถูกบังคับล็อกอิน แล้วกลับมาหน้าเดิม", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: URL = `/login?next=/orders/<id>` (หรือ encode `%2F`) · ไม่เห็นข้อมูลคำสั่ง · ข้อ 3: HTTP 401 body ไม่มี `phone`/`address` · ข้อ 4: URL = `/orders/<id>` ยอดชำระ ฿239" },
    { type: 'source', description: "[D]+[R] · R125 · ความเสี่ยง: คนไม่ล็อกอินดูข้อมูลคำสั่งได้ · เทคนิค: Negative, Security" },
  ],
}, async ({ page, request }) => {
  let id = '';
  await test.step('เงื่อนไขก่อนเริ่ม: demo สั่ง ลูกแมว 400 g ×1 ไว้ 1 คำสั่ง จดเลข <id> · ออกจากระบบแล้ว', async () => {
    await login(page.request);
    const r = await apiOrder(page.request, orderBody());
    if (r.status !== 201 || !r.id) throw new Error(`สั่งซื้อไม่สำเร็จ HTTP ${r.status} ${r.text}`);
    id = r.id;
    await page.request.post('/api/auth/logout');
    await page.context().clearCookies();
  });
  await test.step('1. เปิด /orders/<id>', async () => {
    await page.goto(`/orders/${id}`);
  });
  await test.step('2. ดู URL', async () => {});
  await check(page, 'ข้อ 2: URL = /login?next=/orders/<id> (หรือ encode %2F)', null, async () => {
    await expect.soft(page).toHaveURL(new RegExp(`/login\\?next=(/|%2F)orders(/|%2F)${id}$`));
  });
  await check(page, 'ข้อ 2: ไม่เห็นข้อมูลคำสั่ง', page.locator('main'), async (el) => {
    await expect.soft(page.getByTestId('order-id')).toHaveCount(0);
    await expect.soft(page.getByTestId('summary-total')).toHaveCount(0);
    await expect.soft(el).not.toContainText('0812345678');
  });
  let api = { status: 0, text: '' };
  await test.step('3. GET /api/orders/<id> แบบไม่มี cookie', async () => {
    const x = await request.get(`/api/orders/${id}`);
    api = { status: x.status(), text: await x.text() };
  });
  await checkApi('ข้อ 3: HTTP 401 body ไม่มี phone/address', api, () => {
    expect.soft(api.status).toBe(401);
    expect.soft(api.text).not.toMatch(/"phone"|"address"/);
  });
  await test.step('4. ล็อกอิน demo ในหน้าที่ถูกพาไป', async () => {
    if (!/\/login/.test(page.url())) await page.goto(`/login?next=/orders/${id}`);
    await loginViaForm(page, DEMO);
    await page.waitForURL(new RegExp(`/orders/${id}$`), { timeout: 10_000 }).catch(() => {});
  });
  await check(page, 'ข้อ 4: URL = /orders/<id>', null, async () => {
    await expect.soft(page).toHaveURL(new RegExp(`/orders/${id}$`));
  });
  await check(page, 'ข้อ 4: ยอดชำระ ฿239', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText('฿239');
  });
});

test("TC-CONF-004 IDOR หน้าเว็บ: บัญชีอื่นเปิด `/orders/<id>` ของ demo ต้องไม่เห็นข้อมูล", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "เกณฑ์ผ่าน/ล้ม (ความปลอดภัย): หน้าไม่มีข้อความ \"0812345678\" \"99/1 ถนนสุขุมวิท\" \"สมใจ ใจดี\" \"สูตรลดก้อนขน\" และไม่มีสรุปยอด ฿590 · request `GET /api/orders/<id>` ที่หน้าเรียกได้ 403 หรือ 404 · status ของ document ควรเป็น 403/404 — ถ้าได้ 200 แต่ไม่มีข้อมูล ให้บันทึกเป็นข้อสังเกตแยก ไม่ใช่ล้ม TC นี้" },
    { type: 'source', description: "[R] · R125 · R123 · Q28 · ความเสี่ยง: เลขคำสั่งเดาได้ → ดูที่อยู่/เบอร์คนอื่น · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  let id = '';
  await test.step('เงื่อนไขก่อนเริ่ม: demo สั่ง สูตรลดก้อนขน ×1 + NEWCAT50 ส่งด่วน (฿590) จดเลข <id> · ออกจากระบบ · สมัครและล็อกอิน qa-conf-01-{run}', async () => {
    await login(page.request);
    const r = await apiOrder(page.request, orderBody({ items: [HAIRBALL(1)], coupon: 'NEWCAT50', shipping: 'express' }));
    if (r.status !== 201 || !r.id) throw new Error(`สั่งซื้อไม่สำเร็จ HTTP ${r.status} ${r.text}`);
    id = r.id;
    await page.request.post('/api/auth/logout');
    await page.context().clearCookies();
    await register(page.request, 'qa-conf-01');
  });
  const apiCalls: { url: string; status: number }[] = [];
  page.on('response', (r) => {
    if (new URL(r.url()).pathname === `/api/orders/${id}`) apiCalls.push({ url: r.url(), status: r.status() });
  });
  let docStatus: number | null = null;
  await test.step('1. ในบัญชี qa-conf-01-{run} เปิด /orders/<id>', async () => {
    const resp = await page.goto(`/orders/${id}`);
    docStatus = resp?.status() ?? null;
    await page.waitForLoadState('networkidle').catch(() => {});
  });
  await test.step('2. ดูเนื้อหาหน้า, request GET /api/orders/<id> และ HTTP status ของ document', async () => {});
  for (const v of ['0812345678', '99/1 ถนนสุขุมวิท', 'สมใจ ใจดี', 'สูตรลดก้อนขน', '฿590']) {
    await check(page, `หน้าไม่มีข้อความ "${v}"`, page.locator('main'), async (el) => {
      await expect.soft(el).not.toContainText(v);
    });
  }
  await check(page, 'ไม่มีสรุปยอด', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveCount(0);
  });
  await checkApi('request GET /api/orders/<id> ที่หน้าเรียก (ถ้ามี) ได้ 403 หรือ 404', apiCalls.length ? apiCalls : '(หน้าไม่ได้เรียก API นี้จากเบราว์เซอร์)', () => {
    for (const c of apiCalls) expect.soft([403, 404]).toContain(c.status);
  });
  await test.step(`ข้อสังเกต: status ของ document = ${docStatus}`, async () => {
    if (docStatus !== 403 && docStatus !== 404) {
      test.info().annotations.push({ type: 'note', description: `document /orders/<id> ได้ HTTP ${docStatus} (ควรเป็น 403/404) — บันทึกเป็นข้อสังเกต ไม่นับล้ม TC นี้` });
    }
  });
});

test("TC-CONF-005 IDOR API: บัญชีอื่นเรียก `GET /api/orders/<id>` ของ demo ต้องได้ 403/404 ทั้งคำสั่งแรกและคำสั่งถัดไป (N1, N2)", {
  tag: ["@P1", "@5.5", "@api"],
  annotation: [
    { type: 'expected', description: "ทั้งสองครั้ง HTTP 403 หรือ 404 · body ไม่มี `phone` `address` `name` และไม่มีรายการสินค้า" },
    { type: 'source', description: "[R] · R125 · R123 · Q28 · ความเสี่ยง: ไล่เลขคำสั่งดึงข้อมูลลูกค้าทั้งร้าน · เทคนิค: Security" },
  ],
}, async ({ playwright, request }) => {
  const demo = request;
  const other = await playwright.request.newContext({ baseURL: baseURL() });
  let n1 = '';
  let n2 = '';
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo สั่ง N1 (สูตรลดก้อนขน ×1 + NEWCAT50 ส่งด่วน ฿590) และ N2 (ลูกแมว 400 g ×1 ส่งธรรมดา ฿239) จดเลขทั้งคู่', async () => {
    await login(demo);
    const a = await apiOrder(demo, orderBody({ items: [HAIRBALL(1)], coupon: 'NEWCAT50', shipping: 'express' }));
    const b = await apiOrder(demo, orderBody({ items: [KITTEN(1)], shipping: 'standard' }));
    if (!a.id || !b.id) throw new Error(`สั่งซื้อไม่สำเร็จ: N1 HTTP ${a.status} · N2 HTTP ${b.status}`);
    n1 = a.id;
    n2 = b.id;
  });
  await test.step('เงื่อนไขก่อนเริ่ม: ยืนยันด้วย cookie ของ demo ว่า GET N1 และ N2 ได้ 200', async () => {
    const s = [(await demo.get(`/api/orders/${n1}`)).status(), (await demo.get(`/api/orders/${n2}`)).status()];
    if (s[0] !== 200 || s[1] !== 200) throw new Error(`demo เปิดคำสั่งของตัวเองไม่ได้: ${s.join(', ')}`);
    await demo.post('/api/auth/logout');
  });
  await test.step('เงื่อนไขก่อนเริ่ม: สมัครและล็อกอิน qa-conf-02-{run}', async () => {
    await register(other, 'qa-conf-02');
  });
  const res: { id: string; status: number; text: string }[] = [];
  await test.step('1. GET /api/orders/N1 ด้วย cookie ของ qa-conf-02-{run}', async () => {
    const x = await getOrder(other, n1);
    res.push({ id: n1, status: x.status, text: x.text });
  });
  await test.step('2. GET /api/orders/N2', async () => {
    const x = await getOrder(other, n2);
    res.push({ id: n2, status: x.status, text: x.text });
  });
  await test.step('3. ดู status และ body', async () => {});
  for (const x of res) {
    await checkApi(`${x.id}: HTTP 403 หรือ 404 · body ไม่มี phone address name และรายการสินค้า`, x, () => {
      expect.soft([403, 404]).toContain(x.status);
      expect.soft(x.text).not.toMatch(/"phone"|"address"|"name"|"items"/);
    });
  }
  await other.dispose();
});

test("TC-CONF-006 เปิดคำสั่งที่ไม่มีจริงหรือเลขผิดรูปแบบ ต้องได้ 404 ไม่พัง", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 404 · หน้ามีคำว่า \"ไม่พบ\" · ไม่มีสรุปยอดหรือข้อความ error ของโปรแกรม (stack trace) · ข้อ 2: HTTP 404" },
    { type: 'source', description: "[R] · R125 · Q8 · ความเสี่ยง: หน้าพังหรือเผยข้อมูลภายใน · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo', async () => {
    await login(page.request);
  });
  for (const path of ['/orders/PP-999999', '/orders/abc']) {
    let status: number | null = null;
    await test.step(`1. เปิด ${path}`, async () => {
      const resp = await page.goto(path);
      status = resp?.status() ?? null;
    });
    await test.step(`3. ดู status และข้อความ (${path})`, async () => {});
    await check(page, `${path}: HTTP 404`, null, async () => {
      expect.soft(status).toBe(404);
    }, { actual: async () => `HTTP ${status}` });
    await check(page, `${path}: หน้ามีคำว่า "ไม่พบ"`, page.locator('main'), async (el) => {
      await expect.soft(el).toContainText('ไม่พบ');
    });
    await check(page, `${path}: ไม่มีสรุปยอดหรือข้อความ error ของโปรแกรม (stack trace)`, page.locator('body'), async (el) => {
      await expect.soft(page.getByTestId('summary-total')).toHaveCount(0);
      await expect.soft(el).not.toContainText(/TypeError|ReferenceError|SyntaxError|Unhandled|at\s+\S+\s+\(|node_modules|stack trace/i);
    });
  }
  await test.step('2. ยิง GET /api/orders/PP-999999', async () => {
    const o = await getOrder(page.request, 'PP-999999');
    await checkApi('ข้อ 2: HTTP 404', { status: o.status, body: o.text }, () => {
      expect.soft(o.status).toBe(404);
    });
  });
});

test("TC-ACC-001 ยอดซื้อสะสม = ผลรวมยอดสุทธิของคำสั่งที่สร้างหลัง reset", {
  tag: ["@P2", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: จำนวนคำสั่ง 0 · ยอดซื้อสะสม ฿0 · ข้อ 2: 1 คำสั่ง · ฿617 (฿189×3 + ส่ง ฿50) · ข้อ 3: 2 คำสั่ง · ฿1,207 (฿617 + ฿590 โดย ฿590 = ฿520 − NEWCAT50 ฿50 + ด่วน ฿120)" },
    { type: 'source', description: "[D]+[R] · R126 · ความเสี่ยง: ยอดสะสมไม่ตรงกับเงินที่จ่ายจริง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: สมัครใหม่ qa-acc-01-{run} / Paw12345 (ล็อกอินให้อัตโนมัติ) · ตะกร้าว่าง', async () => {
    await register(page.request, 'qa-acc-01');
  });
  const stat = async (label: string, count: number, total: number) => {
    await check(page, `${label}: จำนวนคำสั่ง ${count}`, statDd(page, 'คำสั่งซื้อ'), async (el) => {
      await expect.soft(el).toHaveText(String(count));
    });
    await check(page, `${label}: ยอดซื้อสะสม ${baht(total)}`, statDd(page, 'ยอดซื้อสะสม'), async (el) => {
      await expect.soft(el).toHaveText(baht(total));
    });
  };
  await test.step('1. ดู /account ก่อนสั่ง', async () => {
    await accountStats(page);
  });
  await stat('ข้อ 1', 0, 0);
  await test.step('2. สั่งคำสั่ง 1 (ลูกแมว 400 g ×3 ส่งธรรมดา) แล้วดู /account', async () => {
    await orderViaUI(page, { items: [KITTEN(3)], shipping: 'standard' });
    await accountStats(page);
  });
  await stat('ข้อ 2 (฿189×3 + ส่ง ฿50)', 1, 617);
  await test.step('3. สั่งคำสั่ง 2 (สูตรลดก้อนขน ×1 + NEWCAT50 ส่งด่วน) แล้วดู /account', async () => {
    await orderViaUI(page, { items: [HAIRBALL(1)], coupon: 'NEWCAT50', shipping: 'express' });
    await accountStats(page);
  });
  await stat('ข้อ 3 (฿617 + ฿590)', 2, 1207);
});

test("TC-ACC-002 ยอดสะสมใช้ยอดสุทธิหลังหักคูปองและค่าส่งฟรี", {
  tag: ["@P2", "@5.5"],
  annotation: [
    { type: 'expected', description: "คำสั่ง 1 ยอด ฿1,510 (฿520×3 = ฿1,560 − NEWCAT50 ฿50 = ฿1,510 ≥ ฿999 ส่งฟรี ไม่ว่าคิดเกณฑ์ก่อนหรือหลังลด) · คำสั่ง 2 ยอด ฿70 (฿35×2 + FREESHIP ค่าส่ง ฿0) · `/account`: 2 คำสั่ง ยอดซื้อสะสม ฿1,580 (฿1,510 + ฿70) — ถ้าได้ ฿1,630 แปลว่านับยอดก่อนลด" },
    { type: 'source', description: "[D]+[R] · R126 · R111 · ความเสี่ยง: นับยอดก่อนลดเป็นยอดสะสม · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await test.step('เงื่อนไขก่อนเริ่ม: สมัครใหม่ qa-acc-02-{run} / Paw12345', async () => {
    await register(page.request, 'qa-acc-02');
  });
  let n1 = '';
  let n2 = '';
  await test.step('1. สั่งคำสั่ง 1: สูตรลดก้อนขน ×3 + NEWCAT50 ส่งธรรมดา', async () => {
    n1 = await orderViaUI(page, { items: [HAIRBALL(3)], coupon: 'NEWCAT50', shipping: 'standard' });
  });
  await test.step('2. สั่งคำสั่ง 2: ทูน่าซอง ×2 + FREESHIP ส่งธรรมดา', async () => {
    n2 = await orderViaUI(page, { items: [TUNA(2)], coupon: 'FREESHIP', shipping: 'standard' });
  });
  await test.step('3. ดู /account', async () => {
    await accountStats(page);
  });
  await check(page, 'คำสั่ง 1 ยอด ฿1,510 (฿1,560 − NEWCAT50 ฿50 ส่งฟรี)', orderRow(page, n1), async (el) => {
    await expect.soft(el).toContainText('฿1,510');
  });
  await check(page, 'คำสั่ง 2 ยอด ฿70 (฿35×2 + FREESHIP ค่าส่ง ฿0)', orderRow(page, n2), async (el) => {
    await expect.soft(el).toContainText(/฿70(?!\d)/);
  });
  await check(page, '/account: 2 คำสั่ง', statDd(page, 'คำสั่งซื้อ'), async (el) => {
    await expect.soft(el).toHaveText('2');
  });
  await check(page, '/account: ยอดซื้อสะสม ฿1,580 (฿1,510 + ฿70) — ถ้าได้ ฿1,630 แปลว่านับยอดก่อนลด', statDd(page, 'ยอดซื้อสะสม'), async (el) => {
    await expect.soft(el).toHaveText('฿1,580');
  });
});

test("TC-ACC-003 แถวประวัติ: เลขคำสั่ง จำนวนชิ้น สถานะ ยอดสุทธิ เรียงใหม่→เก่า และคลิกเข้ารายละเอียดได้", {
  tag: ["@P2", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: 2 แถว แถวบนสุด = N2 แถวที่สอง = N1 · แถว N2: 1 ชิ้น · \"รับคำสั่งซื้อ\" · ฿590 · แถว N1: 3 ชิ้น · ฿617 (จำนวนชิ้น = ผลรวม qty ของคำสั่ง) · ข้อ 2: URL `/orders/N2` · ข้อ 3: สถานะบนหน้ารายละเอียดเหมือนในแถว (\"รับคำสั่งซื้อ\" สำหรับ PromptPay)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R128 · Q29 · ความเสี่ยง: ลูกค้าหาคำสั่งล่าสุดไม่เจอ/สถานะสองหน้าขัดกัน · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  let n1 = '';
  let n2 = '';
  await test.step('เงื่อนไขก่อนเริ่ม: สมัครใหม่ qa-acc-03-{run} · สั่ง N1 (ลูกแมว ×3 ส่งธรรมดา COD ฿617) และ N2 (สูตรลดก้อนขน ×1 + NEWCAT50 ส่งด่วน PromptPay ฿590)', async () => {
    await register(page.request, 'qa-acc-03');
    n1 = await orderViaUI(page, { items: [KITTEN(3)], shipping: 'standard', payment: 'cod' });
    n2 = await orderViaUI(page, { items: [HAIRBALL(1)], coupon: 'NEWCAT50', shipping: 'express', payment: 'promptpay' });
  });
  await test.step('1. เปิด /account อ่านแถว', async () => {
    await accountStats(page);
  });
  const rows = page.getByTestId('order-row');
  await check(page, 'ข้อ 1: 2 แถว แถวบนสุด = N2 แถวที่สอง = N1', rows, async (el) => {
    await expect.soft(el).toHaveCount(2);
    await expect.soft(el.nth(0)).toContainText(n2);
    await expect.soft(el.nth(1)).toContainText(n1);
  }, { actual: async () => `N1=${n1} · N2=${n2}\n${(await rows.allInnerTexts()).join('\n')}` });
  await check(page, 'ข้อ 1: แถว N2: 1 ชิ้น · "รับคำสั่งซื้อ" · ฿590', orderRow(page, n2), async (el) => {
    await expect.soft(el).toContainText(/(^|\D)1\s*ชิ้น/, { useInnerText: true });
    await expect.soft(el).toContainText('รับคำสั่งซื้อ');
    await expect.soft(el).toContainText(/฿590(?!\d)/);
  });
  await check(page, 'ข้อ 1: แถว N1: 3 ชิ้น · ฿617 (จำนวนชิ้น = ผลรวม qty)', orderRow(page, n1), async (el) => {
    await expect.soft(el).toContainText(/(^|\D)3\s*ชิ้น/, { useInnerText: true });
    await expect.soft(el).toContainText(/฿617(?!\d)/);
  });
  await test.step('2. คลิกแถวบนสุด', async () => {
    await rows.first().click();
    await page.waitForURL(ORDER_URL).catch(() => {});
  });
  await check(page, 'ข้อ 2: URL /orders/N2', null, async () => {
    await expect.soft(page).toHaveURL(new RegExp(`/orders/${n2}$`));
  });
  await test.step('3. เทียบสถานะบนหน้ารายละเอียด', async () => {});
  await check(page, 'ข้อ 3: สถานะบนหน้ารายละเอียดเหมือนในแถว ("รับคำสั่งซื้อ" สำหรับ PromptPay)', page.getByTestId('order-timeline').locator('[aria-current="step"]'), async (el) => {
    await expect.soft(el).toContainText('รับคำสั่งซื้อ');
  });
});

test("TC-ACC-004 ประวัติผูกกับบัญชี: ออกแล้วเข้าใหม่ยังอยู่ และบัญชีอื่นไม่เห็น", {
  tag: ["@P2", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: 2 คำสั่ง ยอดซื้อสะสม ฿1,207 เลข N1 N2 เดิม · ข้อ 3: ไม่มีแถว N1 หรือ N2 · จำนวนคำสั่งและยอดซื้อสะสมของ demo เท่ากับ D0 (ไม่ถูกบวก ฿1,207)" },
    { type: 'source', description: "[R] · R127 · Q28 · ความเสี่ยง: ประวัติหาย/ปนข้ามบัญชี · เทคนิค: State" },
  ],
}, async ({ page }) => {
  let d0 = { count: 0, total: 0, ids: [] as string[] };
  let email = '';
  let n1 = '';
  let n2 = '';
  await test.step('เงื่อนไขก่อนเริ่ม: ล็อกอิน demo จด D0 · ออกจากระบบ · สมัคร qa-acc-04-{run} แล้วสั่ง 2 คำสั่งตาม TC-ACC-001 จดเลข N1 N2', async () => {
    await login(page.request);
    d0 = await accountStats(page);
    await logoutViaUI(page);
    email = await register(page.request, 'qa-acc-04');
    n1 = await orderViaUI(page, { items: [KITTEN(3)], shipping: 'standard' });
    n2 = await orderViaUI(page, { items: [HAIRBALL(1)], coupon: 'NEWCAT50', shipping: 'express' });
  });
  await test.step('1. ออกจากระบบ', async () => {
    await logoutViaUI(page);
  });
  await test.step('2. ล็อกอิน qa-acc-04-{run} ใหม่ ดู /account', async () => {
    await page.goto('/login?next=/account');
    await loginViaForm(page, email);
    await page.waitForURL(/\/account$/).catch(() => {});
    await page.getByTestId('profile-card').waitFor();
  });
  await check(page, 'ข้อ 2: 2 คำสั่ง', statDd(page, 'คำสั่งซื้อ'), async (el) => {
    await expect.soft(el).toHaveText('2');
  });
  await check(page, 'ข้อ 2: ยอดซื้อสะสม ฿1,207', statDd(page, 'ยอดซื้อสะสม'), async (el) => {
    await expect.soft(el).toHaveText('฿1,207');
  });
  await check(page, 'ข้อ 2: เลข N1 N2 เดิม', page.getByTestId('order-row'), async () => {
    await expect.soft(orderRow(page, n1)).toHaveCount(1);
    await expect.soft(orderRow(page, n2)).toHaveCount(1);
  }, { actual: async () => `N1=${n1} · N2=${n2}\n${(await page.getByTestId('order-row').allInnerTexts()).join('\n')}` });
  await test.step('3. ออกจากระบบ ล็อกอิน demo ดู /account', async () => {
    await logoutViaUI(page);
    await page.goto('/login?next=/account');
    await loginViaForm(page, DEMO);
    await page.waitForURL(/\/account$/).catch(() => {});
    await page.getByTestId('profile-card').waitFor();
  });
  await check(page, 'ข้อ 3: ไม่มีแถว N1 หรือ N2', page.getByTestId('order-history'), async () => {
    await expect.soft(orderRow(page, n1)).toHaveCount(0);
    await expect.soft(orderRow(page, n2)).toHaveCount(0);
  });
  await check(page, `ข้อ 3: จำนวนคำสั่งของ demo เท่ากับ D0 (${d0.count})`, statDd(page, 'คำสั่งซื้อ'), async (el) => {
    await expect.soft(el).toHaveText(String(d0.count));
  });
  await check(page, `ข้อ 3: ยอดซื้อสะสมของ demo เท่ากับ D0 (${baht(d0.total)}) ไม่ถูกบวก ฿1,207`, statDd(page, 'ยอดซื้อสะสม'), async (el) => {
    await expect.soft(el).toHaveText(baht(d0.total));
  });
});

test("TC-ACC-005 ไม่ล็อกอินเปิด `/account` ต้องไปล็อกอินแล้วกลับมา", {
  tag: ["@P1", "@5.5"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: URL = `/login?next=/account` (หรือ `next=%2Faccount`) ไม่เห็นข้อมูลบัญชี · ข้อ 3: URL = `/account`" },
    { type: 'source', description: "[R] · ส่วน A (แถว `/account`) · R125 (กฎเดียวกันของหน้าคำสั่งซื้อ) · ดู TC-SESS-002 ขั้น 4 ด้วย (กรณีหลังออกจากระบบ) · ความเสี่ยง: เห็นอีเมล ยอดสะสม และประวัติโดยไม่ล็อกอิน · เทคนิค: Negative, Security" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /account (ไม่ล็อกอิน)', async () => {
    await page.goto('/account');
  });
  await test.step('2. ดู URL', async () => {});
  await check(page, 'ข้อ 2: URL = /login?next=/account (หรือ next=%2Faccount)', null, async () => {
    await expect.soft(page).toHaveURL(/\/login\?next=(\/|%2F)account$/);
  });
  await check(page, 'ข้อ 2: ไม่เห็นข้อมูลบัญชี', page.locator('main'), async (el) => {
    await expect.soft(page.getByTestId('profile-card')).toHaveCount(0);
    await expect.soft(page.getByTestId('order-history')).toHaveCount(0);
    await expect.soft(el).not.toContainText('ยอดซื้อสะสม');
  });
  await test.step('3. ล็อกอิน demo', async () => {
    await loginViaForm(page, DEMO);
    await page.waitForURL(/\/account$/, { timeout: 10_000 }).catch(() => {});
  });
  await check(page, 'ข้อ 3: URL = /account', null, async () => {
    await expect.soft(page).toHaveURL(/\/account$/);
  });
});
