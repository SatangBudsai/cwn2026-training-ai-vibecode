/**
 * หัวข้อ 5.7 ตัวช่วยเลือกอาหาร คำแนะนำ และรายการโปรด (TEST-PLAN.md) — 42 test case
 *   FND = ตัวช่วยเลือกอาหาร (/finder) · REC = แนะนำสำหรับคุณ / สินค้าที่คุณเพิ่งดู · WISH = รายการโปรด ♥
 *
 * หมายเหตุจากการสำรวจ (playwright-cli):
 * - Finder: ปุ่ม finder-pet-cat|dog → finder-next → finder-life-baby|adult|senior → finder-next →
 *   finder-no-chicken / finder-grainfree (checkbox) + finder-type (select any|dry|wet|treat) → finder-submit
 *   หน้าผล = finder-result[data-slug] (มี match-score "ตรงใจ N%", ป้าย .best-badge "🏆 ตรงใจที่สุด", ปุ่ม finder-add)
 *   + finder-back / finder-restart · URL เป็น /finder ตลอด
 * - การ์ดสินค้าทุกที่ = product-card[data-slug] · ♥ = wishlist-toggle (aria-pressed) · ตัวนับหัวเว็บ wishlist-count / cart-count
 * - /wishlist: wishlist-item[data-slug] · move-to-cart (ของหมดเป็นปุ่ม "สินค้าหมด" disabled) · wishlist-remove · empty-wishlist
 * - localStorage: pp-wishlist / pp-recent = JSON array ของ slug · pp-cart = [{slug,size,qty}]
 * - หน้า /products?... render จาก server จึงอ่านรายการ slug เทียบได้จาก HTML ของหน้า (data-slug ของ product-card)
 * - สูตรลดก้อนขน = hairball-control-dry (ค้นด้วยคำว่า "ก้อนขน" ได้ชิ้นนี้ชิ้นเดียว)
 * - ค่าส่ง ฿0 บนหน้า /cart แสดงเป็นคำว่า "ฟรี" (แผนหัวข้อ 5.4 ใช้ ค่าส่ง "ฟรี" (฿0) แบบเดียวกัน) จึงยอมรับทั้ง "฿0" และ "ฟรี"
 */
import type { Locator, Page } from '@playwright/test';
import { test, expect, check, checkApi, baseURL } from './support/pp';

const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };
const HAIRBALL = 'hairball-control-dry'; // สูตรลดก้อนขน 1.5 kg ฿520 สต็อก 3
const HAIRBALL_NAME = 'สูตรลดก้อนขน';
const FREEZE = 'freeze-dried-chicken-cat'; // ไก่ฟรีซดราย สต็อก 0
const CHICKEN_SLUGS = [
  'kitten-chicken-mousse',
  'adult-chicken-dry',
  'urinary-care-dry',
  'puppy-chicken-dry',
  'dental-chew-treat',
  'freeze-dried-chicken-cat',
];
const ADDRESS = {
  name: 'สมใจ ใจดี',
  phone: '0812345678',
  address: '99/1 ถนนสุขุมวิท แขวงคลองเตย',
  province: 'กรุงเทพมหานคร',
  postcode: '10110',
};
/** ค่าส่ง ฿0 — เว็บแสดงเป็น "ฟรี" (ตามแบบที่แผนหัวข้อ 5.4 เขียนว่า ค่าส่ง "ฟรี" (฿0)) */
const SHIP_ZERO = /^\s*(฿\s*0|ฟรี)\s*$/;

type Pet = 'cat' | 'dog';
type Life = 'baby' | 'adult' | 'senior';
type FType = 'any' | 'dry' | 'wet' | 'treat';
interface Answer {
  pet: Pet;
  life: Life;
  noChicken?: boolean;
  grainFree?: boolean;
  type?: FType;
}
interface Card {
  slug: string;
  name: string;
  score: number;
  best: boolean;
  typeLabel: string;
  gfBadge: boolean;
  soldOut: boolean;
  addDisabled: boolean;
}
interface Run {
  a: Answer;
  label: string;
  cards: Card[];
  text: string;
}

const LIFE_TH: Record<Pet, Record<Life, string>> = {
  cat: { baby: 'ลูกแมว', adult: 'แมวโต', senior: 'แมวสูงวัย' },
  dog: { baby: 'ลูกสุนัข', adult: 'สุนัขโต', senior: 'สุนัขสูงวัย' },
};
const TYPE_TH: Record<FType, string> = { any: 'แบบไหนก็ได้', dry: 'อาหารเม็ด', wet: 'อาหารเปียก', treat: 'ขนม' };

function answerLabel(a: Answer): string {
  return [
    a.pet === 'cat' ? 'แมว' : 'หมา',
    LIFE_TH[a.pet][a.life],
    a.noChicken ? 'ไม่เอาไก่' : '',
    a.grainFree ? 'เกรนฟรี' : '',
    TYPE_TH[a.type ?? 'any'],
  ]
    .filter(Boolean)
    .join(' → ');
}

/** 96 ชุดคำตอบ (หรือเฉพาะสัตว์ที่ระบุ) เรียงตาม สัตว์ → วัย เพื่อใช้ "← ย้อนกลับ" เปลี่ยนแค่ขั้น 3 */
function allAnswers(pets: Pet[] = ['cat', 'dog']): Answer[] {
  const out: Answer[] = [];
  for (const pet of pets)
    for (const life of ['baby', 'adult', 'senior'] as Life[])
      for (const noChicken of [false, true])
        for (const grainFree of [false, true])
          for (const type of ['any', 'dry', 'wet', 'treat'] as FType[]) out.push({ pet, life, noChicken, grainFree, type });
  return out;
}
const SIX: Array<[Pet, Life]> = [
  ['cat', 'baby'],
  ['cat', 'adult'],
  ['cat', 'senior'],
  ['dog', 'baby'],
  ['dog', 'adult'],
  ['dog', 'senior'],
];

// ---------- ตัวช่วยทั่วไป ----------
async function until(fn: () => Promise<boolean>, timeout = 3000): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      if (await fn()) return true;
    } catch {
      /* ลองใหม่ */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
async function lsRaw(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}
async function lsArr(page: Page, key: string): Promise<string[]> {
  const v = await lsRaw(page, key);
  try {
    const j = JSON.parse(v ?? '[]');
    return Array.isArray(j) ? j.map((x) => (typeof x === 'string' ? x : String((x as { slug?: string })?.slug ?? JSON.stringify(x)))) : [];
  } catch {
    return [];
  }
}
interface CartLine {
  slug: string;
  size: string;
  qty: number;
}
async function cartLines(page: Page): Promise<CartLine[]> {
  const v = await lsRaw(page, 'pp-cart');
  try {
    const j = JSON.parse(v ?? '[]');
    return Array.isArray(j) ? (j as CartLine[]) : [];
  } catch {
    return [];
  }
}
/** ไม่มี key หรือเป็น [] */
const isEmptyList = (v: string | null) => {
  if (v === null) return true;
  try {
    return JSON.stringify(JSON.parse(v)) === '[]';
  } catch {
    return false;
  }
};
const countOf = (arr: string[], s: string) => arr.filter((x) => x === s).length;
const wishCount = (page: Page) => page.getByTestId('wishlist-count');
const cartCount = (page: Page) => page.getByTestId('cart-count');
const pdpWish = (page: Page) => page.getByTestId('wishlist-toggle').first();
const cardOf = (scope: Page | Locator, slug: string) => scope.locator(`[data-testid="product-card"][data-slug="${slug}"]`);
const wishRow = (page: Page, slug: string) => page.locator(`[data-testid="wishlist-item"][data-slug="${slug}"]`);
const notFoundMsg = (page: Page) => page.locator('main').getByText(/ไม่พบ/);

/** เก็บ console error / pageerror ของหน้า (ignore = ข้อความที่ตั้งใจให้เกิด เช่น 404 ของหน้าที่เปิด slug ผิดเอง) */
function trackConsole(page: Page, ignore?: (text: string, url: string) => boolean): string[] {
  const errs: string[] = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url ?? '';
    if (ignore?.(m.text(), url)) return;
    errs.push(`${m.text()} @ ${url}`);
  });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  return errs;
}

async function loginDemo(page: Page): Promise<void> {
  const r = await page.request.post(`${baseURL()}/api/auth/login`, { data: DEMO });
  if (!r.ok()) throw new Error(`ล็อกอิน demo ไม่สำเร็จ: HTTP ${r.status()}`);
}

/** เปิดหน้าสินค้าแล้วรอให้ถูกบันทึกเป็นตัวแรกของ pp-recent (ถ้าเว็บไม่บันทึกก็ไปต่อ ให้จุดตรวจเป็นคนตัดสิน) */
async function viewProduct(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByTestId('product-title').waitFor();
  await until(async () => (await lsArr(page, 'pp-recent'))[0] === slug, 3000);
}

/** อ่าน slug ของการ์ดในกล่องบนหน้าแรก (รอจนรายการนิ่ง เพราะกล่องคำนวณฝั่ง client) */
async function boxSlugs(page: Page, testid: string): Promise<string[]> {
  const box = page.getByTestId(testid);
  await box.getByTestId('product-card').first().waitFor({ timeout: 5000 }).catch(() => {});
  let prev = '#';
  for (let i = 0; i < 12; i++) {
    const cur = (await box.getByTestId('product-card').evaluateAll((es) => es.map((e) => e.getAttribute('data-slug') ?? ''))).join(',');
    if (cur === prev) return cur ? cur.split(',') : [];
    prev = cur;
    await page.waitForTimeout(200);
  }
  return prev && prev !== '#' ? prev.split(',') : [];
}

/** รายการ slug ของหน้า /products?<query> (หน้านี้ render จาก server) + ข้อความ "พบ N รายการ" */
const listingCache = new Map<string, { slugs: string[]; count: string }>();
async function listing(page: Page, query: string): Promise<{ slugs: string[]; count: string }> {
  const hit = listingCache.get(query);
  if (hit) return hit;
  const r = await page.request.get(`${baseURL()}/products${query ? `?${query}` : ''}`);
  const html = await r.text();
  const slugs = [...html.matchAll(/<article[^>]*data-testid="product-card"[^>]*data-slug="([^"]+)"/g)].map((m) => m[1]);
  const cm = html.match(/data-testid="result-count"[^>]*>([\s\S]*?)<\/p>/);
  const count = cm ? cm[1].replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').trim() : '(ไม่พบ result-count)';
  const res = { slugs, count };
  listingCache.set(query, res);
  return res;
}
test.beforeEach(() => listingCache.clear());

// ---------- ตัวช่วย Finder ----------
async function answerSteps12(page: Page, pet: Pet, life: Life): Promise<void> {
  await page.getByTestId(`finder-pet-${pet}`).click();
  await page.getByTestId('finder-next').click();
  await page.getByTestId(`finder-life-${life}`).click();
  await page.getByTestId('finder-next').click();
  await page.getByTestId('finder-no-chicken').waitFor();
}
async function finderToStep3(page: Page, pet: Pet, life: Life): Promise<void> {
  await page.goto('/finder');
  await answerSteps12(page, pet, life);
}
async function setStep3(page: Page, a: Answer): Promise<void> {
  await page.getByTestId('finder-no-chicken').setChecked(!!a.noChicken);
  await page.getByTestId('finder-grainfree').setChecked(!!a.grainFree);
  await page.getByTestId('finder-type').selectOption(a.type ?? 'any');
}
async function readCards(page: Page): Promise<Card[]> {
  return page.getByTestId('finder-result').evaluateAll((els) =>
    els.map((e) => {
      const el = e as HTMLElement;
      const href = el.querySelector('a[href^="/products/"]')?.getAttribute('href') ?? '';
      const small = el.querySelector('small')?.textContent ?? '';
      const btn = el.querySelector('[data-testid="finder-add"]') as HTMLButtonElement | null;
      const score = (el.querySelector('[data-testid="match-score"]')?.textContent ?? '').match(/(\d+)\s*%/);
      return {
        slug: el.dataset.slug || href.split('/').pop() || '',
        name: `${el.querySelector('.fr-name')?.textContent ?? ''} ${small}`.trim(),
        score: score ? Number(score[1]) : NaN,
        best: /ตรงใจที่สุด/.test(el.textContent ?? ''),
        typeLabel: (small.split('·').pop() ?? '').trim(),
        gfBadge: [...el.querySelectorAll('[data-testid="match-reason"], .tag')].some((r) => /เกรนฟรี/.test(r.textContent ?? '')),
        soldOut:
          [...el.querySelectorAll('[data-testid="stock-badge"], .stock-badge')].some((b) => (b.textContent ?? '').trim() === 'หมด') ||
          /สินค้าหมด/.test(btn?.textContent ?? ''),
        addDisabled: !btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true',
      };
    }),
  );
}
async function submitAndRead(page: Page, a: Answer): Promise<Run> {
  await page.getByTestId('finder-submit').click();
  await page.getByTestId('finder-restart').waitFor();
  const cards = await readCards(page);
  const text = await page.locator('main').innerText();
  return { a, label: answerLabel(a), cards, text };
}
/** ตอบ Finder 1 ชุดตั้งแต่เปิด /finder */
async function runFinder(page: Page, a: Answer): Promise<Run> {
  await finderToStep3(page, a.pet, a.life);
  await setStep3(page, a);
  return submitAndRead(page, a);
}
/** ตอบหลายชุด: ชุดที่สัตว์/วัยเดิม ใช้ "← ย้อนกลับ" ไปขั้น 3 แล้วตั้งค่าขั้น 3 ใหม่ทั้งหมด */
async function runMany(page: Page, answers: Answer[]): Promise<Run[]> {
  const out: Run[] = [];
  let cur = '';
  for (const a of answers) {
    const key = `${a.pet}-${a.life}`;
    if (key !== cur) {
      await finderToStep3(page, a.pet, a.life);
      cur = key;
    } else {
      await page.getByTestId('finder-back').click();
      await page.getByTestId('finder-submit').waitFor();
    }
    await setStep3(page, a);
    out.push(await submitAndRead(page, a));
  }
  return out;
}
const summarize = (runs: Run[]) =>
  runs.map((r) => `${r.label}: ${r.cards.map((c) => `${c.slug} ${c.score}%${c.best ? ' 🏆' : ''}`).join(' | ') || '(0 การ์ด)'}`).join('\n');
const pressed = (l: Locator) =>
  l.evaluate((e) => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true', undefined, { timeout: 1000 }).catch(() => false);
const isDisabled = (l: Locator) =>
  l.evaluate((e) => e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true', undefined, { timeout: 1000 }).catch(() => false);

/** ค่าช่องในหน้าสินค้า (.pd-facts) เช่น "ประเภท", "สูตรเกรนฟรี" — ไม่มีช่องนี้ได้ null */
async function pdpFact(page: Page, slug: string, label: string): Promise<string | null> {
  await page.goto(`/products/${slug}`);
  await page.getByTestId('product-title').waitFor();
  const li = page.locator('.pd-facts li').filter({ has: page.locator('small', { hasText: label }) });
  if ((await li.count()) === 0) return null;
  return (await li.first().locator('strong').innerText()).trim();
}

// ---------- ตะกร้า / สั่งซื้อ ----------
async function addFromPdp(page: Page, slug: string, qty: number, size?: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByTestId('add-to-cart').waitFor();
  if (size) await page.locator(`[data-testid="size-option"][data-size="${size}"]`).click();
  for (let i = 1; i < qty; i++) await page.getByTestId('qty-plus').click();
  await page.getByTestId('add-to-cart').click();
  await until(async () => (await cartLines(page)).some((l) => l.slug === slug));
}
/** /cart → "ดำเนินการชำระเงิน →" → กรอกที่อยู่มาตรฐาน ส่งธรรมดา เก็บเงินปลายทาง (ยังไม่กดยืนยัน) */
async function fillCheckout(page: Page): Promise<void> {
  await page.goto('/cart');
  await page.getByTestId('checkout-button').click();
  await page.waitForURL(/\/checkout/);
  await page.getByTestId('ship-name').fill(ADDRESS.name);
  await page.getByTestId('ship-phone').fill(ADDRESS.phone);
  await page.getByTestId('ship-address').fill(ADDRESS.address);
  await page.getByTestId('ship-province').selectOption(ADDRESS.province);
  await page.getByTestId('ship-postcode').fill(ADDRESS.postcode);
  await page.getByTestId('shipping-standard').check();
  await page.getByTestId('pay-cod').check();
}
async function resetAfter(page: Page): Promise<void> {
  await test.step('reset หลังจบ (TC นี้เปลี่ยนสต็อกกลาง)', async () => {
    await page.request.post(`${baseURL()}/api/test/reset`).catch(() => {});
  });
}

test('TC-FND-001 ปุ่ม "ถัดไป →" ถูกปิดจนกว่าจะเลือกสัตว์ (ขั้น 1) และช่วงวัย (ขั้น 2)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: ปุ่มมี `disabled` (หรือ `aria-disabled="true"`) และหน้าจอยังอยู่ขั้น 1 ไม่มีการ์ดผล · ขั้นที่ 3: ไปขั้น 2 ได้ · ขั้นที่ 4: ปุ่มกลับมามี `disabled` และยังอยู่ขั้น 2 · ขั้นที่ 5: ไปขั้น 3 ได้ · ตลอดขั้นที่ 1–4 จำนวนการ์ดผล = 0' },
    { type: 'source', description: '[R] · R159 · ความเสี่ยง: ได้ผลแนะนำทั้งที่ยังไม่บอกสัตว์/วัย · เทคนิค: Happy path · Negative · State' },
  ],
}, async ({ page }) => {
  const next = page.getByTestId('finder-next');
  const progress = page.getByTestId('finder-progress');
  const results = page.getByTestId('finder-result');
  await test.step('1. เปิด /finder ไม่เลือกอะไร', async () => {
    await page.goto('/finder');
    await next.waitFor();
  });
  await check(page, 'ขั้น 1: ปุ่ม "ถัดไป →" มี disabled หรือ aria-disabled="true"', next, async (el) => {
    await expect.soft.poll(() => isDisabled(el), { timeout: 3000 }).toBe(true);
  }, { actual: async () => next.evaluate((e) => e.outerHTML) });
  await test.step('2. ลองกด "ถัดไป →" และกด Enter ขณะโฟกัสปุ่ม', async () => {
    await next.click({ force: true, timeout: 2000 }).catch(() => {});
    await next.focus().catch(() => {});
    await page.keyboard.press('Enter');
  });
  await check(page, 'ขั้น 1: หน้าจอยังอยู่ขั้น 1 และการ์ดผล = 0', progress, async (el) => {
    await expect.soft(el).toHaveAttribute('data-step', '1');
    await expect.soft(page.getByTestId('finder-pet-cat')).toBeVisible();
    await expect.soft(results).toHaveCount(0);
  });
  await test.step('3. เลือก "แมว" แล้วกด "ถัดไป →"', async () => {
    await page.getByTestId('finder-pet-cat').click();
    await next.click();
  });
  await check(page, 'ขั้น 3: ไปขั้น 2 (ช่วงวัย) ได้', progress, async (el) => {
    await expect.soft(el).toHaveAttribute('data-step', '2');
    await expect.soft(page.getByTestId('finder-life-adult')).toBeVisible();
  });
  await check(page, 'ขั้น 4: ยังไม่เลือกวัย ปุ่ม "ถัดไป →" กลับมามี disabled', next, async (el) => {
    await expect.soft.poll(() => isDisabled(el), { timeout: 3000 }).toBe(true);
  }, { actual: async () => next.evaluate((e) => e.outerHTML) });
  await test.step('4. ลองกด "ถัดไป →" ที่ขั้น 2 (ทั้งคลิกและ Enter)', async () => {
    await next.click({ force: true, timeout: 2000 }).catch(() => {});
    await next.focus().catch(() => {});
    await page.keyboard.press('Enter');
  });
  await check(page, 'ขั้น 4: ยังอยู่ขั้น 2 และการ์ดผล = 0', progress, async (el) => {
    await expect.soft(el).toHaveAttribute('data-step', '2');
    await expect.soft(results).toHaveCount(0);
  });
  await test.step('5. เลือก "แมวโต" แล้วกด "ถัดไป →"', async () => {
    await page.getByTestId('finder-life-adult').click();
    await next.click();
  });
  await check(page, 'ขั้น 5: ไปขั้น 3 ได้', progress, async (el) => {
    await expect.soft(el).toHaveAttribute('data-step', '3');
    await expect.soft(page.getByTestId('finder-no-chicken')).toBeVisible();
  });
});

