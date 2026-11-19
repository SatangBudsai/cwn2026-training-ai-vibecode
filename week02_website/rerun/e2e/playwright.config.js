const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  retries: 1, // Playwright worker บน Windows crash เป็นครั้งคราว (code 3221226505) ถ้าผ่านรอบสอง จะรายงานเป็น flaky ไม่ซ่อน
  fullyParallel: false,
  timeout: 60000,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-report/html', open: 'never' }],
    ['json', { outputFile: 'test-report/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3100',
    video: 'on',
    trace: 'retain-on-failure',
  },
});

