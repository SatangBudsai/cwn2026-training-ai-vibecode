/**
 * หัวข้อ 5.2 หน้ารายละเอียดสินค้า (TEST-PLAN.md) — 42 test case
 * โมดูล PDP (เลือกขนาด ราคา สต็อก) · QTY (ช่องจำนวน + เพิ่มลงตะกร้า) · BNDL (ชุด "มักซื้อคู่กัน") · REL (สินค้าที่คล้ายกัน + breadcrumb)
 * ID ที่แผนตัดออก: TC-QTY-022 (รวมเข้ากับ TC-ORD-004/005)
 *
 * หมายเหตุ: ค่าส่งที่แผนเขียนว่า "฿0" หน้า /cart แสดงเป็นคำว่า "ฟรี" — ตรวจโดยยอมรับ "฿0" หรือ "ฟรี" (ค่าเดียวกัน)
 */
import type { Browser, Locator, Page } from '@playwright/test';
import { test, expect, check, baseURL } from './support/pp';

type Line = { slug: string; size: string; qty: number };
type ApiProduct = { slug: string; name: string; pet: string; type: string; stock: number; sizes: { label: string; price: number }[] };

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };
const KITTEN = 'kitten-salmon-dry';
const HAIRBALL_NAME = 'สูตรลดก้อนขน';
const FREEZE = 'freeze-dried-chicken-cat';
/** ค่าส่ง ฿0 — หน้าเว็บอาจแสดงเป็น "฿0" หรือ "ฟรี" */
const SHIP0 = /^\s*(฿0|ฟรี)\s*$/;
/** toast เพิ่มลงตะกร้าสำเร็จแบบปกติ "✅ เพิ่ม…ลงตะกร้าแล้ว" */
const NORMAL_OK = /✅\s*เพิ่ม.*ลงตะกร้าแล้ว/;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** ตัวเลข n ที่ยืนเดี่ยว (ไม่ใช่ส่วนหนึ่งของเลขอื่น เช่น "1" ใน "1.5 kg" ไม่นับ) */
const numRe = (n: number) => new RegExp(`(^|[^\\d.,])${n}(?![\\d.,])`);
const baht = (s: string | null | undefined) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
const sortLines = (l: Line[]) => [...l].sort((a, b) => `${a.slug}|${a.size}`.localeCompare(`${b.slug}|${b.size}`));

async function cartRaw(page: Page): Promise<string> {
  return (await page.evaluate(() => localStorage.getItem('pp-cart')).catch(() => null)) ?? '[]';
}
async function cartOf(page: Page): Promise<Line[]> {
  try {
    const v = JSON.parse(await cartRaw(page));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
async function setCart(page: Page, lines: Line[] = []): Promise<void> {
  await page.evaluate((l) => localStorage.setItem('pp-cart', JSON.stringify(l)), lines);
}
async function waitHydrated(page: Page, slug: string): Promise<void> {
  await page
    .waitForFunction((s) => (localStorage.getItem('pp-recent') ?? '').includes(s), slug, { timeout: 10_000 })
    .catch(() => {});
}
/** เปิดหน้าสินค้าแล้วรอให้หน้า hydrate (หน้าสินค้าบันทึก slug ลง pp-recent เมื่อพร้อม) */
async function openPdp(page: Page, slug: string, query = '') {
  const res = await page.goto(`/products/${slug}${query}`);
  await waitHydrated(page, slug);
  return res;
}
/** reload หน้าสินค้าและรอ hydrate */
async function reloadPdp(page: Page, slug: string): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('pp-recent'));
  await page.reload();
  await waitHydrated(page, slug);
}
/** เปิดสูตรลดก้อนขนผ่านการค้นหา /products?q=ก้อนขน ตามแผน */
async function openHairball(page: Page): Promise<void> {
  await page.goto(`/products?q=${encodeURIComponent('ก้อนขน')}`);
  await page.getByTestId('product-name').filter({ hasText: HAIRBALL_NAME }).first().click();
  await page.waitForURL(/\/products\/[^/?]+/);
  const slug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await waitHydrated(page, slug);
}
async function productsApi(page: Page): Promise<ApiProduct[]> {
  const r = await page.request.get('/api/products');
  return ((await r.json()) as { items: ApiProduct[] }).items;
}
const sizeBtn = (page: Page, label: string) =>
  page.getByTestId('size-option').filter({ hasText: new RegExp(`^\\s*${esc(label)}`) });
const qtyInput = (page: Page) => page.getByTestId('qty-input');
/** ตั้งจำนวนด้วย fill แล้ว Tab */
async function fillQty(page: Page, v: string): Promise<void> {
  await qtyInput(page).fill(v);
  await qtyInput(page).press('Tab');
}
/** ล้างช่องแล้วพิมพ์ทีละตัว (keyboard type) แล้ว Tab */
async function typeQty(page: Page, chars: string): Promise<void> {
  const q = qtyInput(page);
  await q.click();
  await q.press('ControlOrMeta+a');
  await q.press('Backspace');
  await page.keyboard.type(chars, { delay: 30 });
  await q.press('Tab');
}
async function addToCart(page: Page): Promise<void> {
  await page.getByTestId('add-to-cart').click();
}
/** รอให้ toast เดิมหายก่อนกดครั้งถัดไป เพื่อให้อ่าน toast ของการกดครั้งนั้นได้ถูกตัว */
async function waitToastsGone(page: Page): Promise<void> {
  await page.waitForFunction(() => !document.querySelector('[data-testid="toast"]'), null, { timeout: 10_000 }).catch(() => {});
}
/** กล่องรวม toast ที่กำลังแสดง */
const toastZone = (page: Page) => page.locator('[aria-live]').filter({ has: page.getByTestId('toast') }).last();
const bundleBox = (page: Page) => page.getByTestId('add-bundle').locator('..');

async function loginDemo(page: Page): Promise<void> {
  const r = await page.request.post('/api/auth/login', { data: DEMO });
  if (!r.ok()) throw new Error(`ล็อกอิน demo ไม่ได้: HTTP ${r.status()}`);
}
/** "สั่งซื้อด้วย demo" ตามหมายเหตุร่วมของหัวข้อ 5.2 → คืนเลขคำสั่งซื้อ (ต้องล็อกอินไว้แล้ว) */
async function checkoutDemo(page: Page): Promise<string> {
  await page.goto('/checkout');
  await page.getByTestId('ship-name').fill('สมใจ ใจดี');
  await page.getByTestId('ship-phone').fill('0812345678');
  await page.getByTestId('ship-address').fill('99/1 ถนนสุขุมวิท แขวงคลองเตย');
  await page.getByTestId('ship-province').selectOption('กรุงเทพมหานคร');
  await page.getByTestId('ship-postcode').fill('10110');
  await page.getByTestId('shipping-standard').check();
  await page.getByTestId('pay-cod').check();
  await page.getByTestId('place-order').click();
  await page.waitForURL(/\/orders\/PP-/, { timeout: 15_000 });
  return (await page.getByTestId('order-id').innerText()).trim();
}
/** ตรวจผลหน้าคำสั่งซื้อ: มีเลข PP-1000NN และยอดชำระตามแผน */
async function checkOrder(page: Page, total: string): Promise<void> {
  await check(page, 'ได้เลขคำสั่งซื้อ PP-1000NN', page.getByTestId('order-id'), async (el) => {
    await expect.soft(el).toHaveText(/PP-1000\d\d/);
  });
  await check(page, `ยอดชำระของคำสั่งซื้อ ${total}`, page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText(total);
  });
}

