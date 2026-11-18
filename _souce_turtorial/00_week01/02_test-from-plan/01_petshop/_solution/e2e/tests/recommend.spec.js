// TEST-PLAN.md §5 ข้อ 33–36 (โมดูลแนะนำ)
const { test, expect } = require('@playwright/test');
const { openCart, holdOn } = require('./helpers');

const FOOD_TYPES = ['dry', 'wet', 'treat']; // ประเภทที่เป็น "อาหาร" (ไม่ใช่ toy / accessory)

/** โหลดข้อมูลสินค้าทั้งหมดจาก API เป็น map slug → product */
async function productsBySlug(request) {
  const items = (await (await request.get('/api/products')).json()).items;
  return Object.fromEntries(items.map((p) => [p.slug, p]));
}

/** ทำ Finder ครบ 3 ขั้นตอน แล้วรอผลลัพธ์ */
async function runFinder(page, { pet, life, noChicken = false, grainFree = false, type = 'any' }) {
  await page.goto('/finder');
  await page.getByTestId(`finder-pet-${pet}`).click();
  await page.getByTestId('finder-next').click();
  await page.getByTestId(`finder-life-${life}`).click();
  await page.getByTestId('finder-next').click();
  if (noChicken) await page.getByTestId('finder-no-chicken').check();
  if (grainFree) await page.getByTestId('finder-grainfree').check();
  await page.getByTestId('finder-type').selectOption(type);
  await page.getByTestId('finder-submit').click();
  const results = page.getByTestId('finder-result');
  await expect(results.first()).toBeVisible();
  return results;
}

test('TC-REC-01 Finder: ลูกแมว แพ้ไก่: อาหารแมวไม่มีไก่ อันดับ 1 ลูกแมวแซลมอน', { tag: '@P1' }, async ({ page, request }) => {
  const results = await runFinder(page, { pet: 'cat', life: 'baby', noChicken: true });

  // อันดับ 1 = ลูกแมว สูตรแซลมอน
  await expect(results.first().locator('.fr-name')).toHaveText('ลูกแมว สูตรแซลมอน');
  await expect(results.first()).toHaveAttribute('data-slug', 'kitten-salmon-dry');

  // ทุกรายการต้องเป็นอาหารแมว และไม่มีไก่
  const bySlug = await productsBySlug(request);
  const slugs = await results.evaluateAll((els) => els.map((e) => e.dataset.slug));
  expect(slugs.length).toBeGreaterThan(0);
  for (const slug of slugs) {
    const p = bySlug[slug];
    expect(p, `ไม่พบสินค้า ${slug} ใน API`).toBeTruthy();
    expect(p.pet, `${p.name} ต้องเป็นของแมว`).toBe('cat');
    expect(FOOD_TYPES, `${p.name} ต้องเป็นอาหาร`).toContain(p.type);
    expect(p.protein, `${p.name} ต้องไม่มีไก่`).not.toBe('chicken');
  }

  await holdOn(page, page.getByTestId('finder-results'));
});

test('TC-REC-02 Finder: หมาสูงวัย เกรนฟรี ขนม: อันดับ 1 หนังปลาแซลมอนกรอบ', { tag: '@P2' }, async ({ page }) => {
  const results = await runFinder(page, { pet: 'dog', life: 'senior', grainFree: true, type: 'treat' });

  await expect(results.first().locator('.fr-name')).toHaveText('หนังปลาแซลมอนกรอบ');
  await expect(results.first()).toHaveAttribute('data-slug', 'salmon-skin-treat');

  await holdOn(page, page.getByTestId('finder-results'));
});

test('TC-REC-03 แนะนำตามที่เคยดู: "แนะนำสำหรับคุณ" เป็นอาหารแมวทั้งหมด', { tag: '@P2' }, async ({ page, request }) => {
  // ดูสินค้าแมวก่อน 3 ชิ้น
  for (const slug of ['kitten-salmon-dry', 'tuna-pouch', 'adult-chicken-dry']) {
    await page.goto(`/products/${slug}`);
    await expect(page.getByTestId('product-title')).toBeVisible();
  }

  await page.goto('/');
  const rec = page.getByTestId('recommended-for-you');
  await expect(rec).toBeVisible();
  await expect(rec).toContainText('แนะนำสำหรับคุณ');

  const cards = rec.getByTestId('product-card');
  await expect(cards.first()).toBeVisible();
  const slugs = await cards.evaluateAll((els) => els.map((e) => e.dataset.slug));
  expect(slugs.length).toBeGreaterThan(0);

  const bySlug = await productsBySlug(request);
  for (const slug of slugs) {
    const p = bySlug[slug];
    expect(p, `ไม่พบสินค้า ${slug} ใน API`).toBeTruthy();
    expect(p.pet, `${p.name} ต้องเป็นของแมว`).toBe('cat');
    expect(FOOD_TYPES, `${p.name} ต้องเป็นอาหาร`).toContain(p.type);
  }

  await holdOn(page, rec);
});

test('TC-REC-04 ซื้อคู่กันบ่อย: กดครั้งเดียว ตะกร้าได้ 3 ชิ้น', { tag: '@P2' }, async ({ page }) => {
  await page.goto('/products/kitten-salmon-dry');
  const bundle = page.getByTestId('bought-together');
  await expect(bundle).toBeVisible();
  await expect(bundle).toContainText('3 รายการ');
  await expect(page.getByTestId('cart-count')).toHaveText('0');

  await bundle.getByTestId('add-bundle').click(); // กดครั้งเดียว
  await expect(page.getByTestId('cart-count')).toHaveText('3');

  await openCart(page);
  await expect(page.getByTestId('cart-item')).toHaveCount(3);
  await expect(page.getByTestId('cart-count')).toHaveText('3');

  await holdOn(page, page.getByTestId('cart-item').last());
});
