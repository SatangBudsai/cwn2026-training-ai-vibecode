// TEST-PLAN.md §5 ข้อ 16–19 (โมดูลตะกร้า)
const { test, expect } = require('@playwright/test');
const { addToCart, openCart, holdOn } = require('./helpers');

test('TC-CART-01 ใส่ 2 ชิ้น: ฿189×2 + ค่าส่ง ฿50 = ฿428', { tag: '@P1' }, async ({ page }) => {
  await addToCart(page, 'kitten-salmon-dry', { size: '400 g', qty: 2 }); // ฿189
  await openCart(page);

  const item = page.getByTestId('cart-item');
  await expect(item).toHaveCount(1);
  await expect(item.getByTestId('item-qty')).toHaveValue('2');
  await expect(item.getByTestId('item-line-total')).toHaveText('฿378');
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿378');
  await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
  await expect(page.getByTestId('summary-total')).toHaveText('฿428');

  await holdOn(page, page.getByTestId('summary-total'));
});

test('TC-CART-02 เพิ่ม / ลด / ลบ: ยอดเปลี่ยนถูก ลบหมดแล้วเห็นตะกร้าว่าง', { tag: '@P1' }, async ({ page }) => {
  await addToCart(page, 'kitten-salmon-dry', { size: '400 g' }); // ฿189
  await openCart(page);
  const item = page.getByTestId('cart-item');
  const subtotal = page.getByTestId('summary-subtotal');
  const total = page.getByTestId('summary-total');

  await expect(subtotal).toHaveText('฿189');
  await expect(total).toHaveText('฿239'); // 189 + 50

  await item.getByTestId('item-plus').click(); // 2 ชิ้น
  await expect(item.getByTestId('item-qty')).toHaveValue('2');
  await expect(subtotal).toHaveText('฿378');
  await expect(total).toHaveText('฿428');

  await item.getByTestId('item-plus').click(); // 3 ชิ้น
  await expect(item.getByTestId('item-qty')).toHaveValue('3');
  await expect(subtotal).toHaveText('฿567');
  await expect(total).toHaveText('฿617');

  await item.getByTestId('item-minus').click(); // ลดกลับเป็น 2
  await expect(item.getByTestId('item-qty')).toHaveValue('2');
  await expect(subtotal).toHaveText('฿378');
  await expect(total).toHaveText('฿428');
  await expect(page.getByTestId('cart-count')).toHaveText('2');

  await item.getByTestId('item-remove').click(); // ลบหมด
  await expect(page.getByTestId('cart-item')).toHaveCount(0);
  await expect(page.getByText('ตะกร้าของคุณยังว่างอยู่')).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('0');

  await holdOn(page);
});

test('TC-CART-03 ส่งฟรีเมื่อครบ ฿999: ฿790 เสียค่าส่ง, ฿2,680 ส่งฟรี', { tag: '@P2' }, async ({ page }) => {
  await addToCart(page, 'adult-lamb-dry', { size: '3 kg' }); // ฿790
  await openCart(page);
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿790');
  await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
  await expect(page.getByTestId('summary-total')).toHaveText('฿840');
  await expect(page.getByTestId('free-shipping-progress')).toContainText('ซื้อเพิ่มอีก ฿209');
  await holdOn(page, page.getByTestId('summary-total'));

  await addToCart(page, 'adult-lamb-dry', { size: '8 kg' }); // +฿1,890
  await openCart(page);
  await expect(page.getByTestId('cart-item')).toHaveCount(2);
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿2,680');
  await expect(page.getByTestId('summary-shipping')).toHaveText('ฟรี');
  await expect(page.getByTestId('summary-total')).toHaveText('฿2,680');
  await expect(page.getByTestId('free-shipping-progress')).toContainText('ได้ส่งฟรีแล้ว');

  await holdOn(page, page.getByTestId('summary-total'));
});

test('TC-CART-04 รีโหลด + สินค้าแนะนำ: สินค้ายังอยู่ และมีสินค้า "ซื้อคู่กัน"', { tag: '@P2' }, async ({ page, request }) => {
  await addToCart(page, 'kitten-salmon-dry', { size: '400 g' });
  await openCart(page);
  await expect(page.getByTestId('cart-item')).toHaveCount(1);

  await page.reload();
  const item = page.getByTestId('cart-item');
  await expect(item).toHaveCount(1);
  await expect(item.getByTestId('item-name')).toHaveText('ลูกแมว สูตรแซลมอน');
  await expect(item.getByTestId('item-size')).toHaveText('400 g');
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  // สินค้า "ซื้อคู่กัน" ต้องมาจาก boughtWith ของสินค้าในตะกร้า
  const rec = page.getByTestId('cart-recommendations');
  await expect(rec).toBeVisible();
  await expect(rec).toContainText('ซื้อคู่กัน');
  const products = (await (await request.get('/api/products')).json()).items;
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const expected = bySlug['kitten-salmon-dry'].boughtWith.map((s) => bySlug[s].name);
  expect(expected.length).toBeGreaterThan(0);
  for (const name of expected) {
    await expect(rec.getByTestId('product-name').filter({ hasText: name })).toBeVisible();
  }

  await holdOn(page, rec);
});