test('TC-FND-002 ไม่แนะนำสินค้าข้ามสายพันธุ์ (ครบ 96 ชุด)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ผลของชุดแมว 48 ชุด มีสินค้าที่อยู่ใน `?pet=dog` = 0 ชิ้น · ผลของชุดหมา 48 ชุด มีสินค้าที่อยู่ใน `?pet=cat` = 0 ชิ้น · breadcrumb ของ 10 ชิ้นที่สุ่มตรงกับสัตว์ที่เลือก · ไม่มีชุดไหนทำให้หน้าพังหรือมี console error' },
    { type: 'source', description: '[R] · R160 · ความเสี่ยง: แนะนำอาหารหมาให้แมว (กระทบสุขภาพสัตว์) · เทคนิค: Equivalence partition · Negative' },
  ],
}, async ({ page }) => {
  test.setTimeout(300_000);
  const errs = trackConsole(page);
  let catList: string[] = [];
  let dogList: string[] = [];
  let runs: Run[] = [];
  await test.step('เตรียม: เก็บรายการ slug จาก /products?pet=cat และ /products?pet=dog', async () => {
    catList = (await listing(page, 'pet=cat')).slugs;
    dogList = (await listing(page, 'pet=dog')).slugs;
  });
  await test.step('1. ตอบ Finder ทีละชุดจนครบ 96 ชุด เก็บ slug การ์ดผลทุกใบ', async () => {
    runs = await runMany(page, allAnswers());
  });
  const catRuns = runs.filter((r) => r.a.pet === 'cat');
  const dogRuns = runs.filter((r) => r.a.pet === 'dog');
  await test.step('2. เทียบ slug ของผลชุดแมวกับ ?pet=dog และชุดหมากับ ?pet=cat', async () => {});
  await check(page, `ผลของชุดแมว ${catRuns.length} ชุด มีสินค้าที่อยู่ใน ?pet=dog = 0 ชิ้น`, null, async () => {
    expect.soft(catRuns.length).toBe(48);
    expect.soft(catRuns.flatMap((r) => r.cards.filter((c) => dogList.includes(c.slug)).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(catRuns) });
  await check(page, `ผลของชุดหมา ${dogRuns.length} ชุด มีสินค้าที่อยู่ใน ?pet=cat = 0 ชิ้น`, null, async () => {
    expect.soft(dogRuns.length).toBe(48);
    expect.soft(dogRuns.flatMap((r) => r.cards.filter((c) => catList.includes(c.slug)).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(dogRuns) });
  const pick = (rs: Run[]) => {
    const uniq = [...new Set(rs.flatMap((r) => r.cards.map((c) => c.slug)))];
    const step = Math.max(1, Math.floor(uniq.length / 5));
    return uniq.filter((_, i) => i % step === 0).slice(0, 5);
  };
  const samples: Array<[Pet, string]> = [...pick(catRuns).map((s) => ['cat', s] as [Pet, string]), ...pick(dogRuns).map((s) => ['dog', s] as [Pet, string])];
  await test.step(`3. สุ่มเปิดหน้ารายละเอียด 5 ชิ้นจากผลแมวและ 5 ชิ้นจากผลหมา ดู breadcrumb (${samples.map((s) => s[1]).join(', ')})`, async () => {
    for (const [pet, slug] of samples) {
      await page.goto(`/products/${slug}`);
      const bc = page.locator('nav.breadcrumb, nav[aria-label="breadcrumb"]').first();
      await check(page, `breadcrumb ของ ${slug} เป็นหมวด${pet === 'cat' ? 'แมว' : 'สุนัข'}`, bc, async (el) => {
        await expect.soft(el.locator(`a[href*="pet=${pet}"]`)).toHaveCount(1);
        await expect.soft(el).toContainText(pet === 'cat' ? 'อาหารแมว' : 'อาหารสุนัข');
      });
    }
  });
  await check(page, 'ไม่มีชุดไหนทำให้หน้าพังหรือมี console error', null, async () => {
    expect.soft(runs.length).toBe(96);
    expect.soft(errs).toEqual([]);
  }, { actual: async () => (errs.length ? errs : `console error 0 · ตอบครบ ${runs.length} ชุด`) });
});

test('TC-FND-003 ไก่ฟรีซดราย (สต็อก 0) ต้องไม่ถูกแนะนำในชุดคำตอบแมวใดเลย', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`freeze-dried-chicken-cat` โผล่ 0 ครั้งใน 48 ชุด · การ์ดที่มีป้าย "หมด"/ปุ่ม "สินค้าหมด" = 0 ใบในทุกชุด · ปุ่มใส่ตะกร้าของการ์ดผลทุกใบไม่มี `disabled`' },
    { type: 'source', description: '[D] · R161 · ความเสี่ยง: แนะนำของที่ซื้อไม่ได้ · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  test.setTimeout(240_000);
  let runs: Run[] = [];
  await test.step('1. ตอบ Finder ครบ 48 ชุดของแมว เก็บ slug การ์ดผลทุกใบ', async () => {
    runs = await runMany(page, allAnswers(['cat']));
  });
  await check(page, `${FREEZE} โผล่ 0 ครั้งใน 48 ชุด`, null, async () => {
    expect.soft(runs.length).toBe(48);
    expect.soft(runs.flatMap((r) => r.cards.filter((c) => c.slug === FREEZE).map(() => r.label))).toEqual([]);
  }, { actual: async () => summarize(runs) });
  await check(page, 'การ์ดที่มีป้าย "หมด"/ปุ่ม "สินค้าหมด" = 0 ใบในทุกชุด', null, async () => {
    expect.soft(runs.flatMap((r) => r.cards.filter((c) => c.soldOut).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(runs) });
  await check(page, 'ปุ่มใส่ตะกร้าของการ์ดผลทุกใบไม่มี disabled', null, async () => {
    expect.soft(runs.flatMap((r) => r.cards.filter((c) => c.addDisabled).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(runs) });
});

test('TC-FND-004 ของใกล้หมด (สูตรลดก้อนขน เหลือ 3) ยังถูกแนะนำได้', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'มีการ์ดสูตรลดก้อนขน 1 ใบ · ปุ่มใส่ตะกร้าของการ์ดนั้นไม่มี `disabled` · ไม่มีการ์ด `freeze-dried-chicken-cat`' },
    { type: 'source', description: '[D] · R161 · ความเสี่ยง: ตัดของใกล้หมดทิ้งทั้งที่ยังขายได้ (เสียยอดขาย) · เทคนิค: Happy path · Equivalence partition' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิด /finder ตอบ แมว → แมวโต → ติ๊ก "ไม่เอาสูตรไก่" · ประเภท "แบบไหนก็ได้" แล้วดูผล', async () => {
    await runFinder(page, { pet: 'cat', life: 'adult', noChicken: true, type: 'any' });
  });
  const hb = page.locator(`[data-testid="finder-result"][data-slug="${HAIRBALL}"]`);
  await test.step('2. หาการ์ดสูตรลดก้อนขน', async () => {
    await hb.first().scrollIntoViewIfNeeded().catch(() => {});
  });
  await check(page, 'มีการ์ดสูตรลดก้อนขน 1 ใบ', hb, async (el) => {
    await expect.soft(el).toHaveCount(1);
    await expect.soft(el.first()).toContainText(HAIRBALL_NAME);
  });
  await test.step('3. อ่าน attribute ปุ่มใส่ตะกร้าบนการ์ดนั้น', async () => {});
  const hbAdd = hb.getByTestId('finder-add');
  await check(page, 'ปุ่มใส่ตะกร้าของการ์ดสูตรลดก้อนขนไม่มี disabled', hbAdd, async (el) => {
    await expect.soft(el).toHaveCount(1);
    expect.soft(await isDisabled(el.first())).toBe(false);
  }, { actual: async () => (await hbAdd.count()) ? hbAdd.first().evaluate((e) => e.outerHTML) : '(ไม่พบปุ่ม)' });
  await check(page, `ไม่มีการ์ด ${FREEZE}`, page.getByTestId('finder-result'), async () => {
    await expect.soft(page.locator(`[data-testid="finder-result"][data-slug="${FREEZE}"]`)).toHaveCount(0);
  }, { actual: async () => (await readCards(page)).map((c) => c.slug).join(', ') });
});

test('TC-FND-005 สูตรลดก้อนขนต้องหายจากผล Finder ทันทีหลังขายจนสต็อกเป็น 0', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: ปุ่มเขียน "ยืนยันสั่งซื้อ ฿1,560" (฿520×3 = ฿1,560 ≥ ฿999 → ส่ง ฿0) และได้หน้า `/orders/PP-1000NN` · ขั้นที่ 4: สต็อกสูตรลดก้อนขน = 0 · ขั้นที่ 5: การ์ดสูตรลดก้อนขน = 0 ใบ · การ์ดที่มีป้าย "หมด" = 0 ใบ' },
    { type: 'source', description: '[D]+[R] · R161 · ความเสี่ยง: ยังแนะนำของที่เพิ่งหมด ลูกค้ากดแล้วซื้อไม่ได้ · เทคนิค: State · Negative' },
  ],
}, async ({ page }) => {
  test.setTimeout(120_000);
  const ans: Answer = { pet: 'cat', life: 'adult', noChicken: true, type: 'any' };
  try {
    await test.step('เตรียม: ล็อกอิน demo@pawpantry.test (ตะกร้าว่าง)', async () => {
      await loginDemo(page);
    });
    await test.step('1. ทำ Finder แมว → แมวโต → "ไม่เอาสูตรไก่" ยืนยันว่ามีการ์ดสูตรลดก้อนขน', async () => {
      await runFinder(page, ans);
      await check(page, 'ก่อนสั่งซื้อ: มีการ์ดสูตรลดก้อนขนในผล Finder', page.locator(`[data-testid="finder-result"][data-slug="${HAIRBALL}"]`), async (el) => {
        await expect.soft(el).toHaveCount(1);
      });
    });
    await test.step('2. เปิดหน้าสินค้าสูตรลดก้อนขน ตั้งจำนวน 3 แล้วกด "🛒 เพิ่มลงตะกร้า"', async () => {
      await addFromPdp(page, HAIRBALL, 3);
    });
    await test.step('3. ไป /cart → "ดำเนินการชำระเงิน →" กรอกที่อยู่ กด "ยืนยันสั่งซื้อ ฿X"', async () => {
      await fillCheckout(page);
      await check(page, 'ขั้นที่ 3: ปุ่มเขียน "ยืนยันสั่งซื้อ ฿1,560"', page.getByTestId('place-order'), async (el) => {
        await expect.soft(el).toContainText('ยืนยันสั่งซื้อ ฿1,560');
      });
      await page.getByTestId('place-order').click();
      await page.waitForURL(/\/orders\//, { timeout: 15_000 }).catch(() => {});
      await check(page, 'ขั้นที่ 3: ได้หน้า /orders/PP-1000NN', null, async () => {
        expect.soft(page.url()).toMatch(/\/orders\/PP-1000\d{2}$/);
      }, { actual: async () => page.url() });
    });
    await test.step('4. เรียก GET /api/products ดูสต็อกของสูตรลดก้อนขน', async () => {
      const r = await page.request.get(`${baseURL()}/api/products`);
      const items = ((await r.json()) as { items: Array<{ slug: string; stock: number }> }).items;
      const stock = items.find((p) => p.slug === HAIRBALL)?.stock;
      await checkApi('ขั้นที่ 4: สต็อกสูตรลดก้อนขน = 0', { status: r.status(), slug: HAIRBALL, stock }, () => {
        expect.soft(stock).toBe(0);
      });
    });
    await test.step('5. เปิด /finder ใหม่ ตอบชุดเดิมแล้วดูผล', async () => {
      await runFinder(page, ans);
    });
    await check(page, 'ขั้นที่ 5: การ์ดสูตรลดก้อนขน = 0 ใบ', page.getByTestId('finder-result'), async () => {
      await expect.soft(page.locator(`[data-testid="finder-result"][data-slug="${HAIRBALL}"]`)).toHaveCount(0);
    }, { actual: async () => (await readCards(page)).map((c) => c.slug).join(', ') });
    await check(page, 'ขั้นที่ 5: การ์ดที่มีป้าย "หมด" = 0 ใบ', page.getByTestId('finder-result'), async () => {
      expect.soft((await readCards(page)).filter((c) => c.soldOut).map((c) => c.slug)).toEqual([]);
    }, { actual: async () => JSON.stringify(await readCards(page)) });
  } finally {
    await resetAfter(page);
  }
});

test('TC-FND-006 ใส่ตะกร้าจากผล Finder ต้องมี toast และห้ามเกินสต็อก (สูตรลดก้อนขน สต็อก 3)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: มี toast ที่มีชื่อสินค้าสูตรลดก้อนขน · 🛒 1 · ขั้นที่ 3: 🛒 3 · `pp-cart` มีสูตรลดก้อนขน 1 บรรทัด ขนาด "1.5 kg" qty 3 · ขั้นที่ 4: 🛒 ยังเป็น 3 · qty ยังเป็น 3 · มี toast เตือนที่**ไม่ใช่**ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว" · ขั้นที่ 5: ยอดสินค้า ฿1,560 (฿520×3) ค่าส่ง ฿0 (≥ ฿999) ยอดชำระ ฿1,560 (ตอนนี้ล้ม: ใส่จาก Finder ไม่มี toast เห็นแค่ตัวนับ 🛒 เปลี่ยน)' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน] · R161 · R32 · R63 · Q18 · ความเสี่ยง: ใส่เกินสต็อกโดยไม่รู้ตัว แล้วไปล้มตอนยืนยันสั่งซื้อ · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  const hbAdd = page.locator(`[data-testid="finder-result"][data-slug="${HAIRBALL}"] [data-testid="finder-add"]`);
  const hbLine = async () => (await cartLines(page)).filter((l) => l.slug === HAIRBALL);
  await test.step('1. ทำ Finder แมว → แมวโต → "ไม่เอาสูตรไก่"', async () => {
    await runFinder(page, { pet: 'cat', life: 'adult', noChicken: true, type: 'any' });
  });
  await test.step('2. กดใส่ตะกร้าการ์ดสูตรลดก้อนขน 1 ครั้ง ดู toast และ 🛒', async () => {
    await hbAdd.click();
  });
  await check(page, 'ขั้นที่ 2: มี toast ที่มีชื่อสินค้าสูตรลดก้อนขน', page.getByTestId('toast'), async (el) => {
    await expect.soft(el.filter({ hasText: HAIRBALL_NAME }).first()).toBeVisible();
  });
  await check(page, 'ขั้นที่ 2: 🛒 1', cartCount(page), async (el) => {
    await expect.soft(el).toHaveText('1');
  });
  await test.step('3. กดอีก 2 ครั้ง (เว้นจังหวะครั้งละ 1 วินาที) ดู 🛒 และ pp-cart', async () => {
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(1000);
      await hbAdd.click();
    }
  });
  await check(page, 'ขั้นที่ 3: 🛒 3', cartCount(page), async (el) => {
    await expect.soft(el).toHaveText('3');
  });
  await check(page, 'ขั้นที่ 3: pp-cart มีสูตรลดก้อนขน 1 บรรทัด ขนาด "1.5 kg" qty 3', null, async () => {
    await expect.soft.poll(hbLine).toEqual([expect.objectContaining({ slug: HAIRBALL, size: '1.5 kg', qty: 3 })]);
  }, { actual: () => lsRaw(page, 'pp-cart') });
  await test.step('4. กดครั้งที่ 4 ดู toast, 🛒 และ pp-cart', async () => {
    await page.waitForTimeout(1000);
    await hbAdd.click();
  });
  await check(page, 'ขั้นที่ 4: มี toast เตือนที่ไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว"', page.getByTestId('toast'), async (el) => {
    await expect.soft(el.filter({ hasNotText: /เพิ่ม.*ลงตะกร้าแล้ว/ }).first()).toBeVisible();
  }, { actual: async () => (await page.getByTestId('toast').allInnerTexts()).join(' ;; ') || '(ไม่มี toast)' });
  await check(page, 'ขั้นที่ 4: 🛒 ยังเป็น 3', cartCount(page), async (el) => {
    await expect.soft(el).toHaveText('3');
  });
  await check(page, 'ขั้นที่ 4: qty ใน pp-cart ยังเป็น 3', null, async () => {
    await expect.soft.poll(hbLine).toEqual([expect.objectContaining({ slug: HAIRBALL, size: '1.5 kg', qty: 3 })]);
  }, { actual: () => lsRaw(page, 'pp-cart') });
  await test.step('5. เปิด /cart อ่านสรุปยอด', async () => {
    await page.goto('/cart');
  });
  await check(page, 'ขั้นที่ 5: ยอดสินค้า ฿1,560 (฿520×3)', page.getByTestId('summary-subtotal'), async (el) => {
    await expect.soft(el).toHaveText(/฿1,560/);
  });
  await check(page, 'ขั้นที่ 5: ค่าส่ง ฿0 (≥ ฿999)', page.getByTestId('summary-shipping'), async (el) => {
    await expect.soft(el).toHaveText(SHIP_ZERO);
  });
  await check(page, 'ขั้นที่ 5: ยอดชำระ ฿1,560', page.getByTestId('summary-total'), async (el) => {
    await expect.soft(el).toHaveText(/฿1,560/);
  });
});

