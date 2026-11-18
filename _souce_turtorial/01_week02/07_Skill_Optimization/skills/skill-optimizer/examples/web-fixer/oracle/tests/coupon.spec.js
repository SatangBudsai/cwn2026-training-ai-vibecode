// TEST-PLAN.md §5 ข้อ 20–22 (โมดูลคูปอง)
const { test, expect } = require('@playwright/test');
const { addToCart, openCart, holdOn } = require('./helpers');

test('TC-CPN-01 PAW10: ฿799 ลด ฿79 → ฿770', { tag: '@P1' }, async ({ page }) => {
  await addToCart(page, 'adult-chicken-dry', { size: '3 kg' }); // ฿799
  await openCart(page);
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿799');
  await expect(page.getByTestId('summary-total')).toHaveText('฿849'); // ก่อนใช้คูปอง

  await page.getByTestId('coupon-input').pressSequentially('PAW10', { delay: 120 });
  await page.getByTestId('coupon-apply').click();

  await expect(page.getByTestId('coupon-message')).toContainText('PAW10');
  await expect(page.getByTestId('summary-discount')).toHaveText('-฿79');
  await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
  await expect(page.getByTestId('summary-total')).toHaveText('฿770');

  await holdOn(page, page.getByTestId('summary-total'));
});

/** พิมพ์โค้ดคูปองแล้วกด "ใช้" */
async function applyCoupon(page, code) {
  const input = page.getByTestId('coupon-input');
  await input.fill('');
  await input.pressSequentially(code, { delay: 120 });
  await page.getByTestId('coupon-apply').click();
}

test('TC-CPN-02 คูปองผิด / หมดอายุ: ข้อความ error ถูกต้อง ยอดไม่เปลี่ยน', { tag: '@P2' }, async ({ page }) => {
  await addToCart(page, 'puppy-chicken-dry', { size: '3 kg' }); // ฿690
  await openCart(page);
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿690');
  await expect(page.getByTestId('summary-total')).toHaveText('฿740'); // ก่อนใช้คูปอง
  const msg = page.getByTestId('coupon-message');

  // 1) โค้ดที่ไม่มีอยู่จริง
  await applyCoupon(page, 'NOSUCHCODE99');
  await expect(msg).toHaveText('ไม่พบคูปองนี้');
  await expect(page.getByTestId('summary-discount')).not.toContainText('-');
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿690');
  await expect(page.getByTestId('summary-total')).toHaveText('฿740');

  // 2) SUMMER20 หมดอายุ (TEST-PLAN §7) — ข้อความต้องบอกว่าหมดอายุ ไม่ใช่ "ไม่พบ"
  await applyCoupon(page, 'SUMMER20');
  await expect(msg).toHaveText('คูปองนี้หมดอายุแล้ว');
  await expect(msg).not.toHaveText('ไม่พบคูปองนี้');
  await expect(page.getByTestId('summary-discount')).not.toContainText('-');
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿690');
  await expect(page.getByTestId('summary-total')).toHaveText('฿740');

  await holdOn(page, page.getByTestId('summary-total'));
});

test('TC-CPN-03 NEWCAT50: ไม่มีอาหารแมว → ใช้ไม่ได้; มี ฿590 → ลด ฿50', { tag: '@P2' }, async ({ page }) => {
  const msg = page.getByTestId('coupon-message');

  // 1) ตะกร้ามีแต่อาหารสุนัข (฿690 ≥ ฿500 แต่ไม่ใช่อาหารแมว) → ใช้ไม่ได้ ยอดไม่เปลี่ยน
  await addToCart(page, 'puppy-chicken-dry', { size: '3 kg' }); // อาหารสุนัข ฿690
  await openCart(page);
  await expect(page.getByTestId('summary-total')).toHaveText('฿740');
  await applyCoupon(page, 'NEWCAT50');
  await expect(msg).toContainText('อาหารแมว');
  await expect(msg).not.toContainText('ใช้คูปอง NEWCAT50 แล้ว');
  await expect(page.getByTestId('summary-discount')).not.toContainText('-');
  await expect(page.getByTestId('summary-total')).toHaveText('฿740');

  // 2) ล้างตะกร้า (เคลียร์ cookie/storage ของเบราว์เซอร์นี้) แล้วใส่อาหารแมว ฿590
  await page.context().clearCookies();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await addToCart(page, 'kitten-salmon-dry', { size: '1.5 kg' }); // อาหารแมว (dry) ฿590
  await openCart(page);
  await expect(page.getByTestId('summary-subtotal')).toHaveText('฿590');
  await expect(page.getByTestId('summary-total')).toHaveText('฿640'); // ก่อนใช้คูปอง

  await applyCoupon(page, 'NEWCAT50');
  await expect(msg).toContainText('NEWCAT50');
  await expect(page.getByTestId('summary-discount')).toHaveText('-฿50');
  await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
  await expect(page.getByTestId('summary-total')).toHaveText('฿590'); // 590 − 50 + ค่าส่ง 50

  await holdOn(page, page.getByTestId('summary-total'));
});
