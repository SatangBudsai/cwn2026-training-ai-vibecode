/**
 * หัวข้อ 5.4 คูปองและค่าส่ง (โมดูล CPN, SHIP) — TEST-PLAN.md บรรทัด 411–479
 * - ทุก test: reset อัตโนมัติ (fixture ใน pp.ts) · context ใหม่ (localStorage ว่าง) · ล็อกอิน demo ผ่าน API
 * - เติมตะกร้าผ่านหน้าสินค้า และเพิ่มจำนวนด้วยปุ่ม + เท่านั้น (เช็กลิสต์ 5.4)
 * - ยอดเงินที่คาดหวังเป็นตัวเลขตามแผน · ส่วนลดยอมรับเครื่องหมายลบทั้ง "−" (U+2212 ตามแผน) และ "-" (ที่เว็บใช้)
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, check, checkApi } from './support/pp';

// ---------------------------------------------------------------------------
// ข้อมูลทดสอบ
// ---------------------------------------------------------------------------
const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };
const ADDRESS = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  address: '99/1 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  postcode: '10110',
};
/** timeout ของ assertion ในจุดตรวจ (สั้นกว่าค่าเริ่มต้น เพราะหลายข้อคาดว่าจะล้มตามแผน) */
const T = { timeout: 3000 };

type Prod = { slug: string; size: string; name: string };
const PR = {
  kitten400: { slug: 'kitten-salmon-dry', size: '400 g', name: 'ลูกแมว สูตรแซลมอน' },
  kitten15: { slug: 'kitten-salmon-dry', size: '1.5 kg', name: 'ลูกแมว สูตรแซลมอน' },
  hairball: { slug: 'hairball-control-dry', size: '1.5 kg', name: 'สูตรลดก้อนขน' },
  adultChicken: { slug: 'adult-chicken-dry', size: '1.2 kg', name: 'แมวโต สูตรไก่' },
  tuna: { slug: 'tuna-pouch', size: 'ซอง 85 g', name: 'เพาช์ทูน่าในเยลลี่' },
  mousse: { slug: 'kitten-chicken-mousse', size: 'ซอง 85 g', name: 'มูสไก่ลูกแมว' },
  lickable4: { slug: 'lickable-salmon-treat', size: '4 ซอง', name: 'ขนมแมวเลีย แซลมอน' },
  fountain: { slug: 'cat-fountain', size: '2 ลิตร', name: 'น้ำพุแมว' },
  wand: { slug: 'cat-feather-wand', size: '1 ชิ้น', name: 'ไม้ตกแมว ขนนก' },
  scratcher: { slug: 'cat-scratcher', size: '1 ชิ้น', name: 'ที่ลับเล็บแมว' },
  beefStew: { slug: 'beef-stew-can', size: '400 g', name: 'สตูว์เนื้อกระป๋อง' },
} satisfies Record<string, Prod>;
type Line = [Prod, number];

/** ตะกร้าตามยอดที่ใช้ซ้ำ (หัวข้อ 7.2) */
const SET_998: Line[] = [[PR.adultChicken, 2], [PR.tuna, 8]];
const SET_999: Line[] = [[PR.fountain, 1], [PR.tuna, 2], [PR.mousse, 1]];
const SET_1000: Line[] = [[PR.kitten400, 3], [PR.adultChicken, 1], [PR.mousse, 1], [PR.tuna, 1]];
const SET_1110: Line[] = [[PR.kitten15, 1], [PR.hairball, 1]];
const SET_503: Line[] = [[PR.adultChicken, 1], [PR.mousse, 1], [PR.tuna, 3]];
const SET_499: Line[] = [[PR.adultChicken, 1], [PR.tuna, 4]];

// ---------------------------------------------------------------------------
// ตัวช่วย (ทำขั้นตอน)
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** ส่วนลด −฿N (ยอมรับ "−" และ "-") */
const minus = (amount: string) => new RegExp(`^\\s*[−-]\\s*฿${esc(amount)}\\s*$`);
const ANY_MINUS = /[−-]\s*฿/;

/** element สรุปยอดในหน้า (cart / checkout / orders) */
const S = (page: Page, id: string): Locator => page.locator('main').getByTestId(id).first();

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

async function loginDemo(page: Page) {
  const r = await page.request.post('/api/auth/login', { data: DEMO });
  expect(r.ok(), `ล็อกอิน demo ไม่สำเร็จ: HTTP ${r.status()}`).toBeTruthy();
}

/** เปิดหน้าสินค้า เลือกขนาด กด + จนได้จำนวน แล้วกด "🛒 เพิ่มลงตะกร้า" */
async function addToCart(page: Page, p: Prod, qty = 1) {
  await page.goto(`/products/${p.slug}`);
  const size = page.getByTestId('size-option').filter({ hasText: new RegExp(`^\\s*${esc(p.size)}`) });
  await size.first().click();
  await expect(size.first()).toHaveAttribute('aria-pressed', 'true');
  for (let i = 1; i < qty; i++) await page.getByTestId('qty-plus').click();
  await expect(page.getByTestId('qty-input')).toHaveValue(String(qty));
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'ลงตะกร้าแล้ว' }).first()).toBeVisible();
}

async function fillCart(page: Page, lines: Line[]) {
  for (const [p, q] of lines) await addToCart(page, p, q);
}

async function gotoCart(page: Page) {
  await page.goto('/cart');
  await settle(page);
}

/** พิมพ์โค้ดในช่อง "โค้ดส่วนลด" แล้วกด "ใช้โค้ด" รอผลจาก POST /api/coupons/validate */
async function applyCoupon(page: Page, code: string) {
  await page.getByTestId('coupon-input').fill(code);
  const resp = page
    .waitForResponse((r) => r.url().includes('/api/coupons/validate'), { timeout: 5000 })
    .catch(() => null);
  await page.getByTestId('coupon-apply').click();
  await resp;
  await settle(page);
}

/** จากตะกร้ากด "ดำเนินการชำระเงิน →" */
async function toCheckout(page: Page) {
  await page.getByTestId('checkout-button').click();
  await page.waitForURL(/\/checkout/);
  await expect(page.getByTestId('place-order')).toBeVisible();
  await settle(page);
}

async function chooseShipping(page: Page, method: 'standard' | 'express') {
  await page.getByTestId(`shipping-${method}`).check();
}

function cartLine(page: Page, p: Prod): Locator {
  return page.getByTestId('cart-item').filter({ hasText: p.name }).filter({ hasText: p.size });
}

async function linePlus(page: Page, p: Prod, expectQty: number) {
  const line = cartLine(page, p);
  await line.getByTestId('item-plus').click();
  await expect(line.getByTestId('item-qty')).toHaveValue(String(expectQty));
  await settle(page);
}

async function lineMinus(page: Page, p: Prod, expectQty: number) {
  const line = cartLine(page, p);
  await line.getByTestId('item-minus').click();
  await expect(line.getByTestId('item-qty')).toHaveValue(String(expectQty));
  await settle(page);
}

async function removeLine(page: Page, p: Prod) {
  const line = cartLine(page, p);
  await line.getByTestId('item-remove').click();
  await expect(line).toHaveCount(0);
  await settle(page);
}

async function removeAllLines(page: Page) {
  const rm = page.getByTestId('item-remove');
  for (let n = await rm.count(); n > 0; n = await rm.count()) {
    await rm.first().click();
    await expect(rm).toHaveCount(n - 1);
  }
  await settle(page);
}

async function fillAddress(page: Page) {
  await page.getByTestId('ship-name').fill(ADDRESS.name);
  await page.getByTestId('ship-phone').fill(ADDRESS.phone);
  await page.getByTestId('ship-address').fill(ADDRESS.address);
  await page.getByTestId('ship-province').selectOption(ADDRESS.province);
  await page.getByTestId('ship-postcode').fill(ADDRESS.postcode);
  await page.getByTestId('pay-cod').check();
}

