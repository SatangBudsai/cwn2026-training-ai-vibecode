import { createHmac } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';

export const PASSWORD = 'e2e-password-1234';
export const CONSENT_VERSION = '2026-11-v1';
export const GATEWAY_URL = process.env.THAIPAY_GATEWAY_URL ?? 'https://sandbox.thaipay.example/pay';
// ต้องตรงกับค่าที่ dev server ใช้ (.env)
export const WEBHOOK_SECRET = process.env.THAIPAY_WEBHOOK_SECRET ?? 'change-me-webhook-secret';

export async function registerMember(request: APIRequestContext): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request.post('/api/auth/register', {
    data: { email, password: PASSWORD, displayName: 'สมาชิก E2E', consentVersion: CONSENT_VERSION },
  });
  if (!res.ok()) throw new Error(`register failed: ${res.status()}`);
  return email;
}

export async function loginViaUi(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('อีเมล').fill(email);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
}

export async function sendSignedWebhook(request: APIRequestContext, body: object) {
  const raw = JSON.stringify(body);
  const signature = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return request.post('/api/payment/webhook', {
    headers: { 'content-type': 'application/json', 'x-thaipay-signature': signature },
    data: raw,
  });
}
