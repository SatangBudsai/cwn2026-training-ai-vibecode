#!/usr/bin/env node
// สร้างห้องทดลอง e2e จาก plan.json (รันใน e2e/ หลัง parse-plan.mjs)
// ใช้: node scaffold-e2e.mjs [--force] [--agent-monitor]
// สร้าง: package.json · playwright.config.ts · global-setup.ts · tests/fixtures.ts · .gitignore (+ agent-log.sh ถ้า --agent-monitor)
// ไม่ทับไฟล์ที่มีอยู่แล้ว ยกเว้นใส่ --force (tests/*.spec.ts ไม่แตะเลย)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const force = process.argv.includes('--force');
if (!fs.existsSync('plan.json')) { console.error('ไม่พบ plan.json — รัน parse-plan.mjs ก่อน'); process.exit(1); }
const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'));
if (!plan.baseURL) { console.error('plan.json ไม่มี baseURL — ถามผู้ใช้แล้วใส่ใน plan.json เอง'); process.exit(1); }

const write = (f, s) => {
  fs.mkdirSync(path.dirname(f) || '.', { recursive: true });
  if (fs.existsSync(f) && !force) { console.log(`= ข้าม ${f} (มีอยู่แล้ว)`); return; }
  fs.writeFileSync(f, s); console.log(`+ ${f}`);
};

if (!fs.existsSync('package.json')) {
  fs.writeFileSync('package.json', JSON.stringify({
    name: 'e2e', version: '1.0.0', private: true, type: 'commonjs',
    scripts: { test: 'playwright test' },
  }, null, 2));
  console.log('+ package.json');
}

write('.gitignore', `node_modules/
test-results/
test-report/
playwright-report/
scratch/
`);

write('playwright.config.ts', `import { defineConfig, devices } from '@playwright/test';

// E2E แบบ black-box จาก ${plan.planFile} — ใช้ Chromium ที่ติดตั้งไว้แล้ว (ไม่โหลดใหม่)
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  workers: 8,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-report/results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: '${plan.baseURL}',
    video: { mode: 'on', size: { width: 960, height: 600 } },
    screenshot: 'only-on-failure',
    launchOptions: { slowMo: 350 }, // เดินช้าลงให้คนดู GIF ทัน
    locale: 'th-TH',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});
`);

write('global-setup.ts', `import fs from 'node:fs';

// Entry criteria: ${plan.healthPath ?? '(แผนไม่ได้ระบุ health endpoint — เช็กแค่ว่าหน้าแรกตอบ 2xx)'} ต้องตอบปกติ
// ล้างข้อมูลก่อนทดสอบ: ${plan.resetPath ? 'POST ' + plan.resetPath : '(แผนไม่ได้ระบุ)'}
// SKIP_RESET=1 → ไม่ reset (ใช้ตอน agent หลายตัวรัน test ของตัวเองพร้อมกัน จะได้ไม่ล้างข้อมูลของกัน)
const BASE = '${plan.baseURL}';
const HEALTH = ${JSON.stringify(plan.healthPath)};
const RESET = ${JSON.stringify(plan.resetPath)};

export default async function globalSetup() {
  const info: Record<string, unknown> = { baseURL: BASE, time: new Date().toISOString() };
  // path ที่ขึ้นต้นด้วย / นับจาก origin (เหมือนเบราว์เซอร์) · ไม่มี / นับต่อจาก baseURL
  const at = (p: string) => new URL(p, BASE.endsWith('/') ? BASE : BASE + '/').href;
  const res = await fetch(at(HEALTH ?? ''));
  const body = await res.text();
  let ok = res.ok;
  try { const j = JSON.parse(body); if (typeof j?.ok === 'boolean') ok = ok && j.ok; } catch {}
  info.health = { path: HEALTH ?? '/', status: res.status, body: body.slice(0, 200), ok };
  if (!ok) throw new Error(\`Entry criteria failed: \${HEALTH ?? '/'} → \${res.status} \${body.slice(0, 100)}\`);
  const skip = process.env.SKIP_RESET === '1';
  if (RESET && !skip) {
    const r = await fetch(at(RESET), { method: 'POST' });
    if (!r.ok) throw new Error('reset failed: ' + r.status);
    info.reset = { path: RESET, status: r.status };
  } else info.reset = skip ? 'skipped (SKIP_RESET=1)' : 'not in plan';
  // เก็บข้อมูลรอบทดสอบไว้ให้รายงาน — เฉพาะรอบรวม (agent รันเองไม่ทับ)
  if (!skip) { fs.mkdirSync('test-report', { recursive: true }); fs.writeFileSync('test-report/run-info.json', JSON.stringify(info, null, 2)); }
}
`);