test('TC-FND-007 "ไม่เอาสูตรไก่" ต้องตัดสินค้าที่มีไก่เป็นโปรตีนหลักทุกวัย', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: slug ไก่ทั้ง 6 ตัวโผล่ 0 ครั้งใน 6 ชุด · ขั้นที่ 3: ไม่มีชื่อสินค้าใดมีคำว่า "ไก่" หรือ "chicken" · ชิ้นไก่ที่จดได้ในขั้นที่ 1 หายครบทุกชิ้นเมื่อติ๊ก' },
    { type: 'source', description: '[R] · R162 · ความเสี่ยง: แนะนำไก่ให้สัตว์ที่แพ้ไก่ · เทคนิค: Equivalence partition · Negative' },
  ],
}, async ({ page }) => {
  test.setTimeout(150_000);
  let plain: Run[] = [];
  let ticked: Run[] = [];
  await test.step('1. ตอบ 6 ชุด (ลูกแมว/แมวโต/แมวสูงวัย/ลูกสุนัข/สุนัขโต/สุนัขสูงวัย) แบบไม่ติ๊ก "ไม่เอาสูตรไก่" จดชิ้นไก่ที่โผล่', async () => {
    plain = await runMany(page, SIX.map(([pet, life]) => ({ pet, life, noChicken: false, type: 'any' as FType })));
  });
  const seen = [...new Set(plain.flatMap((r) => r.cards.map((c) => c.slug).filter((s) => CHICKEN_SLUGS.includes(s))))];
  await test.step(`ชิ้นไก่ที่จดได้ในขั้นที่ 1: ${seen.join(', ') || '(ไม่มี)'}`, async () => {});
  await test.step('2. ตอบ 6 ชุดเดิมแบบติ๊ก "ไม่เอาสูตรไก่"', async () => {
    ticked = await runMany(page, SIX.map(([pet, life]) => ({ pet, life, noChicken: true, type: 'any' as FType })));
  });
  await check(page, 'ขั้นที่ 2: slug ไก่ทั้ง 6 ตัวโผล่ 0 ครั้งใน 6 ชุด', null, async () => {
    expect.soft(ticked.flatMap((r) => r.cards.filter((c) => CHICKEN_SLUGS.includes(c.slug)).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(ticked) });
  await test.step('3. อ่านชื่อสินค้าของการ์ดผลทุกใบในขั้นที่ 2', async () => {});
  await check(page, 'ขั้นที่ 3: ไม่มีชื่อสินค้าใดมีคำว่า "ไก่" หรือ "chicken"', null, async () => {
    expect.soft(ticked.flatMap((r) => r.cards.filter((c) => /ไก่|chicken/i.test(c.name)).map((c) => `${r.label}: ${c.name}`))).toEqual([]);
  }, { actual: async () => ticked.map((r) => `${r.label}: ${r.cards.map((c) => c.name).join(' | ')}`).join('\n') });
  await check(page, 'ชิ้นไก่ที่จดได้ในขั้นที่ 1 หายครบทุกชิ้นเมื่อติ๊ก', null, async () => {
    const left = ticked.flatMap((r, i) => {
      const before = plain[i].cards.map((c) => c.slug).filter((s) => CHICKEN_SLUGS.includes(s));
      return r.cards.filter((c) => before.includes(c.slug)).map((c) => `${r.label}: ${c.slug}`);
    });
    expect.soft(left).toEqual([]);
  }, { actual: async () => `ไม่ติ๊ก:\n${summarize(plain)}\n\nติ๊ก:\n${summarize(ticked)}` });
});

test('TC-FND-008 "เกรนฟรีเท่านั้น" ต้องเหลือแต่สินค้าเกรนฟรี', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ทุกการ์ดผลมีป้ายเกรนฟรี · ทุก slug อยู่ในรายการ `grainFree=1` ของสัตว์นั้น · ช่อง "สูตรเกรนฟรี" ของทุกชิ้นมีค่าเดียวกับที่จดจากชิ้นแรกของ `/products?grainFree=1` และไม่ใช่ "—" · ชิ้นที่ไม่ใช่เกรนฟรี = 0' },
    { type: 'source', description: '[R] · R163 · ความเสี่ยง: ตัวกรองบอกเกรนฟรีแต่ได้สูตรมีธัญพืช · เทคนิค: Equivalence partition' },
  ],
}, async ({ page }) => {
  test.setTimeout(150_000);
  let runs: Run[] = [];
  await test.step('1. ตอบ 6 ชุดสัตว์×วัย + ติ๊ก "เกรนฟรีเท่านั้น" ประเภท "แบบไหนก็ได้" เก็บ slug การ์ดผล', async () => {
    runs = await runMany(page, SIX.map(([pet, life]) => ({ pet, life, grainFree: true, type: 'any' as FType })));
  });
  await check(page, 'ทุกการ์ดผลมีป้ายเกรนฟรี', null, async () => {
    expect.soft(runs.flatMap((r) => r.cards.filter((c) => !c.gfBadge).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
  }, { actual: async () => summarize(runs) });
  await test.step('2. เทียบแต่ละ slug กับรายการใน /products?pet=<สัตว์>&grainFree=1', async () => {
    const gfCat = (await listing(page, 'pet=cat&grainFree=1')).slugs;
    const gfDog = (await listing(page, 'pet=dog&grainFree=1')).slugs;
    const gfAll = (await listing(page, 'grainFree=1')).slugs;
    await check(page, 'ทุก slug อยู่ในรายการ grainFree=1 ของสัตว์นั้น', null, async () => {
      expect.soft(
        runs.flatMap((r) => r.cards.filter((c) => !(r.a.pet === 'cat' ? gfCat : gfDog).includes(c.slug)).map((c) => `${r.label}: ${c.slug}`)),
      ).toEqual([]);
    }, { actual: async () => `cat GF: ${gfCat.join(', ')}\ndog GF: ${gfDog.join(', ')}\n\n${summarize(runs)}` });
    await check(page, 'ชิ้นที่ไม่ใช่เกรนฟรี = 0', null, async () => {
      expect.soft(runs.flatMap((r) => r.cards.filter((c) => !gfAll.includes(c.slug)).map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
    }, { actual: async () => `?grainFree=1: ${gfAll.join(', ')}` });
  });
  await test.step('3. เปิดหน้ารายละเอียดชิ้นแรกของ /products?grainFree=1 จดช่อง "สูตรเกรนฟรี" แล้วดูช่องเดียวกันของทุกชิ้นในผล', async () => {
    const first = (await listing(page, 'grainFree=1')).slugs[0];
    const ref = await pdpFact(page, first, 'สูตรเกรนฟรี');
    await test.step(`ค่าอ้างอิงจาก ${first}: ${ref ?? '(ไม่มีช่อง "สูตรเกรนฟรี")'}`, async () => {});
    const uniq = [...new Set(runs.flatMap((r) => r.cards.map((c) => c.slug)))];
    for (const slug of uniq) {
      const v = await pdpFact(page, slug, 'สูตรเกรนฟรี');
      await check(page, `ช่อง "สูตรเกรนฟรี" ของ ${slug} = ค่าที่จดจาก ${first} และไม่ใช่ "—"`, page.locator('.pd-facts'), async () => {
        expect.soft(ref, `ชิ้นอ้างอิง ${first} ต้องมีช่อง "สูตรเกรนฟรี"`).not.toBeNull();
        expect.soft(v, `${slug} ต้องมีช่อง "สูตรเกรนฟรี"`).not.toBeNull();
        expect.soft(v).toBe(ref);
        expect.soft(v).not.toBe('—');
      }, { actual: async () => `ref(${first}) = ${ref ?? '(ไม่มีช่อง)'} · ${slug} = ${v ?? '(ไม่มีช่อง)'}` });
    }
  });
});

test('TC-FND-009 ประเภทอาหารในผลต้องตรงกับที่เลือก', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ทุก slug อยู่ในรายการ `type=` ที่ตรงกับประเภทที่เลือก · ชิ้นที่ประเภทไม่ตรง = 0 ในทั้ง 6 ชุด · ป้ายประเภทบนการ์ดตรงกับที่เลือก' },
    { type: 'source', description: '[R] · R164 · ความเสี่ยง: เลือกอาหารเปียกแต่ได้อาหารเม็ด/ขนม · เทคนิค: Equivalence partition' },
  ],
}, async ({ page }) => {
  test.setTimeout(150_000);
  const answers: Answer[] = [];
  for (const pet of ['cat', 'dog'] as Pet[]) for (const type of ['dry', 'wet', 'treat'] as FType[]) answers.push({ pet, life: 'adult', type });
  let runs: Run[] = [];
  await test.step('1. ตอบ 6 ชุด (แมวโต/สุนัขโต × เม็ด/เปียก/ขนม) เก็บ slug การ์ดผล', async () => {
    runs = await runMany(page, answers);
  });
  await test.step('2. เทียบแต่ละ slug กับรายการ /products?pet=<สัตว์>&type=<ประเภท>', async () => {
    for (const r of runs) {
      const list = (await listing(page, `pet=${r.a.pet}&type=${r.a.type}`)).slugs;
      await check(page, `${r.label}: ทุก slug อยู่ในรายการ type=${r.a.type} (ประเภทไม่ตรง = 0)`, null, async () => {
        expect.soft(r.cards.filter((c) => !list.includes(c.slug)).map((c) => c.slug)).toEqual([]);
      }, { actual: async () => `ผล: ${r.cards.map((c) => c.slug).join(', ')}\nรายการ pet=${r.a.pet}&type=${r.a.type}: ${list.join(', ')}` });
    }
  });
  await test.step('3. ดูป้ายประเภทบนการ์ดผล', async () => {
    await check(page, 'ป้ายประเภทบนการ์ดตรงกับที่เลือก (ทั้ง 6 ชุด)', null, async () => {
      expect.soft(runs.flatMap((r) => r.cards.filter((c) => c.typeLabel !== TYPE_TH[r.a.type ?? 'any']).map((c) => `${r.label}: ${c.slug} ป้าย "${c.typeLabel}"`))).toEqual([]);
    }, { actual: async () => runs.map((r) => `${r.label}: ${r.cards.map((c) => `${c.slug}(${c.typeLabel})`).join(', ')}`).join('\n') });
  });
});

test('TC-FND-010 ผลของลูกแมว/แมวโตต้องเป็นวัยที่เลือกทุกชิ้น (ไม่เติมของวัยอื่น)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ทุก slug ในชุด A, B อยู่ใน `life=baby` (ครอบ `urinary-care-dry` ด้วย) · ทุก slug ในชุด C อยู่ใน `life=adult` · `senior-tuna-dry`, `lickable-salmon-treat` ในชุด A/B = 0 · `kitten-chicken-mousse` ในชุด C = 0 · ถ้าชุดใดไม่มีของตรงวัย ต้องมีข้อความที่มีคำว่า "ไม่พบ" (ตอนนี้ล้ม: ลูกแมวได้ขนมแมวเลีย/เป็ดเกรนฟรี (แมวโต), urinary-care-dry, senior-tuna-dry ตรงใจ 46–49% · แมวโต + เปียก ได้ kitten-chicken-mousse 46%)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R165 · R164 · Q38 · Q39 · ความเสี่ยง: ลูกแมวได้อาหารสูงวัย/แมวโต · เทคนิค: Negative · Equivalence partition' },
  ],
}, async ({ page }) => {
  const sets: Array<{ name: string; a: Answer; lifeQ: string; matchQ: string }> = [
    { name: 'ชุด A', a: { pet: 'cat', life: 'baby', type: 'any' }, lifeQ: 'pet=cat&life=baby', matchQ: 'pet=cat&life=baby' },
    { name: 'ชุด B', a: { pet: 'cat', life: 'baby', type: 'dry' }, lifeQ: 'pet=cat&life=baby', matchQ: 'pet=cat&life=baby&type=dry' },
    { name: 'ชุด C', a: { pet: 'cat', life: 'adult', type: 'wet' }, lifeQ: 'pet=cat&life=adult', matchQ: 'pet=cat&life=adult&type=wet' },
  ];
  const runs: Record<string, Run> = {};
  await test.step('1. ตอบชุด A, B, C เก็บ slug การ์ดผล', async () => {
    for (const s of sets) runs[s.name] = await runFinder(page, s.a);
  });
  await test.step('2. เทียบ slug กับรายการ life= ของวัยที่เลือก', async () => {
    for (const s of sets) {
      const list = (await listing(page, s.lifeQ)).slugs;
      const r = runs[s.name];
      await check(page, `${s.name} (${r.label}): ทุก slug อยู่ใน ${s.lifeQ.replace('pet=cat&', '')}`, null, async () => {
        expect.soft(r.cards.filter((c) => !list.includes(c.slug)).map((c) => `${c.slug} ${c.score}%`)).toEqual([]);
      }, { actual: async () => `ผล: ${r.cards.map((c) => `${c.slug} ${c.score}%`).join(', ')}\n${s.lifeQ}: ${list.join(', ')}` });
    }
  });
  await test.step('3. ตรวจว่ามี senior-tuna-dry, lickable-salmon-treat ในชุด A/B และ kitten-chicken-mousse ในชุด C หรือไม่', async () => {
    const ab = [...runs['ชุด A'].cards, ...runs['ชุด B'].cards].map((c) => c.slug);
    await check(page, 'senior-tuna-dry, lickable-salmon-treat ในชุด A/B = 0', null, async () => {
      expect.soft(ab.filter((s) => s === 'senior-tuna-dry' || s === 'lickable-salmon-treat')).toEqual([]);
    }, { actual: async () => `A: ${runs['ชุด A'].cards.map((c) => c.slug).join(', ')}\nB: ${runs['ชุด B'].cards.map((c) => c.slug).join(', ')}` });
    await check(page, 'kitten-chicken-mousse ในชุด C = 0', null, async () => {
      expect.soft(runs['ชุด C'].cards.map((c) => c.slug).filter((s) => s === 'kitten-chicken-mousse')).toEqual([]);
    }, { actual: async () => `C: ${runs['ชุด C'].cards.map((c) => c.slug).join(', ')}` });
    for (const s of sets) {
      const m = await listing(page, s.matchQ);
      if (m.slugs.length > 0) continue;
      const r = runs[s.name];
      await check(page, `${s.name}: ไม่มีของตรงวัย (${s.matchQ} = ${m.count}) ต้องมีข้อความ "ไม่พบ"`, null, async () => {
        expect.soft(r.text).toMatch(/ไม่พบ/);
        expect.soft(r.cards.length).toBe(0);
      }, { actual: async () => r.text.slice(0, 1500) });
    }
  });
});

test('TC-FND-011 ลูกสุนัขต้องไม่ได้อาหารสูงวัย และห้ามติดป้าย 🏆 กับชิ้นที่ตรงใจต่ำ', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`senior-salmon-dry` โผล่ 0 ครั้งทั้งชุด A และ B · ทุก slug อยู่ใน `?pet=dog&life=baby` · ป้าย "🏆 ตรงใจที่สุด" ติดเฉพาะการ์ดที่ "ตรงใจ" ≥ 90% · ถ้าขั้นที่ 3 ได้ 0 รายการ ชุด B ต้องมีการ์ด 0 ใบและมีข้อความที่มีคำว่า "ไม่พบ" (ตอนนี้ล้ม: ชุด B ได้ senior-salmon-dry ชิ้นเดียว พร้อมป้าย 🏆 ตรงใจที่สุด)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R165 · Q38 · ความเสี่ยง: อาหารสูงวัยถูกแนะนำเป็นอันดับ 1 ให้ลูกสุนัข · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  let a: Run | undefined;
  let b: Run | undefined;
  await test.step('1. ตอบชุด A (หมา → ลูกสุนัข ค่าตั้งต้นขั้น 3) เก็บ slug และ % ตรงใจ', async () => {
    a = await runFinder(page, { pet: 'dog', life: 'baby', type: 'any' });
  });
  await test.step('2. ตอบชุด B (ลูกสุนัข + "เกรนฟรีเท่านั้น" + เม็ด) เก็บ slug, % ตรงใจ และป้าย 🏆', async () => {
    b = await runFinder(page, { pet: 'dog', life: 'baby', grainFree: true, type: 'dry' });
  });
  const A = a as Run;
  const B = b as Run;
  let n = { slugs: [] as string[], count: '' };
  await test.step('3. นับรายการใน /products?pet=dog&life=baby&grainFree=1&type=dry', async () => {
    n = await listing(page, 'pet=dog&life=baby&grainFree=1&type=dry');
  });
  const babyList = (await listing(page, 'pet=dog&life=baby')).slugs;
  await check(page, 'senior-salmon-dry โผล่ 0 ครั้งทั้งชุด A และ B', null, async () => {
    expect.soft([...A.cards, ...B.cards].filter((c) => c.slug === 'senior-salmon-dry').length).toBe(0);
  }, { actual: async () => summarize([A, B]) });
  await check(page, 'ทุก slug อยู่ใน ?pet=dog&life=baby', null, async () => {
    expect.soft([...A.cards, ...B.cards].filter((c) => !babyList.includes(c.slug)).map((c) => c.slug)).toEqual([]);
  }, { actual: async () => `pet=dog&life=baby: ${babyList.join(', ')}\n${summarize([A, B])}` });
  await check(page, 'ป้าย "🏆 ตรงใจที่สุด" ติดเฉพาะการ์ดที่ "ตรงใจ" ≥ 90%', null, async () => {
    expect.soft([A, B].flatMap((r) => r.cards.filter((c) => c.best && !(c.score >= 90)).map((c) => `${r.label}: ${c.slug} ${c.score}%`))).toEqual([]);
  }, { actual: async () => summarize([A, B]) });
  if (n.slugs.length === 0) {
    await check(page, `ขั้นที่ 3 ได้ 0 รายการ (${n.count}) → ชุด B ต้องมีการ์ด 0 ใบและมีข้อความ "ไม่พบ"`, page.locator('main'), async () => {
      expect.soft(B.cards.length).toBe(0);
      expect.soft(B.text).toMatch(/ไม่พบ/);
    }, { actual: async () => `${n.count}\nชุด B: ${summarize([B])}` });
  } else {
    await test.step(`ขั้นที่ 3 ได้ ${n.count} (ไม่ใช่ 0) จึงไม่ตรวจข้อความ "ไม่พบ"`, async () => {});
  }
});

test('TC-FND-012 สุนัขสูงวัยต้องไม่ได้อาหารลูกสุนัข', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`puppy-chicken-dry` และ `puppy-lamb-wet` โผล่ 0 ครั้ง · ทุก slug อยู่ใน `life=senior` · ชุดที่ไม่มีของตรงต้องมีข้อความที่มีคำว่า "ไม่พบ" และการ์ด 0 ใบ (ตอนนี้ล้ม: สุนัขสูงวัยได้ puppy-chicken-dry / puppy-lamb-wet)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R165 · Q38 · ความเสี่ยง: สุนัขแก่ได้อาหารพลังงานสูงของลูกสุนัข · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const sets: Array<{ a: Answer; matchQ: string }> = [
    { a: { pet: 'dog', life: 'senior', type: 'dry' }, matchQ: 'pet=dog&life=senior&type=dry' },
    { a: { pet: 'dog', life: 'senior', type: 'any' }, matchQ: 'pet=dog&life=senior' },
  ];
  const runs: Run[] = [];
  await test.step('1. ตอบ 2 ชุด (สุนัขสูงวัย + เม็ด · สุนัขสูงวัย ค่าตั้งต้นขั้น 3) เก็บ slug การ์ดผล', async () => {
    for (const s of sets) runs.push(await runFinder(page, s.a));
  });
  const senior = (await listing(page, 'pet=dog&life=senior')).slugs;
  await test.step('2. เทียบกับรายการ ?pet=dog&life=senior', async () => {
    await check(page, 'ทุก slug อยู่ใน life=senior', null, async () => {
      expect.soft(runs.flatMap((r) => r.cards.filter((c) => !senior.includes(c.slug)).map((c) => `${r.label}: ${c.slug} ${c.score}%`))).toEqual([]);
    }, { actual: async () => `pet=dog&life=senior: ${senior.join(', ')}\n${summarize(runs)}` });
  });
  await test.step('3. ตรวจว่ามี puppy-chicken-dry / puppy-lamb-wet หรือไม่', async () => {
    await check(page, 'puppy-chicken-dry และ puppy-lamb-wet โผล่ 0 ครั้ง', null, async () => {
      expect.soft(runs.flatMap((r) => r.cards.filter((c) => c.slug === 'puppy-chicken-dry' || c.slug === 'puppy-lamb-wet').map((c) => `${r.label}: ${c.slug}`))).toEqual([]);
    }, { actual: async () => summarize(runs) });
  });
  for (let i = 0; i < sets.length; i++) {
    const m = await listing(page, sets[i].matchQ);
    if (m.slugs.length > 0) continue;
    const r = runs[i];
    await check(page, `${r.label}: ไม่มีของตรง (${sets[i].matchQ} = ${m.count}) ต้องมีข้อความ "ไม่พบ" และการ์ด 0 ใบ`, null, async () => {
      expect.soft(r.text).toMatch(/ไม่พบ/);
      expect.soft(r.cards.length).toBe(0);
    }, { actual: async () => summarize([r]) });
  }
});

test('TC-FND-013 ชุดคำตอบที่ไม่มีสินค้าตรงต้องบอกว่าไม่พบ ไม่เติมของอื่นมาแทน', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'สำหรับชุดที่ query เทียบได้ "พบ 0": Finder แสดงการ์ด 0 ใบ และมีข้อความที่มีคำว่า "ไม่พบ" · ชุดที่ query เทียบได้ N > 0: การ์ดผลทุกใบอยู่ใน N รายการนั้น · ไม่มีป้าย "🏆 ตรงใจที่สุด" บนการ์ดที่ "ตรงใจ" < 90% ในทั้ง 3 ชุด (ตอนนี้ล้ม: ไม่มีข้อความไม่พบ โชว์ของวัยอื่น 46–49% และให้ 🏆 กับชิ้น 49%)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R166 · Q38 · ความเสี่ยง: ลูกค้าเชื่อป้าย 🏆 แล้วซื้อของไม่ตรงความต้องการ · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const sets: Array<{ name: string; a: Answer; q: string }> = [
    { name: 'ชุด A', a: { pet: 'cat', life: 'senior', grainFree: true, type: 'any' }, q: 'pet=cat&life=senior&grainFree=1' },
    { name: 'ชุด B', a: { pet: 'dog', life: 'adult', grainFree: true, type: 'dry' }, q: 'pet=dog&life=adult&grainFree=1&type=dry' },
    { name: 'ชุด C', a: { pet: 'dog', life: 'senior', type: 'wet' }, q: 'pet=dog&life=senior&type=wet' },
  ];
  const ref: Record<string, { slugs: string[]; count: string }> = {};
  await test.step('1. เปิด query เทียบทั้ง 3 ใน /products จดว่า "พบ N"', async () => {
    for (const s of sets) {
      await page.goto(`/products?${s.q}`);
      const count = (await page.getByTestId('result-count').innerText()).trim();
      const slugs = await page.getByTestId('product-card').evaluateAll((es) => es.map((e) => e.getAttribute('data-slug') ?? ''));
      ref[s.name] = { slugs, count };
      await test.step(`${s.name} ?${s.q}: ${count} (${slugs.join(', ') || '-'})`, async () => {});
    }
  });
  const runs: Record<string, Run> = {};
  await test.step('2. ตอบ Finder ชุด A, B, C', async () => {
    for (const s of sets) runs[s.name] = await runFinder(page, s.a);
  });
  await test.step('3. นับการ์ดผล อ่านข้อความบนหน้าผล และดูป้าย 🏆', async () => {
    for (const s of sets) {
      const r = runs[s.name];
      const N = ref[s.name].slugs.length;
      if (N === 0) {
        await check(page, `${s.name} (${r.label}): query เทียบ "พบ 0" → การ์ด 0 ใบ และมีข้อความ "ไม่พบ"`, null, async () => {
          expect.soft(r.cards.map((c) => `${c.slug} ${c.score}%`)).toEqual([]);
          expect.soft(r.text).toMatch(/ไม่พบ/);
        }, { actual: async () => `${ref[s.name].count}\n${summarize([r])}` });
      } else {
        await check(page, `${s.name} (${r.label}): query เทียบ ${ref[s.name].count} → การ์ดผลทุกใบอยู่ใน ${N} รายการนั้น`, null, async () => {
          expect.soft(r.cards.filter((c) => !ref[s.name].slugs.includes(c.slug)).map((c) => `${c.slug} ${c.score}%`)).toEqual([]);
        }, { actual: async () => `ref: ${ref[s.name].slugs.join(', ')}\n${summarize([r])}` });
      }
    }
    await check(page, 'ไม่มีป้าย "🏆 ตรงใจที่สุด" บนการ์ดที่ "ตรงใจ" < 90% ในทั้ง 3 ชุด', null, async () => {
      expect.soft(Object.values(runs).flatMap((r) => r.cards.filter((c) => c.best && !(c.score >= 90)).map((c) => `${r.label}: ${c.slug} ${c.score}%`))).toEqual([]);
    }, { actual: async () => summarize(Object.values(runs)) });
  });
});