/** กดปุ่มยืนยันสั่งซื้อ คืน status/body ของ POST /api/orders */
async function placeOrder(page: Page) {
  const respP = page.waitForResponse(
    (r) => /\/api\/orders$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
    { timeout: 15000 },
  );
  await page.getByTestId('place-order').click();
  const resp = await respP;
  const reqBody = resp.request().postDataJSON() as Record<string, unknown> | null;
  let body: any = null;
  try {
    body = await resp.json();
  } catch {
    body = await resp.text().catch(() => null);
  }
  const status = resp.status();
  if (status === 201) {
    await page.waitForURL(/\/orders\/[^/?#]+/);
    await expect(page.getByTestId('order-id')).toBeVisible();
    await settle(page);
  }
  return { status, body, reqBody };
}

const readCoupon = (page: Page) => page.evaluate(() => localStorage.getItem('pp-coupon'));
const couponCode = (raw: string | null): string | null => {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    return typeof v === 'string' ? v : raw;
  } catch {
    return raw;
  }
};

// ---------------------------------------------------------------------------
// ตัวช่วย (จุดตรวจ)
// ---------------------------------------------------------------------------
async function expectText(page: Page, label: string, id: string, text: string | RegExp) {
  await check(page, label, S(page, id), async (el) => {
    await expect.soft(el).toHaveText(text, T);
  });
}
const subtotalIs = (page: Page, v: string) => expectText(page, `ยอดรวมสินค้า ${v}`, 'summary-subtotal', v);
const discountIs = (page: Page, v: string) => expectText(page, `ส่วนลด −${v}`, 'summary-discount', minus(v.replace('฿', '')));
const discountZero = (page: Page) => expectText(page, 'ส่วนลด ฿0', 'summary-discount', '฿0');
const shippingIs = (page: Page, v: string) => expectText(page, `ค่าส่ง ${v}`, 'summary-shipping', v);
const shippingFree = (page: Page) => expectText(page, 'ค่าส่ง "ฟรี"', 'summary-shipping', /^\s*ฟรี/);
const totalIs = (page: Page, v: string) => expectText(page, `ยอดชำระ ${v}`, 'summary-total', v);
const buttonIs = (page: Page, v: string) =>
  check(page, `ปุ่ม "ยืนยันสั่งซื้อ ${v}"`, page.getByTestId('place-order'), async (el) => {
    await expect.soft(el).toHaveText(`ยืนยันสั่งซื้อ ${v}`, T);
  });
const barIs = (page: Page, text: string) =>
  check(page, `แถบ "${text}"`, page.getByTestId('free-shipping-progress'), async (el) => {
    await expect.soft(el).toHaveText(text, T);
  });
const messageIs = (page: Page, text: string) =>
  check(page, `ข้อความ "${text}"`, page.getByTestId('coupon-message'), async (el) => {
    await expect.soft(el).toHaveText(text, T);
  });
/** ไม่มีบรรทัดส่วนลดที่หักเงิน (ส่วนลด ฿0 หรือไม่มีบรรทัด) */
const noDiscountLine = (page: Page, label = 'ไม่มีบรรทัดส่วนลด (ส่วนลด ฿0)') =>
  check(page, label, page.locator('main').getByTestId('summary-discount'), async (el) => {
    const n = await el.count();
    if (n > 0) await expect.soft(el.first()).not.toHaveText(ANY_MINUS, T);
  });
const couponIs = (page: Page, code: string) =>
  check(
    page,
    `pp-coupon = "${code}"`,
    null,
    async () => {
      expect.soft(couponCode(await readCoupon(page))).toBe(code);
    },
    { actual: () => readCoupon(page) },
  );
const couponEmpty = (page: Page, label = 'pp-coupon ไม่มีค่า (ไม่มี key ใน localStorage)') =>
  check(
    page,
    label,
    null,
    async () => {
      expect.soft(await readCoupon(page)).toBeNull();
    },
    { actual: () => readCoupon(page) },
  );
const radioChecked = (page: Page, method: 'standard' | 'express') =>
  check(page, `radio ${method === 'express' ? 'ส่งด่วน' : 'ส่งธรรมดา'} checked`, page.getByTestId(`shipping-${method}`), async (el) => {
    await expect.soft(el).toBeChecked(T);
  });

// ===========================================================================
// F12 คูปองส่วนลด
// ===========================================================================

test("TC-CPN-001 PAW10 ที่ยอดลงตัว ลด 10% แล้วได้ส่งฟรีพอดี ยอดตรงกันทั้งตะกร้าและ checkout", {
  tag: ["@P1", '@5.4', '@mobile-too'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿1,110 · ส่วนลด −฿111 · ค่าส่ง \"ฟรี\" · ยอดชำระ ฿999 (฿1,110 − ฿111 [10% = 111.0 ลงตัว] + ส่ง ฿0 = ฿999 เพราะ ฿999 ≥ ฿999) · แถบขึ้น \"ได้ส่งฟรีแล้ว!\" · `pp-coupon` = \"PAW10\" · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿999\"" },
    { type: 'source', description: "[D] · R73 · R74 · R90 · ความเสี่ยง: คิด 10% ผิดหรือ checkout ไม่ใช้ส่วนลดจากตะกร้า · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 1.5 kg กด "🛒 เพิ่มลงตะกร้า" แล้วเพิ่มสูตรลดก้อนขน 1.5 kg ×1', async () => {
    await fillCart(page, SET_1110);
  });
  await test.step('2. เปิด /cart พิมพ์ PAW10 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
  });
  await test.step('3. อ่านสรุปยอดและ pp-coupon', async () => {
    await subtotalIs(page, '฿1,110');
    await discountIs(page, '฿111');
    await shippingFree(page);
    await totalIs(page, '฿999');
    await barIs(page, 'ได้ส่งฟรีแล้ว!');
    await couponIs(page, 'PAW10');
  });
  await test.step('4. กด "ดำเนินการชำระเงิน →" (เลือกส่งธรรมดา) แล้วอ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿999');
  });
});

test("TC-CPN-002 PAW10 กับสินค้าชิ้นเดียวราคาลงตัว (ยอดต่ำกว่าเกณฑ์ส่งฟรี)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿520 · ส่วนลด −฿52 · ค่าส่ง ฿50 · ยอดชำระ ฿518 (฿520 − ฿52 + ส่ง ฿50 = ฿518) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿518\"" },
    { type: 'source', description: "[D] · R73 · R74 · ความเสี่ยง: ส่วนลดเปอร์เซ็นต์คิดจากฐานผิด (เช่น รวมค่าส่ง) · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน 1.5 kg ×1 จากหน้าสินค้า', async () => {
    await addToCart(page, PR.hairball, 1);
  });
  await test.step('2. เปิด /cart ใส่ PAW10 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
    await subtotalIs(page, '฿520');
    await discountIs(page, '฿52');
    await shippingIs(page, '฿50');
    await totalIs(page, '฿518');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿518');
  });
});

test("TC-CPN-003 PAW10 ที่ส่วนลดมีเศษ 0.7 ต้องปัดครึ่งขึ้น", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿567 · ส่วนลด −฿57 · ค่าส่ง ฿50 · ยอดชำระ ฿560 (฿189×3 = ฿567 − PAW10 ฿57 [56.7 ปัดครึ่งขึ้น] + ส่ง ฿50 = ฿560) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿560\" (ตอนนี้ล้ม: ส่วนลด −฿56 ยอด ฿561 เพราะปัดลงเสมอ)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R73 · Q20 · ความเสี่ยง: ลูกค้าได้ส่วนลดไม่ถึง 10% ทุกออเดอร์ที่มีเศษ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 400 g กด + ให้เป็น 3 แล้วเพิ่มลงตะกร้า', async () => {
    await addToCart(page, PR.kitten400, 3);
  });
  await test.step('2. เปิด /cart ใส่ PAW10 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
    await subtotalIs(page, '฿567');
    await discountIs(page, '฿57');
    await shippingIs(page, '฿50');
    await totalIs(page, '฿560');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿560');
  });
});

test("TC-CPN-004 ตารางปัดเศษ PAW10 ที่เศษต่างกัน (.9 / .8 / .5 / .4)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ก) ส่วนลด −฿19 · ยอดชำระ ฿220 (฿189 − ฿19 [18.9 ปัดครึ่งขึ้น] + ส่ง ฿50 = ฿220) · ปุ่ม \"ยืนยันสั่งซื้อ ฿220\" · ข) ส่วนลด −฿100 · ยอดชำระ ฿948 (฿998 − ฿100 [99.8 ปัดครึ่งขึ้น] + ส่ง ฿50 = ฿948) · ปุ่ม \"ยืนยันสั่งซื้อ ฿948\" · ค) ส่วนลด −฿111 · ค่าส่ง \"ฟรี\" · ยอดชำระ ฿1,003 (฿1,114 − ฿111 [111.4 ปัดครึ่งขึ้น = 111] + ส่ง ฿0 เพราะ ฿1,003 ≥ ฿999 = ฿1,003) · ปุ่ม \"ยืนยันสั่งซื้อ ฿1,003\" · ง) ส่วนลด −฿11 · ค่าส่ง ฿50 · ยอดชำระ ฿144 (฿105 − ฿11 [10.5 ปัดครึ่งขึ้น = 11 ไม่ใช่ 10] + ส่ง ฿50 = ฿144) · ปุ่ม \"ยืนยันสั่งซื้อ ฿144\" (ตอนนี้ล้ม: ก −฿18 ยอด ฿221 · ข −฿99 ยอด ฿949 · ค ผ่าน · ง −฿10 ยอด ฿145)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R73 · Q20 · ความเสี่ยง: กฎปัดเศษผิดเฉพาะบางช่วงเศษ · เทคนิค: Boundary · Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  const sets: { name: string; lines: Line[]; discount: string; shipping?: 'free' | string; total: string }[] = [
    { name: 'ก', lines: [[PR.kitten400, 1]], discount: '฿19', total: '฿220' },
    { name: 'ข', lines: SET_998, discount: '฿100', total: '฿948' },
    { name: 'ค', lines: [[PR.fountain, 1], [PR.kitten400, 1], [PR.tuna, 1]], discount: '฿111', shipping: 'free', total: '฿1,003' },
    { name: 'ง', lines: [[PR.tuna, 3]], discount: '฿11', shipping: '฿50', total: '฿144' },
  ];
  for (const [i, s] of sets.entries()) {
    await test.step(`1. เติมตะกร้าชุด ${s.name}`, async () => {
      await fillCart(page, s.lines);
    });
    await test.step(`2. ชุด ${s.name}: /cart ใส่ PAW10 อ่านสรุปยอด แล้วไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน`, async () => {
      await gotoCart(page);
      await applyCoupon(page, 'PAW10');
      await discountIs(page, s.discount);
      if (s.shipping === 'free') await shippingFree(page);
      else if (s.shipping) await shippingIs(page, s.shipping);
      await totalIs(page, s.total);
      await toCheckout(page);
      await chooseShipping(page, 'standard');
      await buttonIs(page, s.total);
    });
    if (i < sets.length - 1) {
      await test.step(`3. ลบสินค้าทุกบรรทัด กด "นำคูปอง PAW10 ออก" (ถ้ายังมี) ก่อนทำชุดถัดไป`, async () => {
        await gotoCart(page);
        await removeAllLines(page);
        const rm = page.getByTestId('coupon-remove');
        if (await rm.isVisible().catch(() => false)) await rm.click();
      });
    }
  }
});

test("TC-CPN-005 FREESHIP กับส่งธรรมดา ค่าส่งเป็น ฿0 ไม่ลดค่าสินค้า", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿189 · ค่าส่ง \"ฟรี\" (฿0) · ยอดชำระ ฿189 (฿189 − ฿0 + ส่ง ฿0 = ฿189) · `pp-coupon` = \"FREESHIP\" · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿189\"" },
    { type: 'source', description: "[D] · R94 · ความเสี่ยง: FREESHIP ไม่ยกเว้นค่าส่ง หรือไปหักค่าสินค้าแทน · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  await test.step('2. /cart ใส่ FREESHIP กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'FREESHIP');
    await subtotalIs(page, '฿189');
    await shippingFree(page);
    await totalIs(page, '฿189');
    await couponIs(page, 'FREESHIP');
  });
  await test.step('3. ไป /checkout เลือกส่งธรรมดา อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿189');
  });
});

test("TC-CPN-006 NEWCAT50 ที่อาหารแมว ฿503 (เหนือขอบ) และเกณฑ์คิดจากยอดก่อนลด", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿503 · ส่วนลด −฿50 · ค่าส่ง ฿50 · ยอดชำระ ฿503 (฿503 − ฿50 + ส่ง ฿50 = ฿503) · หลัง reload ส่วนลดยังเป็น −฿50 (ยอดหลังลด ฿453 < ฿500 แต่เกณฑ์ใช้ยอดก่อนลด ฿503) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿503\"" },
    { type: 'source', description: "[D]+[R] · R80 · R83 · ความเสี่ยง: ตรวจเงื่อนไขซ้ำด้วยยอดหลังลดจนคูปองหลุดเอง · เทคนิค: Happy path · State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: แมวโต สูตรไก่ 1.2 kg + มูสไก่ลูกแมว 85 g + ทูน่าซอง ×3 (฿503)', async () => {
    await fillCart(page, SET_503);
  });
  await test.step('2. /cart ใส่ NEWCAT50 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await subtotalIs(page, '฿503');
    await discountIs(page, '฿50');
    await shippingIs(page, '฿50');
    await totalIs(page, '฿503');
  });
  await test.step('3. reload /cart อ่านยอดอีกครั้ง', async () => {
    await page.reload();
    await settle(page);
    await discountIs(page, '฿50');
  });
  await test.step('4. ไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿503');
  });
});

