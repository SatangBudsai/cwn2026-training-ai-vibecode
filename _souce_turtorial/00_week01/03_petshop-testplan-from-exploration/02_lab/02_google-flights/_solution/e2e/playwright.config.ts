import { defineConfig, devices } from '@playwright/test';

/**
 * ชุดทดสอบ Google Flights กรุงเทพ → โตเกียว (TEST-PLAN.md หัวข้อ 5)
 * - Chromium อย่างเดียว · โปรไฟล์ใหม่ทุก test (context ใหม่ ไม่ล็อกอิน)
 * - workers: 1 · retries: 0 · ทำช้าแบบคน (ดู support/gf.ts)
 * - เจอ CAPTCHA/หน้าบล็อก → support/gf.ts เขียน .state/STOP แล้ว test ที่เหลือถูกข้าม (= ไม่ได้รัน)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  expect: { timeout: 15_000 },
  outputDir: process.env.PW_OUTPUT_DIR || './test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PW_JSON_OUT || './test-report/results.json' }],
  ],
  use: {
    baseURL: 'https://www.google.com',
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    screenshot: 'on',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, channel: 'chromium' },
    },
  ],
});
