#!/usr/bin/env node
// ตรวจโครงที่สร้างแล้วตาม "เช็กก่อนส่งโครงให้ทีม" + coding-rules ที่ตรวจแบบ static ได้
// ใช้: node check.mjs <โฟลเดอร์โปรเจกต์> [--json]   (exit 1 ถ้ามีข้อไม่ผ่าน)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const MODULES = ['auth', 'member', 'payment', 'notification', 'audit'];
const MODULE_FILES = ['index.ts', 'service.ts', 'repository.ts', 'schema.ts', 'errors.ts'];
const ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'THAIPAY_MERCHANT_ID',
  'THAIPAY_WEBHOOK_SECRET',
  'LINE_CHANNEL_TOKEN',
];

const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
function files(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((e) => {
    const full = join(abs, e);
    return statSync(full).isDirectory() ? files(relative(root, full)) : [relative(root, full)];
  });
}

const results = [];
function check(rule, name, ok, detail = '') {
  results.push({ rule, name, ok: Boolean(ok), detail });
}

const src = files('src').filter((f) => /\.(ts|tsx)$/.test(f));
const srcText = Object.fromEntries(src.map((f) => [f, read(f)]));
const offenders = (re) => src.filter((f) => re.test(srcText[f]));

// โครงโฟลเดอร์ (coding-rules 1)
for (const m of MODULES) {
  const missing = MODULE_FILES.filter((f) => !existsSync(join(root, 'src/modules', m, f)));
  const tests = files(`src/modules/${m}/__tests__`).filter((f) => f.endsWith('.test.ts'));
  check('rule 1', `โมดูล ${m} ครบไฟล์ + มี test`, missing.length === 0 && tests.length > 0, missing.join(', '));
}

// ห้าม import ไฟล์ภายในของโมดูลอื่น (coding-rules 1)
const crossImports = src.flatMap((f) =>
  [...srcText[f].matchAll(/from '@\/modules\/([a-z-]+)\/([^']+)'/g)]
    .filter(([, mod]) => !f.split(sep).join('/').startsWith(`src/modules/${mod}/`))
    .map(([s]) => `${f}: ${s}`),
);
check('rule 1', 'import ข้ามโมดูลผ่าน index.ts เท่านั้น', crossImports.length === 0, crossImports.join('; '));

// TypeScript strict / ห้าม any (coding-rules 3)
check('rule 3', 'tsconfig strict: true', /"strict":\s*true/.test(read('tsconfig.json')));
const anyUse = offenders(/(:\s*any\b|as any\b|<any>)/);
check('rule 3', 'ไม่มี any', anyUse.length === 0, anyUse.join(', '));

// error มี type (coding-rules 4)
// test จำลอง error จาก DB ได้ จึงไม่นับ __tests__
const bareErrors = offenders(/throw new Error\(/).filter((f) => !f.includes('__tests__'));
check('rule 4', 'ไม่มี throw new Error ลอย ๆ', bareErrors.length === 0, bareErrors.join(', '));

// ความลับ (coding-rules 5)
const envExample = read('.env.example');
const missingEnv = ENV_VARS.filter((v) => !new RegExp(`^${v}=`, 'm').test(envExample));
check('rule 5', '.env.example ครบตัวแปร', missingEnv.length === 0, missingEnv.join(', '));
check('rule 5', '.gitignore กัน .env', /^\.env$/m.test(read('.gitignore')));
check('rule 5', 'คอมเมนต์ใน .env.example ไม่ต่อท้ายค่า', !/^[A-Z_]+=\S*[ \t]+#/m.test(envExample));

// test (coding-rules 6)
check('rule 6', 'E2E login + checkout', existsSync(join(root, 'tests/e2e/login.spec.ts')) && existsSync(join(root, 'tests/e2e/checkout.spec.ts')));
check('rule 6', 'coverage threshold 80% ใน vitest.config', /lines:\s*80/.test(read('vitest.config.ts')));

// migration (coding-rules 7)
check('rule 7', 'มี prisma/schema.prisma', read('prisma/schema.prisma').includes('datasource db'));

// log (coding-rules 8)
const consoleUse = offenders(/console\.(log|info|debug)\(/);
check('rule 8', 'ไม่มี console.log ใน src', consoleUse.length === 0, consoleUse.join(', '));
check('rule 8', 'pino มี redact', /redact/.test(read('src/lib/logger.ts')));

// token (coding-rules 9 — บั๊ก ShopDee 2025)
const authService = read('src/modules/auth/service.ts');
check('rule 9', 'access token 15 นาที', /ACCESS_TOKEN_TTL_SEC = 15 \* 60/.test(authService));
check('rule 9', 'refresh หมุน + reuse detection', /markUsed/.test(authService) && /revokeFamily/.test(authService));
check('rule 9', 'cookie httpOnly; Secure; SameSite=Lax', /HttpOnly; Secure; SameSite=Lax/.test(read('src/modules/auth/index.ts')));
const client = read('src/lib/client/auth-client.ts');
check('rule 9', 'client refresh ล่วงหน้า 60 วิ + ก่อนไป gateway', /REFRESH_LEEWAY_MS = 60_000/.test(client) && /goToGateway[\s\S]*refreshNow/.test(client));
check('rule 9', 'callback อ่านผลจาก order_id', existsSync(join(root, 'src/app/api/payment/orders/[orderId]/route.ts')));
check('rule 9', 'E2E ตั้ง access 5 วินาที', /ACCESS_TOKEN_TTL_SEC: '5'/.test(read('playwright.config.ts')));

// API + webhook (coding-rules 10 — BaanRai 2026)
check('rule 10', 'ตอบ { data } / { error: { code, message } }', /\{ data \}/.test(read('src/lib/http.ts')) && /error: \{ code, message \}/.test(read('src/lib/http.ts')));
const pay = read('src/modules/payment/service.ts');
check('rule 10', 'webhook ตรวจ HMAC + idempotent', /timingSafeEqual/.test(pay) && /insertIfNew/.test(pay) && /event_id/.test(read('prisma/schema.prisma')));
check('rule 10', 'สถานะ order ทางเดียว', /pending: \['paid'\]/.test(pay) && /refunded: \[\]/.test(pay));

// ส่งทีม
check('handoff', '/healthz + /readyz', existsSync(join(root, 'src/app/healthz/route.ts')) && existsSync(join(root, 'src/app/readyz/route.ts')));
const leftovers = [...src, 'README.md', 'package.json', 'prisma/schema.prisma', '.env.example', 'tests/e2e/helpers.ts']
  .filter((f) => /__[A-Z_]{3,}__/.test(read(f)));
check('handoff', 'ไม่เหลือ placeholder __XXX__', leftovers.length === 0, leftovers.join(', '));

const failed = results.filter((r) => !r.ok);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ root, passed: results.length - failed.length, total: results.length, results }, null, 2));
} else {
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} [${r.rule}] ${r.name}${r.ok || !r.detail ? '' : ` — ${r.detail}`}`);
  console.log(`\nผ่าน ${results.length - failed.length}/${results.length}`);
}
process.exit(failed.length ? 1 : 0);