test("TC-CPN-007 NEWCAT50 ที่อาหารแมวเท่ากับ ฿500 พอดี (มีขนมแมวรวมอยู่)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ยอดรวมสินค้า ฿500 · ส่วนลด −฿50 · ค่าส่ง ฿50 · ยอดชำระ ฿500 (฿500 − ฿50 + ส่ง ฿50 = ฿500) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿500\"" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R80 · R81 · Q2 · ความเสี่ยง: ใช้ `>` แทน `≥` ที่ขอบ ฿500 หรือไม่นับขนมแมว · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: ลูกแมว 400 g + ทูน่าซอง + ขนมแมวเลีย 4 ซอง ×4 (กด + ให้เป็น 4)', async () => {
    await fillCart(page, [[PR.kitten400, 1], [PR.tuna, 1], [PR.lickable4, 4]]);
  });
  await test.step('2. /cart ใส่ NEWCAT50 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await subtotalIs(page, '฿500');
    await discountIs(page, '฿50');
    await shippingIs(page, '฿50');
    await totalIs(page, '฿500');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿500');
  });
});

test("TC-CPN-008 NEWCAT50 ที่อาหารแมว ฿499 (ต่ำกว่าขอบ ฿1) ต้องถูกปฏิเสธ", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้าขึ้นข้อความ \"ต้องซื้ออาหารแมวขั้นต่ำ ฿500\" · ไม่มีบรรทัดส่วนลด −฿50 (ส่วนลด ฿0) · ยอดชำระ ฿549 (฿499 − ฿0 + ส่ง ฿50 = ฿549) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿549\"" },
    { type: 'source', description: "[D] · R80 · ความเสี่ยง: ให้ส่วนลดต่ำกว่าขั้นต่ำ · เทคนิค: Boundary · Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: แมวโต สูตรไก่ 1.2 kg + ทูน่าซอง ×4 (฿499)', async () => {
    await fillCart(page, SET_499);
  });
  await test.step('2. /cart ใส่ NEWCAT50 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await messageIs(page, 'ต้องซื้ออาหารแมวขั้นต่ำ ฿500');
    await noDiscountLine(page, 'ไม่มีบรรทัดส่วนลด −฿50 (ส่วนลด ฿0)');
    await totalIs(page, '฿549');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่มยืนยัน', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿549');
  });
});

test("TC-CPN-009 NEWCAT50 ไม่นับของเล่น/ของใช้แมว/ของหมา แม้ยอดรวมเกิน ฿500", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ทุกชุดขึ้น \"ต้องซื้ออาหารแมวขั้นต่ำ ฿500\" และส่วนลด ฿0 · ก) ยอดชำระ ฿678 (฿628 − ฿0 + ส่ง ฿50) ปุ่ม \"ยืนยันสั่งซื้อ ฿678\" · ข) ฿808 (฿758 + ส่ง ฿50) ปุ่ม \"ยืนยันสั่งซื้อ ฿808\" · ค) ฿628 (฿578 + ส่ง ฿50) ปุ่ม \"ยืนยันสั่งซื้อ ฿628\"" },
    { type: 'source', description: "[D] · R82 · Q2 · ความเสี่ยง: เงื่อนไขใช้ยอดรวมทั้งตะกร้าแทนยอดอาหารแมว · เทคนิค: Negative · Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  const sets: { name: string; extra: Prod; total: string }[] = [
    { name: 'ก', extra: PR.wand, total: '฿678' },
    { name: 'ข', extra: PR.scratcher, total: '฿808' },
    { name: 'ค', extra: PR.beefStew, total: '฿628' },
  ];
  await test.step('1. เติมฐานอาหารแมว ฿499 (แมวโต สูตรไก่ + ทูน่าซอง ×4)', async () => {
    await fillCart(page, SET_499);
  });
  for (const [i, s] of sets.entries()) {
    await test.step(`${i === 0 ? '1' : '3'}. เพิ่มสินค้าชุด ${s.name}: ${s.extra.name}`, async () => {
      await addToCart(page, s.extra, 1);
    });
    await test.step(`2. ชุด ${s.name}: /cart ใส่ NEWCAT50 อ่านข้อความและยอด แล้วไป /checkout อ่านปุ่ม`, async () => {
      await gotoCart(page);
      await applyCoupon(page, 'NEWCAT50');
      await messageIs(page, 'ต้องซื้ออาหารแมวขั้นต่ำ ฿500');
      await noDiscountLine(page, 'ส่วนลด ฿0');
      await totalIs(page, s.total);
      await toCheckout(page);
      await chooseShipping(page, 'standard');
      await buttonIs(page, s.total);
    });
    if (i < sets.length - 1) {
      await test.step(`3. ลบสินค้าชุด ${s.name} ออก`, async () => {
        await gotoCart(page);
        await removeLine(page, s.extra);
      });
    }
  }
});

test("TC-CPN-010 NEWCAT50 ใช้ได้เมื่ออาหารแมวถึงเกณฑ์และมีของหมาปน (ลด ฿50 คงที่)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ส่วนลด −฿50 · ยอดชำระ ฿582 (฿582 − ฿50 + ส่ง ฿50 = ฿582) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿582\"" },
    { type: 'source', description: "[D] · R82 · ความเสี่ยง: ของหมาในตะกร้าทำให้คูปองแมวถูกปฏิเสธผิด · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: อาหารแมว ฿503 + สตูว์หมา ฿79 (฿582)', async () => {
    await fillCart(page, [...SET_503, [PR.beefStew, 1]]);
  });
  await test.step('2. /cart ใส่ NEWCAT50', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await discountIs(page, '฿50');
    await totalIs(page, '฿582');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿582');
  });
});

test("TC-CPN-011 NEWCAT50 ที่ใส่ในตะกร้าถูกใช้ใน checkout (ไม่มีช่องคูปองแยก) ทั้งส่งธรรมดาและส่งด่วน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ตะกร้า: ส่วนลด −฿50 · ยอดชำระ ฿520 (฿520 − ฿50 + ส่ง ฿50 = ฿520) · checkout ไม่มีช่องกรอกโค้ด · สรุปยอดแสดงส่วนลด −฿50 ทั้งสองวิธีส่ง · ส่งธรรมดา ปุ่ม \"ยืนยันสั่งซื้อ ฿520\" (เท่ากับยอดในตะกร้า) · ส่งด่วน ปุ่ม \"ยืนยันสั่งซื้อ ฿590\" (฿520 − ฿50 + ส่งด่วน ฿120 = ฿590)" },
    { type: 'source', description: "[D] · R80 · R96 · ความเสี่ยง: เปลี่ยนวิธีส่งแล้วส่วนลดหาย หรือยอดตะกร้ากับ checkout ไม่ตรงกัน ลูกค้าจ่ายไม่ตรงที่เห็น · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน ×1', async () => {
    await addToCart(page, PR.hairball, 1);
  });
  await test.step('2. /cart ใส่ NEWCAT50 จดยอด', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await discountIs(page, '฿50');
    await totalIs(page, '฿520');
  });
  await test.step('3. กด "ดำเนินการชำระเงิน →" ตรวจช่องกรอกโค้ด อ่านสรุปยอดและปุ่ม (ส่งธรรมดา)', async () => {
    await toCheckout(page);
    await check(page, 'checkout ไม่มีช่องกรอกโค้ด', page.locator('main').getByTestId('coupon-input'), async (el) => {
      await expect.soft(el).toHaveCount(0);
      await expect.soft(page.locator('main').getByRole('textbox', { name: /โค้ด|คูปอง|coupon/i })).toHaveCount(0);
    });
    await chooseShipping(page, 'standard');
    await discountIs(page, '฿50');
    await buttonIs(page, '฿520');
  });
  await test.step('4. เลือก radio ส่งด่วน อ่านสรุปยอดและปุ่มอีกครั้ง', async () => {
    await chooseShipping(page, 'express');
    await discountIs(page, '฿50');
    await buttonIs(page, '฿590');
  });
});

test("TC-CPN-012 SUMMER20 หมดอายุต้องถูกปฏิเสธพร้อมบอกเหตุผล", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ขึ้นข้อความ \"คูปองนี้หมดอายุแล้ว\" · ส่วนลด ฿0 · ยอดชำระ ฿239 (฿189 − ฿0 + ส่ง ฿50 = ฿239) · `pp-coupon` ไม่เป็น \"SUMMER20\" · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿239\"" },
    { type: 'source', description: "[D]+[R] · R77 · ความเสี่ยง: คูปองหมดอายุยังให้ส่วนลด หรือปฏิเสธโดยไม่บอกเหตุผล · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  await test.step('2. /cart ใส่ SUMMER20 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'SUMMER20');
  });
  await test.step('3. อ่านข้อความ ยอด และ pp-coupon', async () => {
    await messageIs(page, 'คูปองนี้หมดอายุแล้ว');
    await discountZero(page);
    await totalIs(page, '฿239');
    await check(page, 'pp-coupon ไม่เป็น "SUMMER20"', null, async () => {
      expect.soft(couponCode(await readCoupon(page))).not.toBe('SUMMER20');
    }, { actual: () => readCoupon(page) });
  });
  await test.step('4. ไป /checkout อ่านปุ่ม', async () => {
    await toCheckout(page);
    await buttonIs(page, '฿239');
  });
});

test("TC-CPN-013 โค้ดที่ไม่มีอยู่จริงต้องถูกปฏิเสธ", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ขึ้นข้อความ \"ไม่พบคูปองนี้\" · ส่วนลด ฿0 · ยอดชำระ ฿239 (฿189 + ส่ง ฿50) · `pp-coupon` ไม่มีค่า" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R78 · Q21 · ความเสี่ยง: โค้ดมั่วถูกเก็บแล้วส่งต่อไป checkout · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  await test.step('2. /cart ใส่ HELLO123 กด "ใช้โค้ด"', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'HELLO123');
  });
  await test.step('3. อ่านข้อความ ยอด และ pp-coupon', async () => {
    await messageIs(page, 'ไม่พบคูปองนี้');
    await discountZero(page);
    await totalIs(page, '฿239');
    await couponEmpty(page, 'pp-coupon ไม่มีค่า');
  });
});