test('TC-FND-014 ตัวเลือกในขั้น 3 มีตามที่ออกแบบ (ไม่มีตัวเลือกทางเดินปัสสาวะ/ก้อนขน)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ทั้งแมวและหมา: checkbox 2 อัน คือ "ไม่เอาสูตรไก่" และ "เกรนฟรีเท่านั้น" · ตัวเลือกประเภท 4 แบบ (แบบไหนก็ได้ · เม็ด · เปียก · ขนม) โดย "แบบไหนก็ได้" ถูกเลือกไว้ก่อน · ไม่มีตัวเลือกเรื่องทางเดินปัสสาวะหรือก้อนขน · ทุก checkbox มีป้ายชื่อที่ผูกกับช่อง (`<label for>` หรือ `aria-label`)' },
    { type: 'source', description: '[O-ยังไม่ยืนยัน]+[R] · Q39 (ตรวจตามสมมติฐาน 8.3 ซึ่งตรงข้ามกับ R167 ⚠️ — ถ้าทีมตอบว่าต้องมีตัวเลือก ให้กลับผลเป็น "มีตัวเลือกทางเดินปัสสาวะและก้อนขน") · ความเสี่ยง: ตัวเลือกเปลี่ยนโดยไม่มีใครรู้ (เป็นฐานของ TC อื่น) · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  const step3Checks = async (who: string) => {
    const step = page.locator('.finder-step');
    const boxes = step.locator('input[type="checkbox"]');
    await check(page, `${who}: checkbox 2 อัน คือ "ไม่เอาสูตรไก่" และ "เกรนฟรีเท่านั้น"`, boxes, async (el) => {
      await expect.soft(el).toHaveCount(2);
      await expect.soft(page.getByLabel(/ไม่เอาสูตรไก่/)).toHaveCount(1);
      await expect.soft(page.getByLabel(/เกรนฟรีเท่านั้น/)).toHaveCount(1);
    }, { actual: async () => (await step.locator('label').allInnerTexts()).join(' | ') });
    const sel = page.getByTestId('finder-type');
    await check(page, `${who}: ตัวเลือกประเภท 4 แบบ (แบบไหนก็ได้ · เม็ด · เปียก · ขนม) โดย "แบบไหนก็ได้" ถูกเลือกไว้ก่อน`, sel, async (el) => {
      const opts = await el.locator('option').allInnerTexts();
      expect.soft(opts.length).toBe(4);
      expect.soft(opts[0] ?? '').toMatch(/แบบไหนก็ได้/);
      expect.soft(opts[1] ?? '').toMatch(/เม็ด/);
      expect.soft(opts[2] ?? '').toMatch(/เปียก/);
      expect.soft(opts[3] ?? '').toMatch(/ขนม/);
      expect.soft(await el.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent ?? '')).toMatch(/แบบไหนก็ได้/);
    }, { actual: async () => `${(await sel.locator('option').allInnerTexts()).join(' | ')} · selected=${await sel.inputValue()}` });
    await check(page, `${who}: ไม่มีตัวเลือกเรื่องทางเดินปัสสาวะหรือก้อนขน`, step, async (el) => {
      await expect.soft(el).not.toContainText(/ทางเดินปัสสาวะ|ก้อนขน/);
    });
    await check(page, `${who}: ทุก checkbox มีป้ายชื่อที่ผูกกับช่อง (<label for> หรือ aria-label)`, boxes, async (el) => {
      const bad = await el.evaluateAll((es) =>
        es
          .filter((e) => {
            const i = e as HTMLInputElement;
            const hasLabel = (i.labels?.length ?? 0) > 0 && [...(i.labels ?? [])].some((l) => (l.textContent ?? '').trim() !== '');
            return !hasLabel && !(i.getAttribute('aria-label') ?? '').trim() && !i.getAttribute('aria-labelledby');
          })
          .map((e) => e.outerHTML),
      );
      expect.soft(bad).toEqual([]);
    });
  };
  await test.step('1. ตอบแมว → แมวโต ไปขั้น 3 นับ checkbox และตัวเลือกประเภท', async () => {
    await finderToStep3(page, 'cat', 'adult');
    await step3Checks('แมวโต');
  });
  await test.step('2. กด "↺ เริ่มใหม่" แล้วตอบหมา → สุนัขโต ไปขั้น 3 นับอีกครั้ง', async () => {
    await page.getByTestId('finder-submit').click();
    await page.getByTestId('finder-restart').click();
    await answerSteps12(page, 'dog', 'adult');
    await step3Checks('สุนัขโต');
  });
});

test('TC-FND-015 ประเภท "แบบไหนก็ได้" อันดับ 1 ต้องเป็นอาหารหลัก ไม่ใช่ขนม', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'การ์ดอันดับ 1 ของทั้ง 2 ชุดมีประเภทเป็น อาหารเม็ด หรือ อาหารเปียก (slug อยู่ใน `?type=dry` หรือ `?type=wet`) · ไม่อยู่ใน `?type=treat` (ตอนนี้ล้ม: อันดับ 1 เป็นขนม — ขนมแมวเลีย 99%, เป็ดอบแห้ง 99%)' },
    { type: 'source', description: '[O-ยังไม่ยืนยัน] · R168 · Q40 · ความเสี่ยง: ลูกค้าซื้อขนมแทนอาหารหลัก · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const dry = (await listing(page, 'type=dry')).slugs;
  const wet = (await listing(page, 'type=wet')).slugs;
  const treat = (await listing(page, 'type=treat')).slugs;
  const sets: Array<[string, Answer]> = [
    ['1. ตอบชุดแมวโต ดูการ์ดอันดับ 1 เปิดหน้ารายละเอียดดูประเภท', { pet: 'cat', life: 'adult', type: 'any' }],
    ['2. ทำซ้ำกับชุดสุนัขโต', { pet: 'dog', life: 'adult', type: 'any' }],
  ];
  for (const [title, a] of sets) {
    await test.step(title, async () => {
      const r = await runFinder(page, a);
      const top = r.cards[0];
      const first = page.getByTestId('finder-result').first();
      await check(page, `${r.label}: การ์ดอันดับ 1 (${top?.slug ?? '-'}) อยู่ใน ?type=dry หรือ ?type=wet ไม่อยู่ใน ?type=treat`, first, async () => {
        expect.soft(top, 'ต้องมีการ์ดอันดับ 1').toBeTruthy();
        expect.soft(dry.includes(top?.slug ?? '') || wet.includes(top?.slug ?? '')).toBe(true);
        expect.soft(treat.includes(top?.slug ?? '')).toBe(false);
      }, { actual: async () => summarize([r]) });
      const kind = top ? await pdpFact(page, top.slug, 'ประเภท') : null;
      await check(page, `${r.label}: หน้ารายละเอียดของอันดับ 1 มีประเภทเป็น อาหารเม็ด หรือ อาหารเปียก`, page.locator('.pd-facts'), async () => {
        expect.soft(kind ?? '').toMatch(/^(อาหารเม็ด|อาหารเปียก)$/);
      }, { actual: async () => `${top?.slug}: ประเภท = ${kind}` });
    });
  }
});

test('TC-FND-016 ปุ่ม "← ย้อนกลับ" ในแอปต้องจำคำตอบเดิม', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: ปุ่ม "แมว" อยู่ในสถานะเลือก (`aria-pressed="true"` หรือ `aria-checked="true"`) และ "ถัดไป →" กดได้ · ขั้นที่ 4: "แมวสูงวัย" อยู่ในสถานะเลือก · checkbox "เกรนฟรีเท่านั้น" มี `checked` · ประเภทยังเป็น "แบบไหนก็ได้"' },
    { type: 'source', description: '[R] · R169 · ความเสี่ยง: ย้อนกลับแล้วต้องตอบใหม่ทั้งหมด · เทคนิค: State · Happy path' },
  ],
}, async ({ page }) => {
  await test.step('1. ตอบ แมว → แมวสูงวัย → ติ๊ก "เกรนฟรีเท่านั้น" จนถึงขั้น 3', async () => {
    await finderToStep3(page, 'cat', 'senior');
    await page.getByTestId('finder-grainfree').check();
  });
  await test.step('2. กด "← ย้อนกลับ" 2 ครั้ง (กลับถึงขั้น 1)', async () => {
    await page.getByTestId('finder-back').click();
    await page.getByTestId('finder-life-senior').waitFor();
    await page.getByTestId('finder-back').click();
    await page.getByTestId('finder-pet-cat').waitFor();
  });
  await test.step('3. ดูสถานะปุ่ม "แมว"', async () => {
    const cat = page.getByTestId('finder-pet-cat');
    await check(page, 'ขั้นที่ 3: ปุ่ม "แมว" อยู่ในสถานะเลือก (aria-pressed/aria-checked="true")', cat, async (el) => {
      await expect.soft.poll(() => pressed(el)).toBe(true);
    }, { actual: async () => cat.evaluate((e) => e.outerHTML.replace(/<span.*?<\/span>/g, '')) });
    const next = page.getByTestId('finder-next');
    await check(page, 'ขั้นที่ 3: "ถัดไป →" กดได้', next, async (el) => {
      await expect.soft(el).toBeEnabled();
      expect.soft(await isDisabled(el)).toBe(false);
    });
  });
  await test.step('4. กด "ถัดไป →" ดูสถานะ "แมวสูงวัย" แล้วกด "ถัดไป →" ดู checkbox', async () => {
    await page.getByTestId('finder-next').click();
    const senior = page.getByTestId('finder-life-senior');
    await check(page, 'ขั้นที่ 4: "แมวสูงวัย" อยู่ในสถานะเลือก', senior, async (el) => {
      await expect.soft.poll(() => pressed(el)).toBe(true);
    }, { actual: async () => senior.evaluate((e) => e.outerHTML.replace(/<span.*?<\/span>/g, '')) });
    await page.getByTestId('finder-next').click({ timeout: 5000 }).catch(() => {});
    await check(page, 'ขั้นที่ 4: checkbox "เกรนฟรีเท่านั้น" มี checked', page.getByTestId('finder-grainfree'), async (el) => {
      await expect.soft(el).toBeChecked();
    }, { actual: async () => String(await page.getByTestId('finder-grainfree').isChecked().catch(() => '(ไม่พบ)')) });
    await check(page, 'ขั้นที่ 4: ประเภทยังเป็น "แบบไหนก็ได้"', page.getByTestId('finder-type'), async (el) => {
      await expect.soft(el).toHaveValue('any');
    });
  });
});

test('TC-FND-017 ย้อนไปเปลี่ยนสัตว์ต้องล้างคำตอบเรื่องวัย และตัวเลือกที่ค้างต้องตรงกับผล', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: ตัวเลือกวัยเป็นของหมา 3 แบบ (ลูกสุนัข · สุนัขโต · สุนัขสูงวัย) ไม่มีอันใดอยู่ในสถานะเลือก · "ถัดไป →" มี `disabled` · ขั้นที่ 4–5: ถ้า "เกรนฟรีเท่านั้น" ยังติ๊ก ทุกการ์ดผลต้องอยู่ใน `grainFree=1` · ถ้าไม่ติ๊ก ผลต้องมี slug และลำดับเดียวกับขั้นที่ 6 · ไม่มีสินค้าแมวในผล' },
    { type: 'source', description: '[R] · R169 · ความเสี่ยง: คำตอบของแมวติดไปกรองผลของหมาโดยผู้ใช้ไม่รู้ · เทคนิค: State' },
  ],
}, async ({ page }) => {
  let gfChecked = false;
  let after: Run | undefined;
  let base: Run | undefined;
  await test.step('1. ตอบ แมว → แมวสูงวัย → ติ๊ก "เกรนฟรีเท่านั้น" จนถึงขั้น 3 แล้วกด "← ย้อนกลับ" 2 ครั้ง', async () => {
    await finderToStep3(page, 'cat', 'senior');
    await page.getByTestId('finder-grainfree').check();
    await page.getByTestId('finder-back').click();
    await page.getByTestId('finder-life-senior').waitFor();
    await page.getByTestId('finder-back').click();
    await page.getByTestId('finder-pet-dog').waitFor();
  });
  await test.step('2. เลือก "หมา" กด "ถัดไป →"', async () => {
    await page.getByTestId('finder-pet-dog').click();
    await page.getByTestId('finder-next').click();
  });
  await test.step('3. ดูตัวเลือกวัยและปุ่ม "ถัดไป →"', async () => {
    const lifeBtns = page.locator('[data-testid^="finder-life-"]');
    await check(page, 'ขั้นที่ 3: ตัวเลือกวัยเป็นของหมา 3 แบบ (ลูกสุนัข · สุนัขโต · สุนัขสูงวัย)', lifeBtns, async (el) => {
      await expect.soft(el).toHaveCount(3);
      await expect.soft(page.getByTestId('finder-life-baby')).toContainText('ลูกสุนัข');
      await expect.soft(page.getByTestId('finder-life-adult')).toContainText('สุนัขโต');
      await expect.soft(page.getByTestId('finder-life-senior')).toContainText('สุนัขสูงวัย');
    }, { actual: async () => (await lifeBtns.allInnerTexts()).join(' | ') });
    await check(page, 'ขั้นที่ 3: ไม่มีตัวเลือกวัยใดอยู่ในสถานะเลือก', lifeBtns, async (el) => {
      const st = await el.evaluateAll((es) => es.map((e) => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true'));
      expect.soft(st.filter(Boolean).length).toBe(0);
    }, { actual: async () => lifeBtns.evaluateAll((es) => es.map((e) => `${e.textContent}: aria-pressed=${e.getAttribute('aria-pressed')}`).join(' | ')) });
    await check(page, 'ขั้นที่ 3: "ถัดไป →" มี disabled', page.getByTestId('finder-next'), async (el) => {
      await expect.soft.poll(() => isDisabled(el)).toBe(true);
    });
  });
  await test.step('4. เลือก "สุนัขโต" ไปขั้น 3 จดสถานะ checkbox แล้วดูผล', async () => {
    await page.getByTestId('finder-life-adult').click();
    await page.getByTestId('finder-next').click();
    gfChecked = await page.getByTestId('finder-grainfree').isChecked();
    await test.step(`สถานะ checkbox "เกรนฟรีเท่านั้น" = ${gfChecked ? 'ติ๊กอยู่' : 'ไม่ติ๊ก'} · "ไม่เอาสูตรไก่" = ${(await page.getByTestId('finder-no-chicken').isChecked()) ? 'ติ๊กอยู่' : 'ไม่ติ๊ก'}`, async () => {});
    after = await submitAndRead(page, { pet: 'dog', life: 'adult', grainFree: gfChecked });
  });
  await test.step('6. กด "↺ เริ่มใหม่" ตอบ หมา → สุนัขโต ค่าตั้งต้นขั้น 3 จด slug และลำดับเป็นฐานเทียบ', async () => {
    await page.getByTestId('finder-restart').click();
    await answerSteps12(page, 'dog', 'adult');
    await setStep3(page, { pet: 'dog', life: 'adult' });
    base = await submitAndRead(page, { pet: 'dog', life: 'adult' });
  });
  const A = after as Run;
  const B = base as Run;
  await test.step('5. เทียบผลกับ /products?pet=dog&life=adult (และ &grainFree=1 ถ้า checkbox ยังติ๊กอยู่)', async () => {
    const cat = (await listing(page, 'pet=cat')).slugs;
    if (gfChecked) {
      // ผลที่คาดหวังข้อนี้ตรวจเฉพาะ "ทุกการ์ดผลต้องอยู่ใน grainFree=1" (ของหมา) — เรื่องวัยตรงหรือไม่ตรวจที่ TC-FND-010…013
      const gf = (await listing(page, 'pet=dog&grainFree=1')).slugs;
      await check(page, 'ขั้นที่ 4–5: "เกรนฟรีเท่านั้น" ยังติ๊ก → ทุกการ์ดผลต้องอยู่ใน grainFree=1', null, async () => {
        expect.soft(A.cards.filter((c) => !gf.includes(c.slug)).map((c) => `${c.slug} ${c.score}%`)).toEqual([]);
      }, { actual: async () => `pet=dog&grainFree=1: ${gf.join(', ')}\nผล: ${summarize([A])}` });
    } else {
      await check(page, 'ขั้นที่ 4–5: checkbox ไม่ติ๊ก → slug และลำดับเดียวกับขั้นที่ 6', null, async () => {
        expect.soft(A.cards.map((c) => c.slug)).toEqual(B.cards.map((c) => c.slug));
      }, { actual: async () => `ขั้นที่ 4: ${A.cards.map((c) => c.slug).join(', ')}\nขั้นที่ 6: ${B.cards.map((c) => c.slug).join(', ')}` });
    }
    await check(page, 'ไม่มีสินค้าแมวในผล', null, async () => {
      expect.soft(A.cards.filter((c) => cat.includes(c.slug)).map((c) => c.slug)).toEqual([]);
    }, { actual: async () => summarize([A]) });
  });
});

test('TC-FND-018 reload ระหว่างตอบและที่หน้าผลต้องไม่ทำให้คำตอบหาย', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: ยังอยู่ขั้น 3 · "แมว" และ "แมวโต" ยังถูกเลือก · checkbox "ไม่เอาสูตรไก่" มี `checked` · ขั้นที่ 3: หลัง reload ได้การ์ดผล slug และลำดับเดียวกับก่อน reload (ตอนนี้ล้ม: reload กลับไปขั้น 1 คำตอบหายหมด)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R170 · Q41 · ความเสี่ยง: ผู้ใช้หลงทาง ต้องตอบใหม่ · เทคนิค: State' },
  ],
}, async ({ page }) => {
  let before: string[] = [];
  await test.step('1. ตอบ แมว → แมวโต → ติ๊ก "ไม่เอาสูตรไก่" ถึงขั้น 3 (ยังไม่ดูผล) กด F5', async () => {
    await finderToStep3(page, 'cat', 'adult');
    await page.getByTestId('finder-no-chicken').check();
    await page.reload();
    await page.getByTestId('finder-progress').waitFor();
  });
  await test.step('2. ดูว่าอยู่ขั้นไหนและคำตอบที่เลือก', async () => {
    await check(page, 'ขั้นที่ 2: ยังอยู่ขั้น 3', page.getByTestId('finder-progress'), async (el) => {
      await expect.soft(el).toHaveAttribute('data-step', '3');
    }, { actual: async () => `data-step=${await page.getByTestId('finder-progress').getAttribute('data-step')}` });
    await check(page, 'ขั้นที่ 2: checkbox "ไม่เอาสูตรไก่" มี checked', page.getByTestId('finder-no-chicken'), async (el) => {
      await expect.soft(el).toBeChecked();
    }, { actual: async () => String(await page.getByTestId('finder-no-chicken').isChecked({ timeout: 1000 }).catch(() => '(ไม่พบ checkbox)')) });
    // ดูคำตอบขั้น 1–2 โดยกด "← ย้อนกลับ" (ถ้าอยู่ขั้น 3 จริง)
    if (await page.getByTestId('finder-back').isVisible()) {
      await page.getByTestId('finder-back').click();
      await page.getByTestId('finder-life-adult').waitFor({ timeout: 3000 }).catch(() => {});
    }
    const adult = page.getByTestId('finder-life-adult');
    await check(page, 'ขั้นที่ 2: "แมวโต" ยังถูกเลือก', adult, async (el) => {
      await expect.soft.poll(() => pressed(el)).toBe(true);
    }, { actual: async () => ((await adult.count()) ? adult.evaluate((e) => `${e.textContent} aria-pressed=${e.getAttribute('aria-pressed')}`) : '(ไม่พบปุ่มแมวโต — ไม่ได้อยู่ขั้น 2/3)') });
    if (await page.getByTestId('finder-back').isVisible()) {
      await page.getByTestId('finder-back').click();
      await page.getByTestId('finder-pet-cat').waitFor({ timeout: 3000 }).catch(() => {});
    }
    const cat = page.getByTestId('finder-pet-cat');
    await check(page, 'ขั้นที่ 2: "แมว" ยังถูกเลือก', cat, async (el) => {
      await expect.soft.poll(() => pressed(el)).toBe(true);
    }, { actual: async () => ((await cat.count()) ? cat.evaluate((e) => `${e.textContent} aria-pressed=${e.getAttribute('aria-pressed')}`) : '(ไม่พบ)') });
  });
  await test.step('3. ไปหน้าผล จด slug และลำดับ แล้วกด F5 อีกครั้ง', async () => {
    const r = await runFinder(page, { pet: 'cat', life: 'adult', noChicken: true, type: 'any' });
    before = r.cards.map((c) => c.slug);
    await test.step(`ก่อน reload: ${before.join(', ')}`, async () => {});
    await page.reload();
    await page.getByTestId('finder-progress').waitFor();
    await page.getByTestId('finder-result').first().waitFor({ timeout: 5000 }).catch(() => {});
  });
  await check(page, 'ขั้นที่ 3: หลัง reload ได้การ์ดผล slug และลำดับเดียวกับก่อน reload', page.getByTestId('finder-result'), async () => {
    expect.soft((await readCards(page)).map((c) => c.slug)).toEqual(before);
  }, { actual: async () => `ก่อน: ${before.join(', ')}\nหลัง: ${(await readCards(page)).map((c) => c.slug).join(', ') || '(0 การ์ด)'}` });
});