async function checkCart(page: Page, label: string, expected: Line[]): Promise<void> {
  await check(
    page,
    label,
    null,
    async () => {
      expect.soft(sortLines(await cartOf(page))).toEqual(sortLines(expected));
    },
    { actual: () => cartRaw(page) },
  );
}
async function checkBadge(page: Page, n: number): Promise<void> {
  await check(page, `ตัวนับ 🛒 = ${n}`, page.getByTestId('cart-count'), async (el) => {
    await expect.soft(el).toHaveText(String(n));
  });
}
async function checkQtyValue(page: Page, label: string, v: string): Promise<void> {
  await check(page, label, qtyInput(page), async (el) => {
    await expect.soft(el).toHaveValue(v);
  }, { actual: () => qtyInput(page).inputValue() });
}
async function checkStock(page: Page, label: string, text: string): Promise<void> {
  await check(page, label, page.getByTestId('stock-info'), async (el) => {
    await expect.soft(el).toHaveText(text);
  });
}
/** เปิด /cart แล้วตรวจยอดสินค้า ค่าส่ง ยอดชำระ (ส่ง null เพื่อข้ามบรรทัดที่แผนไม่ได้ระบุ) */
async function checkCartTotals(page: Page, sub: string | null, ship: string | RegExp | null, total: string | null): Promise<void> {
  await page.goto('/cart');
  await page.getByTestId('cart-item').first().waitFor({ timeout: 5000 }).catch(() => {});
  if (sub !== null)
    await check(page, `/cart ยอดสินค้า ${sub}`, page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText(sub);
    });
  if (ship !== null)
    await check(page, `/cart ค่าส่ง ${typeof ship === 'string' ? ship : '฿0 (แสดง "฿0" หรือ "ฟรี")'}`, page.getByTestId('summary-shipping'), async (el) => {
      await expect.soft(el).toHaveText(ship);
    });
  if (total !== null)
    await check(page, `/cart ยอดชำระ ${total}`, page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText(total);
    });
}
/** ตรวจราคาที่แสดง และปุ่มขนาดที่ aria-pressed="true" มีปุ่มเดียวคือ label ส่วนปุ่มอื่น "false" */
async function checkSizeState(page: Page, label: string, price: string): Promise<void> {
  await check(page, `ราคา ${price} เมื่อเลือก ${label}`, page.getByTestId('product-price'), async (el) => {
    await expect.soft(el).toHaveText(price);
  });
  await check(
    page,
    `ปุ่ม "${label}" aria-pressed="true" ปุ่มเดียว ปุ่มอื่น "false"`,
    page.getByTestId('size-option'),
    async (btns) => {
      await expect.soft(page.locator('[data-testid="size-option"][aria-pressed="true"]')).toHaveCount(1);
      await expect.soft(sizeBtn(page, label)).toHaveAttribute('aria-pressed', 'true');
      const n = await btns.count();
      for (let i = 0; i < n; i++) {
        const b = btns.nth(i);
        const t = ((await b.textContent()) ?? '').trim();
        if (!t.startsWith(label)) await expect.soft(b).toHaveAttribute('aria-pressed', 'false');
      }
    },
    {
      actual: () =>
        page.getByTestId('size-option').evaluateAll((els) => els.map((e) => `${e.textContent} aria-pressed=${e.getAttribute('aria-pressed')}`).join('\n')),
    },
  );
}
/** ป้ายขนาดของปุ่มที่ aria-pressed="true" */
async function pressedLabel(page: Page): Promise<string> {
  const b = page.locator('[data-testid="size-option"][aria-pressed="true"]').first();
  if ((await b.count()) === 0) return '';
  return b.evaluate((e) => (e.firstElementChild?.textContent ?? e.textContent ?? '').trim());
}
/** เปิดอีก browser context (เหมือนผู้ใช้อีกคน) */
async function newUser(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: baseURL(), viewport: { width: 1280, height: 800 } });
  return ctx.newPage();
}
/** ราคาต่อหน่วยในบริเวณราคา (ปุ่มขนาดที่เลือก + แถวราคา) */
async function unitPrice(page: Page, unit: RegExp): Promise<{ text: string; value: number | null }> {
  const text = await page.evaluate(() => {
    const pressed = document.querySelector('[data-testid="size-option"][aria-pressed="true"]')?.textContent ?? '';
    const row = document.querySelector('[data-testid="product-price"]')?.parentElement?.textContent ?? '';
    return `${pressed} | ${row}`;
  });
  const m = text.match(new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s*(?:บาท)?\\s*/\\s*(?:${unit.source})`));
  return { text, value: m ? Number(m[1].replace(/,/g, '')) : null };
}
const priceArea = (page: Page): Locator =>
  page.locator('[data-testid="size-option"][aria-pressed="true"]').or(page.getByTestId('product-price').locator('..'));


// ───────────── F07 เลือกขนาด ราคา สต็อก (P2) ─────────────

test('TC-PDP-001 สลับขนาดแล้วราคาและ `aria-pressed` เปลี่ยนตาม และขนาดที่ใส่ตะกร้าตรงกับที่เลือก', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ราคาเปลี่ยน ฿189→฿590 · ฿790→฿1,890 · ฿690→฿990 · ฿69→฿299 · ทุกครั้งมีปุ่มขนาด `aria-pressed="true"` ปุ่มเดียวคือปุ่มที่เพิ่งกด ปุ่มอื่น `"false"` · `pp-cart` มี 1 บรรทัด slug `kitten-salmon-dry` size "1.5 kg" qty 1 · `/cart` ยอดสินค้า ฿590 ค่าส่ง ฿50 ยอดชำระ ฿640 (฿590×1 + ส่ง ฿50 = ฿640)' },
    { type: 'source', description: '[D]+[R] · R33 · ความเสี่ยง: ราคาที่ป้าย/ตะกร้าไม่ตรงกับขนาดที่เลือก · เทคนิค: Happy path · Equivalence partition' },
  ],
}, async ({ page }) => {
  const lamb = await test.step('0. หา slug สุนัขโต สูตรแกะ (ขึ้นต้น adult-lamb) จาก GET /api/products', async () => {
    return (await productsApi(page)).find((p) => p.slug.startsWith('adult-lamb'))?.slug ?? 'adult-lamb-dry';
  });
  const sets: [string, string, string, string, string][] = [
    [KITTEN, '400 g', '1.5 kg', '฿189', '฿590'],
    [lamb, '3 kg', '8 kg', '฿790', '฿1,890'],
    ['dog-cozy-bed', 'M', 'L', '฿690', '฿990'],
    ['lickable-salmon-treat', '4 ซอง', '20 ซอง', '฿69', '฿299'],
  ];
  for (const [i, [slug, small, big, p1, p2]] of sets.entries()) {
    const no = i === 0 ? ['1', '2'] : ['3', '3'];
    await test.step(`${no[0]}. เปิด /products/${slug} อ่านราคาและ aria-pressed ของปุ่มขนาดทุกปุ่ม`, async () => {
      await openPdp(page, slug);
    });
    await checkSizeState(page, small, p1);
    await test.step(`${no[1]}. กดปุ่ม "${big}" อ่านราคาและ aria-pressed อีกครั้ง`, async () => {
      await sizeBtn(page, big).click();
    });
    await checkSizeState(page, big, p2);
  }
  await test.step('4. กลับไปหน้าลูกแมวแซลมอน เลือก 1.5 kg จำนวน 1 กด "🛒 เพิ่มลงตะกร้า"', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '1.5 kg').click();
    await fillQty(page, '1');
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart มี 1 บรรทัด kitten-salmon-dry "1.5 kg" qty 1', [{ slug: KITTEN, size: '1.5 kg', qty: 1 }]);
  await test.step('4. เปิด /cart', async () => {});
  await checkCartTotals(page, '฿590', '฿50', '฿640');
});

test('TC-PDP-002 มีราคาต่อหน่วยให้เทียบ และขนาดใหญ่ถูกกว่าต่อหน่วย', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'เมื่อเลือกแต่ละขนาด บริเวณราคาของขนาดนั้นมีตัวเลขราคาต่อหน่วยตามด้วย "/kg" หรือ "/กก." (อาหารเม็ด) และ "/ซอง" (ขนมแมวเลีย) ยอมคลาดจากการปัด ±฿1: 400 g ≈ ฿472.5/kg (189÷0.4) · 1.5 kg ≈ ฿393.3/kg (590÷1.5) · 4 ซอง ≈ ฿17.25/ซอง (69÷4) · 20 ซอง ≈ ฿14.95/ซอง (299÷20) · ตัวเลขของขนาดใหญ่ต่ำกว่าขนาดเล็กทั้ง 2 สินค้า (ตอนนี้ล้ม: มีแค่ "฿590 / 1.5 kg" ไม่มีราคาต่อหน่วย)' },
    { type: 'source', description: '[R] · R34 · Q16 · ความเสี่ยง: ลูกค้าเทียบความคุ้มของขนาดไม่ได้ · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  const kgUnit = /kg|กก\.?/;
  const sachetUnit = /ซอง/;
  const cases: [string, string, RegExp, number, string][] = [
    [KITTEN, '400 g', kgUnit, 189 / 0.4, '≈ ฿472.5/kg'],
    [KITTEN, '1.5 kg', kgUnit, 590 / 1.5, '≈ ฿393.3/kg'],
    ['lickable-salmon-treat', '4 ซอง', sachetUnit, 69 / 4, '≈ ฿17.25/ซอง'],
    ['lickable-salmon-treat', '20 ซอง', sachetUnit, 299 / 20, '≈ ฿14.95/ซอง'],
  ];
  const got: Record<string, number | null> = {};
  for (const [i, [slug, size, unit, expected, label]] of cases.entries()) {
    const stepNo = i < 2 ? String(i + 1) : '3';
    await test.step(`${stepNo}. เปิด /products/${slug} เลือก ${size} หาข้อความราคาต่อหน่วย`, async () => {
      if (!page.url().includes(`/products/${slug}`)) await openPdp(page, slug);
      await sizeBtn(page, size).click();
    });
    const u = await unitPrice(page, unit);
    got[`${slug} ${size}`] = u.value;
    await check(page, `${size}: ราคาต่อหน่วย ${label} (±฿1)`, priceArea(page), async () => {
      expect.soft(u.value, `ไม่พบราคาต่อหน่วยในข้อความ: ${u.text}`).not.toBeNull();
      expect.soft(Math.abs((u.value ?? -999) - expected), `ราคาต่อหน่วย ${u.value} ห่างจาก ${expected.toFixed(2)} เกิน ฿1`).toBeLessThanOrEqual(1);
    }, { actual: async () => u.text });
  }
  await check(page, 'ราคาต่อหน่วยของขนาดใหญ่ต่ำกว่าขนาดเล็กทั้ง 2 สินค้า', null, async () => {
    const k1 = got[`${KITTEN} 400 g`], k2 = got[`${KITTEN} 1.5 kg`];
    const t1 = got['lickable-salmon-treat 4 ซอง'], t2 = got['lickable-salmon-treat 20 ซอง'];
    expect.soft(k1 !== null && k2 !== null && k2 < k1, 'ลูกแมวแซลมอน 1.5 kg ต่อ kg ต้องถูกกว่า 400 g').toBe(true);
    expect.soft(t1 !== null && t2 !== null && t2 < t1, 'ขนมแมวเลีย 20 ซอง ต่อซองต้องถูกกว่า 4 ซอง').toBe(true);
  }, { actual: async () => got });
});

test('TC-PDP-003 สต็อกใช้ร่วมทุกขนาด: รวมทุกขนาดในตะกร้าห้ามเกินสต็อก 25', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 ทั้งสองขนาดแสดง "มีสินค้า 25 ชิ้น" เหมือนกัน · `pp-cart` = 1.5 kg ×5 และ 400 g ×20 (รวม 25 ไม่เกินสต็อก) · `/cart` ยอดสินค้า ฿6,730 (฿590×5 + ฿189×20 = ฿2,950 + ฿3,780) ค่าส่ง ฿0 ยอดชำระ ฿6,730 · toast ข้อ 3 มีตัวเลข "20" และไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน]+[R] · R35 · Q12 · Q13 · Q10 · ความเสี่ยง: นับสต็อกแยกขนาดจนขายเกินของจริง · เทคนิค: Boundary · State' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry อ่านข้อความสต็อกตอนเลือก 400 g และตอนเลือก 1.5 kg', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await checkStock(page, 'เลือก 400 g: "มีสินค้า 25 ชิ้น"', 'มีสินค้า 25 ชิ้น');
  await test.step('1. เลือก 1.5 kg', async () => {
    await sizeBtn(page, '1.5 kg').click();
  });
  await checkStock(page, 'เลือก 1.5 kg: "มีสินค้า 25 ชิ้น"', 'มีสินค้า 25 ชิ้น');
  await test.step('2. เลือก 1.5 kg ตั้งจำนวน 5 กดเพิ่มลงตะกร้า', async () => {
    await fillQty(page, '5');
    await addToCart(page);
    await waitToastsGone(page);
  });
  await test.step('3. เลือก 400 g ตั้งจำนวน 25 กดเพิ่มลงตะกร้า อ่าน toast', async () => {
    await sizeBtn(page, '400 g').click();
    await fillQty(page, '25');
    await addToCart(page);
  });
  await check(page, 'toast ข้อ 3 มีตัวเลข "20"', toastZone(page), async (el) => {
    await expect.soft(el).toContainText(numRe(20));
  });
  await check(page, 'toast ข้อ 3 ไม่ใช่ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ', toastZone(page), async (el) => {
    await expect.soft(el).not.toHaveText(NORMAL_OK);
  });
  await test.step('4. เปิด /cart และดู pp-cart', async () => {});
  await checkCart(page, 'pp-cart = 1.5 kg ×5 และ 400 g ×20 (รวม 25)', [
    { slug: KITTEN, size: '1.5 kg', qty: 5 },
    { slug: KITTEN, size: '400 g', qty: 20 },
  ]);
  await checkCartTotals(page, '฿6,730', SHIP0, '฿6,730');
});

test('TC-PDP-004 สต็อกที่ลดลงจากคำสั่งซื้อขนาดหนึ่ง แสดงผลกับทุกขนาด และตะกร้าตัดตามสต็อกใหม่', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 ยอดชำระ ฿617 · ข้อ 2 ทั้งสองขนาดแสดง "มีสินค้า 22 ชิ้น" · `pp-cart` = 1.5 kg ×5 และ 400 g ×17 (รวม 22) · `/cart` ยอดสินค้า ฿6,163 (฿590×5 + ฿189×17 = ฿2,950 + ฿3,213) ค่าส่ง ฿0 ยอดชำระ ฿6,163 · toast ข้อ 3 (ครั้งที่สอง) มีตัวเลข "17"' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน]+[R] · R35 · Q12 · Q13 · Q10 · ความเสี่ยง: ขนาดอื่นยังโชว์สต็อกเก่า · เทคนิค: State · Boundary' },
  ],
}, async ({ page }) => {
  await test.step('1. ล็อกอิน demo ใส่ kitten-salmon-dry 400 g ×3 แล้วสั่งซื้อด้วย demo', async () => {
    await loginDemo(page);
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
    await fillQty(page, '3');
    await addToCart(page);
    await checkoutDemo(page);
  });
  await checkOrder(page, '฿617');
  await test.step('2. ตั้ง pp-cart เป็น [] แล้วเปิด /products/kitten-salmon-dry ใหม่ อ่านข้อความสต็อกทั้ง 400 g และ 1.5 kg', async () => {
    await setCart(page, []);
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await checkStock(page, '400 g: "มีสินค้า 22 ชิ้น"', 'มีสินค้า 22 ชิ้น');
  await test.step('2. เลือก 1.5 kg', async () => {
    await sizeBtn(page, '1.5 kg').click();
  });
  await checkStock(page, '1.5 kg: "มีสินค้า 22 ชิ้น"', 'มีสินค้า 22 ชิ้น');
  await test.step('3. เลือก 1.5 kg ×5 กดเพิ่ม · เลือก 400 g ×22 กดเพิ่ม', async () => {
    await fillQty(page, '5');
    await addToCart(page);
    await waitToastsGone(page);
    await sizeBtn(page, '400 g').click();
    await fillQty(page, '22');
    await addToCart(page);
  });
  await check(page, 'toast ข้อ 3 (ครั้งที่สอง) มีตัวเลข "17"', toastZone(page), async (el) => {
    await expect.soft(el).toContainText(numRe(17));
  });
  await checkCart(page, 'pp-cart = 1.5 kg ×5 และ 400 g ×17 (รวม 22)', [
    { slug: KITTEN, size: '1.5 kg', qty: 5 },
    { slug: KITTEN, size: '400 g', qty: 17 },
  ]);
  await test.step('4. เปิด /cart', async () => {});
  await checkCartTotals(page, '฿6,163', SHIP0, '฿6,163');
});

test('TC-PDP-005 ข้อความสถานะสต็อกตามจำนวนคงเหลือ (9 / 3 / 0)', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 = "มีสินค้า 9 ชิ้น" ทั้ง M และ L · ข้อ 2 = "เหลือ 3 ชิ้น" · ข้อ 3 = "สินค้าหมด"' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R36 · Q13 · ความเสี่ยง: ลูกค้าไม่รู้ว่าของใกล้หมด/หมด · เทคนิค: Equivalence partition · Boundary' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/dog-cozy-bed อ่านข้อความสต็อก (M)', async () => {
    await openPdp(page, 'dog-cozy-bed');
    await sizeBtn(page, 'M').click();
  });
  await checkStock(page, 'เบาะนอน M: "มีสินค้า 9 ชิ้น"', 'มีสินค้า 9 ชิ้น');
  await test.step('1. เลือก L อ่านข้อความสต็อก', async () => {
    await sizeBtn(page, 'L').click();
  });
  await checkStock(page, 'เบาะนอน L: "มีสินค้า 9 ชิ้น"', 'มีสินค้า 9 ชิ้น');
  await test.step('2. ค้น /products?q=ก้อนขน เปิดสูตรลดก้อนขน อ่านข้อความสต็อก', async () => {
    await openHairball(page);
  });
  await checkStock(page, 'สูตรลดก้อนขน: "เหลือ 3 ชิ้น"', 'เหลือ 3 ชิ้น');
  await test.step('3. เปิด /products/freeze-dried-chicken-cat อ่านข้อความสต็อก', async () => {
    await openPdp(page, FREEZE);
  });
  await checkStock(page, 'ไก่ฟรีซดราย: "สินค้าหมด"', 'สินค้าหมด');
});

test('TC-PDP-006 ข้อความสต็อกเปลี่ยนหลังสต็อกลดจาก 3 เป็น 2', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2 ยอดชำระ ฿570 · ข้อ 3 แสดง "เหลือ 2 ชิ้น" · ช่องจำนวนรับได้สูงสุด 2 (พิมพ์ 3 แล้วค่าเป็น 2)' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R36 · R43 · Q13 · ความเสี่ยง: ข้อความสต็อกค้างค่าเก่าหลังมีคนซื้อ · เทคนิค: State' },
  ],
}, async ({ page }) => {
  await test.step('1. ล็อกอิน demo เปิดสูตรลดก้อนขน', async () => {
    await loginDemo(page);
    await openHairball(page);
  });
  await checkStock(page, 'ก่อนซื้อ "เหลือ 3 ชิ้น"', 'เหลือ 3 ชิ้น');
  const hairUrl = page.url();
  const hairSlug = new URL(hairUrl).pathname.split('/').pop() ?? '';
  await test.step('2. ใส่ 1.5 kg ×1 แล้วสั่งซื้อด้วย demo', async () => {
    await sizeBtn(page, '1.5 kg').click();
    await fillQty(page, '1');
    await addToCart(page);
    await checkoutDemo(page);
  });
  await checkOrder(page, '฿570');
  await test.step('3. เปิดหน้าสูตรลดก้อนขนใหม่ (reload)', async () => {
    await openPdp(page, hairSlug);
    await reloadPdp(page, hairSlug);
  });
  await checkStock(page, 'หลังซื้อ "เหลือ 2 ชิ้น"', 'เหลือ 2 ชิ้น');
  await test.step('3. พิมพ์ "3" ในช่องจำนวน แล้ว Tab', async () => {
    await typeQty(page, '3');
  });
  await checkQtyValue(page, 'ช่องจำนวนรับได้สูงสุด 2 (พิมพ์ 3 แล้วค่าเป็น 2)', '2');
});

test('TC-PDP-007 สินค้าหมดตั้งแต่ต้น: ป้ายหมดและปุ่มถูกปิดในหน้ารายละเอียด (การ์ดหน้ารวมดู TC-CARD-002)', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2: ปุ่มเพิ่มลงตะกร้ามีข้อความ "สินค้าหมด" และมี attribute `disabled` · ปุ่ม − และ + มี `disabled` · `#qty-input` มี `disabled` · ข้อความสต็อก "สินค้าหมด" · `pp-cart` ยังเป็น `[]`' },
    { type: 'source', description: '[D]+[R] · R37 · Q13 · ความเสี่ยง: ลูกค้าใส่ของที่ไม่มีขายลงตะกร้า · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/freeze-dried-chicken-cat', async () => {
    await openPdp(page, FREEZE);
  });
  await test.step('2. ตรวจปุ่มเพิ่มลงตะกร้า ปุ่ม −/+ และ #qty-input', async () => {});
  await check(page, 'ปุ่มเพิ่มลงตะกร้ามีข้อความ "สินค้าหมด" และมี disabled', page.getByTestId('add-to-cart'), async (el) => {
    await expect.soft(el).toHaveText('สินค้าหมด');
    await expect.soft(el).toHaveAttribute('disabled');
  });
  await check(page, 'ปุ่ม − และ + มี disabled', page.getByTestId('qty-minus').or(page.getByTestId('qty-plus')), async () => {
    await expect.soft(page.getByTestId('qty-minus')).toHaveAttribute('disabled');
    await expect.soft(page.getByTestId('qty-plus')).toHaveAttribute('disabled');
  });
  await check(page, '#qty-input มี disabled', page.locator('#qty-input'), async (el) => {
    await expect.soft(el).toHaveAttribute('disabled');
  });
  await checkStock(page, 'ข้อความสต็อก "สินค้าหมด"', 'สินค้าหมด');
  await checkCart(page, 'pp-cart ยังเป็น []', []);
});

