/**
 * หัวข้อ 5.3 ตะกร้าสินค้า (TEST-PLAN.md) — โมดูล CART, XSELL · 27 test case
 * ตะกร้าเก็บใน localStorage `pp-cart` = [{ slug, size, qty }] · ตัวนับ 🛒 = data-testid "cart-count"
 * บรรทัดในตะกร้า = [data-testid=cart-item][data-slug][data-size]
 */
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { test, expect, check, checkApi, blocked, runEmail, baseURL } from './support/pp';

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };
const ADDR = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  address: '99/1 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  postcode: '10110',
};
/** ป้ายขนาดตามหน้าสินค้า (data-size) */
const S = {
  adult: '1.2 kg',
  tuna: 'ซอง 85 g',
  k400: '400 g',
  k15: '1.5 kg',
  hairball: '1.5 kg',
  freeze: '50 g',
  fountain: '2 ลิตร',
  mousse: 'ซอง 85 g',
  lick: '4 ซอง',
};

type CartLine = { slug: string; size: string; qty: number; [k: string]: unknown };

const baht = (n: number) => '฿' + n.toLocaleString('en-US');
const parseBaht = (s: string | null | undefined) => Number(String(s ?? '').replace(/[^\d.-]/g, ''));
/** ค่าส่ง ฿0 — เว็บอาจแสดงเป็น "฿0" หรือ "ฟรี" (แผนหัวข้อ 5.4 ใช้ ค่าส่ง "ฟรี" (฿0) เป็นค่าเดียวกัน) */
const FREE = /^\s*(฿0|ฟรี)\s*$/;

async function readCart(page: Page): Promise<CartLine[] | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('pp-cart');
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw as unknown as null;
    }
  });
}
async function writeCart(page: Page, items: unknown): Promise<void> {
  await page.evaluate((v) => localStorage.setItem('pp-cart', JSON.stringify(v)), items);
}
/** จำนวนรายการใน pp-cart (ไม่มี key = 0) */
const cartLen = (c: CartLine[] | null) => (Array.isArray(c) ? c.length : 0);
const qtyOf = (c: CartLine[] | null, slug: string, size?: string) =>
  Array.isArray(c) ? c.filter((i) => i.slug === slug && (!size || i.size === size)).map((i) => i.qty) : [];

/** รอให้หน้าโหลดและ hydrate */
async function ready(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/** ใส่ตะกร้าผ่านหน้าสินค้า: เลือกขนาด ตั้งจำนวน กด "🛒 เพิ่มลงตะกร้า" */
async function addFromPdp(page: Page, slug: string, size: string | null, qty: number): Promise<void> {
  await page.goto(`/products/${slug}`);
  await ready(page);
  if (size) {
    await page.locator(`[data-testid="size-option"][data-size="${size}"]`).click();
    await page.locator(`[data-testid="size-option"][data-size="${size}"][aria-pressed="true"]`).waitFor();
  }
  const q = page.getByTestId('qty-input');
  await q.fill(String(qty));
  await q.press('Tab');
  const before = await page.evaluate(() => localStorage.getItem('pp-cart'));
  await page.getByTestId('add-to-cart').click();
  await page
    .waitForFunction((b) => localStorage.getItem('pp-cart') !== b, before, { timeout: 5000 })
    .catch(() => {});
}

/** เปิด /cart แล้วรอจนเห็นบรรทัดสินค้าหรือข้อความตะกร้าว่าง */
async function openCart(page: Page): Promise<void> {
  await page.goto('/cart');
  await reloadedCart(page);
}
async function reloadedCart(page: Page): Promise<void> {
  await ready(page);
  await page
    .locator('[data-testid="cart-item"], [data-testid="empty-cart"]')
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
}

const row = (page: Page, slug: string, size?: string): Locator =>
  page.locator(`[data-testid="cart-item"][data-slug="${slug}"]${size ? `[data-size="${size}"]` : ''}`);

async function checkCount(page: Page, n: number, label = ''): Promise<void> {
  await check(page, `${label}🛒 = ${n}`, page.getByTestId('cart-count'), async (el) => {
    await expect.soft(el).toHaveText(String(n));
  });
}

async function checkRows(page: Page, n: number, label = ''): Promise<void> {
  await check(page, `${label}มี ${n} บรรทัด`, page.getByTestId('cart-item'), async (el) => {
    await expect.soft(el).toHaveCount(n);
  }, { actual: async () => `${await page.getByTestId('cart-item').count()} บรรทัด: ${(await page.getByTestId('cart-item').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' | ')}` });
}

/** ตรวจบรรทัด: จำนวนในช่อง (ถ้าระบุ) และยอดบรรทัด */
async function checkLine(page: Page, label: string, slug: string, size: string | undefined, qty: number | null, total: number): Promise<void> {
  const r = row(page, slug, size);
  if (qty !== null) {
    await check(page, `${label} ช่องจำนวน ${qty}`, r.getByTestId('item-qty'), async (el) => {
      await expect.soft(el).toHaveValue(String(qty));
    });
  }
  await check(page, `${label} ยอดบรรทัด ${baht(total)}`, r.getByTestId('item-line-total'), async (el) => {
    await expect.soft(el).toHaveText(baht(total));
  });
}

/** ตรวจสรุปยอด: ยอดรวมสินค้า / ค่าส่ง / ยอดชำระ (ส่ง undefined เพื่อข้าม) */
async function checkSummary(
  page: Page,
  exp: { subtotal?: number; shipping?: number; total?: number },
  label = '',
): Promise<void> {
  if (exp.subtotal !== undefined) {
    await check(page, `${label}ยอดรวมสินค้า ${baht(exp.subtotal)}`, page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText(baht(exp.subtotal!));
    });
  }
  if (exp.shipping !== undefined) {
    await check(page, `${label}ค่าส่ง ${baht(exp.shipping)}`, page.getByTestId('summary-shipping'), async (el) => {
      if (exp.shipping === 0) await expect.soft(el).toHaveText(FREE);
      else await expect.soft(el).toHaveText(baht(exp.shipping!));
    });
  }
  if (exp.total !== undefined) {
    await check(page, `${label}ยอดชำระ ${baht(exp.total)}`, page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText(baht(exp.total!));
    });
  }
}

/** ตรวจ qty ใน pp-cart ของสินค้าหนึ่ง */
async function checkLsQty(page: Page, label: string, slug: string, size: string | undefined, qty: number): Promise<void> {
  await page
    .waitForFunction(
      ([s, z, q]) => {
        try {
          return (JSON.parse(localStorage.getItem('pp-cart') || '[]') as CartLine[]).some(
            (i) => i.slug === s && (!z || i.size === z) && i.qty === q,
          );
        } catch {
          return false;
        }
      },
      [slug, size ?? '', qty] as const,
      { timeout: 2000 },
    )
    .catch(() => {});
  await check(page, `${label}qty ${slug} ใน pp-cart = ${qty}`, null, async () => {
    expect.soft(qtyOf(await readCart(page), slug, size)).toEqual([qty]);
  }, { actual: () => readCart(page) });
}

/** ข้อความในบรรทัดที่ไม่ใช่ชื่อ ขนาด ราคาต่อชิ้น ยอด ช่องจำนวน (= ข้อความเตือน/ป้าย) */
async function rowNoteText(r: Locator): Promise<string> {
  if ((await r.count()) === 0) return '(ไม่พบบรรทัด)';
  return r.first().evaluate((el) => {
    const c = el.cloneNode(true) as HTMLElement;
    c.querySelector('[data-testid="item-size"]')?.parentElement?.remove();
    c.querySelectorAll(
      '[data-testid="item-name"],[data-testid="item-line-total"],[data-testid="item-remove"],.qty,.unit-price,.row-thumb,label',
    ).forEach((n) => n.remove());
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  });
}
async function checkRowWarning(page: Page, label: string, r: Locator, n: number): Promise<void> {
  const re = new RegExp(`(^|\\D)${n}(\\D|$)`);
  await check(page, label, r, async () => {
    for (let i = 0; i < 10 && !re.test(await rowNoteText(r)); i++) await page.waitForTimeout(300);
    expect.soft(await rowNoteText(r)).toMatch(re);
  }, { actual: () => rowNoteText(r) });
}

/** ปุ่ม "ดำเนินการชำระเงิน →" ถูกปิด (disabled หรือ aria-disabled="true") */
async function checkoutBtnState(page: Page): Promise<{ disabled: boolean; ariaDisabled: string | null; exists: boolean }> {
  const b = page.getByTestId('checkout-button');
  if ((await b.count()) === 0) return { disabled: false, ariaDisabled: null, exists: false };
  return { disabled: await b.isDisabled(), ariaDisabled: await b.getAttribute('aria-disabled'), exists: true };
}

async function loginApi(page: Page): Promise<void> {
  const r = await page.request.post('/api/auth/login', { data: DEMO });
  if (!r.ok()) throw new Error(`ล็อกอิน demo ไม่สำเร็จ: HTTP ${r.status()}`);
}

/** กรอกที่อยู่ตามหมายเหตุร่วม · ส่งธรรมดา · เก็บเงินปลายทาง */
async function fillCheckout(page: Page): Promise<void> {
  await page.getByTestId('ship-name').fill(ADDR.name);
  await page.getByTestId('ship-phone').fill(ADDR.phone);
  await page.getByTestId('ship-address').fill(ADDR.address);
  await page.getByTestId('ship-province').selectOption(ADDR.province);
  await page.getByTestId('ship-postcode').fill(ADDR.postcode);
  await page.getByTestId('shipping-standard').check();
  await page.getByTestId('pay-cod').check();
}

/** context B: ล็อกอิน demo ใส่สินค้าแล้วสั่งซื้อให้สำเร็จผ่านหน้าเว็บ */
async function orderInOtherContext(ctx: BrowserContext, slug: string, size: string, qty: number): Promise<Page> {
  const pb = await ctx.newPage();
  await loginApi(pb);
  await addFromPdp(pb, slug, size, qty);
  await pb.goto('/checkout');
  await ready(pb);
  await fillCheckout(pb);
  await pb.getByTestId('place-order').click();
  await pb.waitForURL(/\/orders\/PP-/, { timeout: 15000 });
  return pb;
}

/** "จำนวนคำสั่ง" ใน /account */
const orderCountCell = (page: Page) =>
  page.getByTestId('profile-card').locator('dl > div').filter({ hasText: 'คำสั่งซื้อ' }).locator('dd');

/** ราคาขนาดเล็กสุดในหน้าสินค้า (อ่านจากปุ่มขนาด) */
async function smallestPdpPrice(p: Page): Promise<number> {
  await p.getByTestId('size-option').first().waitFor();
  const prices = (await p.getByTestId('size-option').allInnerTexts()).map((t) => parseBaht(t.match(/฿[\d,]+/)?.[0]));
  return Math.min(...prices);
}

const summaryBox = (page: Page) => page.locator('aside').filter({ has: page.getByTestId('summary-total') });
const recoBox = (page: Page) => page.getByTestId('cart-recommendations');

test("TC-CART-001 ยอดต่อบรรทัด ยอดรวม ค่าส่ง และตัวนับ 🛒 เมื่อยอดต่ำกว่าเกณฑ์ส่งฟรี ฿1", {
  tag: ['@P1', '@5.3', '@mobile-too'],
  annotation: [
    { type: 'expected', description: "มี 2 บรรทัด: แมวโต สูตรไก่ 1.2 kg ×2 = ฿718 (฿359×2) · ทูน่าซอง ×8 = ฿280 (฿35×8) · ยอดรวมสินค้า ฿998 (฿718 + ฿280) · ค่าส่ง ฿50 (฿998 < ฿999) · ยอดชำระ ฿1,048 (฿998 + ฿50) · 🛒 = 10 (2 + 8 ไม่ใช่ 2 บรรทัด)" },
    { type: 'source', description: "[R]+[D] · R62 · R63 · ขอบเกณฑ์ส่งฟรี ฿998/฿999 ตรวจละเอียดใน TC-SHIP-002 (ข้อนี้เน้นยอดบรรทัดและ 🛒) · ความเสี่ยง: ยอดบรรทัด/ยอดรวมคิดผิด ตัวนับนับเป็นจำนวนบรรทัด · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  // จอตาม project: desktop 1280×800 · มือถือ 375×812 (ตั้งใน playwright.config.ts)
  await test.step('1. เปิด /products/adult-chicken-dry เลือก 1.2 kg ตั้งจำนวน 2 กด "🛒 เพิ่มลงตะกร้า"', async () => {
    await addFromPdp(page, 'adult-chicken-dry', S.adult, 2);
  });
  await test.step('2. เปิด /products/tuna-pouch ตั้งจำนวน 8 กดเพิ่มลงตะกร้า', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 8);
  });
  await test.step('3. เปิด /cart อ่านทุกบรรทัดและสรุปยอด', async () => {
    await openCart(page);
  });
  await checkRows(page, 2);
  await checkLine(page, 'แมวโต สูตรไก่ 1.2 kg', 'adult-chicken-dry', S.adult, 2, 718);
  await checkLine(page, 'ทูน่าซอง', 'tuna-pouch', undefined, 8, 280);
  await checkSummary(page, { subtotal: 998, shipping: 50, total: 1048 });
  await test.step('4. อ่านตัวนับ 🛒 บนหัวเว็บ', async () => {});
  await checkCount(page, 10, '(2 + 8 ไม่ใช่ 2 บรรทัด) ');
});

