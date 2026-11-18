const { test, expect } = require('@playwright/test');
const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: require('path').join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };
const apiShot = async (page, tc, url, status, body) => {
  await page.setContent(`<body style="font:28px monospace;padding:30px"><h1>${tc}</h1><p>${url}</p><p>status: <b>${status}</b></p><pre>${String(body).slice(0, 400).replace(/</g, '&lt;')}</pre></body>`);
  await shot(page, tc);
};
test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });

const add = async (page, slug, { size, qty = 1 } = {}) => {
  await page.goto('/products/' + slug);
  if (size) await page.locator(`[data-testid="size-option"][data-size="${size}"]`).click();
  if (qty > 1) await page.getByTestId('qty-input').fill(String(qty));
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-count')).not.toHaveText('0');
};
const login = async (page, next) => {
  await page.goto('/login' + (next ? '?next=' + next : ''));
  await page.getByTestId('login-email').fill('demo@pawpantry.test');
  await page.getByTestId('login-password').fill('Paw12345');
  await page.getByTestId('login-submit').click();
};
const register = async (page) => {
  const email = `u${Date.now()}@t.test`;
  await page.goto('/register');
  await page.getByTestId('reg-name').fill('ทดสอบ ระบบ');
  await page.getByTestId('reg-email').fill(email);
  await page.getByTestId('reg-password').fill('Paw12345');
  await page.getByTestId('reg-confirm').fill('Paw12345');
  await page.getByTestId('reg-terms').check();
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
  await add(page, 'adult-chicken-dry', { size: '3 kg' });
  await page.goto('/cart');
  await page.getByTestId('coupon-input').fill('PAW10');
  await page.getByTestId('coupon-apply').click();
  await expect(page.getByTestId('coupon-message')).toHaveText('ใช้คูปอง PAW10 แล้ว');
  await shot(page, 'TC-CPN-01');
  await expect(page.getByTestId('summary-discount')).toHaveText('-฿79');
  await expect(page.getByTestId('summary-total')).toHaveText('฿770');
});
