/**
 * หัวข้อ 5.1 แคตตาล็อกและการค้นหา (TEST-PLAN.md) — 49 test case
 * โมดูล: HOME (สถิติหน้าแรก), FLT (ตัวกรอง), SORT (เรียงลำดับ), SRCH (ค้นหา), CARD (การ์ดสินค้า/ใส่ตะกร้าจากการ์ด)
 *
 * - ทุก test เริ่มด้วย reset อัตโนมัติ (fixture ใน support/pp.ts) และ context ใหม่ (localStorage ว่าง)
 * - ผลที่คาดหวังใช้ตัวเลข/ข้อความตามแผน · ถ้าเว็บต่างจากแผน test ต้องล้ม
 * - "curl" ในแผน = page.request.get() (ไม่รันสคริปต์ ได้ HTML ดิบจาก server) แล้ว parse ด้วย DOMParser ในหน้า
 */
import type { Page } from '@playwright/test';
import { test, expect, check, checkApi, blocked, baseURL } from './support/pp';

void blocked; // ไม่มีข้อที่ต้อง blocked ในหัวข้อนี้

// ───────────────────────────── ข้อมูลอ้างอิง ─────────────────────────────

type Product = {
  slug: string;
  name: string;
  nameEn: string;
  pet: string;
  type: string;
  lifeStage: string;
  grainFree: boolean;
  sizes: { label: string; price: number }[];
  stock: number;
  rating: number;
  reviewCount: number;
  popularity: number;
};

const TYPE_LABEL: Record<string, string> = {
  dry: 'อาหารเม็ด',
  wet: 'อาหารเปียก',
  treat: 'ขนม',
  toy: 'ของเล่น',
  accessory: 'ของใช้',
};
const NON_FOOD = ['ของเล่น', 'ของใช้'];

/** ป้ายช่วงวัยบนการ์ด/หน้ารายละเอียด เช่น "🐱 ลูกแมว", "แมวโต", "สุนัขสูงวัย" → baby / adult / senior */
function lifeOf(label: string): string {
  if (/ลูก/.test(label)) return 'baby';
  if (/สูงวัย/.test(label)) return 'senior';
  if (/โต/.test(label)) return 'adult';
  return '';
}

/** "฿1,590" → 1590 · "4.7★" → 4.7 */
function num(s: string | null | undefined): number {
  const m = String(s ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

const minPrice = (p: Product) => Math.min(...p.sizes.map((s) => s.price));

async function apiProducts(page: Page): Promise<Product[]> {
  const r = await page.request.get('/api/products');
  const j = (await r.json()) as { items: Product[] };
  return j.items;
}

type Filter = { pet?: string; type?: string; life?: string; grainFree?: boolean };
function apiMatch(items: Product[], f: Filter): Product[] {
  return items.filter(
    (p) =>
      (!f.pet || p.pet === f.pet) &&
      (!f.type || p.type === f.type) &&
      (!f.life || p.lifeStage === f.life) &&
      (!f.grainFree || p.grainFree),
  );
}

// ───────────────────────────── ตัวช่วยอ่านหน้า ─────────────────────────────

/** รอให้ React hydrate (ช่องค้นหาหัวเว็บมี __reactProps) ก่อนคลิก/เลือก */
async function hydrated(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="search-input"]');
        return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
      },
      null,
      { timeout: 15_000 },
    )
    .catch(() => {});
}

/** เปิดหน้าแคตตาล็อก/หน้าใดก็ได้ แล้วรอ hydrate · คืน response ของ document */
async function open(page: Page, url: string) {
  const resp = await page.goto(url);
  await hydrated(page);
  return resp;
}

/** รอ URL ตามเงื่อนไข (ไม่ล้มถ้าไม่เป็นจริง — ให้ check ตัดสิน) แล้วรอตัวกรองหยุด pending */
async function settle(page: Page, pred?: (u: URL) => boolean): Promise<void> {
  if (pred) await page.waitForURL(pred, { timeout: 5_000 }).catch(() => {});
  await page.locator('.filters[aria-busy="false"]').first().waitFor({ timeout: 5_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
}

function params(page: Page): Record<string, string> {
  return Object.fromEntries(new URL(page.url()).searchParams);
}
function pathAndQuery(page: Page): string {
  const u = new URL(page.url());
  return u.pathname + u.search;
}

/** อ่าน N จาก "พบ N รายการ" */
async function readN(page: Page): Promise<number> {
  const t = await page.getByTestId('result-count').innerText({ timeout: 5_000 }).catch(() => '');
  const m = t.replace(/,/g, '').match(/พบ\s*(\d+)/);
  return m ? Number(m[1]) : NaN;
}

const cardsLoc = (page: Page) => page.locator('main article');

type Card = {
  slug: string;
  name: string;
  nameEn: string;
  pet: string;
  tags: string[];
  life: string;
  gf: boolean;
  type: string;
  rating: number;
  price: number;
  stock: string;
  btnText: string;
  btnDisabled: boolean;
};

/** อ่านข้อมูลการ์ดทุกใบใน scope ตามลำดับที่แสดง */
async function readCards(page: Page, scope = 'main'): Promise<Card[]> {
  const raw = await page.locator(`${scope} article`).evaluateAll((els) =>
    els.map((a) => {
      const txt = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const petTag = a.querySelector('.card-tags .tag-cat, .card-tags .tag-dog');
      const btn = a.querySelector('[data-testid="quick-add"]') as HTMLButtonElement | null;
      return {
        slug: a.getAttribute('data-slug') ?? '',
        name: txt(a.querySelector('[data-testid="product-name"], .card-title')),
        nameEn: txt(a.querySelector('.card-en')),
        pet: petTag?.classList.contains('tag-cat') ? 'cat' : petTag?.classList.contains('tag-dog') ? 'dog' : '',
        tags: [...a.querySelectorAll('.card-tags .tag')].map((t) => txt(t)),
        gf: !!a.querySelector('.card-tags .tag-gf'),
        type: txt(a.querySelector('.card-meta span')),
        ratingText: txt(a.querySelector('.card-rating')),
        priceText: txt(a.querySelector('[data-testid="product-price"], .card-price strong')),
        stock: txt(a.querySelector('[data-testid="stock-badge"]')),
        btnText: txt(btn),
        btnDisabled: !!btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true'),
      };
    }),
  );
  return raw.map((r) => ({
    slug: r.slug,
    name: r.name,
    nameEn: r.nameEn,
    pet: r.pet,
    tags: r.tags,
    life: lifeOf(r.tags.find((t) => !/เกรนฟรี/.test(t)) ?? ''),
    gf: r.gf,
    type: r.type,
    rating: num(r.ratingText),
    price: num(r.priceText),
    stock: r.stock,
    btnText: r.btnText,
    btnDisabled: r.btnDisabled,
  }));
}

/** สถานะ UI ตัวกรอง/เรียง/ช่องค้นหา */
async function readUi(page: Page) {
  return page.evaluate(() => {
    const sel = (id: string) => (document.querySelector(`[data-testid="${id}"]`) as HTMLSelectElement | null)?.value ?? null;
    return {
      pressed: [...document.querySelectorAll('[data-testid^="filter-pet-"]')]
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => (b.getAttribute('data-testid') ?? '').replace('filter-pet-', '')),
      type: sel('filter-type'),
      life: sel('filter-life'),
      sort: sel('sort-select'),
      gf: (document.querySelector('[data-testid="filter-grainfree"]') as HTMLInputElement | null)?.checked ?? null,
      search: (document.querySelector('[data-testid="search-input"]') as HTMLInputElement | null)?.value ?? null,
    };
  });
}

/** UI ตัวกรองเป็นค่าเริ่มต้น: ปุ่ม "ทั้งหมด" กดอยู่ใบเดียว · select = all · checkbox ไม่ติ๊ก */
function expectDefaultUi(u: Awaited<ReturnType<typeof readUi>>, sortToo = false): void {
  expect.soft(u.pressed, 'ปุ่มสัตว์ที่ aria-pressed="true"').toEqual(['all']);
  expect.soft(u.type, 'select ประเภท').toBe('all');
  expect.soft(u.life, 'select ช่วงวัย').toBe('all');
  expect.soft(u.gf, 'checkbox เกรนฟรี').toBe(false);
  if (sortToo) expect.soft(u.sort, 'select เรียง').toBe('popular');
}

/** ตรวจ "พบ N" = จำนวนการ์ด (และค่าอ้างอิงถ้าให้มา) */
async function checkN(page: Page, label: string, ref?: number, extra?: (n: number, cards: number) => void): Promise<number> {
  const n = await readN(page);
  const c = await cardsLoc(page).count();
  await check(
    page,
    label,
    page.getByTestId('result-count'),
    async () => {
      expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(c);
      if (ref !== undefined) expect.soft(n, 'ค่าอ้างอิงตามแผน').toBe(ref);
      extra?.(n, c);
    },
    { actual: async () => ({ url: pathAndQuery(page), N: n, cards: c }) },
  );
  return n;
}

type Detail = {
  slug: string;
  status: number;
  title: string;
  pet: string;
  tags: string[];
  gf: boolean;
  type: string;
  life: string;
  gfFact: string;
  rating: number;
  firstSize: string;
  firstPrice: number;
  stockBadge: string;
  stockInfo: string;
};

/** อ่านหน้ารายละเอียดหลายชิ้นด้วยสคริปต์ (fetch HTML จาก server แล้ว parse) */
async function fetchDetails(page: Page, slugs: string[]): Promise<Detail[]> {
  const raw = await page.evaluate(async (list) => {
    return Promise.all(
      list.map(async (slug) => {
        const r = await fetch(`/products/${slug}`);
        const d = new DOMParser().parseFromString(await r.text(), 'text/html');
        const txt = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const facts: Record<string, string> = {};
        d.querySelectorAll('.pd-facts li').forEach((li) => {
          facts[txt(li.querySelector('small'))] = txt(li.querySelector('strong'));
        });
        const petTag = d.querySelector('.pd-badges .tag-cat, .pd-badges .tag-dog');
        const firstSize = d.querySelector('[data-testid="size-option"]');
        return {
          slug,
          status: r.status,
          title: txt(d.querySelector('[data-testid="product-title"]')),
          pet: petTag?.classList.contains('tag-cat') ? 'cat' : petTag?.classList.contains('tag-dog') ? 'dog' : '',
          tags: [...d.querySelectorAll('.pd-badges .tag')].map((t) => txt(t)),
          gf: !!d.querySelector('.pd-badges .tag-gf'),
          type: facts['ประเภท'] ?? '',
          life: facts['ช่วงวัย'] ?? '',
          gfFact: facts['สูตรเกรนฟรี'] ?? '',
          ratingText: txt(d.querySelector('[data-testid="rating"] strong')),
          firstSize: firstSize?.getAttribute('data-size') ?? txt(firstSize?.querySelector('span') ?? null),
          firstPriceText: txt(firstSize?.querySelector('small') ?? null),
          stockBadge: txt(d.querySelector('.pd-badges [data-testid="stock-badge"]')),
          stockInfo: txt(d.querySelector('[data-testid="stock-info"]')),
        };
      }),
    );
  }, slugs);
  return raw.map((r) => ({
    slug: r.slug,
    status: r.status,
    title: r.title,
    pet: r.pet,
    tags: r.tags,
    gf: r.gf,
    type: r.type,
    life: r.life,
    gfFact: r.gfFact,
    rating: num(r.ratingText),
    firstSize: r.firstSize,
    firstPrice: num(r.firstPriceText),
    stockBadge: r.stockBadge,
    stockInfo: r.stockInfo,
  }));
}

/** ดึง HTML จาก server (แทน curl) */
async function curlHtml(page: Page, url: string): Promise<{ status: number; html: string }> {
  const r = await page.request.get(url, { maxRedirects: 0 });
  return { status: r.status(), html: await r.text() };
}

/** parse HTML ด้วย DOMParser ในหน้า (ไม่รันสคริปต์) แล้วนับ selector ที่เกี่ยวกับ XSS + อ่านค่าหลักของหน้า */
async function parseHtml(page: Page, html: string, scriptText?: string) {
  return page.evaluate(
    ({ html, scriptText }) => {
      const d = new DOMParser().parseFromString(html, 'text/html');
      const txt = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
      return {
        title: d.querySelector('title')?.textContent ?? null,
        h1: txt(d.querySelector('main h1')),
        resultCount: txt(d.querySelector('[data-testid="result-count"]')),
        articles: d.querySelectorAll('main article').length,
        slugs: [...d.querySelectorAll('main article')].map((a) => a.getAttribute('data-slug') ?? ''),
        imgX: d.querySelectorAll('img[src="x"]').length,
        svgOnload: d.querySelectorAll('svg[onload]').length,
        onerrorXss: d.querySelectorAll('[onerror*="__xss"]').length,
        onloadXss: d.querySelectorAll('[onload*="__xss"]').length,
        payloadScripts: scriptText ? [...d.querySelectorAll('script')].filter((s) => (s.textContent ?? '').trim() === scriptText).length : 0,
      };
    },
    { html, scriptText },
  );
}

/** ค่าที่เกี่ยวกับ XSS ในหน้าเว็บจริง (หลังรันสคริปต์) */
async function xssState(page: Page, scriptText?: string) {
  return page.evaluate((scriptText) => {
    return {
      xss: typeof (window as unknown as { __xss?: unknown }).__xss === 'undefined' ? 'undefined' : String((window as unknown as { __xss?: unknown }).__xss),
      imgX: document.querySelectorAll('img[src="x"]').length,
      svgOnload: document.querySelectorAll('svg[onload]').length,
      onerrorXss: document.querySelectorAll('[onerror*="__xss"]').length,
      onloadXss: document.querySelectorAll('[onload*="__xss"]').length,
      payloadScripts: scriptText ? [...document.scripts].filter((s) => s.textContent?.trim() === scriptText).length : 0,
      headSvgImg: document.head.querySelectorAll('svg,img').length,
    };
  }, scriptText);
}

/** เก็บ console error/warning และ pageerror */
function watchConsole(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return { errors, warnings };
}

/** dialog ที่เปิดขึ้น (XSS) → จดไว้แล้ว dismiss */
function watchDialogs(page: Page): string[] {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    d.dismiss().catch(() => {});
  });
  return dialogs;
}

const isSorted = (a: number[], dir: 'asc' | 'desc') =>
  a.every((v, i) => i === 0 || (dir === 'asc' ? a[i - 1] <= v : a[i - 1] >= v));

type CartLine = { slug: string; size: string; qty: number };
async function ppCart(page: Page): Promise<CartLine[] | string | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('pp-cart');
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  });
}
const cartLines = (c: CartLine[] | string | null): CartLine[] => (Array.isArray(c) ? c : []);
const cartQty = (c: CartLine[] | string | null) => cartLines(c).reduce((s, l) => s + Number(l.qty), 0);

/** รอ pp-cart ให้มีจำนวนรวม = n (ไม่ล้มถ้าไม่ถึง) */
async function waitCartQty(page: Page, n: number, lines?: number): Promise<void> {
  await page
    .waitForFunction(
      ({ n, lines }) => {
        try {
          const c = JSON.parse(localStorage.getItem('pp-cart') || '[]') as { qty: number }[];
          return c.reduce((s, l) => s + Number(l.qty), 0) === n && (lines === undefined || c.length === lines);
        } catch {
          return false;
        }
      },
      { n, lines },
      { timeout: 5_000 },
    )
    .catch(() => {});
}

/** ตรวจสรุปยอดในหน้า /cart */
async function checkCartSummary(page: Page, label: string, subtotal: string, shipping: RegExp, total: string): Promise<void> {
  const sum = page.locator('[data-testid="summary-subtotal"], [data-testid="summary-shipping"], [data-testid="summary-total"]');
  await check(page, label, sum, async () => {
    await expect.soft(page.getByTestId('summary-subtotal')).toHaveText(subtotal);
    await expect.soft(page.getByTestId('summary-shipping')).toHaveText(shipping);
    await expect.soft(page.getByTestId('summary-total')).toHaveText(total);
  }, {
    actual: async () => ({
      subtotal: await page.getByTestId('summary-subtotal').innerText().catch(() => null),
      shipping: await page.getByTestId('summary-shipping').innerText().catch(() => null),
      total: await page.getByTestId('summary-total').innerText().catch(() => null),
    }),
  });
}

/** ค้นหาจากช่องค้นหาหัวเว็บด้วย Enter แล้วรอไปหน้า /products */
async function headerSearch(page: Page, term: string, via: 'enter' | 'button' = 'enter'): Promise<void> {
  const before = page.url();
  const input = page.getByTestId('search-input');
  await input.fill(term);
  if (via === 'enter') await input.press('Enter');
  else await page.getByTestId('search-submit').click();
  await page.waitForURL((u) => u.pathname === '/products' && u.href !== before, { timeout: 8_000 }).catch(() => {});
  await page.getByTestId('result-count').waitFor({ timeout: 8_000 }).catch(() => {});
  await settle(page);
}

const searchLine = (page: Page) => page.locator('main').getByText(/ผลการค้นหา/);

// ═════════════════════════ F01 สถิติหน้าแรกและการ์ดหมวด (P3) ═════════════════════════

test("TC-HOME-001 ตัวเลขสินค้าบนหน้าแรกตรงกับจำนวนการ์ดในแคตตาล็อก", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ตัวเลขแต่ละตัวบนหน้าแรก = \"พบ N\" = จำนวนการ์ดของหน้าที่ตรงกัน · ตัวเลขแมว + หมา = ตัวเลขทั้งหมด (ค่าอ้างอิงหลัง reset: 28 / 14 / 14 / 4 → 14 + 14 = 28)" },
    { type: 'source', description: "[R] · R01, R03 · ความเสี่ยง: ตัวเลขโฆษณาบนหน้าแรกไม่ตรงของที่มีจริง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const home = { total: NaN, cat: NaN, dog: NaN, toy: NaN };
  await test.step("1. เปิด `/` จดตัวเลข \"สินค้าทั้งหมด\" / แมว / หมา / ของเล่น", async () => {
    await open(page, '/');
    home.total = num(await page.locator('.hero-stats li').filter({ hasText: 'สินค้า' }).locator('strong').first().innerText());
    home.cat = num(await page.getByTestId('category-cat').locator('.category-kicker').innerText());
    home.dog = num(await page.getByTestId('category-dog').locator('.category-kicker').innerText());
    home.toy = num(await page.getByTestId('category-toys').locator('.category-kicker').innerText());
  });
  await check(
    page,
    'ตัวเลขหน้าแรก ทั้งหมด 28 / แมว 14 / หมา 14 / ของเล่น 4 และ แมว + หมา = ทั้งหมด',
    page.locator('.hero-stats li:first-child strong, [data-testid^="category-"] .category-kicker'),
    async () => {
      expect.soft(home.total, 'สินค้าทั้งหมด').toBe(28);
      expect.soft(home.cat, 'แมว').toBe(14);
      expect.soft(home.dog, 'หมา').toBe(14);
      expect.soft(home.toy, 'ของเล่น').toBe(4);
      expect.soft(home.cat + home.dog, 'แมว + หมา = ทั้งหมด').toBe(home.total);
    },
    { actual: async () => home },
  );
  await test.step("2. เปิด `/products` นับ `<article>` การ์ดและอ่าน \"พบ N รายการ\"", async () => {
    await open(page, '/products');
    await checkN(page, `/products: "พบ N" = จำนวนการ์ด = ตัวเลขทั้งหมดบนหน้าแรก (${home.total})`, 28, (n) => {
      expect.soft(n, 'ตัวเลขทั้งหมดบนหน้าแรก').toBe(home.total);
    });
  });
  await test.step("3. ทำซ้ำกับ `?pet=cat`, `?pet=dog`, `?type=toy`", async () => {
    const cases: [string, number, number][] = [
      ['/products?pet=cat', home.cat, 14],
      ['/products?pet=dog', home.dog, 14],
      ['/products?type=toy', home.toy, 4],
    ];
    for (const [url, homeVal, ref] of cases) {
      await open(page, url);
      await checkN(page, `${url}: "พบ N" = จำนวนการ์ด = ตัวเลขบนหน้าแรก (${homeVal})`, ref, (n) => {
        expect.soft(n, 'ตัวเลขบนหน้าแรก').toBe(homeVal);
      });
    }
  });
});

