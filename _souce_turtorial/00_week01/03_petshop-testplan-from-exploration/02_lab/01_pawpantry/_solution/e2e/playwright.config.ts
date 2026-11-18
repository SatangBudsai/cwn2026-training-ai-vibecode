import { defineConfig, devices } from '@playwright/test';

// รหัสรอบ {run} (G2) — ตั้งครั้งเดียวใน main process แล้ว worker สืบทอด
if (!process.env.PP_STAMP) process.env.PP_STAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);

/**
 * เว็บของแต่ละ project (แผนหัวข้อ 2.3 ฉบับ 1.2): reset ล้างข้อมูลทั้งเว็บ จึงให้แต่ละเบราว์เซอร์มีเว็บของตัวเอง
 * แล้วรันพร้อมกันได้โดยไม่ชนกัน · health check และ reset ใน tests/support/pp.ts ยิงไปที่ baseURL ของ project นั้น
 *   chromium      → petshop  (container เดิม)               http://localhost:3000
 *   mobile-chrome → petshop2 (image pawpantry:latest ชุดที่ 2) http://localhost:3001
 *   api           → petshop  (รันครั้งเดียว นับผลให้ทุกเบราว์เซอร์)
 * เปลี่ยนได้ด้วย env PP_URL_CHROMIUM / PP_URL_MOBILE / PP_URL_API
 */
const SITE = {
  api: process.env.PP_URL_API ?? 'http://localhost:3000',
  chromium: process.env.PP_URL_CHROMIUM ?? 'http://localhost:3000',
  mobileChrome: process.env.PP_URL_MOBILE ?? 'http://localhost:3001',
};

/**
 * การเลือก test ต่อ project (หัวข้อ 2.3) ใช้ tag ในชื่อ test:
 *   @api        = เรียก API อย่างเดียว → รันเฉพาะ project api (นับผลให้ chromium)
 *   @mobile     = เฉพาะจอมือถือ → mobile-chrome (ไม่รันบน chromium)
 *   @mobile-too = รันทั้ง chromium และ mobile-chrome (smoke P1 5 ข้อ + A11Y-004)
 *   tag @webkit-desktop / @no-mobile-safari / @chromium-only ยังอยู่ใน test แต่ไม่มีผลแล้ว (เลิกใช้ firefox/webkit/mobile-safari)
 */
export default defineConfig({
  testDir: './tests',
  workers: 1, // ต่อ 1 คำสั่งรัน = 1 project บนเว็บของตัวเอง (G1) — รันหลาย project พร้อมกันด้วย run-parallel.sh
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 5_000 },
  outputDir: process.env.PP_OUT ?? 'test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PP_JSON ?? 'test-report/results.json' }],
    ['html', { open: 'never', outputFolder: process.env.PP_HTML ?? 'test-report/playwright-html' }],
  ],
  use: {
    trace: 'off', // หลักฐานใช้ภาพจุดตรวจ + วิดีโอ/GIF แทน (trace บน Windows เคยเขียนไฟล์ชนกันจน API call ใน test ล้ม)
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'api', grep: /@api\b/, use: { baseURL: SITE.api } },
    {
      name: 'chromium',
      grepInvert: /@api\b|@mobile(?![\w-])/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: SITE.chromium,
        viewport: { width: 1280, height: 800 },
        video: { mode: 'on', size: { width: 1280, height: 800 } },
      },
    },
    {
      name: 'mobile-chrome',
      grep: /@mobile(?![\w-])|@mobile-too\b/,
      use: { ...devices['Pixel 7'], baseURL: SITE.mobileChrome, viewport: { width: 375, height: 812 } },
    },
  ],
});