test('TC-FND-019 ปุ่ม back/forward ของเบราว์เซอร์ที่หน้าผลต้องไม่ทำให้คำตอบ Finder หาย', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: บันทึก URL และหน้าจอเป็นหลักฐาน (ไม่ใช้ตัดสินผ่าน/ล้ม จนกว่าทีมตอบ Q41 ส่วนเพิ่มเติมว่า back ต้องถอยทีละขั้นภายใน `/finder` หรือไม่) · ขั้นที่ 4 (เกณฑ์หลัก ตามสมมติฐาน Q41 "ต้องคงคำตอบ"): กลับมาหน้าผลที่มี slug ชุดเดียวกับขั้นที่ 2 (ตอนนี้ล้ม: back ออกไป `/products` ทันที forward กลับมาก็เริ่มใหม่)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R170 · Q41 (เพิ่มเติม: back ถอยทีละขั้นของ Finder หรือออกจาก Finder) · ความเสี่ยง: กด back แล้วเสียคำตอบทั้งหมด · เทคนิค: State' },
  ],
}, async ({ page }) => {
  let slugs: string[] = [];
  await test.step('1. เปิด /products กดเมนู "ช่วยเลือกอาหาร"', async () => {
    await page.goto('/products');
    await page.getByTestId('nav-finder').click();
    await page.waitForURL(/\/finder/);
  });
  await test.step('2. ตอบ หมา → สุนัขโต → ค่าตั้งต้นขั้น 3 จนเห็นหน้าผล จด slug', async () => {
    await answerSteps12(page, 'dog', 'adult');
    const r = await submitAndRead(page, { pet: 'dog', life: 'adult' });
    slugs = r.cards.map((c) => c.slug);
    await test.step(`ผล: ${slugs.join(', ')}`, async () => {});
  });
  await test.step('3. กด back ของเบราว์เซอร์ 1 ครั้ง ดู URL และหน้าจอ (บันทึกเป็นหลักฐาน ไม่ใช้ตัดสินผล — รอ Q41)', async () => {
    await page.goBack();
    await page.waitForLoadState();
    await page.waitForTimeout(300);
    await test.info().attach('หลัง back: URL', { body: page.url(), contentType: 'text/plain' });
    await test.info().attach('หลัง back: หน้าจอ', { body: await page.screenshot(), contentType: 'image/png' });
  });
  await test.step('4. กด forward 1 ครั้ง', async () => {
    await page.goForward();
    await page.waitForLoadState();
    await page.locator('[data-testid="finder-result"], [data-testid="finder-pet-dog"]').first().waitFor({ timeout: 5000 }).catch(() => {});
  });
  await check(page, 'ขั้นที่ 4: กลับมาหน้าผลที่มี slug ชุดเดียวกับขั้นที่ 2', page.getByTestId('finder-result'), async () => {
    expect.soft((await readCards(page)).map((c) => c.slug)).toEqual(slugs);
  }, { actual: async () => `URL: ${page.url()}\nขั้นที่ 2: ${slugs.join(', ')}\nหลัง forward: ${(await readCards(page)).map((c) => c.slug).join(', ') || '(0 การ์ด)'}` });
});

test('TC-FND-020 "↺ เริ่มใหม่" ต้องล้างทุกคำตอบ', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: กลับมาขั้น 1 ไม่มีสัตว์ใดอยู่ในสถานะเลือก · "ถัดไป →" มี `disabled` · ขั้น 2 ไม่มีวัยใดถูกเลือก · ขั้น 3: ทั้ง 2 checkbox ไม่มี `checked` · ประเภท = "แบบไหนก็ได้" · การ์ดผลเดิม 0 ใบระหว่างนี้' },
    { type: 'source', description: '[R] · R171 · ความเสี่ยง: คำตอบเก่าค้างไปกรองรอบใหม่ · เทคนิค: State' },
  ],
}, async ({ page }) => {
  const results = page.getByTestId('finder-result');
  await test.step('1. ตอบ หมา → สุนัขโต → ติ๊ก "ไม่เอาสูตรไก่" → ประเภท ขนม แล้วดูผล', async () => {
    await runFinder(page, { pet: 'dog', life: 'adult', noChicken: true, type: 'treat' });
  });
  await test.step('2. กด "↺ เริ่มใหม่"', async () => {
    await page.getByTestId('finder-restart').click();
  });
  await test.step('3. ดูขั้น 1 แล้วตอบ "หมา" → "ถัดไป →" ดูขั้น 2 → เลือก "สุนัขโต" ไปขั้น 3', async () => {
    const pets = page.locator('[data-testid^="finder-pet-"]');
    await check(page, 'กลับมาขั้น 1 ไม่มีสัตว์ใดอยู่ในสถานะเลือก', pets, async (el) => {
      await expect.soft(page.getByTestId('finder-progress')).toHaveAttribute('data-step', '1');
      await expect.soft(el).toHaveCount(2);
      const st = await el.evaluateAll((es) => es.map((e) => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true'));
      expect.soft(st.filter(Boolean).length).toBe(0);
    }, { actual: async () => pets.evaluateAll((es) => es.map((e) => `${e.textContent}: aria-pressed=${e.getAttribute('aria-pressed')}`).join(' | ')) });
    await check(page, 'ขั้น 1: "ถัดไป →" มี disabled', page.getByTestId('finder-next'), async (el) => {
      await expect.soft.poll(() => isDisabled(el)).toBe(true);
    });
    await check(page, 'การ์ดผลเดิม 0 ใบ (ขั้น 1)', results, async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await page.getByTestId('finder-pet-dog').click();
    await page.getByTestId('finder-next').click();
    const lifes = page.locator('[data-testid^="finder-life-"]');
    await check(page, 'ขั้น 2 ไม่มีวัยใดถูกเลือก', lifes, async (el) => {
      await expect.soft(el).toHaveCount(3);
      const st = await el.evaluateAll((es) => es.map((e) => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true'));
      expect.soft(st.filter(Boolean).length).toBe(0);
    }, { actual: async () => lifes.evaluateAll((es) => es.map((e) => `${e.textContent}: aria-pressed=${e.getAttribute('aria-pressed')}`).join(' | ')) });
    await check(page, 'การ์ดผลเดิม 0 ใบ (ขั้น 2)', results, async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await page.getByTestId('finder-life-adult').click();
    await page.getByTestId('finder-next').click();
    await check(page, 'ขั้น 3: "ไม่เอาสูตรไก่" ไม่มี checked', page.getByTestId('finder-no-chicken'), async (el) => {
      await expect.soft(el).not.toBeChecked();
    });
    await check(page, 'ขั้น 3: "เกรนฟรีเท่านั้น" ไม่มี checked', page.getByTestId('finder-grainfree'), async (el) => {
      await expect.soft(el).not.toBeChecked();
    });
    await check(page, 'ขั้น 3: ประเภท = "แบบไหนก็ได้"', page.getByTestId('finder-type'), async (el) => {
      await expect.soft(el).toHaveValue('any');
    });
    await check(page, 'การ์ดผลเดิม 0 ใบ (ขั้น 3)', results, async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
  });
});

test('TC-FND-021 Finder แนะนำเฉพาะอาหาร/ขนม ไม่มีของเล่น/ของใช้', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'slug ที่อยู่ใน `?type=toy` หรือ `?type=accessory` โผล่ 0 ครั้งใน 96 ชุด · `dog-squeaky-ball` = 0 ครั้ง · ทุก slug อยู่ใน `?type=dry`, `?type=wet` หรือ `?type=treat`' },
    { type: 'source', description: '[R] · R172 · ความเสี่ยง: "ตัวช่วยเลือกอาหาร" แนะนำของที่ไม่ใช่อาหาร · เทคนิค: Equivalence partition · Negative' },
  ],
}, async ({ page }) => {
  test.setTimeout(300_000);
  let toy: string[] = [];
  let acc: string[] = [];
  let food: string[] = [];
  let runs: Run[] = [];
  await test.step('เตรียม: เก็บ slug จาก /products?type=toy และ /products?type=accessory (และ dry/wet/treat)', async () => {
    toy = (await listing(page, 'type=toy')).slugs;
    acc = (await listing(page, 'type=accessory')).slugs;
    food = [...(await listing(page, 'type=dry')).slugs, ...(await listing(page, 'type=wet')).slugs, ...(await listing(page, 'type=treat')).slugs];
  });
  await test.step('1. รันสคริปต์ 96 ชุดใหม่ (test แต่ละข้อต้องอิสระต่อกัน)', async () => {
    runs = await runMany(page, allAnswers());
  });
  await test.step('2. เทียบกับรายการของเล่นและของใช้', async () => {
    const all = runs.flatMap((r) => r.cards.map((c) => ({ r: r.label, s: c.slug })));
    await check(page, 'slug ที่อยู่ใน ?type=toy หรือ ?type=accessory โผล่ 0 ครั้งใน 96 ชุด', null, async () => {
      expect.soft(runs.length).toBe(96);
      expect.soft(all.filter((x) => toy.includes(x.s) || acc.includes(x.s)).map((x) => `${x.r}: ${x.s}`)).toEqual([]);
    }, { actual: async () => `toy: ${toy.join(', ')}\naccessory: ${acc.join(', ')}\n\n${summarize(runs)}` });
    await check(page, 'dog-squeaky-ball = 0 ครั้ง', null, async () => {
      expect.soft(all.filter((x) => x.s === 'dog-squeaky-ball').length).toBe(0);
    }, { actual: async () => `dog-squeaky-ball โผล่ ${all.filter((x) => x.s === 'dog-squeaky-ball').length} ครั้ง` });
    await check(page, 'ทุก slug อยู่ใน ?type=dry, ?type=wet หรือ ?type=treat', null, async () => {
      expect.soft(all.filter((x) => !food.includes(x.s)).map((x) => `${x.r}: ${x.s}`)).toEqual([]);
    }, { actual: async () => `dry+wet+treat: ${food.join(', ')}` });
  });
});

test('TC-REC-001 ผู้ใช้ใหม่ (ไม่มีประวัติ) ยังได้กล่องแนะนำที่ใช้ได้จริง และไม่มีของหมด', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: `pp-recent` ไม่มี key หรือเป็น `[]` · ขั้นที่ 3: การ์ด ≥ 1 ใบ · ไม่มี `freeze-dried-chicken-cat` · การ์ดป้าย "หมด" = 0 · ทุกลิงก์ไปหน้า `/products/<slug>` ที่ได้ HTTP 200 · ขั้นที่ 4: ทุกการ์ดผ่านเงื่อนไขเดียวกับขั้นที่ 3 (≥ 1 ใบ · ไม่มีของหมด · ลิงก์ได้ HTTP 200) โดยไม่บังคับให้ slug/ลำดับคงที่ จนกว่าทีมตอบ Q54 · console error = 0' },
    { type: 'source', description: '[R]+[D]+[O-ยังไม่ยืนยัน] · R173 · R176 · Q54 · ความเสี่ยง: หน้าแรกของลูกค้าใหม่มีกล่องว่าง/ลิงก์เสีย · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  const errs = trackConsole(page);
  const box = page.getByTestId('recommended-for-you');
  let slugs: string[] = [];
  const verifyBox = async (round: string) => {
    slugs = await boxSlugs(page, 'recommended-for-you');
    const cards = box.getByTestId('product-card');
    await check(page, `${round}: การ์ด ≥ 1 ใบ`, cards, async () => {
      expect.soft(slugs.length).toBeGreaterThanOrEqual(1);
    }, { actual: async () => slugs.join(', ') || '(0 การ์ด)' });
    await check(page, `${round}: ไม่มี ${FREEZE}`, box, async () => {
      expect.soft(slugs).not.toContain(FREEZE);
    }, { actual: async () => slugs.join(', ') });
    await check(page, `${round}: การ์ดป้าย "หมด" = 0`, box, async (el) => {
      await expect.soft(el.getByTestId('stock-badge').filter({ hasText: /^\s*หมด\s*$/ })).toHaveCount(0);
      await expect.soft(el.getByRole('button', { name: 'สินค้าหมด' })).toHaveCount(0);
    });
    const hrefs = await cards.evaluateAll((es) => es.map((e) => e.querySelector('a[href^="/products/"]')?.getAttribute('href') ?? ''));
    const statuses: string[] = [];
    for (const h of hrefs) statuses.push(`${h} → ${h ? (await page.request.get(`${baseURL()}${h}`)).status() : 'ไม่มีลิงก์'}`);
    await check(page, `${round}: ทุกลิงก์ไปหน้า /products/<slug> ที่ได้ HTTP 200`, cards, async () => {
      expect.soft(hrefs.length).toBe(slugs.length);
      for (let i = 0; i < hrefs.length; i++) {
        expect.soft(hrefs[i]).toBe(`/products/${slugs[i]}`);
        expect.soft(statuses[i]).toMatch(/→ 200$/);
      }
    }, { actual: async () => statuses.join('\n') });
  };
  await test.step('1. เปิด / เลื่อนไปกล่อง "แนะนำสำหรับคุณ"', async () => {
    await page.goto('/');
    await box.scrollIntoViewIfNeeded();
  });
  await test.step('2. อ่านค่า pp-recent ใน localStorage', async () => {
    await check(page, 'ขั้นที่ 2: pp-recent ไม่มี key หรือเป็น []', null, async () => {
      const v = await lsRaw(page, 'pp-recent');
      expect.soft(isEmptyList(v)).toBe(true);
    }, { actual: () => lsRaw(page, 'pp-recent') });
  });
  await test.step('3. นับการ์ด จด slug และลำดับ เปิดลิงก์ของแต่ละการ์ด', async () => {
    await verifyBox('ขั้นที่ 3');
  });
  for (const i of [1, 2]) {
    await test.step(`4. reload / ครั้งที่ ${i} จด slug อีกรอบ`, async () => {
      await page.reload();
      await box.scrollIntoViewIfNeeded();
      await verifyBox(`ขั้นที่ 4 (reload ครั้งที่ ${i})`);
    });
  }
  await check(page, 'console error = 0', null, async () => {
    expect.soft(errs).toEqual([]);
  }, { actual: async () => (errs.length ? errs : 'console error 0') });
});

test('TC-REC-002 ดูสินค้าแมวแล้วคำแนะนำเปลี่ยนเป็นของแมว ไม่ซ้ำของที่เพิ่งดู และเปลี่ยนตามทันทีเมื่อดูของหมา', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: `pp-recent` = 3 ชิ้น ใหม่สุดอยู่หน้า (`senior-tuna-dry` ตัวแรก) · การ์ดแนะนำทุกใบอยู่ใน `?pet=cat` · ไม่มี slug ใดที่อยู่ใน `pp-recent` · ขั้นที่ 3: มีการ์ดที่อยู่ใน `?pet=dog` ≥ 1 ใบ · ไม่มี `puppy-lamb-wet` และไม่มี 3 ชิ้นที่ดูไปแล้ว' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R174 · Q42 · ความเสี่ยง: แนะนำของที่ลูกค้าเพิ่งดูซ้ำ/ไม่ตามความสนใจ · เทคนิค: Happy path · State' },
  ],
}, async ({ page }) => {
  const cat = (await listing(page, 'pet=cat')).slugs;
  const dog = (await listing(page, 'pet=dog')).slugs;
  const viewed = ['kitten-salmon-dry', 'adult-chicken-dry', 'senior-tuna-dry'];
  await test.step('1. เปิดหน้าสินค้าแมว 3 ชิ้นตามลำดับ', async () => {
    for (const s of viewed) await viewProduct(page, s);
  });
  await test.step('2. เปิด / จด slug ในกล่อง "แนะนำสำหรับคุณ" และอ่าน pp-recent', async () => {
    await page.goto('/');
    const rec = await boxSlugs(page, 'recommended-for-you');
    const recent = await lsArr(page, 'pp-recent');
    await check(page, 'ขั้นที่ 2: pp-recent = 3 ชิ้น ใหม่สุดอยู่หน้า (senior-tuna-dry ตัวแรก)', null, async () => {
      expect.soft(recent).toEqual(['senior-tuna-dry', 'adult-chicken-dry', 'kitten-salmon-dry']);
    }, { actual: () => lsRaw(page, 'pp-recent') });
    const box = page.getByTestId('recommended-for-you');
    await check(page, 'ขั้นที่ 2: การ์ดแนะนำทุกใบอยู่ใน ?pet=cat', box, async () => {
      expect.soft(rec.length).toBeGreaterThanOrEqual(1);
      expect.soft(rec.filter((s) => !cat.includes(s))).toEqual([]);
    }, { actual: async () => rec.join(', ') });
    await check(page, 'ขั้นที่ 2: ไม่มี slug ใดที่อยู่ใน pp-recent', box, async () => {
      expect.soft(rec.filter((s) => recent.includes(s))).toEqual([]);
    }, { actual: async () => `แนะนำ: ${rec.join(', ')}\npp-recent: ${recent.join(', ')}` });
  });
  await test.step('3. เปิด /products/puppy-lamb-wet แล้วกลับ / จด slug อีกครั้ง', async () => {
    await viewProduct(page, 'puppy-lamb-wet');
    await page.goto('/');
    const rec = await boxSlugs(page, 'recommended-for-you');
    const box = page.getByTestId('recommended-for-you');
    await check(page, 'ขั้นที่ 3: มีการ์ดที่อยู่ใน ?pet=dog ≥ 1 ใบ', box, async () => {
      expect.soft(rec.filter((s) => dog.includes(s)).length).toBeGreaterThanOrEqual(1);
    }, { actual: async () => rec.join(', ') });
    await check(page, 'ขั้นที่ 3: ไม่มี puppy-lamb-wet และไม่มี 3 ชิ้นที่ดูไปแล้ว', box, async () => {
      expect.soft(rec.filter((s) => s === 'puppy-lamb-wet' || viewed.includes(s))).toEqual([]);
    }, { actual: async () => rec.join(', ') });
  });
});

test('TC-REC-003 ประวัติการดู `pp-recent` เก็บสูงสุด 6 ชิ้น ใหม่สุดอยู่หน้า และคำแนะนำไม่ซ้ำกับประวัติ', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ยาว 6 ตัวแรกคือ `lickable-salmon-treat` · ขั้นที่ 2: ยาว 6 ตัวแรก `urinary-care-dry` ไม่มี `kitten-salmon-dry` · ขั้นที่ 3: "สินค้าที่คุณเพิ่งดู" แสดงไม่เกิน 6 การ์ดตามลำดับเดียวกับ `pp-recent` · การ์ด "แนะนำสำหรับคุณ" ไม่มี slug ใดที่อยู่ใน `pp-recent` · `kitten-salmon-dry` (ที่หลุดจาก `pp-recent` ในขั้นที่ 2) ไม่อยู่ในกล่อง "แนะนำสำหรับคุณ" ตามสมมติฐานว่าไม่แนะนำของที่เคยดู (ตอนนี้ล้ม: กลับมาโผล่ตาม R175) · ขั้นที่ 4: ยังยาว 6 `tuna-pouch` ย้ายมาตัวแรก ไม่มี slug ซ้ำ' },
    { type: 'source', description: '[O-ยังไม่ยืนยัน]+[R] · R175 · Q42 (เพิ่มเติม: ของที่หลุดจากประวัติ 6 ชิ้นควรถูกแนะนำได้อีกไหม) · ความเสี่ยง: ประวัติโตไม่จำกัด/มีของซ้ำ · เทคนิค: Boundary · State' },
  ],
}, async ({ page }) => {
  const seven = ['kitten-salmon-dry', 'adult-chicken-dry', 'kitten-chicken-mousse', 'senior-tuna-dry', 'tuna-pouch', 'lickable-salmon-treat', 'urinary-care-dry'];
  await test.step('1. เปิดหน้าสินค้า 6 ชิ้นแรก อ่าน pp-recent', async () => {
    for (const s of seven.slice(0, 6)) await viewProduct(page, s);
    const r = await lsArr(page, 'pp-recent');
    await check(page, 'ขั้นที่ 1: ยาว 6 ตัวแรกคือ lickable-salmon-treat', null, async () => {
      expect.soft(r.length).toBe(6);
      expect.soft(r[0]).toBe('lickable-salmon-treat');
    }, { actual: () => lsRaw(page, 'pp-recent') });
  });
  await test.step('2. เปิดชิ้นที่ 7 อ่าน pp-recent อีกครั้ง', async () => {
    await viewProduct(page, seven[6]);
    const r = await lsArr(page, 'pp-recent');
    await check(page, 'ขั้นที่ 2: ยาว 6 ตัวแรก urinary-care-dry ไม่มี kitten-salmon-dry', null, async () => {
      expect.soft(r.length).toBe(6);
      expect.soft(r[0]).toBe('urinary-care-dry');
      expect.soft(r).not.toContain('kitten-salmon-dry');
    }, { actual: () => lsRaw(page, 'pp-recent') });
  });
  await test.step('3. เปิด / อ่านกล่อง "สินค้าที่คุณเพิ่งดู" และ "แนะนำสำหรับคุณ"', async () => {
    await page.goto('/');
    const recent = await lsArr(page, 'pp-recent');
    const rv = await boxSlugs(page, 'recently-viewed');
    const rec = await boxSlugs(page, 'recommended-for-you');
    await check(page, 'ขั้นที่ 3: "สินค้าที่คุณเพิ่งดู" แสดงไม่เกิน 6 การ์ดตามลำดับเดียวกับ pp-recent', page.getByTestId('recently-viewed'), async () => {
      expect.soft(rv.length).toBeLessThanOrEqual(6);
      expect.soft(rv).toEqual(recent.slice(0, rv.length));
      expect.soft(rv.length).toBeGreaterThanOrEqual(1);
    }, { actual: async () => `เพิ่งดู: ${rv.join(', ')}\npp-recent: ${recent.join(', ')}` });
    await check(page, 'ขั้นที่ 3: การ์ด "แนะนำสำหรับคุณ" ไม่มี slug ใดที่อยู่ใน pp-recent', page.getByTestId('recommended-for-you'), async () => {
      expect.soft(rec.filter((s) => recent.includes(s))).toEqual([]);
    }, { actual: async () => `แนะนำ: ${rec.join(', ')}\npp-recent: ${recent.join(', ')}` });
    await check(page, 'ขั้นที่ 3: kitten-salmon-dry (ที่หลุดจาก pp-recent) ไม่อยู่ในกล่อง "แนะนำสำหรับคุณ"', page.getByTestId('recommended-for-you'), async () => {
      expect.soft(rec).not.toContain('kitten-salmon-dry');
    }, { actual: async () => rec.join(', ') });
  });
  await test.step('4. เปิด /products/tuna-pouch ซ้ำ แล้วอ่าน pp-recent', async () => {
    await viewProduct(page, 'tuna-pouch');
    const r = await lsArr(page, 'pp-recent');
    await check(page, 'ขั้นที่ 4: ยังยาว 6 tuna-pouch ย้ายมาตัวแรก ไม่มี slug ซ้ำ', null, async () => {
      expect.soft(r.length).toBe(6);
      expect.soft(r[0]).toBe('tuna-pouch');
      expect.soft(new Set(r).size).toBe(r.length);
    }, { actual: () => lsRaw(page, 'pp-recent') });
  });
});