test("TC-HOME-002 การ์ดหมวดและปุ่ม \"ช้อปอาหารแมว/หมา\" พาไปหน้ารายการที่ตรงกับตัวเลขบนการ์ด", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "การ์ดแมว/ปุ่มช้อปอาหารแมว → URL มี `pet=cat` และปุ่ม \"แมว\" `aria-pressed=\"true\"` · การ์ดหมา/ปุ่มช้อปอาหารหมา → `pet=dog` · การ์ดของเล่น → `type=toy` · \"พบ N\" ของปลายทาง = ตัวเลขที่เขียนบนการ์ดหมวดนั้น = จำนวนการ์ดสินค้า (อ้างอิง 14 / 14 / 4)" },
    { type: 'source', description: "[R] · R01, R07 · ความเสี่ยง: ลิงก์หมวดพาไปผิดตัวกรอง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const cases = [
    { tid: 'category-cat', name: 'การ์ดหมวดแมว', key: 'pet', val: 'cat', btn: 'filter-pet-cat', numFrom: 'category-cat', ref: 14 },
    { tid: 'category-dog', name: 'การ์ดหมวดหมา', key: 'pet', val: 'dog', btn: 'filter-pet-dog', numFrom: 'category-dog', ref: 14 },
    { tid: 'category-toys', name: 'การ์ดหมวดของเล่น', key: 'type', val: 'toy', btn: '', numFrom: 'category-toys', ref: 4 },
    { tid: 'hero-cta-cat', name: 'ปุ่ม "ช้อปอาหารแมว"', key: 'pet', val: 'cat', btn: 'filter-pet-cat', numFrom: 'category-cat', ref: 14 },
    { tid: 'hero-cta-dog', name: 'ปุ่ม "ช้อปอาหารหมา"', key: 'pet', val: 'dog', btn: 'filter-pet-dog', numFrom: 'category-dog', ref: 14 },
  ];
  for (const [i, c] of cases.entries()) {
    const title = i === 0 ? "1. คลิกการ์ดหมวดแมว" : `${"3. กลับ `/` ทำซ้ำกับการ์ดหมา, ของเล่น, ปุ่ม \"ช้อปอาหารแมว\", \"ช้อปอาหารหมา\""} — ${c.name}`;
    let cardNum = NaN;
    await test.step(title, async () => {
      await open(page, '/');
      cardNum = num(await page.getByTestId(c.numFrom).locator('.category-kicker').innerText());
      await page.getByTestId(c.tid).click();
      await page.waitForURL((u) => u.pathname === '/products', { timeout: 10_000 }).catch(() => {});
      await page.getByTestId('result-count').waitFor({ timeout: 10_000 }).catch(() => {});
    });
    await test.step(i === 0 ? "2. ตรวจ URL, ปุ่มสัตว์ที่ `aria-pressed=\"true\"`, \"พบ N\"" : `ตรวจปลายทางของ${c.name}`, async () => {
      await check(page, `${c.name} → URL มี ${c.key}=${c.val}`, null, async () => {
        expect.soft(new URL(page.url()).searchParams.get(c.key)).toBe(c.val);
      }, { actual: async () => pathAndQuery(page) });
      if (c.btn) {
        await check(page, `${c.name} → ปุ่ม "${c.val === 'cat' ? 'แมว' : 'สุนัข'}" aria-pressed="true"`, page.getByTestId(c.btn), async (el) => {
          await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
        }, { actual: async () => page.getByTestId(c.btn).getAttribute('aria-pressed') });
      }
      await checkN(page, `${c.name} → "พบ N" = ตัวเลขบนการ์ดหมวด (${cardNum}) = จำนวนการ์ด (อ้างอิง ${c.ref})`, c.ref, (n) => {
        expect.soft(n, 'ตัวเลขบนการ์ดหมวด').toBe(cardNum);
      });
    });
  }
});

test("TC-HOME-003 ข้อความค่าส่งบนเว็บตรงกับ TEST-DATA ทุกจุด", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทั้ง 4 จุด (สถิติหน้าแรก, ป้ายลอย, แถบท้ายเว็บ, กล่องการจัดส่งในหน้าสินค้า) มีคำว่า \"ส่งฟรี\" ตามด้วยเกณฑ์ ฿999 · ทุกจุดที่มีคำว่า \"ส่งด่วน\" ระบุ ฿120 และพบคำว่า \"ส่งด่วน\" อย่างน้อย 1 จุด · ข้อ 3: ทุกค่าที่ regex `ส่งฟรี…` จับได้ = 999 และทุกค่าที่ regex `ส่งด่วน…` จับได้ = 120 (ไม่มีตัวเลขอื่น เช่น ฿1,000 หรือ ฿100)" },
    { type: 'source', description: "[D] · R02 · ความเสี่ยง: สื่อสารเงื่อนไขส่งฟรีผิดจากที่ร้านกำหนด · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const texts: Record<string, string> = {};
  await test.step("1. เปิด `/` อ่านข้อความค่าส่งในสถิติ ป้ายลอย และแถบท้ายเว็บ", async () => {
    await open(page, '/');
    texts.home = await page.locator('body').innerText();
  });
  const points = [
    { name: 'สถิติหน้าแรก', loc: page.locator('.hero-stats li').filter({ hasText: 'ส่งฟรี' }) },
    { name: 'ป้ายลอย', loc: page.locator('.hero .float-card').filter({ hasText: 'ส่งฟรี' }) },
    { name: 'แถบท้ายเว็บ', loc: page.locator('footer').getByText(/ส่งฟรี/) },
  ];
  for (const p of points) {
    await check(page, `${p.name}: มีคำว่า "ส่งฟรี" และเกณฑ์ ฿999`, p.loc, async (el) => {
      await expect.soft(el.first()).toContainText('ส่งฟรี');
      await expect.soft(el.first()).toContainText('฿999');
    });
  }
  // "ส่งด่วน" ตรวจเฉพาะ 4 จุดตามแผน: สถิติหน้าแรก, ป้ายลอย, แถบท้ายเว็บ (หน้าแรก) + กล่องการจัดส่ง (หน้าสินค้า)
  const expressHome = page
    .locator('.hero-stats li, .hero .float-card')
    .filter({ hasText: /ส่งด่วน/ })
    .or(page.locator('footer').getByText(/ส่งด่วน/));
  const expressHomeTexts = await expressHome.allInnerTexts();
  await test.step("2. เปิด `/products/kitten-salmon-dry` อ่านกล่องข้อมูลการจัดส่ง", async () => {
    await open(page, '/products/kitten-salmon-dry');
    texts.pdp = await page.locator('body').innerText();
  });
  await check(page, 'กล่องการจัดส่งในหน้าสินค้า: มีคำว่า "ส่งฟรี" และเกณฑ์ ฿999', page.locator('main').getByText(/ส่งฟรี/), async (el) => {
    await expect.soft(el.first()).toContainText('ส่งฟรี');
    await expect.soft(el.first()).toContainText('฿999');
  });
  const expressPdp = page.locator('main .perks li').filter({ hasText: /ส่งด่วน/ });
  const expressAll = [...expressHomeTexts, ...(await expressPdp.allInnerTexts())];
  await check(page, 'ทุกจุดที่มีคำว่า "ส่งด่วน" ระบุ ฿120 และพบอย่างน้อย 1 จุด', expressPdp, async () => {
    expect.soft(expressAll.length, 'จำนวนจุดที่มีคำว่า "ส่งด่วน"').toBeGreaterThanOrEqual(1);
    for (const t of expressAll) expect.soft(t, `จุด "ส่งด่วน": ${t}`).toContain('฿120');
  }, { actual: async () => expressAll });
  await test.step("3. ใน `innerText` ของทั้ง 2 หน้า ใช้ regex `ส่งฟรี[^฿]{0,20}฿([\\d,]+)` และ `ส่งด่วน[^฿]{0,10}฿([\\d,]+)` จดทุกค่าที่จับได้", async () => {
    const free: string[] = [];
    const express: string[] = [];
    for (const t of [texts.home, texts.pdp]) {
      for (const m of t.matchAll(/ส่งฟรี[^฿]{0,20}฿([\d,]+)/g)) free.push(m[1]);
      for (const m of t.matchAll(/ส่งด่วน[^฿]{0,10}฿([\d,]+)/g)) express.push(m[1]);
    }
    await check(page, 'ทุกค่าที่ regex ส่งฟรี… จับได้ = 999 และทุกค่าที่ regex ส่งด่วน… จับได้ = 120', null, async () => {
      for (const v of free) expect.soft(v.replace(/,/g, ''), 'ค่าที่ regex ส่งฟรี จับได้').toBe('999');
      for (const v of express) expect.soft(v.replace(/,/g, ''), 'ค่าที่ regex ส่งด่วน จับได้').toBe('120');
    }, { actual: async () => ({ ส่งฟรี: free, ส่งด่วน: express }) });
  });
});

test("TC-HOME-004 \"4.7★ คะแนนเฉลี่ย\" คิดเป็นค่าเฉลี่ยถ่วงตามจำนวนรีวิว", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ตัวเลขบนหน้าแรก = ค่าที่คำนวณในข้อ 2 · หลัง reset = \"4.7★\" (4.6612 ปัดเป็น 4.7, รีวิวรวม 7,118) · ถ้าข้อ 1 ได้ค่าอื่น ตัวเลขบนหน้าแรกต้องเปลี่ยนตาม" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน]+[R] · R01 · Q7 · ความเสี่ยง: คะแนนรีวิวที่โฆษณาไม่ตรงข้อมูลจริง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  let expected = NaN;
  let raw = NaN;
  let reviews = 0;
  await test.step("1. เรียก `GET /api/products` คำนวณ Σ(คะแนน×จำนวนรีวิว) ÷ Σจำนวนรีวิว", async () => {
    const items = await apiProducts(page);
    reviews = items.reduce((s, p) => s + p.reviewCount, 0);
    raw = items.reduce((s, p) => s + p.rating * p.reviewCount, 0) / reviews;
  });
  await test.step("2. ปัดเป็นทศนิยม 1 ตำแหน่ง", async () => {
    expected = Math.round(raw * 10) / 10;
    await checkApi('ค่าเฉลี่ยถ่วงตามจำนวนรีวิว หลัง reset = 4.6612 → 4.7 (รีวิวรวม 7,118)', { raw, rounded: expected, reviews }, () => {
      expect.soft(expected, 'ปัดทศนิยม 1 ตำแหน่ง').toBe(4.7);
      expect.soft(reviews, 'รีวิวรวม').toBe(7118);
    });
  });
  await test.step("3. เปิด `/` อ่านตัวเลขคะแนนเฉลี่ย", async () => {
    await open(page, '/');
    const stat = page.locator('.hero-stats li').filter({ hasText: 'คะแนน' }).locator('strong');
    await check(page, `ตัวเลขคะแนนเฉลี่ยบนหน้าแรก = ค่าที่คำนวณ (${expected.toFixed(1)}★) = "4.7★"`, stat, async (el) => {
      await expect.soft(el).toHaveText(`${expected.toFixed(1)}★`);
      await expect.soft(el).toHaveText('4.7★');
    });
  });
});

// ═════════════════════════ F03 ตัวกรองแคตตาล็อก (P2) ═════════════════════════

test("TC-FLT-001 \"พบ N รายการ\" เท่ากับจำนวนการ์ดจริงในตัวกรองเดี่ยวทุกค่า", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกค่า: N = จำนวนการ์ด = จำนวนจาก API (ค่าอ้างอิงหลัง reset: dry 11, wet 4, treat 5, toy 4, accessory 4, baby 4, adult 20, senior 4, grainFree 9) · การ์ดทุกใบมีป้ายตรงกับค่าที่กรอง ยกเว้นการ์ดของเล่น/ของใช้ใน `?life=adult` ซึ่งไม่มีป้ายช่วงวัยและตรวจใน TC-FLT-005 (Q1)" },
    { type: 'source', description: "[R] · R03 · ความเสี่ยง: ตัวนับผลลัพธ์ไม่ตรงกับที่แสดง · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const cases: { q: string; f: Filter; ref: number; key: 'type' | 'life' | 'gf'; val: string }[] = [
    ...(['dry', 'wet', 'treat', 'toy', 'accessory'] as const).map((t, i) => ({ q: `type=${t}`, f: { type: t }, ref: [11, 4, 5, 4, 4][i], key: 'type' as const, val: t })),
    ...(['baby', 'adult', 'senior'] as const).map((l, i) => ({ q: `life=${l}`, f: { life: l }, ref: [4, 20, 4][i], key: 'life' as const, val: l })),
    { q: 'grainFree=1', f: { grainFree: true }, ref: 9, key: 'gf', val: '1' },
  ];
  for (const c of cases) {
    await test.step(`${"1. เปิด `/products?<ตัวกรอง>` ทีละค่า"} — ?${c.q}`, async () => {
      await open(page, `/products?${c.q}`);
    });
    const n = await readN(page);
    const cards = await readCards(page);
    const api = apiMatch(items, c.f).length;
    const wrong = cards.filter((cd) => {
      if (c.key === 'type') return cd.type !== TYPE_LABEL[c.val];
      if (c.key === 'gf') return !cd.gf;
      if (c.val === 'adult' && NON_FOOD.includes(cd.type)) return false; // ตรวจใน TC-FLT-005 (Q1)
      return cd.life !== c.val;
    });
    await test.step(`${"2. อ่าน N จาก \"พบ N รายการ\""} / ${"3. นับ `<article>` การ์ดในหน้า"} / ${"4. นับสินค้าที่ตรงเงื่อนไขจาก `GET /api/products`"} — ?${c.q}`, async () => {
      await check(page, `?${c.q}: N = จำนวนการ์ด = จำนวนจาก API (อ้างอิง ${c.ref}) และการ์ดทุกใบมีป้ายตรง`, page.getByTestId('result-count'), async () => {
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards.length);
        expect.soft(n, '"พบ N" = จำนวนจาก API').toBe(api);
        expect.soft(n, 'ค่าอ้างอิงหลัง reset').toBe(c.ref);
        expect.soft(wrong.map((w) => `${w.slug} [${w.type} | ${w.tags.join(', ')}]`), 'การ์ดที่ป้ายไม่ตรงกับค่าที่กรอง').toEqual([]);
      }, { actual: async () => ({ N: n, cards: cards.length, api, wrong: wrong.map((w) => w.slug) }) });
    });
  }
});

test("TC-FLT-002 ผลรวมทุกประเภทเท่ากับจำนวนทั้งหมด", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ผลรวม 5 ประเภท = N ของ `/products` = จำนวนการ์ดใน `/products` (อ้างอิง 11 + 4 + 5 + 4 + 4 = 28) · ไม่มีสินค้าที่ไม่อยู่ในประเภทใดเลยและไม่มีสินค้าที่อยู่ 2 ประเภท: slug จาก 5 ประเภทรวมกันได้ 28 ค่าไม่ซ้ำ และเป็นชุดเดียวกับ slug ของ `/products`" },
    { type: 'source', description: "[R] · R04 · ความเสี่ยง: สินค้าตกหล่นจากทุกหมวดจนหาไม่เจอ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const typeN: Record<string, number> = {};
  const typeSlugs: string[] = [];
  await test.step("1. อ่าน \"พบ N\" ของแต่ละประเภท 5 ค่า", async () => {
    for (const t of ['dry', 'wet', 'treat', 'toy', 'accessory']) {
      await open(page, `/products?type=${t}`);
      typeN[t] = await readN(page);
      typeSlugs.push(...(await readCards(page)).map((c) => c.slug));
    }
  });
  let allN = NaN;
  let allSlugs: string[] = [];
  await test.step("2. อ่าน \"พบ N\" ของ `/products`", async () => {
    await open(page, '/products');
    allN = await readN(page);
    allSlugs = (await readCards(page)).map((c) => c.slug);
  });
  await test.step("3. รวมข้อ 1 เทียบกับข้อ 2", async () => {
    const sum = Object.values(typeN).reduce((s, v) => s + v, 0);
    await check(page, 'ผลรวม 5 ประเภท = N ของ /products = จำนวนการ์ดใน /products (11 + 4 + 5 + 4 + 4 = 28)', page.getByTestId('result-count'), async () => {
      expect.soft(typeN, 'N แต่ละประเภท').toEqual({ dry: 11, wet: 4, treat: 5, toy: 4, accessory: 4 });
      expect.soft(sum, 'ผลรวม 5 ประเภท = N ของ /products').toBe(allN);
      expect.soft(allN, 'N ของ /products = จำนวนการ์ด').toBe(allSlugs.length);
      expect.soft(sum, 'อ้างอิง').toBe(28);
    }, { actual: async () => ({ typeN, sum, allN, cards: allSlugs.length }) });
  });
  await test.step("4. จด slug การ์ดของทั้ง 5 ประเภทและของ `/products`", async () => {
    const uniq = [...new Set(typeSlugs)];
    await check(page, 'slug จาก 5 ประเภทรวมกันได้ 28 ค่าไม่ซ้ำ และเป็นชุดเดียวกับ slug ของ /products', null, async () => {
      expect.soft(typeSlugs.length, 'จำนวน slug รวม 5 ประเภท').toBe(28);
      expect.soft(uniq.length, 'จำนวน slug ไม่ซ้ำ').toBe(28);
      expect.soft([...uniq].sort(), 'ชุด slug เทียบ /products').toEqual([...allSlugs].sort());
    }, { actual: async () => ({ typeSlugs: typeSlugs.length, unique: uniq.length, missing: allSlugs.filter((s) => !uniq.includes(s)), dup: typeSlugs.filter((s, i) => typeSlugs.indexOf(s) !== i) }) });
  });
});

test("TC-FLT-003 ใช้ตัวกรองหลายตัวผ่าน UI ทีละขั้นแบบ AND และกรณีได้ 0 รายการ", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกขั้น N = จำนวนการ์ด และการ์ดทุกใบตรงทุกเงื่อนไขที่เลือกตามหน้ารายละเอียด · การเพิ่มตัวกรองต้องไม่ทำให้ N เพิ่ม (อ้างอิง 14 → 2 → 2 → 2 → 0) · เมื่อได้ 0: มีข้อความที่มีคำว่า \"ไม่พบ\" และปุ่ม \"ล้างตัวกรองทั้งหมด\" มองเห็นได้ · การ์ด 0 ใบ" },
    { type: 'source', description: "[R] · R06, R03 · ความเสี่ยง: ตัวกรองหลายตัวทำงานแบบ OR หรือไม่ครบเงื่อนไข · เทคนิค: Happy path, Boundary" },
  ],
}, async ({ page }) => {
  await open(page, '/products?pet=cat');
  const stages: { name: string; f: Filter; ref: number; act: () => Promise<void> }[] = [
    { name: 'แมว', f: { pet: 'cat' }, ref: 14, act: async () => {} },
    { name: 'ประเภท "ขนม"', f: { pet: 'cat', type: 'treat' }, ref: 2, act: async () => {
      await page.getByTestId('filter-type').selectOption('treat');
      await settle(page, (u) => u.searchParams.get('type') === 'treat');
    } },
    { name: 'ช่วงวัย "วัยโต"', f: { pet: 'cat', type: 'treat', life: 'adult' }, ref: 2, act: async () => {
      await page.getByTestId('filter-life').selectOption('adult');
      await settle(page, (u) => u.searchParams.get('life') === 'adult');
    } },
    { name: 'ติ๊ก "เกรนฟรี"', f: { pet: 'cat', type: 'treat', life: 'adult', grainFree: true }, ref: 2, act: async () => {
      await page.getByTestId('filter-grainfree').check();
      await settle(page, (u) => u.searchParams.has('grainFree'));
    } },
    { name: 'เปลี่ยนช่วงวัยเป็น "สูงวัย"', f: { pet: 'cat', type: 'treat', life: 'senior', grainFree: true }, ref: 0, act: async () => {
      await page.getByTestId('filter-life').selectOption('senior');
      await settle(page, (u) => u.searchParams.get('life') === 'senior');
    } },
  ];
  let prevN = Infinity;
  for (const s of stages) {
    await test.step(`${"1. ทำทีละขั้นตามข้อมูลทดสอบ"} — ${s.name}`, async () => {
      await s.act();
    });
    await test.step(`${"2. ทุกขั้นอ่าน \"พบ N\", นับการ์ด, เปิดหน้ารายละเอียดของการ์ดทุกใบเทียบสัตว์/ประเภท/ช่วงวัย/เกรนฟรี"} — ${s.name}`, async () => {
      const n = await readN(page);
      const cards = await readCards(page);
      const details = await fetchDetails(page, cards.map((c) => c.slug));
      const bad = details.filter(
        (d) =>
          (s.f.pet && d.pet !== s.f.pet) ||
          (s.f.type && d.type !== TYPE_LABEL[s.f.type]) ||
          (s.f.life && lifeOf(d.life) !== s.f.life) ||
          (s.f.grainFree && !d.gf),
      );
      const before = prevN;
      await check(page, `${s.name}: N = จำนวนการ์ด (อ้างอิง ${s.ref}) · ไม่เพิ่มจากขั้นก่อน · การ์ดทุกใบตรงทุกเงื่อนไขตามหน้ารายละเอียด`, page.getByTestId('result-count'), async () => {
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards.length);
        expect.soft(n, 'ค่าอ้างอิง (14 → 2 → 2 → 2 → 0)').toBe(s.ref);
        if (before !== Infinity) expect.soft(n, 'เพิ่มตัวกรองแล้ว N ต้องไม่เพิ่ม').toBeLessThanOrEqual(before);
        expect.soft(bad.map((d) => `${d.slug} [${d.pet} ${d.type} ${d.life} gf=${d.gf}]`), 'การ์ดที่ไม่ตรงเงื่อนไขในหน้ารายละเอียด').toEqual([]);
      }, { actual: async () => ({ url: pathAndQuery(page), N: n, cards: cards.length, details }) });
      prevN = n;
    });
  }
  await test.step("3. ขั้นสุดท้ายตรวจข้อความและปุ่มในหน้า", async () => {
    await check(page, 'ได้ 0: มีข้อความที่มีคำว่า "ไม่พบ"', page.locator('main').getByText(/ไม่พบ/).first(), async (el) => {
      await expect.soft(el).toBeVisible();
    });
    await check(page, 'ได้ 0: ปุ่ม "ล้างตัวกรองทั้งหมด" มองเห็นได้ · การ์ด 0 ใบ', page.getByRole('button', { name: 'ล้างตัวกรองทั้งหมด' }), async (el) => {
      await expect.soft(el).toBeVisible();
      await expect.soft(cardsLoc(page)).toHaveCount(0);
    });
  });
});

