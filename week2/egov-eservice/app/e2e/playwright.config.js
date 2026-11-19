// @ts-check
// ใช้ร่วมกันทุก spec · เซิร์ฟเวอร์มีสถานะเดียว (reset/clock) จึงต้องรันทีละ test: workers=1, ไม่ parallel
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]],
  use: {
    baseURL: (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, ''),
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
