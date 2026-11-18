const { test, expect } = require('@playwright/test');
const shot = async (page, tc) => { if (process.env.EVIDENCE) await page.screenshot({ path: require('path').join(__dirname, '..', 'evidence', tc + '.png'), fullPage: true }); };
test.beforeEach(async ({ request }) => { await request.post('/api/test/reset'); });

const apiShot = async (page, tc, url, status, body) => {
  await page.setContent(`<body style="font:32px monospace;padding:30px"><h1>${tc}</h1><p>URL: ${url}</p><p>STATUS: ${status}</p><pre style="white-space:pre-wrap;word-break:break-all">${String(body).slice(0, 600).replace(/</g, '&lt;')}</pre></body>`);
  await shot(page, tc);
};
const ready = (page) => expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
const addFromDetail = async (page, slug, size, n = 1) => {
  await page.goto('/products/' + slug); await ready(page);
  if (size) await page.locator(`[data-testid=size-option][data-size="${size}"]`).click();
  for (let i = 1; i < n; i++) await page.getByTestId('qty-plus').click();
  await page.getByTestId('add-to-cart').click();
};
const login = async (page, email = 'demo@pawpantry.test', pw = 'Paw12345') => {
  await page.goto('/login'); await ready(page);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(pw);
  await page.getByTestId('login-submit').click();
};
const register = async (page) => {
  const email = `u${Date.now()}@t.test`;
  await page.goto('/register'); await ready(page);
  await page.getByTestId('reg-name').fill('ทดสอบ ระบบ');
  await page.getByTestId('reg-email').fill(email);
  await page.getByTestId('reg-password').fill('Paw12345');
  await page.getByTestId('reg-confirm').fill('Paw12345');
  await page.getByTestId('reg-terms').check();
  await page.getByTestId('reg-submit').click();
  return email;
};
const fillShip = async (page, o = {}) => {
  const v = { phone: '0812345678', address: '123 ถนนสุขุมวิท แขวงคลองเตย', postcode: '10110', ...o };
  await page.getByTestId('ship-phone').fill(v.phone);
  await page.getByTestId('ship-address').fill(v.address);
  await page.getByTestId('ship-postcode').fill(v.postcode);
};

test.describe('catalog', () => {
  test('TC-CAT-03 เรียงราคาน้อย → มาก', async ({ page }) => {
    await page.goto('/products?sort=price-asc'); await ready(page);
    await shot(page, 'TC-CAT-03');
    await expect(page.getByTestId('product-price').first()).toHaveText('฿35');
    const prices = (await page.getByTestId('product-price').allInnerTexts()).map((t) => Number(t.replace(/[^\d]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
