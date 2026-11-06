const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.js',
  timeout: 30000,
  workers: 1, // petshop เก็บสถานะในเครื่องเดียว รันทีละข้อเพื่อไม่ให้ข้อมูลชนกัน
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-report/html', open: 'never' }],
    ['json', { outputFile: 'test-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Desktop Chrome'],
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: 'test-results',
});