test("TC-FLT-004 ตัวกรองผสมที่เข้าทาง URL ตรง ๆ ได้ผล AND", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "N = จำนวนการ์ด = จำนวนจาก API ทุก URL (อ้างอิง 2 / 3 / 1 / 0) · การ์ดทุกใบเป็นสัตว์ ประเภท และช่วงวัยตามที่กรอง · URL สุดท้ายมีข้อความที่มีคำว่า \"ไม่พบ\"" },
    { type: 'source', description: "[R] · R06, R03 · ความเสี่ยง: ผลกรองผิดเมื่อเข้าทางลิงก์แชร์ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const cases: { url: string; f: Filter; ref: number }[] = [
    { url: '/products?pet=dog&type=toy', f: { pet: 'dog', type: 'toy' }, ref: 2 },
    { url: '/products?pet=cat&type=dry&life=adult', f: { pet: 'cat', type: 'dry', life: 'adult' }, ref: 3 },
    { url: '/products?pet=cat&type=dry&life=adult&grainFree=1', f: { pet: 'cat', type: 'dry', life: 'adult', grainFree: true }, ref: 1 },
    { url: '/products?pet=cat&type=treat&life=senior&grainFree=1', f: { pet: 'cat', type: 'treat', life: 'senior', grainFree: true }, ref: 0 },
  ];
  for (const c of cases) {
    await test.step(`${"1. เปิดแต่ละ URL"} — ${c.url}`, async () => {
      await open(page, c.url);
    });
    await test.step(`${"2. อ่าน \"พบ N\" และนับการ์ด"} / ${"3. เทียบกับจำนวนสินค้าที่ตรงทุกเงื่อนไขจาก `GET /api/products`"} — ${c.url}`, async () => {
      const n = await readN(page);
      const cards = await readCards(page);
      const api = apiMatch(items, c.f).length;
      const bad = cards.filter(
        (cd) => (c.f.pet && cd.pet !== c.f.pet) || (c.f.type && cd.type !== TYPE_LABEL[c.f.type]) || (c.f.life && cd.life !== c.f.life) || (c.f.grainFree && !cd.gf),
      );
      await check(page, `${c.url}: N = จำนวนการ์ด = จำนวนจาก API (อ้างอิง ${c.ref}) · การ์ดทุกใบตรงตามที่กรอง`, page.getByTestId('result-count'), async () => {
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards.length);
        expect.soft(n, '"พบ N" = จำนวนจาก API').toBe(api);
        expect.soft(n, 'ค่าอ้างอิง').toBe(c.ref);
        expect.soft(bad.map((b) => `${b.slug} [${b.pet} ${b.type} ${b.tags.join(', ')}]`), 'การ์ดที่ไม่ตรงตัวกรอง').toEqual([]);
      }, { actual: async () => ({ N: n, cards: cards.length, api, bad: bad.map((b) => b.slug) }) });
      if (c.ref === 0) {
        await check(page, `${c.url}: มีข้อความที่มีคำว่า "ไม่พบ"`, page.locator('main').getByText(/ไม่พบ/).first(), async (el) => {
          await expect.soft(el).toBeVisible();
        });
      }
    });
  }
});

test("TC-FLT-005 ตัวกรองช่วงวัยจัดการของเล่น/ของใช้เหมือนกันทุกวัย", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "จำนวนการ์ดของเล่น + ของใช้ใน `?life=adult` = ใน `?life=baby` = ใน `?life=senior` · ในแต่ละหน้า \"พบ N\" = จำนวนการ์ด (ตอนนี้ล้ม: วัยโตมีของเล่น 4 + ของใช้ 4 = 8 ชิ้น แต่วัยเด็กและสูงวัยมี 0)" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R05 · Q1 · ความเสี่ยง: ลูกค้ากรองวัยโตแล้วได้ของเล่นปน แต่วัยอื่นไม่เห็นของเล่นเลย · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const toyAcc: Record<string, number> = {};
  for (const life of ['baby', 'adult', 'senior']) {
    await test.step(`${"1. เปิดแต่ละ URL"} — ?life=${life}`, async () => {
      await open(page, `/products?life=${life}`);
    });
    await test.step(`${"2. นับการ์ดที่ประเภทเป็นของเล่นหรือของใช้ (ดูป้ายประเภท/หน้ารายละเอียด)"} — ?life=${life}`, async () => {
      const cards = await readCards(page);
      toyAcc[life] = cards.filter((c) => NON_FOOD.includes(c.type)).length;
      await checkN(page, `?life=${life}: "พบ N" = จำนวนการ์ด (ของเล่น + ของใช้ ${toyAcc[life]} ใบ)`);
    });
  }
  await test.step("3. เทียบจำนวนของทั้ง 3 วัย", async () => {
    await check(page, 'จำนวนการ์ดของเล่น + ของใช้ใน ?life=adult = ใน ?life=baby = ใน ?life=senior', null, async () => {
      expect.soft(toyAcc.adult, 'adult = baby').toBe(toyAcc.baby);
      expect.soft(toyAcc.adult, 'adult = senior').toBe(toyAcc.senior);
    }, { actual: async () => toyAcc });
  });
});

test("TC-FLT-006 UI ตรงกับ URL ที่เข้ามาตรง ๆ", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`?type=toy`: ปุ่ม \"ทั้งหมด\" `aria-pressed=\"true\"`, select ประเภท = ของเล่น · `?pet=cat&type=treat`: ปุ่ม \"แมว\" `aria-pressed=\"true\"` (ปุ่มอื่น `\"false\"`), ประเภท = ขนม · `?pet=cat&life=baby&grainFree=1`: ปุ่มแมว `\"true\"`, ช่วงวัย = วัยเด็ก, checkbox `checked` · ทุกหน้า \"พบ N\" = จำนวนการ์ด" },
    { type: 'source', description: "[R] · R07 · ความเสี่ยง: ลิงก์ที่แชร์ให้เห็น UI ไม่ตรงกับผลที่กรองอยู่ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const cases = [
    { url: '/products?type=toy', pet: 'all', type: 'toy', life: 'all', gf: false, label: 'ปุ่ม "ทั้งหมด" true · ประเภท = ของเล่น' },
    { url: '/products?pet=cat&type=treat', pet: 'cat', type: 'treat', life: 'all', gf: false, label: 'ปุ่ม "แมว" true (ปุ่มอื่น false) · ประเภท = ขนม' },
    { url: '/products?pet=cat&life=baby&grainFree=1', pet: 'cat', type: 'all', life: 'baby', gf: true, label: 'ปุ่มแมว true · ช่วงวัย = วัยเด็ก · checkbox checked' },
  ];
  for (const c of cases) {
    const tab = await page.context().newPage();
    await test.step(`${"1. เปิดแต่ละ URL ตรงในแท็บใหม่"} — ${c.url}`, async () => {
      await open(tab, c.url);
    });
    await test.step(`${"2. ตรวจปุ่มสัตว์ (`aria-pressed`), select ประเภท, select ช่วงวัย, checkbox เกรนฟรี"} — ${c.url}`, async () => {
      await check(tab, `${c.url}: ${c.label}`, tab.locator('.filters'), async () => {
        for (const p of ['all', 'cat', 'dog']) {
          await expect.soft(tab.getByTestId(`filter-pet-${p}`), `ปุ่ม ${p}`).toHaveAttribute('aria-pressed', p === c.pet ? 'true' : 'false');
        }
        await expect.soft(tab.getByTestId('filter-type'), 'select ประเภท').toHaveValue(c.type);
        await expect.soft(tab.getByTestId('filter-life'), 'select ช่วงวัย').toHaveValue(c.life);
        if (c.gf) await expect.soft(tab.getByTestId('filter-grainfree'), 'checkbox เกรนฟรี').toBeChecked();
        else await expect.soft(tab.getByTestId('filter-grainfree'), 'checkbox เกรนฟรี').not.toBeChecked();
      }, { actual: async () => readUi(tab) });
      await checkN(tab, `${c.url}: "พบ N" = จำนวนการ์ด`);
    });
    await tab.close();
  }
});

test("TC-FLT-007 เลือกตัวกรองผ่าน UI แล้ว back/reload ยังคงตัวกรอง", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "หลังแต่ละขั้น URL มีพารามิเตอร์ครบตามที่เลือก (`pet=dog`, `type=dry`, `life=adult`, `grainFree=1`) · หลัง back 2 ครั้ง URL = `?pet=dog&type=dry` (ไม่มี life/grainFree), ปุ่ม \"สุนัข\" `aria-pressed=\"true\"`, ประเภท = อาหารเม็ด, ช่วงวัย = ค่าเริ่มต้น, checkbox ไม่ติ๊ก, N = จำนวนการ์ด = N ของการเปิด URL นั้นตรง ๆ · หลัง reload ค่าเหมือนเดิมทุกจุด" },
    { type: 'source', description: "[R] · R07 · ความเสี่ยง: ปุ่ม back ทำให้ UI กับผลลัพธ์ไม่ตรงกัน · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await open(page, '/products');
  const urlCheck = async (label: string, want: Record<string, string>) => {
    await check(page, label, null, async () => {
      const p = params(page);
      for (const [k, v] of Object.entries(want)) expect.soft(p[k], `URL ${k}`).toBe(v);
    }, { actual: async () => pathAndQuery(page) });
  };
  await test.step("1. ทำ 4 ขั้น ตรวจ URL หลังทุกขั้น", async () => {
    await page.getByTestId('filter-pet-dog').click();
    await settle(page, (u) => u.searchParams.get('pet') === 'dog');
    await urlCheck('หลังกด "สุนัข": URL มี pet=dog', { pet: 'dog' });
    await page.getByTestId('filter-type').selectOption('dry');
    await settle(page, (u) => u.searchParams.get('type') === 'dry');
    await urlCheck('หลังเลือก "อาหารเม็ด": URL มี pet=dog, type=dry', { pet: 'dog', type: 'dry' });
    await page.getByTestId('filter-life').selectOption('adult');
    await settle(page, (u) => u.searchParams.get('life') === 'adult');
    await urlCheck('หลังเลือก "วัยโต": URL มี pet=dog, type=dry, life=adult', { pet: 'dog', type: 'dry', life: 'adult' });
    await page.getByTestId('filter-grainfree').check();
    await settle(page, (u) => u.searchParams.get('grainFree') === '1');
    await urlCheck('หลังติ๊ก "เกรนฟรี": URL มี pet=dog, type=dry, life=adult, grainFree=1', { pet: 'dog', type: 'dry', life: 'adult', grainFree: '1' });
  });
  await test.step("2. กด back 2 ครั้ง", async () => {
    await page.goBack();
    await page.waitForURL((u) => !u.searchParams.has('grainFree'), { timeout: 5_000 }).catch(() => {});
    await page.goBack();
    await settle(page, (u) => !u.searchParams.has('life'));
  });
  let directN = NaN;
  {
    const tab = await page.context().newPage();
    await open(tab, '/products?pet=dog&type=dry');
    directN = await readN(tab);
    await tab.close();
  }
  const verify = async (when: string) => {
    await check(page, `${when}: URL = ?pet=dog&type=dry (ไม่มี life/grainFree)`, null, async () => {
      expect.soft(params(page)).toEqual({ pet: 'dog', type: 'dry' });
    }, { actual: async () => pathAndQuery(page) });
    await check(page, `${when}: ปุ่ม "สุนัข" true · ประเภท = อาหารเม็ด · ช่วงวัย = ค่าเริ่มต้น · checkbox ไม่ติ๊ก`, page.locator('.filters'), async () => {
      await expect.soft(page.getByTestId('filter-pet-dog')).toHaveAttribute('aria-pressed', 'true');
      await expect.soft(page.getByTestId('filter-type')).toHaveValue('dry');
      await expect.soft(page.getByTestId('filter-life')).toHaveValue('all');
      await expect.soft(page.getByTestId('filter-grainfree')).not.toBeChecked();
    }, { actual: async () => readUi(page) });
    await checkN(page, `${when}: N = จำนวนการ์ด = N ของการเปิด URL ตรง ๆ (${directN})`, undefined, (n) => {
      expect.soft(n, 'N ของการเปิด URL ตรง ๆ').toBe(directN);
    });
  };
  await test.step("3. ตรวจ URL, UI, \"พบ N\"", async () => {
    await verify('หลัง back 2 ครั้ง');
  });
  await test.step("4. reload แล้วตรวจซ้ำ", async () => {
    await page.reload();
    await hydrated(page);
    await verify('หลัง reload');
  });
});

test("TC-FLT-008 ค่า query ที่ไม่รู้จักไม่ทำให้หน้าพังและกลับไปค่าเริ่มต้น", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุก URL: HTTP 200 · ไม่มี console error · N = จำนวนการ์ด = N ของ `/products` (อ้างอิง 28) · ปุ่ม \"ทั้งหมด\" `aria-pressed=\"true\"` และ select/checkbox เป็นค่าเริ่มต้น (UI ตรงกับผลที่ได้)" },
    { type: 'source', description: "[R] · R08 · ความเสี่ยง: ลิงก์เสีย/พิมพ์ผิดทำให้หน้าแคตตาล็อก error · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const con = watchConsole(page);
  const urls = ['/products?pet=fish', '/products?type=', '/products?life=kitten', '/products?sort=abc', '/products?pet=cat%20', '/products?pet[]=cat', '/products?pet=แมว', '/products?pet=cat%00'];
  for (const url of urls) {
    let status = 0;
    await test.step(`${"1. เปิดแต่ละ URL"} — ${url}`, async () => {
      con.errors.length = 0;
      const resp = await open(page, url);
      status = resp?.status() ?? 0;
    });
    await test.step(`${"2. ตรวจ HTTP status, console error"} / ${"3. อ่าน \"พบ N\", นับการ์ด, ตรวจ UI ตัวกรอง"} — ${url}`, async () => {
      const n = await readN(page);
      const cards = await cardsLoc(page).count();
      const u = await readUi(page);
      const errs = [...con.errors];
      await check(page, `${url}: HTTP 200 · ไม่มี console error · N = จำนวนการ์ด = 28 · UI ค่าเริ่มต้น`, page.locator('.filters, [data-testid="result-count"]'), async () => {
        expect.soft(status, 'HTTP status').toBe(200);
        expect.soft(errs, 'console error').toEqual([]);
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards);
        expect.soft(n, 'N ของ /products').toBe(28);
        expectDefaultUi(u, url.includes('sort='));
      }, { actual: async () => ({ status, N: n, cards, ui: u, errors: errs }) });
    });
  }
});

test("TC-FLT-009 ค่า query ตัวพิมพ์ใหญ่", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทั้งสอง URL: HTTP 200 · ใช้ค่าเริ่มต้น: N = จำนวนการ์ด = N ของ `/products` (28 รายการ) · ปุ่ม \"ทั้งหมด\" `aria-pressed=\"true\"` · select ประเภทเป็นค่าเริ่มต้น" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R08 · Q6 · ความเสี่ยง: พฤติกรรมกับตัวพิมพ์ใหญ่ไม่คงที่ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  for (const url of ['/products?pet=CAT', '/products?type=TOY']) {
    let status = 0;
    await test.step(`${"1. เปิดแต่ละ URL"} — ${url}`, async () => {
      const resp = await open(page, url);
      status = resp?.status() ?? 0;
    });
    await test.step(`${"2. อ่าน \"พบ N\", นับการ์ด, ตรวจ UI"} — ${url}`, async () => {
      const n = await readN(page);
      const cards = await cardsLoc(page).count();
      const u = await readUi(page);
      await check(page, `${url}: HTTP 200 · N = จำนวนการ์ด = 28 · ปุ่ม "ทั้งหมด" true · select ประเภทค่าเริ่มต้น`, page.locator('.filters, [data-testid="result-count"]'), async () => {
        expect.soft(status, 'HTTP status').toBe(200);
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards);
        expect.soft(n, 'N ของ /products').toBe(28);
        expect.soft(u.pressed, 'ปุ่มสัตว์ที่ aria-pressed="true"').toEqual(['all']);
        expect.soft(u.type, 'select ประเภท').toBe('all');
      }, { actual: async () => ({ status, N: n, cards, ui: u }) });
    });
  }
});

test("TC-FLT-010 พารามิเตอร์ซ้ำใน URL ได้ผลที่ UI กับรายการตรงกัน", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุก URL: HTTP 200 · รายการการ์ด (ลำดับและจำนวน) = รายการของ URL ค่าเดียวที่ตรงกับ UI ที่แสดง (เช่น ถ้าปุ่ม \"แมว\" `aria-pressed=\"true\"` การ์ดทุกใบต้องเป็นของแมวและ N = N ของ `?pet=cat`) · reload แล้วได้ผลเดิมทุกครั้ง" },
    { type: 'source', description: "[R] · R09 · ความเสี่ยง: UI บอกค่าหนึ่งแต่กรองด้วยอีกค่า · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const urls = ['/products?pet=cat&pet=dog', '/products?sort=price-asc&sort=price-desc', '/products?grainFree=1&grainFree=0'];
  for (const url of urls) {
    let status = 0;
    let ui: Awaited<ReturnType<typeof readUi>>;
    let cards: Card[] = [];
    await test.step(`${"1. เปิดแต่ละ URL"} — ${url}`, async () => {
      const resp = await open(page, url);
      status = resp?.status() ?? 0;
      cards = await readCards(page);
    });
    await test.step(`${"2. ตรวจ UI ตัวกรอง/select เรียง"} — ${url}`, async () => {
      ui = await readUi(page);
      await check(page, `${url}: HTTP 200 · อ่าน UI ตัวกรอง/select เรียง`, page.locator('.filters'), async () => {
        expect.soft(status, 'HTTP status').toBe(200);
        expect.soft(ui.pressed.length, 'ปุ่มสัตว์ที่กดอยู่มีใบเดียว').toBe(1);
      }, { actual: async () => ({ status, ui }) });
    });
    await test.step(`${"3. เปิด URL แบบค่าเดียวที่ตรงกับ UI ที่เห็น เทียบรายการการ์ด"} — ${url}`, async () => {
      let single = '/products';
      if (url.includes('pet=')) single = ui.pressed[0] && ui.pressed[0] !== 'all' ? `/products?pet=${ui.pressed[0]}` : '/products';
      else if (url.includes('sort=')) single = `/products?sort=${ui.sort}`;
      else single = ui.gf ? '/products?grainFree=1' : '/products';
      const tab = await page.context().newPage();
      await open(tab, single);
      const ref = await readCards(tab);
      const refN = await readN(tab);
      await tab.close();
      const n = await readN(page);
      await check(page, `${url}: รายการการ์ด (ลำดับและจำนวน) = รายการของ ${single} ซึ่งตรงกับ UI ที่แสดง`, cardsLoc(page), async () => {
        expect.soft(cards.map((c) => c.slug), `ลำดับการ์ดเทียบ ${single}`).toEqual(ref.map((c) => c.slug));
        expect.soft(n, `N เทียบ ${single}`).toBe(refN);
        if (ui.pressed[0] === 'cat' || ui.pressed[0] === 'dog') {
          expect.soft(cards.filter((c) => c.pet !== ui.pressed[0]).map((c) => c.slug), `การ์ดที่ไม่ใช่ของ ${ui.pressed[0]}`).toEqual([]);
        }
      }, { actual: async () => ({ single, ui, N: n, refN, cards: cards.map((c) => c.slug), ref: ref.map((c) => c.slug) }) });
    });
    await test.step(`${"4. reload 2 ครั้ง"} — ${url}`, async () => {
      for (const i of [1, 2]) {
        await page.reload();
        await hydrated(page);
        const again = await readCards(page);
        const ui2 = await readUi(page);
        await check(page, `${url}: reload ครั้งที่ ${i} ได้ผลเดิม`, cardsLoc(page), async () => {
          expect.soft(again.map((c) => c.slug), 'ลำดับการ์ด').toEqual(cards.map((c) => c.slug));
          expect.soft(ui2, 'UI').toEqual(ui);
        }, { actual: async () => ({ ui: ui2, cards: again.map((c) => c.slug) }) });
      }
    });
  }
});

test("TC-FLT-011 ค่า `grainFree` แต่ละรูปแบบ checkbox ตรงกับผล", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`=1`: checkbox `checked`, N = จำนวนการ์ด และการ์ดทุกใบมีป้ายเกรนฟรี (อ้างอิง 9) · `=0` และ `=` : checkbox ไม่ติ๊ก, N = N ของ `/products` (28) · `=true`: checkbox `checked`, N = 9 (เท่ากับ `=1`) · `=false`, `=abc`: checkbox ไม่ติ๊ก, N = 28 (เท่ากับ `/products`) · ทุกค่า HTTP 200" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R10 · Q49 · ความเสี่ยง: checkbox โชว์ไม่ติ๊กแต่ผลถูกกรองอยู่ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const cases = [
    { v: '1', on: true, n: 9 },
    { v: 'true', on: true, n: 9 },
    { v: '0', on: false, n: 28 },
    { v: 'false', on: false, n: 28 },
    { v: 'abc', on: false, n: 28 },
    { v: '', on: false, n: 28 },
  ];
  for (const c of cases) {
    const url = `/products?grainFree=${c.v}`;
    let status = 0;
    await test.step(`${"1. เปิด `/products?grainFree=<ค่า>` ทีละค่า"} — ${url}`, async () => {
      const resp = await open(page, url);
      status = resp?.status() ?? 0;
    });
    await test.step(`${"2. ตรวจ checkbox เกรนฟรี"} / ${"3. อ่าน \"พบ N\" และป้ายเกรนฟรีบนการ์ด"} — ${url}`, async () => {
      const n = await readN(page);
      const cards = await readCards(page);
      const box = page.getByTestId('filter-grainfree');
      await check(page, `grainFree=${c.v}: checkbox ${c.on ? 'checked' : 'ไม่ติ๊ก'} · N = ${c.n} = จำนวนการ์ด · HTTP 200${c.on ? ' · การ์ดทุกใบมีป้ายเกรนฟรี' : ''}`, page.locator('label.switch, [data-testid="result-count"]'), async () => {
        if (c.on) await expect.soft(box, 'checkbox เกรนฟรี').toBeChecked();
        else await expect.soft(box, 'checkbox เกรนฟรี').not.toBeChecked();
        expect.soft(status, 'HTTP status').toBe(200);
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards.length);
        expect.soft(n, 'ค่าอ้างอิง').toBe(c.n);
        if (c.on) expect.soft(cards.filter((x) => !x.gf).map((x) => x.slug), 'การ์ดที่ไม่มีป้ายเกรนฟรี').toEqual([]);
      }, { actual: async () => ({ status, checked: await box.isChecked().catch(() => null), N: n, cards: cards.length, noGf: cards.filter((x) => !x.gf).map((x) => x.slug) }) });
    });
  }
});

