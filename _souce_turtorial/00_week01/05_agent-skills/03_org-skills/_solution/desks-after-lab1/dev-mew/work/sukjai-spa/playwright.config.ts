import { defineConfig } from '@playwright/test';

// E2E รันกับ dev server ที่ตั้ง ACCESS_TOKEN_TTL_SEC=5 เพื่อจำลองบั๊ก token หมดอายุกลางการจ่ายเงิน
// E2E_PORT แยกจาก dev ปกติ กันไปใช้ server ของโปรเจกต์อื่นที่เปิดพอร์ตเดียวกันอยู่
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 1,
  use: { baseURL },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ACCESS_TOKEN_TTL_SEC: '5', APP_BASE_URL: baseURL },
  },
});