test("TC-CPN-014 กด \"ใช้โค้ด\" ตอนช่องว่าง / มีแต่เว้นวรรค", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ทั้ง ก และ ข ขึ้นข้อความ \"กรุณากรอกโค้ด\" · ส่วนลด ฿0 · ยอดชำระ ฿239 (฿189 + ส่ง ฿50) · `pp-coupon` ไม่มีค่า (ตอนนี้ล้ม: ขึ้น \"ไม่พบคูปองนี้\")" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R78 · Q21 · ความเสี่ยง: ข้อความไม่บอกลูกค้าว่าลืมกรอก · เทคนิค: Negative · Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  const cases: [string, string, string][] = [
    ['ก', '', '2. /cart ปล่อยช่องโค้ดว่าง กด "ใช้โค้ด" อ่านข้อความ'],
    ['ข', '   ', '3. พิมพ์เว้นวรรค 3 ตัว กด "ใช้โค้ด" อ่านข้อความ'],
  ];
  for (const [name, code, title] of cases) {
    await test.step(title, async () => {
      if (name === 'ก') await gotoCart(page);
      await applyCoupon(page, code);
      await messageIs(page, 'กรุณากรอกโค้ด');
      await discountZero(page);
      await totalIs(page, '฿239');
      await couponEmpty(page, `กรณี ${name}: pp-coupon ไม่มีค่า`);
    });
  }
});

test("TC-CPN-015 โค้ดไม่สนตัวพิมพ์และเว้นวรรคหน้า-หลัง แต่เว้นวรรคกลางโค้ดไม่ผ่าน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ก) และ ข) ส่วนลด −฿52 · ยอดชำระ ฿518 (฿520 − ฿52 + ส่ง ฿50) · ชื่อคูปองที่แสดงคือ PAW10 · ค) ส่วนลด −฿50 · ยอดชำระ ฿520 (฿520 − ฿50 + ส่ง ฿50) · ง) ถูกปฏิเสธ ขึ้นข้อความ \"ไม่พบคูปองนี้\" · ส่วนลด ฿0 · ยอดชำระ ฿570 (฿520 + ส่ง ฿50) · `pp-coupon` ไม่มีค่า" },
    { type: 'source', description: "[R] · R76 · ความเสี่ยง: ลูกค้าพิมพ์ตัวเล็ก/ติดเว้นวรรคแล้วใช้ไม่ได้ หรือรับโค้ดเพี้ยน · เทคนิค: Equivalence partition · Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน ×1', async () => {
    await addToCart(page, PR.hairball, 1);
    await gotoCart(page);
  });
  const ok: { name: string; code: string; discount: string; total: string; show: string }[] = [
    { name: 'ก', code: ' paw10 ', discount: '฿52', total: '฿518', show: 'PAW10' },
    { name: 'ข', code: 'paw10', discount: '฿52', total: '฿518', show: 'PAW10' },
    { name: 'ค', code: 'newcat50', discount: '฿50', total: '฿520', show: 'NEWCAT50' },
  ];
  for (const [i, c] of ok.entries()) {
    await test.step(`${i === 0 ? '2' : '3'}. ใส่โค้ด ${c.name}) ${JSON.stringify(c.code)} กด "ใช้โค้ด" อ่านยอด แล้วกด "นำคูปอง … ออก"`, async () => {
      await applyCoupon(page, c.code);
      await discountIs(page, c.discount);
      await totalIs(page, c.total);
      if (c.show === 'PAW10') {
        await check(page, 'ชื่อคูปองที่แสดงคือ PAW10', page.locator('main').getByText(/PAW10/).first(), async (el) => {
          await expect.soft(el).toBeVisible(T);
          await expect.soft(page.locator('main').getByText(/paw10/)).toHaveCount(0);
        });
      }
      const rm = page.getByTestId('coupon-remove');
      if (await rm.isVisible().catch(() => false)) {
        await rm.click();
        await settle(page);
      }
    });
  }
  await test.step('3. ใส่โค้ด ง) "PAW 10" กด "ใช้โค้ด"', async () => {
    await applyCoupon(page, 'PAW 10');
    await messageIs(page, 'ไม่พบคูปองนี้');
    await discountZero(page);
    await totalIs(page, '฿570');
    await couponEmpty(page, 'pp-coupon ไม่มีค่า');
  });
});

test("TC-CPN-016 พิมพ์โค้ดผิดต้องไม่ลบคูปองที่ใช้อยู่", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2 ขึ้น \"คูปองนี้หมดอายุแล้ว\" · ข้อ 3 ขึ้น \"ไม่พบคูปองนี้\" · ทั้งสองครั้ง PAW10 ยังใช้อยู่: ส่วนลด −฿52 · ยอดชำระ ฿518 (฿520 − ฿52 + ส่ง ฿50) · `pp-coupon` = \"PAW10\" · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿518\" (ตอนนี้ล้ม: PAW10 หายไป `pp-coupon` ถูกลบ ยอดกลับเป็น ฿570)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R79 · Q21 · ความเสี่ยง: ลูกค้าเสียส่วนลดโดยไม่รู้ตัว · เทคนิค: Negative · State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน ×1 · /cart ใส่ PAW10 (ยอด ฿518)', async () => {
    await addToCart(page, PR.hairball, 1);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
    await totalIs(page, '฿518');
  });
  for (const [n, code, msg] of [
    ['2', 'SUMMER20', 'คูปองนี้หมดอายุแล้ว'],
    ['3', 'XXX', 'ไม่พบคูปองนี้'],
  ] as const) {
    await test.step(`${n}. พิมพ์ ${code} กด "ใช้โค้ด" อ่านข้อความ ยอด pp-coupon`, async () => {
      await applyCoupon(page, code);
      await messageIs(page, msg);
      await discountIs(page, '฿52');
      await totalIs(page, '฿518');
      await couponIs(page, 'PAW10');
    });
  }
  await test.step('4. ไป /checkout อ่านปุ่ม', async () => {
    await toCheckout(page);
    await buttonIs(page, '฿518');
  });
});

test("TC-CPN-017 ใช้คูปองได้ทีละ 1 ใบ ใบใหม่แทนใบเก่าและต้องมีข้อความบอก", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "มีข้อความที่มีคำว่า \"PAW10\" บอกว่าถูกแทนที่ · ไม่มีบรรทัดส่วนลด −฿52 · ค่าส่ง \"ฟรี\" · ยอดชำระ ฿520 (฿520 − ฿0 + ส่ง ฿0 = ฿520 ไม่ใช่ ฿468 ที่เกิดจากการซ้อน 2 ใบ) · `pp-coupon` = \"FREESHIP\" · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿520\" (ตอนนี้ล้ม: แทนที่เงียบ ๆ ไม่มีข้อความ)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R75 · Q21 · ความเสี่ยง: คูปองซ้อนกัน หรือลูกค้าไม่รู้ว่าคูปองเดิมหลุด · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน ×1 · /cart ใส่ PAW10 (ยอด ฿518)', async () => {
    await addToCart(page, PR.hairball, 1);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
    await totalIs(page, '฿518');
  });
  await test.step('2. ใส่ FREESHIP กด "ใช้โค้ด"', async () => {
    await applyCoupon(page, 'FREESHIP');
  });
  await test.step('3. อ่านข้อความ ยอด pp-coupon', async () => {
    const msg = page
      .getByTestId('coupon-message')
      .or(page.getByTestId('toast'))
      .or(page.getByRole('alert'))
      .or(page.getByRole('status'))
      .filter({ hasText: 'PAW10' });
    await check(page, 'มีข้อความที่มีคำว่า "PAW10" บอกว่าถูกแทนที่', msg, async (el) => {
      await expect.soft(el.first()).toBeVisible(T);
    }, { actual: async () => (await page.getByTestId('coupon-message').allInnerTexts()).join(' | ') || '(ไม่มีข้อความ)' });
    await noDiscountLine(page, 'ไม่มีบรรทัดส่วนลด −฿52');
    await shippingFree(page);
    await totalIs(page, '฿520');
    await couponIs(page, 'FREESHIP');
  });
  await test.step('4. ไป /checkout อ่านปุ่ม', async () => {
    await toCheckout(page);
    await buttonIs(page, '฿520');
  });
});

test("TC-CPN-018 แก้ตะกร้าหลังใส่ NEWCAT50 ต้องตรวจเงื่อนไขใหม่ทุกครั้ง (ข้ามขอบลง-ขึ้น)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: อาหารแมว ฿464 (฿359 + ฿35×3) → ขึ้น \"ต้องซื้ออาหารแมวขั้นต่ำ ฿500\" · ส่วนลด ฿0 · ยอดชำระ ฿514 (฿464 + ส่ง ฿50) · หลัง reload เหมือนเดิม · ข้อ 3: ฿499 (฿359 + ฿35×4) ส่วนลด ฿0 ยอดชำระ ฿549 · ข้อ 4: ฿534 (฿359 + ฿35×5) ส่วนลด −฿50 ยอดชำระ ฿534 (฿534 − ฿50 + ส่ง ฿50) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿534\"" },
    { type: 'source', description: "[R] · R84 · R83 · ความเสี่ยง: ส่วนลดค้างหลังยอดตกต่ำกว่าเกณฑ์ · เทคนิค: State · Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿503 · /cart ใส่ NEWCAT50 (ยอด ฿503)', async () => {
    await fillCart(page, SET_503);
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await totalIs(page, '฿503');
  });
  const below = async (sub: string, tot: string) => {
    await subtotalIs(page, sub);
    await messageIs(page, 'ต้องซื้ออาหารแมวขั้นต่ำ ฿500');
    await noDiscountLine(page, 'ส่วนลด ฿0');
    await totalIs(page, tot);
  };
  await test.step('2. กด ✕ ลบมูสไก่ อ่านยอด แล้ว reload', async () => {
    await removeLine(page, PR.mousse);
    await below('฿464', '฿514');
    await page.reload();
    await settle(page);
    await test.step('หลัง reload', async () => {
      await below('฿464', '฿514');
    });
  });
  await test.step('3. กด + ที่ทูน่าซอง 1 ครั้ง (3→4) อ่านยอด', async () => {
    await linePlus(page, PR.tuna, 4);
    await subtotalIs(page, '฿499');
    await noDiscountLine(page, 'ส่วนลด ฿0');
    await totalIs(page, '฿549');
  });
  await test.step('4. กด + อีก 1 ครั้ง (4→5) อ่านยอด', async () => {
    await linePlus(page, PR.tuna, 5);
    await subtotalIs(page, '฿534');
    await discountIs(page, '฿50');
    await totalIs(page, '฿534');
  });
  await test.step('5. ไป /checkout อ่านปุ่ม', async () => {
    await toCheckout(page);
    await buttonIs(page, '฿534');
  });
});