test("TC-CART-002 สินค้าเดียวกันคนละขนาดแยกบรรทัด และขนาดเดียวกันรวมบรรทัดเดิม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "หลังข้อ 3: 2 บรรทัด 1.5 kg ×1 = ฿590 และ 400 g ×1 = ฿189 · ยอดรวมสินค้า ฿779 (฿590 + ฿189) · ค่าส่ง ฿50 · ยอดชำระ ฿829 · 🛒 2 · หลังข้อ 5: ยังเป็น 2 บรรทัด (ไม่มีบรรทัด 400 g ซ้ำ) 400 g ×2 = ฿378 (฿189×2) · ยอดรวมสินค้า ฿968 (฿590 + ฿378) · ค่าส่ง ฿50 · ยอดชำระ ฿1,018 · 🛒 3" },
    { type: 'source', description: "[R]+[D] · R62 · R63 · ความเสี่ยง: ขนาดต่างกันถูกรวมเป็นบรรทัดเดียว (ราคาผิดขนาด) หรือขนาดเดียวกันแตกเป็นหลายบรรทัด · เทคนิค: Happy path · Equivalence partition" },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 1.5 kg จำนวน 1 กดเพิ่มลงตะกร้า', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k15, 1);
  });
  await test.step('2. เลือก 400 g จำนวน 1 กดเพิ่มลงตะกร้า', async () => {
    await page.locator(`[data-testid="size-option"][data-size="${S.k400}"]`).click();
    await page.locator(`[data-testid="size-option"][data-size="${S.k400}"][aria-pressed="true"]`).waitFor();
    await page.getByTestId('qty-input').fill('1');
    await page.getByTestId('qty-input').press('Tab');
    const before = await page.evaluate(() => localStorage.getItem('pp-cart'));
    await page.getByTestId('add-to-cart').click();
    await page.waitForFunction((b) => localStorage.getItem('pp-cart') !== b, before, { timeout: 5000 }).catch(() => {});
  });
  await test.step('3. เปิด /cart จดบรรทัดและยอด', async () => {
    await openCart(page);
  });
  await checkRows(page, 2, 'หลังข้อ 3: ');
  await checkLine(page, 'หลังข้อ 3: 1.5 kg', 'kitten-salmon-dry', S.k15, 1, 590);
  await checkLine(page, 'หลังข้อ 3: 400 g', 'kitten-salmon-dry', S.k400, 1, 189);
  await checkSummary(page, { subtotal: 779, shipping: 50, total: 829 }, 'หลังข้อ 3: ');
  await checkCount(page, 2, 'หลังข้อ 3: ');
  await test.step('4. กลับหน้าสินค้า เลือก 400 g จำนวน 1 กดเพิ่มอีกครั้ง', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
  });
  await test.step('5. เปิด /cart อีกครั้ง', async () => {
    await openCart(page);
  });
  await checkRows(page, 2, 'หลังข้อ 5 (ไม่มีบรรทัด 400 g ซ้ำ): ');
  await check(page, 'หลังข้อ 5: บรรทัด 400 g มีบรรทัดเดียว', row(page, 'kitten-salmon-dry', S.k400), async (el) => {
    await expect.soft(el).toHaveCount(1);
  });
  await checkLine(page, 'หลังข้อ 5: 400 g', 'kitten-salmon-dry', S.k400, 2, 378);
  await checkSummary(page, { subtotal: 968, shipping: 50, total: 1018 }, 'หลังข้อ 5: ');
  await checkCount(page, 3, 'หลังข้อ 5: ');
});

test("TC-CART-003 ปุ่ม + / − ในตะกร้าอัปเดตยอดบรรทัด สรุปยอด ตัวนับ และ `pp-cart` ทุกครั้ง", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ช่องจำนวน 2 · ฿70 (฿35×2) · ยอดชำระ ฿120 (฿70 + ส่ง ฿50) · 🛒 2 · ข้อ 2: 3 · ฿105 (฿35×3) · ยอดชำระ ฿155 (฿105 + ฿50) · 🛒 3 · ข้อ 3: 2 · ฿70 · ยอดชำระ ฿120 · 🛒 2 · qty ใน `pp-cart` = ค่าในช่องทุกขั้น (2, 3, 2)" },
    { type: 'source', description: "[R]+[D] · R62 · R63 · R64 · ความเสี่ยง: UI กับ localStorage ไม่ตรงกัน ตัวนับไม่เปลี่ยนตาม · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ทูน่าซอง ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  const plus = row(page, 'tuna-pouch').getByTestId('item-plus');
  const minus = row(page, 'tuna-pouch').getByTestId('item-minus');
  const stages: [string, Locator, number, number, number][] = [
    ['1. ที่บรรทัดทูน่าซอง กด + 1 ครั้ง อ่านยอด', plus, 2, 70, 120],
    ['2. กด + อีก 1 ครั้ง อ่านยอด', plus, 3, 105, 155],
    ['3. กด − 1 ครั้ง อ่านยอด', minus, 2, 70, 120],
  ];
  for (const [name, btn, q, line, total] of stages) {
    const n = name.split('.')[0];
    await test.step(name, async () => {
      await btn.click();
    });
    await checkLine(page, `ข้อ ${n}`, 'tuna-pouch', undefined, q, line);
    await checkSummary(page, { total }, `ข้อ ${n} `);
    await checkCount(page, q, `ข้อ ${n} `);
    await test.step(`4. ดูค่า qty ของทูน่าใน pp-cart (หลังข้อ ${n})`, async () => {});
    await checkLsQty(page, `ข้อ ${n} `, 'tuna-pouch', undefined, q);
  }
});

test("TC-CART-004 ลบบรรทัดด้วย ✕ จนตะกร้าว่าง ยอดและตัวนับลดตาม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ยอดรวมสินค้า ฿259 (฿189 + ฿35×2) · ยอดชำระ ฿309 (+ ส่ง ฿50) · ข้อ 2: เหลือ 1 บรรทัด · ยอดชำระ ฿120 (฿70 + ฿50) · 🛒 2 · ข้อ 3–4: ไม่มีบรรทัดสินค้า · 🛒 0 · `pp-cart` ไม่มีรายการ (ไม่มี key หรือเป็นรายการว่าง) · ไม่มียอดชำระ ฿50 ค้าง (ค่าส่งไม่ถูกคิดกับตะกร้าว่าง)" },
    { type: 'source', description: "[R]+[D] · R62 · R63 · กรณีล็อกอินแล้วตะกร้าว่างเปิด `/checkout` → `/cart` ตรวจใน TC-CHK-003 · ความเสี่ยง: ลบแล้วยอด/ตัวนับไม่ลด ตะกร้าว่างแต่ยังเก็บค่าส่ง · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ลูกแมว สูตรแซลมอน 400 g ×1 + ทูน่าซอง ×2 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(page, 'tuna-pouch', null, 2);
    await openCart(page);
  });
  await test.step('1. อ่านสรุปยอดก่อนลบ', async () => {});
  await checkSummary(page, { subtotal: 259, total: 309 }, 'ข้อ 1: ');
  await test.step('2. กด ✕ ที่บรรทัดลูกแมว สูตรแซลมอน', async () => {
    await row(page, 'kitten-salmon-dry').getByTestId('item-remove').click();
  });
  await checkRows(page, 1, 'ข้อ 2: เหลือ ');
  await checkSummary(page, { total: 120 }, 'ข้อ 2: ');
  await checkCount(page, 2, 'ข้อ 2: ');
  await test.step('3. กด ✕ ที่บรรทัดทูน่าซอง', async () => {
    await row(page, 'tuna-pouch').getByTestId('item-remove').click();
  });
  await test.step('4. ดู pp-cart และตัวนับ 🛒', async () => {});
  await checkRows(page, 0, 'ข้อ 3–4: ไม่มีบรรทัดสินค้า · ');
  await checkCount(page, 0, 'ข้อ 3–4: ');
  await check(page, 'ข้อ 3–4: pp-cart ไม่มีรายการ (ไม่มี key หรือเป็นรายการว่าง)', null, async () => {
    expect.soft(cartLen(await readCart(page))).toBe(0);
  }, { actual: () => readCart(page) });
  await check(page, 'ข้อ 3–4: ไม่มียอดชำระ ฿50 ค้าง (ค่าส่งไม่ถูกคิดกับตะกร้าว่าง)', page.locator('main'), async (el) => {
    // ตะกร้าว่างอาจไม่มีกล่องสรุปเลย (ผ่าน) · ถ้ามี ต้องไม่แสดงยอดชำระ/ค่าส่ง ฿50
    await expect.soft(page.getByTestId('summary-total').filter({ hasText: /฿50(?![\d,.])/ })).toHaveCount(0);
    await expect.soft(page.getByTestId('summary-shipping').filter({ hasText: /฿50(?![\d,.])/ })).toHaveCount(0);
    await expect.soft(el).not.toContainText(/฿50(?![\d,.])/);
  });
});

test("TC-CART-005 ลบบรรทัดด้วย ✕ จนยอดตกต่ำกว่าเกณฑ์ส่งฟรี ค่าส่งต้องกลับมาทันที และบรรทัดที่เหลือไม่เปลี่ยน", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ยอดรวมสินค้า ฿999 (฿890 + ฿35×2 + ฿39) · ค่าส่ง ฿0 · ยอดชำระ ฿999 · 🛒 4 · ข้อ 3: ไม่มีบรรทัดมูสไก่ลูกแมว · เหลือน้ำพุแมว ×1 = ฿890 และทูน่าซอง ×2 = ฿70 (฿35×2) · ยอดรวมสินค้า ฿960 (฿890 + ฿70) · ค่าส่ง ฿50 (฿960 < ฿999) · ยอดชำระ ฿1,010 (฿960 + ฿50) · 🛒 3" },
    { type: 'source', description: "[D]+[R] · R62 · R63 · การข้ามเกณฑ์ด้วยการเปลี่ยนจำนวน (+/−) ตรวจใน TC-SHIP-005 · ความเสี่ยง: ลบบรรทัดแล้วค่าส่งไม่คิดใหม่ ยังได้ส่งฟรีทั้งที่ยอดต่ำกว่า ฿999 · เทคนิค: Boundary · State" },
  ],
}, async ({ page }) => {
  await test.step('1. ใส่น้ำพุแมว ×1, ทูน่าซอง ×2, มูสไก่ลูกแมว 85 g ×1 ลงตะกร้า', async () => {
    await addFromPdp(page, 'cat-fountain', null, 1);
    await addFromPdp(page, 'tuna-pouch', null, 2);
    await addFromPdp(page, 'kitten-chicken-mousse', S.mousse, 1);
  });
  await test.step('2. เปิด /cart อ่านสรุปยอด (ตั้งต้น)', async () => {
    await openCart(page);
  });
  await checkSummary(page, { subtotal: 999, shipping: 0, total: 999 }, 'ข้อ 2: ');
  await checkCount(page, 4, 'ข้อ 2: ');
  await test.step('3. กด ✕ ที่บรรทัดมูสไก่ลูกแมว (ไม่ reload) อ่านทุกบรรทัด สรุปยอด และ 🛒', async () => {
    await row(page, 'kitten-chicken-mousse').getByTestId('item-remove').click();
  });
  await check(page, 'ข้อ 3: ไม่มีบรรทัดมูสไก่ลูกแมว', row(page, 'kitten-chicken-mousse'), async (el) => {
    await expect.soft(el).toHaveCount(0);
  });
  await checkRows(page, 2, 'ข้อ 3: ');
  await checkLine(page, 'ข้อ 3: น้ำพุแมว', 'cat-fountain', undefined, 1, 890);
  await checkLine(page, 'ข้อ 3: ทูน่าซอง', 'tuna-pouch', undefined, 2, 70);
  await checkSummary(page, { subtotal: 960, shipping: 50, total: 1010 }, 'ข้อ 3: ');
  await checkCount(page, 3, 'ข้อ 3: ');
});

