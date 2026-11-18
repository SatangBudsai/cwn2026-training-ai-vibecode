import { defineConfig } from '@playwright/test';

// ชุด test เดียว รันกับทั้งสองแอป: v1 = SkyThai Mini, v2 = SkyThai Plus
// EVIDENCE=1 → บันทึกวิดีโอ + ไฮไลต์กรอบแดง + ค้างภาพผลลัพธ์ 3 วินาที
const evidence = !!process.env.EVIDENCE;

export default defineConfig({
  testDir: './tests',
  timeout: evidence ? 90_000 : 45_000,
  expect: { timeout: 4_000 },
  fullyParallel: true,
  workers: evidence ? 2 : 4,
  retries: 0,
  outputDir: evidence ? './evidence-run' : './test-results',
  reporter: [['list'], ['json', { outputFile: evidence ? 'evidence-run/results.json' : 'results.json' }]],
  use: {
    viewport: { width: 1280, height: 800 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    actionTimeout: 4_000,
    navigationTimeout: 15_000,
    video: evidence ? { mode: 'on', size: { width: 1280, height: 800 } } : 'off',
    launchOptions: {
      executablePath: process.env.CHROME_PATH || '/ms-playwright/chromium-1247/chrome-linux64/chrome',
      args: ['--no-sandbox'],
    },
  },
  projects: [
    { name: 'v1', use: { baseURL: process.env.V1_URL || 'http://localhost:5081' } },
    { name: 'v2', use: { baseURL: process.env.V2_URL || 'http://localhost:5082' } },
  ],
});