test('TC-REC-004 คำแนะนำต้องไม่มีสินค้าหมด แม้ลูกค้าเพิ่งดูของหมดนั้นเอง', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: `pp-recent` ยาว 6 ตัวแรกคือ `freeze-dried-chicken-cat` · ขั้นที่ 2–3: `freeze-dried-chicken-cat` ในกล่อง "แนะนำสำหรับคุณ" = 0 · การ์ดป้าย "หมด" หรือปุ่ม "สินค้าหมด" ในกล่องนี้ = 0 · ปุ่มใส่ตะกร้าทุกใบไม่มี `disabled`' },
    { type: 'source', description: '[D] · R176 · ความเสี่ยง: แนะนำของที่ซื้อไม่ได้ · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const six = ['kitten-salmon-dry', 'adult-chicken-dry', 'tuna-pouch', 'lickable-salmon-treat', 'kitten-chicken-mousse', FREEZE];
  await test.step('1. เปิดหน้าสินค้าทั้ง 6 ชิ้นตามลำดับ แล้วอ่าน pp-recent', async () => {
    for (const s of six) await viewProduct(page, s);
    const r = await lsArr(page, 'pp-recent');
    await check(page, `ขั้นที่ 1: pp-recent ยาว 6 ตัวแรกคือ ${FREEZE}`, null, async () => {
      expect.soft(r.length).toBe(6);
      expect.soft(r[0]).toBe(FREEZE);
    }, { actual: () => lsRaw(page, 'pp-recent') });
  });
  await test.step('2. เปิด / จด slug ในกล่อง "แนะนำสำหรับคุณ"', async () => {
    await page.goto('/');
  });
  const box = page.getByTestId('recommended-for-you');
  const rec = await boxSlugs(page, 'recommended-for-you');
  await check(page, `ขั้นที่ 2–3: ${FREEZE} ในกล่อง "แนะนำสำหรับคุณ" = 0`, box, async () => {
    expect.soft(rec.filter((s) => s === FREEZE).length).toBe(0);
  }, { actual: async () => rec.join(', ') });
  await test.step('3. ดูป้ายและปุ่มของทุกการ์ดในกล่องนั้น', async () => {
    await check(page, 'การ์ดป้าย "หมด" หรือปุ่ม "สินค้าหมด" ในกล่องนี้ = 0', box, async (el) => {
      await expect.soft(el.getByTestId('stock-badge').filter({ hasText: /^\s*หมด\s*$/ })).toHaveCount(0);
      await expect.soft(el.getByRole('button', { name: 'สินค้าหมด' })).toHaveCount(0);
    });
    const adds = box.getByTestId('quick-add');
    await check(page, 'ปุ่มใส่ตะกร้าทุกใบไม่มี disabled', adds, async (el) => {
      expect.soft(await el.count()).toBe(rec.length);
      const dis = await el.evaluateAll((es) => es.filter((e) => e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true').length);
      expect.soft(dis).toBe(0);
    }, { actual: async () => adds.evaluateAll((es) => es.map((e) => `${e.textContent} disabled=${e.hasAttribute('disabled')}`).join(' | ')) });
  });
});

test('TC-REC-005 เปิด slug ที่ไม่มีจริงต้องไม่ถูกบันทึกในประวัติการดู', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2–3: ได้ HTTP 404 และหน้ามีคำว่า "ไม่พบ" · `pp-recent` เป็นข้อความเดียวกับที่จดในขั้นที่ 1 ทุกตัวอักษร · ขั้นที่ 4: "สินค้าที่คุณเพิ่งดู" มี 1 การ์ด ไม่มีการ์ดว่าง/การ์ดเสีย · console error = 0' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R177 · Q6 · Q8 · ความเสี่ยง: ประวัติเก็บ slug ขยะแล้วหน้าแรกพัง · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const errs = trackConsole(page, (text, url) => /404|Not Found/i.test(text) && /no-such-product|KITTEN-SALMON-DRY/.test(url));
  let saved: string | null = null;
  await test.step('1. เปิด /products/kitten-salmon-dry อ่าน pp-recent (จดค่าเป็นข้อความ)', async () => {
    await viewProduct(page, 'kitten-salmon-dry');
    saved = await lsRaw(page, 'pp-recent');
    await test.step(`pp-recent = ${saved}`, async () => {});
  });
  for (const [n, path] of [
    ['2', '/products/no-such-product'],
    ['3', '/products/KITTEN-SALMON-DRY'],
  ] as const) {
    await test.step(`${n}. เปิด ${path} ดู HTTP status แล้วอ่าน pp-recent`, async () => {
      const res = await page.goto(path);
      await page.waitForLoadState();
      await check(page, `ขั้นที่ ${n}: ${path} ได้ HTTP 404 และหน้ามีคำว่า "ไม่พบ"`, notFoundMsg(page).first(), async (el) => {
        expect.soft(res?.status()).toBe(404);
        await expect.soft(el).toBeVisible();
      }, { actual: async () => `HTTP ${res?.status()} · ${(await page.locator('main').innerText()).slice(0, 200)}` });
      await page.waitForTimeout(300);
      await check(page, `ขั้นที่ ${n}: pp-recent เป็นข้อความเดียวกับที่จดในขั้นที่ 1 ทุกตัวอักษร`, null, async () => {
        expect.soft(await lsRaw(page, 'pp-recent')).toBe(saved);
      }, { actual: async () => `จด: ${saved}\nตอนนี้: ${await lsRaw(page, 'pp-recent')}` });
    });
  }
  await test.step('4. เปิด / ดูกล่อง "สินค้าที่คุณเพิ่งดู"', async () => {
    await page.goto('/');
    const rv = await boxSlugs(page, 'recently-viewed');
    const cards = page.getByTestId('recently-viewed').getByTestId('product-card');
    await check(page, 'ขั้นที่ 4: "สินค้าที่คุณเพิ่งดู" มี 1 การ์ด ไม่มีการ์ดว่าง/การ์ดเสีย', cards, async (el) => {
      await expect.soft(el).toHaveCount(1);
      expect.soft(rv).toEqual(['kitten-salmon-dry']);
      const broken = await el.evaluateAll((es) =>
        es.filter((e) => !(e.querySelector('[data-testid="product-name"]')?.textContent ?? '').trim() || !e.querySelector('a[href^="/products/"]')).length,
      );
      expect.soft(broken).toBe(0);
    }, { actual: async () => rv.join(', ') || '(ไม่มีการ์ด)' });
  });
  await check(page, 'console error = 0', null, async () => {
    expect.soft(errs).toEqual([]);
  }, { actual: async () => (errs.length ? errs : 'console error 0') });
});

test('TC-REC-006 ของที่อยู่ในรายการโปรดแล้วต้องไม่ถูกแนะนำ (ทุกกรณี)', {
  tag: ['@P3', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 3: `senior-tuna-dry` และ `urinary-care-dry` ในกล่องแนะนำ = 0 · ไม่มี slug ใดที่อยู่ใน `pp-recent` · ถ้ามีของแมวที่มีสต็อกเหลือนอกจาก 8 ชิ้นนี้ กล่องต้องมีการ์ด ≥ 1 ใบ · ขั้นที่ 4: `urinary-care-dry` ยังไม่ถูกแนะนำ (ตอนนี้ล้ม: แสดงแค่ 2 ชิ้น ซึ่งเป็นของใน wishlist เอง)' },
    { type: 'source', description: '[O-ยังไม่ยืนยัน] · R178 · Q42 · ความเสี่ยง: แนะนำของที่ลูกค้าเก็บไว้แล้ว เสียพื้นที่แนะนำ · เทคนิค: Negative · State' },
  ],
}, async ({ page }) => {
  const viewed = ['kitten-salmon-dry', 'adult-chicken-dry', 'kitten-chicken-mousse', 'tuna-pouch', 'lickable-salmon-treat', FREEZE];
  const hearts = ['senior-tuna-dry', 'urinary-care-dry'];
  let leftover: string[] = [];
  await test.step('1. เปิดหน้าสินค้า 6 ชิ้นตามข้อมูลทดสอบ', async () => {
    for (const s of viewed) await viewProduct(page, s);
  });
  await test.step('2. ที่ /products?pet=cat กด ♥ บนการ์ด senior-tuna-dry และ urinary-care-dry', async () => {
    await page.goto('/products?pet=cat');
    for (const s of hearts) {
      await cardOf(page, s).getByTestId('wishlist-toggle').click();
      await until(async () => (await lsArr(page, 'pp-wishlist')).includes(s));
    }
    // ของแมวที่มีสต็อกเหลือนอกจาก 8 ชิ้นนี้ (ใช้ตัดสินเงื่อนไข "กล่องต้องมีการ์ด ≥ 1 ใบ")
    leftover = await page.getByTestId('product-card').evaluateAll(
      (es, skip) =>
        es
          .filter((e) => ![...e.querySelectorAll('[data-testid="stock-badge"]')].some((b) => (b.textContent ?? '').trim() === 'หมด'))
          .map((e) => e.getAttribute('data-slug') ?? '')
          .filter((s) => !skip.includes(s)),
      [...viewed, ...hearts],
    );
    await test.step(`ของแมวที่มีสต็อกนอกจาก 8 ชิ้นนี้: ${leftover.join(', ') || '(ไม่มี)'}`, async () => {});
  });
  await test.step('3. เปิด / จด slug ในกล่อง "แนะนำสำหรับคุณ"', async () => {
    await page.goto('/');
    const rec = await boxSlugs(page, 'recommended-for-you');
    const recent = await lsArr(page, 'pp-recent');
    const box = page.getByTestId('recommended-for-you');
    await check(page, 'ขั้นที่ 3: senior-tuna-dry และ urinary-care-dry ในกล่องแนะนำ = 0', box, async () => {
      expect.soft(rec.filter((s) => hearts.includes(s))).toEqual([]);
    }, { actual: async () => `แนะนำ: ${rec.join(', ')}\npp-wishlist: ${await lsRaw(page, 'pp-wishlist')}` });
    await check(page, 'ขั้นที่ 3: ไม่มี slug ใดที่อยู่ใน pp-recent', box, async () => {
      expect.soft(rec.filter((s) => recent.includes(s))).toEqual([]);
    }, { actual: async () => `แนะนำ: ${rec.join(', ')}\npp-recent: ${recent.join(', ')}` });
    if (leftover.length > 0) {
      await check(page, `ขั้นที่ 3: มีของแมวที่มีสต็อกเหลือนอกจาก 8 ชิ้น (${leftover.length} ชิ้น) → กล่องต้องมีการ์ด ≥ 1 ใบ`, box, async () => {
        expect.soft(rec.length).toBeGreaterThanOrEqual(1);
      }, { actual: async () => rec.join(', ') || '(0 การ์ด)' });
    }
  });
  await test.step('4. นำ ♥ senior-tuna-dry ออก แล้วกลับ /', async () => {
    await page.goto('/products?pet=cat');
    await cardOf(page, 'senior-tuna-dry').getByTestId('wishlist-toggle').click();
    await until(async () => !(await lsArr(page, 'pp-wishlist')).includes('senior-tuna-dry'));
    await page.goto('/');
    const rec = await boxSlugs(page, 'recommended-for-you');
    await check(page, 'ขั้นที่ 4: urinary-care-dry ยังไม่ถูกแนะนำ', page.getByTestId('recommended-for-you'), async () => {
      expect.soft(rec).not.toContain('urinary-care-dry');
    }, { actual: async () => `แนะนำ: ${rec.join(', ')}\npp-wishlist: ${await lsRaw(page, 'pp-wishlist')}` });
  });
});

test('TC-WISH-001 กด ♥ เพิ่ม/เอาออกในหน้าสินค้า ตัวนับ ♥ aria-pressed และ `pp-wishlist` ต้องตรงกัน', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ♥ 0 · `aria-pressed="false"` · `pp-wishlist` ไม่มีหรือ `[]` · ขั้นที่ 2: ♥ 1 · `aria-pressed="true"` · `pp-wishlist` มี `kitten-salmon-dry` 1 ตัว · ขั้นที่ 3: ♥ 0 · `aria-pressed="false"` · `pp-wishlist` ไม่มี `kitten-salmon-dry`' },
    { type: 'source', description: '[R] · R179 · ความเสี่ยง: ตัวนับ/สถานะปุ่มไม่ตรงกับที่เก็บจริง · เทคนิค: Happy path · State' },
  ],
}, async ({ page }) => {
  const slug = 'kitten-salmon-dry';
  const read3 = async (n: string, count: string, pressedVal: 'true' | 'false', inList: boolean) => {
    await check(page, `ขั้นที่ ${n}: ♥ ${count}`, wishCount(page), async (el) => {
      await expect.soft(el).toHaveText(count);
    });
    await check(page, `ขั้นที่ ${n}: aria-pressed="${pressedVal}"`, pdpWish(page), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', pressedVal);
    }, { actual: async () => `aria-pressed=${await pdpWish(page).getAttribute('aria-pressed')}` });
    await check(page, `ขั้นที่ ${n}: pp-wishlist ${inList ? `มี ${slug} 1 ตัว` : n === '1' ? 'ไม่มีหรือ []' : `ไม่มี ${slug}`}`, null, async () => {
      if (inList) await expect.soft.poll(async () => countOf(await lsArr(page, 'pp-wishlist'), slug)).toBe(1);
      else if (n === '1') {
        const v = await lsRaw(page, 'pp-wishlist');
        expect.soft(isEmptyList(v)).toBe(true);
      } else await expect.soft.poll(async () => countOf(await lsArr(page, 'pp-wishlist'), slug)).toBe(0);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  };
  await test.step('1. เปิด /products/kitten-salmon-dry อ่านตัวนับ ♥ บนหัวเว็บและ aria-pressed ของปุ่ม ♥', async () => {
    await page.goto(`/products/${slug}`);
    await pdpWish(page).waitFor();
    await read3('1', '0', 'false', false);
  });
  await test.step('2. กด ♥ 1 ครั้ง อ่านทั้ง 3 ค่า', async () => {
    await pdpWish(page).click();
    await read3('2', '1', 'true', true);
  });
  await test.step('3. กด ♥ อีก 1 ครั้ง อ่านทั้ง 3 ค่า', async () => {
    await pdpWish(page).click();
    await read3('3', '0', 'false', false);
  });
});