test("TC-FLT-012 ของเล่น/ของใช้ไม่ถูกนับเป็นเกรนฟรี", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: ไม่มีการ์ดที่ประเภทเป็นของเล่นหรือของใช้ (ทุกใบเป็นอาหารเม็ด/เปียก/ขนม) · ข้อ 2: ทุกใบหน้ารายละเอียดระบุว่าเป็นสูตรเกรนฟรี · ข้อ 3: \"พบ 0 รายการ\" การ์ด 0 ใบ มีข้อความที่มีคำว่า \"ไม่พบ\"" },
    { type: 'source', description: "[R] · R11 · ความเสี่ยง: ลูกค้าแพ้ธัญพืชได้สินค้าที่ไม่ใช่อาหารปนในผล · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  let cards: Card[] = [];
  await test.step("1. เปิด `?grainFree=1` ตรวจป้ายประเภทของการ์ดทุกใบ", async () => {
    await open(page, '/products?grainFree=1');
    cards = await readCards(page);
    await check(page, '?grainFree=1: ไม่มีการ์ดที่ประเภทเป็นของเล่นหรือของใช้ (ทุกใบเป็นอาหารเม็ด/เปียก/ขนม)', cardsLoc(page).locator('.card-meta span:first-child'), async () => {
      expect.soft(cards.filter((c) => !['อาหารเม็ด', 'อาหารเปียก', 'ขนม'].includes(c.type)).map((c) => `${c.slug} [${c.type}]`)).toEqual([]);
    }, { actual: async () => cards.map((c) => `${c.slug}: ${c.type}`) });
  });
  await test.step("2. เปิดหน้ารายละเอียดทุกใบ ดูช่อง \"สูตรเกรนฟรี\"", async () => {
    const details = await fetchDetails(page, cards.map((c) => c.slug));
    await check(page, 'ทุกใบหน้ารายละเอียดระบุว่าเป็นสูตรเกรนฟรี', null, async () => {
      expect.soft(details.length, 'จำนวนหน้ารายละเอียดที่เปิด').toBe(cards.length);
      expect.soft(details.filter((d) => !d.gf || d.gfFact === '—').map((d) => `${d.slug} [badges: ${d.tags.join(', ')} | สูตรเกรนฟรี: ${d.gfFact}]`), 'หน้าที่ไม่ระบุเกรนฟรี').toEqual([]);
    }, { actual: async () => details.map((d) => ({ slug: d.slug, badges: d.tags, gfFact: d.gfFact })) });
  });
  await test.step("3. เปิดอีก 2 URL", async () => {
    for (const url of ['/products?grainFree=1&type=toy', '/products?grainFree=1&type=accessory']) {
      await open(page, url);
      await checkN(page, `${url}: "พบ 0 รายการ" การ์ด 0 ใบ`, 0);
      await check(page, `${url}: มีข้อความที่มีคำว่า "ไม่พบ"`, page.locator('main').getByText(/ไม่พบ/).first(), async (el) => {
        await expect.soft(el).toBeVisible();
      });
    }
  });
});

test("TC-FLT-013 ปุ่มสัตว์เลือกได้ทีละตัวและไม่ล้างตัวกรองอื่น", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกขั้น URL ยังมี `type=dry`, `life=senior`, `grainFree=1`, `sort=price-desc` และ select/checkbox ยังตรงกับค่าเหล่านี้ · ข้อ 1: URL ไม่มี `pet` · ทุกขั้นมีปุ่มสัตว์ `aria-pressed=\"true\"` ใบเดียวพอดีและตรงกับ `pet` ใน URL (ไม่มี `pet` = \"ทั้งหมด\") · ข้อ 4 รายการการ์ดเหมือนในแท็บเดิม (อ้างอิงหลังข้อ 2: 1 รายการ)" },
    { type: 'source', description: "[R] · R12 · ความเสี่ยง: กดเปลี่ยนสัตว์แล้วตัวกรองที่ตั้งไว้หายเงียบ ๆ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const keep = { type: 'dry', life: 'senior', grainFree: '1', sort: 'price-desc' };
  await open(page, '/products?pet=cat&type=dry&life=senior&grainFree=1&sort=price-desc');
  const verify = async (when: string, pet: string | null) => {
    await check(page, `${when}: URL ยังมี type=dry, life=senior, grainFree=1, sort=price-desc · ${pet ? `pet=${pet}` : 'ไม่มี pet'}`, null, async () => {
      const p = params(page);
      for (const [k, v] of Object.entries(keep)) expect.soft(p[k], `URL ${k}`).toBe(v);
      if (pet) expect.soft(p.pet, 'URL pet').toBe(pet);
      else expect.soft(p.pet, 'URL ต้องไม่มี pet').toBeUndefined();
    }, { actual: async () => pathAndQuery(page) });
    const u = await readUi(page);
    await check(page, `${when}: select/checkbox ตรงกับค่าเดิม · ปุ่มสัตว์ aria-pressed="true" ใบเดียวตรงกับ pet ใน URL`, page.locator('.filters'), async () => {
      expect.soft(u.type, 'select ประเภท').toBe('dry');
      expect.soft(u.life, 'select ช่วงวัย').toBe('senior');
      expect.soft(u.gf, 'checkbox เกรนฟรี').toBe(true);
      expect.soft(u.sort, 'select เรียง').toBe('price-desc');
      expect.soft(u.pressed, 'ปุ่มสัตว์ที่กดอยู่').toEqual([pet ?? 'all']);
      const urlPet = params(page).pet ?? 'all';
      expect.soft(u.pressed[0], 'ตรงกับ pet ใน URL').toBe(urlPet);
    }, { actual: async () => ({ ui: u, url: pathAndQuery(page) }) });
  };
  await test.step("1. กดปุ่ม \"ทั้งหมด\" ตรวจ URL/UI", async () => {
    await page.getByTestId('filter-pet-all').click();
    await settle(page, (u) => !u.searchParams.has('pet'));
    await verify('ข้อ 1 กด "ทั้งหมด"', null);
  });
  let afterStep2: string[] = [];
  let finalUrl = '';
  await test.step("2. กด \"สุนัข\" ตรวจ URL/UI", async () => {
    await page.getByTestId('filter-pet-dog').click();
    await settle(page, (u) => u.searchParams.get('pet') === 'dog');
    await verify('ข้อ 2 กด "สุนัข"', 'dog');
    afterStep2 = (await readCards(page)).map((c) => c.slug);
    await checkN(page, 'ข้อ 2: "พบ N" = จำนวนการ์ด (อ้างอิง 1 รายการ)', 1);
  });
  let finalSlugs: string[] = [];
  await test.step("3. กด \"สุนัข\" อีกครั้ง ตรวจ URL/UI", async () => {
    await page.getByTestId('filter-pet-dog').click();
    await page.waitForTimeout(500);
    await settle(page);
    await verify('ข้อ 3 กด "สุนัข" อีกครั้ง', 'dog');
    finalSlugs = (await readCards(page)).map((c) => c.slug);
    finalUrl = page.url();
  });
  await test.step("4. เปิด URL ที่ได้ในแท็บใหม่ เทียบการ์ด", async () => {
    const tab = await page.context().newPage();
    await open(tab, finalUrl);
    const other = (await readCards(tab)).map((c) => c.slug);
    await check(tab, 'เปิด URL ที่ได้ในแท็บใหม่: รายการการ์ดเหมือนในแท็บเดิม', cardsLoc(tab), async () => {
      expect.soft(other, 'การ์ดในแท็บใหม่ = แท็บเดิม').toEqual(finalSlugs);
      expect.soft(other, 'การ์ดหลังข้อ 2 (อ้างอิง 1 รายการ)').toEqual(afterStep2);
    }, { actual: async () => ({ url: finalUrl, newTab: other, oldTab: finalSlugs }) });
    await tab.close();
  });
});

test("TC-FLT-014 \"ล้างตัวกรองทั้งหมด\" ล้างคำค้น `q` ด้วย", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "URL = `/products` (ไม่มี `q`, `pet`, `type`, `life`) · ไม่มีบรรทัด \"ผลการค้นหา\" · ช่องค้นหาว่าง · ปุ่ม \"ทั้งหมด\" `aria-pressed=\"true\"` · N = จำนวนการ์ด = ตัวเลขสินค้าทั้งหมดบนหน้าแรก (28)" },
    { type: 'source', description: "[R] · R13 · ความเสี่ยง: กดล้างแล้วยังติดคำค้น ลูกค้าคิดว่าไม่มีสินค้า · เทคนิค: State" },
  ],
}, async ({ page }) => {
  let homeTotal = NaN;
  await test.step("1. เปิด URL (ได้ 0 รายการ)", async () => {
    const tab = await page.context().newPage();
    await tab.goto('/');
    homeTotal = num(await tab.locator('.hero-stats li').filter({ hasText: 'สินค้า' }).locator('strong').first().innerText());
    await tab.close();
    await open(page, '/products?q=salmon&pet=cat&type=wet&life=baby');
  });
  await test.step("2. กด \"ล้างตัวกรองทั้งหมด\"", async () => {
    await page.getByRole('button', { name: 'ล้างตัวกรองทั้งหมด' }).click();
    await settle(page, (u) => !u.searchParams.has('pet'));
  });
  await test.step("3. ตรวจ URL, ช่องค้นหา, UI, \"พบ N\"", async () => {
    await check(page, 'URL = /products (ไม่มี q, pet, type, life)', null, async () => {
      expect.soft(pathAndQuery(page)).toBe('/products');
    }, { actual: async () => pathAndQuery(page) });
    await check(page, 'ไม่มีบรรทัด "ผลการค้นหา"', searchLine(page), async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await check(page, 'ช่องค้นหาว่าง', page.getByTestId('search-input'), async (el) => {
      await expect.soft(el).toHaveValue('');
    }, { actual: async () => page.getByTestId('search-input').inputValue() });
    await check(page, 'ปุ่ม "ทั้งหมด" aria-pressed="true"', page.getByTestId('filter-pet-all'), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => readUi(page) });
    await checkN(page, `N = จำนวนการ์ด = ตัวเลขสินค้าทั้งหมดบนหน้าแรก (${homeTotal}) = 28`, 28, (n) => {
      expect.soft(n, 'ตัวเลขบนหน้าแรก').toBe(homeTotal);
    });
  });
});

test("TC-FLT-015 H1 บอกสิ่งที่กรองอยู่และไม่ขัดกับผล", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`?type=toy`: H1 ไม่ใช่ \"สินค้าทั้งหมด\" และมีคำว่า \"ของเล่น\" · `?type=treat`: H1 มีคำว่า \"ขนม\" · `?pet=dog&type=toy`: H1 ไม่ใช่ \"อาหารสุนัข\" และมีคำว่า \"ของเล่น\" · ปลายทาง breadcrumb: H1 มีคำว่า \"ของเล่น\" (ตอนนี้ล้ม: H1 เปลี่ยนตาม `pet` อย่างเดียว ได้ \"สินค้าทั้งหมด\" / \"อาหารสุนัข\" / \"อาหารแมว\")" },
    { type: 'source', description: "[R] · R14 · ความเสี่ยง: หัวข้อหน้าบอกหมวดผิด ลูกค้าเข้าใจผิดว่ากำลังดูอะไร · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const h1 = page.locator('main h1');
  await test.step("1. เปิด 3 URL อ่าน `h1`", async () => {
    await open(page, '/products?type=toy');
    await check(page, '?type=toy: H1 ไม่ใช่ "สินค้าทั้งหมด" และมีคำว่า "ของเล่น"', h1, async (el) => {
      await expect.soft(el).not.toHaveText('สินค้าทั้งหมด');
      await expect.soft(el).toContainText('ของเล่น');
    });
    await open(page, '/products?type=treat');
    await check(page, '?type=treat: H1 มีคำว่า "ขนม"', h1, async (el) => {
      await expect.soft(el).toContainText('ขนม');
    });
    await open(page, '/products?pet=dog&type=toy');
    await check(page, '?pet=dog&type=toy: H1 ไม่ใช่ "อาหารสุนัข" และมีคำว่า "ของเล่น"', h1, async (el) => {
      await expect.soft(el).not.toHaveText('อาหารสุนัข');
      await expect.soft(el).toContainText('ของเล่น');
    });
  });
  await test.step("2. เปิด `?pet=cat&type=toy` คลิกการ์ดไม้ตกแมว", async () => {
    await open(page, '/products?pet=cat&type=toy');
    await page.locator('main article[data-slug="cat-feather-wand"]').getByTestId('product-name').click();
    await page.waitForURL('**/products/cat-feather-wand', { timeout: 10_000 }).catch(() => {});
    await hydrated(page);
  });
  await test.step("3. คลิก breadcrumb \"ของเล่นแมว\" อ่าน `h1` ของปลายทาง", async () => {
    await page.locator('nav.breadcrumb').getByRole('link', { name: 'ของเล่นแมว' }).click();
    await page.waitForURL((u) => u.pathname === '/products', { timeout: 10_000 }).catch(() => {});
    await page.getByTestId('result-count').waitFor({ timeout: 10_000 }).catch(() => {});
    await check(page, 'ปลายทาง breadcrumb "ของเล่นแมว": H1 มีคำว่า "ของเล่น"', h1, async (el) => {
      await expect.soft(el).toContainText('ของเล่น');
    }, { actual: async () => ({ url: pathAndQuery(page), h1: await h1.innerText().catch(() => null) }) });
  });
});

test("TC-FLT-016 `<title>` บอกหมวดที่กำลังดู ทั้งหลัง hydrate และใน HTML จาก server", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุก URL: `document.title` = ข้อความ H1 + \" · PawPantry\" (เช่น `?pet=cat` = \"อาหารแมว · PawPantry\", `?pet=dog` = \"อาหารสุนัข · PawPantry\") · `<title>` ใน HTML จาก curl เท่ากับในเบราว์เซอร์ (ตอนนี้ล้ม: \"สินค้าทั้งหมด · PawPantry\" ทุกตัวกรองและทุกคำค้น)" },
    { type: 'source', description: "[R]+[O-ยังไม่ยืนยัน] · R15 · Q8 · ความเสี่ยง: WCAG 2.4.2 แท็บ/ประวัติ/bookmark แยกหมวดไม่ได้ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const cases = [
    { url: '/products?pet=cat', want: 'อาหารแมว · PawPantry' },
    { url: '/products?pet=dog', want: 'อาหารสุนัข · PawPantry' },
    { url: '/products?q=salmon', want: '' },
  ];
  const browserTitle: Record<string, string> = {};
  await test.step("1. เปิดแต่ละ URL ในเบราว์เซอร์ อ่าน `document.title` และ `h1`", async () => {
    for (const c of cases) {
      await open(page, c.url);
      const t = await page.title();
      const h = (await page.locator('main h1').innerText()).trim();
      browserTitle[c.url] = t;
      await check(page, `${c.url}: document.title = H1 + " · PawPantry"${c.want ? ` (= "${c.want}")` : ''}`, page.locator('main h1'), async () => {
        expect.soft(t, 'document.title').toBe(`${h} · PawPantry`);
        if (c.want) expect.soft(t, 'document.title').toBe(c.want);
      }, { actual: async () => ({ title: t, h1: h }) });
    }
  });
  await test.step("2. `curl` URL เดียวกัน อ่านแท็ก `<title>` ใน HTML", async () => {
    for (const c of cases) {
      const { html } = await curlHtml(page, c.url);
      const parsed = await parseHtml(page, html);
      await check(page, `${c.url}: <title> ใน HTML จาก server = ในเบราว์เซอร์`, null, async () => {
        expect.soft(parsed.title, '<title> จาก server').toBe(browserTitle[c.url]);
      }, { actual: async () => ({ server: parsed.title, browser: browserTitle[c.url] }) });
    }
  });
});

test("TC-FLT-017 HTML จาก server (SSR) ตรงกับที่เบราว์เซอร์แสดง", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "H1, N และจำนวน `<article>` ใน HTML = ในเบราว์เซอร์ทุก URL (อ้างอิง 14 / 4 / 5) · ลำดับการ์ดเหมือนกัน · ไม่มี console error หรือคำเตือน hydration mismatch" },
    { type: 'source', description: "[R] · R16 · ความเสี่ยง: เนื้อหาเปลี่ยนหลังโหลด ทำให้ผลค้นหา/bot เห็นไม่ตรงกับลูกค้า · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const con = watchConsole(page);
  const cases = [
    { url: '/products?pet=cat', ref: 14 },
    { url: '/products?type=toy&sort=price-desc', ref: 4 },
    { url: '/products?q=salmon', ref: 5 },
  ];
  const server: Record<string, Awaited<ReturnType<typeof parseHtml>>> = {};
  await test.step("1. `curl` แต่ละ URL นับ `<article>` อ่าน H1 และ \"พบ N\" ใน HTML", async () => {
    await page.goto('/');
    for (const c of cases) {
      const { html } = await curlHtml(page, c.url);
      server[c.url] = await parseHtml(page, html);
    }
  });
  await test.step("2. เปิด URL เดียวกันในเบราว์เซอร์ อ่านค่าเดียวกัน", async () => {
    for (const c of cases) {
      await open(page, c.url);
      const s = server[c.url];
      const b = {
        h1: (await page.locator('main h1').innerText()).replace(/\s+/g, ' ').trim(),
        resultCount: (await page.getByTestId('result-count').innerText()).replace(/\s+/g, ' ').trim(),
        slugs: (await readCards(page)).map((x) => x.slug),
      };
      await check(page, `${c.url}: H1, "พบ N" และจำนวน <article> ใน HTML = ในเบราว์เซอร์ (อ้างอิง ${c.ref}) · ลำดับการ์ดเหมือนกัน`, page.locator('main h1, [data-testid="result-count"]'), async () => {
        expect.soft(s.h1, 'H1').toBe(b.h1);
        expect.soft(s.resultCount, '"พบ N"').toBe(b.resultCount);
        expect.soft(s.articles, 'จำนวน <article>').toBe(b.slugs.length);
        expect.soft(b.slugs.length, 'ค่าอ้างอิง').toBe(c.ref);
        expect.soft(num(s.resultCount), 'N ใน HTML').toBe(c.ref);
        expect.soft(s.slugs, 'ลำดับการ์ด').toEqual(b.slugs);
      }, { actual: async () => ({ server: { h1: s.h1, resultCount: s.resultCount, articles: s.articles }, browser: { h1: b.h1, resultCount: b.resultCount, articles: b.slugs.length } }) });
    }
  });
  await test.step("3. ตรวจ console", async () => {
    const hyd = [...con.errors, ...con.warnings].filter((m) => /hydrat|did not match|server rendered/i.test(m));
    await check(page, 'ไม่มี console error หรือคำเตือน hydration mismatch', null, async () => {
      expect.soft(con.errors, 'console error').toEqual([]);
      expect.soft(hyd, 'คำเตือน hydration').toEqual([]);
    }, { actual: async () => ({ errors: con.errors, warnings: con.warnings }) });
  });
});

test("TC-FLT-018 URL ที่มี `/` ท้ายได้ผลเหมือนไม่มี `/`", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุก URL ได้ 301 หรือ 308 และ `Location` = URL ที่ตัด `/` ท้ายโดย query ยังอยู่ (`/products?pet=cat`, `/products`, `/products/kitten-salmon-dry`) · หน้าสุดท้าย H1, N, จำนวนการ์ด (หรือเนื้อหาหน้าสินค้า) เท่ากับ URL ไม่มี `/` ทุกตัว · ไม่มี 404/500" },
    { type: 'source', description: "[R] · R17 · ความเสี่ยง: ลิงก์ที่มี `/` ท้ายเสียหรือทิ้งตัวกรอง · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const cases = [
    { slash: '/products/?pet=cat', plain: '/products?pet=cat', kind: 'list' },
    { slash: '/products/', plain: '/products', kind: 'list' },
    { slash: '/products/kitten-salmon-dry/', plain: '/products/kitten-salmon-dry', kind: 'pdp' },
  ];
  const head: Record<string, { status: number; location: string | null }> = {};
  await test.step("1. `curl -I` แต่ละ URL ดู status และ `Location`", async () => {
    for (const c of cases) {
      const r = await page.request.get(c.slash, { maxRedirects: 0 });
      const loc = r.headers()['location'] ?? null;
      head[c.slash] = { status: r.status(), location: loc };
      await checkApi(`${c.slash}: 301 หรือ 308 และ Location = ${c.plain}`, head[c.slash], () => {
        expect.soft([301, 308], 'HTTP status').toContain(r.status());
        const resolved = loc ? new URL(loc, baseURL()) : null;
        expect.soft(resolved ? resolved.pathname + resolved.search : null, 'Location').toBe(c.plain);
      });
    }
  });
  const readPage = async (kind: string) =>
    kind === 'list'
      ? { h1: await page.locator('main h1').innerText().catch(() => null), N: await readN(page), cards: await cardsLoc(page).count() }
      : { title: await page.getByTestId('product-title').innerText().catch(() => null), price: await page.locator('main [data-testid="product-price"]').first().innerText().catch(() => null), sizes: await page.getByTestId('size-option').allInnerTexts() };
  for (const c of cases) {
    let viaSlash: unknown;
    let status = 0;
    await test.step(`${"2. เปิดในเบราว์เซอร์ ตรวจ URL สุดท้าย H1 และ \"พบ N\""} — ${c.slash}`, async () => {
      const resp = await open(page, c.slash);
      status = resp?.status() ?? 0;
      viaSlash = await readPage(c.kind);
      await check(page, `${c.slash}: URL สุดท้าย = ${c.plain} · ไม่มี 404/500`, null, async () => {
        expect.soft(pathAndQuery(page), 'URL สุดท้าย').toBe(c.plain);
        expect.soft(status, 'HTTP status ของหน้าสุดท้าย').toBe(200);
      }, { actual: async () => ({ url: pathAndQuery(page), status }) });
    });
    await test.step(`${"3. เทียบกับ URL ที่ไม่มี `/` ท้าย"} — ${c.plain}`, async () => {
      await open(page, c.plain);
      const plain = await readPage(c.kind);
      await check(page, `${c.slash} เทียบ ${c.plain}: ${c.kind === 'list' ? 'H1, N, จำนวนการ์ด' : 'เนื้อหาหน้าสินค้า'} เท่ากัน`, c.kind === 'list' ? page.locator('main h1, [data-testid="result-count"]') : page.getByTestId('product-title'), async () => {
        expect.soft(viaSlash, 'หน้าที่มี / ท้าย').toEqual(plain);
      }, { actual: async () => ({ slash: viaSlash, plain }) });
    });
  }
});