test("TC-CART-006 เพดานจำนวนเท่าสต็อกของสินค้าใกล้หมด (สูตรลดก้อนขน 3 ชิ้น) และยอดข้ามเกณฑ์ส่งฟรี", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ฿520 · ยอดชำระ ฿570 (฿520 + ส่ง ฿50) · ข้อ 2: ฿1,040 (฿520×2) · ค่าส่ง ฿0 (≥ ฿999) · ยอดชำระ ฿1,040 · ข้อ 3: ฿1,560 (฿520×3) · ยอดชำระ ฿1,560 · ข้อ 4–5: ช่องจำนวนยังเป็น 3 · ยอดชำระ ฿1,560 · 🛒 3 · ปุ่ม + มี `disabled` หรือกดแล้วค่าไม่เปลี่ยน · ข้อ 6: qty = 3 (ไม่ใช่ 4)" },
    { type: 'source', description: "[D]+[R] · R64 · ความเสี่ยง: ใส่เกินสต็อกที่เหลือน้อย จนไปเจอ 409 ตอนยืนยัน · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่สูตรลดก้อนขน 1.5 kg ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'hairball-control-dry', S.hairball, 1);
    await openCart(page);
  });
  const r = row(page, 'hairball-control-dry');
  await test.step('1. อ่านสรุปยอดที่ ×1', async () => {});
  await checkLine(page, 'ข้อ 1:', 'hairball-control-dry', undefined, null, 520);
  await checkSummary(page, { total: 570 }, 'ข้อ 1: ');
  await test.step('2. กด + (×2) อ่านสรุปยอด', async () => {
    await r.getByTestId('item-plus').click();
  });
  await checkLine(page, 'ข้อ 2:', 'hairball-control-dry', undefined, null, 1040);
  await checkSummary(page, { shipping: 0, total: 1040 }, 'ข้อ 2: ');
  await test.step('3. กด + (×3) อ่านสรุปยอด', async () => {
    await r.getByTestId('item-plus').click();
  });
  await checkLine(page, 'ข้อ 3:', 'hairball-control-dry', undefined, null, 1560);
  await checkSummary(page, { total: 1560 }, 'ข้อ 3: ');
  let plusDisabled = false;
  await test.step('4. กด + อีก 1 ครั้ง', async () => {
    const p = r.getByTestId('item-plus');
    plusDisabled = (await p.isDisabled()) || (await p.getAttribute('aria-disabled')) === 'true';
    if (!plusDisabled) await p.click();
  });
  await check(page, 'ข้อ 4: ปุ่ม + มี disabled หรือกดแล้วค่าไม่เปลี่ยน (ยัง 3)', r.getByTestId('item-qty'), async (el) => {
    await expect.soft(el).toHaveValue('3');
  }, { actual: async () => `ช่องจำนวน ${await r.getByTestId('item-qty').inputValue()} · ปุ่ม + disabled=${plusDisabled}` });
  await test.step('5. ลบค่าในช่องจำนวนแล้วพิมพ์ 4 กด Tab', async () => {
    const q = r.getByTestId('item-qty');
    await q.click();
    await q.press('ControlOrMeta+a');
    await q.press('Backspace');
    await q.pressSequentially('4');
    await q.press('Tab');
  });
  await checkLine(page, 'ข้อ 4–5:', 'hairball-control-dry', undefined, 3, 1560);
  await checkSummary(page, { total: 1560 }, 'ข้อ 4–5: ');
  await checkCount(page, 3, 'ข้อ 4–5: ');
  await test.step('6. ดู qty ใน pp-cart', async () => {});
  await checkLsQty(page, 'ข้อ 6 (ไม่ใช่ 4): ', 'hairball-control-dry', undefined, 3);
});

test("TC-CART-007 เพดานจำนวนเท่าสต็อกเมื่อพิมพ์ค่าที่ขอบและเกินมาก (ทูน่าซอง สต็อก 60)", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ช่องจำนวน 60 · ฿2,100 (฿35×60) · ค่าส่ง ฿0 (≥ ฿999) · ยอดชำระ ฿2,100 · ข้อ 2 และ 3: ช่องจำนวนเป็น 60 (ไม่ใช่ 61 / 99999) · ยอดชำระ ฿2,100 · ข้อ 4: qty = 60 · 🛒 60" },
    { type: 'source', description: "[R]+[D] · R64 · ความเสี่ยง: พิมพ์เกินสต็อกแล้วยอดเงินบวม · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ทูน่าซอง ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  const q = row(page, 'tuna-pouch').getByTestId('item-qty');
  await test.step("1. ใส่ค่า 60 ด้วย locator.fill('60') กด Tab อ่านยอด", async () => {
    await q.fill('60');
    await q.press('Tab');
  });
  await checkLine(page, 'ข้อ 1:', 'tuna-pouch', undefined, 60, 2100);
  await checkSummary(page, { shipping: 0, total: 2100 }, 'ข้อ 1: ');
  for (const v of ['61', '99999']) {
    await test.step(`${v === '61' ? '2' : '3'}. ใส่ ${v} ด้วย fill แล้วกด Tab`, async () => {
      await q.fill(v);
      await q.press('Tab');
    });
    await check(page, `หลังใส่ ${v}: ช่องจำนวนเป็น 60 (ไม่ใช่ ${v})`, q, async (el) => {
      await expect.soft(el).toHaveValue('60');
    });
    await checkSummary(page, { total: 2100 }, `หลังใส่ ${v}: `);
  }
  await test.step('4. ดู qty ใน pp-cart และ 🛒', async () => {});
  await checkLsQty(page, 'ข้อ 4: ', 'tuna-pouch', undefined, 60);
  await checkCount(page, 60, 'ข้อ 4: ');
});

test("TC-CART-008 ช่องจำนวนในตะกร้ากรองค่าที่ผิด (ศูนย์ ติดลบ ทศนิยม ตัวอักษร)", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "`0` / `-2` / `abc`: ช่องจำนวนเป็น 1 · qty = 1 · ฿35 · ยอดชำระ ฿85 (฿35 + ส่ง ฿50) · ไม่มียอดเป็น ฿0 หรือติดลบ · บรรทัดไม่หาย · `2.5`: ช่องจำนวน 2 · qty ใน `pp-cart` = 2 · ยอดบรรทัด ฿70 (฿35×2 ตัดทศนิยมตาม R42/R64) · ยอดชำระ ฿120 (฿70 + ส่ง ฿50) · ไม่มี ฿87.50 · 🛒 เป็นจำนวนเต็มเท่ากับ qty ทุกกรณี" },
    { type: 'source', description: "[R]+[D] · R42 · R64 · การพิมพ์ทีละตัวตรวจใน TC-CART-009 · ความเสี่ยง: จำนวน 0/ติดลบทำยอดติดลบ ทศนิยมทำยอดมีเศษสตางค์ · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ทูน่าซอง ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  const q = row(page, 'tuna-pouch').getByTestId('item-qty');
  const setOne = async () => {
    await q.fill('1');
    await q.press('Tab');
    await page.waitForFunction(() => /"qty":1[,}]/.test(localStorage.getItem('pp-cart') || ''), null, { timeout: 2000 }).catch(() => {});
  };
  const cases: { step: string; v: string; seq?: boolean; qty: number; line: number; total: number }[] = [
    { step: "1. ใส่ค่า 0 ด้วย locator.fill('0') กด Tab", v: '0', qty: 1, line: 35, total: 85 },
    { step: '2. ตั้งกลับเป็น 1 แล้วทำซ้ำกับ -2 (ใช้ fill)', v: '-2', qty: 1, line: 35, total: 85 },
    { step: "3. ตั้งกลับเป็น 1 แล้วทำซ้ำกับ abc (ช่องเป็น type=number จึงใช้ pressSequentially('abc'))", v: 'abc', seq: true, qty: 1, line: 35, total: 85 },
    { step: '4. ตั้งกลับเป็น 1 แล้วทำซ้ำกับ 2.5 (ใช้ fill)', v: '2.5', qty: 2, line: 70, total: 120 },
  ];
  for (const c of cases) {
    await test.step(c.step, async () => {
      await setOne();
      if (c.seq) {
        await q.click();
        await q.press('ControlOrMeta+a');
        await q.pressSequentially(c.v);
      } else {
        await q.fill(c.v);
      }
      await q.press('Tab');
    });
    const tag = `"${c.v}": `;
    await check(page, `${tag}บรรทัดไม่หาย`, row(page, 'tuna-pouch'), async (el) => {
      await expect.soft(el).toHaveCount(1);
    });
    await checkLine(page, tag, 'tuna-pouch', undefined, c.qty, c.line);
    await checkLsQty(page, tag, 'tuna-pouch', undefined, c.qty);
    await checkSummary(page, { total: c.total }, tag);
    // ตรวจเฉพาะยอดเงิน (ยอดบรรทัด ยอดรวมสินค้า ยอดชำระ) — แถว "ส่วนลด ฿0" เป็นค่าปกติ ไม่ใช่ยอดเป็น ฿0
    const moneyEls = page.locator('[data-testid="item-line-total"], [data-testid="summary-subtotal"], [data-testid="summary-total"]');
    await check(page, `${tag}ไม่มียอดเป็น ฿0 หรือติดลบ${c.v === '2.5' ? ' · ไม่มี ฿87.50' : ''}`, moneyEls, async (el) => {
      await expect.soft(el).toHaveCount(3);
      await expect.soft(el.filter({ hasText: /^\s*฿0\s*$/ })).toHaveCount(0);
      await expect.soft(el.filter({ hasText: /-|−/ })).toHaveCount(0);
      if (c.v === '2.5') await expect.soft(page.locator('main')).not.toContainText(/87\.5/);
    }, { actual: async () => (await moneyEls.allInnerTexts()).join(' | ') });
    await checkCount(page, c.qty, `${tag}(จำนวนเต็มเท่ากับ qty) `);
  }
});

test("TC-CART-009 พิมพ์เลขที่มี 0 นำหน้าทีละตัวในช่องจำนวนของตะกร้า", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ช่องจำนวน 5 · ฿4,450 (฿890×5) · ค่าส่ง ฿0 · ยอดชำระ ฿4,450 · 🛒 5 · ข้อ 4: ช่องจำนวน 3 · ฿2,670 (฿890×3) · ยอดชำระ ฿2,670 · 🛒 3 (ตอนนี้ล้ม: \"05\" กลายเป็น 7 ยอด ฿6,230 = ฿890×7)" },
    { type: 'source', description: "[R]+[D] · R44 · R64 · Q11 · ความเสี่ยง: ลูกค้าพิมพ์ 5 แต่ถูกคิดเงิน 7 ชิ้น · เทคนิค: Negative · Boundary" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่น้ำพุแมว ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'cat-fountain', null, 1);
    await openCart(page);
  });
  const q = row(page, 'cat-fountain').getByTestId('item-qty');
  await test.step('1. เลือกค่าทั้งหมดในช่องจำนวนน้ำพุแมว พิมพ์ 0 แล้ว 5 (ทีละตัว) กด Tab', async () => {
    await q.click();
    await q.press('ControlOrMeta+a');
    await q.press('0');
    await q.press('5');
    await q.press('Tab');
  });
  await test.step('2. อ่านช่องจำนวน ยอด และ 🛒', async () => {});
  await checkLine(page, 'ข้อ 2:', 'cat-fountain', undefined, 5, 4450);
  await checkSummary(page, { shipping: 0, total: 4450 }, 'ข้อ 2: ');
  await checkCount(page, 5, 'ข้อ 2: ');
  await test.step('3. เลือกค่าทั้งหมด พิมพ์ 0 0 3 ทีละตัว กด Tab', async () => {
    await q.click();
    await q.press('ControlOrMeta+a');
    await q.press('0');
    await q.press('0');
    await q.press('3');
    await q.press('Tab');
  });
  await test.step('4. อ่านช่องจำนวน ยอด และ 🛒', async () => {});
  await checkLine(page, 'ข้อ 4:', 'cat-fountain', undefined, 3, 2670);
  await checkSummary(page, { total: 2670 }, 'ข้อ 4: ');
  await checkCount(page, 3, 'ข้อ 4: ');
});