test('TC-PDP-008 สต็อกเพิ่งลดเป็น 0 ต้องขึ้นหมดและปิดการใส่ตะกร้าทันทีทั้งสองหน้า', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 ยอดชำระ ฿1,560 · ข้อ 2 ข้อความ "สินค้าหมด" ปุ่ม "สินค้าหมด" `disabled` · −/+ และ `#qty-input` `disabled` · ข้อ 3 การ์ดมีป้าย "หมด" · ข้อ 4 `pp-cart` ยังเป็น `[]` และตัวนับ 🛒 = 0' },
    { type: 'source', description: '[D]+[R] · R37 · Q13 · ความเสี่ยง: หน้าเว็บยังขายของที่เพิ่งหมด · เทคนิค: State · Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. ล็อกอิน demo ใส่สูตรลดก้อนขน 1.5 kg ×3 แล้วสั่งซื้อด้วย demo', async () => {
    await loginDemo(page);
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('1. ตั้งจำนวน 3 เพิ่มลงตะกร้า แล้วสั่งซื้อ', async () => {
    await sizeBtn(page, '1.5 kg').click();
    await fillQty(page, '3');
    await addToCart(page);
    await checkoutDemo(page);
  });
  await checkOrder(page, '฿1,560');
  await test.step('2. ตั้ง pp-cart เป็น [] เปิดหน้าสูตรลดก้อนขนใหม่', async () => {
    await setCart(page, []);
    await openPdp(page, hairSlug);
  });
  await checkStock(page, 'ข้อความ "สินค้าหมด"', 'สินค้าหมด');
  await check(page, 'ปุ่ม "สินค้าหมด" disabled', page.getByTestId('add-to-cart'), async (el) => {
    await expect.soft(el).toHaveText('สินค้าหมด');
    await expect.soft(el).toHaveAttribute('disabled');
  });
  await check(page, '−/+ และ #qty-input disabled', page.getByTestId('qty-minus').or(page.getByTestId('qty-plus')).or(qtyInput(page)), async () => {
    await expect.soft(page.getByTestId('qty-minus')).toHaveAttribute('disabled');
    await expect.soft(page.getByTestId('qty-plus')).toHaveAttribute('disabled');
    await expect.soft(qtyInput(page)).toHaveAttribute('disabled');
  });
  await test.step('3. เปิด /products?q=ก้อนขน ดูการ์ด', async () => {
    await page.goto(`/products?q=${encodeURIComponent('ก้อนขน')}`);
  });
  const card = page.locator(`[data-testid="product-card"][data-slug="${hairSlug}"]`);
  await check(page, 'การ์ดสูตรลดก้อนขนมีป้าย "หมด"', card, async (el) => {
    await expect.soft(el.getByTestId('stock-badge')).toHaveText('หมด');
  });
  await test.step('4. กดปุ่มเพิ่มลงตะกร้าทั้งสองหน้าด้วย click({ force: true }) — การ์ดในหน้าค้นหา แล้วหน้ารายละเอียด', async () => {
    await card.getByTestId('quick-add').click({ force: true, timeout: 5000 }).catch(() => {});
    await openPdp(page, hairSlug);
    await page.getByTestId('add-to-cart').click({ force: true, timeout: 5000 }).catch(() => {});
  });
  await checkCart(page, 'pp-cart ยังเป็น []', []);
  await checkBadge(page, 0);
});

test('TC-PDP-009 ใส่ `?size=` ใน URL แล้วหน้าไม่พัง และขนาดที่เลือก = ราคาที่แสดง = ขนาดที่ลงตะกร้า', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ทั้งสอง URL ได้ HTTP 200 · มีปุ่มขนาด `aria-pressed="true"` ปุ่มเดียว · ราคาที่แสดงตรงกับขนาดนั้น (400 g = ฿189 หรือ 1.5 kg = ฿590) · `pp-cart` มี size ตรงกับปุ่มที่ `aria-pressed="true"` qty 1 และยอดใน `/cart` เท่าราคาที่แสดง · ไม่มีข้อความ error/หน้า 404' },
    { type: 'source', description: '[R] · R38 · ความเสี่ยง: ลิงก์ที่แชร์มาทำให้ราคาที่เห็นไม่ตรงขนาดที่ลงตะกร้า · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  const priceOf: Record<string, string> = { '400 g': '฿189', '1.5 kg': '฿590' };
  const urls = ['?size=1.5%20kg', '?size=xyz'];
  for (const [i, q] of urls.entries()) {
    const pre = i === 0 ? '' : '3. ';
    let status = 0;
    await test.step(`${pre}1. เปิด /products/kitten-salmon-dry${q} ดู HTTP status, ปุ่มที่ aria-pressed="true" และราคา`, async () => {
      if (i > 0) await setCart(page, []);
      status = (await openPdp(page, KITTEN, q))?.status() ?? 0;
    });
    await check(page, `${q}: HTTP 200`, null, async () => {
      expect.soft(status).toBe(200);
    }, { actual: async () => status });
    await check(page, `${q}: ไม่มีข้อความ error/หน้า 404`, page.locator('h1').first(), async (el) => {
      await expect.soft(el).not.toHaveText(/ไม่พบ|404|error/i);
      await expect.soft(page.getByTestId('product-title')).toBeVisible();
    });
    await check(page, `${q}: มีปุ่มขนาด aria-pressed="true" ปุ่มเดียว`, page.getByTestId('size-option'), async () => {
      await expect.soft(page.locator('[data-testid="size-option"][aria-pressed="true"]')).toHaveCount(1);
    }, { actual: () => page.getByTestId('size-option').evaluateAll((els) => els.map((e) => `${e.textContent} aria-pressed=${e.getAttribute('aria-pressed')}`).join('\n')) });
    const sel = await pressedLabel(page);
    const shown = ((await page.getByTestId('product-price').textContent()) ?? '').trim();
    await check(page, `${q}: ราคาที่แสดงตรงกับขนาดที่เลือก (400 g = ฿189 หรือ 1.5 kg = ฿590)`, page.getByTestId('product-price'), async (el) => {
      expect.soft(priceOf[sel], `ขนาดที่เลือก "${sel}" ไม่ใช่ 400 g หรือ 1.5 kg`).toBeTruthy();
      await expect.soft(el).toHaveText(priceOf[sel] ?? '(ไม่มีขนาดที่เลือก)');
    }, { actual: async () => `เลือก ${sel} · ราคา ${shown}` });
    await test.step(`${pre}2. ตั้งจำนวน 1 กดเพิ่มลงตะกร้า ดู pp-cart`, async () => {
      await fillQty(page, '1');
      await addToCart(page);
      await page.waitForFunction(() => (localStorage.getItem('pp-cart') ?? '[]') !== '[]', null, { timeout: 5000 }).catch(() => {});
    });
    await checkCart(page, `${q}: pp-cart size ตรงกับปุ่มที่ aria-pressed="true" ("${sel}") qty 1`, [{ slug: KITTEN, size: sel, qty: 1 }]);
    await checkCartTotals(page, shown, null, null);
  }
});

test('TC-PDP-010 สลับขนาดหลังตั้งจำนวนแล้ว ตะกร้าได้ขนาดที่เลือกล่าสุดกับจำนวนในช่อง', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` มีบรรทัดเดียว size "1.5 kg" (ไม่มีบรรทัด 400 g) qty เท่าค่าในช่องข้อ 2 · ถ้าช่องยังเป็น 5: ยอดสินค้า ฿2,950 (฿590×5) ค่าส่ง ฿0 ยอดชำระ ฿2,950 · ถ้าช่องเป็น 1: ยอดสินค้า ฿590 ค่าส่ง ฿50 ยอดชำระ ฿640 (฿590×1 + ส่ง ฿50) · ค่าอื่น: ยอดสินค้า = ฿590 × qty และค่าส่งตามเกณฑ์ ฿999 · ตัวนับ 🛒 = qty นั้น' },
    { type: 'source', description: '[D]+[R] · R39 · ความเสี่ยง: ได้ขนาด/จำนวนไม่ตรงกับที่เห็นตอนกด · เทคนิค: State' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 400 g ตั้งจำนวน 5', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
    await fillQty(page, '5');
  });
  await test.step('2. กด 1.5 kg อ่านค่าใน #qty-input', async () => {
    await sizeBtn(page, '1.5 kg').click();
  });
  const q = Number(await qtyInput(page).inputValue());
  await test.step(`3. กดเพิ่มลงตะกร้า (ค่าในช่อง = ${q}) แล้วเปิด /cart`, async () => {
    await addToCart(page);
  });
  await checkCart(page, `pp-cart มีบรรทัดเดียว size "1.5 kg" qty ${q} (ไม่มีบรรทัด 400 g)`, [{ slug: KITTEN, size: '1.5 kg', qty: q }]);
  await checkBadge(page, q);
  const sub = 590 * q;
  const fmt = (n: number) => `฿${n.toLocaleString('en-US')}`;
  await checkCartTotals(page, fmt(sub), sub >= 999 ? SHIP0 : '฿50', fmt(sub >= 999 ? sub : sub + 50));
});

// ───────────── F08 ช่องจำนวน + เพิ่มลงตะกร้า (P1) ─────────────

test('TC-QTY-001 ใส่ตะกร้า 1 ชิ้น (ค่าต่ำสุดที่ถูกต้อง)', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'มี toast ที่มีข้อความเดียวกับ H1 ของหน้าสินค้า และ "400 g" · ตัวนับ 🛒 = 1 · `pp-cart` มี 1 บรรทัด slug `kitten-salmon-dry` size "400 g" qty 1 · `/cart` ยอดสินค้า ฿189 ค่าส่ง ฿50 ยอดชำระ ฿239 (฿189×1 + ส่ง ฿50 = ฿239)' },
    { type: 'source', description: '[D]+[R] · R41 · ความเสี่ยง: ทางซื้อหลักใส่ตะกร้าไม่ได้ · เทคนิค: Happy path · Boundary' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 400 g ช่องจำนวน = 1', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
    await fillQty(page, '1');
  });
  const h1 = ((await page.getByTestId('product-title').textContent()) ?? '').trim();
  await test.step('2. กด "🛒 เพิ่มลงตะกร้า"', async () => {
    await addToCart(page);
  });
  await test.step('3. ดู toast ตัวนับ 🛒 และ pp-cart', async () => {});
  await check(page, `toast มีชื่อสินค้าตาม H1 ("${h1}") และ "400 g"`, toastZone(page), async (el) => {
    await expect.soft(el).toContainText(h1);
    await expect.soft(el).toContainText('400 g');
  });
  await checkBadge(page, 1);
  await checkCart(page, 'pp-cart มี 1 บรรทัด kitten-salmon-dry "400 g" qty 1', [{ slug: KITTEN, size: '400 g', qty: 1 }]);
  await test.step('4. เปิด /cart', async () => {});
  await checkCartTotals(page, '฿189', '฿50', '฿239');
});

test('TC-QTY-002 ใช้ปุ่ม + ตั้งจำนวนแล้วใส่ตะกร้า', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ช่องจำนวน = 3 · `pp-cart` 400 g qty 3 · ตัวนับ 🛒 = 3 · ยอดสินค้า ฿567 ค่าส่ง ฿50 ยอดชำระ ฿617 (฿189×3 + ส่ง ฿50)' },
    { type: 'source', description: '[D]+[R] · R48 · ความเสี่ยง: ปุ่ม +/− ไม่เปลี่ยนจำนวนที่ลงตะกร้า · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า เลือก 400 g', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await test.step('2. กด + 2 ครั้ง อ่านค่าในช่อง', async () => {
    await page.getByTestId('qty-plus').click();
    await page.getByTestId('qty-plus').click();
  });
  await checkQtyValue(page, 'ช่องจำนวน = 3', '3');
  await test.step('3. กดเพิ่มลงตะกร้า เปิด /cart', async () => {
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart 400 g qty 3', [{ slug: KITTEN, size: '400 g', qty: 3 }]);
  await checkBadge(page, 3);
  await checkCartTotals(page, '฿567', '฿50', '฿617');
});

test('TC-QTY-003 ใส่เท่าสต็อกพอดี (25)', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ช่องจำนวน = 25 · `pp-cart` qty 25 · ยอดสินค้า ฿4,725 (฿189×25) ≥ ฿999 → ค่าส่ง ฿0 · ยอดชำระ ฿4,725 · toast เป็นข้อความเพิ่มสำเร็จ (ไม่มีคำเตือนสต็อก)' },
    { type: 'source', description: '[D]+[R] · R43 · ความเสี่ยง: ซื้อเท่าสต็อกไม่ได้ · เทคนิค: Boundary · Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า เลือก 400 g', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await test.step('2. ล้างช่องแล้ว fill "25" กด Tab', async () => {
    await qtyInput(page).fill('');
    await fillQty(page, '25');
  });
  await checkQtyValue(page, 'ช่องจำนวน = 25', '25');
  await test.step('3. กดเพิ่มลงตะกร้า', async () => {
    await addToCart(page);
  });
  await check(page, 'toast เป็นข้อความเพิ่มสำเร็จ (ไม่มีคำเตือนสต็อก)', toastZone(page), async (el) => {
    await expect.soft(el).toHaveText(NORMAL_OK);
    await expect.soft(el).not.toHaveText(/สต็อก|ไม่พอ|⚠️/);
  });
  await checkCart(page, 'pp-cart qty 25', [{ slug: KITTEN, size: '400 g', qty: 25 }]);
  await test.step('3. เปิด /cart', async () => {});
  await checkCartTotals(page, '฿4,725', SHIP0, '฿4,725');
});

test('TC-QTY-004 ใส่เกินสต็อก (สต็อก+1 และค่าใหญ่มาก) ต้องไม่เกิน 25', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 และ 2 ค่าในช่อง = 25 · `pp-cart` qty 25 (ไม่ใช่ 26 หรือ 99999) · ยอดชำระ ฿4,725 (฿189×25 ส่งฟรี)' },
    { type: 'source', description: '[D]+[R] · R43 · ความเสี่ยง: ขายเกินสต็อกจากการพิมพ์เลขเกิน · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิด /products/kitten-salmon-dry เลือก 400 g', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await test.step('1. ล้างช่อง พิมพ์ "2","6" กด Tab อ่านค่า', async () => {
    await typeQty(page, '26');
  });
  await checkQtyValue(page, 'พิมพ์ "26" → ค่าในช่อง = 25', '25');
  await test.step('2. ล้างช่อง fill "99999" กด Tab อ่านค่า', async () => {
    await qtyInput(page).fill('');
    await fillQty(page, '99999');
  });
  await checkQtyValue(page, 'fill "99999" → ค่าในช่อง = 25', '25');
  await test.step('3. กดเพิ่มลงตะกร้า 1 ครั้ง เปิด /cart', async () => {
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart qty 25 (ไม่ใช่ 26 หรือ 99999)', [{ slug: KITTEN, size: '400 g', qty: 25 }]);
  await checkCartTotals(page, null, null, '฿4,725');
});

test('TC-QTY-005 0, −1 และช่องว่างต้องกลายเป็น 1', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1–3 ค่าในช่อง = 1 ทุกครั้ง · `pp-cart` qty 1 (ไม่มี qty 0 หรือติดลบ) · ยอดชำระ ฿239 (฿189×1 + ส่ง ฿50)' },
    { type: 'source', description: '[D]+[R] · R41 · ความเสี่ยง: จำนวน 0/ติดลบลงตะกร้าทำให้ยอดเงินผิด · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิด /products/kitten-salmon-dry เลือก 400 g', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await test.step('1. fill "0" กด Tab อ่านค่า', async () => {
    await fillQty(page, '0');
  });
  await checkQtyValue(page, 'fill "0" → 1', '1');
  await test.step('2. fill "-1" กด Tab อ่านค่า', async () => {
    await fillQty(page, '-1');
  });
  await checkQtyValue(page, 'fill "-1" → 1', '1');
  await test.step('3. ล้างช่องให้ว่าง กด Tab อ่านค่า', async () => {
    await fillQty(page, '');
  });
  await checkQtyValue(page, 'ช่องว่าง → 1', '1');
  await test.step('4. กดเพิ่มลงตะกร้า เปิด /cart', async () => {
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart qty 1 (ไม่มี qty 0 หรือติดลบ)', [{ slug: KITTEN, size: '400 g', qty: 1 }]);
  await checkCartTotals(page, null, null, '฿239');
});

test('TC-QTY-006 จำนวนทศนิยมต้องไม่ลงตะกร้า', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'fill "1.5" → ช่อง = 1 (ตัดทศนิยมตาม R42 · ยอมรับ 2 ถ้าปัดขึ้น) · พิมพ์ "2.5" → ช่อง = 2 (ยอมรับ 3) · ห้ามเป็น 15 หรือ 25 · `pp-cart` qty เท่าค่าในช่อง (ไม่มี 1.5 หรือ 2.5) · ยอดสินค้าใน `/cart` = ฿189 × qty (1 → ฿189 · 2 → ฿378 · 3 → ฿567) ค่าส่ง ฿50 ยอดชำระ = ยอดสินค้า + ฿50 (เช่น ฿189×1 + ส่ง ฿50 = ฿239 · ฿189×2 + ส่ง ฿50 = ฿428) ไม่มีสตางค์' },
    { type: 'source', description: '[D]+[R] · R42 · ความเสี่ยง: qty ทศนิยมทำให้ยอดเงินมีเศษ/ไม่ตรง · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  const fmt = (n: number) => `฿${n.toLocaleString('en-US')}`;
  const rounds: [string, string, string[]][] = [
    ['1', 'fill "1.5"', ['1', '2']],
    ['3', 'พิมพ์ "2",".","5"', ['2', '3']],
  ];
  for (const [stepNo, how, allowed] of rounds) {
    await test.step(`${stepNo}. ${how} กด Tab อ่านค่า`, async () => {
      if (stepNo === '1') {
        await openPdp(page, KITTEN);
      } else {
        await test.step('2. ตั้ง pp-cart=[] reload หน้า', async () => {
          await setCart(page, []);
          await openPdp(page, KITTEN);
          await reloadPdp(page, KITTEN);
        });
      }
      await sizeBtn(page, '400 g').click();
      if (stepNo === '1') await fillQty(page, '1.5');
      else await typeQty(page, '2.5');
    });
    const v = await qtyInput(page).inputValue();
    await check(page, `${how} → ช่อง = ${allowed[0]} (ยอมรับ ${allowed[1]}) ห้ามเป็น 15 หรือ 25`, qtyInput(page), async () => {
      expect.soft(allowed, `ค่าในช่อง "${v}"`).toContain(v);
    }, { actual: async () => v });
    await test.step(`${stepNo}. กดเพิ่มลงตะกร้า ดู pp-cart`, async () => {
      await addToCart(page);
    });
    const qty = Number(v);
    await check(page, `pp-cart qty เท่าค่าในช่อง (${v}) ไม่มี 1.5 หรือ 2.5`, null, async () => {
      const c = await cartOf(page);
      expect.soft(c.length).toBe(1);
      expect.soft(c[0]?.qty).toBe(qty);
      expect.soft(Number.isInteger(c[0]?.qty)).toBe(true);
    }, { actual: () => cartRaw(page) });
    const sub = 189 * (Number.isInteger(qty) ? qty : NaN);
    await checkCartTotals(page, fmt(sub), '฿50', fmt(sub + 50));
    await check(page, 'ไม่มีสตางค์ในยอดเงิน', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).not.toHaveText(/\.\d/);
    });
  }
});

test('TC-QTY-007 พิมพ์ทีละตัวเลขที่มี 0 นำหน้า ("05", "003") ต้องได้ค่าที่ตั้งใจ', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '"05" → ช่อง = 5 · `pp-cart` qty 5 · ยอดสินค้า ฿945 (฿189×5) ค่าส่ง ฿50 ยอดชำระ ฿995 · "003" → ช่อง = 3 · ยอดสินค้า ฿567 (฿189×3) ยอดชำระ ฿617 (ตอนนี้ล้ม: "05" ได้ 15 = ฿2,835 และ "003" ได้ 25 = ฿4,725)' },
    { type: 'source', description: '[D]+[R] · R44 · Q11 · ความเสี่ยง: พิมพ์ 5 ได้ 15 ลูกค้าจ่ายเกินสามเท่า · เทคนิค: Boundary' },
  ],
}, async ({ page }) => {
  const rounds: [string, string, string, string][] = [
    ['05', '5', '฿945', '฿995'],
    ['003', '3', '฿567', '฿617'],
  ];
  for (const [i, [chars, want, sub, total]] of rounds.entries()) {
    await test.step(`${i === 0 ? '1' : '3'}. คลิกช่อง เลือกทั้งหมดแล้ว Backspace พิมพ์ ${chars.split('').map((c) => `"${c}"`).join(',')} กด Tab อ่านค่า`, async () => {
      if (i > 0) await setCart(page, []);
      await openPdp(page, KITTEN);
      await sizeBtn(page, '400 g').click();
      await typeQty(page, chars);
    });
    await checkQtyValue(page, `"${chars}" → ช่อง = ${want}`, want);
    await test.step(`${i === 0 ? '2' : '3'}. กดเพิ่มลงตะกร้า เปิด /cart`, async () => {
      await addToCart(page);
    });
    await checkCart(page, `pp-cart qty ${want}`, [{ slug: KITTEN, size: '400 g', qty: Number(want) }]);
    await checkCartTotals(page, sub, '฿50', total);
  }
});

test('TC-QTY-008 พิมพ์เลขไทย "๕" ต้องไม่ทำให้ค่าเพี้ยน และสิ่งที่ลงตะกร้าตรงกับที่ช่องแสดง', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'หลัง Tab ช่องต้องแสดงตัวเลข (5 หรือ 1) ไม่ว่าง · `pp-cart` qty เท่ากับตัวเลขนั้น (ถ้าช่องว่างแต่ตะกร้าได้ 1 = ล้ม) (ถ้าช่องรับเป็น 5 → ฿945 + ส่ง ฿50 = ฿995 · ถ้าช่องกลับเป็น 1 → ฿189 + ส่ง ฿50 = ฿239) · ตัวนับ 🛒 = qty · ไม่มีข้อความ "NaN" ในหน้าและใน `pp-cart`' },
    { type: 'source', description: '[D]+[R] · R50 · ความเสี่ยง: ค่าที่เห็นกับค่าที่ลงตะกร้าไม่ตรงกัน · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  await test.step('1. ล้างช่อง พิมพ์ "๕" กด Tab อ่านค่าที่แสดง', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
    await typeQty(page, '๕');
  });
  const v = await qtyInput(page).inputValue();
  await check(page, 'หลัง Tab ช่องแสดงตัวเลข (5 หรือ 1) ไม่ว่าง', qtyInput(page), async () => {
    expect.soft(['5', '1'], `ค่าในช่อง "${v}"`).toContain(v);
  }, { actual: async () => v });
  await test.step('2. กดเพิ่มลงตะกร้า', async () => {
    await addToCart(page);
  });
  await test.step('3. ดู pp-cart ตัวนับ 🛒 และ /cart', async () => {});
  const q = Number(v);
  await check(page, `pp-cart qty เท่ากับตัวเลขในช่อง (${v || 'ว่าง'})`, null, async () => {
    const c = await cartOf(page);
    expect.soft(c.length).toBe(1);
    expect.soft(v, 'ช่องว่างแต่ตะกร้าได้ของ = ล้ม').not.toBe('');
    expect.soft(c[0]?.qty).toBe(q);
  }, { actual: () => cartRaw(page) });
  await check(page, 'ไม่มี "NaN" ในหน้าและใน pp-cart', page.locator('body'), async (el) => {
    await expect.soft(el).not.toContainText('NaN');
    expect.soft(await cartRaw(page)).not.toContain('NaN');
  }, { actual: () => cartRaw(page) });
  const cartQty = (await cartOf(page))[0]?.qty ?? 0;
  await checkBadge(page, cartQty);
  if (v === '5') await checkCartTotals(page, '฿945', '฿50', '฿995');
  else await checkCartTotals(page, '฿189', '฿50', '฿239');
  await check(page, 'ไม่มี "NaN" ในหน้า /cart', page.locator('main'), async (el) => {
    await expect.soft(el).not.toContainText('NaN');
  });
});

test('TC-QTY-009 ปุ่ม −/+ และปุ่มลูกศร ↑/↓ หยุดที่ 1 และที่สต็อก', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 = 1 · ข้อ 2 = 25 · ข้อ 3 = 7 · ข้อ 4 = 1 · ไม่มีค่า 0, 26 หรือ 8 ปรากฏในช่องเลย' },
    { type: 'source', description: '[R] · R48 · ความเสี่ยง: ปุ่มพาเลยขอบจนได้ 0 หรือเกินสต็อก · เทคนิค: Boundary' },
  ],
}, async ({ page }) => {
  const fountain = await test.step('0. หา slug น้ำพุแมวจาก GET /api/products', async () => {
    return (await productsApi(page)).find((p) => p.name.includes('น้ำพุแมว'))?.slug ?? 'cat-fountain';
  });
  const track = async () => {
    await page.evaluate(() => {
      const w = window as unknown as { __qtySeen: string[] };
      w.__qtySeen = [];
      const tick = () => {
        const el = document.querySelector('#qty-input') as HTMLInputElement | null;
        if (el && w.__qtySeen[w.__qtySeen.length - 1] !== el.value) w.__qtySeen.push(el.value);
        requestAnimationFrame(tick);
      };
      document.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; if (t.id === 'qty-input') w.__qtySeen.push(t.value); }, true);
      tick();
    });
  };
  const seen = () => page.evaluate(() => (window as unknown as { __qtySeen: string[] }).__qtySeen ?? []);
  const allSeen: string[] = [];
  await test.step('1. หน้าลูกแมวแซลมอน ช่อง = 1 กด − อ่านค่า', async () => {
    await openPdp(page, KITTEN);
    await track();
    await fillQty(page, '1');
    await page.getByTestId('qty-minus').click();
  });
  await checkQtyValue(page, 'ข้อ 1 = 1', '1');
  await test.step('2. fill "25" กด + อ่านค่า', async () => {
    await qtyInput(page).fill('25');
    await page.getByTestId('qty-plus').click();
  });
  await checkQtyValue(page, 'ข้อ 2 = 25', '25');
  allSeen.push(...(await seen()));
  await test.step(`3. หน้าน้ำพุแมว (/products/${fountain}) fill "7" โฟกัสช่องแล้วกด ↑ อ่านค่า`, async () => {
    await openPdp(page, fountain);
    await track();
    await qtyInput(page).fill('7');
    await qtyInput(page).focus();
    await qtyInput(page).press('ArrowUp');
  });
  await checkQtyValue(page, 'ข้อ 3 = 7', '7');
  await test.step('4. fill "1" กด ↓ อ่านค่า', async () => {
    await qtyInput(page).fill('1');
    await qtyInput(page).press('ArrowDown');
  });
  await checkQtyValue(page, 'ข้อ 4 = 1', '1');
  allSeen.push(...(await seen()));
  await check(page, 'ไม่มีค่า 0, 26 หรือ 8 ปรากฏในช่องเลย', qtyInput(page), async () => {
    for (const bad of ['0', '26', '8']) expect.soft(allSeen, `ช่องเคยเป็น "${bad}"`).not.toContain(bad);
  }, { actual: async () => allSeen.join(' → ') });
});

test('TC-QTY-010 สูตรลดก้อนขน (สต็อก 3) ใส่ 3 ได้', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อความสต็อก "เหลือ 3 ชิ้น" · `pp-cart` qty 3 size "1.5 kg" · ยอดสินค้า ฿1,560 (฿520×3) ≥ ฿999 → ค่าส่ง ฿0 · ยอดชำระ ฿1,560' },
    { type: 'source', description: '[D]+[R]+[O-ยังไม่ยืนยัน] · R45 · R36 · Q13 · ความเสี่ยง: สินค้าสต็อกต่ำซื้อครบไม่ได้ · เทคนิค: Happy path · Boundary' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products?q=ก้อนขน เข้าหน้าสูตรลดก้อนขน', async () => {
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await checkStock(page, 'ข้อความสต็อก "เหลือ 3 ชิ้น"', 'เหลือ 3 ชิ้น');
  await test.step('2. ตั้งจำนวน 3 กดเพิ่มลงตะกร้า', async () => {
    await fillQty(page, '3');
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart qty 3 size "1.5 kg"', [{ slug: hairSlug, size: '1.5 kg', qty: 3 }]);
  await test.step('3. เปิด /cart', async () => {});
  await checkCartTotals(page, '฿1,560', SHIP0, '฿1,560');
});

test('TC-QTY-011 สูตรลดก้อนขนใส่ 4 ไม่ได้ (พิมพ์ / fill / ↑)', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1–3 ค่าในช่อง = 3 ทุกครั้ง · `pp-cart` qty 3 (ไม่ใช่ 4) · ยอดชำระ ฿1,560 (฿520×3 ส่งฟรี)' },
    { type: 'source', description: '[D]+[R] · R45 · R43 · ความเสี่ยง: ขายเกินสต็อกสินค้าใกล้หมด · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิดหน้าสูตรลดก้อนขน', async () => {
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('1. ล้างช่อง พิมพ์ "4" กด Tab อ่านค่า', async () => {
    await typeQty(page, '4');
  });
  await checkQtyValue(page, 'พิมพ์ "4" → 3', '3');
  await test.step('2. fill "4" กด Tab อ่านค่า', async () => {
    await fillQty(page, '4');
  });
  await checkQtyValue(page, 'fill "4" → 3', '3');
  await test.step('3. fill "3" กด ↑ อ่านค่า', async () => {
    await qtyInput(page).fill('3');
    await qtyInput(page).press('ArrowUp');
  });
  await checkQtyValue(page, 'ช่อง = 3 กด ↑ → 3', '3');
  await test.step('4. กดเพิ่มลงตะกร้า เปิด /cart', async () => {
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart qty 3 (ไม่ใช่ 4)', [{ slug: hairSlug, size: '1.5 kg', qty: 3 }]);
  await checkCartTotals(page, null, null, '฿1,560');
});

test('TC-QTY-012 ลบ `max` ใน DOM แล้วตั้ง 4 ก็ยังลงตะกร้าเกิน 3 ไม่ได้', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` qty = 3 (ตาม R45) · ยอดสินค้า ≤ ฿1,560 (฿520×3) · ไม่มีบรรทัด qty 4 (฿2,080)' },
    { type: 'source', description: '[D]+[R] · R45 · ความเสี่ยง: แก้หน้าเว็บนิดเดียวก็ซื้อเกินสต็อกได้ · เทคนิค: Security · Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้าสูตรลดก้อนขน รันคำสั่งลบ max ใน console', async () => {
    await openHairball(page);
    await page.evaluate(() => document.querySelector('#qty-input')?.removeAttribute('max'));
  });
  await test.step('2. fill "4" (ไม่กด Tab) แล้วกดเพิ่มลงตะกร้าทันที', async () => {
    await qtyInput(page).fill('4');
    await addToCart(page);
  });
  await test.step('3. ดู pp-cart และ /cart', async () => {});
  await check(page, 'pp-cart qty = 3 (ตาม R45)', null, async () => {
    const c = await cartOf(page);
    expect.soft(c.map((l) => l.qty)).toEqual([3]);
  }, { actual: () => cartRaw(page) });
  await page.goto('/cart');
  await page.getByTestId('cart-item').first().waitFor({ timeout: 5000 }).catch(() => {});
  await check(page, 'ยอดสินค้า ≤ ฿1,560 (฿520×3)', page.getByTestId('summary-subtotal'), async (el) => {
    expect.soft(baht(await el.textContent())).toBeLessThanOrEqual(1560);
  });
  await check(page, 'ไม่มีบรรทัด qty 4 (฿2,080)', page.getByTestId('cart-item'), async (el) => {
    await expect.soft(el.getByTestId('item-line-total').filter({ hasText: '฿2,080' })).toHaveCount(0);
    const qtys = await el.getByTestId('item-qty').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect.soft(qtys).not.toContain('4');
  });
});