write('tests/fixtures.ts', `import { test as base, expect, type Page } from '@playwright/test';

/** ค้างหน้าผลลัพธ์ไว้ตอนจบ test และเติมเวลาให้วิดีโอยาวอย่างน้อย ~6.5 วินาที → GIF ≥ 5 วินาที */
export const HOLD_MS = 2500;
export const MIN_VIDEO_MS = 6500;

export const test = base.extend<{ holdResult: void }>({
  holdResult: [async ({ page }, use) => {
    const started = Date.now();
    await use();
    const elapsed = Date.now() - started;
    await page.waitForTimeout(Math.max(HOLD_MS, MIN_VIDEO_MS - elapsed)).catch(() => {});
  }, { auto: true }],
});
export { expect, type Page };

/** "฿1,234" / "$1,234.50" → 1234 / 1234.5 */
export const money = (s: string | null) => Number((s ?? '').replace(/[^\\d.-]/g, ''));

/** แสดงหลักฐาน API บนหน้าจอ ให้ GIF ของ test API ไม่เป็นหน้าว่าง */
export async function showApiEvidence(page: Page, e: { title: string; method: string; url: string; status: number; expected: number | string; note?: string; request?: unknown; response?: unknown }) {
  const esc = (v: unknown) => String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 600).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const good = String(e.status) === String(e.expected);
  await page.setContent(\`<body style="margin:0;padding:24px;background:#111827;color:#f9fafb;font:18px system-ui,sans-serif">
    <h1 style="margin:0 0 12px">\${esc(e.title)}</h1>
    <p><b style="background:#2563eb;padding:4px 10px;border-radius:6px">\${esc(e.method)}</b> <code>\${esc(e.url)}</code></p>
    <p style="font-size:26px">Status: <b style="color:\${good ? '#22c55e' : '#ef4444'};font-size:40px">\${e.status}</b> (คาดหวัง \${esc(e.expected)})</p>
    \${e.note ? \`<p>\${esc(e.note)}</p>\` : ''}
    \${e.request !== undefined ? \`<p style="color:#9ca3af">Request body</p><pre style="white-space:pre-wrap;background:#1f2937;padding:12px;border-radius:8px">\${esc(e.request)}</pre>\` : ''}
    \${e.response !== undefined ? \`<p style="color:#9ca3af">Response body (ย่อ)</p><pre style="white-space:pre-wrap;background:#1f2937;padding:12px;border-radius:8px">\${esc(e.response)}</pre>\` : ''}
  </body>\`);
}
`);

// จอดู agent เป็นของสอน LAB 5 — สร้าง agent-log.sh เฉพาะเมื่อผู้ใช้ขอ (--agent-monitor)
if (process.argv.includes('--agent-monitor')) write('agent-log.sh', `#!/usr/bin/env bash
# ใช้: bash agent-log.sh START|END <agent-id> <โมดูล>  → เพิ่ม 1 บรรทัดใน test-report/agents.log
cd "$(dirname "$0")" && mkdir -p test-report && echo "$(date +%Y-%m-%dT%H:%M:%S) $1 $2 $3" >> test-report/agents.log
`);

fs.mkdirSync('scratch', { recursive: true });
fs.mkdirSync('test-report/gifs', { recursive: true });

// ติดตั้ง @playwright/test ถ้ายังไม่มี (ไม่โหลดเบราว์เซอร์)
if (!fs.existsSync('node_modules/@playwright/test')) {
  console.log('… npm i -D @playwright/test (ไม่โหลดเบราว์เซอร์)');
  execSync('npm i -D @playwright/test', { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
}
console.log('\nต่อไป: node <skill>/scripts/check-browser.mjs');
