// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const SLOW_MO = Number(process.env.SLOW_MO ?? 700); // เดินช้าลงให้ดูทัน (ms ต่อ action)

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 90_000,
  globalSetup: require.resolve('./global-setup'),
  fullyParallel: true,
  workers: Number(process.env.WORKERS ?? 8),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-report/html', open: 'never' }],
    ['json', { outputFile: 'test-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    video: { mode: 'on', size: { width: 1280, height: 800 } },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { slowMo: SLOW_MO },
  },
  // ใช้ Chromium ที่ติดตั้งไว้แล้ว (ms-playwright/chromium-1248 ตรงกับ @playwright/test 1.64.1) — ไม่ต้อง install ใหม่
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