test("TC-FLT-019 slug ตัวพิมพ์ผสมไม่ถูก redirect", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "HTTP 404 ไม่มี redirect (ไม่มี `Location`) · หน้ามีคำว่า \"ไม่พบ\" · ไม่แสดงข้อมูลสินค้าลูกแมว สูตรแซลมอน" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R18 · Q6, Q8 · ความเสี่ยง: พฤติกรรม URL ไม่คงที่ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  await test.step("1. `curl -I` URL ดู status และ `Location`", async () => {
    const r = await page.request.get('/products/Kitten-Salmon-Dry', { maxRedirects: 0 });
    const loc = r.headers()['location'] ?? null;
    await checkApi('/products/Kitten-Salmon-Dry: HTTP 404 ไม่มี redirect (ไม่มี Location)', { status: r.status(), location: loc }, () => {
      expect.soft(r.status(), 'HTTP status').toBe(404);
      expect.soft(loc, 'Location').toBeNull();
    });
  });
  await test.step("2. เปิดในเบราว์เซอร์ อ่านข้อความในหน้า", async () => {
    await open(page, '/products/Kitten-Salmon-Dry');
    await check(page, 'หน้ามีคำว่า "ไม่พบ"', page.locator('main').getByText(/ไม่พบ/).first(), async (el) => {
      await expect.soft(el).toBeVisible();
    });
    await check(page, 'ไม่แสดงข้อมูลสินค้าลูกแมว สูตรแซลมอน', page.locator('main'), async (el) => {
      await expect.soft(page.getByTestId('product-title')).toHaveCount(0);
      await expect.soft(el).not.toContainText('ลูกแมว สูตรแซลมอน');
    });
  });
});

// ═════════════════════════ F04 การเรียงลำดับ (P3) ═════════════════════════

test("TC-SORT-001 เรียงราคาต่ำ→สูงด้วยราคาเริ่มต้น (ขนาดเล็กสุด)", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "URL มี `sort=price-asc` · ราคาการ์ดเรียงไม่ลดลงตลอดทั้งหน้า · การ์ดแรกเป็นราคาต่ำสุดและใบสุดท้ายเป็นราคาสูงสุดของแคตตาล็อก (อ้างอิง ฿35 และ ฿1,590) · การ์ดลูกแมว สูตรแซลมอน ฿189 = ราคา 400 g ในหน้ารายละเอียด ฿189 · N ไม่เปลี่ยนจากก่อนเรียง" },
    { type: 'source', description: "[R] · R19 · ความเสี่ยง: ลูกค้าหาของถูกสุดไม่เจอ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const catMin = Math.min(...items.map(minPrice));
  const catMax = Math.max(...items.map(minPrice));
  await open(page, '/products');
  const n0 = await readN(page);
  await test.step("1. เลือก \"ราคาต่ำ→สูง\"", async () => {
    await page.getByTestId('sort-select').selectOption('price-asc');
    await settle(page, (u) => u.searchParams.get('sort') === 'price-asc');
    await check(page, 'URL มี sort=price-asc', null, async () => {
      expect.soft(params(page).sort).toBe('price-asc');
    }, { actual: async () => pathAndQuery(page) });
  });
  let cards: Card[] = [];
  await test.step("2. อ่านราคาทุกการ์ดตามลำดับ", async () => {
    cards = await readCards(page);
    const prices = cards.map((c) => c.price);
    await check(page, `ราคาการ์ดเรียงไม่ลดลงตลอดทั้งหน้า · ใบแรก = ต่ำสุด (฿${catMin}) ใบสุดท้าย = สูงสุด (฿${catMax}) ของแคตตาล็อก (อ้างอิง ฿35 และ ฿1,590)`, cardsLoc(page).getByTestId('product-price'), async () => {
      expect.soft(isSorted(prices, 'asc'), 'เรียงไม่ลดลง').toBe(true);
      expect.soft(prices[0], 'การ์ดแรก').toBe(catMin);
      expect.soft(prices[prices.length - 1], 'การ์ดสุดท้าย').toBe(catMax);
      expect.soft(prices[0], 'อ้างอิง').toBe(35);
      expect.soft(prices[prices.length - 1], 'อ้างอิง').toBe(1590);
    }, { actual: async () => prices });
    await checkN(page, `N ไม่เปลี่ยนจากก่อนเรียง (${n0})`, undefined, (n) => {
      expect.soft(n, 'N ก่อนเรียง').toBe(n0);
    });
  });
  await test.step("3. เปิดหน้ารายละเอียดลูกแมว สูตรแซลมอน ดูราคาขนาดแรก", async () => {
    const card = cards.find((c) => c.slug === 'kitten-salmon-dry');
    await open(page, '/products/kitten-salmon-dry');
    const first = page.getByTestId('size-option').first();
    await check(page, `การ์ดลูกแมว สูตรแซลมอน ฿${card?.price} = ราคา 400 g ในหน้ารายละเอียด ฿189`, first, async (el) => {
      await expect.soft(el).toContainText('400 g');
      await expect.soft(el).toContainText('฿189');
      expect.soft(card?.price, 'ราคาบนการ์ด').toBe(189);
      expect.soft(num(await el.locator('small').innerText().catch(() => '')), 'ราคาขนาดแรก = ราคาบนการ์ด').toBe(card?.price);
    });
  });
});

test("TC-SORT-002 เรียงราคาสูง→ต่ำ ร่วมกับตัวกรอง", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "URL แรก: ราคาเรียงไม่เพิ่มขึ้น การ์ดแรก = ราคาสูงสุด (฿1,590) ใบสุดท้าย = ต่ำสุด (฿35) · URL ที่สอง: ปุ่ม \"สุนัข\" `aria-pressed=\"true\"`, select เรียง = ราคาสูง→ต่ำ, ทุกการ์ดเป็นของสุนัข, ราคาไม่เพิ่มขึ้น, N = N ของ `?pet=dog`" },
    { type: 'source', description: "[R] · R19, R07 · ความเสี่ยง: การเรียงทิ้งตัวกรองหรือเรียงผิดทิศ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await test.step("1. เปิด URL แรก อ่านราคาทุกการ์ด", async () => {
    await open(page, '/products?sort=price-desc');
    const prices = (await readCards(page)).map((c) => c.price);
    await check(page, '?sort=price-desc: ราคาเรียงไม่เพิ่มขึ้น · การ์ดแรก = ฿1,590 ใบสุดท้าย = ฿35', cardsLoc(page).getByTestId('product-price'), async () => {
      expect.soft(isSorted(prices, 'desc'), 'เรียงไม่เพิ่มขึ้น').toBe(true);
      expect.soft(prices[0], 'การ์ดแรก').toBe(1590);
      expect.soft(prices[prices.length - 1], 'การ์ดสุดท้าย').toBe(35);
    }, { actual: async () => prices });
  });
  await test.step("2. เปิด URL ที่สอง อ่านราคาและตรวจว่าทุกการ์ดเป็นของสุนัข", async () => {
    const tab = await page.context().newPage();
    await open(tab, '/products?pet=dog');
    const dogN = await readN(tab);
    await tab.close();
    await open(page, '/products?pet=dog&sort=price-desc');
    const cards = await readCards(page);
    await check(page, '?pet=dog&sort=price-desc: ปุ่ม "สุนัข" true · select เรียง = ราคาสูง→ต่ำ', page.locator('.filters'), async () => {
      await expect.soft(page.getByTestId('filter-pet-dog')).toHaveAttribute('aria-pressed', 'true');
      await expect.soft(page.getByTestId('sort-select')).toHaveValue('price-desc');
    }, { actual: async () => readUi(page) });
    await check(page, '?pet=dog&sort=price-desc: ทุกการ์ดเป็นของสุนัข · ราคาไม่เพิ่มขึ้น', cardsLoc(page), async () => {
      expect.soft(cards.filter((c) => c.pet !== 'dog').map((c) => c.slug), 'การ์ดที่ไม่ใช่ของสุนัข').toEqual([]);
      expect.soft(isSorted(cards.map((c) => c.price), 'desc'), 'ราคาไม่เพิ่มขึ้น').toBe(true);
    }, { actual: async () => cards.map((c) => `${c.slug} ${c.pet} ฿${c.price}`) });
    await checkN(page, `N = N ของ ?pet=dog (${dogN})`, undefined, (n) => {
      expect.soft(n, 'N ของ ?pet=dog').toBe(dogN);
    });
  });
});

test("TC-SORT-003 ราคาเท่ากันคงลำดับยอดนิยมทั้งสองทิศ", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ในทุกกลุ่มราคาเท่ากัน ลำดับใน asc = ลำดับใน desc = ลำดับในยอดนิยม (ไม่กลับด้าน) · ไม้ตกแมวมาก่อนหนังปลาแซลมอนทั้ง 3 แบบ" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R20 · Q4 · ความเสี่ยง: ลำดับกระโดดไปมาทุกครั้งที่โหลด · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const orders: Record<string, Card[]> = {};
  await test.step("1. เปิด `/products` (ยอดนิยม) จดลำดับสัมพัทธ์ของสินค้าในแต่ละกลุ่มราคาเท่ากัน", async () => {
    await open(page, '/products');
    orders.popular = await readCards(page);
  });
  await test.step("2. เปิด `?sort=price-asc` จดลำดับในกลุ่มเดียวกัน", async () => {
    await open(page, '/products?sort=price-asc');
    orders.asc = await readCards(page);
  });
  await test.step("3. เปิด `?sort=price-desc` จดลำดับ", async () => {
    await open(page, '/products?sort=price-desc');
    orders.desc = await readCards(page);
  });
  const group = (list: Card[], price: number) => list.filter((c) => c.price === price).map((c) => c.slug);
  for (const price of [129, 149, 189, 259, 690]) {
    const g = { popular: group(orders.popular, price), asc: group(orders.asc, price), desc: group(orders.desc, price) };
    await check(page, `กลุ่มราคา ฿${price}: ลำดับใน asc = desc = ยอดนิยม`, cardsLoc(page).filter({ has: page.locator('[data-testid="product-price"]', { hasText: new RegExp(`^฿${price}$`) }) }), async () => {
      expect.soft(g.popular.length, `จำนวนสินค้าในกลุ่ม ฿${price}`).toBeGreaterThanOrEqual(2);
      expect.soft(g.asc, 'asc = ยอดนิยม').toEqual(g.popular);
      expect.soft(g.desc, 'desc = ยอดนิยม').toEqual(g.popular);
    }, { actual: async () => g });
  }
  await check(page, 'ไม้ตกแมวมาก่อนหนังปลาแซลมอนทั้ง 3 แบบ', null, async () => {
    for (const k of ['popular', 'asc', 'desc']) {
      const s = orders[k].map((c) => c.slug);
      const a = s.indexOf('cat-feather-wand');
      const b = s.indexOf('salmon-skin-treat');
      expect.soft(a >= 0 && b >= 0 && a < b, `${k}: ไม้ตกแมว (${a + 1}) ก่อน หนังปลาแซลมอน (${b + 1})`).toBe(true);
    }
  }, { actual: async () => Object.fromEntries(Object.entries(orders).map(([k, v]) => [k, v.map((c) => c.slug)])) });
});

test("TC-SORT-004 สินค้าหมดอยู่ตามลำดับราคาปกติและยังนับใน \"พบ N\"", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทั้ง 3 แบบ: มีการ์ดไก่ฟรีซดราย 1 ใบพร้อมสถานะหมด และ N เท่ากัน (นับของหมดด้วย) · asc: ราคาการ์ดก่อนหน้า ≤ ฿159 ≤ ราคาการ์ดถัดไป (ไม่ถูกดันไปท้าย) · desc: ราคาการ์ดก่อนหน้า ≥ ฿159 ≥ ถัดไป (อ้างอิงตำแหน่ง asc 10, desc 19, ยอดนิยม 16)" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R21 · Q4 · ความเสี่ยง: ของหมดหายจากตำแหน่งหรือตัวนับไม่รวม · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const SLUG = 'freeze-dried-chicken-cat';
  const res: Record<string, { N: number; idx: number; count: number; stock: string; prev?: number; next?: number }> = {};
  const read = async (key: string) => {
    const cards = await readCards(page);
    const idx = cards.findIndex((c) => c.slug === SLUG);
    res[key] = {
      N: await readN(page),
      idx: idx + 1,
      count: cards.filter((c) => c.slug === SLUG).length,
      stock: idx >= 0 ? cards[idx].stock : '',
      prev: idx > 0 ? cards[idx - 1].price : undefined,
      next: idx >= 0 && idx < cards.length - 1 ? cards[idx + 1].price : undefined,
    };
    const card = page.locator(`main article[data-slug="${SLUG}"]`);
    await check(page, `${key}: มีการ์ดไก่ฟรีซดราย 1 ใบพร้อมสถานะหมด`, card, async () => {
      expect.soft(res[key].count, 'จำนวนการ์ดไก่ฟรีซดราย').toBe(1);
      expect.soft(res[key].stock, 'ป้ายสถานะ').toContain('หมด');
    }, { actual: async () => res[key] });
  };
  await test.step("1. เปิด `/products` จด N และตำแหน่งไก่ฟรีซดราย", async () => {
    await open(page, '/products');
    await read('ยอดนิยม');
  });
  await test.step("2. เปิด `?sort=price-asc` ดูราคาการ์ดก่อนและหลังไก่ฟรีซดราย", async () => {
    await open(page, '/products?sort=price-asc');
    await read('asc');
    const r = res.asc;
    await check(page, `asc: ราคาการ์ดก่อนหน้า (฿${r.prev}) ≤ ฿159 ≤ ราคาการ์ดถัดไป (฿${r.next}) · ตำแหน่ง ${r.idx} (อ้างอิง 10)`, page.locator(`main article[data-slug="${SLUG}"]`), async () => {
      expect.soft(r.prev !== undefined && r.prev <= 159, 'ก่อนหน้า ≤ 159').toBe(true);
      expect.soft(r.next !== undefined && 159 <= r.next, '159 ≤ ถัดไป').toBe(true);
      expect.soft(r.idx, 'ตำแหน่งอ้างอิง').toBe(10);
    }, { actual: async () => r });
  });
  await test.step("3. เปิด `?sort=price-desc` ทำเหมือนข้อ 2", async () => {
    await open(page, '/products?sort=price-desc');
    await read('desc');
    const r = res.desc;
    await check(page, `desc: ราคาการ์ดก่อนหน้า (฿${r.prev}) ≥ ฿159 ≥ ถัดไป (฿${r.next}) · ตำแหน่ง ${r.idx} (อ้างอิง 19)`, page.locator(`main article[data-slug="${SLUG}"]`), async () => {
      expect.soft(r.prev !== undefined && r.prev >= 159, 'ก่อนหน้า ≥ 159').toBe(true);
      expect.soft(r.next !== undefined && 159 >= r.next, '159 ≥ ถัดไป').toBe(true);
      expect.soft(r.idx, 'ตำแหน่งอ้างอิง').toBe(19);
    }, { actual: async () => r });
  });
  await check(page, 'ทั้ง 3 แบบ N เท่ากัน (นับของหมดด้วย) · ตำแหน่งยอดนิยม 16', page.getByTestId('result-count'), async () => {
    expect.soft(res.asc.N, 'N asc = N ยอดนิยม').toBe(res['ยอดนิยม'].N);
    expect.soft(res.desc.N, 'N desc = N ยอดนิยม').toBe(res['ยอดนิยม'].N);
    expect.soft(res['ยอดนิยม'].N, 'N รวมของหมด').toBe(28);
    expect.soft(res['ยอดนิยม'].idx, 'ตำแหน่งยอดนิยม').toBe(16);
  }, { actual: async () => res });
});

test("TC-SORT-005 เรียงตามคะแนนรีวิว", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "คะแนนเรียงไม่เพิ่มขึ้นตลอดหน้า (อ้างอิง 4.9 → 4.3) · select เรียง = คะแนนรีวิว · คะแนนบนการ์ด = คะแนนในหน้ารายละเอียด · N = N ของ `/products`" },
    { type: 'source', description: "[R] · R22 · ความเสี่ยง: สินค้าคะแนนต่ำถูกดันขึ้นก่อน · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  let cards: Card[] = [];
  await test.step("1. เปิด URL", async () => {
    await open(page, '/products?sort=rating');
    cards = await readCards(page);
  });
  await test.step("2. อ่านคะแนน ★ ของทุกการ์ดตามลำดับ", async () => {
    const ratings = cards.map((c) => c.rating);
    await check(page, 'คะแนนเรียงไม่เพิ่มขึ้นตลอดหน้า (อ้างอิง 4.9 → 4.3) · select เรียง = คะแนนรีวิว', cardsLoc(page).locator('.card-rating'), async () => {
      expect.soft(isSorted(ratings, 'desc'), 'คะแนนไม่เพิ่มขึ้น').toBe(true);
      expect.soft(ratings[0], 'ใบแรก').toBe(4.9);
      expect.soft(ratings[ratings.length - 1], 'ใบสุดท้าย').toBe(4.3);
      await expect.soft(page.getByTestId('sort-select'), 'select เรียง').toHaveValue('rating');
    }, { actual: async () => ratings });
    const tab = await page.context().newPage();
    await open(tab, '/products');
    const allN = await readN(tab);
    await tab.close();
    await checkN(page, `N = N ของ /products (${allN})`, undefined, (n) => {
      expect.soft(n, 'N ของ /products').toBe(allN);
    });
  });
  await test.step("3. เทียบคะแนนกับหน้ารายละเอียด 3 ใบแรกและใบสุดท้าย", async () => {
    const picks = [cards[0], cards[1], cards[2], cards[cards.length - 1]].filter(Boolean);
    for (const c of picks) {
      await open(page, `/products/${c.slug}`);
      await check(page, `${c.name}: คะแนนบนการ์ด ${c.rating} = คะแนนในหน้ารายละเอียด`, page.getByTestId('rating').locator('strong'), async (el) => {
        expect.soft(num(await el.innerText().catch(() => ''))).toBe(c.rating);
      });
    }
  });
});