test('TC-QTY-013 ใส่ 2 แล้วอีก 2 ได้รวม 3 และต้องบอกว่าใส่ได้จริงแค่ 1', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` qty 3 (ไม่ใช่ 4) · ยอดชำระ ฿1,560 (฿520×3 ส่งฟรี) · toast ข้อ 2 มีตัวเลข "1" (จำนวนที่ใส่ได้จริง) และไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ (ตอนนี้ล้ม: ขึ้น "✅ เพิ่ม…ลงตะกร้าแล้ว" ไม่บอกว่าถูกตัด)' },
    { type: 'source', description: '[D]+[R] · R45 · R46 · Q10 · ความเสี่ยง: ลูกค้าคิดว่าได้ 4 ชิ้นแต่ได้ 3 · เทคนิค: Boundary · State' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิดหน้าสูตรลดก้อนขน', async () => {
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('1. ตั้งจำนวน 2 กดเพิ่มลงตะกร้า', async () => {
    await fillQty(page, '2');
    await addToCart(page);
    await waitToastsGone(page);
  });
  await test.step('2. ตั้งจำนวน 2 อีกครั้ง กดเพิ่ม อ่าน toast', async () => {
    await fillQty(page, '2');
    await addToCart(page);
  });
  await check(page, 'toast ข้อ 2 มีตัวเลข "1" (จำนวนที่ใส่ได้จริง)', toastZone(page), async (el) => {
    await expect.soft(el).toContainText(numRe(1));
  });
  await check(page, 'toast ข้อ 2 ไม่ใช่ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ', toastZone(page), async (el) => {
    await expect.soft(el).not.toHaveText(NORMAL_OK);
  });
  await checkCart(page, 'pp-cart qty 3 (ไม่ใช่ 4)', [{ slug: hairSlug, size: '1.5 kg', qty: 3 }]);
  await test.step('3. เปิด /cart', async () => {});
  await checkCartTotals(page, null, null, '฿1,560');
});

test('TC-QTY-014 ตะกร้ามีอยู่แล้ว 5 ใส่อีก 25 ต้องถูกตัดเป็น 25 และบอกว่าใส่ได้ 20', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` 400 g qty 25 · ยอดชำระ ฿4,725 (฿189×25 ส่งฟรี) · toast ข้อ 2 มีตัวเลข "20" และไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ (ตอนนี้ล้ม: ขึ้น toast สำเร็จปกติ)' },
    { type: 'source', description: '[D]+[R] · R46 · Q10 · ความเสี่ยง: ถูกตัดจำนวนเงียบ ๆ · เทคนิค: Boundary · State' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิด /products/kitten-salmon-dry เลือก 400 g', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
  });
  await test.step('1. ตั้งจำนวน 5 กดเพิ่ม', async () => {
    await fillQty(page, '5');
    await addToCart(page);
    await waitToastsGone(page);
  });
  await test.step('2. ตั้งจำนวน 25 กดเพิ่ม อ่าน toast', async () => {
    await fillQty(page, '25');
    await addToCart(page);
  });
  await check(page, 'toast ข้อ 2 มีตัวเลข "20"', toastZone(page), async (el) => {
    await expect.soft(el).toContainText(numRe(20));
  });
  await check(page, 'toast ข้อ 2 ไม่ใช่ "✅ เพิ่ม…ลงตะกร้าแล้ว" แบบปกติ', toastZone(page), async (el) => {
    await expect.soft(el).not.toHaveText(NORMAL_OK);
  });
  await checkCart(page, 'pp-cart 400 g qty 25', [{ slug: KITTEN, size: '400 g', qty: 25 }]);
  await test.step('3. เปิด /cart', async () => {});
  await checkCartTotals(page, null, null, '฿4,725');
});

