import { expect, test } from '@playwright/test';
import { GATEWAY_URL, loginViaUi, registerMember, sendSignedWebhook } from './helpers';

// บั๊ก ShopDee 2025: อยู่หน้า gateway นานจน access token หมด → กลับมาโดนเด้งไป login + ตะกร้าหาย
// dev server ของ E2E ตั้ง ACCESS_TOKEN_TTL_SEC=5 (playwright.config.ts) แล้วรอที่ gateway 7 วินาที
test('token หมดอายุระหว่างอยู่หน้า gateway → กลับมาเห็น "ชำระเงินสำเร็จ" และยังอยู่ในระบบ', async ({ page, request }) => {
  await page.route(`${GATEWAY_URL}**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>ThaiPay sandbox</h1>' }),
  );

  const email = await registerMember(request);
  await loginViaUi(page, email);
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByRole('button', { name: 'ชำระเงิน' }).first().click();
  await page.waitForURL((url) => url.href.startsWith(GATEWAY_URL));
  const gateway = new URL(page.url());
  const orderId = gateway.searchParams.get('order_id');
  const returnUrl = gateway.searchParams.get('return_url');
  expect(orderId).toBeTruthy();
  expect(returnUrl).toContain(`order_id=${orderId}`);

  // ผู้ใช้สแกน QR / รอ OTP ธนาคารนานกว่าอายุ access token
  await page.waitForTimeout(7_000);

  // gateway ส่ง webhook ซ้ำ 3 ครั้ง (เหมือนตอนระบบเขาช้า) → ต้องตอบ 200 ทุกครั้ง
  const event = {
    event_id: `evt-${orderId}`,
    type: 'payment.succeeded',
    order_id: orderId,
    amount_satang: Number(gateway.searchParams.get('amount_satang')),
  };
  for (let i = 0; i < 3; i++) expect((await sendSignedWebhook(request, event)).status()).toBe(200);

  await page.goto(returnUrl!);
  await expect(page.getByTestId('payment-status')).toHaveText('ชำระเงินสำเร็จ');

  // ไม่โดนเด้งไป login
  await page.getByRole('link', { name: 'กลับไปหน้าแพ็กเกจ' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('button', { name: 'ชำระเงิน' }).first()).toBeVisible();
});

test('webhook ลายเซ็นผิด → 401', async ({ request }) => {
  const res = await request.post('/api/payment/webhook', {
    headers: { 'content-type': 'application/json', 'x-thaipay-signature': 'deadbeef' },
    data: JSON.stringify({ event_id: 'x' }),
  });
  expect(res.status()).toBe(401);
});