test("TC-SORT-006 ค่าการเรียงคงอยู่เมื่อ reload/back และไม่ล้างตัวกรอง", {
  tag: ["@P3", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: URL มี `pet=cat`, `type=treat`, `sort=price-desc` · ข้อ 2: select = ราคาสูง→ต่ำ ลำดับเหมือนก่อน reload · ข้อ 3: URL กลับเป็น `sort=price-desc`, select และลำดับการ์ดตรงกับ URL · ทุกขั้น N = จำนวนการ์ด (อ้างอิง 2)" },
    { type: 'source', description: "[R] · R07, R19 · ความเสี่ยง: เปลี่ยนการเรียงแล้วตัวกรองหาย · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await open(page, '/products?pet=cat&type=treat');
  let order: string[] = [];
  await test.step("1. เลือก \"ราคาสูง→ต่ำ\" ตรวจ URL", async () => {
    await page.getByTestId('sort-select').selectOption('price-desc');
    await settle(page, (u) => u.searchParams.get('sort') === 'price-desc');
    await check(page, 'URL มี pet=cat, type=treat, sort=price-desc', null, async () => {
      const p = params(page);
      expect.soft(p.pet).toBe('cat');
      expect.soft(p.type).toBe('treat');
      expect.soft(p.sort).toBe('price-desc');
    }, { actual: async () => pathAndQuery(page) });
    order = (await readCards(page)).map((c) => c.slug);
    await checkN(page, 'ข้อ 1: N = จำนวนการ์ด (อ้างอิง 2)', 2);
  });
  await test.step("2. reload ตรวจ select และลำดับ", async () => {
    await page.reload();
    await hydrated(page);
    const again = (await readCards(page)).map((c) => c.slug);
    await check(page, 'หลัง reload: select = ราคาสูง→ต่ำ ลำดับเหมือนก่อน reload', page.getByTestId('sort-select'), async (el) => {
      await expect.soft(el).toHaveValue('price-desc');
      expect.soft(again, 'ลำดับการ์ด').toEqual(order);
    }, { actual: async () => ({ sort: await page.getByTestId('sort-select').inputValue(), order: again }) });
    await checkN(page, 'ข้อ 2: N = จำนวนการ์ด (อ้างอิง 2)', 2);
  });
  await test.step("3. เลือก \"คะแนนรีวิว\" แล้วกด back 1 ครั้ง", async () => {
    await page.getByTestId('sort-select').selectOption('rating');
    await settle(page, (u) => u.searchParams.get('sort') === 'rating');
    await page.goBack();
    await settle(page, (u) => u.searchParams.get('sort') === 'price-desc');
    const again = (await readCards(page)).map((c) => c.slug);
    await check(page, 'หลัง back: URL กลับเป็น sort=price-desc (ยังมี pet=cat, type=treat)', null, async () => {
      const p = params(page);
      expect.soft(p.sort).toBe('price-desc');
      expect.soft(p.pet).toBe('cat');
      expect.soft(p.type).toBe('treat');
    }, { actual: async () => pathAndQuery(page) });
    await check(page, 'หลัง back: select และลำดับการ์ดตรงกับ URL', page.getByTestId('sort-select'), async (el) => {
      await expect.soft(el).toHaveValue('price-desc');
      expect.soft(again, 'ลำดับการ์ด = ลำดับของ sort=price-desc').toEqual(order);
    }, { actual: async () => ({ sort: await page.getByTestId('sort-select').inputValue(), order: again }) });
    await checkN(page, 'ข้อ 3: N = จำนวนการ์ด (อ้างอิง 2)', 2);
  });
});

// ═════════════════════════ F05 ค้นหาสินค้า (P2) ═════════════════════════

test("TC-SRCH-001 ค้นหาจากช่องบนหัวเว็บด้วย Enter และปุ่มค้นหา จากหน้าอื่น", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1 และ 3: URL = `/products?q=salmon` · มีบรรทัด \"ผลการค้นหา “salmon”\" · N = จำนวนการ์ด (อ้างอิง 5) · ทุกการ์ดเป็นสินค้าที่ชื่อไทยหรืออังกฤษ (ดู `GET /api/products`) มี \"salmon\" หรือ \"แซลมอน\" · ผลข้อ 1 = ข้อ 3 ทุกการ์ด" },
    { type: 'source', description: "[R] · R23 · ความเสี่ยง: ลูกค้าค้นหาของจากหน้าอื่นไม่ได้ · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const bySlug = new Map(items.map((p) => [p.slug, p]));
  const verify = async (when: string) => {
    await check(page, `${when}: URL = /products?q=salmon`, null, async () => {
      expect.soft(pathAndQuery(page)).toBe('/products?q=salmon');
    }, { actual: async () => pathAndQuery(page) });
    await check(page, `${when}: มีบรรทัด "ผลการค้นหา “salmon”"`, searchLine(page), async (el) => {
      await expect.soft(el).toHaveText('ผลการค้นหา “salmon”');
    });
    const cards = await readCards(page);
    const bad = cards.filter((c) => {
      const p = bySlug.get(c.slug);
      const hay = `${p?.name ?? c.name} ${p?.nameEn ?? c.nameEn}`.toLowerCase();
      return !(hay.includes('salmon') || hay.includes('แซลมอน'));
    });
    await checkN(page, `${when}: N = จำนวนการ์ด (อ้างอิง 5) · ทุกการ์ดชื่อมี salmon/แซลมอน`, 5, () => {
      expect.soft(bad.map((b) => b.slug), 'การ์ดที่ชื่อไม่มี salmon/แซลมอน').toEqual([]);
    });
    return cards.map((c) => c.slug);
  };
  let first: string[] = [];
  await test.step("1. พิมพ์ `salmon` ในช่องค้นหาหัวเว็บ กด Enter", async () => {
    await open(page, '/cart');
    await headerSearch(page, 'salmon', 'enter');
  });
  await test.step("2. ตรวจ URL, บรรทัดผลการค้นหา, \"พบ N\", การ์ด", async () => {
    first = await verify('ข้อ 1 (Enter)');
  });
  await test.step("3. กลับ `/cart` พิมพ์ `salmon` แล้วคลิกปุ่มค้นหา", async () => {
    await open(page, '/cart');
    await headerSearch(page, 'salmon', 'button');
    const second = await verify('ข้อ 3 (ปุ่มค้นหา)');
    await check(page, 'ผลข้อ 1 = ข้อ 3 ทุกการ์ด', cardsLoc(page), async () => {
      expect.soft(second).toEqual(first);
    }, { actual: async () => ({ enter: first, button: second }) });
  });
});

test("TC-SRCH-002 ค้นหาไม่สนตัวพิมพ์ ตัดช่องว่างหัวท้าย ค้นได้ทั้งไทย/อังกฤษ", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`salmon` = `SALMON` = `Salmon` (ชุดการ์ดเดียวกัน, อ้างอิง 5) · `แซลมอน` ได้การ์ดที่ชื่อไทยมี \"แซลมอน\" (อ้างอิง 5) · `␠kitten␠` = `kitten` (อ้างอิง 2) · `Kitten Salmon` ได้การ์ดที่ชื่อมีทั้งสองคำ (อ้างอิง 1) · ทุกคำ N = จำนวนการ์ด" },
    { type: 'source', description: "[R] · R23 · ความเสี่ยง: ลูกค้าพิมพ์ตัวใหญ่/เว้นวรรคเกินแล้วหาไม่เจอ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const bySlug = new Map(items.map((p) => [p.slug, p]));
  const terms = ['salmon', 'SALMON', 'Salmon', 'แซลมอน', 'kitten', ' kitten ', 'Kitten Salmon'];
  const res: Record<string, { N: number; slugs: string[] }> = {};
  await test.step(`${"1. ค้นทีละคำจากช่องค้นหาหัวเว็บ"} / ${"2. จดรายการ slug ของการ์ดที่ได้และ \"พบ N\""}`, async () => {
    for (const t of terms) {
      await open(page, '/cart');
      await headerSearch(page, t);
      const cards = await readCards(page);
      res[t] = { N: await readN(page), slugs: cards.map((c) => c.slug) };
      await checkN(page, `คำค้น "${t}": "พบ N" = จำนวนการ์ด`);
    }
  });
  await test.step("3. เทียบชุดผลระหว่างคำที่เป็นกลุ่มเดียวกัน", async () => {
    const sorted = (t: string) => [...res[t].slugs].sort();
    await check(page, 'salmon = SALMON = Salmon (ชุดการ์ดเดียวกัน, อ้างอิง 5)', null, async () => {
      expect.soft(sorted('SALMON'), 'SALMON').toEqual(sorted('salmon'));
      expect.soft(sorted('Salmon'), 'Salmon').toEqual(sorted('salmon'));
      expect.soft(res.salmon.N, 'อ้างอิง').toBe(5);
    }, { actual: async () => ({ salmon: res.salmon, SALMON: res.SALMON, Salmon: res.Salmon }) });
    const th = res['แซลมอน'].slugs.filter((s) => !(bySlug.get(s)?.name ?? '').includes('แซลมอน'));
    await check(page, '"แซลมอน" ได้การ์ดที่ชื่อไทยมี "แซลมอน" (อ้างอิง 5)', null, async () => {
      expect.soft(th, 'การ์ดที่ชื่อไทยไม่มี "แซลมอน"').toEqual([]);
      expect.soft(res['แซลมอน'].N, 'อ้างอิง').toBe(5);
    }, { actual: async () => res['แซลมอน'] });
    await check(page, '" kitten " = "kitten" (อ้างอิง 2)', null, async () => {
      expect.soft(sorted(' kitten '), 'มีช่องว่างหัวท้าย').toEqual(sorted('kitten'));
      expect.soft(res.kitten.N, 'อ้างอิง').toBe(2);
    }, { actual: async () => ({ kitten: res.kitten, spaced: res[' kitten '] }) });
    const both = res['Kitten Salmon'].slugs.filter((s) => {
      const p = bySlug.get(s);
      const hay = `${p?.name ?? ''} ${p?.nameEn ?? ''}`.toLowerCase();
      return !(hay.includes('kitten') && hay.includes('salmon'));
    });
    await check(page, '"Kitten Salmon" ได้การ์ดที่ชื่อมีทั้งสองคำ (อ้างอิง 1)', null, async () => {
      expect.soft(both, 'การ์ดที่ชื่อไม่มีทั้งสองคำ').toEqual([]);
      expect.soft(res['Kitten Salmon'].N, 'อ้างอิง').toBe(1);
    }, { actual: async () => res['Kitten Salmon'] });
  });
});

test("TC-SRCH-003 คำค้นว่าง ช่องว่างล้วน และคำที่ไม่มีสินค้า", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1–2: URL = `/products` (ไม่มี `q=` ค้าง) ไม่มีบรรทัด \"ผลการค้นหา\" N = ตัวเลขสินค้าทั้งหมด (28) · ข้อ 3: \"พบ 0 รายการ\" การ์ด 0 ใบ มีข้อความที่มีคำว่า \"ไม่พบ\" และปุ่ม \"ล้างตัวกรองทั้งหมด\" · ไม่มี error ทุกข้อ" },
    { type: 'source', description: "[R] · R23 · ความเสี่ยง: ค้นว่างแล้วได้หน้าเปล่าหรือ error · เทคนิค: Boundary, Negative" },
  ],
}, async ({ page }) => {
  const con = watchConsole(page);
  await open(page, '/');
  const homeTotal = num(await page.locator('.hero-stats li').filter({ hasText: 'สินค้า' }).locator('strong').first().innerText());
  const verifyAll = async (when: string) => {
    await check(page, `${when}: URL = /products (ไม่มี q= ค้าง)`, null, async () => {
      expect.soft(pathAndQuery(page)).toBe('/products');
    }, { actual: async () => pathAndQuery(page) });
    await check(page, `${when}: ไม่มีบรรทัด "ผลการค้นหา"`, searchLine(page), async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await checkN(page, `${when}: N = ตัวเลขสินค้าทั้งหมด (${homeTotal}) = 28`, 28, (n) => {
      expect.soft(n, 'ตัวเลขบนหน้าแรก').toBe(homeTotal);
    });
  };
  await test.step("1. ส่งค้นหาโดยไม่พิมพ์อะไร", async () => {
    await headerSearch(page, '', 'button');
    await verifyAll('ข้อ 1 คำค้นว่าง');
  });
  await test.step("2. พิมพ์ช่องว่าง 3 ตัวแล้ว Enter", async () => {
    await open(page, '/');
    await headerSearch(page, '   ');
    await verifyAll('ข้อ 2 ช่องว่าง 3 ตัว');
  });
  await test.step("3. ค้น `zzzz`", async () => {
    await headerSearch(page, 'zzzz');
    await checkN(page, 'ข้อ 3: "พบ 0 รายการ" การ์ด 0 ใบ', 0);
    await check(page, 'ข้อ 3: มีข้อความที่มีคำว่า "ไม่พบ" และปุ่ม "ล้างตัวกรองทั้งหมด"', page.locator('main').getByText(/ไม่พบ/).first().or(page.getByRole('button', { name: 'ล้างตัวกรองทั้งหมด' })), async () => {
      await expect.soft(page.locator('main').getByText(/ไม่พบ/).first()).toBeVisible();
      await expect.soft(page.getByRole('button', { name: 'ล้างตัวกรองทั้งหมด' })).toBeVisible();
    });
  });
  await check(page, 'ไม่มี error ทุกข้อ', null, async () => {
    expect.soft(con.errors).toEqual([]);
  }, { actual: async () => con.errors });
});

test("TC-SRCH-004 อักขระพิเศษไม่ถูกตีความเป็น regex", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกตัว: HTTP 200 ไม่มี 500 ไม่มี console error · `%` ถูก encode เป็น `q=%25` · `.*` ต้องไม่ได้ N = 28 (ไม่ match ทุกชิ้น) · การ์ดทุกใบที่ได้ต้องมีอักขระนั้นตรงตัวในชื่อ (อ้างอิงหลัง reset ตาม R24: `.` `.*` `(` `[` `%` = 0 รายการ · `\\` ยังไม่มีค่าอ้างอิง ใช้เกณฑ์ \"การ์ดทุกใบต้องมีอักขระนั้นตรงตัวในชื่อ\" อย่างเดียว)" },
    { type: 'source', description: "[R] · R24 · ความเสี่ยง: regex injection ทำให้ error หรือคืนผลทั้งร้าน · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const con = watchConsole(page);
  const items = await apiProducts(page);
  const bySlug = new Map(items.map((p) => [p.slug, p]));
  const chars: { ch: string; ref?: number }[] = [
    { ch: '.', ref: 0 },
    { ch: '.*', ref: 0 },
    { ch: '(', ref: 0 },
    { ch: '[', ref: 0 },
    { ch: '%', ref: 0 },
    { ch: '\\' },
  ];
  for (const { ch, ref } of chars) {
    await test.step(`${"1. พิมพ์ทีละตัวในช่องค้นหาแล้ว Enter"} — "${ch}"`, async () => {
      con.errors.length = 0;
      await open(page, '/cart');
      await headerSearch(page, ch);
    });
    await test.step(`${"2. ตรวจ status ของ document, console, \"พบ N\""} / ${"3. ตรวจชื่อการ์ดที่ได้ (ถ้ามี)"} — "${ch}"`, async () => {
      const r = await page.request.get(page.url());
      const status = r.status();
      const n = await readN(page);
      const cards = await readCards(page);
      const errs = [...con.errors];
      const bad = cards.filter((c) => {
        const p = bySlug.get(c.slug);
        return !(`${p?.name ?? c.name}`.includes(ch) || `${p?.nameEn ?? c.nameEn}`.includes(ch));
      });
      await check(page, `"${ch}": HTTP 200 · ไม่มี console error · N = จำนวนการ์ด · การ์ดทุกใบมีอักขระนี้ตรงตัวในชื่อ${ref !== undefined ? ` (อ้างอิง ${ref} รายการ)` : ''}`, page.getByTestId('result-count'), async () => {
        expect.soft(status, 'HTTP status ของ document').toBe(200);
        expect.soft(errs, 'console error').toEqual([]);
        expect.soft(n, '"พบ N" = จำนวนการ์ด').toBe(cards.length);
        expect.soft(bad.map((b) => b.slug), 'การ์ดที่ชื่อไม่มีอักขระนี้').toEqual([]);
        if (ref !== undefined) expect.soft(n, 'ค่าอ้างอิงหลัง reset (R24)').toBe(ref);
        if (ch === '.*') expect.soft(n, '".*" ต้องไม่ match ทุกชิ้น').not.toBe(28);
        if (ch === '%') expect.soft(page.url(), '"%" ถูก encode เป็น q=%25').toContain('q=%25');
      }, { actual: async () => ({ url: page.url(), status, N: n, cards: cards.map((c) => c.slug), errors: errs }) });
    });
  }
});