test("TC-CPN-019 ปุ่ม \"นำคูปอง PAW10 ออก\" คืนยอดเต็มและล้าง `pp-coupon`", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ส่วนลด ฿0 · ค่าส่ง \"ฟรี\" · ยอดชำระ ฿1,110 (฿1,110 − ฿0 + ส่ง ฿0 เพราะ ≥ ฿999) · ไม่มีปุ่ม \"นำคูปอง PAW10 ออก\" แล้ว · key `pp-coupon` ไม่มีใน localStorage · หลัง reload ไม่มีส่วนลดกลับมา · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿1,110\"" },
    { type: 'source', description: "[R] · R86 · ความเสี่ยง: นำคูปองออกแล้วยังถูกหักที่ checkout · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿1,110 · /cart ใส่ PAW10 (ยอด ฿999)', async () => {
    await fillCart(page, SET_1110);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
    await totalIs(page, '฿999');
  });
  await test.step('2. กด "นำคูปอง PAW10 ออก"', async () => {
    await page.getByRole('button', { name: 'นำคูปอง PAW10 ออก' }).click();
    await settle(page);
  });
  await test.step('3. อ่านยอดและ pp-coupon แล้ว reload', async () => {
    await discountZero(page);
    await shippingFree(page);
    await totalIs(page, '฿1,110');
    await check(page, 'ไม่มีปุ่ม "นำคูปอง PAW10 ออก" แล้ว', page.getByRole('button', { name: 'นำคูปอง PAW10 ออก' }), async (el) => {
      await expect.soft(el).toHaveCount(0, T);
    });
    await couponEmpty(page);
    await page.reload();
    await settle(page);
    await test.step('หลัง reload', async () => {
      await discountZero(page);
      await totalIs(page, '฿1,110');
    });
  });
  await test.step('4. ไป /checkout อ่านปุ่ม', async () => {
    await toCheckout(page);
    await buttonIs(page, '฿1,110');
  });
});

test("TC-CPN-020 ลบสินค้าจนตะกร้าว่างต้องล้างคูปอง", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: key `pp-coupon` ไม่มีใน localStorage · ข้อ 3: ไม่มีบรรทัดส่วนลด · ยอดชำระ ฿239 (฿189 − ฿0 + ส่ง ฿50) (ตอนนี้ล้ม: `pp-coupon` = \"PAW10\" ค้าง แล้วติดไปกับตะกร้าใหม่)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R87 · Q21 · ความเสี่ยง: คูปองค้างเครื่องติดไปตะกร้าถัดไป · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มสูตรลดก้อนขน · /cart ใส่ PAW10', async () => {
    await addToCart(page, PR.hairball, 1);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
  });
  await test.step('2. กด ✕ ลบบรรทัดเดียวจนตะกร้าว่าง อ่าน pp-coupon', async () => {
    await removeLine(page, PR.hairball);
    await couponEmpty(page);
  });
  await test.step('3. เพิ่มลูกแมว 400 g ×1 แล้วเปิด /cart', async () => {
    await addToCart(page, PR.kitten400, 1);
    await gotoCart(page);
    await noDiscountLine(page, 'ไม่มีบรรทัดส่วนลด');
    await totalIs(page, '฿239');
  });
});

test("TC-CPN-021 ใช้ PAW10 ซ้ำได้ในคำสั่งที่ 2 ของบัญชีเดียวกัน และยอดตรงกันถึงหน้ายืนยัน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ทั้ง 2 รอบ ปุ่มก่อนกด = \"ยืนยันสั่งซื้อ ฿518\" · หน้ายืนยันได้เลขคำสั่ง 2 เลขที่ไม่ซ้ำกัน ตรงรูปแบบ `PP-\\d{6}` · สรุปยอดแต่ละคำสั่ง ส่วนลด −฿52 ยอดชำระ ฿518 (฿520 − ฿52 + ส่ง ฿50) · `/account` มี 2 คำสั่งใหม่ ยอด ฿518 ทั้งคู่" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R88 · Q23 · ความเสี่ยง: นโยบายใช้ซ้ำไม่ชัด ร้านเสียเงินถ้าต้องจำกัด (บันทึกผลไว้ตอบ Q23) · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  const ids: string[] = [];
  for (const round of [1, 2]) {
    await test.step(`${round === 1 ? '1' : '3'}. รอบที่ ${round}: เพิ่มสูตรลดก้อนขน · /cart ใส่ PAW10 · /checkout กรอกที่อยู่ กด "ยืนยันสั่งซื้อ ฿518"`, async () => {
      await addToCart(page, PR.hairball, 1);
      await gotoCart(page);
      if (!(await page.getByRole('button', { name: 'นำคูปอง PAW10 ออก' }).isVisible().catch(() => false))) {
        await applyCoupon(page, 'PAW10');
      }
      await toCheckout(page);
      await fillAddress(page);
      await chooseShipping(page, 'standard');
      await buttonIs(page, '฿518');
      const r = await placeOrder(page);
      await checkApi(`รอบที่ ${round}: POST /api/orders ได้ 201`, { status: r.status, body: r.body }, () => {
        expect.soft(r.status).toBe(201);
      });
    });
    await test.step(`2. รอบที่ ${round}: บันทึกเลขคำสั่ง และยอดในหน้า /orders/<id>`, async () => {
      const idEl = page.getByTestId('order-id');
      const id = ((await idEl.textContent().catch(() => '')) ?? '').trim();
      ids.push(id);
      await check(page, `รอบที่ ${round}: เลขคำสั่งตรงรูปแบบ PP-\\d{6}`, idEl, async (el) => {
        await expect.soft(el).toHaveText(/^\s*PP-\d{6}\s*$/, T);
      });
      await discountIs(page, '฿52');
      await totalIs(page, '฿518');
    });
  }
  await check(page, 'เลขคำสั่ง 2 เลขไม่ซ้ำกัน', null, async () => {
    expect.soft(ids[0]).not.toBe(ids[1]);
  }, { actual: async () => ids });
  await test.step('4. เปิด /account', async () => {
    await page.goto('/account');
    await settle(page);
    for (const id of ids) {
      const row = page.getByTestId('order-row').filter({ hasText: id || '(ไม่มีเลขคำสั่ง)' });
      await check(page, `/account มีคำสั่ง ${id} ยอด ฿518`, row, async (el) => {
        await expect.soft(el).toHaveCount(1, T);
        await expect.soft(el.first()).toContainText('฿518', T);
      });
    }
  });
});

test("TC-CPN-022 แก้ `pp-coupon` ใน localStorage เป็นโค้ดหมดอายุ/ปลอม/ไม่ถึงเงื่อนไข ต้องไม่ได้ส่วนลดทั้งหน้าเว็บและคำสั่งจริง", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ทุกกรณี: ไม่มีบรรทัดส่วนลด · ยอดชำระ ฿239 (฿189 − ฿0 + ส่ง ฿50) ทั้ง `/cart` และปุ่ม \"ยืนยันสั่งซื้อ ฿239\" · กรณี ค ผ่านเมื่อเป็นแบบใดแบบหนึ่ง: (1) 201 และ `/orders/<id>` ส่วนลด ฿0 ยอดชำระ ฿239 หรือ (2) 400 มีข้อความบนหน้า URL ยังเป็น `/checkout` และ `/account` ไม่มีคำสั่งเพิ่ม (Q26) · ล้มเมื่อมีคำสั่งที่ส่วนลด > ฿0 หรือยอด ฿189 หรือได้ 5xx" },
    { type: 'source', description: "[R] · R85 · Q26 · ความเสี่ยง: ลูกค้าแก้ localStorage ให้ได้ส่วนลดที่ไม่มีสิทธิ์ · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ตะกร้ามีลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  for (const [name, code] of [
    ['ก', 'SUMMER20'],
    ['ข', 'FAKE'],
    ['ค', 'NEWCAT50'],
  ] as const) {
    await test.step(`${name === 'ก' ? '1' : '3'}. กรณี ${name}: localStorage.setItem('pp-coupon','${code}')`, async () => {
      await page.evaluate((c) => localStorage.setItem('pp-coupon', c), code);
    });
    await test.step(`2. กรณี ${name}: เปิด /cart และ /checkout อ่านยอดและปุ่ม`, async () => {
      await gotoCart(page);
      await noDiscountLine(page, `กรณี ${name}: /cart ไม่มีบรรทัดส่วนลด`);
      await totalIs(page, '฿239');
      await page.goto('/checkout');
      await expect(page.getByTestId('place-order')).toBeVisible();
      await settle(page);
      await noDiscountLine(page, `กรณี ${name}: /checkout ไม่มีบรรทัดส่วนลด`);
      await buttonIs(page, '฿239');
    });
  }
  await test.step('4. กรณี ค: กรอกที่อยู่ กดยืนยัน จด HTTP status และช่อง coupon ใน body ของ POST /api/orders', async () => {
    await page.goto('/account');
    await settle(page);
    const before = await page.getByTestId('order-row').count();
    await page.goto('/checkout');
    await expect(page.getByTestId('place-order')).toBeVisible();
    await settle(page);
    await fillAddress(page);
    const r = await placeOrder(page);
    await checkApi('POST /api/orders: ได้ 201 หรือ 400 (ไม่ใช่ 5xx)', { status: r.status, requestCoupon: r.reqBody?.coupon ?? null, body: r.body }, () => {
      expect.soft([201, 400]).toContain(r.status);
    });
    if (r.status === 201) {
      await check(page, '(1) 201: URL เป็น /orders/<id>', null, async () => {
        expect.soft(page.url()).toMatch(/\/orders\/PP-\d{6}/);
      });
      await expectText(page, '(1) /orders/<id> ส่วนลด ฿0', 'summary-discount', '฿0');
      await totalIs(page, '฿239');
    } else if (r.status === 400) {
      await check(page, '(2) 400: มีข้อความบนหน้า', page.locator('main').getByRole('alert'), async (el) => {
        await expect.soft(el.first()).toBeVisible(T);
      });
      await check(page, '(2) 400: URL ยังเป็น /checkout', null, async () => {
        expect.soft(page.url()).toMatch(/\/checkout(\?|#|$)/);
      });
      await page.goto('/account');
      await settle(page);
      await check(page, `(2) 400: /account ไม่มีคำสั่งเพิ่ม (ก่อน ${before})`, page.getByTestId('order-row'), async (el) => {
        await expect.soft(el).toHaveCount(before, T);
      });
    }
  });
});

