const { test, expect } = require('@playwright/test');
const path = require('path');
const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: path.join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };
const apiShot = async (page, tc, res) => {
  const body = (await res.text()).slice(0, 200).replace(/</g, '&lt;');
  await page.setContent(`<body style="font:40px sans-serif;padding:40px"><h1>${res.url()}</h1><h1>status ${res.status()}</h1><pre style="font-size:28px;white-space:pre-wrap">${body}</pre></body>`);
  await shot(page, tc);
};

test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });

const seedCart = async (page, items) => {
  await page.goto('/');
  await page.evaluate((i) => localStorage.setItem('pp-cart', JSON.stringify(i)), items);
  await page.goto('/cart');
};
const login = async (page, next) => {
  await page.getByTestId('login-email').fill('demo@pawpantry.test');
  await page.getByTestId('login-password').fill('Paw12345');
  await page.getByTestId('login-submit').click();
};
const card = (page, slug) => page.locator(`[data-testid="product-card"][data-slug="${slug}"]`);
const CAT_FOOD = ['kitten-salmon-dry','adult-chicken-dry','senior-tuna-dry','tuna-pouch','kitten-chicken-mousse','duck-grainfree-dry','lickable-salmon-treat','freeze-dried-chicken-cat','hairball-control-dry','urinary-care-dry'];

test.describe('bugs', () => {
  const apply = async (page, code) => { await page.getByTestId('coupon-input').fill(code); await page.getByTestId('coupon-apply').click(); };
  const fillReg = async (page, o) => {
    await page.goto('/register');
    await page.getByTestId('reg-name').fill(o.name ?? '');
    await page.getByTestId('reg-email').fill(o.email ?? '');
    await page.getByTestId('reg-password').fill(o.pw ?? '');
    await page.getByTestId('reg-confirm').fill(o.confirm ?? '');
    if (o.terms) await page.getByTestId('reg-terms').check();
    await page.getByTestId('reg-submit').click();
  };
  test('TC-PRD-03 จำนวนเกินสต็อก', async ({ page }) => {
    await page.goto('/products/hairball-control-dry');
    for (let i = 0; i < 5; i++) await page.getByTestId('qty-plus').click();
    await shot(page, 'TC-PRD-03');
    await expect(page.getByTestId('qty-input')).toHaveValue('3');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-count')).toHaveText('3');
  });
  test('TC-CPN-01 PAW10', async ({ page }) => {
    await seedCart(page, [{ slug: 'adult-chicken-dry', size: '3 kg', qty: 1 }]);
    await expect(page.getByTestId('summary-subtotal')).toHaveText('฿799');
    await apply(page, 'PAW10');
    await shot(page, 'TC-CPN-01');
    await expect(page.getByTestId('summary-discount')).toHaveText('-฿79');
    await expect(page.getByTestId('summary-shipping')).toHaveText('฿50');
    await expect(page.getByTestId('summary-total')).toHaveText('฿770');
  });
  test('TC-AUTH-03 รหัสผ่านอ่อน ไม่ตรงกัน', async ({ page }) => {
    await fillReg(page, { name: 'a', email: `u${Date.now()}@t.test`, pw: 'abc', confirm: 'xyz', terms: true });
    await shot(page, 'TC-AUTH-03');
    await expect(page.getByTestId('error-password')).toHaveText('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวเลข');
    await expect(page.getByTestId('error-confirm')).toHaveText('รหัสผ่านไม่ตรงกัน');
    await expect(page).toHaveURL(/\/register/);
  });
});