test('TC-QTY-015 ตะกร้าเต็มสต็อกแล้วกดเพิ่มอีกต้องถูกปฏิเสธ', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` qty ยังเป็น 3 · ตัวนับ 🛒 = 3 · ยอดชำระ ฿1,560 (฿520×3 ส่งฟรี) · ข้อ 2 มี toast ปรากฏและไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว"' },
    { type: 'source', description: '[D]+[R] · R47 · ความเสี่ยง: กดเพิ่มแล้วไม่รู้ว่าไม่ได้ของ · เทคนิค: Negative · Boundary' },
  ],
}, async ({ page }) => {
  await test.step('0. เปิดหน้าสูตรลดก้อนขน', async () => {
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('1. ตั้งจำนวน 3 กดเพิ่ม', async () => {
    await fillQty(page, '3');
    await addToCart(page);
    await waitToastsGone(page);
  });
  await test.step('2. ตั้งจำนวน 1 กดเพิ่มอีกครั้ง อ่าน toast', async () => {
    await fillQty(page, '1');
    await addToCart(page);
  });
  await check(page, 'ข้อ 2 มี toast ปรากฏ', page.getByTestId('toast').first(), async (el) => {
    await expect.soft(el).toBeVisible();
  });
  await check(page, 'toast ข้อ 2 ไม่ใช่ "✅ เพิ่ม…ลงตะกร้าแล้ว"', toastZone(page), async (el) => {
    await expect.soft(el).not.toHaveText(NORMAL_OK);
  });
  await checkCart(page, 'pp-cart qty ยังเป็น 3', [{ slug: hairSlug, size: '1.5 kg', qty: 3 }]);
  await checkBadge(page, 3);
  await test.step('3. เปิด /cart', async () => {});
  await checkCartTotals(page, null, null, '฿1,560');
});

test('TC-QTY-016 กด Enter ในช่องจำนวนไม่ใส่ตะกร้าเอง และไม่ทำให้นับซ้ำ', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2: URL ยังเป็น `/products/kitten-salmon-dry` (ไม่ reload) · `pp-cart=[]` · ตัวนับ 🛒 = 0 · ข้อ 3: `pp-cart` qty 3 (ไม่ใช่ 6) ยอดชำระ ฿617 (฿189×3 + ส่ง ฿50)' },
    { type: 'source', description: '[D]+[R] · R49 · ความเสี่ยง: Enter ใส่ตะกร้าซ้ำโดยไม่ตั้งใจ · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. ตั้งจำนวน 3 แล้วกด Enter ในช่อง', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '400 g').click();
    await qtyInput(page).fill('3');
    await qtyInput(page).press('Enter');
    await page.waitForLoadState('domcontentloaded');
  });
  await test.step('2. ดู URL, pp-cart, ตัวนับ 🛒', async () => {});
  await check(page, 'URL ยังเป็น /products/kitten-salmon-dry (ไม่ reload)', null, async () => {
    await expect.soft(page).toHaveURL(new RegExp(`/products/${KITTEN}$`));
  });
  await checkCart(page, 'pp-cart=[]', []);
  await checkBadge(page, 0);
  await test.step('3. กดปุ่มเพิ่มลงตะกร้า 1 ครั้ง เปิด /cart', async () => {
    await addToCart(page);
  });
  await checkCart(page, 'pp-cart qty 3 (ไม่ใช่ 6)', [{ slug: KITTEN, size: '400 g', qty: 3 }]);
  await checkCartTotals(page, null, null, '฿617');
});

test('TC-QTY-017 ดับเบิลคลิก "เพิ่มลงตะกร้า" ต้องไม่ทำให้เกินสต็อกและตัวนับตรงกับตะกร้า', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2: qty 7 (ไม่ใช่ 14) · ยอดชำระ ฿6,230 (฿890×7 ส่งฟรี) · ข้อ 4: qty 1 · ตัวนับ 🛒 = 1 · ยอดสินค้า ฿890 ค่าส่ง ฿50 ยอดชำระ ฿940 (฿890×1 + ส่ง ฿50) (ตอนนี้ล้ม: qty 2 ยอดสินค้า ฿1,780)' },
    { type: 'source', description: '[D]+[R]+[O-ยังไม่ยืนยัน] · R51 · Q50 · ความเสี่ยง: กดเร็วแล้วได้ของเกิน/ยอดเงินเกิน · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  const fountain = await test.step('0. หา slug น้ำพุแมวจาก GET /api/products', async () => {
    return (await productsApi(page)).find((p) => p.name.includes('น้ำพุแมว'))?.slug ?? 'cat-fountain';
  });
  await test.step('1. เปิดหน้าน้ำพุแมว ตั้งจำนวน 7 ดับเบิลคลิกปุ่มเพิ่ม', async () => {
    await openPdp(page, fountain);
    await fillQty(page, '7');
    await page.getByTestId('add-to-cart').dblclick();
  });
  await test.step('2. ดู pp-cart และ /cart', async () => {});
  await check(page, 'ข้อ 2: qty 7 (ไม่ใช่ 14)', null, async () => {
    expect.soft((await cartOf(page)).map((l) => `${l.slug} ×${l.qty}`)).toEqual([`${fountain} ×7`]);
  }, { actual: () => cartRaw(page) });
  await checkCartTotals(page, null, null, '฿6,230');
  await test.step('3. ตั้ง pp-cart=[] reload ตั้งจำนวน 1 ดับเบิลคลิก', async () => {
    await setCart(page, []);
    await openPdp(page, fountain);
    await reloadPdp(page, fountain);
    await fillQty(page, '1');
    await page.getByTestId('add-to-cart').dblclick();
  });
  await test.step('4. ดู pp-cart ตัวนับ 🛒 และ /cart', async () => {});
  await check(page, 'ข้อ 4: qty 1', null, async () => {
    expect.soft((await cartOf(page)).map((l) => `${l.slug} ×${l.qty}`)).toEqual([`${fountain} ×1`]);
  }, { actual: () => cartRaw(page) });
  await checkBadge(page, 1);
  await checkCartTotals(page, '฿890', '฿50', '฿940');
});

test('TC-QTY-018 สินค้าหมด: ปลด disabled ใน DOM แล้วก็ยังใส่ตะกร้าไม่ได้', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'หลังทุกขั้น `pp-cart=[]` · ตัวนับ 🛒 = 0 · `/cart` ไม่มีไก่ฟรีซดราย (ไม่มียอด ฿159)' },
    { type: 'source', description: '[D] · R52 · R37 · ความเสี่ยง: ปลดปุ่มในหน้าเว็บแล้วสั่งของที่หมดได้ · เทคนิค: Security · Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/freeze-dried-chicken-cat', async () => {
    await openPdp(page, FREEZE);
  });
  await test.step('2. ใน console ลบ disabled ออกจากปุ่มเพิ่มลงตะกร้า แล้วคลิกปุ่ม', async () => {
    await page.evaluate(() => document.querySelector('[data-testid="add-to-cart"]')?.removeAttribute('disabled'));
    await page.getByTestId('add-to-cart').click({ force: true, timeout: 5000 }).catch(() => {});
  });
  await checkCart(page, 'หลังข้อ 2 pp-cart=[]', []);
  await test.step('3. ลบ disabled จาก #qty-input พิมพ์ "1" แล้วกด Enter', async () => {
    await page.evaluate(() => document.querySelector('#qty-input')?.removeAttribute('disabled'));
    const q = qtyInput(page);
    await q.click({ force: true, timeout: 5000 }).catch(() => {});
    await q.press('ControlOrMeta+a').catch(() => {});
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
  });
  await checkCart(page, 'หลังข้อ 3 pp-cart=[]', []);
  await test.step('4. รัน .click() ที่ปุ่มจาก console', async () => {
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid="add-to-cart"]') as HTMLButtonElement | null;
      b?.removeAttribute('disabled');
      b?.click();
    });
  });
  await test.step('5. ดู pp-cart ตัวนับ 🛒 แล้วเปิด /cart', async () => {});
  await checkCart(page, 'หลังข้อ 4 pp-cart=[]', []);
  await checkBadge(page, 0);
  await page.goto('/cart');
  await check(page, '/cart ไม่มีไก่ฟรีซดราย (ไม่มียอด ฿159)', page.locator('main'), async (el) => {
    await expect.soft(el.getByTestId('cart-item').filter({ hasText: 'ไก่ฟรีซดราย' })).toHaveCount(0);
    await expect.soft(el).not.toContainText('฿159');
  });
});

test('TC-QTY-019 สินค้าหมด: ใส่ตะกร้าไม่ได้จากการ์ด "สินค้าที่คุณเพิ่งดู"', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart=[]` และตัวนับ 🛒 = 0' },
    { type: 'source', description: '[D] · R52 · (การ์ดหน้ารวมดู TC-CARD-002 · wishlist ดู TC-WISH-006) · ความเสี่ยง: มีทางลัดใส่ของหมดลงตะกร้า · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/freeze-dried-chicken-cat แล้วกลับ / หาการ์ดไก่ฟรีซดรายในกล่อง "สินค้าที่คุณเพิ่งดู"', async () => {
    await openPdp(page, FREEZE);
    await page.goto('/');
  });
  const card = page.getByTestId('recently-viewed').locator(`[data-testid="product-card"][data-slug="${FREEZE}"]`);
  await test.step('1. กดปุ่มบนการ์ด (click({ force: true }))', async () => {
    await card.getByTestId('quick-add').click({ force: true, timeout: 10_000 });
  });
  await test.step('2. ดู pp-cart และตัวนับ 🛒', async () => {});
  await checkCart(page, 'pp-cart=[]', []);
  await checkBadge(page, 0);
});