test("TC-CPN-023 ค่า `pp-coupon` ที่เป็นสคริปต์ต้องไม่ถูกรันในหน้า (XSS)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ไม่มี dialog `alert` เกิดขึ้นทั้ง 2 หน้า · คำสั่งข้อ 3 คืน `null` ทั้ง 2 หน้า · ถ้าข้อความถูกแสดง ต้องแสดงเป็นตัวอักษรตรงตัว · ส่วนลด ฿0 · ยอดชำระ ฿239 · ปุ่ม \"ยืนยันสั่งซื้อ ฿239\"" },
    { type: 'source', description: "[R] · R85 · R25 · R108 · ความเสี่ยง: XSS ผ่านค่าคูปองที่เก็บในเครื่อง (OWASP A03) · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    d.dismiss().catch(() => {});
  });
  await loginDemo(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ตะกร้ามีลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
  });
  await test.step(`1. Console: localStorage.setItem('pp-coupon','${payload}')`, async () => {
    await page.evaluate((p) => localStorage.setItem('pp-coupon', p), payload);
  });
  for (const path of ['/cart', '/checkout']) {
    await test.step(`2–3. เปิด ${path} แล้ว document.querySelector('img[src="x"]')`, async () => {
      await page.goto(path);
      await settle(page);
      await page.waitForTimeout(300);
      await check(page, `${path}: ไม่มี dialog alert`, null, async () => {
        expect.soft(dialogs).toEqual([]);
      }, { actual: async () => dialogs });
      const q = () => page.evaluate(() => (document.querySelector('img[src="x"]') ? 'พบ <img src="x">' : null));
      await check(page, `${path}: document.querySelector('img[src="x"]') คืน null`, null, async () => {
        expect.soft(await q()).toBeNull();
      }, { actual: q });
      const shown = page.locator('main').getByText('onerror', { exact: false });
      if ((await shown.count()) > 0) {
        await check(page, `${path}: ข้อความถูกแสดงเป็นตัวอักษรตรงตัว`, shown.first(), async (el) => {
          await expect.soft(el).toContainText(payload, T);
        });
      }
      await noDiscountLine(page, `${path}: ส่วนลด ฿0`);
      if (path === '/cart') await totalIs(page, '฿239');
      else await buttonIs(page, '฿239');
    });
  }
});

test("TC-CPN-024 ยิง `POST /api/coupons/validate` ตรง ข้ามหน้าเว็บ ต้องได้ผลเดียวกับที่หน้าเว็บตรวจ", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ก–จ: ไม่มีกรณีใดได้ส่วนลด > ฿0 (HTTP 4xx หรือ body ระบุว่าใช้ไม่ได้) · ก body มีข้อความ \"คูปองนี้หมดอายุแล้ว\" · จ ต้องคิดจากราคาจริงของ server จึงยังถูกปฏิเสธ · ฉ ได้ส่วนลด 111 (฿1,110 × 10% = 111.0) · ไม่มีกรณีใดตอบ 5xx · ถ้าข้อ 1 พบว่า body มีแค่โค้ด (ไม่มีรายการสินค้า) ให้ทดสอบ ค/ง/จ ซ้ำที่ `POST /api/orders` แทน: ได้ 400 หรือคำสั่งที่ส่วนลด 0 เท่านั้น" },
    { type: 'source', description: "[R] · R85 · R77 · R80 · R82 · ความเสี่ยง: server เชื่อยอด/เงื่อนไขจาก client แล้วให้ส่วนลด · เทคนิค: Security · Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ตะกร้ามีลูกแมว 1.5 kg + สูตรลดก้อนขน 1.5 kg (฿1,110)', async () => {
    await fillCart(page, SET_1110);
  });
  let sample: { method: string; body: any; status: number; resp: any } | null = null;
  await test.step('1. ใน /cart ใส่ PAW10 หนึ่งครั้ง จด method/body/response ของ POST /api/coupons/validate', async () => {
    await gotoCart(page);
    await page.getByTestId('coupon-input').fill('PAW10');
    const respP = page.waitForResponse((r) => r.url().includes('/api/coupons/validate'), { timeout: 10000 });
    await page.getByTestId('coupon-apply').click();
    const resp = await respP;
    sample = {
      method: resp.request().method(),
      body: resp.request().postDataJSON(),
      status: resp.status(),
      resp: await resp.json().catch(() => null),
    };
    await test.info().attach('request ของหน้าเว็บ', { body: JSON.stringify(sample, null, 2), contentType: 'application/json' });
  });
  const items = {
    cart1110: [
      { slug: 'kitten-salmon-dry', size: '1.5 kg', qty: 1 },
      { slug: 'hairball-control-dry', size: '1.5 kg', qty: 1 },
    ],
    kitten400: [{ slug: 'kitten-salmon-dry', size: '400 g', qty: 1 }],
    wand4: [{ slug: 'cat-feather-wand', size: '1 ชิ้น', qty: 4 }],
  };
  const cases: { name: string; data: Record<string, unknown> }[] = [
    { name: 'ก) SUMMER20', data: { code: 'SUMMER20', items: items.cart1110 } },
    { name: 'ข) FAKE', data: { code: 'FAKE', items: items.cart1110 } },
    { name: 'ค) NEWCAT50 + ลูกแมว 400 g ×1 (฿189)', data: { code: 'NEWCAT50', items: items.kitten400 } },
    { name: 'ง) NEWCAT50 + ไม้ตกแมว ×4 (฿516)', data: { code: 'NEWCAT50', items: items.wand4 } },
    { name: 'จ) NEWCAT50 + ลูกแมว 400 g ×1 + "subtotal":600', data: { code: 'NEWCAT50', items: items.kitten400, subtotal: 600 } },
    { name: 'ฉ) ตัวคุม PAW10 + ลูกแมว 1.5 kg + สูตรลดก้อนขน (฿1,110)', data: { code: 'PAW10', items: items.cart1110 } },
  ];
  const results: Record<string, { status: number; body: any }> = {};
  await test.step('2–3. ส่ง request รูปแบบเดียวกันด้วย Playwright request ทีละกรณี ก–ฉ จด HTTP status และ body', async () => {
    for (const c of cases) {
      const r = await page.request.post('/api/coupons/validate', { data: c.data });
      const body = await r.json().catch(async () => r.text());
      results[c.name] = { status: r.status(), body };
      const status = r.status();
      if (c.name.startsWith('ฉ')) {
        await checkApi(`${c.name}: ได้ส่วนลด 111`, { request: c.data, status, body }, () => {
          expect.soft(status).toBeLessThan(500);
          expect.soft(Number(body?.discount)).toBe(111);
        });
      } else {
        await checkApi(`${c.name}: ไม่ได้ส่วนลด > ฿0 (4xx หรือ body ระบุว่าใช้ไม่ได้) · ไม่ใช่ 5xx`, { request: c.data, status, body }, () => {
          expect.soft(status, 'ไม่ตอบ 5xx').toBeLessThan(500);
          expect.soft(Number(body?.discount ?? 0), 'ส่วนลดต้องไม่เกิน ฿0').toBeLessThanOrEqual(0);
          const rejected = (status >= 400 && status < 500) || body?.ok === false || body?.valid === false;
          expect.soft(rejected, 'HTTP 4xx หรือ body ระบุว่าใช้ไม่ได้').toBe(true);
          if (c.name.startsWith('ก')) expect.soft(JSON.stringify(body)).toContain('คูปองนี้หมดอายุแล้ว');
        });
      }
    }
  });
  const reqBody = (sample as { body: any } | null)?.body;
  const hasItems = !!reqBody && typeof reqBody === 'object' && Array.isArray(reqBody.items) && reqBody.items.length > 0;
  if (!hasItems) {
    await test.step('ข้อ 1 พบว่า body มีแค่โค้ด → ทดสอบ ค/ง/จ ซ้ำที่ POST /api/orders', async () => {
      for (const c of cases.filter((x) => /^[คงจ]\)/.test(x.name))) {
        const r = await page.request.post('/api/orders', {
          data: { ...c.data, coupon: c.data.code, shipping: 'standard', payment: 'cod', address: ADDRESS },
        });
        const body = await r.json().catch(async () => r.text());
        const status = r.status();
        await checkApi(`POST /api/orders ${c.name}: 400 หรือคำสั่งที่ส่วนลด 0`, { status, body }, () => {
          expect.soft(status).toBeLessThan(500);
          if (status !== 400) {
            expect.soft(status).toBe(201);
            expect.soft(Number(body?.order?.discount ?? body?.discount ?? NaN)).toBe(0);
          }
        });
      }
    });
  }
});

// ===========================================================================
// F13 ค่าส่งและแถบส่งฟรี
// ===========================================================================

test("TC-SHIP-001 ส่งธรรมดา ฿50 และแถบ \"ซื้อเพิ่มอีก ฿N\" เมื่อยอดต่ำกว่าเกณฑ์", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ค่าส่ง ฿50 · แถบ \"ซื้อเพิ่มอีก ฿810 เพื่อส่งฟรี\" (฿999 − ฿189) · ยอดชำระ ฿239 (฿189 + ส่ง ฿50) · ข้อ 2: แถบ \"ซื้อเพิ่มอีก ฿432 เพื่อส่งฟรี\" (฿999 − ฿567) · ยอดชำระ ฿617 (฿189×3 = ฿567 + ส่ง ฿50) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿617\"" },
    { type: 'source', description: "[D] · R89 · R91 · ความเสี่ยง: ค่าส่ง/ตัวเลขแถบคิดผิด · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1 เปิด /cart อ่านแถบและยอด', async () => {
    await addToCart(page, PR.kitten400, 1);
    await gotoCart(page);
    await shippingIs(page, '฿50');
    await barIs(page, 'ซื้อเพิ่มอีก ฿810 เพื่อส่งฟรี');
    await totalIs(page, '฿239');
  });
  await test.step('2. กด + ที่บรรทัดให้เป็น 3 อ่านอีกครั้ง', async () => {
    await linePlus(page, PR.kitten400, 2);
    await linePlus(page, PR.kitten400, 3);
    await barIs(page, 'ซื้อเพิ่มอีก ฿432 เพื่อส่งฟรี');
    await totalIs(page, '฿617');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿617');
  });
});

test("TC-SHIP-002 ยอด ฿998 (ต่ำกว่าเกณฑ์ ฿1) ยังเสียค่าส่ง", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ค่าส่ง ฿50 · แถบ \"ซื้อเพิ่มอีก ฿1 เพื่อส่งฟรี\" (฿999 − ฿998) · ยอดชำระ ฿1,048 (฿998 + ส่ง ฿50) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿1,048\"" },
    { type: 'source', description: "[D] · R89 · R91 · ความเสี่ยง: ขอบเกณฑ์ใช้ผิดทิศ (ให้ฟรีก่อนถึง ฿999) · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: แมวโต สูตรไก่ 1.2 kg ×2 + ทูน่าซอง ×8 (฿998)', async () => {
    await fillCart(page, SET_998);
  });
  await test.step('2. /cart อ่านแถบและยอด', async () => {
    await gotoCart(page);
    await shippingIs(page, '฿50');
    await barIs(page, 'ซื้อเพิ่มอีก ฿1 เพื่อส่งฟรี');
    await totalIs(page, '฿1,048');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿1,048');
  });
});