test("TC-CART-010 กด − ที่จำนวน 1 ต้องไม่เกิดบรรทัดจำนวน 0 หรือยอดติดลบ", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ไม่มีบรรทัดใดแสดงจำนวน 0 หรือติดลบ: ช่องยังเป็น 1 (฿35 · ยอดชำระ ฿85 = ฿35 + ส่ง ฿50) หรือบรรทัดถูกลบออก (🛒 0 · `pp-cart` ไม่มีรายการ) · ไม่มีค่าใดใน `pp-cart` ที่ qty ≤ 0 · ยอดชำระไม่ต่ำกว่า ฿0" },
    { type: 'source', description: "[R]+[D] · R64 · ความเสี่ยง: จำนวนติดลบหักยอดสินค้าอื่น · เทคนิค: Boundary · Negative" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ทูน่าซอง ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  const r = row(page, 'tuna-pouch');
  await test.step('1. กด − ที่บรรทัดทูน่าซอง 1 ครั้ง', async () => {
    await r.getByTestId('item-minus').click();
  });
  await test.step('2. กด − อีก 2 ครั้ง (ถ้าบรรทัดยังอยู่)', async () => {
    for (let i = 0; i < 2; i++) {
      if ((await r.count()) === 0) break;
      const m = r.getByTestId('item-minus');
      if (await m.isDisabled()) break;
      await m.click();
    }
  });
  await test.step('3. ดูช่องจำนวน pp-cart 🛒 และยอด', async () => {
    await page.waitForTimeout(300);
  });
  const qtyValues = async () => page.getByTestId('item-qty').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  await check(page, 'ไม่มีบรรทัดใดแสดงจำนวน 0 หรือติดลบ', page.getByTestId('item-qty'), async () => {
    for (const v of await qtyValues()) expect.soft(Number(v), `ช่องจำนวน "${v}"`).toBeGreaterThanOrEqual(1);
  }, { actual: qtyValues });
  const rowsLeft = await r.count();
  if (rowsLeft > 0) {
    await check(page, 'บรรทัดยังอยู่: ช่องยังเป็น 1 · ฿35 · ยอดชำระ ฿85', r, async (el) => {
      await expect.soft(el.getByTestId('item-qty')).toHaveValue('1');
      await expect.soft(el.getByTestId('item-line-total')).toHaveText(baht(35));
      await expect.soft(page.getByTestId('summary-total')).toHaveText(baht(85));
    });
  } else {
    await checkCount(page, 0, 'บรรทัดถูกลบออก: ');
    await check(page, 'บรรทัดถูกลบออก: pp-cart ไม่มีรายการ', null, async () => {
      expect.soft(cartLen(await readCart(page))).toBe(0);
    }, { actual: () => readCart(page) });
  }
  await check(page, 'ไม่มีค่าใดใน pp-cart ที่ qty ≤ 0', null, async () => {
    const c = await readCart(page);
    expect.soft((Array.isArray(c) ? c : []).filter((i) => !(Number(i.qty) > 0))).toEqual([]);
  }, { actual: () => readCart(page) });
  await check(page, 'ยอดชำระไม่ต่ำกว่า ฿0', page.locator('main'), async (el) => {
    await expect.soft(el).not.toContainText(/(-|−)\s*฿|฿\s*(-|−)/);
    const t = page.getByTestId('summary-total');
    if ((await t.count()) > 0) expect.soft(parseBaht(await t.innerText())).toBeGreaterThanOrEqual(0);
  });
});

test("TC-CART-011 ตะกร้าตัดรายการที่ผิดใน `pp-cart` ทิ้ง (qty ติดลบ/ศูนย์ ขนาดไม่มีจริง slug ไม่มีจริง)", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "เหลือ 1 บรรทัด: แมวโต สูตรไก่ 1.2 kg ×1 = ฿359 · ยอดรวมสินค้า ฿359 · ค่าส่ง ฿50 · ยอดชำระ ฿409 (฿359 + ฿50) · 🛒 1 · ไม่มีบรรทัดที่ยอดติดลบ/ศูนย์ หรือชื่อว่าง · ไม่มี error ใน console ที่ทำให้หน้าไม่แสดง · ข้อ 4: `pp-cart` มีรายการเดียว `adult-chicken-dry` `1.2 kg` qty 1 (ไม่มี `no-such`, `99 kg` หรือ qty ≤ 0)" },
    { type: 'source', description: "[R]+[D] · R65 · ความเสี่ยง: ข้อมูลเสียในเครื่องทำยอดติดลบหรือหน้าพัง · เทคนิค: Security · Negative" },
  ],
}, async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await test.step('เตรียม: ใส่แมวโต สูตรไก่ 1.2 kg ×1, ทูน่าซอง ×1, ลูกแมว สูตรแซลมอน 400 g ×1, ขนมแมวเลีย 4 ซอง ×1 ผ่านหน้าเว็บ', async () => {
    await addFromPdp(page, 'adult-chicken-dry', S.adult, 1);
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(page, 'lickable-salmon-treat', S.lick, 1);
  });
  await test.step('1. แก้ pp-cart: ทูน่า qty -2 · ลูกแมว size 99 kg · ขนมแมวเลีย qty 0 · คัดลอกรายการหนึ่งเป็น slug no-such qty 1', async () => {
    const c = (await readCart(page)) ?? [];
    for (const i of c) {
      if (i.slug === 'tuna-pouch') i.qty = -2;
      if (i.slug === 'kitten-salmon-dry') i.size = '99 kg';
      if (i.slug === 'lickable-salmon-treat') i.qty = 0;
    }
    const copy = { ...(c.find((i) => i.slug === 'adult-chicken-dry') ?? c[0]), slug: 'no-such', qty: 1 };
    c.push(copy as CartLine);
    await writeCart(page, c);
  });
  await test.step('2. reload /cart', async () => {
    await openCart(page);
  });
  await test.step('3. นับบรรทัด อ่านสรุปยอดและ 🛒', async () => {});
  await checkRows(page, 1, 'เหลือ ');
  await checkLine(page, 'แมวโต สูตรไก่ 1.2 kg', 'adult-chicken-dry', S.adult, 1, 359);
  await checkSummary(page, { subtotal: 359, shipping: 50, total: 409 });
  await checkCount(page, 1);
  const lineInfo = async () =>
    page.getByTestId('cart-item').evaluateAll((els) =>
      els.map((e) => ({
        name: e.querySelector('[data-testid="item-name"]')?.textContent?.trim() ?? '',
        total: e.querySelector('[data-testid="item-line-total"]')?.textContent?.trim() ?? '',
      })),
    );
  await check(page, 'ไม่มีบรรทัดที่ยอดติดลบ/ศูนย์ หรือชื่อว่าง', page.getByTestId('cart-item'), async () => {
    for (const l of await lineInfo()) {
      expect.soft(l.name, 'ชื่อบรรทัด').not.toBe('');
      expect.soft(parseBaht(l.total), `ยอดบรรทัด ${l.name}`).toBeGreaterThan(0);
      expect.soft(l.total).not.toMatch(/-|−/);
    }
  }, { actual: lineInfo });
  await check(page, 'ไม่มี error ใน console ที่ทำให้หน้าไม่แสดง', summaryBox(page), async (el) => {
    await expect.soft(el).toBeVisible();
    expect.soft(pageErrors).toEqual([]);
  }, { actual: async () => ({ pageErrors, summaryVisible: await summaryBox(page).isVisible() }) });
  await test.step('4. ดู pp-cart หลังโหลด', async () => {});
  await check(page, 'ข้อ 4: pp-cart มีรายการเดียว adult-chicken-dry 1.2 kg qty 1', null, async () => {
    const c = await readCart(page);
    expect.soft(Array.isArray(c) ? c.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })) : c).toEqual([
      { slug: 'adult-chicken-dry', size: '1.2 kg', qty: 1 },
    ]);
  }, { actual: () => readCart(page) });
});

test("TC-CART-012 `pp-cart` ที่ qty เป็นทศนิยมต้องกลายเป็นจำนวนเต็ม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ช่องจำนวน 1 · 🛒 1 · qty ใน `pp-cart` = 1 · ยอดบรรทัด ฿359 (ไม่มี ฿538.50 = ฿359×1.5) · ยอดชำระ ฿409 (฿359 + ฿50) ตรงกับที่ server ปัด 1.5 → 1 · ไม่มีเศษสตางค์ในยอดใด" },
    { type: 'source', description: "[R] · R65 · R119 · ความเสี่ยง: ซื้อครึ่งชิ้นได้ ยอดมีสตางค์ไม่ตรงกับ server · เทคนิค: Security · Negative" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่แมวโต สูตรไก่ 1.2 kg ×1 ผ่านหน้าเว็บ', async () => {
    await addFromPdp(page, 'adult-chicken-dry', S.adult, 1);
  });
  await test.step('1. แก้ qty ใน pp-cart เป็น 1.5 แล้ว reload /cart', async () => {
    const c = (await readCart(page)) ?? [];
    for (const i of c) if (i.slug === 'adult-chicken-dry') i.qty = 1.5;
    await writeCart(page, c);
    await openCart(page);
  });
  await test.step('2. อ่านช่องจำนวน ยอดบรรทัด และ 🛒', async () => {});
  await checkLine(page, '(ไม่มี ฿538.50)', 'adult-chicken-dry', undefined, 1, 359);
  await checkCount(page, 1);
  await checkLsQty(page, '', 'adult-chicken-dry', undefined, 1);
  await checkSummary(page, { total: 409 });
  await check(page, 'ไม่มีเศษสตางค์ในยอดใด (ไม่มี ฿538.50)', page.locator('main'), async (el) => {
    await expect.soft(el).not.toContainText(/฿[\d,]+\.\d/);
    await expect.soft(el).not.toContainText(/538/);
  });
});

test("TC-CART-013 แก้ `pp-cart` ให้เกินสต็อก (สูตรลดก้อนขน ×10) และใส่ของหมด (ไก่ฟรีซดราย ×2) ตะกร้าต้องตรวจสต็อกซ้ำ", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: บรรทัดไก่ฟรีซดรายมีข้อความ \"สินค้าหมด\" และไม่ถูกนับในยอด · บรรทัดสูตรลดก้อนขนจำนวน 3 พร้อมข้อความเตือนที่มีเลข 3 (เช่น \"เหลือ 3 ชิ้น\") · ยอดรวมสินค้า ฿1,560 (฿520×3) · ค่าส่ง ฿0 · ยอดชำระ ฿1,560 · 🛒 3 · ปุ่มมี `disabled` หรือ `aria-disabled=\"true\"` · ข้อ 3: URL ยังเป็น `/cart` · ข้อ 4: ปุ่มกดได้ ยอดชำระ ฿1,560 (ตอนนี้ล้ม: ตะกร้ารับทั้งหมด ฿5,518 = ฿520×10 + ฿159×2 ขึ้น \"ได้ส่งฟรีแล้ว!\" ปุ่มกดได้)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R66 · Q9 (สมมติฐาน: ของหมดยังแสดงพร้อมป้าย ไม่ถูกตัดออกเอง) · ความเสี่ยง: เชื่อ localStorage จนยอดผิดและพาไป checkout ด้วยของที่ซื้อไม่ได้ · เทคนิค: Security · Boundary" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่สูตรลดก้อนขน 1.5 kg ×1 ผ่านหน้าเว็บ', async () => {
    await addFromPdp(page, 'hairball-control-dry', S.hairball, 1);
  });
  await test.step('1. แก้ pp-cart (สูตรลดก้อนขน qty 10 · เพิ่มไก่ฟรีซดราย 50 g qty 2) แล้ว reload /cart (ไม่กดปุ่มใด)', async () => {
    const c = (await readCart(page)) ?? [];
    for (const i of c) if (i.slug === 'hairball-control-dry') i.qty = 10;
    c.push({ slug: 'freeze-dried-chicken-cat', size: S.freeze, qty: 2 });
    await writeCart(page, c);
    await openCart(page);
  });
  await test.step('2. อ่านทุกบรรทัด ข้อความเตือน สรุปยอด 🛒 และสถานะปุ่ม "ดำเนินการชำระเงิน →"', async () => {});
  const freezeRow = row(page, 'freeze-dried-chicken-cat');
  const hairRow = row(page, 'hairball-control-dry');
  await check(page, 'ข้อ 2: บรรทัดไก่ฟรีซดรายมีข้อความ "สินค้าหมด"', freezeRow, async (el) => {
    await expect.soft(el).toContainText('สินค้าหมด');
  });
  await check(page, 'ข้อ 2: บรรทัดสูตรลดก้อนขนจำนวน 3', hairRow.getByTestId('item-qty'), async (el) => {
    await expect.soft(el).toHaveValue('3');
  });
  await checkRowWarning(page, 'ข้อ 2: บรรทัดสูตรลดก้อนขนมีข้อความเตือนที่มีเลข 3', hairRow, 3);
  await checkSummary(page, { subtotal: 1560, shipping: 0, total: 1560 }, 'ข้อ 2 (ไก่ฟรีซดรายไม่ถูกนับ): ');
  await checkCount(page, 3, 'ข้อ 2: ');
  await check(page, 'ข้อ 2: ปุ่ม "ดำเนินการชำระเงิน →" มี disabled หรือ aria-disabled="true"', page.getByTestId('checkout-button'), async () => {
    const s = await checkoutBtnState(page);
    expect.soft(s.disabled || s.ariaDisabled === 'true').toBe(true);
  }, { actual: () => checkoutBtnState(page) });
  await test.step('3. กดปุ่ม "ดำเนินการชำระเงิน →"', async () => {
    await page.getByTestId('checkout-button').click({ timeout: 3000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  });
  await check(page, 'ข้อ 3: URL ยังเป็น /cart', null, async () => {
    expect.soft(new URL(page.url()).pathname).toBe('/cart');
  });
  await test.step('4. กด ✕ ที่บรรทัดไก่ฟรีซดราย แล้วดูปุ่มอีกครั้ง', async () => {
    if (new URL(page.url()).pathname !== '/cart') await openCart(page);
    await freezeRow.getByTestId('item-remove').click();
    await freezeRow.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  });
  await check(page, 'ข้อ 4: ปุ่ม "ดำเนินการชำระเงิน →" กดได้', page.getByTestId('checkout-button'), async (el) => {
    await expect.soft(el).toBeEnabled();
    await expect.soft(el).not.toHaveAttribute('aria-disabled', 'true');
  }, { actual: () => checkoutBtnState(page) });
  await checkSummary(page, { total: 1560 }, 'ข้อ 4: ');
});