test('TC-QTY-020 ใส่ตะกร้าไม่จองสต็อกกลาง', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2 = "มีสินค้า 25 ชิ้น" · ข้อ 3 สต็อก = 25 · ข้อ 4 B ได้ qty 25 ยอดชำระ ฿4,725 (฿189×25 ส่งฟรี) · A ยังเป็น qty 5 ยอดชำระ ฿995 (฿189×5 + ส่ง ฿50)' },
    { type: 'source', description: '[D]+[R]+[O-ยังไม่ยืนยัน] · R40 · Q13 · ความเสี่ยง: ตะกร้าคนหนึ่งกันคนอื่นซื้อ · เทคนิค: State' },
  ],
}, async ({ page, browser }) => {
  const pageB = await newUser(browser);
  try {
    await test.step('1. context A ใส่ 400 g ×5', async () => {
      await openPdp(page, KITTEN);
      await sizeBtn(page, '400 g').click();
      await fillQty(page, '5');
      await addToCart(page);
    });
    await test.step('2. context B เปิด /products/kitten-salmon-dry อ่านข้อความสต็อก', async () => {
      await openPdp(pageB, KITTEN);
    });
    await checkStock(pageB, 'ข้อ 2 (B) = "มีสินค้า 25 ชิ้น"', 'มีสินค้า 25 ชิ้น');
    const stock = await test.step('3. GET /api/products ดูสต็อก kitten-salmon-dry', async () => {
      return (await productsApi(page)).find((p) => p.slug === KITTEN)?.stock;
    });
    await check(page, 'ข้อ 3 สต็อก = 25', null, async () => {
      expect.soft(stock).toBe(25);
    }, { actual: async () => ({ slug: KITTEN, stock }) });
    await test.step('4. context B ใส่ 400 g ×25 เปิด /cart', async () => {
      await sizeBtn(pageB, '400 g').click();
      await fillQty(pageB, '25');
      await addToCart(pageB);
    });
    await checkCart(pageB, 'B ได้ qty 25', [{ slug: KITTEN, size: '400 g', qty: 25 }]);
    await checkCartTotals(pageB, null, null, '฿4,725');
    await checkCart(page, 'A ยังเป็น qty 5', [{ slug: KITTEN, size: '400 g', qty: 5 }]);
    await checkCartTotals(page, null, null, '฿995');
  } finally {
    await pageB.context().close();
  }
});

test('TC-QTY-021 หน้าที่เปิดค้างไว้ตอนสต็อก 25 ใส่เกินสต็อกปัจจุบัน (22) ไม่ได้', {
  tag: ['@P1', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 2 ยอดชำระ ฿617 · ที่ `/cart` ของ A: qty ไม่เกิน 22 (ยอดสินค้าไม่เกิน ฿4,158 = ฿189×22) หรือมีข้อความเตือนเกินสต็อกและปุ่ม "ดำเนินการชำระเงิน →" `disabled` จนกว่าจะแก้ · ถ้าตัดตอนใส่ toast ต้องมีตัวเลข "22" (ตอนนี้ล้ม: `/cart` แสดง 25 ชิ้น ฿4,725 "ส่งฟรี" ไม่มีคำเตือน) · (การยืนยันคำสั่งจากหน้าที่ค้างไว้ ตรวจที่ TC-ORD-006)' },
    { type: 'source', description: '[D]+[R]+[O-ยังไม่ยืนยัน] · R54 · R53 · Q9 · Q10 · ความเสี่ยง: ลูกค้าเห็นยอดที่ซื้อไม่ได้จริง · เทคนิค: State · Boundary' },
  ],
}, async ({ page, browser }) => {
  const pageB = await newUser(browser);
  try {
    await test.step('1. A เปิด /products/kitten-salmon-dry (เห็น "มีสินค้า 25 ชิ้น") ไม่ reload', async () => {
      await openPdp(page, KITTEN);
    });
    await checkStock(page, 'A เห็น "มีสินค้า 25 ชิ้น"', 'มีสินค้า 25 ชิ้น');
    await test.step('2. B ล็อกอิน demo ใส่ 400 g ×3 แล้วสั่งซื้อด้วย demo', async () => {
      await loginDemo(pageB);
      await openPdp(pageB, KITTEN);
      await sizeBtn(pageB, '400 g').click();
      await fillQty(pageB, '3');
      await addToCart(pageB);
      await checkoutDemo(pageB);
    });
    await checkOrder(pageB, '฿617');
    await test.step('3. A ตั้งจำนวน 25 กดเพิ่ม อ่าน toast', async () => {
      await page.bringToFront();
      await sizeBtn(page, '400 g').click();
      await fillQty(page, '25');
      await addToCart(page);
      await page.getByTestId('toast').first().waitFor({ timeout: 5000 }).catch(() => {});
    });
    const toastText = ((await toastZone(page).textContent({ timeout: 1000 }).catch(() => '')) ?? '').trim();
    const addedQty = (await cartOf(page)).find((l) => l.slug === KITTEN)?.qty ?? 0;
    await check(page, 'ถ้าตัดตอนใส่ (qty ใน pp-cart < 25) toast ต้องมีตัวเลข "22"', toastZone(page), async () => {
      if (addedQty < 25) expect.soft(toastText, `ตัดเหลือ ${addedQty} แต่ toast: ${toastText}`).toMatch(numRe(22));
    }, { actual: async () => `pp-cart qty ${addedQty} · toast: ${toastText}` });
    await test.step('4. A เปิด /cart ดูจำนวน ข้อความเตือน และปุ่ม "ดำเนินการชำระเงิน →"', async () => {
      await page.goto('/cart');
      await page.getByTestId('cart-item').first().waitFor({ timeout: 5000 }).catch(() => {});
    });
    const sub = baht(await page.getByTestId('summary-subtotal').textContent().catch(() => ''));
    const qty = Number(await page.getByTestId('item-qty').first().inputValue().catch(() => '0'));
    const warn = await page.locator('main').getByText(/สต็อก|เกิน|เหลือ\s*\d+|ไม่พอ/).count();
    const disabled = await page.getByTestId('checkout-button').isDisabled().catch(() => false);
    await check(
      page,
      'qty ไม่เกิน 22 (ยอดสินค้าไม่เกิน ฿4,158) หรือมีข้อความเตือนเกินสต็อกและปุ่ม "ดำเนินการชำระเงิน →" disabled',
      page.getByTestId('cart-item').or(page.getByTestId('checkout-button')),
      async () => {
        const ok = (qty <= 22 && sub <= 4158) || (warn > 0 && disabled);
        expect.soft(ok, `qty ${qty} ยอดสินค้า ฿${sub} · ข้อความเตือน ${warn} จุด · ปุ่ม disabled=${disabled}`).toBe(true);
      },
      { actual: async () => ({ qty, subtotal: sub, warnings: warn, checkoutDisabled: disabled }) },
    );
  } finally {
    await pageB.context().close();
  }
});

// ───────────── F09 ชุด "มักซื้อคู่กัน" (P2) ─────────────

test('TC-BNDL-001 ราคาป้ายชุด = ผลรวมราคาขนาดเล็กสุดของทุกชิ้น (รวมสินค้าหลัก)', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ลูกแมวแซลมอน: ชุดมี 3 ชิ้น ป้าย "฿297" (฿189 + ฿39 + ฿69 = ฿297) · สูตรลดก้อนขน: ป้าย "2 รายการ" "฿589" (฿520 + ฿69 = ฿589)' },
    { type: 'source', description: '[R] · R55 · ความเสี่ยง: ป้ายชุดไม่ตรงกับเงินที่ต้องจ่าย · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry อ่านรายการและราคาบนปุ่มชุด', async () => {
    await openPdp(page, KITTEN);
  });
  await check(page, 'ลูกแมวแซลมอน: ชุดมี 3 ชิ้น ป้าย "฿297"', bundleBox(page), async (el) => {
    await expect.soft(el).toContainText(/(^|[^\d])3 รายการ/);
    await expect.soft(el).toContainText('฿297');
  });
  await test.step('2. เปิดหน้าสูตรลดก้อนขน อ่านรายการและราคาบนปุ่มชุด', async () => {
    await openHairball(page);
  });
  await check(page, 'สูตรลดก้อนขน: ป้าย "2 รายการ" "฿589"', bundleBox(page), async (el) => {
    await expect.soft(el).toContainText(/(^|[^\d])2 รายการ/);
    await expect.soft(el).toContainText('฿589');
  });
});

