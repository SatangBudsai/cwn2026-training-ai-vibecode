// TEST-PLAN.md §5 ข้อ 13–15 (โมดูลรายการโปรด)
const { test, expect } = require('@playwright/test');
const { openCart, holdOn } = require('./helpers');

const ITEMS = [
  { slug: 'kitten-salmon-dry', name: 'ลูกแมว สูตรแซลมอน' },
  { slug: 'dental-chew-treat', name: 'ขนมขัดฟัน' },
];

/** เปิดหน้าสินค้าแล้วกดหัวใจ ให้ตัวเลขรายการโปรดที่หัวเว็บ +1 */
async function addToWishlist(page, slug) {
  await page.goto(`/products/${slug}`);
  const heart = page.getByTestId('wishlist-toggle').first();
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  const before = Number(await page.getByTestId('wishlist-count').innerText());
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('wishlist-count')).toHaveText(String(before + 1));
}

/** กดไอคอนหัวใจที่หัวเว็บ */
async function openWishlist(page) {
  await page.getByTestId('wishlist-link').click();
  await expect(page).toHaveURL(/\/wishlist$/);
}

test('TC-WISH-01 กดหัวใจ 2 ชิ้น: ตัวเลขเป็น 2 รีโหลดแล้วยังอยู่', { tag: '@P2' }, async ({ page }) => {
  for (const { slug } of ITEMS) await addToWishlist(page, slug);
  const count = page.getByTestId('wishlist-count');
  await expect(count).toHaveText('2');

  await page.reload();
  await expect(count).toHaveText('2');

  await openWishlist(page);
  const rows = page.getByTestId('wishlist-item');
  await expect(rows).toHaveCount(2);
  for (const { slug, name } of ITEMS) {
    await expect(page.locator(`[data-testid="wishlist-item"][data-slug="${slug}"]`)).toContainText(name);
  }

  await page.reload();
  await expect(rows).toHaveCount(2);
  await expect(count).toHaveText('2');

  await holdOn(page, count);
});

test('TC-WISH-02 ลบออก: ตัวเลขลดลงทันที', { tag: '@P2' }, async ({ page }) => {
  for (const { slug } of ITEMS) await addToWishlist(page, slug);
  await openWishlist(page);
  const count = page.getByTestId('wishlist-count');
  const rows = page.getByTestId('wishlist-item');
  await expect(rows).toHaveCount(2);
  await expect(count).toHaveText('2');

  const target = page.locator(`[data-testid="wishlist-item"][data-slug="${ITEMS[0].slug}"]`);
  await target.getByTestId('wishlist-remove').click();

  // ไม่รีโหลด — ตัวเลขต้องลดลงทันที
  await expect(count).toHaveText('1', { timeout: 2000 });
  await expect(target).toHaveCount(0);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-slug', ITEMS[1].slug);

  await holdOn(page, count);
});

test('TC-WISH-03 ย้ายไปตะกร้า: หายจากรายการโปรด ตะกร้า +1', { tag: '@P2' }, async ({ page }) => {
  for (const { slug } of ITEMS) await addToWishlist(page, slug);
  await openWishlist(page);
  const wishCount = page.getByTestId('wishlist-count');
  const cartCount = page.getByTestId('cart-count');
  await expect(page.getByTestId('wishlist-item')).toHaveCount(2);
  const cartBefore = Number(await cartCount.innerText());

  const { slug, name } = ITEMS[1];
  const target = page.locator(`[data-testid="wishlist-item"][data-slug="${slug}"]`);
  await target.getByTestId('move-to-cart').click();

  // หายจากรายการโปรด
  await expect(target).toHaveCount(0);
  await expect(page.getByTestId('wishlist-item')).toHaveCount(1);
  await expect(wishCount).toHaveText('1');
  // ตะกร้า +1
  await expect(cartCount).toHaveText(String(cartBefore + 1));

  await openCart(page);
  await expect(page.getByTestId('cart-item').getByTestId('item-name').filter({ hasText: name })).toHaveCount(1);

  await holdOn(page, cartCount);
});