test("TC-CART-014 แก้ `pp-cart` ให้จำนวนเกินเพดานช่องพิมพ์มาก (ทูน่าซอง 500)", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ช่องจำนวน 60 พร้อมข้อความเตือนที่มีเลข 60 · ยอดชำระ ฿2,100 (฿35×60 ส่งฟรี) · 🛒 60 · qty ใน `pp-cart` = 60 (เท่าช่องจำนวน) (ตอนนี้ล้ม: 🛒 500 ยอด ฿17,500 = ฿35×500)" },
    { type: 'source', description: "[R]+[D]+[O-ยังไม่ยืนยัน] · R66 · Q9 · ความเสี่ยง: เพดานบังคับแค่ช่องพิมพ์ ไม่บังคับข้อมูลในเครื่อง · เทคนิค: Security · Boundary" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ทูน่าซอง ×1 ผ่านหน้าเว็บ', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
  });
  await test.step('1. แก้ qty ทูน่าใน pp-cart เป็น 500 แล้ว reload /cart', async () => {
    const c = (await readCart(page)) ?? [];
    for (const i of c) if (i.slug === 'tuna-pouch') i.qty = 500;
    await writeCart(page, c);
    await openCart(page);
  });
  await test.step('2. อ่านช่องจำนวน ข้อความเตือน ยอด และ 🛒', async () => {});
  const r = row(page, 'tuna-pouch');
  await check(page, 'ช่องจำนวน 60', r.getByTestId('item-qty'), async (el) => {
    await expect.soft(el).toHaveValue('60');
  });
  await checkRowWarning(page, 'มีข้อความเตือนที่มีเลข 60', r, 60);
  await checkSummary(page, { total: 2100 }, '(฿35×60 ส่งฟรี) ');
  await checkCount(page, 60);
  await test.step('3. ดู qty ใน pp-cart', async () => {});
  await checkLsQty(page, '(เท่าช่องจำนวน) ', 'tuna-pouch', undefined, 60);
});

test("TC-CART-015 ตะกร้าที่ถูกแก้ให้มีของหมดต้องสั่งซื้อไม่ได้ แม้ข้ามหน้าตะกร้าไป `/checkout` ตรง ๆ", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ต้องเป็นอย่างใดอย่างหนึ่ง: ถูกพากลับ `/cart` / ปุ่มยืนยันกดไม่ได้ หรือ `POST /api/orders` ได้ HTTP 409 พร้อมข้อความที่มี \"สินค้าไม่พอ\" · ทุกกรณี: ไม่มีหน้า `/orders/PP-…` ใหม่ · จำนวนคำสั่งใน `/account` เท่าเดิม · สต็อกไก่ฟรีซดรายใน `/api/products` = 0 (ไม่ติดลบ)" },
    { type: 'source', description: "[D]+[R] · R66 · R117 · Q9 · ข้อนี้เป็นเจ้าของกรณีแก้ `pp-cart` แล้วไป checkout ผ่านหน้าเว็บ (ฝั่ง API อยู่ใน TC-ORD-005 (ก)) · ความเสี่ยง: แก้ localStorage แล้วสั่งของหมดได้ สต็อกติดลบ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  let before = '';
  await test.step('เตรียม: ล็อกอิน demo · ใส่ทูน่าซอง ×1 ผ่านหน้าเว็บ · จด "จำนวนคำสั่ง" ใน /account', async () => {
    await loginApi(page);
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await page.goto('/account');
    await ready(page);
    await orderCountCell(page).waitFor();
    before = (await orderCountCell(page).innerText()).trim();
  });
  await test.step('1. แก้ pp-cart: รายการทูน่า → slug freeze-dried-chicken-cat size 50 g qty 2 (ไม่เปิด /cart)', async () => {
    const c = (await readCart(page)) ?? [];
    const out = c.map((i) => (i.slug === 'tuna-pouch' ? { ...i, slug: 'freeze-dried-chicken-cat', size: S.freeze, qty: 2 } : i));
    await writeCart(page, out);
  });
  let redirected = false;
  let btnDisabled = false;
  let status: number | null = null;
  let body = '';
  await test.step('2. พิมพ์ URL /checkout กรอกที่อยู่ เลือกส่งธรรมดา เก็บเงินปลายทาง', async () => {
    await page.goto('/checkout');
    await ready(page);
    redirected = new URL(page.url()).pathname === '/cart';
    if (!redirected) await fillCheckout(page);
  });
  await test.step('3. ถ้ามีปุ่ม "ยืนยันสั่งซื้อ ฿X" ให้กด และดู request POST /api/orders', async () => {
    if (redirected) return;
    const btn = page.getByTestId('place-order');
    if ((await btn.count()) === 0) return;
    btnDisabled = (await btn.isDisabled()) || (await btn.getAttribute('aria-disabled')) === 'true';
    if (btnDisabled) return;
    const respP = page
      .waitForResponse((r) => r.url().includes('/api/orders') && r.request().method() === 'POST', { timeout: 10000 })
      .catch(() => null);
    await btn.click();
    const resp = await respP;
    if (resp) {
      status = resp.status();
      body = await resp.text().catch(() => '');
    }
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  });
  await check(page, 'สั่งไม่ได้: ถูกพากลับ /cart / ปุ่มยืนยันกดไม่ได้ หรือ POST /api/orders ได้ 409 "สินค้าไม่พอ"', null, async () => {
    expect.soft(redirected || btnDisabled || (status === 409 && body.includes('สินค้าไม่พอ'))).toBe(true);
  }, { actual: async () => ({ url: page.url(), redirected, btnDisabled, status, body }) });
  await check(page, 'ไม่มีหน้า /orders/PP-… ใหม่', null, async () => {
    expect.soft(page.url()).not.toMatch(/\/orders\/PP-/);
  });
  await test.step('4. เปิด /account และ GET /api/products', async () => {
    await page.goto('/account');
    await ready(page);
    await orderCountCell(page).waitFor();
  });
  await check(page, `จำนวนคำสั่งใน /account เท่าเดิม (${before})`, orderCountCell(page), async (el) => {
    await expect.soft(el).toHaveText(before);
  });
  const res = await page.request.get('/api/products');
  const data = (await res.json()) as { items: { slug: string; stock: number }[] };
  const freeze = data.items.find((p) => p.slug === 'freeze-dried-chicken-cat');
  await checkApi('สต็อกไก่ฟรีซดรายใน /api/products = 0 (ไม่ติดลบ)', { status: res.status(), freeze }, () => {
    expect.soft(freeze?.stock).toBe(0);
  });
});

test("TC-CART-016 ใส่ราคาเองใน `pp-cart` ต้องไม่มีผลกับราคาในตะกร้า", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ราคาต่อชิ้น ฿359 (ตามหน้าสินค้า ไม่ใช่ ฿1) · ยอดรวมสินค้า ฿359 · ค่าส่ง ฿50 · ยอดชำระ ฿409 (฿359 + ฿50) · ในบรรทัดแมวโต สูตรไก่และกล่องสรุปยอด ไม่มีจำนวนเงินที่เท่ากับ ฿1 หรือ ฿51 พอดี (เทียบทั้งจำนวน ไม่ใช่ข้อความย่อย เช่น regex `฿1(?![\\d,.])` และ `฿51(?![\\d,.])`)" },
    { type: 'source', description: "[R]+[D] · R65 · R66 · ความเสี่ยง: ลูกค้าแก้ราคาในเครื่องแล้วตะกร้าแสดง/ส่งราคาที่แก้ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่แมวโต สูตรไก่ 1.2 kg ×1 ผ่านหน้าเว็บ', async () => {
    await addFromPdp(page, 'adult-chicken-dry', S.adult, 1);
  });
  await test.step('1. แก้ pp-cart (ใส่ "price":1 ในรายการแมวโต สูตรไก่) แล้ว reload /cart', async () => {
    const c = (await readCart(page)) ?? [];
    for (const i of c) if (i.slug === 'adult-chicken-dry') i.price = 1;
    await writeCart(page, c);
    await openCart(page);
  });
  await test.step('2. อ่านราคาต่อชิ้น ยอดบรรทัด และสรุปยอด', async () => {});
  const r = row(page, 'adult-chicken-dry');
  await check(page, 'ราคาต่อชิ้น ฿359 (ไม่ใช่ ฿1)', r.getByText(/ชิ้นละ/), async (el) => {
    await expect.soft(el).toContainText(/฿359(?![\d,.])/);
  });
  await checkSummary(page, { subtotal: 359, shipping: 50, total: 409 });
  await check(page, 'บรรทัดแมวโต สูตรไก่ไม่มีจำนวนเงิน ฿1 หรือ ฿51 พอดี', r, async (el) => {
    await expect.soft(el).not.toContainText(/฿1(?![\d,.])/);
    await expect.soft(el).not.toContainText(/฿51(?![\d,.])/);
  });
  await check(page, 'กล่องสรุปยอดไม่มีจำนวนเงิน ฿1 หรือ ฿51 พอดี', summaryBox(page), async (el) => {
    await expect.soft(el).not.toContainText(/฿1(?![\d,.])/);
    await expect.soft(el).not.toContainText(/฿51(?![\d,.])/);
  });
});

test("TC-CART-017 สต็อกลดลงระหว่างที่ของอยู่ในตะกร้า: ต้องเตือนตั้งแต่เปิดหน้า และปุ่ม + ต้องไม่ทำให้จำนวนลด", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 3 (ก่อนกดอะไร): มีข้อความเตือนที่บรรทัดนี้ที่มีเลข 22 · ช่องจำนวน 22 · ยอดบรรทัด ฿4,158 (฿189×22) · ยอดชำระ ฿4,158 (ส่งฟรี) · 🛒 22 · ข้อ 4: จำนวนยังเป็น 22 (ไม่เพิ่ม ไม่ลด) · ยอดยัง ฿4,158 (ตอนนี้ล้ม: เปิดหน้าแล้วยังเห็น 25 ฿4,725 ไม่เตือน กด + แล้วจำนวนลดเป็น 22)" },
    { type: 'source', description: "[R]+[D]+[O-ยังไม่ยืนยัน] · R67 · R66 · Q9 · ความเสี่ยง: ลูกค้าเห็นยอดเกินจริง ปุ่ม + ทำงานกลับด้าน · เทคนิค: State · Boundary" },
  ],
}, async ({ page, browser }) => {
  const ctxB = await browser.newContext({ baseURL: baseURL(), viewport: { width: 1280, height: 800 } });
  try {
    await test.step('เตรียม: context A (ไม่ล็อกอิน) ใส่ลูกแมว สูตรแซลมอน 400 g ×25', async () => {
      await addFromPdp(page, 'kitten-salmon-dry', S.k400, 25);
    });
    await test.step('1. ที่ A เปิด /cart ยืนยันว่าเห็น ×25 ฿4,725', async () => {
      await openCart(page);
    });
    await checkLine(page, 'ข้อ 1:', 'kitten-salmon-dry', S.k400, 25, 4725);
    await test.step('2. ที่ B (ล็อกอิน demo) ใส่ 400 g ×3 แล้วสั่งซื้อให้สำเร็จ', async () => {
      await orderInOtherContext(ctxB, 'kitten-salmon-dry', S.k400, 3);
    });
    await test.step('3. ที่ A reload /cart (ไม่กดปุ่มใด) อ่านบรรทัด ข้อความ และสรุปยอด', async () => {
      await page.reload();
      await reloadedCart(page);
    });
    const r = row(page, 'kitten-salmon-dry', S.k400);
    await checkRowWarning(page, 'ข้อ 3: มีข้อความเตือนที่บรรทัดนี้ที่มีเลข 22', r, 22);
    await checkLine(page, 'ข้อ 3:', 'kitten-salmon-dry', S.k400, 22, 4158);
    await checkSummary(page, { total: 4158 }, 'ข้อ 3 (ส่งฟรี): ');
    await checkCount(page, 22, 'ข้อ 3: ');
    await test.step('4. ที่ A กด + 1 ครั้ง', async () => {
      const p = r.getByTestId('item-plus');
      if (!(await p.isDisabled())) await p.click();
    });
    await checkLine(page, 'ข้อ 4 (ไม่เพิ่ม ไม่ลด):', 'kitten-salmon-dry', S.k400, 22, 4158);
    await checkSummary(page, { total: 4158 }, 'ข้อ 4: ');
  } finally {
    await ctxB.close();
  }
});