test('TC-BNDL-002 "เพิ่มทั้งชุด" ใส่ขนาดเล็กสุดชิ้นละ 1 ไม่สนขนาด/จำนวนที่เลือกด้านบน', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: '`pp-cart` มี 3 บรรทัด: `kitten-salmon-dry` "400 g" ×1 · `kitten-chicken-mousse` "85 g" ×1 · `lickable-salmon-treat` "4 ซอง" ×1 · ไม่มีบรรทัด 1.5 kg · ตัวนับ 🛒 = 3 · ยอดสินค้า ฿297 = ป้ายชุด · ค่าส่ง ฿50 · ยอดชำระ ฿347 (฿189 + ฿39 + ฿69 + ส่ง ฿50)' },
    { type: 'source', description: '[D]+[R] · R56 · ความเสี่ยง: ชุดใส่ขนาด/จำนวนผิดจากป้าย · เทคนิค: Happy path · State' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า เลือก 1.5 kg ตั้งจำนวน 5 (ไม่กดเพิ่มลงตะกร้า)', async () => {
    await openPdp(page, KITTEN);
    await sizeBtn(page, '1.5 kg').click();
    await fillQty(page, '5');
  });
  const label = ((await bundleBox(page).locator('strong').first().textContent()) ?? '').trim();
  await test.step('2. กด "เพิ่มทั้งชุดลงตะกร้า"', async () => {
    await page.getByTestId('add-bundle').click();
  });
  await test.step('3. ดู pp-cart และ /cart', async () => {});
  await check(page, 'pp-cart 3 บรรทัด: kitten-salmon-dry "400 g" ×1 · kitten-chicken-mousse "85 g" ×1 · lickable-salmon-treat "4 ซอง" ×1 (ไม่มี 1.5 kg)', null, async () => {
    const c = await cartOf(page);
    const find = (slug: string) => c.find((l) => l.slug === slug);
    expect.soft(c.length).toBe(3);
    expect.soft(find(KITTEN)).toMatchObject({ size: '400 g', qty: 1 });
    expect.soft(find('kitten-chicken-mousse')?.size ?? '(ไม่มีบรรทัดมูสไก่)').toContain('85 g');
    expect.soft(find('kitten-chicken-mousse')?.qty).toBe(1);
    expect.soft(find('lickable-salmon-treat')).toMatchObject({ size: '4 ซอง', qty: 1 });
    expect.soft(c.filter((l) => l.size === '1.5 kg')).toEqual([]);
  }, { actual: () => cartRaw(page) });
  await checkBadge(page, 3);
  await checkCartTotals(page, '฿297', '฿50', '฿347');
  await check(page, `ยอดสินค้า = ป้ายชุด (${label})`, page.getByTestId('summary-subtotal'), async (el) => {
    await expect.soft(el).toHaveText(label || '(ไม่พบป้ายชุด)');
  });
});

test('TC-BNDL-003 ชุดของสินค้าที่หมด (ไก่ฟรีซดราย) ไม่ใส่ชิ้นที่หมด และบอกว่าเพิ่มกี่รายการ', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ป้ายชุด "1 รายการ" "฿359" · `pp-cart` มีบรรทัดเดียว `adult-chicken-dry` "1.2 kg" ×1 ไม่มี `freeze-dried-chicken-cat` · ยอดชำระ ฿409 (฿359 + ส่ง ฿50) · มีข้อความ (toast) ที่มีตัวเลข "1" บอกจำนวนรายการที่เพิ่ม (ตอนนี้ล้ม: ไม่มี toast)' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R57 · Q15 · ความเสี่ยง: ชุดพาของหมดลงตะกร้า หรือลูกค้าไม่รู้ว่าได้ไม่ครบ · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/freeze-dried-chicken-cat อ่านป้ายชุด', async () => {
    await openPdp(page, FREEZE);
  });
  await check(page, 'ป้ายชุด "1 รายการ" "฿359"', bundleBox(page), async (el) => {
    await expect.soft(el).toContainText(/(^|[^\d])1 รายการ/);
    await expect.soft(el).toContainText('฿359');
  });
  await test.step('2. กด "เพิ่มทั้งชุดลงตะกร้า" อ่านข้อความที่ขึ้น', async () => {
    await page.getByTestId('add-bundle').click();
  });
  await check(page, 'มีข้อความ (toast) ที่มีตัวเลข "1" บอกจำนวนรายการที่เพิ่ม', page.getByTestId('toast').first(), async (el) => {
    await expect.soft(el).toBeVisible();
    await expect.soft(toastZone(page)).toContainText(numRe(1));
  });
  await test.step('3. ดู pp-cart และ /cart', async () => {});
  await checkCart(page, 'pp-cart มีบรรทัดเดียว adult-chicken-dry "1.2 kg" ×1 ไม่มี freeze-dried-chicken-cat', [
    { slug: 'adult-chicken-dry', size: '1.2 kg', qty: 1 },
  ]);
  await checkCartTotals(page, null, null, '฿409');
});

test('TC-BNDL-004 ชุดของสินค้าที่เพิ่งหมด (สูตรลดก้อนขน 3 → 0) ป้ายต้องตัดชิ้นที่หมดออก', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ข้อ 1 ยอดชำระ ฿1,560 · ป้ายชุด "1 รายการ" "฿69" (ไม่ใช่ ฿589) · `pp-cart` มีบรรทัดเดียว `lickable-salmon-treat` "4 ซอง" ×1 ไม่มีสูตรลดก้อนขน · ยอดชำระ ฿119 (฿69 + ส่ง ฿50) · มีข้อความที่มีตัวเลข "1" บอกจำนวนรายการที่เพิ่ม' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R57 · Q15 · ความเสี่ยง: ป้ายชุดรวมราคาของที่ซื้อไม่ได้ · เทคนิค: State · Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. ล็อกอิน demo ใส่สูตรลดก้อนขน ×3 แล้วสั่งซื้อด้วย demo', async () => {
    await loginDemo(page);
    await openHairball(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('1. ตั้งจำนวน 3 เพิ่มลงตะกร้า แล้วสั่งซื้อ', async () => {
    await fillQty(page, '3');
    await addToCart(page);
    await checkoutDemo(page);
  });
  await checkOrder(page, '฿1,560');
  await test.step('2. ตั้ง pp-cart=[] เปิดหน้าสูตรลดก้อนขนใหม่ อ่านป้ายชุด', async () => {
    await setCart(page, []);
    await openPdp(page, hairSlug);
  });
  await check(page, 'ป้ายชุด "1 รายการ" "฿69" (ไม่ใช่ ฿589)', bundleBox(page), async (el) => {
    await expect.soft(el).toContainText(/(^|[^\d])1 รายการ/);
    await expect.soft(el.locator('strong').first()).toHaveText('฿69');
  });
  await test.step('3. กด "เพิ่มทั้งชุดลงตะกร้า" อ่านข้อความ', async () => {
    await page.getByTestId('add-bundle').click();
  });
  await check(page, 'มีข้อความที่มีตัวเลข "1" บอกจำนวนรายการที่เพิ่ม', page.getByTestId('toast').first(), async (el) => {
    await expect.soft(el).toBeVisible();
    await expect.soft(toastZone(page)).toContainText(numRe(1));
  });
  await test.step('4. ดู pp-cart และ /cart', async () => {});
  await checkCart(page, 'pp-cart มีบรรทัดเดียว lickable-salmon-treat "4 ซอง" ×1 ไม่มีสูตรลดก้อนขน', [
    { slug: 'lickable-salmon-treat', size: '4 ซอง', qty: 1 },
  ]);
  await checkCartTotals(page, null, null, '฿119');
});

test('TC-BNDL-005 หัวข้อ "คุ้มกว่า" ต้องมีส่วนลดจริง', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ผ่านเมื่อ (ยอดชุดใน `/cart` < ฿297) หรือ (หัวข้อกล่องไม่มีคำว่า "คุ้มกว่า") (ตอนนี้ล้ม: ราคาชุด ฿297 = ผลรวมพอดี แต่หัวข้อ "🎁 ซื้อคู่กันคุ้มกว่า")' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R58 · Q14 · ความเสี่ยง: โฆษณาว่าคุ้มแต่จ่ายราคาเต็ม · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /products/kitten-salmon-dry อ่านหัวข้อกล่องชุดและราคาชุด', async () => {
    await openPdp(page, KITTEN);
  });
  const head = page.getByTestId('bought-together').locator('h2').first().locator('..');
  const headAll = ((await head.textContent()) ?? '').trim();
  await check(page, 'หัวข้อกล่องชุดและราคาชุด', head.or(bundleBox(page)), async () => {}, {
    actual: async () => `หัวข้อ: ${headAll} · ป้าย: ${(await bundleBox(page).textContent())?.trim()}`,
  });
  await test.step('2. กดเพิ่มทั้งชุด เปิด /cart อ่านยอดสินค้า', async () => {
    await page.getByTestId('add-bundle').click();
    await page.goto('/cart');
    await page.getByTestId('cart-item').first().waitFor({ timeout: 5000 }).catch(() => {});
  });
  const sub = baht(await page.getByTestId('summary-subtotal').textContent());
  await test.step('3. เทียบกับผลรวมรายชิ้น ฿297', async () => {});
  await check(page, 'ผ่านเมื่อ (ยอดชุดใน /cart < ฿297) หรือ (หัวข้อกล่องไม่มีคำว่า "คุ้มกว่า")', page.getByTestId('summary-subtotal'), async () => {
    expect.soft(sub < 297 || !headAll.includes('คุ้มกว่า'), `ยอดชุด ฿${sub} · หัวข้อ "${headAll}"`).toBe(true);
  }, { actual: async () => ({ subtotal: sub, heading: headAll }) });
});

test('TC-BNDL-006 ไม่มีชุดของสินค้าใดพาไก่ฟรีซดราย (ของหมด) ลงตะกร้า', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ทั้ง 28 หน้า `pp-cart` ไม่มี slug `freeze-dried-chicken-cat` · ไม่มีชุดไหนแสดงไก่ฟรีซดรายเป็นชิ้นที่จะถูกเพิ่ม · ยอดสินค้าใน `/cart` ของแต่ละหน้า = ราคาบนป้ายชุดของหน้านั้น' },
    { type: 'source', description: '[D]+[R] · R59 · R55 · ความเสี่ยง: ของหมดหลุดเข้าตะกร้าผ่านชุดของสินค้าอื่น · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  test.setTimeout(300_000);
  const slugs = await test.step('1. ดึงรายการ slug 28 ชิ้น (GET /api/products)', async () => {
    return (await productsApi(page)).map((p) => p.slug);
  });
  await check(page, 'ได้ slug 28 ชิ้น', null, async () => {
    expect.soft(slugs.length).toBe(28);
  }, { actual: async () => slugs });
  type Row = { slug: string; bundleItems: string[]; label: string; cart: Line[]; subtotal: string };
  const rows: Row[] = [];
  for (const slug of slugs) {
    await test.step(`2–3. /products/${slug}: ตั้ง pp-cart=[] กด "เพิ่มทั้งชุดลงตะกร้า" แล้วเปิด /cart`, async () => {
      if (page.url().startsWith(baseURL())) await setCart(page, []);
      await openPdp(page, slug);
      const bundleItems = await page
        .getByTestId('bought-together')
        .getByTestId('product-card')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug ?? ''));
      const hasBtn = (await page.getByTestId('add-bundle').count()) > 0;
      const label = hasBtn ? ((await bundleBox(page).locator('strong').first().textContent()) ?? '').trim() : '(ไม่มีชุด)';
      if (hasBtn) {
        await page.getByTestId('add-bundle').click();
        await page.waitForFunction(() => (localStorage.getItem('pp-cart') ?? '[]') !== '[]', null, { timeout: 3000 }).catch(() => {});
      }
      const cart = await cartOf(page);
      let subtotal = '(ตะกร้าว่าง)';
      if (cart.length) {
        await page.goto('/cart');
        await page.getByTestId('cart-item').first().waitFor({ timeout: 5000 }).catch(() => {});
        subtotal = ((await page.getByTestId('summary-subtotal').textContent().catch(() => '')) ?? '').trim();
      }
      rows.push({ slug, bundleItems, label, cart, subtotal });
    });
  }
  const table = () => Promise.resolve(rows.map((r) => `${r.slug} | ชุด: ${r.bundleItems.join(',')} | ป้าย ${r.label} | /cart ${r.subtotal} | pp-cart ${JSON.stringify(r.cart)}`).join('\n'));
  await check(page, `ทั้ง ${slugs.length} หน้า pp-cart ไม่มี slug freeze-dried-chicken-cat`, null, async () => {
    for (const r of rows) expect.soft(r.cart.map((l) => l.slug), `หน้า ${r.slug}`).not.toContain(FREEZE);
  }, { actual: table });
  await check(page, 'ไม่มีชุดไหนแสดงไก่ฟรีซดรายเป็นชิ้นที่จะถูกเพิ่ม', null, async () => {
    for (const r of rows) expect.soft(r.bundleItems, `หน้า ${r.slug}`).not.toContain(FREEZE);
  }, { actual: table });
  await check(page, 'ยอดสินค้าใน /cart ของแต่ละหน้า = ราคาบนป้ายชุดของหน้านั้น', null, async () => {
    for (const r of rows) expect.soft(r.subtotal, `หน้า ${r.slug}`).toBe(r.label);
  }, { actual: table });
});