test("TC-SHIP-003 ยอด ฿999 พอดีได้ส่งฟรี", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ค่าส่ง \"ฟรี\" · แถบ \"ได้ส่งฟรีแล้ว!\" · ยอดชำระ ฿999 (฿999 + ส่ง ฿0) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿999\"" },
    { type: 'source', description: "[D] · R90 · R91 · ความเสี่ยง: ใช้ `>` แทน `≥` ทำให้ ฿999 ไม่ฟรี · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: น้ำพุแมว + ทูน่าซอง ×2 + มูสไก่ลูกแมว (฿999)', async () => {
    await fillCart(page, SET_999);
  });
  await test.step('2. /cart อ่านแถบและยอด', async () => {
    await gotoCart(page);
    await shippingFree(page);
    await barIs(page, 'ได้ส่งฟรีแล้ว!');
    await totalIs(page, '฿999');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿999');
  });
});

test("TC-SHIP-004 ยอด ฿1,000 (เกินเกณฑ์ ฿1) ได้ส่งฟรี", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ค่าส่ง \"ฟรี\" · แถบ \"ได้ส่งฟรีแล้ว!\" · ยอดชำระ ฿1,000 (฿567 + ฿359 + ฿39 + ฿35 = ฿1,000 + ส่ง ฿0) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿1,000\"" },
    { type: 'source', description: "[D] · R90 · ความเสี่ยง: ยอดเกินเกณฑ์ยังคิดค่าส่ง · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: ลูกแมว 400 g ×3 + แมวโต สูตรไก่ + มูสไก่ + ทูน่าซอง (฿1,000)', async () => {
    await fillCart(page, SET_1000);
  });
  await test.step('2. /cart อ่านแถบและยอด', async () => {
    await gotoCart(page);
    await shippingFree(page);
    await barIs(page, 'ได้ส่งฟรีแล้ว!');
    await totalIs(page, '฿1,000');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿1,000');
  });
});

test("TC-SHIP-005 ปรับจำนวนข้ามเกณฑ์ลง-ขึ้น ค่าส่งและแถบต้องเปลี่ยนตามทันที", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: ยอดรวมสินค้า ฿964 · ค่าส่ง ฿50 · แถบ \"ซื้อเพิ่มอีก ฿35 เพื่อส่งฟรี\" (฿999 − ฿964) · ยอดชำระ ฿1,014 (฿964 + ส่ง ฿50) · หลัง reload ค่าเดิม · ข้อ 3: ค่าส่ง \"ฟรี\" · แถบ \"ได้ส่งฟรีแล้ว!\" · ยอดชำระ ฿999" },
    { type: 'source', description: "[D]+[R] · R90 · R91 · ความเสี่ยง: ค่าส่งไม่คำนวณใหม่หลังแก้ตะกร้า · เทคนิค: State · Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿999 เปิด /cart (ยอด ฿999 ส่งฟรี)', async () => {
    await fillCart(page, SET_999);
    await gotoCart(page);
    await totalIs(page, '฿999');
  });
  const below = async () => {
    await subtotalIs(page, '฿964');
    await shippingIs(page, '฿50');
    await barIs(page, 'ซื้อเพิ่มอีก ฿35 เพื่อส่งฟรี');
    await totalIs(page, '฿1,014');
  };
  await test.step('2. กด − ที่ทูน่าซอง (2→1) อ่านยอดและแถบ แล้ว reload', async () => {
    await lineMinus(page, PR.tuna, 1);
    await below();
    await page.reload();
    await settle(page);
    await test.step('หลัง reload', below);
  });
  await test.step('3. กด + ที่ทูน่าซอง (1→2) อ่านอีกครั้ง', async () => {
    await linePlus(page, PR.tuna, 2);
    await shippingFree(page);
    await barIs(page, 'ได้ส่งฟรีแล้ว!');
    await totalIs(page, '฿999');
  });
});

test("TC-SHIP-006 เลือกส่งด่วน ฿120 ใน checkout", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: \"ยืนยันสั่งซื้อ ฿239\" (฿189 + ส่ง ฿50) · ข้อ 3: radio ส่งด่วน `checked` · \"ยืนยันสั่งซื้อ ฿309\" (฿189 + ส่งด่วน ฿120) · ข้อ 4: \"ยืนยันสั่งซื้อ ฿239\"" },
    { type: 'source', description: "[D] · R93 · ความเสี่ยง: สลับวิธีส่งแล้วยอดไม่เปลี่ยนตาม · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g ×1 ไป /checkout', async () => {
    await addToCart(page, PR.kitten400, 1);
    await gotoCart(page);
    await toCheckout(page);
  });
  await test.step('2. อ่านปุ่ม (ส่งธรรมดา)', async () => {
    await buttonIs(page, '฿239');
  });
  await test.step('3. เลือก radio ส่งด่วน อ่านปุ่ม', async () => {
    await chooseShipping(page, 'express');
    await radioChecked(page, 'express');
    await buttonIs(page, '฿309');
  });
  await test.step('4. เลือกกลับเป็นส่งธรรมดา อ่านปุ่ม', async () => {
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿239');
  });
});

test("TC-SHIP-007 ส่งด่วนไม่ได้ฟรีเพราะยอดถึง ฿999", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: \"ยืนยันสั่งซื้อ ฿1,000\" (฿1,000 + ส่ง ฿0) · ข้อ 3: \"ยืนยันสั่งซื้อ ฿1,120\" (฿1,000 + ส่งด่วน ฿120 = ฿1,120)" },
    { type: 'source', description: "[D] · R93 · ความเสี่ยง: ร้านเสียค่าส่งด่วนให้ทุกออเดอร์ที่ยอดถึงเกณฑ์ · เทคนิค: Boundary · Equivalence partition · Negative" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿1,000 ไป /checkout', async () => {
    await fillCart(page, SET_1000);
    await gotoCart(page);
    await toCheckout(page);
  });
  await test.step('2. อ่านปุ่ม (ส่งธรรมดา)', async () => {
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿1,000');
  });
  await test.step('3. เลือก radio ส่งด่วน อ่านปุ่ม', async () => {
    await chooseShipping(page, 'express');
    await buttonIs(page, '฿1,120');
  });
});

test("TC-SHIP-008 เกณฑ์ส่งฟรีคิดจากยอดหลังหัก PAW10 (฿1,000 − ฿100 = ฿900 ต้องเสียค่าส่ง)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ส่วนลด −฿100 · ค่าส่ง ฿50 · แถบ \"ซื้อเพิ่มอีก ฿99 เพื่อส่งฟรี\" (฿999 − ฿900) · ยอดชำระ ฿950 (฿1,000 − ฿100 = ฿900 + ส่ง ฿50 เพราะ ฿900 < ฿999) · checkout ส่งธรรมดา \"ยืนยันสั่งซื้อ ฿950\" · ส่งด่วน \"ยืนยันสั่งซื้อ ฿1,020\" (฿900 + ฿120) (ตอนนี้ล้ม: ส่งฟรี ยอด ฿900 แถบขึ้น \"ได้ส่งฟรีแล้ว!\")" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R92 · R91 · Q19 · ความเสี่ยง: ร้านเสียค่าส่งให้ออเดอร์ที่จ่ายจริงไม่ถึง ฿999 · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿1,000 · /cart ใส่ PAW10', async () => {
    await fillCart(page, SET_1000);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
  });
  await test.step('2. อ่านแถบและสรุปยอด', async () => {
    await discountIs(page, '฿100');
    await shippingIs(page, '฿50');
    await barIs(page, 'ซื้อเพิ่มอีก ฿99 เพื่อส่งฟรี');
    await totalIs(page, '฿950');
  });
  await test.step('3. ไป /checkout อ่านปุ่ม (ส่งธรรมดา) แล้วเลือกส่งด่วน อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿950');
    await chooseShipping(page, 'express');
    await buttonIs(page, '฿1,020');
  });
});

test("TC-SHIP-009 ยอดหลังหัก NEWCAT50 = ฿998 (ต่ำกว่าเกณฑ์ ฿1) ต้องเสียค่าส่ง", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ส่วนลด −฿50 · ค่าส่ง ฿50 · แถบ \"ซื้อเพิ่มอีก ฿1 เพื่อส่งฟรี\" · ยอดชำระ ฿1,048 (฿1,048 − ฿50 = ฿998 + ส่ง ฿50 = ฿1,048) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿1,048\" (ตอนนี้ล้ม: ส่งฟรี ยอด ฿998)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R92 · Q19 · ความเสี่ยง: ขอบเกณฑ์ส่งฟรีหลังส่วนลดผิด · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: ลูกแมว 1.5 kg + ขนมแมวเลีย 4 ซอง + มูสไก่ + ทูน่าซอง ×10 (฿1,048)', async () => {
    await fillCart(page, [[PR.kitten15, 1], [PR.lickable4, 1], [PR.mousse, 1], [PR.tuna, 10]]);
  });
  await test.step('2. /cart ใส่ NEWCAT50 อ่านแถบและยอด', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await discountIs(page, '฿50');
    await shippingIs(page, '฿50');
    await barIs(page, 'ซื้อเพิ่มอีก ฿1 เพื่อส่งฟรี');
    await totalIs(page, '฿1,048');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿1,048');
  });
});

test("TC-SHIP-010 ยอดหลังหัก NEWCAT50 = ฿999 พอดีได้ส่งฟรี (ตัวคุมของ TC-SHIP-009)", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ส่วนลด −฿50 · ค่าส่ง \"ฟรี\" · แถบ \"ได้ส่งฟรีแล้ว!\" · ยอดชำระ ฿999 (฿1,049 − ฿50 = ฿999 + ส่ง ฿0) · checkout ปุ่ม \"ยืนยันสั่งซื้อ ฿999\" (ผ่านได้ทั้งเกณฑ์ก่อนและหลังลด)" },
    { type: 'source', description: "[D] · R92 · R90 · Q19 · ความเสี่ยง: แก้ Q19 แล้วขอบ ฿999 หลังลดหลุดไปเสียค่าส่ง · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า: ลูกแมว 1.5 kg + มูสไก่ + ทูน่าซอง ×12 (฿1,049)', async () => {
    await fillCart(page, [[PR.kitten15, 1], [PR.mousse, 1], [PR.tuna, 12]]);
  });
  await test.step('2. /cart ใส่ NEWCAT50 อ่านแถบและยอด', async () => {
    await gotoCart(page);
    await applyCoupon(page, 'NEWCAT50');
    await discountIs(page, '฿50');
    await shippingFree(page);
    await barIs(page, 'ได้ส่งฟรีแล้ว!');
    await totalIs(page, '฿999');
  });
  await test.step('3. ไป /checkout (ส่งธรรมดา) อ่านปุ่ม', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿999');
  });
});

