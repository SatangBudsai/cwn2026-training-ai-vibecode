import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * 1 ชุด = 1 หัวข้อย่อย + เว็บของตัวเอง 1 คู่
 *   BASE_URL=http://localhost:3110 SUITE=5.1 npx playwright test --project=chromium --grep @5.1
 * วิดีโออัดโดย fixture กลาง (fixtures/index.ts) ไม่ใช่ option `video`
 * เพราะต้องอัด browser context ที่สองขึ้นไปด้วย (บัญชีร้าน ลูกค้าคนที่สอง)
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const suite = process.env.SUITE ?? 'all';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // reset ล้างข้อมูลทั้งเว็บ จึงห้ามขนานภายในชุดเดียวกัน
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 6_000 },
  outputDir: path.join('test-results', suite),
  reporter: [['list'], ['./reporters/evidence-reporter.ts']],
  use: {
    baseURL,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
  ],
});