test('TC-BNDL-007 กดชุดตอนตะกร้ามีสินค้าหลักเต็มสต็อกแล้ว ต้องไม่เกินสต็อก', {
  tag: ['@P2', '@5.2'],
  annotation: [
    { type: 'expected', description: 'สูตรลดก้อนขนใน `pp-cart` ยังเป็น qty 3 (ไม่ใช่ 4) · `lickable-salmon-treat` "4 ซอง" ×1 · ยอดสินค้า ฿1,629 (฿520×3 + ฿69) ค่าส่ง ฿0 ยอดชำระ ฿1,629 · ข้อความข้อ 2 มีตัวเลข "1" (เพิ่มได้ 1 จาก 2 รายการ) และบอกว่าสูตรลดก้อนขนไม่ได้เพิ่มเพราะสต็อกไม่พอ (ถ้าขึ้นแค่ "✅ เพิ่มชุดสินค้า 1 รายการลงตะกร้าแล้ว 🎁" โดยไม่บอกชิ้นที่ถูกข้าม = ล้ม)' },
    { type: 'source', description: '[D]+[R]+[O-ยังไม่ยืนยัน] · R45 · R57 · Q10 · Q15 · Q51 · ความเสี่ยง: ชุดเป็นทางลัดใส่เกินสต็อก · เทคนิค: Boundary · State' },
  ],
}, async ({ page }) => {
  await test.step('1. หน้าสูตรลดก้อนขน ตั้งจำนวน 3 กดเพิ่มลงตะกร้า', async () => {
    await openHairball(page);
    await fillQty(page, '3');
    await addToCart(page);
    await waitToastsGone(page);
  });
  const hairSlug = new URL(page.url()).pathname.split('/').pop() ?? '';
  await test.step('2. กด "เพิ่มทั้งชุดลงตะกร้า" อ่านข้อความ', async () => {
    await page.getByTestId('add-bundle').click();
  });
  await check(page, 'ข้อความข้อ 2 มีตัวเลข "1" (เพิ่มได้ 1 จาก 2 รายการ)', page.getByTestId('toast').first(), async (el) => {
    await expect.soft(el).toBeVisible();
    await expect.soft(toastZone(page)).toContainText(numRe(1));
  });
  await check(page, 'ข้อความข้อ 2 บอกว่าสูตรลดก้อนขนไม่ได้เพิ่มเพราะสต็อกไม่พอ', toastZone(page), async (el) => {
    await expect.soft(el).toContainText(HAIRBALL_NAME);
    await expect.soft(el).toContainText(/สต็อก|ไม่พอ|หมด/);
  });
  await test.step('3. ดู pp-cart และ /cart', async () => {});
  await checkCart(page, 'สูตรลดก้อนขนยังเป็น qty 3 (ไม่ใช่ 4) · lickable-salmon-treat "4 ซอง" ×1', [
    { slug: hairSlug, size: '1.5 kg', qty: 3 },
    { slug: 'lickable-salmon-treat', size: '4 ซอง', qty: 1 },
  ]);
  await checkCartTotals(page, '฿1,629', SHIP0, '฿1,629');
});

// ───────────── F10 สินค้าที่คล้ายกัน + breadcrumb (P3) ─────────────

test('TC-REL-001 "สินค้าที่คล้ายกัน" ไม่เกิน 4 ชิ้น ไม่รวมตัวเอง และลิงก์/ราคาตรงหน้าปลายทาง', {
  tag: ['@P3', '@5.2'],
  annotation: [
    { type: 'expected', description: 'จำนวนการ์ด 1–4 · ไม่มีการ์ดที่ href = `/products/kitten-salmon-dry` · ทุกการ์ดเปิดได้ HTTP 200 · ราคาบนการ์ด = ราคาขนาดเล็กสุดบนหน้าปลายทาง' },
    { type: 'source', description: '[R] · R60 · ความเสี่ยง: แนะนำตัวเองหรือราคาการ์ดไม่ตรง · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า นับการ์ดในกล่อง "สินค้าที่คล้ายกัน" และอ่าน href ทุกการ์ด', async () => {
    await openPdp(page, KITTEN);
  });
  const cards = page.getByTestId('similar-products').getByTestId('product-card');
  const hrefs = await cards.evaluateAll((els) => els.map((e) => e.querySelector('[data-testid="product-name"]')?.getAttribute('href') ?? ''));
  const prices = await cards.evaluateAll((els) =>
    els.map((e) => [...e.querySelectorAll('strong')].map((s) => s.textContent ?? '').find((t) => /^฿[\d,]+$/.test(t.trim())) ?? ''),
  );
  await check(page, 'จำนวนการ์ด 1–4', cards, async (el) => {
    const n = await el.count();
    expect.soft(n).toBeGreaterThanOrEqual(1);
    expect.soft(n).toBeLessThanOrEqual(4);
  }, { actual: async () => hrefs });
  await check(page, 'ไม่มีการ์ดที่ href = /products/kitten-salmon-dry', cards, async () => {
    expect.soft(hrefs).not.toContain(`/products/${KITTEN}`);
  }, { actual: async () => hrefs });
  for (const [i, href] of hrefs.entries()) {
    await test.step(`2. คลิกการ์ดใบที่ ${i + 1} (${href}) ดู HTTP status และราคาขนาดเล็กสุดบนหน้าปลายทาง`, async () => {
      if (i > 0) await openPdp(page, KITTEN);
      await cards.nth(i).getByTestId('product-name').click();
      await page.waitForURL((u) => u.pathname === href);
      await waitHydrated(page, href.split('/').pop() ?? '');
    });
    const status = (await page.request.get(href)).status();
    await check(page, `${href} เปิดได้ HTTP 200`, null, async () => {
      expect.soft(status).toBe(200);
    }, { actual: async () => status });
    const minPrice = await page.getByTestId('size-option').evaluateAll((els) => {
      const ps = els.map((e) => Number((e.textContent ?? '').split('฿').pop()?.replace(/[^\d]/g, '') ?? 'NaN')).filter((n) => !Number.isNaN(n));
      return ps.length ? Math.min(...ps) : null;
    });
    await check(page, `ราคาบนการ์ด (${prices[i]}) = ราคาขนาดเล็กสุดบนหน้าปลายทาง`, page.getByTestId('size-option'), async () => {
      expect.soft(minPrice).toBe(baht(prices[i]));
    }, { actual: async () => `การ์ด ${prices[i]} · หน้าปลายทางต่ำสุด ฿${minPrice}` });
  }
});

test('TC-REL-002 "สินค้าที่คล้ายกัน" ไม่แนะนำของหมด', {
  tag: ['@P3', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ไม่มีการ์ดลิงก์ไป `/products/freeze-dried-chicken-cat` และไม่มีการ์ดที่มีป้าย "หมด" (เมื่อไม่เหลือการ์ด ต้องไม่มีหัวข้อ "สินค้าที่คล้ายกัน" บนหน้า) (ตอนนี้ล้ม: มีแค่ "ไก่ฟรีซดราย (หมด)")' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R60 · Q17 · ความเสี่ยง: พาลูกค้าไปของที่ซื้อไม่ได้ · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า /products/lickable-salmon-treat อ่านการ์ดทุกใบในกล่อง "สินค้าที่คล้ายกัน"', async () => {
    await openPdp(page, 'lickable-salmon-treat');
  });
  const sim = page.getByTestId('similar-products');
  const cards = sim.getByTestId('product-card');
  const summary = async () => cards.evaluateAll((els) => els.map((e) => `${(e as HTMLElement).dataset.slug} | ${e.textContent?.slice(0, 60)}`));
  await check(page, 'ไม่มีการ์ดลิงก์ไป /products/freeze-dried-chicken-cat', cards, async () => {
    await expect.soft(sim.locator(`a[href="/products/${FREEZE}"]`)).toHaveCount(0);
  }, { actual: summary });
  await check(page, 'ไม่มีการ์ดที่มีป้าย "หมด"', cards, async () => {
    await expect.soft(cards.getByTestId('stock-badge').filter({ hasText: 'หมด' })).toHaveCount(0);
  }, { actual: summary });
  const n = await cards.count();
  await check(page, 'เมื่อไม่เหลือการ์ด ต้องไม่มีหัวข้อ "สินค้าที่คล้ายกัน" บนหน้า', page.getByRole('heading', { name: 'สินค้าที่คล้ายกัน' }), async (el) => {
    if (n === 0) await expect.soft(el).toHaveCount(0);
  }, { actual: async () => `การ์ด ${n} ใบ · หัวข้อ ${await page.getByRole('heading', { name: 'สินค้าที่คล้ายกัน' }).count()} จุด` });
});

test('TC-REL-003 breadcrumb ของอาหารแมวพากลับหมวดถูก และหน้าปัจจุบันมี `aria-current`', {
  tag: ['@P3', '@5.2'],
  annotation: [
    { type: 'expected', description: 'ชิ้นสุดท้ายของ breadcrumb (ชื่อสินค้า) มี `aria-current="page"` และไม่ใช่ลิงก์ที่ชี้หน้าเดิม · คลิกหมวดแล้ว URL = `/products?pet=cat` · ข้อความ breadcrumb หมวดตรงกับ H1 ปลายทาง ("อาหารแมว")' },
    { type: 'source', description: '[R] · R61 · ความเสี่ยง: breadcrumb พากลับผิดหมวด · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้า อ่าน breadcrumb ทุกชิ้น และ attribute ของชิ้นสุดท้าย', async () => {
    await openPdp(page, KITTEN);
  });
  const bc = page.getByRole('navigation', { name: 'breadcrumb' });
  const last = bc.locator(':scope > :not([aria-hidden="true"])').last();
  await check(page, 'ชิ้นสุดท้าย (ชื่อสินค้า) มี aria-current="page" และไม่ใช่ลิงก์ที่ชี้หน้าเดิม', last, async (el) => {
    await expect.soft(el).toHaveAttribute('aria-current', 'page');
    await expect.soft(el).toHaveText('ลูกแมว สูตรแซลมอน');
    const selfLink = await el.evaluate((e) => {
      const a = e.closest('a') ?? e.querySelector('a') ?? (e.tagName === 'A' ? e : null);
      return !!a && new URL((a as HTMLAnchorElement).href).pathname === location.pathname;
    });
    expect.soft(selfLink, 'ชิ้นสุดท้ายเป็นลิงก์ชี้หน้าเดิม').toBe(false);
  }, { actual: () => bc.evaluate((e) => e.outerHTML) });
  const catLink = bc.getByRole('link').last();
  const catText = ((await catLink.textContent()) ?? '').trim();
  await test.step(`2. คลิก breadcrumb หมวด ("${catText}") ดู URL และ H1 ปลายทาง`, async () => {
    await catLink.click();
    await page.waitForURL(/\/products\?/);
  });
  await check(page, 'คลิกหมวดแล้ว URL = /products?pet=cat', null, async () => {
    await expect.soft(page).toHaveURL(/\/products\?pet=cat$/);
  });
  await check(page, `ข้อความ breadcrumb หมวด ("${catText}") ตรงกับ H1 ปลายทาง ("อาหารแมว")`, page.locator('h1').first(), async (el) => {
    expect.soft(catText).toBe('อาหารแมว');
    await expect.soft(el).toHaveText(catText);
  });
});

test('TC-REL-004 breadcrumb ของของเล่นแมว พากลับหมวดของเล่นแมวถูก', {
  tag: ['@P3', '@5.2'],
  annotation: [
    { type: 'expected', description: 'URL ปลายทาง = `/products?pet=cat&type=toy` · การ์ดทุกใบในหน้าปลายทางเป็นของเล่นแมว · (H1 ของหน้าปลายทาง ตรวจที่ TC-FLT-015)' },
    { type: 'source', description: '[R] · R61 · ความเสี่ยง: ป้ายนำทางกับหน้าที่ไปถึงไม่ตรงกัน · เทคนิค: Happy path · Equivalence partition' },
  ],
}, async ({ page }) => {
  const catToys = await test.step('0. หารายการของเล่นแมวจาก GET /api/products', async () => {
    return (await productsApi(page)).filter((p) => p.pet === 'cat' && p.type === 'toy').map((p) => p.slug);
  });
  await test.step('1. เปิด /products?pet=cat&type=toy คลิกการ์ดไม้ตกแมว', async () => {
    await page.goto('/products?pet=cat&type=toy');
    await page.getByTestId('product-name').filter({ hasText: 'ไม้ตกแมว' }).first().click();
    await page.waitForURL(/\/products\/[^/?]+$/);
    await waitHydrated(page, new URL(page.url()).pathname.split('/').pop() ?? '');
  });
  const bc = page.getByRole('navigation', { name: 'breadcrumb' });
  const catLink = bc.getByRole('link').last();
  await test.step('2. อ่านข้อความ breadcrumb หมวด', async () => {});
  await check(page, 'ข้อความ breadcrumb หมวด', catLink, async () => {});
  await test.step('3. คลิก breadcrumb หมวด ดู URL และการ์ดในหน้าปลายทาง', async () => {
    await catLink.click();
    await page.waitForURL(/\/products\?/);
    await page.getByTestId('product-card').first().waitFor({ timeout: 5000 }).catch(() => {});
  });
  await check(page, 'URL ปลายทาง = /products?pet=cat&type=toy', null, async () => {
    await expect.soft(page).toHaveURL(/\/products\?pet=cat&type=toy$/);
  });
  const shownSlugs = await page.getByTestId('product-card').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug ?? ''));
  await check(page, 'การ์ดทุกใบในหน้าปลายทางเป็นของเล่นแมว', page.getByTestId('product-card'), async () => {
    expect.soft(shownSlugs.length).toBeGreaterThan(0);
    for (const s of shownSlugs) expect.soft(catToys, `การ์ด ${s} ไม่ใช่ของเล่นแมว`).toContain(s);
  }, { actual: async () => ({ shown: shownSlugs, catToys }) });
});