test("TC-SRCH-005 XSS ผ่านคำค้น `q` ถูก escape ทั้งหน้าเว็บและ HTML จาก server", {
  tag: ["@P1", "@5.1"],
  annotation: [
    { type: 'expected', description: "`window.__xss` = `undefined` · `img[src=\"x\"]` = 0 ตัว · `[...document.scripts].filter(s => s.textContent.trim() === 'window.__xss=2').length` = 0 (ไม่มีแท็ก `<script>` ที่มาจาก payload · ข้อความ payload ที่อยู่ในสตริงข้อมูลของสคริปต์อื่นไม่นับ) · `[onerror*=\"__xss\"]` = 0 · ไม่มี dialog · บรรทัด \"ผลการค้นหา “…”\" แสดง payload เป็นตัวอักษรตรงตัว · DOM ที่ parse จาก curl: `img[src=\"x\"]` = 0, `[onerror*=\"__xss\"]` = 0 และไม่มี `<script>` ที่ `textContent.trim()` = `window.__xss=2`" },
    { type: 'source', description: "[R] · R25 · ความเสี่ยง: reflected XSS ขโมย session/ตะกร้าผ่านลิงก์ค้นหา · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const dialogs = watchDialogs(page);
  const p1 = '<img src=x onerror="window.__xss=1">';
  const p2 = '<script>window.__xss=2</script>';
  const verify = async (when: string, payload: string) => {
    const s = await xssState(page, 'window.__xss=2');
    await check(page, `${when}: window.__xss = undefined · img[src="x"] = 0 · ไม่มี <script> จาก payload · [onerror*="__xss"] = 0 · ไม่มี dialog`, null, async () => {
      expect.soft(s.xss, 'window.__xss').toBe('undefined');
      expect.soft(s.imgX, 'img[src="x"]').toBe(0);
      expect.soft(s.payloadScripts, '<script> ที่ textContent = window.__xss=2').toBe(0);
      expect.soft(s.onerrorXss, '[onerror*="__xss"]').toBe(0);
      expect.soft(dialogs, 'dialog').toEqual([]);
    }, { actual: async () => ({ ...s, dialogs }) });
    await check(page, `${when}: บรรทัด "ผลการค้นหา “…”" แสดง payload เป็นตัวอักษรตรงตัว`, searchLine(page), async (el) => {
      await expect.soft(el).toHaveText(`ผลการค้นหา “${payload}”`);
    });
  };
  await test.step("1. พิมพ์ payload แรกในช่องค้นหาแล้ว Enter", async () => {
    await open(page, '/');
    await headerSearch(page, p1);
  });
  await test.step("2. ใน Console ตรวจ `window.__xss` และ `document.querySelectorAll('img[src=\"x\"]').length`", async () => {
    await verify('payload แรก (พิมพ์ในช่องค้นหา)', p1);
  });
  const url2 = `/products?q=${encodeURIComponent(p2)}`;
  await test.step("3. เปิด URL `?q=<payload ที่สอง encode แล้ว>` ตรง ๆ ตรวจซ้ำ", async () => {
    await open(page, url2);
    await verify('payload ที่สอง (เปิด URL ตรง ๆ)', p2);
  });
  await test.step("4. `curl` URL เดียวกัน นำ HTML เข้า `new DOMParser().parseFromString(html, 'text/html')` (ไม่รันสคริปต์) แล้วนับ selector เดียวกับข้อ 2", async () => {
    for (const [name, url] of [['payload แรก', `/products?q=${encodeURIComponent(p1)}`], ['payload ที่สอง', url2]]) {
      const { html } = await curlHtml(page, url);
      const d = await parseHtml(page, html, 'window.__xss=2');
      await check(page, `DOM ที่ parse จาก HTML ของ server (${name}): img[src="x"] = 0 · [onerror*="__xss"] = 0 · ไม่มี <script> ที่ textContent = window.__xss=2`, null, async () => {
        expect.soft(d.imgX, 'img[src="x"]').toBe(0);
        expect.soft(d.onerrorXss, '[onerror*="__xss"]').toBe(0);
        expect.soft(d.payloadScripts, '<script> จาก payload').toBe(0);
      }, { actual: async () => ({ url, imgX: d.imgX, onerrorXss: d.onerrorXss, payloadScripts: d.payloadScripts }) });
    }
  });
});

test("TC-SRCH-006 XSS ผ่านพารามิเตอร์ตัวกรอง (`pet`, `type`, `life`, `sort`)", {
  tag: ["@P1", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุก URL: HTTP 200 · `window.__xss` = `undefined` · `img[src=\"x\"]` = 0 และ `svg[onload]` = 0 · ไม่มี dialog · UI ตัวกรองเป็นค่าเริ่มต้นและ N = N ของ `/products` (28) · DOM ที่ parse จาก curl: `img[src=\"x\"]` = 0, `svg[onload]` = 0, `[onerror*=\"__xss\"]` = 0, `[onload*=\"__xss\"]` = 0" },
    { type: 'source', description: "[R] · R25, R08 · ความเสี่ยง: XSS ผ่านค่าตัวกรองที่ถูกสะท้อนลง H1/attribute · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const dialogs = watchDialogs(page);
  const cases: [string, string][] = [
    ['pet', '<img src=x onerror="window.__xss=3">'],
    ['type', '"><svg onload="window.__xss=4">'],
    ['life', '<img src=x onerror="window.__xss=5">'],
    ['sort', '"><svg onload="window.__xss=6">'],
  ];
  for (const [k, payload] of cases) {
    const url = `/products?${k}=${encodeURIComponent(payload)}`;
    let status = 0;
    await test.step(`${"1. เปิดแต่ละ URL"} — ?${k}=${payload}`, async () => {
      const resp = await open(page, url);
      status = resp?.status() ?? 0;
    });
    await test.step(`${"2. ตรวจ `window.__xss`, จำนวน `img[src=\"x\"]` และ `svg[onload]`"} — ?${k}=`, async () => {
      const s = await xssState(page);
      const u = await readUi(page);
      const n = await readN(page);
      await check(page, `?${k}=…: HTTP 200 · window.__xss = undefined · img[src="x"] = 0 · svg[onload] = 0 · ไม่มี dialog`, null, async () => {
        expect.soft(status, 'HTTP status').toBe(200);
        expect.soft(s.xss, 'window.__xss').toBe('undefined');
        expect.soft(s.imgX, 'img[src="x"]').toBe(0);
        expect.soft(s.svgOnload, 'svg[onload]').toBe(0);
        expect.soft(dialogs, 'dialog').toEqual([]);
      }, { actual: async () => ({ status, ...s, dialogs }) });
      await check(page, `?${k}=…: UI ตัวกรองเป็นค่าเริ่มต้นและ N = 28`, page.locator('.filters, [data-testid="result-count"]'), async () => {
        expectDefaultUi(u, true);
        expect.soft(n, 'N ของ /products').toBe(28);
      }, { actual: async () => ({ ui: u, N: n }) });
    });
    await test.step(`${"3. `curl` URL เดียวกัน นำ HTML เข้า `new DOMParser().parseFromString(html, 'text/html')` (ไม่รันสคริปต์) แล้วนับ `img[src=\"x\"]`, `svg[onload]`, `[onerror*=\"__xss\"]`, `[onload*=\"__xss\"]`"} — ?${k}=`, async () => {
      const { html } = await curlHtml(page, url);
      const d = await parseHtml(page, html);
      await check(page, `?${k}=…: DOM ที่ parse จาก HTML ของ server: img[src="x"], svg[onload], [onerror*="__xss"], [onload*="__xss"] = 0`, null, async () => {
        expect.soft(d.imgX, 'img[src="x"]').toBe(0);
        expect.soft(d.svgOnload, 'svg[onload]').toBe(0);
        expect.soft(d.onerrorXss, '[onerror*="__xss"]').toBe(0);
        expect.soft(d.onloadXss, '[onload*="__xss"]').toBe(0);
      }, { actual: async () => ({ imgX: d.imgX, svgOnload: d.svgOnload, onerrorXss: d.onerrorXss, onloadXss: d.onloadXss }) });
    });
  }
});

test("TC-SRCH-007 คำค้นที่ถูกสะท้อนลงช่องค้นหา (`value`) และ `<title>` ไม่หลุด attribute", {
  tag: ["@P1", "@5.1"],
  annotation: [
    { type: 'expected', description: "`window.__xss` = `undefined` · `svg[onload]` = 0 · `img[src=\"x\"]` = 0 · ถ้าช่องค้นหามีค่า ต้องเท่ากับ payload ตรงตัวทั้งสตริง (ไม่ถูกตัดที่ `\"` หรือ `'`) · `document.head.querySelectorAll('svg,img').length` = 0 (payload ใน `<title>` ไม่ถูกตีความเป็นแท็ก)" },
    { type: 'source', description: "[R] · R25, R27 · ความเสี่ยง: แก้ R27 (ใส่ q ลงช่องค้นหา) แล้วเกิดช่อง XSS ใหม่ใน attribute · เทคนิค: Security" },
  ],
}, async ({ page }) => {
  const dialogs = watchDialogs(page);
  for (const payload of ['"><svg onload="window.__xss=7">', "'><img src=x onerror=window.__xss=8>"]) {
    await test.step(`${"1. เปิดแต่ละ URL"} — ?q=${payload}`, async () => {
      await open(page, `/products?q=${encodeURIComponent(payload)}`);
    });
    let value = '';
    let title = '';
    await test.step(`${"2. อ่าน `.value` ของช่องค้นหาและ `document.title`"} — ?q=${payload}`, async () => {
      value = await page.getByTestId('search-input').inputValue();
      title = await page.title();
      await check(page, `ถ้าช่องค้นหามีค่า ต้องเท่ากับ payload ตรงตัวทั้งสตริง`, page.getByTestId('search-input'), async () => {
        if (value !== '') expect.soft(value, 'ช่องค้นหา .value').toBe(payload);
      }, { actual: async () => ({ value, title }) });
    });
    await test.step(`${"3. ตรวจ `window.__xss`, `svg[onload]`, `img[src=\"x\"]`"} — ?q=${payload}`, async () => {
      const s = await xssState(page);
      await check(page, 'window.__xss = undefined · svg[onload] = 0 · img[src="x"] = 0 · document.head ไม่มี svg/img', null, async () => {
        expect.soft(s.xss, 'window.__xss').toBe('undefined');
        expect.soft(s.svgOnload, 'svg[onload]').toBe(0);
        expect.soft(s.imgX, 'img[src="x"]').toBe(0);
        expect.soft(s.headSvgImg, "document.head.querySelectorAll('svg,img')").toBe(0);
        expect.soft(dialogs, 'dialog').toEqual([]);
      }, { actual: async () => ({ ...s, title, dialogs }) });
    });
  }
});

test("TC-SRCH-008 ค่ายาวมากใน query ไม่ทำให้พัง", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: HTTP 200 \"พบ 0 รายการ\" มีข้อความที่มีคำว่า \"ไม่พบ\" · ข้อ 2: เป็นจริง (ไม่มีเลื่อนแนวนอน) · ข้อ 3: HTTP 200 UI ค่าเริ่มต้น N = 28 · ข้อ 4: 15,000 ตัวได้ 200 · 20,000 ตัวได้ 4xx (414 หรือ 431) ไม่ใช่ 5xx · ไม่มี console error ทุกข้อ" },
    { type: 'source', description: "[R] · R26 · ความเสี่ยง: ลิงก์ยาวทำให้ server error หรือหน้าล้น · เทคนิค: Boundary" },
  ],
}, async ({ page }) => {
  const con = watchConsole(page);
  await test.step("1. เปิด `?q=<5,000 ตัว>` ในเบราว์เซอร์", async () => {
    const resp = await open(page, `/products?q=${'a'.repeat(5000)}`);
    const status = resp?.status() ?? 0;
    await checkN(page, 'q 5,000 ตัว: HTTP 200 · "พบ 0 รายการ"', 0, () => {
      expect.soft(status, 'HTTP status').toBe(200);
    });
    await check(page, 'q 5,000 ตัว: มีข้อความที่มีคำว่า "ไม่พบ"', page.locator('main').getByText(/ไม่พบ/).first(), async (el) => {
      await expect.soft(el).toBeVisible();
    });
  });
  await test.step("2. ตรวจ `document.documentElement.scrollWidth <= clientWidth`", async () => {
    const dim = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    await check(page, 'document.documentElement.scrollWidth <= clientWidth (ไม่มีเลื่อนแนวนอน)', null, async () => {
      expect.soft(dim.scrollWidth).toBeLessThanOrEqual(dim.clientWidth);
    }, { actual: async () => dim });
  });
  await test.step("3. เปิด URL ที่มี 4 พารามิเตอร์ยาว 3,000 ตัว", async () => {
    const v = 'a'.repeat(3000);
    const resp = await open(page, `/products?pet=${v}&type=${v}&life=${v}&sort=${v}`);
    const status = resp?.status() ?? 0;
    const u = await readUi(page);
    await checkN(page, 'pet/type/life/sort ค่าละ 3,000 ตัว: HTTP 200 · UI ค่าเริ่มต้น · N = 28', 28, () => {
      expect.soft(status, 'HTTP status').toBe(200);
      expectDefaultUi(u, true);
    });
  });
  await test.step("4. `curl` q 15,000 และ 20,000 ตัว ดู status", async () => {
    const r15 = await page.request.get(`/products?q=${'a'.repeat(15000)}`, { maxRedirects: 0 });
    const r20 = await page.request.get(`/products?q=${'a'.repeat(20000)}`, { maxRedirects: 0 });
    await checkApi('q 15,000 ตัวได้ 200 · 20,000 ตัวได้ 4xx (414 หรือ 431) ไม่ใช่ 5xx', { q15000: r15.status(), q20000: r20.status() }, () => {
      expect.soft(r15.status(), 'q 15,000 ตัว').toBe(200);
      expect.soft([414, 431], 'q 20,000 ตัว').toContain(r20.status());
    });
  });
  await check(page, 'ไม่มี console error ทุกข้อ', null, async () => {
    expect.soft(con.errors).toEqual([]);
  }, { actual: async () => con.errors });
});

test("TC-SRCH-009 ช่องค้นหาแสดงคำค้นที่อยู่ใน URL", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกข้อ: ช่องค้นหา `.value` = \"salmon\" และหน้าแสดง \"ผลการค้นหา “salmon”\" (ตอนนี้ล้ม: ช่องค้นหาว่างทั้งที่หน้าแสดงผลการค้นหา)" },
    { type: 'source', description: "[R] · R27 · Q5 · ความเสี่ยง: ลูกค้าไม่รู้ว่ากำลังค้นคำอะไรอยู่ · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const verify = async (when: string) => {
    await check(page, `${when}: ช่องค้นหา .value = "salmon"`, page.getByTestId('search-input'), async (el) => {
      await expect.soft(el).toHaveValue('salmon');
    }, { actual: async () => page.getByTestId('search-input').inputValue() });
    await check(page, `${when}: หน้าแสดง "ผลการค้นหา “salmon”"`, searchLine(page), async (el) => {
      await expect.soft(el).toHaveText('ผลการค้นหา “salmon”');
    });
  };
  await test.step("1. เปิด `/products?q=salmon` ตรง ๆ อ่าน `.value` ช่องค้นหา", async () => {
    await open(page, '/products?q=salmon');
    await verify('เปิดตรง');
  });
  await test.step("2. reload อ่านอีกครั้ง", async () => {
    await page.reload();
    await hydrated(page);
    await verify('หลัง reload');
  });
  await test.step("3. กด \"สุนัข\" อ่านอีกครั้ง", async () => {
    await page.getByTestId('filter-pet-dog').click();
    await settle(page, (u) => u.searchParams.get('pet') === 'dog');
    await verify('หลังกด "สุนัข"');
  });
});

test("TC-SRCH-010 ตัวกรองและการเรียงคงคำค้น `q` ไว้", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: URL มี `q=salmon` และ `pet=dog` · ข้อ 2: URL มี `q=salmon`, `pet=dog`, `sort=price-asc` · ทุกการ์ดเป็นของสุนัขและชื่อมี salmon/แซลมอน · ราคาไม่ลดลง · N = จำนวนการ์ด (อ้างอิง 2)" },
    { type: 'source', description: "[R] · R28 · ความเสี่ยง: เปลี่ยนตัวกรองแล้วคำค้นหาย ได้ผลทั้งหมวด · เทคนิค: State" },
  ],
}, async ({ page }) => {
  const items = await apiProducts(page);
  const bySlug = new Map(items.map((p) => [p.slug, p]));
  const salmonDog = (cards: Card[]) =>
    cards.filter((c) => {
      const p = bySlug.get(c.slug);
      const hay = `${p?.name ?? c.name} ${p?.nameEn ?? c.nameEn}`.toLowerCase();
      return c.pet !== 'dog' || !(hay.includes('salmon') || hay.includes('แซลมอน'));
    });
  await open(page, '/products?q=salmon');
  await test.step("1. กด \"สุนัข\" ตรวจ URL และการ์ด", async () => {
    await page.getByTestId('filter-pet-dog').click();
    await settle(page, (u) => u.searchParams.get('pet') === 'dog');
    await check(page, 'ข้อ 1: URL มี q=salmon และ pet=dog', null, async () => {
      expect.soft(params(page).q).toBe('salmon');
      expect.soft(params(page).pet).toBe('dog');
    }, { actual: async () => pathAndQuery(page) });
    const cards = await readCards(page);
    await check(page, 'ข้อ 1: ทุกการ์ดเป็นของสุนัขและชื่อมี salmon/แซลมอน', cardsLoc(page), async () => {
      expect.soft(salmonDog(cards).map((c) => c.slug)).toEqual([]);
    }, { actual: async () => cards.map((c) => `${c.slug} ${c.pet}`) });
  });
  await test.step("2. เลือกเรียงราคาต่ำ→สูง ตรวจ URL และราคา", async () => {
    await page.getByTestId('sort-select').selectOption('price-asc');
    await settle(page, (u) => u.searchParams.get('sort') === 'price-asc');
    await check(page, 'ข้อ 2: URL มี q=salmon, pet=dog, sort=price-asc', null, async () => {
      const p = params(page);
      expect.soft(p.q).toBe('salmon');
      expect.soft(p.pet).toBe('dog');
      expect.soft(p.sort).toBe('price-asc');
    }, { actual: async () => pathAndQuery(page) });
    const cards = await readCards(page);
    await check(page, 'ข้อ 2: ทุกการ์ดเป็นของสุนัขและชื่อมี salmon/แซลมอน · ราคาไม่ลดลง', cardsLoc(page), async () => {
      expect.soft(salmonDog(cards).map((c) => c.slug), 'การ์ดที่ไม่ใช่สุนัข/ไม่มี salmon').toEqual([]);
      expect.soft(isSorted(cards.map((c) => c.price), 'asc'), 'ราคาไม่ลดลง').toBe(true);
    }, { actual: async () => cards.map((c) => `${c.slug} ${c.pet} ฿${c.price}`) });
    await checkN(page, 'N = จำนวนการ์ด (อ้างอิง 2)', 2);
  });
});

test("TC-SRCH-011 ค้นจากหัวเว็บเริ่มใหม่ (ล้างตัวกรองเดิม)", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 1: URL = `/products?q=salmon` (ไม่มี `pet`, `type`) · ปุ่ม \"ทั้งหมด\" `aria-pressed=\"true\"` · N = จำนวนการ์ด = N ของการเปิด `?q=salmon` ตรง ๆ (อ้างอิง 5) · ข้อ 2: URL = `/products` N = 28" },
    { type: 'source', description: "[O-ยังไม่ยืนยัน] · R29 · Q5 · ความเสี่ยง: UI บอกยังกรองอยู่แต่ผลไม่ได้กรอง · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await test.step("1. ค้น `salmon` จากหัวเว็บ ตรวจ URL, UI, N", async () => {
    await open(page, '/products?pet=dog&type=dry');
    await headerSearch(page, 'salmon');
    await check(page, 'ข้อ 1: URL = /products?q=salmon (ไม่มี pet, type)', null, async () => {
      expect.soft(params(page)).toEqual({ q: 'salmon' });
    }, { actual: async () => pathAndQuery(page) });
    await check(page, 'ข้อ 1: ปุ่ม "ทั้งหมด" aria-pressed="true"', page.getByTestId('filter-pet-all'), async (el) => {
      await expect.soft(el).toHaveAttribute('aria-pressed', 'true');
    }, { actual: async () => readUi(page) });
    const tab = await page.context().newPage();
    await open(tab, '/products?q=salmon');
    const directN = await readN(tab);
    await tab.close();
    await checkN(page, `ข้อ 1: N = จำนวนการ์ด = N ของการเปิด ?q=salmon ตรง ๆ (${directN}, อ้างอิง 5)`, 5, (n) => {
      expect.soft(n, 'N ของ ?q=salmon').toBe(directN);
    });
  });
  await test.step("2. ไปที่ `/products?q=salmon&pet=dog` ค้น `␠␠␠` จากหัวเว็บ", async () => {
    await open(page, '/products?q=salmon&pet=dog');
    await headerSearch(page, '   ');
    await check(page, 'ข้อ 2: URL = /products', null, async () => {
      expect.soft(pathAndQuery(page)).toBe('/products');
    }, { actual: async () => pathAndQuery(page) });
    await checkN(page, 'ข้อ 2: N = 28', 28);
  });
});

test("TC-SRCH-012 มีทางยกเลิกคำค้นเมื่อยังมีผลลัพธ์", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: มีปุ่มหรือลิงก์ที่มองเห็นได้และเข้าถึงด้วยคีย์บอร์ด มีชื่อที่อ่านได้ (accessible name) · ข้อ 3: URL ไม่มี `q`, ไม่มีบรรทัด \"ผลการค้นหา\", N = 28 (ตอนนี้ล้ม: ปุ่ม \"ล้างตัวกรองทั้งหมด\" โผล่เฉพาะตอน 0 รายการ ช่องค้นหาว่าง และไม่มีปุ่ม ×)" },
    { type: 'source', description: "[R] · R30 · Q5 · ความเสี่ยง: ลูกค้าติดอยู่ในผลค้นหา กลับไปดูทั้งหมดไม่ได้ · เทคนิค: Negative" },
  ],
}, async ({ page }) => {
  const clearCtl = page
    .locator('main, header')
    .getByRole('button', { name: /ล้าง|ลบคำค้น|ยกเลิก|clear|×|✕/i })
    .or(page.locator('main, header').getByRole('link', { name: /ล้าง|ลบคำค้น|ยกเลิก|clear|×|✕/i }))
    .filter({ visible: true });
  await test.step("1. เปิด `/products?q=salmon`", async () => {
    await open(page, '/products?q=salmon');
  });
  let found = 0;
  await test.step("2. หาปุ่ม/ลิงก์ที่มองเห็นสำหรับล้างคำค้น (เช่น × ข้างคำค้น หรือ \"ล้างตัวกรองทั้งหมด\")", async () => {
    found = await clearCtl.count();
    const info = found
      ? await clearCtl.first().evaluate((el) => ({
          name: (el.getAttribute('aria-label') || el.textContent || '').trim(),
          tabIndex: (el as HTMLElement).tabIndex,
          disabled: (el as HTMLButtonElement).disabled === true,
        }))
      : null;
    await check(page, 'มีปุ่มหรือลิงก์ล้างคำค้นที่มองเห็นได้ เข้าถึงด้วยคีย์บอร์ด และมี accessible name', found ? clearCtl.first() : null, async () => {
      expect.soft(found, 'จำนวนปุ่ม/ลิงก์ล้างคำค้นที่มองเห็น').toBeGreaterThanOrEqual(1);
      if (info) {
        expect.soft(info.name.length, 'accessible name').toBeGreaterThan(0);
        expect.soft(info.tabIndex >= 0 && !info.disabled, 'โฟกัสด้วยคีย์บอร์ดได้').toBe(true);
      }
    }, { actual: async () => ({ found, info }) });
  });
  await test.step("3. คลิก ตรวจ URL และ N", async () => {
    if (found) {
      await clearCtl.first().click();
      await settle(page, (u) => !u.searchParams.has('q'));
    }
    await check(page, 'URL ไม่มี q', null, async () => {
      expect.soft(new URL(page.url()).searchParams.has('q'), 'URL มี q').toBe(false);
    }, { actual: async () => pathAndQuery(page) });
    await check(page, 'ไม่มีบรรทัด "ผลการค้นหา"', searchLine(page), async (el) => {
      await expect.soft(el).toHaveCount(0);
    });
    await checkN(page, 'N = 28', 28);
  });
});

// ═════════════════════════ F06 การ์ดสินค้าและใส่ตะกร้าจากการ์ด (P2) ═════════════════════════

test("TC-CARD-001 ป้ายบนการ์ดตรงกับหน้ารายละเอียด (สินค้าปกติ)", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ทุกช่องบนการ์ด = หน้ารายละเอียด · ลูกแมว สูตรแซลมอน: การ์ด ฿189 = 400 g ฿189 · ขนมแมวเลีย: การ์ด ฿69 = 4 ซอง ฿69 · คะแนน ★ ตัวเลขเท่ากัน · ไม่มีชิ้นใดขัดกัน (28/28)" },
    { type: 'source', description: "[R] · R31 · ความเสี่ยง: ราคา/ป้ายบนการ์ดหลอกให้กดเข้าไปแล้วไม่ตรง · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  const SAMPLES = [
    { slug: 'kitten-salmon-dry', size: '400 g', price: 189, label: 'ลูกแมว สูตรแซลมอน: การ์ด ฿189 = 400 g ฿189' },
    { slug: 'lickable-salmon-treat', size: '4 ซอง', price: 69, label: 'ขนมแมวเลีย: การ์ด ฿69 = 4 ซอง ฿69' },
  ];
  let cards: Card[] = [];
  await test.step("1. เปิด `/products` อ่านป้ายช่วงวัย/เกรนฟรี/ประเภท/★/ราคาเริ่มต้นของการ์ดตัวอย่าง", async () => {
    await open(page, '/products');
    cards = await readCards(page);
  });
  await test.step("2. เปิดหน้ารายละเอียดแต่ละชิ้น อ่านค่าเดียวกันและราคาขนาดแรก", async () => {
    for (const s of SAMPLES) {
      const card = cards.find((c) => c.slug === s.slug);
      await open(page, `/products/${s.slug}`);
      const [d] = await fetchDetails(page, [s.slug]);
      const pageRating = num(await page.getByTestId('rating').locator('strong').innerText().catch(() => ''));
      await check(page, s.label, page.getByTestId('size-option').first(), async (el) => {
        await expect.soft(el).toContainText(s.size);
        await expect.soft(el).toContainText(`฿${s.price}`);
        expect.soft(card?.price, 'ราคาบนการ์ด').toBe(s.price);
      }, { actual: async () => ({ card: card?.price, firstSize: await page.getByTestId('size-option').first().innerText() }) });
      await check(page, `${s.slug}: ป้ายช่วงวัย/เกรนฟรี/ประเภท/★ บนการ์ด = หน้ารายละเอียด`, page.locator('.pd-badges, .pd-facts, [data-testid="rating"]'), async () => {
        expect.soft(card?.tags, 'ป้าย (สัตว์/ช่วงวัย/เกรนฟรี)').toEqual(d.tags);
        expect.soft(card?.type, 'ประเภท').toBe(d.type);
        expect.soft(card?.rating, 'คะแนน ★').toBe(pageRating);
      }, { actual: async () => ({ card, detail: { ...d, rating: pageRating } }) });
    }
  });
  await test.step("3. ทำซ้ำครบ 28 ใบ", async () => {
    const details = await fetchDetails(page, cards.map((c) => c.slug));
    const diffs: string[] = [];
    for (const c of cards) {
      const d = details.find((x) => x.slug === c.slug);
      if (!d) {
        diffs.push(`${c.slug}: เปิดหน้ารายละเอียดไม่ได้`);
        continue;
      }
      if (JSON.stringify(c.tags) !== JSON.stringify(d.tags)) diffs.push(`${c.slug}: ป้าย ${c.tags.join('/')} ≠ ${d.tags.join('/')}`);
      if (c.gf !== d.gf) diffs.push(`${c.slug}: เกรนฟรี ${c.gf} ≠ ${d.gf}`);
      if (c.type !== d.type) diffs.push(`${c.slug}: ประเภท ${c.type} ≠ ${d.type}`);
      if (c.rating !== d.rating) diffs.push(`${c.slug}: ★ ${c.rating} ≠ ${d.rating}`);
      if (c.price !== d.firstPrice) diffs.push(`${c.slug}: ราคา ฿${c.price} ≠ ขนาดแรก ฿${d.firstPrice}`);
      if (c.stock !== d.stockBadge) diffs.push(`${c.slug}: ป้ายสต็อก "${c.stock}" ≠ "${d.stockBadge}"`);
    }
    await check(page, 'ทุกช่องบนการ์ด = หน้ารายละเอียด ไม่มีชิ้นใดขัดกัน (28/28)', null, async () => {
      expect.soft(cards.length, 'จำนวนการ์ด').toBe(28);
      expect.soft(details.length, 'จำนวนหน้ารายละเอียดที่เทียบ').toBe(28);
      expect.soft(diffs, 'ช่องที่ขัดกัน').toEqual([]);
    }, { actual: async () => ({ compared: details.length, diffs }) });
  });
});

test("TC-CARD-002 การ์ดสินค้าหมด ไก่ฟรีซดราย ใส่ตะกร้าไม่ได้", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: มีป้ายที่มีคำว่า \"หมด\" · ปุ่มข้อความ \"สินค้าหมด\" มี `disabled` หรือ `aria-disabled=\"true\"` · ข้อ 4: `pp-cart` ยังไม่มีหรือเป็น `[]` ตัวนับ 🛒 = 0 · ข้อ 5: แสดง \"สินค้าหมด\"" },
    { type: 'source', description: "[D] · R31, R37, R52 · ความเสี่ยง: ขายสินค้าที่ไม่มีของ · เทคนิค: Negative, Equivalence partition" },
  ],
}, async ({ page }) => {
  const card = page.locator('main article[data-slug="freeze-dried-chicken-cat"]');
  const btn = card.getByTestId('quick-add');
  await test.step("1. เปิด `/products?pet=cat&type=treat` หาการ์ดไก่ฟรีซดราย", async () => {
    await open(page, '/products?pet=cat&type=treat');
  });
  await test.step("2. ตรวจป้ายและปุ่มบนการ์ด", async () => {
    await check(page, 'การ์ดไก่ฟรีซดรายมีป้ายที่มีคำว่า "หมด"', card.getByTestId('stock-badge'), async (el) => {
      await expect.soft(el).toContainText('หมด');
    });
    await check(page, 'ปุ่มข้อความ "สินค้าหมด" มี disabled หรือ aria-disabled="true"', btn, async (el) => {
      await expect.soft(el).toHaveText('สินค้าหมด');
      const dis = await el.evaluate((b) => (b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true').catch(() => false);
      expect.soft(dis, 'disabled / aria-disabled').toBe(true);
    });
  });
  await test.step("3. พยายามคลิกปุ่ม (และกด Enter เมื่อโฟกัส)", async () => {
    await btn.click({ force: true, timeout: 2_000 }).catch(() => {});
    await btn.focus({ timeout: 2_000 }).catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  });
  await test.step("4. ตรวจ `pp-cart` และ 🛒", async () => {
    const cart = await ppCart(page);
    await check(page, 'pp-cart ยังไม่มีหรือเป็น [] · ตัวนับ 🛒 = 0', page.getByTestId('cart-count'), async (el) => {
      expect.soft(cart === null || (Array.isArray(cart) && cart.length === 0), 'pp-cart').toBe(true);
      await expect.soft(el).toHaveText('0');
    }, { actual: async () => ({ ppCart: await page.evaluate(() => localStorage.getItem('pp-cart')), count: await page.getByTestId('cart-count').innerText() }) });
  });
  await test.step("5. เปิดหน้ารายละเอียด", async () => {
    await open(page, '/products/freeze-dried-chicken-cat');
    await check(page, 'หน้ารายละเอียดแสดง "สินค้าหมด"', page.locator('main').getByText('สินค้าหมด').first(), async (el) => {
      await expect.soft(el).toBeVisible();
    });
  });
});

test("TC-CARD-003 การ์ดสินค้าใกล้หมด สูตรลดก้อนขน", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "การ์ดมีข้อความ \"เหลือ 3 ชิ้น\" · ราคา ฿520 = 1.5 kg ฿520 ในหน้ารายละเอียด · ปุ่ม \"ใส่ตะกร้า\" ไม่ถูก disable · หน้ารายละเอียดแสดง \"เหลือ 3 ชิ้น\" เหมือนการ์ด" },
    { type: 'source', description: "[D]+[O-ยังไม่ยืนยัน] · R31 · Q13 · ความเสี่ยง: ลูกค้าไม่รู้ว่าของใกล้หมด · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const card = page.locator('main article[data-slug="hairball-control-dry"]');
  await test.step("1. เปิด `/products?pet=cat&type=dry` หาการ์ดสูตรลดก้อนขน", async () => {
    await open(page, '/products?pet=cat&type=dry');
  });
  await test.step("2. ตรวจป้ายสต็อก ราคา และปุ่ม", async () => {
    await check(page, 'การ์ดมีข้อความ "เหลือ 3 ชิ้น"', card.getByTestId('stock-badge'), async () => {
      await expect.soft(card).toContainText('เหลือ 3 ชิ้น');
    });
    await check(page, 'ราคาบนการ์ด ฿520', card.getByTestId('product-price'), async (el) => {
      await expect.soft(el).toHaveText('฿520');
    });
    await check(page, 'ปุ่ม "ใส่ตะกร้า" ไม่ถูก disable', card.getByTestId('quick-add'), async (el) => {
      await expect.soft(el).toHaveText('ใส่ตะกร้า');
      await expect.soft(el).toBeEnabled();
      await expect.soft(el).not.toHaveAttribute('aria-disabled', 'true');
    });
  });
  await test.step("3. เปิดหน้ารายละเอียด เทียบสต็อกและราคาขนาดแรก", async () => {
    await open(page, '/products/hairball-control-dry');
    await check(page, 'ราคา ฿520 = 1.5 kg ฿520 ในหน้ารายละเอียด', page.getByTestId('size-option').first(), async (el) => {
      await expect.soft(el).toContainText('1.5 kg');
      await expect.soft(el).toContainText('฿520');
    });
    await check(page, 'หน้ารายละเอียดแสดง "เหลือ 3 ชิ้น" เหมือนการ์ด', page.getByTestId('stock-info'), async (el) => {
      await expect.soft(el).toContainText('เหลือ 3 ชิ้น');
    });
  });
});