test('TC-WISH-002 ทุกการ์ดของสินค้าเดียวกันต้องเปลี่ยนสถานะ ♥ พร้อมกัน', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: การ์ด `lickable-salmon-treat` ทุกใบที่ยังแสดงอยู่มี `aria-pressed="true"` · ♥ 1 · ขั้นที่ 3: ปุ่ม ♥ ทั้งสองหน้า `aria-pressed="true"` · ขั้นที่ 4: ♥ 0 และการ์ดทุกใบ `aria-pressed="false"` · `pp-wishlist` ไม่มี `lickable-salmon-treat`' },
    { type: 'source', description: '[R] · R179 · ความเสี่ยง: การ์ดหนึ่งบอกว่าชอบแล้ว อีกการ์ดบอกยัง ลูกค้ากดซ้ำจนเอาออกเอง · เทคนิค: State' },
  ],
}, async ({ page }) => {
  const slug = 'lickable-salmon-treat';
  const homeToggles = () => page.locator(`[data-testid="product-card"][data-slug="${slug}"] [data-testid="wishlist-toggle"]`);
  await test.step('1. เปิด / กด ♥ การ์ด lickable-salmon-treat ในกล่อง "ขายดี"', async () => {
    await page.goto('/');
    await cardOf(page.getByTestId('popular-products'), slug).getByTestId('wishlist-toggle').click();
  });
  await test.step('2. ดู aria-pressed ของการ์ด lickable-salmon-treat ทุกใบบนหน้าแรก', async () => {
    await page.waitForTimeout(300);
    await check(page, 'ขั้นที่ 2: การ์ด lickable-salmon-treat ทุกใบที่ยังแสดงอยู่มี aria-pressed="true"', homeToggles(), async (el) => {
      expect.soft(await el.count()).toBeGreaterThanOrEqual(1);
      await expect.soft.poll(() => el.evaluateAll((es) => es.map((e) => e.getAttribute('aria-pressed')))).toEqual(
        Array((await el.count()) || 1).fill('true'),
      );
    }, { actual: async () => homeToggles().evaluateAll((es) => es.map((e) => `${e.closest('section')?.getAttribute('data-testid')}: ${e.getAttribute('aria-pressed')}`).join('\n')) });
    await check(page, 'ขั้นที่ 2: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
  });
  await test.step('3. เปิด /products?type=treat และ /products/lickable-salmon-treat ดูปุ่ม ♥', async () => {
    await page.goto('/products?type=treat');
    const t = cardOf(page, slug).getByTestId('wishlist-toggle');
    await check(page, 'ขั้นที่ 3: ปุ่ม ♥ ใน /products?type=treat aria-pressed="true"', t, async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => `aria-pressed=${await t.getAttribute('aria-pressed')}` });
    await page.goto(`/products/${slug}`);
    await check(page, 'ขั้นที่ 3: ปุ่ม ♥ ในหน้าสินค้า aria-pressed="true"', pdpWish(page), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => `aria-pressed=${await pdpWish(page).getAttribute('aria-pressed')}` });
  });
  await test.step('4. กด ♥ ในหน้าสินค้าอีกครั้ง แล้วกลับ /', async () => {
    await pdpWish(page).click();
    await until(async () => !(await lsArr(page, 'pp-wishlist')).includes(slug));
    await page.goto('/');
    await homeToggles().first().waitFor();
    await check(page, 'ขั้นที่ 4: ♥ 0', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('0');
    });
    await check(page, 'ขั้นที่ 4: การ์ดทุกใบ aria-pressed="false"', homeToggles(), async (el) => {
      await expect.soft.poll(() => el.evaluateAll((es) => es.filter((e) => e.getAttribute('aria-pressed') !== 'false').length)).toBe(0);
    }, { actual: async () => homeToggles().evaluateAll((es) => es.map((e) => `${e.closest('section')?.getAttribute('data-testid')}: ${e.getAttribute('aria-pressed')}`).join('\n')) });
    await check(page, 'ขั้นที่ 4: pp-wishlist ไม่มี lickable-salmon-treat', null, async () => {
      expect.soft(await lsArr(page, 'pp-wishlist')).not.toContain(slug);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
});

test('TC-WISH-003 กด ♥ รัว ๆ ต้องไม่มีรายการซ้ำ และผลเป็นไปตามจำนวนครั้ง', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ♥ 1 · `pp-wishlist` มี `tuna-pouch` 1 ตัวพอดี (7 = คี่ → อยู่ในรายการ) · ขั้นที่ 2: สถานะเหมือนขั้นที่ 1 (dblclick = 2 ครั้ง กลับมาที่เดิม) ไม่มี `tuna-pouch` ซ้ำ · ขั้นที่ 3: ยัง ♥ 1 (8 = คู่ → สถานะไม่เปลี่ยน) · จำนวน `tuna-pouch` ใน `pp-wishlist` ไม่เกิน 1 ทุกขั้น' },
    { type: 'source', description: '[R] · R180 · ความเสี่ยง: กดเร็วแล้วรายการซ้ำ/ตัวนับเพี้ยน · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  const slug = 'tuna-pouch';
  const n = async () => countOf(await lsArr(page, 'pp-wishlist'), slug);
  const clickN = (times: number) =>
    pdpWish(page).evaluate((b, t) => {
      for (let i = 0; i < t; i++) (b as HTMLButtonElement).click();
    }, times);
  await test.step('1. เปิด /products/tuna-pouch คลิก ♥ 7 ครั้งติดกัน (สคริปต์) อ่าน ♥ และ pp-wishlist', async () => {
    await page.goto(`/products/${slug}`);
    await pdpWish(page).waitFor();
    await clickN(7);
    await page.waitForTimeout(500);
  });
  await check(page, 'ขั้นที่ 1: ♥ 1', wishCount(page), async (el) => {
    await expect.soft(el).toHaveText('1');
  });
  await check(page, 'ขั้นที่ 1: pp-wishlist มี tuna-pouch 1 ตัวพอดี (7 = คี่ → อยู่ในรายการ)', null, async () => {
    expect.soft(await n()).toBe(1);
  }, { actual: () => lsRaw(page, 'pp-wishlist') });
  await test.step('2. dblclick ปุ่ม ♥ อ่านค่าอีกครั้ง', async () => {
    await pdpWish(page).dblclick();
    await page.waitForTimeout(500);
  });
  await check(page, 'ขั้นที่ 2: สถานะเหมือนขั้นที่ 1 (♥ 1 · aria-pressed="true")', wishCount(page), async (el) => {
    await expect.soft(el).toHaveText('1');
    await expect.soft(pdpWish(page)).toHaveAttribute('aria-pressed', 'true');
  });
  await check(page, 'ขั้นที่ 2: ไม่มี tuna-pouch ซ้ำ (= 1 ตัว)', null, async () => {
    expect.soft(await n()).toBe(1);
  }, { actual: () => lsRaw(page, 'pp-wishlist') });
  await test.step('3. คลิก ♥ อีก 8 ครั้งติดกัน อ่านค่า', async () => {
    await clickN(8);
    await page.waitForTimeout(500);
  });
  await check(page, 'ขั้นที่ 3: ยัง ♥ 1 (8 = คู่ → สถานะไม่เปลี่ยน)', wishCount(page), async (el) => {
    await expect.soft(el).toHaveText('1');
  });
  await check(page, 'ขั้นที่ 3: จำนวน tuna-pouch ใน pp-wishlist ไม่เกิน 1', null, async () => {
    expect.soft(await n()).toBeLessThanOrEqual(1);
    expect.soft(await n()).toBe(1);
  }, { actual: () => lsRaw(page, 'pp-wishlist') });
});

test('TC-WISH-004 ตัวนับ ♥ = จำนวนแถวใน `/wishlist` และกด "ลบ" แล้วตัวนับลดทันที', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: ♥ 4 · 4 แถว ตรงกับ 4 ชิ้นที่กด · `pp-wishlist` ยาว 4 · ขั้นที่ 3: ♥ 3 · แถวไก่ฟรีซดรายหายทันทีโดยไม่ต้อง reload · `pp-wishlist` ยาว 3 ไม่มี `freeze-dried-chicken-cat` · ขั้นที่ 4: ยัง ♥ 3 และ 3 แถว' },
    { type: 'source', description: '[R] · R181 · ความเสี่ยง: ลบแล้วกลับมาโผล่/ตัวนับไม่ตรงหน้า · เทคนิค: Happy path · State' },
  ],
}, async ({ page }) => {
  const four = ['kitten-salmon-dry', 'tuna-pouch', FREEZE, 'puppy-lamb-wet'];
  const rows = page.getByTestId('wishlist-item');
  await test.step('1. เปิดหน้าสินค้าทั้ง 4 ชิ้น กด ♥ ทีละชิ้น', async () => {
    for (const s of four) {
      await page.goto(`/products/${s}`);
      await pdpWish(page).click();
      await until(async () => (await lsArr(page, 'pp-wishlist')).includes(s));
    }
  });
  await test.step('2. เปิด /wishlist นับแถวและอ่าน ♥', async () => {
    await page.goto('/wishlist');
    await rows.first().waitFor({ timeout: 5000 }).catch(() => {});
    await check(page, 'ขั้นที่ 2: ♥ 4', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('4');
    });
    await check(page, 'ขั้นที่ 2: 4 แถว ตรงกับ 4 ชิ้นที่กด', rows, async (el) => {
      await expect.soft(el).toHaveCount(4);
      expect.soft((await el.evaluateAll((es) => es.map((e) => e.getAttribute('data-slug') ?? ''))).sort()).toEqual([...four].sort());
    }, { actual: async () => (await rows.evaluateAll((es) => es.map((e) => e.getAttribute('data-slug')))).join(', ') });
    await check(page, 'ขั้นที่ 2: pp-wishlist ยาว 4', null, async () => {
      expect.soft((await lsArr(page, 'pp-wishlist')).length).toBe(4);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
  await test.step('3. กด "ลบ" แถว freeze-dried-chicken-cat', async () => {
    await wishRow(page, FREEZE).getByTestId('wishlist-remove').click();
    await check(page, 'ขั้นที่ 3: ♥ 3', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('3');
    });
    await check(page, 'ขั้นที่ 3: แถวไก่ฟรีซดรายหายทันทีโดยไม่ต้อง reload', rows, async (el) => {
      await expect.soft(wishRow(page, FREEZE)).toHaveCount(0);
      await expect.soft(el).toHaveCount(3);
    }, { actual: async () => (await rows.evaluateAll((es) => es.map((e) => e.getAttribute('data-slug')))).join(', ') });
    await check(page, `ขั้นที่ 3: pp-wishlist ยาว 3 ไม่มี ${FREEZE}`, null, async () => {
      await expect.soft.poll(async () => (await lsArr(page, 'pp-wishlist')).length).toBe(3);
      expect.soft(await lsArr(page, 'pp-wishlist')).not.toContain(FREEZE);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
  await test.step('4. reload /wishlist', async () => {
    await page.reload();
    await rows.first().waitFor({ timeout: 5000 }).catch(() => {});
    await check(page, 'ขั้นที่ 4: ยัง ♥ 3', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('3');
    });
    await check(page, 'ขั้นที่ 4: 3 แถว', rows, async (el) => {
      await expect.soft(el).toHaveCount(3);
    });
  });
});

test('TC-WISH-005 รายการโปรดต้องยังอยู่หลัง reload และหลังปิดแล้วเปิดแท็บใหม่', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: ♥ 1 · `aria-pressed="true"` · ขั้นที่ 3: ♥ 1 · `/wishlist` มี 1 แถว `kitten-salmon-dry` · `pp-wishlist` มี `kitten-salmon-dry`' },
    { type: 'source', description: '[R] · R182 · ความเสี่ยง: รายการโปรดหายเมื่อปิดเบราว์เซอร์ · เทคนิค: State' },
  ],
}, async ({ page }) => {
  const slug = 'kitten-salmon-dry';
  await test.step('1. กด ♥ ที่ /products/kitten-salmon-dry', async () => {
    await page.goto(`/products/${slug}`);
    await pdpWish(page).click();
    await until(async () => (await lsArr(page, 'pp-wishlist')).includes(slug));
  });
  await test.step('2. reload หน้า', async () => {
    await page.reload();
    await pdpWish(page).waitFor();
    await check(page, 'ขั้นที่ 2: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, 'ขั้นที่ 2: aria-pressed="true"', pdpWish(page), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => `aria-pressed=${await pdpWish(page).getAttribute('aria-pressed')}` });
  });
  await test.step('3. ปิดทุกแท็บ (context เดิม) แล้วเปิด /wishlist ในแท็บใหม่', async () => {
    const ctx = page.context();
    for (const p of ctx.pages()) await p.close();
    const p2 = await ctx.newPage();
    await p2.goto('/wishlist');
    await p2.getByTestId('wishlist-item').first().waitFor({ timeout: 5000 }).catch(() => {});
    await check(p2, 'ขั้นที่ 3: ♥ 1', wishCount(p2), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(p2, `ขั้นที่ 3: /wishlist มี 1 แถว ${slug}`, p2.getByTestId('wishlist-item'), async (el) => {
      await expect.soft(el).toHaveCount(1);
      await expect.soft(el.first()).toHaveAttribute('data-slug', slug);
    });
    await check(p2, `ขั้นที่ 3: pp-wishlist มี ${slug}`, null, async () => {
      expect.soft(await lsArr(p2, 'pp-wishlist')).toContain(slug);
    }, { actual: () => lsRaw(p2, 'pp-wishlist') });
  });
});

test('TC-WISH-006 สินค้าหมดเพิ่ม ♥ ได้ แต่ใน `/wishlist` ไม่มีปุ่มย้ายไปตะกร้าที่กดได้ (ไก่ฟรีซดราย)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ♥ 1 · `aria-pressed="true"` · ขั้นที่ 2: แถวมีป้าย "หมด" · ปุ่ม "สินค้าหมด" มี `disabled` · ไม่มีปุ่ม "ย้ายไปตะกร้า" ในแถวนี้ · ขั้นที่ 3: `pp-cart` ยังเป็น `[]` (หรือไม่มี key) · 🛒 0 · `pp-wishlist` ยังมี `freeze-dried-chicken-cat`' },
    { type: 'source', description: '[D] · R183 · R52 · ความเสี่ยง: ของหมดหลุดเข้าตะกร้าจากหน้ารายการโปรด · เทคนิค: Negative · Happy path' },
  ],
}, async ({ page }) => {
  await test.step(`1. เปิด /products/${FREEZE} กด ♥`, async () => {
    await page.goto(`/products/${FREEZE}`);
    await pdpWish(page).click();
    await check(page, 'ขั้นที่ 1: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, 'ขั้นที่ 1: aria-pressed="true"', pdpWish(page), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => `aria-pressed=${await pdpWish(page).getAttribute('aria-pressed')}` });
  });
  const row = wishRow(page, FREEZE);
  await test.step('2. เปิด /wishlist ดูป้ายและปุ่มของแถวนี้', async () => {
    await page.goto('/wishlist');
    await row.waitFor({ timeout: 5000 }).catch(() => {});
    await check(page, 'ขั้นที่ 2: แถวมีป้าย "หมด"', row.getByTestId('stock-badge'), async (el) => {
      await expect.soft(el).toHaveText(/^\s*หมด\s*$/);
    });
    const soldBtn = row.getByRole('button', { name: 'สินค้าหมด' });
    await check(page, 'ขั้นที่ 2: ปุ่ม "สินค้าหมด" มี disabled', soldBtn, async (el) => {
      await expect.soft(el).toHaveCount(1);
      await expect.soft(el).toBeDisabled();
    }, { actual: async () => ((await soldBtn.count()) ? soldBtn.first().evaluate((e) => e.outerHTML) : '(ไม่พบปุ่ม "สินค้าหมด")') });
    await check(page, 'ขั้นที่ 2: ไม่มีปุ่ม "ย้ายไปตะกร้า" ในแถวนี้', row, async (el) => {
      await expect.soft(el.getByRole('button', { name: 'ย้ายไปตะกร้า' })).toHaveCount(0);
    });
  });
  await test.step('3. อ่าน pp-cart, 🛒 และ pp-wishlist', async () => {
    await check(page, 'ขั้นที่ 3: pp-cart ยังเป็น [] (หรือไม่มี key)', null, async () => {
      const v = await lsRaw(page, 'pp-cart');
      expect.soft(isEmptyList(v)).toBe(true);
    }, { actual: () => lsRaw(page, 'pp-cart') });
    await check(page, 'ขั้นที่ 3: 🛒 0', cartCount(page), async (el) => {
      await expect.soft(el).toHaveText('0');
    });
    await check(page, `ขั้นที่ 3: pp-wishlist ยังมี ${FREEZE}`, null, async () => {
      expect.soft(await lsArr(page, 'pp-wishlist')).toContain(FREEZE);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
});

test('TC-WISH-007 สินค้าที่หมดหลังจากเพิ่ม ♥ แล้ว ต้องเปลี่ยนเป็นปุ่ม "สินค้าหมด" ใน `/wishlist`', {
  tag: ['@P1', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ปุ่ม "ย้ายไปตะกร้า" กดได้ (ไม่มี `disabled`) · ขั้นที่ 2: ยอดที่ยืนยัน ฿1,560 (฿520×3 + ส่ง ฿0 เพราะ ≥ ฿999) · ขั้นที่ 3: แถวยังอยู่ (♥ 1) มีป้าย "หมด" และปุ่ม "สินค้าหมด" มี `disabled` · ขั้นที่ 4: `pp-cart` ยังว่าง · 🛒 0' },
    { type: 'source', description: '[D]+[R] · R183 · ความเสี่ยง: ข้อมูลสต็อกในหน้ารายการโปรดเก่า ให้ย้ายของหมดเข้าตะกร้า · เทคนิค: State · Negative · Security' },
  ],
}, async ({ page }) => {
  test.setTimeout(120_000);
  const row = wishRow(page, HAIRBALL);
  try {
    await test.step('เตรียม: ล็อกอิน demo@pawpantry.test (ตะกร้าว่าง)', async () => {
      await loginDemo(page);
    });
    await test.step('1. กด ♥ สูตรลดก้อนขน เปิด /wishlist ดูปุ่มของแถว', async () => {
      await page.goto(`/products/${HAIRBALL}`);
      await pdpWish(page).click();
      await until(async () => (await lsArr(page, 'pp-wishlist')).includes(HAIRBALL));
      await page.goto('/wishlist');
      await row.waitFor({ timeout: 5000 }).catch(() => {});
      const mv = row.getByTestId('move-to-cart');
      await check(page, 'ขั้นที่ 1: ปุ่ม "ย้ายไปตะกร้า" กดได้ (ไม่มี disabled)', mv, async (el) => {
        await expect.soft(el).toHaveText(/ย้ายไปตะกร้า/);
        await expect.soft(el).toBeEnabled();
      });
    });
    await test.step('2. ไปหน้าสินค้าสูตรลดก้อนขน ใส่ตะกร้า 3 ชิ้น แล้วสั่งซื้อจนได้หน้า /orders/PP-1000NN', async () => {
      await addFromPdp(page, HAIRBALL, 3);
      await fillCheckout(page);
      await check(page, 'ขั้นที่ 2: ยอดที่ยืนยัน ฿1,560 (฿520×3 + ส่ง ฿0)', page.getByTestId('place-order'), async (el) => {
        await expect.soft(el).toContainText('฿1,560');
      });
      await page.getByTestId('place-order').click();
      await page.waitForURL(/\/orders\//, { timeout: 15_000 }).catch(() => {});
      await check(page, 'ขั้นที่ 2: ได้หน้า /orders/PP-1000NN', null, async () => {
        expect.soft(page.url()).toMatch(/\/orders\/PP-1000\d{2}$/);
      }, { actual: async () => page.url() });
    });
    await test.step('3. เปิด /wishlist (reload) ดูแถวสูตรลดก้อนขน', async () => {
      await page.goto('/wishlist');
      await page.reload();
      await row.waitFor({ timeout: 5000 }).catch(() => {});
      await check(page, 'ขั้นที่ 3: แถวยังอยู่ (♥ 1)', row, async (el) => {
        await expect.soft(el).toHaveCount(1);
        await expect.soft(wishCount(page)).toHaveText('1');
      });
      await check(page, 'ขั้นที่ 3: มีป้าย "หมด"', row.getByTestId('stock-badge'), async (el) => {
        await expect.soft(el).toHaveText(/^\s*หมด\s*$/);
      });
      const mv = row.getByTestId('move-to-cart');
      await check(page, 'ขั้นที่ 3: ปุ่ม "สินค้าหมด" มี disabled', mv, async (el) => {
        await expect.soft(el).toHaveText(/สินค้าหมด/);
        await expect.soft(el).toBeDisabled();
      }, { actual: async () => ((await mv.count()) ? mv.first().evaluate((e) => e.outerHTML) : '(ไม่พบปุ่ม)') });
    });
    await test.step('4. ลบ disabled ของปุ่มใน DevTools แล้วคลิก อ่าน pp-cart', async () => {
      const mv = row.getByTestId('move-to-cart');
      if (await mv.count()) {
        await mv.first().evaluate((b) => {
          b.removeAttribute('disabled');
          b.removeAttribute('aria-disabled');
        });
        await mv.first().click({ force: true, timeout: 3000 }).catch(() => {});
        await mv.first().evaluate((b) => (b as HTMLButtonElement).click()).catch(() => {});
      }
      await page.waitForTimeout(500);
      await check(page, 'ขั้นที่ 4: pp-cart ยังว่าง', null, async () => {
        expect.soft(await cartLines(page)).toEqual([]);
      }, { actual: () => lsRaw(page, 'pp-cart') });
      await check(page, 'ขั้นที่ 4: 🛒 0', cartCount(page), async (el) => {
        await expect.soft(el).toHaveText('0');
      });
    });
  } finally {
    await resetAfter(page);
  }
});

test('TC-WISH-008 "ย้ายไปตะกร้า" = ใส่ตะกร้าขนาดเล็กสุด 1 ชิ้น + เอาออกจากรายการโปรด + มี toast', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '♥ 3 → 2 · 🛒 0 → 1 · `pp-cart` มี `puppy-lamb-wet` 1 บรรทัด ขนาด = ขนาดเล็กสุดที่จดในขั้นที่ 2 qty 1 · `pp-wishlist` ไม่มี `puppy-lamb-wet` · แถวหายจาก `/wishlist` ทันที · มี toast ที่มีชื่อสินค้า (ตอนนี้ล้ม: "ย้ายไปตะกร้า" ไม่มี toast)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R184 · R32 · Q18 · ความเสี่ยง: ย้ายแล้วของหายทั้งสองที่ หรือไม่รู้ว่าย้ายสำเร็จ · เทคนิค: Happy path' },
  ],
}, async ({ page }) => {
  const three = ['puppy-lamb-wet', 'kitten-chicken-mousse', 'dental-chew-treat'];
  let smallest = '';
  let price = '';
  await test.step('1. กด ♥ ทั้ง 3 ชิ้น เปิด /wishlist', async () => {
    for (const s of three) {
      await page.goto(`/products/${s}`);
      await pdpWish(page).click();
      await until(async () => (await lsArr(page, 'pp-wishlist')).includes(s));
    }
    await page.goto('/wishlist');
    await page.getByTestId('wishlist-item').first().waitFor();
  });
  await test.step('2. เปิด /products/puppy-lamb-wet ในแท็บอื่น จดขนาดที่เล็กสุดและราคา', async () => {
    const tab = await page.context().newPage();
    await tab.goto('/products/puppy-lamb-wet');
    const first = tab.getByTestId('size-option').first();
    smallest = (await first.getAttribute('data-size')) ?? (await first.locator('span').first().innerText());
    price = (await first.locator('small').innerText().catch(() => '')).trim();
    await test.step(`ขนาดเล็กสุด = ${smallest} ราคา ${price}`, async () => {});
    await tab.close();
    await page.bringToFront();
  });
  await check(page, 'ก่อนย้าย: ♥ 3 · 🛒 0', wishCount(page), async (el) => {
    await expect.soft(el).toHaveText('3');
    await expect.soft(cartCount(page)).toHaveText('0');
  });
  await test.step('3. ที่ /wishlist กด "ย้ายไปตะกร้า" ของ puppy-lamb-wet', async () => {
    await wishRow(page, 'puppy-lamb-wet').getByTestId('move-to-cart').click();
  });
  await test.step('4. อ่าน ♥, 🛒, toast, pp-cart, pp-wishlist', async () => {
    await check(page, 'มี toast ที่มีชื่อสินค้า (ลูกสุนัข แกะบด)', page.getByTestId('toast'), async (el) => {
      await expect.soft(el.filter({ hasText: 'ลูกสุนัข แกะบด' }).first()).toBeVisible();
    }, { actual: async () => (await page.getByTestId('toast').allInnerTexts()).join(' ;; ') || '(ไม่มี toast)' });
    await check(page, '♥ 3 → 2', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('2');
    });
    await check(page, '🛒 0 → 1', cartCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, `pp-cart มี puppy-lamb-wet 1 บรรทัด ขนาด = ${smallest} (ขนาดเล็กสุด) qty 1`, null, async () => {
      await expect.soft.poll(async () => (await cartLines(page)).filter((l) => l.slug === 'puppy-lamb-wet')).toEqual([
        expect.objectContaining({ slug: 'puppy-lamb-wet', size: smallest, qty: 1 }),
      ]);
    }, { actual: () => lsRaw(page, 'pp-cart') });
    await check(page, 'pp-wishlist ไม่มี puppy-lamb-wet', null, async () => {
      expect.soft(await lsArr(page, 'pp-wishlist')).not.toContain('puppy-lamb-wet');
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
    await check(page, 'แถวหายจาก /wishlist ทันที', page.getByTestId('wishlist-item'), async (el) => {
      await expect.soft(wishRow(page, 'puppy-lamb-wet')).toHaveCount(0);
      await expect.soft(el).toHaveCount(2);
    });
  });
});

test('TC-WISH-009 ย้ายของที่มีในตะกร้าอยู่แล้ว ต้องรวมกับบรรทัดเดิม', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`pp-cart` มี `kitten-salmon-dry` บรรทัดเดียว ขนาด "400 g" qty 3 · 🛒 3 · ♥ 0 · ยอดสินค้า ฿567 (฿189×3) · ค่าส่ง ฿50 (< ฿999) · ยอดชำระ ฿617 (฿567 + ฿50)' },
    { type: 'source', description: '[R]+[D] · R184 · ความเสี่ยง: ตะกร้าแยก 2 บรรทัดซ้ำ ยอดเงินสับสน · เทคนิค: Happy path · Equivalence partition' },
  ],
}, async ({ page }) => {
  const slug = 'kitten-salmon-dry';
  await test.step('1. เปิด /products/kitten-salmon-dry เลือก 400 g จำนวน 2 กด "🛒 เพิ่มลงตะกร้า"', async () => {
    await addFromPdp(page, slug, 2, '400 g');
  });
  await test.step('2. กด ♥ ในหน้าเดียวกัน', async () => {
    await pdpWish(page).click();
    await until(async () => (await lsArr(page, 'pp-wishlist')).includes(slug));
  });
  await test.step('3. เปิด /wishlist กด "ย้ายไปตะกร้า"', async () => {
    await page.goto('/wishlist');
    await wishRow(page, slug).getByTestId('move-to-cart').click();
    await until(async () => !(await lsArr(page, 'pp-wishlist')).includes(slug));
  });
  await check(page, 'pp-cart มี kitten-salmon-dry บรรทัดเดียว ขนาด "400 g" qty 3', null, async () => {
    await expect.soft.poll(async () => (await cartLines(page)).filter((l) => l.slug === slug)).toEqual([
      expect.objectContaining({ slug, size: '400 g', qty: 3 }),
    ]);
  }, { actual: () => lsRaw(page, 'pp-cart') });
  await check(page, '🛒 3', cartCount(page), async (el) => {
    await expect.soft(el).toHaveText('3');
  });
  await check(page, '♥ 0', wishCount(page), async (el) => {
    await expect.soft(el).toHaveText('0');
  });
  await test.step('4. เปิด /cart อ่านรายการและสรุปยอด', async () => {
    await page.goto('/cart');
    await check(page, 'ยอดสินค้า ฿567 (฿189×3)', page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText(/฿567/);
    });
    await check(page, 'ค่าส่ง ฿50 (< ฿999)', page.getByTestId('summary-shipping'), async (el) => {
      await expect.soft(el).toHaveText(/฿50/);
    });
    await check(page, 'ยอดชำระ ฿617 (฿567 + ฿50)', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText(/฿617/);
    });
  });
});

test('TC-WISH-010 ดับเบิลคลิก "ย้ายไปตะกร้า" ต้องได้ +1 ชิ้นครั้งเดียว', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '🛒 1 · ♥ 0 · `pp-cart` มี `tuna-pouch` 1 บรรทัด qty 1 · `/cart` ยอดสินค้า ฿35 ค่าส่ง ฿50 ยอดชำระ ฿85 (฿35 + ฿50)' },
    { type: 'source', description: '[R]+[D] · R184 · ความเสี่ยง: กดเร็วแล้วได้ 2 ชิ้นโดยไม่ตั้งใจ · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  const slug = 'tuna-pouch';
  await test.step('1. กด ♥ tuna-pouch เปิด /wishlist', async () => {
    await page.goto(`/products/${slug}`);
    await pdpWish(page).click();
    await until(async () => (await lsArr(page, 'pp-wishlist')).includes(slug));
    await page.goto('/wishlist');
  });
  await test.step('2. dblclick ปุ่ม "ย้ายไปตะกร้า"', async () => {
    await wishRow(page, slug).getByTestId('move-to-cart').dblclick();
    await page.waitForTimeout(500);
  });
  await test.step('3. อ่าน 🛒, ♥, pp-cart แล้วเปิด /cart', async () => {
    await check(page, '🛒 1', cartCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, '♥ 0', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('0');
    });
    await check(page, 'pp-cart มี tuna-pouch 1 บรรทัด qty 1', null, async () => {
      expect.soft((await cartLines(page)).filter((l) => l.slug === slug)).toEqual([expect.objectContaining({ slug, qty: 1 })]);
    }, { actual: () => lsRaw(page, 'pp-cart') });
    await page.goto('/cart');
    await check(page, '/cart ยอดสินค้า ฿35', page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText(/฿35(?!\d)/);
    });
    await check(page, '/cart ค่าส่ง ฿50', page.getByTestId('summary-shipping'), async (el) => {
      await expect.soft(el).toHaveText(/฿50/);
    });
    await check(page, '/cart ยอดชำระ ฿85 (฿35 + ฿50)', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText(/฿85/);
    });
  });
});

