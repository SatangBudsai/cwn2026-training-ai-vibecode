const { test, expect } = require('@playwright/test');

const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: require('path').join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };
const shotApi = async (page, tc, url, status, body) => {
  await page.setContent(`<body style="font:32px monospace;padding:30px"><h1>${url}</h1><h1>status: ${status}</h1><pre style="white-space:pre-wrap">${String(body).slice(0, 600)}</pre></body>`);
  await shot(page, tc);
};
const DEMO = { email: 'demo@pawpantry.test', password: 'Paw12345' };

test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });

async function ready(page) { await expect(page.locator('html')).toHaveAttribute('data-ready', 'true'); }
async function addFromDetail(page, slug, size, times = 1) {
  await page.goto('/products/' + slug);
  await ready(page);
  if (size) await page.locator(`[data-testid="size-option"][data-size="${size}"]`).click();
  for (let i = 1; i < times; i++) await page.getByTestId('qty-plus').click();
  await page.getByTestId('add-to-cart').click();
}
async function login(page, next) {
  await page.goto('/login' + (next ? '?next=' + next : ''));
  await ready(page);
  await page.getByTestId('login-email').fill(DEMO.email);
  await page.getByTestId('login-password').fill(DEMO.password);
  await page.getByTestId('login-submit').click();
}
async function seedCart(page, items) {
  await page.goto('/');
  await page.evaluate((i) => localStorage.setItem('pp-cart', JSON.stringify(i)), items);
}

test.describe('bugs', () => {
  test('TC-CAT-03 เรียงราคาน้อย → มาก', async ({ page }) => {
    await page.goto('/products');
    await page.getByTestId('sort-select').selectOption('price-asc');
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.getByTestId('product-card').first().getByTestId('product-price')).toHaveText('฿35');
    const prices = (await page.getByTestId('product-price').allTextContents()).map((t) => Number(t.replace(/[^\d]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    await shot(page, 'TC-CAT-03');
  });

  test('TC-CART-03 ส่งฟรีเมื่อครบ ฿999', async ({ page }) => {
    await seedCart(page, [{ slug: 'adult-lamb-dry', size: '3 kg', qty: 1 }]);
    await page.goto('/cart');
    await expect(page.getByTestId('summary-subtotal')).toHaveText('฿790');
    await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
    await expect(page.getByTestId('summary-total')).toHaveText('฿840');
    await expect(page.getByTestId('free-shipping-progress')).toHaveText('ซื้อเพิ่มอีก ฿209 เพื่อส่งฟรี');
    await seedCart(page, [{ slug: 'adult-lamb-dry', size: '3 kg', qty: 2 }, { slug: 'adult-lamb-dry', size: '8 kg', qty: 1 }]);
    await page.goto('/cart');
    await expect(page.getByTestId('summary-subtotal')).toHaveText('฿3,470');
    await seedCart(page, [{ slug: 'adult-lamb-dry', size: '3 kg', qty: 1 }, { slug: 'adult-lamb-dry', size: '8 kg', qty: 1 }]);
    await page.goto('/cart');
    await expect(page.getByTestId('summary-subtotal')).toHaveText('฿2,680');
    await expect(page.getByTestId('summary-shipping')).toHaveText('ฟรี');
    await expect(page.getByTestId('summary-total')).toHaveText('฿2,680');
    await expect(page.getByTestId('free-shipping-progress')).toHaveText('ได้ส่งฟรีแล้ว!');
    await expect(page.getByTestId('free-shipping-progress')).not.toContainText('-');
    await shot(page, 'TC-CART-03');
  });

  test('TC-AUTH-03 รหัสผ่านอ่อน / ไม่ตรงกัน', async ({ page }) => {
    await page.goto('/register');
    await ready(page);
    await page.getByTestId('reg-name').fill('ทดสอบ');
    await page.getByTestId('reg-email').fill(`u${Date.now()}@t.test`);
    await page.getByTestId('reg-password').fill('abc');
    await page.getByTestId('reg-confirm').fill('xyz');
    await page.getByTestId('reg-terms').check();
    await page.getByTestId('reg-submit').click();
    await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
    await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
    await expect(page).toHaveURL(/\/register/);
    await shot(page, 'TC-AUTH-03');
  });

});