test("TC-CARD-004 ใส่ตะกร้าจากการ์ดได้ขนาดเล็กสุด", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ข้อ 2: มี toast ที่มีชื่อสินค้า · `pp-cart` มีบรรทัด `kitten-salmon-dry` ขนาด 400 g qty 1 · ข้อ 4: ตะกร้า 2 บรรทัด: ลูกแมว สูตรแซลมอน 400 g ฿189 ×1 และขนมแมวเลีย 4 ซอง ฿69 ×1 · ยอดสินค้า ฿258 (฿189 + ฿69) · ค่าส่ง ฿50 · ยอดชำระ ฿308 (฿258 + ฿50)" },
    { type: 'source', description: "[D]+[R] · R32 · ความเสี่ยง: ใส่ผิดขนาด ราคาในตะกร้าไม่ตรงกับการ์ด · เทคนิค: Happy path" },
  ],
}, async ({ page }) => {
  await open(page, '/products');
  await test.step("1. ที่ `/products` คลิก \"ใส่ตะกร้า\" บนการ์ดลูกแมว สูตรแซลมอน", async () => {
    await page.locator('main article[data-slug="kitten-salmon-dry"]').getByTestId('quick-add').click();
    await waitCartQty(page, 1, 1);
  });
  await test.step("2. ตรวจ toast, `pp-cart`", async () => {
    await check(page, 'มี toast ที่มีชื่อสินค้า (ลูกแมว สูตรแซลมอน)', page.getByTestId('toast').last(), async (el) => {
      await expect.soft(el).toContainText('ลูกแมว สูตรแซลมอน');
    });
    const cart = await ppCart(page);
    await check(page, 'pp-cart มีบรรทัด kitten-salmon-dry ขนาด 400 g qty 1', null, async () => {
      expect.soft(cartLines(cart)).toEqual([expect.objectContaining({ slug: 'kitten-salmon-dry', size: '400 g', qty: 1 })]);
    }, { actual: async () => cart });
  });
  await test.step("3. คลิก \"ใส่ตะกร้า\" บนการ์ดขนมแมวเลีย", async () => {
    await page.locator('main article[data-slug="lickable-salmon-treat"]').getByTestId('quick-add').click();
    await waitCartQty(page, 2, 2);
  });
  await test.step("4. เปิด `/cart`", async () => {
    await open(page, '/cart');
    const rows = page.getByTestId('cart-item');
    await rows.first().waitFor({ timeout: 10_000 }).catch(() => {});
    const kitten = rows.filter({ hasText: 'ลูกแมว สูตรแซลมอน' });
    const lick = rows.filter({ hasText: 'ขนมแมวเลีย' });
    await check(page, 'ตะกร้า 2 บรรทัด: ลูกแมว สูตรแซลมอน 400 g ฿189 ×1 และขนมแมวเลีย 4 ซอง ฿69 ×1', rows, async () => {
      await expect.soft(rows, 'จำนวนบรรทัด').toHaveCount(2);
      await expect.soft(kitten.getByTestId('item-size')).toHaveText('400 g');
      await expect.soft(kitten).toContainText('฿189');
      await expect.soft(kitten.getByTestId('item-qty')).toHaveValue('1');
      await expect.soft(lick.getByTestId('item-size')).toHaveText('4 ซอง');
      await expect.soft(lick).toContainText('฿69');
      await expect.soft(lick.getByTestId('item-qty')).toHaveValue('1');
    }, { actual: async () => rows.allInnerTexts() });
    await checkCartSummary(page, 'ยอดสินค้า ฿258 (฿189 + ฿69) · ค่าส่ง ฿50 · ยอดชำระ ฿308 (฿258 + ฿50)', '฿258', /^฿50$/, '฿308');
  });
});

test("TC-CARD-005 กดใส่ตะกร้าจากการ์ดซ้ำเพิ่มจำนวนในบรรทัดเดิม", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`pp-cart` มี 1 บรรทัด (`kitten-salmon-dry`, 400 g, qty 2) ไม่มีบรรทัดซ้ำ · `/cart` ยอดสินค้า ฿378 (฿189×2) · ค่าส่ง ฿50 · ยอดชำระ ฿428 (฿189×2 + ส่ง ฿50 = ฿428)" },
    { type: 'source', description: "[D]+[R] · R32 · ความเสี่ยง: บรรทัดซ้ำทำให้ยอด/สต็อกคำนวณผิด · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await open(page, '/products');
  await test.step("1. ที่ `/products` คลิก \"ใส่ตะกร้า\" บนการ์ดเดิม 2 ครั้ง (รอ toast ครั้งแรกก่อน)", async () => {
    const btn = page.locator('main article[data-slug="kitten-salmon-dry"]').getByTestId('quick-add');
    await btn.click();
    await page.getByTestId('toast').first().waitFor({ timeout: 5_000 }).catch(() => {});
    await waitCartQty(page, 1);
    await btn.click();
    await waitCartQty(page, 2);
  });
  await test.step("2. ตรวจ `pp-cart`", async () => {
    const cart = await ppCart(page);
    await check(page, 'pp-cart มี 1 บรรทัด (kitten-salmon-dry, 400 g, qty 2) ไม่มีบรรทัดซ้ำ', null, async () => {
      expect.soft(cartLines(cart)).toEqual([expect.objectContaining({ slug: 'kitten-salmon-dry', size: '400 g', qty: 2 })]);
    }, { actual: async () => cart });
  });
  await test.step("3. เปิด `/cart`", async () => {
    await open(page, '/cart');
    await page.getByTestId('cart-item').first().waitFor({ timeout: 10_000 }).catch(() => {});
    await checkCartSummary(page, '/cart ยอดสินค้า ฿378 (฿189×2) · ค่าส่ง ฿50 · ยอดชำระ ฿428', '฿378', /^฿50$/, '฿428');
  });
});

test("TC-CARD-006 กดใส่ตะกร้าจากการ์ดเกินสต็อก (สูตรลดก้อนขน 3 ชิ้น)", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "ครั้งที่ 1–3 qty เป็น 1, 2, 3 · หลังครั้งที่ 4 qty ยังเป็น 3 (ไม่เกินสต็อก) · toast ครั้งที่ 4 เป็นข้อความปฏิเสธที่มีคำว่า \"สต็อกไม่พอ\" (แบบ R47 \"ไม่สามารถเพิ่ม … ได้ สินค้าในสต็อกไม่พอ\") และไม่ใช่ข้อความ \"✅ เพิ่ม…ลงตะกร้าแล้ว\" แบบปกติ · ตัวนับ 🛒 = 3 · `/cart` ยอดสินค้า ฿1,560 (฿520×3) · ส่งฟรีเพราะ ≥ ฿999 → ค่าส่ง ฿0 · ยอดชำระ ฿1,560 (฿520×3 + ส่ง ฿0)" },
    { type: 'source', description: "[D]+[R] · R32, R45, R47 · ความเสี่ยง: ทางลัดจากการ์ดข้ามการตรวจสต็อก ลูกค้าไปเจอ 409 ตอนจ่ายเงิน · เทคนิค: Boundary, Negative" },
  ],
}, async ({ page }) => {
  await open(page, '/products');
  const btn = page.locator('main article[data-slug="hairball-control-dry"]').getByTestId('quick-add');
  await test.step("1. ที่ `/products` คลิก \"ใส่ตะกร้า\" บนการ์ดสูตรลดก้อนขน 3 ครั้ง ตรวจ `pp-cart` ทุกครั้ง", async () => {
    for (const i of [1, 2, 3]) {
      await btn.click();
      await waitCartQty(page, i);
      const cart = await ppCart(page);
      await check(page, `ครั้งที่ ${i}: qty เป็น ${i}`, null, async () => {
        expect.soft(cartLines(cart)).toEqual([expect.objectContaining({ slug: 'hairball-control-dry', qty: i })]);
      }, { actual: async () => cart });
    }
  });
  await test.step("2. คลิกครั้งที่ 4 อ่านข้อความ toast", async () => {
    await btn.click();
    await page.getByTestId('toast').filter({ hasText: /สต็อก|ไม่สามารถ/ }).first().waitFor({ timeout: 3_000 }).catch(() => {});
    await page.waitForTimeout(300);
    const toast = page.getByTestId('toast').last();
    await check(page, 'toast ครั้งที่ 4 เป็นข้อความปฏิเสธที่มีคำว่า "สต็อกไม่พอ" ไม่ใช่ "✅ เพิ่ม…ลงตะกร้าแล้ว"', toast, async (el) => {
      await expect.soft(el).toContainText('สต็อกไม่พอ');
      await expect.soft(el).not.toContainText(/✅|ลงตะกร้าแล้ว/);
    }, { actual: async () => page.getByTestId('toast').allInnerTexts() });
  });
  await test.step("3. ตรวจ `pp-cart` และเปิด `/cart`", async () => {
    const cart = await ppCart(page);
    await check(page, 'หลังครั้งที่ 4 qty ยังเป็น 3 (ไม่เกินสต็อก) · ตัวนับ 🛒 = 3', page.getByTestId('cart-count'), async (el) => {
      expect.soft(cartLines(cart)).toEqual([expect.objectContaining({ slug: 'hairball-control-dry', qty: 3 })]);
      await expect.soft(el).toHaveText('3');
    }, { actual: async () => ({ cart, count: await page.getByTestId('cart-count').innerText() }) });
    await open(page, '/cart');
    await page.getByTestId('cart-item').first().waitFor({ timeout: 10_000 }).catch(() => {});
    // แผน: "ส่งฟรีเพราะ ≥ ฿999 → ค่าส่ง ฿0" — ยอมรับทั้ง "฿0" และ "ฟรี" (ความหมายเดียวกัน)
    await checkCartSummary(page, '/cart ยอดสินค้า ฿1,560 (฿520×3) · ส่งฟรี ค่าส่ง ฿0 · ยอดชำระ ฿1,560', '฿1,560', /^(฿0|ฟรี)$/, '฿1,560');
  });
});

test("TC-CARD-007 ใส่ตะกร้าจากการ์ดบนหน้าแรก (\"ขายดี\") ทำงานเหมือนใน `/products`", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`pp-cart` มี 1 บรรทัด `lickable-salmon-treat` 4 ซอง qty 1 (ขนาดแรกในหน้ารายละเอียด) · `/cart` บรรทัด 4 ซอง ฿69 ×1 = ราคาบนการ์ด · ยอดสินค้า ฿69 · ค่าส่ง ฿50 (฿69 < ฿999) · ยอดชำระ ฿119 (฿69 + ฿50) · มี toast ที่มีชื่อสินค้า" },
    { type: 'source', description: "[D]+[R] · R32, R31 · ความเสี่ยง: การ์ดหน้าแรกใช้ logic คนละชุดกับหน้ารายการ · เทคนิค: Equivalence partition" },
  ],
}, async ({ page }) => {
  const card = page.getByTestId('popular-products').locator('article[data-slug="lickable-salmon-treat"]');
  let cardName = '';
  let cardPrice = NaN;
  await open(page, '/');
  await test.step("1. จดชื่อและราคาบนการ์ด", async () => {
    cardName = (await card.getByTestId('product-name').innerText()).trim();
    cardPrice = num(await card.getByTestId('product-price').innerText());
  });
  await test.step("2. คลิก \"ใส่ตะกร้า\"", async () => {
    await card.getByTestId('quick-add').click();
    await waitCartQty(page, 1, 1);
    await check(page, 'มี toast ที่มีชื่อสินค้า', page.getByTestId('toast').last(), async (el) => {
      await expect.soft(el).toContainText(cardName || 'ขนมแมวเลีย');
    });
  });
  const cart = await ppCart(page);
  let firstSize = '';
  await test.step("3. เปิดหน้ารายละเอียดของสินค้านั้น ดูขนาดแรกและราคา", async () => {
    await open(page, '/products/lickable-salmon-treat');
    const first = page.getByTestId('size-option').first();
    firstSize = (await first.getAttribute('data-size')) ?? (await first.locator('span').innerText());
    await check(page, `ขนาดแรกในหน้ารายละเอียด = 4 ซอง ฿69 = ราคาบนการ์ด (฿${cardPrice})`, first, async (el) => {
      await expect.soft(el).toContainText('4 ซอง');
      await expect.soft(el).toContainText('฿69');
      expect.soft(cardPrice, 'ราคาบนการ์ด').toBe(69);
    });
    await check(page, `pp-cart มี 1 บรรทัด lickable-salmon-treat 4 ซอง qty 1 (ขนาดแรกในหน้ารายละเอียด "${firstSize}")`, null, async () => {
      expect.soft(cartLines(cart)).toEqual([expect.objectContaining({ slug: 'lickable-salmon-treat', size: '4 ซอง', qty: 1 })]);
      expect.soft(cartLines(cart)[0]?.size, 'ขนาด = ขนาดแรกในหน้ารายละเอียด').toBe(firstSize);
    }, { actual: async () => cart });
  });
  await test.step("4. เปิด `/cart`", async () => {
    await open(page, '/cart');
    const row = page.getByTestId('cart-item');
    await row.first().waitFor({ timeout: 10_000 }).catch(() => {});
    await check(page, '/cart บรรทัด 4 ซอง ฿69 ×1 = ราคาบนการ์ด', row, async () => {
      await expect.soft(row).toHaveCount(1);
      await expect.soft(row.getByTestId('item-size')).toHaveText('4 ซอง');
      await expect.soft(row).toContainText(`฿${cardPrice}`);
      await expect.soft(row).toContainText('฿69');
      await expect.soft(row.getByTestId('item-qty')).toHaveValue('1');
    }, { actual: async () => row.allInnerTexts() });
    await checkCartSummary(page, 'ยอดสินค้า ฿69 · ค่าส่ง ฿50 (฿69 < ฿999) · ยอดชำระ ฿119 (฿69 + ฿50)', '฿69', /^฿50$/, '฿119');
  });
});

test("TC-CARD-008 ใส่จากการ์ดหลังใส่ขนาดใหญ่จากหน้ารายละเอียด ต้องแยกบรรทัดตามขนาด", {
  tag: ["@P2", "@5.1"],
  annotation: [
    { type: 'expected', description: "`pp-cart` มี 2 บรรทัด: 1.5 kg qty 1 และ 400 g qty 1 (การ์ดไม่ไปเพิ่ม qty ของบรรทัด 1.5 kg) · ยอดสินค้า ฿779 (฿590 + ฿189) · ค่าส่ง ฿50 · ยอดชำระ ฿829 (฿779 + ฿50)" },
    { type: 'source', description: "[D]+[R] · R32 · ความเสี่ยง: ใส่จากการ์ดแล้วไปเพิ่มขนาดผิด ลูกค้าจ่ายแพงกว่าที่เห็น · เทคนิค: State" },
  ],
}, async ({ page }) => {
  await test.step("1. เปิด `/products/kitten-salmon-dry` เลือก 1.5 kg กด \"🛒 เพิ่มลงตะกร้า\" จำนวน 1", async () => {
    await open(page, '/products/kitten-salmon-dry');
    await page.getByTestId('size-option').filter({ hasText: '1.5 kg' }).click();
    await page.getByTestId('add-to-cart').click();
    await waitCartQty(page, 1, 1);
  });
  await test.step("2. ไป `/products` คลิก \"ใส่ตะกร้า\" บนการ์ดลูกแมว สูตรแซลมอน", async () => {
    await open(page, '/products');
    await page.locator('main article[data-slug="kitten-salmon-dry"]').getByTestId('quick-add').click();
    await waitCartQty(page, 2);
  });
  await test.step("3. ตรวจ `pp-cart` และ `/cart`", async () => {
    const cart = await ppCart(page);
    await check(page, 'pp-cart มี 2 บรรทัด: 1.5 kg qty 1 และ 400 g qty 1 (การ์ดไม่ไปเพิ่ม qty ของบรรทัด 1.5 kg)', null, async () => {
      const lines = cartLines(cart);
      expect.soft(lines.length, 'จำนวนบรรทัด').toBe(2);
      expect.soft(lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slug: 'kitten-salmon-dry', size: '1.5 kg', qty: 1 }),
          expect.objectContaining({ slug: 'kitten-salmon-dry', size: '400 g', qty: 1 }),
        ]),
      );
    }, { actual: async () => cart });
    await open(page, '/cart');
    await page.getByTestId('cart-item').first().waitFor({ timeout: 10_000 }).catch(() => {});
    await checkCartSummary(page, 'ยอดสินค้า ฿779 (฿590 + ฿189) · ค่าส่ง ฿50 · ยอดชำระ ฿829 (฿779 + ฿50)', '฿779', /^฿50$/, '฿829');
  });
});
