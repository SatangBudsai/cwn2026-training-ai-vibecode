// TEST-PLAN.md §5 ข้อ 3–8 (โมดูลค้นหา)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

/** ดึงสินค้าทั้งหมดจาก API แล้วทำเป็น map ตาม slug */
async function productsBySlug(request) {
  const res = await request.get('/api/products');
  expect(res.ok()).toBeTruthy();
  const items = (await res.json()).items;
  return Object.fromEntries(items.map((p) => [p.slug, p]));
}

/** slug ของการ์ดสินค้าที่แสดงอยู่ */
async function shownSlugs(page) {
  return page.getByTestId('product-card').evaluateAll((cs) => cs.map((c) => c.dataset.slug));
}

/** แปลง "฿1,890" → 1890 */
const toNumber = (txt) => Number(txt.replace(/[^\d.]/g, ''));

test('TC-CAT-01 ค้นหา "แซลมอน": พบ 5 รายการที่ทำจากแซลมอนทั้งหมด', { tag: '@P1' }, async ({ page, request }) => {
  await page.goto('/products');
  await page.getByTestId('search-input').fill('แซลมอน');
  await page.getByTestId('search-submit').click();

  await expect(page).toHaveURL(/[?&]q=/);
  await expect(page.getByTestId('result-count')).toHaveText('พบ 5 รายการ');
  const cards = page.getByTestId('product-card');
  await expect(cards).toHaveCount(5);

  // ทุกชิ้นที่แสดงต้องทำจากแซลมอน (ตามข้อมูล protein ของ API)
  const bySlug = await productsBySlug(request);
  const slugs = await shownSlugs(page);
  expect(slugs).toHaveLength(5);
  for (const slug of slugs) {
    expect(bySlug[slug], `สินค้า ${slug}`).toBeTruthy();
    expect(bySlug[slug].protein, `protein ของ ${slug}`).toBe('salmon');
  }

  await holdOn(page, page.getByTestId('result-count'));
});

test('TC-CAT-02 กรองแมว + อาหารเปียก: เหลือ 2 รายการ และ URL จำค่าตัวกรอง', { tag: '@P1' }, async ({ page, request }) => {
  await page.goto('/products');
  await page.getByTestId('filter-pet-cat').click();
  await expect(page.getByTestId('filter-pet-cat')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('filter-type').selectOption('wet');

  await expect(page.getByTestId('result-count')).toHaveText('พบ 2 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(2);

  // ค่าตัวกรองต้องอยู่ใน URL
  await expect(page).toHaveURL(/[?&]pet=cat(&|$)/);
  await expect(page).toHaveURL(/[?&]type=wet(&|$)/);

  // ทุกชิ้นเป็นอาหารเปียกของแมว
  const bySlug = await productsBySlug(request);
  for (const slug of await shownSlugs(page)) {
    expect(bySlug[slug].pet, slug).toBe('cat');
    expect(bySlug[slug].type, slug).toBe('wet');
  }

  // รีโหลดแล้วตัวกรองยังอยู่
  await page.reload();
  await expect(page.getByTestId('filter-pet-cat')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('filter-type')).toHaveValue('wet');
  await expect(page.getByTestId('result-count')).toHaveText('พบ 2 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(2);

  await holdOn(page, page.getByTestId('result-count'));
});

test('TC-CAT-03 เรียงราคาน้อย → มาก: ราคาเรียงถูก เริ่มที่ ฿35', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByTestId('result-count')).toHaveText('พบ 28 รายการ');
  await page.getByTestId('sort-select').selectOption('price-asc');
  await expect(page.getByTestId('sort-select')).toHaveValue('price-asc');

  const prices = page.getByTestId('product-price');
  await expect(prices.first()).toHaveText('฿35');
  await expect(prices).toHaveCount(28);

  const values = (await prices.allInnerTexts()).map(toNumber);
  const sorted = [...values].sort((a, b) => a - b);
  expect(values).toEqual(sorted);
  expect(values[0]).toBe(35);

  await holdOn(page, prices.first());
});

test('TC-CAT-04 กรองเกรนฟรี: พบ 9 รายการ', { tag: '@P3' }, async ({ page, request }) => {
  await page.goto('/products');
  await page.getByTestId('filter-grainfree').check();
  await expect(page.getByTestId('filter-grainfree')).toBeChecked();

  await expect(page.getByTestId('result-count')).toHaveText('พบ 9 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(9);

  const bySlug = await productsBySlug(request);
  for (const slug of await shownSlugs(page)) {
    expect(bySlug[slug].grainFree, slug).toBe(true);
  }

  await holdOn(page, page.getByTestId('result-count'));
});

test('TC-CAT-05 ค้นหาไม่เจอ: ข้อความ "ไม่พบสินค้า…" ล้างตัวกรองแล้วกลับมา 28 รายการ', { tag: '@P3' }, async ({ page }) => {
  await page.goto('/products');
  await page.getByTestId('search-input').fill('ไม่มีสินค้านี้แน่นอน zzz');
  await page.getByTestId('search-submit').click();

  const empty = page.getByTestId('empty-results');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText(/ไม่พบสินค้า/);
  await expect(page.getByTestId('product-card')).toHaveCount(0);
  await expect(page.getByTestId('result-count')).toHaveText('พบ 0 รายการ');
  await holdOn(page, empty);

  await page.getByTestId('clear-filters').click();
  await expect(page.getByTestId('empty-results')).toHaveCount(0);
  await expect(page.getByTestId('result-count')).toHaveText('พบ 28 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(28);

  await holdOn(page, page.getByTestId('result-count'));
});

test('TC-CAT-06 เมนู "ของเล่น": พบของเล่น 4 รายการ (แมว 2 หมา 2)', { tag: '@P2' }, async ({ page, request }) => {
  await page.goto('/');
  await page.getByTestId('nav-toys').click();
  await expect(page).toHaveURL(/\/products\?type=toy/);

  await expect(page.getByTestId('result-count')).toHaveText('พบ 4 รายการ');
  await expect(page.getByTestId('product-card')).toHaveCount(4);

  const bySlug = await productsBySlug(request);
  const shown = (await shownSlugs(page)).map((s) => bySlug[s]);
  for (const p of shown) expect(p.type, p.slug).toBe('toy');
  expect(shown.filter((p) => p.pet === 'cat')).toHaveLength(2);
  expect(shown.filter((p) => p.pet === 'dog')).toHaveLength(2);
  // การ์ดแสดงสีตามสัตว์: แมว 2 หมา 2
  await expect(page.locator('[data-testid="product-card"].pet-cat')).toHaveCount(2);
  await expect(page.locator('[data-testid="product-card"].pet-dog')).toHaveCount(2);

  await holdOn(page, page.getByTestId('result-count'));
});
