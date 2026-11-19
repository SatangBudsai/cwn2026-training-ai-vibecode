const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
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