test("TC-CART-018 สินค้าที่อยู่ในตะกร้าหมดไปแล้ว (สูตรลดก้อนขนถูกซื้อหมด 3 ชิ้น) ต้องมีป้ายหมด ไม่นับยอด และไป checkout ไม่ได้", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 3: บรรทัดสูตรลดก้อนขนมีข้อความ \"สินค้าหมด\" · ยอดรวมสินค้า ฿70 (฿35×2 ไม่รวม ฿520) · ค่าส่ง ฿50 · ยอดชำระ ฿120 · ปุ่มมี `disabled` หรือ `aria-disabled=\"true\"` · ข้อ 4: ปุ่มกดได้ · ยอดชำระ ฿120 · 🛒 2 (ตอนนี้ล้ม: แสดง \"ชิ้นละ ฿520\" ปกติ ไม่มีป้ายหมด ยอดชำระ ฿640 ปุ่มกดได้ รู้ตัวตอนได้ 409)" },
    { type: 'source', description: "[D]+[R]+[O-ยังไม่ยืนยัน] · R66 · Q9 (สมมติฐาน: ของหมดยังแสดงพร้อมป้าย ไม่ถูกตัดออกเอง) · ความเสี่ยง: ลูกค้าเดินไปถึงขั้นยืนยันด้วยของที่ซื้อไม่ได้ · เทคนิค: State · Negative" },
  ],
}, async ({ page, browser }) => {
  const ctxB = await browser.newContext({ baseURL: baseURL(), viewport: { width: 1280, height: 800 } });
  try {
    await test.step('เตรียม: context A (ไม่ล็อกอิน) ใส่สูตรลดก้อนขน 1.5 kg ×1 + ทูน่าซอง ×2', async () => {
      await addFromPdp(page, 'hairball-control-dry', S.hairball, 1);
      await addFromPdp(page, 'tuna-pouch', null, 2);
    });
    await test.step('1. ที่ A เปิด /cart จดยอด', async () => {
      await openCart(page);
    });
    await checkSummary(page, { total: 640 }, 'ข้อ 1: ');
    await test.step('2. ที่ B (ล็อกอิน demo) สั่งสูตรลดก้อนขน ×3 ให้สำเร็จ', async () => {
      await orderInOtherContext(ctxB, 'hairball-control-dry', S.hairball, 3);
    });
    await test.step('3. ที่ A reload /cart อ่านบรรทัด สรุปยอด ปุ่ม "ดำเนินการชำระเงิน →"', async () => {
      await page.reload();
      await reloadedCart(page);
    });
    const hr = row(page, 'hairball-control-dry');
    await check(page, 'ข้อ 3: บรรทัดสูตรลดก้อนขนมีข้อความ "สินค้าหมด"', hr, async (el) => {
      await expect.soft(el).toContainText('สินค้าหมด');
    });
    await checkSummary(page, { subtotal: 70, shipping: 50, total: 120 }, 'ข้อ 3 (ไม่รวม ฿520): ');
    await check(page, 'ข้อ 3: ปุ่ม "ดำเนินการชำระเงิน →" มี disabled หรือ aria-disabled="true"', page.getByTestId('checkout-button'), async () => {
      const s = await checkoutBtnState(page);
      expect.soft(s.disabled || s.ariaDisabled === 'true').toBe(true);
    }, { actual: () => checkoutBtnState(page) });
    await test.step('4. ที่ A กด ✕ บรรทัดสูตรลดก้อนขน', async () => {
      await hr.getByTestId('item-remove').click();
      await hr.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    });
    await check(page, 'ข้อ 4: ปุ่ม "ดำเนินการชำระเงิน →" กดได้', page.getByTestId('checkout-button'), async (el) => {
      await expect.soft(el).toBeEnabled();
      await expect.soft(el).not.toHaveAttribute('aria-disabled', 'true');
    }, { actual: () => checkoutBtnState(page) });
    await checkSummary(page, { total: 120 }, 'ข้อ 4: ');
    await checkCount(page, 2, 'ข้อ 4: ');
  } finally {
    await ctxB.close();
  }
});

test("TC-CART-019 ตะกร้ายังอยู่หลัง reload และหลังปิดทุกแท็บแล้วเปิดใหม่", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ทุกขั้นเหมือนกัน: 2 บรรทัด ฿359 (×1) และ ฿105 (฿35×3) · ยอดรวมสินค้า ฿464 · ค่าส่ง ฿50 · ยอดชำระ ฿514 · 🛒 4 · `pp-cart` มี 2 รายการ qty 1 และ 3" },
    { type: 'source', description: "[R]+[D] · R68 · ความเสี่ยง: ตะกร้าหายเมื่อปิดแท็บ ลูกค้าต้องเลือกใหม่ · เทคนิค: State · Happy path" },
  ],
}, async ({ page }) => {
  const ctx = page.context();
  const verify = async (p: Page, stage: string) => {
    await checkRows(p, 2, `${stage}: `);
    await checkLine(p, `${stage}: แมวโต สูตรไก่ ×1`, 'adult-chicken-dry', S.adult, 1, 359);
    await checkLine(p, `${stage}: ทูน่าซอง ×3`, 'tuna-pouch', undefined, 3, 105);
    await checkSummary(p, { subtotal: 464, shipping: 50, total: 514 }, `${stage}: `);
    await checkCount(p, 4, `${stage}: `);
    await check(p, `${stage}: pp-cart มี 2 รายการ qty 1 และ 3`, null, async () => {
      const c = await readCart(p);
      expect.soft(cartLen(c)).toBe(2);
      expect.soft(qtyOf(c, 'adult-chicken-dry')).toEqual([1]);
      expect.soft(qtyOf(c, 'tuna-pouch')).toEqual([3]);
    }, { actual: () => readCart(p) });
  };
  await test.step('1. ใส่แมวโต สูตรไก่ 1.2 kg ×1 · ทูน่าซอง ×3 เปิด /cart จดยอด', async () => {
    await addFromPdp(page, 'adult-chicken-dry', S.adult, 1);
    await addFromPdp(page, 'tuna-pouch', null, 3);
    await openCart(page);
  });
  await verify(page, 'ข้อ 1');
  await test.step('2. reload /cart', async () => {
    await page.reload();
    await reloadedCart(page);
  });
  await verify(page, 'ข้อ 2 หลัง reload');
  let p2: Page = page;
  await test.step('3. ปิดทุกแท็บของเว็บ (context เดิม) แล้วเปิด /cart ในแท็บใหม่', async () => {
    for (const p of ctx.pages()) await p.close();
    p2 = await ctx.newPage();
    await openCart(p2);
  });
  await test.step('4. อ่านบรรทัด ยอด และ 🛒 ทุกขั้น', async () => {});
  await verify(p2, 'ข้อ 3 แท็บใหม่');
});

test("TC-CART-020 ตะกร้าของ guest ยังอยู่หลังสมัครสมาชิก", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: URL ปลายทาง `/account?welcome=1` · ข้อ 3: 🛒 2 · ข้อ 4: 1 บรรทัด 400 g ×2 = ฿378 (฿189×2) · ค่าส่ง ฿50 · ยอดชำระ ฿428" },
    { type: 'source', description: "[R]+[D] · R68 · ความเสี่ยง: สมัครระหว่างซื้อแล้วตะกร้าหาย ลูกค้าเลิกซื้อ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await test.step('1. ใส่ลูกแมว สูตรแซลมอน 400 g ×2 จด 🛒', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 2);
    test.info().annotations.push({ type: 'note', description: `🛒 ก่อนสมัคร = ${await page.getByTestId('cart-count').innerText()}` });
  });
  await test.step('2. เปิด /register กรอกข้อมูล ติ๊กยอมรับเงื่อนไข กดสมัคร', async () => {
    await page.goto('/register');
    await ready(page);
    await page.getByTestId('reg-name').fill('QA Cart');
    await page.getByTestId('reg-email').fill(runEmail('qa-cart-01'));
    await page.getByTestId('reg-password').fill('Paw12345');
    await page.getByTestId('reg-confirm').fill('Paw12345');
    await page.getByTestId('reg-terms').check();
    await page.getByTestId('reg-submit').click();
    await page.waitForURL((u) => u.pathname !== '/register', { timeout: 10000 }).catch(() => {});
    await ready(page);
  });
  await check(page, 'ข้อ 2: URL ปลายทาง /account?welcome=1', null, async () => {
    const u = new URL(page.url());
    expect.soft(u.pathname + u.search).toBe('/account?welcome=1');
  });
  await test.step('3. อ่าน 🛒 บนหัวเว็บ', async () => {});
  await checkCount(page, 2, 'ข้อ 3: ');
  await test.step('4. เปิด /cart', async () => {
    await openCart(page);
  });
  await checkRows(page, 1, 'ข้อ 4: ');
  await checkLine(page, 'ข้อ 4: 400 g ×2', 'kitten-salmon-dry', S.k400, 2, 378);
  await checkSummary(page, { shipping: 50, total: 428 }, 'ข้อ 4: ');
});

test("TC-CART-021 2 แท็บ: แท็บหนึ่งเพิ่มของ อีกแท็บกด + ต้องไม่เขียนทับของที่เพิ่ม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 3: `pp-cart` มี 2 รายการ ลูกแมว 400 g qty 2 และทูน่าซอง qty 1 · ข้อ 4 (หลัง reload ทั้ง 2 แท็บ): แท็บ A แสดง 2 บรรทัด ฿378 (฿189×2) + ฿35 · ยอดรวมสินค้า ฿413 (฿378 + ฿35) · ค่าส่ง ฿50 · ยอดชำระ ฿463 (฿413 + ฿50) · 🛒 3 ทั้ง 2 แท็บ (ตอนนี้ล้ม: แท็บ A เขียนทับ ทูน่าหาย เหลือลูกแมว ×2 ฿428 🛒 2)" },
    { type: 'source', description: "[R]+[D] · R69 · Q24 · ความเสี่ยง: ของที่ลูกค้าใส่หายเงียบ ๆ เมื่อเปิดหลายแท็บ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const tabA = page;
  let tabB: Page = page;
  await test.step('เตรียม: ตะกร้ามีลูกแมว สูตรแซลมอน 400 g ×1 · แท็บ A เปิด /cart · แท็บ B (context เดียวกัน) เปิด /products/tuna-pouch', async () => {
    await addFromPdp(tabA, 'kitten-salmon-dry', S.k400, 1);
    await openCart(tabA);
    tabB = await tabA.context().newPage();
    await tabB.goto('/products/tuna-pouch');
    await ready(tabB);
  });
  await test.step('1. แท็บ B กดเพิ่มลงตะกร้า (ทูน่า ×1)', async () => {
    const before = await tabB.evaluate(() => localStorage.getItem('pp-cart'));
    await tabB.getByTestId('qty-input').fill('1');
    await tabB.getByTestId('add-to-cart').click();
    await tabB.waitForFunction((b) => localStorage.getItem('pp-cart') !== b, before, { timeout: 5000 }).catch(() => {});
  });
  await test.step('2. กลับแท็บ A (ไม่ reload) กด + ที่ลูกแมว สูตรแซลมอน', async () => {
    await tabA.bringToFront();
    await row(tabA, 'kitten-salmon-dry').getByTestId('item-plus').click();
    await tabA.waitForTimeout(300);
  });
  await test.step('3. ดู pp-cart · บรรทัดในแท็บ A · 🛒 ทั้ง 2 แท็บ', async () => {});
  await check(tabA, 'ข้อ 3: pp-cart มี 2 รายการ ลูกแมว 400 g qty 2 และทูน่าซอง qty 1', null, async () => {
    const c = await readCart(tabA);
    expect.soft(cartLen(c)).toBe(2);
    expect.soft(qtyOf(c, 'kitten-salmon-dry', S.k400)).toEqual([2]);
    expect.soft(qtyOf(c, 'tuna-pouch')).toEqual([1]);
  }, { actual: () => readCart(tabA) });
  await test.step('4. reload ทั้ง 2 แท็บ', async () => {
    await tabB.reload();
    await ready(tabB);
    await tabA.bringToFront();
    await tabA.reload();
    await reloadedCart(tabA);
  });
  await checkRows(tabA, 2, 'ข้อ 4 แท็บ A: ');
  await checkLine(tabA, 'ข้อ 4 แท็บ A: ลูกแมว 400 g', 'kitten-salmon-dry', S.k400, null, 378);
  await checkLine(tabA, 'ข้อ 4 แท็บ A: ทูน่าซอง', 'tuna-pouch', undefined, null, 35);
  await checkSummary(tabA, { subtotal: 413, shipping: 50, total: 463 }, 'ข้อ 4 แท็บ A: ');
  await checkCount(tabA, 3, 'ข้อ 4 แท็บ A: ');
  await tabB.bringToFront();
  await checkCount(tabB, 3, 'ข้อ 4 แท็บ B: ');
});

