// TEST-PLAN.md §5 ข้อ 38–40 (โมดูล API)
const { test, expect } = require('@playwright/test');
const { holdOn } = require('./helpers');

// API ตอบเร็วมาก: ค้างตารางผลเพิ่มอีกนิด (เฉพาะตอนอัด GIF) ให้คลิปยาว ≥ 5 วินาที
const SHOW_MS = Number(process.env.HOLD_MS ?? 3000) > 0 ? 2000 : 0;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** แสดงผลการเรียก API เป็นตารางเล็ก ๆ ในหน้าเว็บ ให้เห็นใน GIF */
async function showResult(page, { title, method, url, status, expected, detail }) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;padding:24px;background:#fffaf3}
    table{border-collapse:collapse;min-width:560px} th,td{border:1px solid #bbb;padding:8px 12px;text-align:left;vertical-align:top}
    th{background:#f0e6d8} pre{margin:0;white-space:pre-wrap;max-width:720px;font-size:12px}
  </style></head><body>
    <h2>${esc(title)}</h2>
    <table data-testid="api-result">
      <tr><th>Method</th><td>${esc(method)}</td></tr>
      <tr><th>URL</th><td>${esc(url)}</td></tr>
      <tr><th>Status</th><td data-testid="api-status">${esc(status)}</td></tr>
      <tr><th>Expected</th><td>${esc(expected)}</td></tr>
      <tr><th>Detail</th><td><pre>${esc(detail)}</pre></td></tr>
    </table></body></html>`);
  await page.waitForTimeout(SHOW_MS);
}

test('TC-API-01 รายการสินค้าหมา: GET /api/products?pet=dog ได้ 200 และ 14 รายการ', { tag: '@P2' }, async ({ page, request }) => {
  const url = '/api/products?pet=dog';
  const res = await request.get(url);
  const body = await res.json();
  const items = body.items || [];

  await showResult(page, {
    title: 'TC-API-01 รายการสินค้าหมา',
    method: 'GET',
    url,
    status: res.status(),
    expected: '200 และได้ 14 รายการ',
    detail: `items: ${items.length}\n` + items.map((i) => `${i.pet}  ${i.slug}  ${i.name}`).join('\n'),
  });

  expect(res.status()).toBe(200);
  expect(items).toHaveLength(14);
  for (const i of items) expect(i.pet).toBe('dog');

  await expect(page.getByTestId('api-status')).toHaveText('200');
  await holdOn(page, page.getByTestId('api-result'));
});

test('TC-API-02 สั่งซื้อโดยไม่ login: POST /api/orders ได้ 401', { tag: '@P1' }, async ({ page, request }) => {
  const url = '/api/orders';
  const order = {
    items: [{ slug: 'kitten-salmon-dry', size: '400 g', qty: 1 }],
    shipping: 'standard',
    address: {
      name: 'ทดสอบ ไม่ล็อกอิน',
      phone: '0812345678',
      address: '123 ถนนทดสอบ แขวงลาดกระบัง',
      district: 'ลาดกระบัง',
      province: 'กรุงเทพมหานคร',
      postcode: '10520',
    },
    payment: 'cod',
  };
  // request fixture ไม่มีคุกกี้ session ใด ๆ = ยังไม่ login
  const res = await request.post(url, { data: order });
  const text = await res.text();

  await showResult(page, {
    title: 'TC-API-02 สั่งซื้อโดยไม่ login',
    method: 'POST (ไม่มีคุกกี้ login)',
    url,
    status: res.status(),
    expected: '401',
    detail: `request body:\n${JSON.stringify(order, null, 2)}\n\nresponse body:\n${text}`,
  });

  expect(res.status()).toBe(401);
  await expect(page.getByTestId('api-status')).toHaveText('401');
  await holdOn(page, page.getByTestId('api-result'));
});

test('TC-API-03 สินค้าที่ไม่มีอยู่: GET /api/products/<slug ที่ไม่มี> ได้ 404', { tag: '@P3' }, async ({ page, request }) => {
  const url = '/api/products/no-such-product-a08';
  const res = await request.get(url);
  const text = await res.text();

  await showResult(page, {
    title: 'TC-API-03 สินค้าที่ไม่มีอยู่',
    method: 'GET',
    url,
    status: res.status(),
    expected: '404',
    detail: `response body:\n${text}`,
  });

  expect(res.status()).toBe(404);
  await expect(page.getByTestId('api-status')).toHaveText('404');
  await holdOn(page, page.getByTestId('api-result'));
});