test("TC-SHIP-011 FREESHIP ทำให้ส่งด่วนเป็น ฿0 ด้วย", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: radio ส่งด่วน `checked` · ค่าส่ง \"ฟรี\" (฿0) · \"ยืนยันสั่งซื้อ ฿189\" (฿189 − ฿0 + ส่งด่วน ฿0 = ฿189)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R94 · Q22 · ความเสี่ยง: ขอบเขต FREESHIP ไม่ตรงนโยบาย (บันทึกผลไว้ตอบ Q22) · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เพิ่มลูกแมว 400 g · /cart ใส่ FREESHIP', async () => {
    await addToCart(page, PR.kitten400, 1);
    await gotoCart(page);
    await applyCoupon(page, 'FREESHIP');
  });
  await test.step('2. ไป /checkout เลือกส่งด่วน อ่านปุ่มและบรรทัดค่าส่ง', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'express');
    await radioChecked(page, 'express');
    await shippingFree(page);
    await buttonIs(page, '฿189');
  });
});

test("TC-SHIP-012 PAW10 ที่มีเศษ + ส่งด่วน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: \"ยืนยันสั่งซื้อ ฿948\" (฿998 − ฿100 [99.8 ปัดครึ่งขึ้น] + ส่ง ฿50) · ข้อ 3: \"ยืนยันสั่งซื้อ ฿1,018\" (฿998 − ฿100 + ส่งด่วน ฿120 = ฿1,018) (ตอนนี้ล้ม: ฿949 / ฿1,019 เพราะลดแค่ ฿99)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R95 · R73 · Q20 · ความเสี่ยง: ส่วนลดกับค่าส่งด่วนรวมกันผิด · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿998 · /cart ใส่ PAW10', async () => {
    await fillCart(page, SET_998);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
  });
  await test.step('2. ไป /checkout อ่านปุ่ม (ส่งธรรมดา)', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿948');
  });
  await test.step('3. เลือกส่งด่วน อ่านปุ่ม', async () => {
    await chooseShipping(page, 'express');
    await buttonIs(page, '฿1,018');
  });
});

test("TC-SHIP-013 PAW10 ยอดลงตัว + ส่งด่วน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ข้อ 2: \"ยืนยันสั่งซื้อ ฿999\" (฿1,110 − ฿111 + ส่ง ฿0) · ข้อ 3: \"ยืนยันสั่งซื้อ ฿1,119\" (฿1,110 − ฿111 = ฿999 + ส่งด่วน ฿120 = ฿1,119)" },
    { type: 'source', description: "[D] · R95 · R93 · R74 · ความเสี่ยง: ส่งด่วนถูกยกเว้นตามยอดผิด ๆ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('1. เติมตะกร้า ฿1,110 · /cart ใส่ PAW10', async () => {
    await fillCart(page, SET_1110);
    await gotoCart(page);
    await applyCoupon(page, 'PAW10');
  });
  await test.step('2. ไป /checkout อ่านปุ่ม (ส่งธรรมดา)', async () => {
    await toCheckout(page);
    await chooseShipping(page, 'standard');
    await buttonIs(page, '฿999');
  });
  await test.step('3. เลือกส่งด่วน อ่านปุ่ม', async () => {
    await chooseShipping(page, 'express');
    await buttonIs(page, '฿1,119');
  });
});

test("TC-SHIP-015 วิธีส่งที่เลือกไว้ใน checkout เมื่อออกไปตะกร้าแล้วกลับมา ยอดต้องตรงกับ radio และคำสั่งที่สร้าง", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ทุกรอบ: radio ที่ `checked` ตรงกับยอดบนปุ่ม — ธรรมดา = \"ยืนยันสั่งซื้อ ฿239\" (฿189 + ฿50) · ด่วน = \"ยืนยันสั่งซื้อ ฿309\" (฿189 + ฿120) · ไม่มีกรณี radio ด่วนแต่ปุ่ม ฿239 หรือกลับกัน · ผลเหมือนกันทั้ง 3 รอบ · หน้า `/orders/<id>` วิธีส่งและยอดตรงกับปุ่มตอนกด · ข้อ 2: บันทึกค่าส่งที่ `/cart` แสดง และ radio ที่ `checked` หลังกลับ `/checkout` (ยังไม่ใช้ตัดสินเรื่องจำ/ไม่จำวิธีส่ง รอคำตอบ Q52)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R97 · Q52 · ความเสี่ยง: ลูกค้าเห็นยอดหนึ่งแต่ถูกคิดอีกยอด (ต่างกัน ฿120) · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  await test.step('เงื่อนไขก่อนเริ่ม: ตะกร้ามีลูกแมว 400 g ×1', async () => {
    await addToCart(page, PR.kitten400, 1);
    await gotoCart(page);
    await toCheckout(page);
  });
  const expectFor = { standard: '฿239', express: '฿309' } as const;
  const consistent = async (label: string) => {
    const express = await page.getByTestId('shipping-express').isChecked();
    const method = express ? 'express' : 'standard';
    await check(page, `${label}: radio ที่ checked (${express ? 'ส่งด่วน' : 'ส่งธรรมดา'}) ตรงกับยอดบนปุ่ม ${expectFor[method]}`, page.getByTestId('place-order'), async (el) => {
      await expect.soft(el).toHaveText(`ยืนยันสั่งซื้อ ${expectFor[method]}`, T);
    });
    return { method, button: ((await page.getByTestId('place-order').textContent()) ?? '').trim() };
  };
  const rounds: { method: string; button: string }[] = [];
  for (const round of [1, 2, 3]) {
    await test.step(`รอบที่ ${round} · 1. /checkout เลือกส่งด่วน (ปุ่ม ฿309)`, async () => {
      await chooseShipping(page, 'express');
      await radioChecked(page, 'express');
      await buttonIs(page, '฿309');
    });
    await test.step(`รอบที่ ${round} · 2. ไป /cart อ่านค่าส่ง แล้วกลับ /checkout`, async () => {
      await gotoCart(page);
      const shipText = ((await S(page, 'summary-shipping').textContent().catch(() => '')) ?? '').trim();
      const totalText = ((await S(page, 'summary-total').textContent().catch(() => '')) ?? '').trim();
      test.info().annotations.push({ type: 'note', description: `รอบที่ ${round}: /cart ค่าส่ง ${shipText} · ยอดชำระ ${totalText} (บันทึกไว้ ไม่ใช้ตัดสิน — Q52)` });
      await toCheckout(page);
      const express = await page.getByTestId('shipping-express').isChecked();
      test.info().annotations.push({ type: 'note', description: `รอบที่ ${round}: หลังกลับ /checkout radio ที่ checked = ${express ? 'ส่งด่วน' : 'ส่งธรรมดา'} (Q52)` });
    });
    await test.step(`รอบที่ ${round} · 3. จด radio ที่ checked และข้อความปุ่ม`, async () => {
      rounds.push(await consistent(`รอบที่ ${round}`));
    });
  }
  await check(page, 'ผลเหมือนกันทั้ง 3 รอบ', null, async () => {
    expect.soft(new Set(rounds.map((r) => `${r.method}|${r.button}`)).size).toBe(1);
  }, { actual: async () => rounds });
  await test.step('4. กรอกที่อยู่ กดยืนยัน เปิด /orders/<id>', async () => {
    await fillAddress(page);
    const atPress = await consistent('ตอนกดยืนยัน');
    const amount = atPress.button.replace(/^.*?(฿[\d,]+).*$/, '$1');
    const r = await placeOrder(page);
    await checkApi('POST /api/orders ได้ 201', { status: r.status, body: r.body }, () => {
      expect.soft(r.status).toBe(201);
    });
    await check(page, `/orders/<id> วิธีส่งตรงกับตอนกด (${atPress.method === 'express' ? 'ด่วน' : 'ธรรมดา'})`, page.locator('main').getByText(/จัดส่งแบบ/).first(), async (el) => {
      await expect.soft(el).toContainText(atPress.method === 'express' ? 'ด่วน' : 'ธรรมดา', T);
    });
    await totalIs(page, amount);
  });
});

test("TC-SHIP-016 ค่าส่งด่วนที่เห็นใน checkout ถูกบันทึกในคำสั่งจริงตรงกัน", {
  tag: ["@P1", '@5.4'],
  annotation: [
    { type: 'expected', description: "ปุ่ม \"ยืนยันสั่งซื้อ ฿1,120\" · หน้า `/orders/<id>` ยอดรวมสินค้า ฿1,000 · ค่าส่ง ฿120 · ยอดชำระ ฿1,120 (฿1,000 − ฿0 + ส่งด่วน ฿120) · `/account` คำสั่งล่าสุดยอด ฿1,120" },
    { type: 'source', description: "[D]+[R] · R93 · R111 · ความเสี่ยง: server คิดค่าส่งต่างจากที่หน้าเว็บแสดง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await loginDemo(page);
  let id = '';
  await test.step('1. เติมตะกร้า ฿1,000 ไป /checkout กรอกที่อยู่ เลือกส่งด่วน', async () => {
    await fillCart(page, SET_1000);
    await gotoCart(page);
    await toCheckout(page);
    await fillAddress(page);
    await chooseShipping(page, 'express');
  });
  await test.step('2. อ่านปุ่ม แล้วกดยืนยัน', async () => {
    await buttonIs(page, '฿1,120');
    const r = await placeOrder(page);
    await checkApi('POST /api/orders ได้ 201', { status: r.status, body: r.body }, () => {
      expect.soft(r.status).toBe(201);
    });
    id = ((await page.getByTestId('order-id').textContent().catch(() => '')) ?? '').trim();
  });
  await test.step('3. อ่านสรุปยอดใน /orders/<id>', async () => {
    await subtotalIs(page, '฿1,000');
    await shippingIs(page, '฿120');
    await totalIs(page, '฿1,120');
  });
  await test.step('4. เปิด /account อ่านยอดคำสั่งล่าสุด', async () => {
    await page.goto('/account');
    await settle(page);
    const latest = page.getByTestId('order-row').first();
    await check(page, `/account คำสั่งล่าสุด (${id}) ยอด ฿1,120`, latest, async (el) => {
      if (id) await expect.soft(el).toContainText(id, T);
      await expect.soft(el).toContainText('฿1,120', T);
    });
  });
});