test("TC-CART-022 2 แท็บ: แท็บหนึ่งเพิ่มของ อีกแท็บลบบรรทัดอื่น ต้องลบเฉพาะบรรทัดที่กด", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "เหลือ 2 รายการ: ลูกแมว 400 g ×1 (฿189) + แมวโต สูตรไก่ 1.2 kg ×1 (฿359) · ยอดรวมสินค้า ฿548 · ค่าส่ง ฿50 · ยอดชำระ ฿598 · 🛒 2 · ไม่มีทูน่าซอง" },
    { type: 'source', description: "[R]+[D] · R69 · Q24 · ความเสี่ยง: การลบจากแท็บเก่าลบของที่เพิ่งใส่จากแท็บอื่นไปด้วย · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const tabA = page;
  let tabB: Page = page;
  await test.step('เตรียม: ตะกร้ามีลูกแมว สูตรแซลมอน 400 g ×1 + ทูน่าซอง ×1 · แท็บ A เปิด /cart · แท็บ B เปิด /products/adult-chicken-dry', async () => {
    await addFromPdp(tabA, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(tabA, 'tuna-pouch', null, 1);
    await openCart(tabA);
    tabB = await tabA.context().newPage();
    await tabB.goto('/products/adult-chicken-dry');
    await ready(tabB);
  });
  await test.step('1. แท็บ B เลือก 1.2 kg กดเพิ่มลงตะกร้า', async () => {
    await tabB.locator(`[data-testid="size-option"][data-size="${S.adult}"]`).click();
    await tabB.locator(`[data-testid="size-option"][data-size="${S.adult}"][aria-pressed="true"]`).waitFor();
    const before = await tabB.evaluate(() => localStorage.getItem('pp-cart'));
    await tabB.getByTestId('add-to-cart').click();
    await tabB.waitForFunction((b) => localStorage.getItem('pp-cart') !== b, before, { timeout: 5000 }).catch(() => {});
  });
  await test.step('2. กลับแท็บ A (ไม่ reload) กด ✕ ที่ทูน่าซอง', async () => {
    await tabA.bringToFront();
    await row(tabA, 'tuna-pouch').getByTestId('item-remove').click();
    await tabA.waitForTimeout(300);
  });
  await test.step('3. ดู pp-cart และ reload แท็บ A', async () => {});
  await check(tabA, 'pp-cart เหลือ 2 รายการ: ลูกแมว 400 g ×1 + แมวโต สูตรไก่ 1.2 kg ×1 · ไม่มีทูน่าซอง', null, async () => {
    const c = await readCart(tabA);
    expect.soft(cartLen(c)).toBe(2);
    expect.soft(qtyOf(c, 'kitten-salmon-dry', S.k400)).toEqual([1]);
    expect.soft(qtyOf(c, 'adult-chicken-dry', S.adult)).toEqual([1]);
    expect.soft(qtyOf(c, 'tuna-pouch')).toEqual([]);
  }, { actual: () => readCart(tabA) });
  await test.step('reload แท็บ A', async () => {
    await tabA.reload();
    await reloadedCart(tabA);
  });
  await checkRows(tabA, 2, 'หลัง reload: ');
  await checkLine(tabA, 'หลัง reload: ลูกแมว 400 g ×1', 'kitten-salmon-dry', S.k400, 1, 189);
  await checkLine(tabA, 'หลัง reload: แมวโต สูตรไก่ 1.2 kg ×1', 'adult-chicken-dry', S.adult, 1, 359);
  await check(tabA, 'หลัง reload: ไม่มีทูน่าซอง', row(tabA, 'tuna-pouch'), async (el) => {
    await expect.soft(el).toHaveCount(0);
  });
  await checkSummary(tabA, { subtotal: 548, shipping: 50, total: 598 }, 'หลัง reload: ');
  await checkCount(tabA, 2, 'หลัง reload: ');
});

test("TC-CART-023 ตะกร้าเก็บเฉพาะเครื่อง: บัญชีเดียวกันในเบราว์เซอร์อื่นไม่เห็น และไม่ลบตะกร้าเครื่องเดิม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: 🛒 0 · `/cart` ไม่มีบรรทัดสินค้า · ข้อ 3: A ยังมีทูน่าซอง ×2 = ฿70 · ยอดชำระ ฿120 (฿70 + ส่ง ฿50) · 🛒 2" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[D] · R70 · Q24 (สมมติฐานที่ใช้: ตะกร้าเก็บเฉพาะเครื่อง จนกว่าทีมตอบ Q24 · ถ้าทีมยืนยันว่าต้องผูกกับบัญชีตาม R70 ผลข้อ 2 เป็น 🛒 2 · `/cart` มีทูน่าซอง ×2 = ฿70 · ยอดชำระ ฿120 และที่มาเป็น [R]+[D]) · ความเสี่ยง: ล็อกอินอีกเครื่องแล้วล้างตะกร้าเครื่องเดิม · เทคนิค: State" },
  ],
}, async ({ page, browser }) => {
  const ctxB = await browser.newContext({ baseURL: baseURL(), viewport: { width: 1280, height: 800 } });
  try {
    await test.step('เตรียม: context A ล็อกอิน demo ใส่ทูน่าซอง ×2', async () => {
      await loginApi(page);
      await addFromPdp(page, 'tuna-pouch', null, 2);
    });
    const pb = await ctxB.newPage();
    await test.step('1. ที่ B (context ใหม่ ไม่มี localStorage) ล็อกอิน demo', async () => {
      await pb.goto('/login');
      await ready(pb);
      await pb.getByTestId('login-email').fill(DEMO.email);
      await pb.getByTestId('login-password').fill(DEMO.password);
      await pb.getByTestId('login-submit').click();
      await pb.waitForURL((u) => u.pathname !== '/login', { timeout: 10000 }).catch(() => {});
      await ready(pb);
    });
    await test.step('2. ที่ B อ่าน 🛒 และเปิด /cart', async () => {});
    await checkCount(pb, 0, 'ข้อ 2 (B): ');
    await test.step('2. (ต่อ) ที่ B เปิด /cart', async () => {
      await openCart(pb);
    });
    await checkRows(pb, 0, 'ข้อ 2 (B): /cart ไม่มีบรรทัดสินค้า · ');
    await test.step('3. ที่ A reload /cart', async () => {
      await openCart(page);
      await page.reload();
      await reloadedCart(page);
    });
    await checkLine(page, 'ข้อ 3 (A): ทูน่าซอง ×2', 'tuna-pouch', undefined, 2, 70);
    await checkSummary(page, { total: 120 }, 'ข้อ 3 (A): ');
    await checkCount(page, 2, 'ข้อ 3 (A): ');
  } finally {
    await ctxB.close();
  }
});

test("TC-CART-025 สั่งซื้อสำเร็จแล้วตะกร้าและคูปองถูกล้าง คูปองไม่ติดไปตะกร้าใหม่", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: URL ปลายทางขึ้นต้น `/orders/PP-` · ข้อ 2: 🛒 0 · `pp-cart` ไม่มีรายการ · `pp-coupon` ไม่มี key หรือเป็นค่าว่าง · ข้อ 3: ไม่มีบรรทัดสินค้า · ข้อ 4: ไม่มีคูปอง FREESHIP ติดมา · ยอดรวมสินค้า ฿35 · ค่าส่ง ฿50 · ยอดชำระ ฿85" },
    { type: 'source', description: "[R]+[D] · R72 · ความเสี่ยง: ซื้อซ้ำโดยไม่ตั้งใจ คูปองค้างติดไปคำสั่งถัดไป · เทคนิค: State · Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ล็อกอิน demo · ใส่ลูกแมว สูตรแซลมอน 400 g ×1 + ทูน่าซอง ×2 · ใช้คูปอง FREESHIP', async () => {
    await loginApi(page);
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(page, 'tuna-pouch', null, 2);
    await openCart(page);
    await page.getByTestId('coupon-input').fill('FREESHIP');
    await page.getByTestId('coupon-apply').click();
    await page.waitForFunction(() => !!localStorage.getItem('pp-coupon'), null, { timeout: 5000 }).catch(() => {});
  });
  await test.step('1. กด "ดำเนินการชำระเงิน →" กรอกที่อยู่ ส่งธรรมดา เก็บเงินปลายทาง กด "ยืนยันสั่งซื้อ ฿259"', async () => {
    await page.getByTestId('checkout-button').click();
    await page.waitForURL((u) => u.pathname === '/checkout', { timeout: 10000 });
    await ready(page);
    await fillCheckout(page);
    test.info().annotations.push({ type: 'note', description: `ปุ่ม: ${await page.getByTestId('place-order').innerText()}` });
    await page.getByTestId('place-order').click();
    await page.waitForURL(/\/orders\/PP-/, { timeout: 15000 }).catch(() => {});
    await ready(page);
  });
  await check(page, 'ข้อ 1: URL ปลายทางขึ้นต้น /orders/PP-', null, async () => {
    expect.soft(new URL(page.url()).pathname).toMatch(/^\/orders\/PP-/);
  });
  await test.step('2. ที่หน้า /orders/PP-… อ่าน 🛒 และดู pp-cart pp-coupon', async () => {});
  await checkCount(page, 0, 'ข้อ 2: ');
  await check(page, 'ข้อ 2: pp-cart ไม่มีรายการ', null, async () => {
    expect.soft(cartLen(await readCart(page))).toBe(0);
  }, { actual: () => readCart(page) });
  const coupon = () => page.evaluate(() => localStorage.getItem('pp-coupon'));
  await check(page, 'ข้อ 2: pp-coupon ไม่มี key หรือเป็นค่าว่าง', null, async () => {
    const v = await coupon();
    expect.soft(v === null || v === '' || v === '""' || v === 'null').toBe(true);
  }, { actual: coupon });
  await test.step('3. เปิด /cart', async () => {
    await openCart(page);
  });
  await checkRows(page, 0, 'ข้อ 3: ไม่มีบรรทัดสินค้า · ');
  await test.step('4. ใส่ทูน่าซอง ×1 แล้วเปิด /cart', async () => {
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  await check(page, 'ข้อ 4: ไม่มีคูปอง FREESHIP ติดมา', summaryBox(page), async (el) => {
    await expect.soft(el).not.toContainText('FREESHIP');
    expect.soft(String((await coupon()) ?? '')).not.toContain('FREESHIP');
  }, { actual: async () => ({ ppCoupon: await coupon(), summary: await summaryBox(page).innerText().catch(() => '') }) });
  await checkSummary(page, { subtotal: 35, shipping: 50, total: 85 }, 'ข้อ 4: ');
});