test('TC-WISH-011 "ย้ายไปตะกร้า" ห้ามเกินสต็อก (ตะกร้ามีสูตรลดก้อนขนครบ 3 แล้ว)', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`pp-cart` สูตรลดก้อนขน qty ยังเป็น 3 · 🛒 3 · มี toast เตือนที่**ไม่ใช่**ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว" · สูตรลดก้อนขนยังอยู่ใน `pp-wishlist` (♥ 1) เพราะย้ายไม่สำเร็จ · `/cart` ยอดสินค้า ฿1,560 (฿520×3) ค่าส่ง ฿0 ยอดชำระ ฿1,560' },
    { type: 'source', description: '[D]+[O-ยังไม่ยืนยัน]+[R] · R184 · Q18 · Q10 · ความเสี่ยง: ย้ายแล้วเกินสต็อก ไปล้ม 409 ตอนสั่งซื้อ หรือของหายจากรายการโปรดทั้งที่ย้ายไม่ได้ · เทคนิค: Boundary · Negative' },
  ],
}, async ({ page }) => {
  await test.step('1. เปิดหน้าสินค้าสูตรลดก้อนขน ใส่ตะกร้า 3 ชิ้น แล้วกด ♥', async () => {
    await addFromPdp(page, HAIRBALL, 3);
    await until(async () => (await cartLines(page)).some((l) => l.slug === HAIRBALL && l.qty === 3));
    await pdpWish(page).click();
    await until(async () => (await lsArr(page, 'pp-wishlist')).includes(HAIRBALL));
  });
  await test.step('2. เปิด /wishlist กด "ย้ายไปตะกร้า"', async () => {
    await page.goto('/wishlist');
    await wishRow(page, HAIRBALL).getByTestId('move-to-cart').click();
  });
  await test.step('3. อ่าน toast, 🛒, pp-cart, pp-wishlist', async () => {
    await check(page, 'มี toast เตือนที่ไม่ใช่ข้อความ "✅ เพิ่ม…ลงตะกร้าแล้ว"', page.getByTestId('toast'), async (el) => {
      await expect.soft(el.filter({ hasNotText: /เพิ่ม.*ลงตะกร้าแล้ว/ }).first()).toBeVisible();
    }, { actual: async () => (await page.getByTestId('toast').allInnerTexts()).join(' ;; ') || '(ไม่มี toast)' });
    await check(page, 'pp-cart สูตรลดก้อนขน qty ยังเป็น 3', null, async () => {
      expect.soft((await cartLines(page)).filter((l) => l.slug === HAIRBALL)).toEqual([expect.objectContaining({ slug: HAIRBALL, qty: 3 })]);
    }, { actual: () => lsRaw(page, 'pp-cart') });
    await check(page, '🛒 3', cartCount(page), async (el) => {
      await expect.soft(el).toHaveText('3');
    });
    await check(page, 'สูตรลดก้อนขนยังอยู่ใน pp-wishlist (♥ 1) เพราะย้ายไม่สำเร็จ', wishCount(page), async (el) => {
      expect.soft(await lsArr(page, 'pp-wishlist')).toContain(HAIRBALL);
      await expect.soft(el).toHaveText('1');
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
  await test.step('4. เปิด /cart อ่านสรุปยอด', async () => {
    await page.goto('/cart');
    await check(page, '/cart ยอดสินค้า ฿1,560 (฿520×3)', page.getByTestId('summary-subtotal'), async (el) => {
      await expect.soft(el).toHaveText(/฿1,560/);
    });
    await check(page, '/cart ค่าส่ง ฿0', page.getByTestId('summary-shipping'), async (el) => {
      await expect.soft(el).toHaveText(SHIP_ZERO);
    });
    await check(page, '/cart ยอดชำระ ฿1,560', page.getByTestId('summary-total'), async (el) => {
      await expect.soft(el).toHaveText(/฿1,560/);
    });
  });
});

test('TC-WISH-012 `pp-wishlist` ที่มีของซ้ำและ slug ไม่มีจริงต้องไม่ทำให้นับผิดหรือหน้าพัง', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 2: ♥ 2 · ขั้นที่ 3: 2 แถว (`tuna-pouch` 1 แถว + `freeze-dried-chicken-cat` 1 แถวพร้อมปุ่ม "สินค้าหมด" `disabled`) · ไม่มีแถวว่าง/แถว "no-such-product" · console error = 0 · ขั้นที่ 4: 🛒 1 · ♥ 1 · ไม่มี `tuna-pouch` เหลือใน `/wishlist`' },
    { type: 'source', description: '[R]+[D] · R185 · R183 · ความเสี่ยง: ข้อมูลเก่า/เสียทำให้ตัวนับเกินจริงหรือหน้าพัง · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const errs = trackConsole(page);
  const rows = page.getByTestId('wishlist-item');
  await test.step('1. เปิด / ใน DevTools ตั้งค่า pp-wishlist ตามข้อมูลทดสอบ', async () => {
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('pp-wishlist', JSON.stringify(['tuna-pouch', 'tuna-pouch', 'no-such-product', 'freeze-dried-chicken-cat'])),
    );
  });
  await test.step('2. reload แล้วอ่าน ♥', async () => {
    await page.reload();
    await check(page, 'ขั้นที่ 2: ♥ 2', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('2');
    });
  });
  await test.step('3. เปิด /wishlist นับแถว ดู console', async () => {
    await page.goto('/wishlist');
    await rows.first().waitFor({ timeout: 5000 }).catch(() => {});
    await check(page, 'ขั้นที่ 3: 2 แถว (tuna-pouch 1 แถว + freeze-dried-chicken-cat 1 แถว)', rows, async (el) => {
      await expect.soft(el).toHaveCount(2);
      await expect.soft(wishRow(page, 'tuna-pouch')).toHaveCount(1);
      await expect.soft(wishRow(page, FREEZE)).toHaveCount(1);
    }, { actual: async () => (await rows.evaluateAll((es) => es.map((e) => `${e.getAttribute('data-slug')}: ${(e.textContent ?? '').trim().slice(0, 40)}`))).join('\n') });
    await check(page, 'ขั้นที่ 3: แถว freeze-dried-chicken-cat มีปุ่ม "สินค้าหมด" disabled', wishRow(page, FREEZE).getByTestId('move-to-cart'), async (el) => {
      await expect.soft(el).toHaveText(/สินค้าหมด/);
      await expect.soft(el).toBeDisabled();
    });
    await check(page, 'ขั้นที่ 3: ไม่มีแถวว่าง/แถว "no-such-product"', rows, async (el) => {
      await expect.soft(wishRow(page, 'no-such-product')).toHaveCount(0);
      await expect.soft(page.locator('main')).not.toContainText('no-such-product');
      const empty = await el.evaluateAll((es) => es.filter((e) => !(e.querySelector('.row-name')?.textContent ?? '').trim()).length);
      expect.soft(empty).toBe(0);
    });
    await check(page, 'ขั้นที่ 3: console error = 0', null, async () => {
      expect.soft(errs).toEqual([]);
    }, { actual: async () => (errs.length ? errs : 'console error 0') });
  });
  await test.step('4. กด "ย้ายไปตะกร้า" แถว tuna-pouch', async () => {
    await wishRow(page, 'tuna-pouch').getByTestId('move-to-cart').click();
    await check(page, 'ขั้นที่ 4: 🛒 1', cartCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, 'ขั้นที่ 4: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, 'ขั้นที่ 4: ไม่มี tuna-pouch เหลือใน /wishlist', rows, async () => {
      await expect.soft(wishRow(page, 'tuna-pouch')).toHaveCount(0);
    }, { actual: async () => `แถว: ${(await rows.evaluateAll((es) => es.map((e) => e.getAttribute('data-slug')))).join(', ')}\npp-wishlist: ${await lsRaw(page, 'pp-wishlist')}` });
  });
});

test('TC-WISH-013 `pp-wishlist` ที่ไม่ใช่ JSON ต้องไม่ทำให้หน้าพัง และกลับมาใช้งานได้', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1–2: ♥ 0 · `/wishlist` แสดงสถานะว่าง (0 แถว) ไม่มีหน้าขาว · console error = 0 · ขั้นที่ 3: ♥ 1 และ `pp-wishlist` parse ด้วย `JSON.parse` ได้ รูปแบบเดียวกับที่อ่านได้ตามหมายเหตุร่วม และมี `kitten-salmon-dry` 1 ตัว · ขั้นที่ 4: ♥ 0 · 0 แถว · console error = 0' },
    { type: 'source', description: '[R] · R185 · ความเสี่ยง: ข้อมูลเสียทำให้ทั้งเว็บใช้ไม่ได้ · เทคนิค: Negative' },
  ],
}, async ({ page }) => {
  const errs = trackConsole(page);
  const rows = page.getByTestId('wishlist-item');
  const brokenRound = async (value: string, stepNo: string) => {
    await test.step(`${stepNo}. ตั้ง pp-wishlist = ${value} แล้ว reload /`, async () => {
      await page.goto('/');
      await page.evaluate((v) => localStorage.setItem('pp-wishlist', v), value);
      await page.reload();
      await check(page, `${value}: ♥ 0`, wishCount(page), async (el) => {
        await expect.soft(el).toHaveText('0');
      });
    });
    await test.step(`${stepNo}. เปิด /wishlist ดูหน้าและ console`, async () => {
      await page.goto('/wishlist');
      await page.waitForLoadState();
      await check(page, `${value}: /wishlist แสดงสถานะว่าง (0 แถว) ไม่มีหน้าขาว`, page.getByTestId('empty-wishlist'), async (el) => {
        await expect.soft(el).toBeVisible();
        await expect.soft(rows).toHaveCount(0);
        await expect.soft(page.locator('main h1')).toBeVisible();
      });
      await check(page, `${value}: console error = 0`, null, async () => {
        expect.soft(errs).toEqual([]);
      }, { actual: async () => (errs.length ? errs : 'console error 0') });
    });
  };
  await brokenRound('not-json', '1–2');
  await test.step('3. เปิด /products/kitten-salmon-dry กด ♥ แล้วอ่าน pp-wishlist', async () => {
    await page.goto('/products/kitten-salmon-dry');
    await pdpWish(page).click();
    await check(page, 'ขั้นที่ 3: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(page, 'ขั้นที่ 3: pp-wishlist parse ด้วย JSON.parse ได้ เป็น array ของ slug และมี kitten-salmon-dry 1 ตัว', null, async () => {
      await expect.soft.poll(async () => {
        const v = await lsRaw(page, 'pp-wishlist');
        try {
          const j = JSON.parse(v ?? 'null');
          return Array.isArray(j) && j.every((x) => typeof x === 'string') ? j.filter((x) => x === 'kitten-salmon-dry').length : `ไม่ใช่ array ของ slug: ${v}`;
        } catch {
          return `parse ไม่ได้: ${v}`;
        }
      }).toBe(1);
    }, { actual: () => lsRaw(page, 'pp-wishlist') });
  });
  await brokenRound('{"a":1}', '4');
});

test('TC-WISH-014 เปิด 2 แท็บแก้รายการโปรดพร้อมกันต้องไม่เขียนทับกัน', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: '`pp-wishlist` = มี `tuna-pouch` ตัวเดียว (ไม่มี `kitten-salmon-dry`) · หลัง reload ทั้งสองแท็บ: ♥ = 1 ทั้งสองแท็บ · `/wishlist` มี 1 แถวคือ `tuna-pouch` · `tuna-pouch` ไม่หาย (ไม่บังคับให้ตัวนับแท็บ B อัปเดตเองก่อน reload จนกว่าทีมตอบ Q24 ส่วนเพิ่มเติม) (ตอนนี้ล้ม: แท็บ A เขียนทับด้วยข้อมูลเก่า `tuna-pouch` หายไป ♥ 0)' },
    { type: 'source', description: '[R]+[O-ยังไม่ยืนยัน] · R69 · Q24 (เพิ่มเติม: ตัวนับ ♥/🛒 ของแท็บอื่นต้องอัปเดตทันทีโดยไม่ reload ไหม) · ความเสี่ยง: ของในรายการโปรดหายเงียบ ๆ เมื่อเปิดหลายแท็บ · เทคนิค: State · Negative' },
  ],
}, async ({ page }) => {
  const ctx = page.context();
  const tabA = page;
  const tabB = await ctx.newPage();
  await test.step('1. กด ♥ kitten-salmon-dry แล้วเปิดแท็บ A ที่ /wishlist (เห็น 1 แถว)', async () => {
    await tabA.goto('/products/kitten-salmon-dry');
    await pdpWish(tabA).click();
    await until(async () => (await lsArr(tabA, 'pp-wishlist')).includes('kitten-salmon-dry'));
    await tabA.goto('/wishlist');
    await check(tabA, 'แท็บ A เห็น 1 แถว', tabA.getByTestId('wishlist-item'), async (el) => {
      await expect.soft(el).toHaveCount(1);
    });
  });
  await test.step('2. เปิดแท็บ B ที่ /products/tuna-pouch กด ♥', async () => {
    await tabB.goto('/products/tuna-pouch');
    await pdpWish(tabB).click();
    await until(async () => (await lsArr(tabB, 'pp-wishlist')).includes('tuna-pouch'));
  });
  await test.step('3. กลับแท็บ A (ไม่ reload) กด "ลบ" แถว kitten-salmon-dry', async () => {
    await tabA.bringToFront();
    await wishRow(tabA, 'kitten-salmon-dry').getByTestId('wishlist-remove').click();
    await tabA.waitForTimeout(500);
  });
  await test.step('4. อ่าน pp-wishlist และ ♥ ของทั้งสองแท็บ แล้ว reload ทั้งสองแท็บ', async () => {
    await check(tabA, 'pp-wishlist = มี tuna-pouch ตัวเดียว (ไม่มี kitten-salmon-dry)', null, async () => {
      expect.soft(await lsArr(tabA, 'pp-wishlist')).toEqual(['tuna-pouch']);
    }, { actual: async () => `pp-wishlist: ${await lsRaw(tabA, 'pp-wishlist')}\n♥ แท็บ A: ${await wishCount(tabA).innerText()} · ♥ แท็บ B: ${await wishCount(tabB).innerText()} (ก่อน reload — บันทึกไว้ ไม่ใช้ตัดสินจนกว่าทีมตอบ Q24)` });
    await tabA.reload();
    await tabB.reload();
    await check(tabA, 'หลัง reload: ♥ = 1 (แท็บ A)', wishCount(tabA), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await check(tabB, 'หลัง reload: ♥ = 1 (แท็บ B)', wishCount(tabB), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
    await tabA.bringToFront();
    await tabA.getByTestId('wishlist-item').first().waitFor({ timeout: 5000 }).catch(() => {});
    await check(tabA, '/wishlist มี 1 แถวคือ tuna-pouch (tuna-pouch ไม่หาย)', tabA.getByTestId('wishlist-item'), async (el) => {
      await expect.soft(el).toHaveCount(1);
      await expect.soft(wishRow(tabA, 'tuna-pouch')).toHaveCount(1);
    }, { actual: async () => (await tabA.getByTestId('wishlist-item').evaluateAll((es) => es.map((e) => e.getAttribute('data-slug')))).join(', ') || '(0 แถว)' });
  });
});

test('TC-WISH-015 รายการโปรดเก็บเฉพาะเครื่อง: ล็อกอินบัญชีเดียวกันในเบราว์เซอร์ใหม่ได้ ♥ 0 และไม่มี request ตอนกด ♥', {
  tag: ['@P2', '@5.7'],
  annotation: [
    { type: 'expected', description: 'ขั้นที่ 1: ไม่มี request ไป `/api/` ตอนกด ♥ · ♥ 1 · ขั้นที่ 2: ♥ 0 · `/wishlist` 0 แถว · หน้าไม่พัง · ขั้นที่ 3: context A ยัง ♥ 1' },
    { type: 'source', description: '[O-ยังไม่ยืนยัน] · R70 · Q24 · ความเสี่ยง: บันทึกพฤติกรรมปัจจุบันไว้ ถ้าทีมเปลี่ยนเป็น sync ต้องแก้ TC นี้ · เทคนิค: State' },
  ],
}, async ({ page, browser }) => {
  const slug = 'kitten-salmon-dry';
  const apiCalls: string[] = [];
  await test.step('เตรียม: ล็อกอิน demo@pawpantry.test ใน context A', async () => {
    await loginDemo(page);
  });
  await test.step('1. ใน context A เปิดแท็บ Network แล้วกด ♥ kitten-salmon-dry', async () => {
    await page.goto(`/products/${slug}`);
    await pdpWish(page).waitFor();
    await page.waitForLoadState('networkidle').catch(() => {});
    const onReq = (r: { url: () => string; method: () => string }) => {
      if (r.url().includes('/api/')) apiCalls.push(`${r.method()} ${r.url()}`);
    };
    page.on('request', onReq);
    await pdpWish(page).click();
    await page.waitForTimeout(1000);
    page.off('request', onReq);
    await check(page, 'ขั้นที่ 1: ไม่มี request ไป /api/ ตอนกด ♥', null, async () => {
      expect.soft(apiCalls).toEqual([]);
    }, { actual: async () => (apiCalls.length ? apiCalls : '(ไม่มี request ไป /api/)') });
    await check(page, 'ขั้นที่ 1: ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
  });
  const ctxB = await browser.newContext({ baseURL: baseURL(), viewport: { width: 1280, height: 800 } });
  try {
    const pageB = await ctxB.newPage();
    await test.step('2. ใน context B ล็อกอินบัญชีเดียวกัน แล้วอ่าน ♥ และ /wishlist', async () => {
      const r = await pageB.request.post(`${baseURL()}/api/auth/login`, { data: DEMO });
      await checkApi('context B ล็อกอินบัญชีเดียวกันสำเร็จ', { status: r.status() }, () => {
        expect.soft(r.ok()).toBe(true);
      });
      await pageB.goto(`${baseURL()}/`);
      await check(pageB, 'ขั้นที่ 2: ♥ 0 (context B)', wishCount(pageB), async (el) => {
        await expect.soft(el).toHaveText('0');
      });
      await pageB.goto(`${baseURL()}/wishlist`);
      await pageB.waitForLoadState();
      await check(pageB, 'ขั้นที่ 2: /wishlist 0 แถว · หน้าไม่พัง', pageB.locator('main'), async (el) => {
        await expect.soft(pageB.getByTestId('wishlist-item')).toHaveCount(0);
        await expect.soft(el.locator('h1')).toBeVisible();
        await expect.soft(pageB.getByTestId('empty-wishlist')).toBeVisible();
      });
    });
  } finally {
    await ctxB.close();
  }
  await test.step('3. กลับ context A reload /wishlist', async () => {
    await page.goto('/wishlist');
    await page.reload();
    await check(page, 'ขั้นที่ 3: context A ยัง ♥ 1', wishCount(page), async (el) => {
      await expect.soft(el).toHaveText('1');
    });
  });
});