test("TC-CART-026 guest กดไปชำระเงินถูกพาไปล็อกอิน แล้วกลับมาพร้อมตะกร้าเดิม", {
  tag: ['@P1', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ยอดรวมสินค้า ฿224 (฿189 + ฿35) · ค่าส่ง ฿50 · ยอดชำระ ฿274 (฿224 + ฿50) · ข้อ 2: URL ปลายทาง `/login?next=/checkout` (หรือ `next=%2Fcheckout`) · ข้อ 3: URL ปลายทาง `/checkout` · ข้อ 4: 🛒 2 · รายการ 2 บรรทัดเดิม · ยอดชำระ ฿274 ตรงกับหน้าตะกร้า" },
    { type: 'source', description: "[R]+[D] · R68 · R98 · R149 · ข้อนี้เป็นเจ้าของกรณี guest → ล็อกอิน → กลับ checkout พร้อมตะกร้า (TC-CHK-002 ตรวจแค่เปิด `/checkout` ตรง ๆ) · ความเสี่ยง: ตะกร้าหายหรือยอดเปลี่ยนระหว่างทางไปล็อกอิน · เทคนิค: State · Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ตะกร้ามีลูกแมว สูตรแซลมอน 400 g ×1 + ทูน่าซอง ×1 · อยู่ที่ /cart', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(page, 'tuna-pouch', null, 1);
    await openCart(page);
  });
  await test.step('1. อ่านสรุปยอด', async () => {});
  await checkSummary(page, { subtotal: 224, shipping: 50, total: 274 }, 'ข้อ 1: ');
  await test.step('2. กด "ดำเนินการชำระเงิน →"', async () => {
    await page.getByTestId('checkout-button').click();
    await page.waitForURL((u) => u.pathname !== '/cart', { timeout: 10000 }).catch(() => {});
    await ready(page);
  });
  await check(page, 'ข้อ 2: URL ปลายทาง /login?next=/checkout (หรือ next=%2Fcheckout)', null, async () => {
    const u = new URL(page.url());
    expect.soft(u.pathname).toBe('/login');
    expect.soft(u.search).toMatch(/^\?next=(\/|%2F)checkout$/i);
  });
  await test.step('3. ล็อกอิน demo', async () => {
    if (new URL(page.url()).pathname !== '/login') await page.goto('/login?next=/checkout');
    await page.getByTestId('login-email').fill(DEMO.email);
    await page.getByTestId('login-password').fill(DEMO.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL((u) => u.pathname !== '/login', { timeout: 10000 }).catch(() => {});
    await ready(page);
  });
  await check(page, 'ข้อ 3: URL ปลายทาง /checkout', null, async () => {
    expect.soft(new URL(page.url()).pathname).toBe('/checkout');
  });
  await test.step('4. อ่าน 🛒 และยอดในหน้า checkout', async () => {});
  await checkCount(page, 2, 'ข้อ 4: ');
  const lines = summaryBox(page).locator('ul > li');
  await check(page, 'ข้อ 4: รายการ 2 บรรทัดเดิม (ลูกแมว สูตรแซลมอน 400 g × 1 · ทูน่าซอง × 1)', lines, async (el) => {
    await expect.soft(el).toHaveCount(2);
    await expect.soft(el.filter({ hasText: 'ลูกแมว สูตรแซลมอน' })).toContainText(/400 g\s*×\s*1/);
    await expect.soft(el.filter({ hasText: 'ทูน่า' })).toContainText(/×\s*1/);
  }, { actual: async () => (await lines.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')) });
  await checkSummary(page, { total: 274 }, 'ข้อ 4 (ตรงกับหน้าตะกร้า): ');
});

test("TC-XSELL-001 ใส่สินค้าจากกล่องแนะนำ ราคาตรงกับหน้าสินค้า และยอดตะกร้าเพิ่มตาม", {
  tag: ['@P3', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1–2: ราคาในกล่อง ฿39 = ราคา 85 g ในหน้าสินค้า ฿39 · ข้อ 4: มีบรรทัดมูสไก่ลูกแมว 85 g ×1 = ฿39 · ยอดรวมสินค้า ฿228 (฿189 + ฿39) · ค่าส่ง ฿50 · ยอดชำระ ฿278 (฿228 + ฿50) · 🛒 2 · `pp-cart` มี `kitten-chicken-mousse` qty 1 · ถ้าใช้ชิ้นแรกแทน (ราคาขนาดเล็กสุดในหน้าสินค้า = P): ราคาในกล่อง = P · บรรทัดใหม่ ×1 = P · ยอดรวมสินค้า ฿189 + P · ค่าส่ง ฿50 ถ้า ฿189 + P < ฿999 ไม่งั้น ฿0 · ยอดชำระ = ยอดรวมสินค้า + ค่าส่ง · 🛒 2 · `pp-cart` มี slug ของชิ้นนั้น qty 1" },
    { type: 'source', description: "[R]+[D] · R58 · ความเสี่ยง: ราคาในกล่องไม่ตรงกับราคาที่คิดจริง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ตะกร้ามีลูกแมว สูตรแซลมอน 400 g ×1 · อยู่ที่ /cart', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await openCart(page);
  });
  const box = recoBox(page);
  let card: Locator = box.getByTestId('product-card').first();
  let slug = 'kitten-chicken-mousse';
  let isMousse = true;
  let boxPrice = NaN;
  await test.step('1. หากล่อง "มักซื้อคู่กับสินค้าในตะกร้า" จดชื่อและราคาที่แสดงของสินค้าที่เลือก (มูสไก่ลูกแมว หรือชิ้นแรก)', async () => {
    await box.waitFor({ timeout: 10000 });
    const mousse = box.locator('[data-testid="product-card"][data-slug="kitten-chicken-mousse"]');
    if ((await mousse.count()) > 0) {
      card = mousse.first();
    } else {
      isMousse = false;
      card = box.getByTestId('product-card').first();
      slug = (await card.getAttribute('data-slug')) ?? '';
    }
    boxPrice = parseBaht(await card.getByTestId('product-price').innerText());
    test.info().annotations.push({
      type: 'note',
      description: `สินค้าที่เลือก: ${slug} "${await card.getByTestId('product-name').innerText()}" ราคาในกล่อง ${baht(boxPrice)}`,
    });
  });
  let P = NaN;
  await test.step(`2. เปิดหน้าสินค้าที่เลือกในแท็บใหม่ อ่านราคาขนาดเล็กสุด แล้วปิด`, async () => {
    const p2 = await page.context().newPage();
    await p2.goto(`/products/${slug}`);
    await ready(p2);
    P = await smallestPdpPrice(p2);
    await check(p2, `ข้อ 2: ราคาขนาดเล็กสุดในหน้าสินค้า${isMousse ? ' = ฿39' : ''}`, p2.getByTestId('size-option').first(), async () => {
      if (isMousse) expect.soft(P).toBe(39);
    }, { actual: async () => `${baht(P)} (${(await p2.getByTestId('size-option').allInnerTexts()).join(' / ')})` });
    await p2.close();
    await page.bringToFront();
  });
  await check(page, isMousse ? 'ข้อ 1–2: ราคาในกล่อง ฿39 = ราคา 85 g ในหน้าสินค้า ฿39' : 'ข้อ 1–2: ราคาในกล่อง = P (ราคาขนาดเล็กสุดในหน้าสินค้า)', card.getByTestId('product-price'), async (el) => {
    await expect.soft(el).toHaveText(baht(isMousse ? 39 : P));
  });
  await test.step('3. ในกล่อง กดใส่ตะกร้าที่สินค้าที่เลือก', async () => {
    await card.getByTestId('quick-add').click();
    await row(page, slug).waitFor({ timeout: 5000 }).catch(() => {});
  });
  await test.step('4. อ่านบรรทัดใหม่ สรุปยอด และ 🛒', async () => {});
  const price = isMousse ? 39 : P;
  const sub = 189 + price;
  const ship = sub < 999 ? 50 : 0;
  await checkLine(page, `ข้อ 4: บรรทัดใหม่ ${isMousse ? 'มูสไก่ลูกแมว 85 g' : slug} ×1`, slug, undefined, 1, price);
  await checkSummary(page, { subtotal: sub, shipping: ship, total: sub + ship }, 'ข้อ 4: ');
  await checkCount(page, 2, 'ข้อ 4: ');
  await checkLsQty(page, 'ข้อ 4: ', slug, undefined, 1);
});

test("TC-XSELL-002 กล่องไม่อ้างว่าคุ้มกว่าถ้าไม่มีส่วนลด และกดใส่ซ้ำต้องรวมบรรทัดเดิม", {
  tag: ['@P3', '@5.3'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ข้อความทั้งกล่องไม่มีคำว่า \"คุ้มกว่า\" · ถ้ามี ราคาของชิ้นที่ติดคำนั้นต้องต่ำกว่าราคาขนาดเดียวกันในหน้าสินค้า (มูสไก่ลูกแมว < ฿39) · ข้อ 3: ชิ้นนั้นเป็น 1 บรรทัด จำนวน 2 = 2P (ไม่มีบรรทัดซ้ำ) · มูสไก่ลูกแมวยัง ×1 = ฿39 · ยอดรวมสินค้า ฿228 + 2P · ค่าส่ง ฿50 ถ้า ฿228 + 2P < ฿999 ไม่งั้น ฿0 · ยอดชำระ = ยอดรวมสินค้า + ค่าส่ง · 🛒 4" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R]+[D] · R58 · Q14 · ความเสี่ยง: ลูกค้าเข้าใจว่าได้ราคาพิเศษ หรือได้บรรทัดซ้ำ · เทคนิค: State · Negative" },
  ],
}, async ({ page }) => {
  await test.step('เตรียม: ใส่ลูกแมว สูตรแซลมอน 400 g ×1 และมูสไก่ลูกแมว 85 g ×1 ผ่านหน้าเว็บ · อยู่ที่ /cart (ยอดรวมสินค้า ฿228)', async () => {
    await addFromPdp(page, 'kitten-salmon-dry', S.k400, 1);
    await addFromPdp(page, 'kitten-chicken-mousse', S.mousse, 1);
    await openCart(page);
  });
  const box = recoBox(page);
  type CardInfo = { slug: string; boxPrice: number; pdpPrice: number };
  const infos: CardInfo[] = [];
  let boxText = '';
  await test.step('1. อ่านข้อความทั้งกล่องแนะนำ (หัวข้อ ป้าย และปุ่ม) และราคาของทุกชิ้นในกล่อง', async () => {
    await box.waitFor({ timeout: 10000 });
    boxText = (await box.innerText()).replace(/\s+/g, ' ');
    const cards = box.getByTestId('product-card');
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const c = cards.nth(i);
      const s = (await c.getAttribute('data-slug')) ?? '';
      const bp = parseBaht(await c.getByTestId('product-price').innerText());
      infos.push({ slug: s, boxPrice: bp, pdpPrice: NaN });
    }
    if (boxText.includes('คุ้มกว่า')) {
      // ราคาขนาดเดียวกัน (ขนาดเล็กสุด = ขนาดที่ปุ่มในกล่องใส่) ในหน้าสินค้าของทุกชิ้นที่อยู่ใต้หัวข้อนั้น
      for (const info of infos) {
        const p2 = await page.context().newPage();
        await p2.goto(`/products/${info.slug}`);
        await ready(p2);
        info.pdpPrice = await smallestPdpPrice(p2);
        await p2.close();
      }
      await page.bringToFront();
    }
  });
  await check(page, 'ข้อ 1: ข้อความทั้งกล่องไม่มีคำว่า "คุ้มกว่า" · ถ้ามี ราคาของชิ้นที่ติดคำนั้นต้องต่ำกว่าราคาขนาดเดียวกันในหน้าสินค้า', box, async () => {
    if (boxText.includes('คุ้มกว่า')) {
      for (const i of infos) expect.soft(i.boxPrice, `${i.slug}: ราคาในกล่อง < ราคาในหน้าสินค้า ${baht(i.pdpPrice)}`).toBeLessThan(i.pdpPrice);
    } else {
      expect.soft(boxText).not.toContain('คุ้มกว่า');
    }
  }, { actual: async () => ({ boxText, cards: infos }) });
  const chosen = infos.find((i) => i.slug !== 'kitten-chicken-mousse' && i.slug !== 'kitten-salmon-dry');
  if (!chosen) {
    await check(page, 'ข้อ 2: มีชิ้นในกล่องที่ยังไม่อยู่ในตะกร้า', box, async () => {
      expect.soft(chosen, 'ไม่มีชิ้นในกล่องที่ใช้ทดสอบได้').toBeTruthy();
    }, { actual: async () => infos });
    return;
  }
  const P = chosen.boxPrice;
  await test.step(`2. กดใส่ตะกร้าที่ชิ้นแรกในกล่อง (${chosen.slug}) 2 ครั้ง`, async () => {
    const card = box.locator(`[data-testid="product-card"][data-slug="${chosen.slug}"]`);
    await card.getByTestId('quick-add').click();
    await row(page, chosen.slug).waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    if ((await card.count()) > 0) {
      await card.getByTestId('quick-add').click();
      await page.waitForTimeout(300);
    } else {
      // ชิ้นนั้นหายจากกล่อง → เปิดหน้าสินค้า เลือกขนาดเดียวกัน จำนวน 1 กด "🛒 เพิ่มลงตะกร้า" แล้วกลับ /cart (ห้ามใช้ปุ่ม +)
      const size = (await readCart(page))?.find((i) => i.slug === chosen.slug)?.size ?? null;
      await addFromPdp(page, chosen.slug, size, 1);
      await openCart(page);
    }
  });
  await test.step('3. อ่านบรรทัด สรุปยอด และ 🛒', async () => {});
  await check(page, `ข้อ 3: ${chosen.slug} เป็น 1 บรรทัด (ไม่มีบรรทัดซ้ำ)`, row(page, chosen.slug), async (el) => {
    await expect.soft(el).toHaveCount(1);
  });
  await checkLine(page, `ข้อ 3: ${chosen.slug} จำนวน 2 = 2P (P = ${baht(P)})`, chosen.slug, undefined, 2, 2 * P);
  await checkLine(page, 'ข้อ 3: มูสไก่ลูกแมวยัง ×1', 'kitten-chicken-mousse', undefined, 1, 39);
  const sub = 228 + 2 * P;
  const ship = sub < 999 ? 50 : 0;
  await checkSummary(page, { subtotal: sub, shipping: ship, total: sub + ship }, 'ข้อ 3: ');
  await checkCount(page, 4, 'ข้อ 3: ');
});
