# สเปกโครงโปรเจกต์ สมาชิก + ชำระเงิน

> สรุปจากโน้ตของมิว (4 โปรเจกต์: ShopDee 2025, FitPlus 2025, BaanRai 2026, DentDee 2026) + coding rules v2026.2

## Stack

TypeScript (strict) · Node.js 22 · Next.js 15 App Router · PostgreSQL 16 + Prisma · Zod · pino · Vitest (+ @vitest/coverage-v8) · Playwright สำหรับ E2E · BullMQ + Redis สำหรับคิว

เวอร์ชันที่ใช้ได้จริงล่าสุด (2026-11): next 15.5.x, react 19.3.x, zod 4.x, pino 9.x, prisma 6.19.x, typescript 5.9.x, vitest 3.2.x — ปักเวอร์ชันตรงตัว (ไม่ใช้ `^`)

scripts ใน package.json: `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:coverage`, `prisma:validate`, `prisma:migrate`

## โมดูลมาตรฐาน (ทุกโปรเจกต์มี)

| โมดูล | หน้าที่ |
|---|---|
| `auth` | สมัคร, login (อีเมล+รหัสผ่าน / OTP มือถือ), refresh, logout, reset password · hash รหัสด้วย scrypt |
| `member` | โปรไฟล์, ระดับสมาชิก (basic/silver/gold), consent PDPA เก็บ **เวอร์ชันของข้อความยินยอม** |
| `payment` | สร้างคำสั่งจ่าย, redirect ไป ThaiPay GW, รับ webhook, คืนเงิน |
| `notification` | อีเมล/SMS/LINE ผ่านคิว BullMQ (โครงเริ่มต้นใช้คิว in-memory ได้) |
| `audit` | บันทึกทุก action สำคัญ (ใคร ทำอะไร กับอะไร เมื่อไร) |

## โครงโฟลเดอร์

```
src/
  app/                       # Next.js App Router
    api/
      healthz/ readyz/
      auth/{register,login,refresh,logout}/route.ts
      members/me/route.ts
      payment/orders/route.ts
      payment/orders/[orderId]/{checkout,refund}/route.ts
      payment/result/[orderId]/route.ts   # ไม่ต้องมี session
      payment/webhook/route.ts
    payment/result/page.tsx               # หน้า callback อ่านผลจาก order_id
  modules/<module>/  index.ts service.ts repository.ts schema.ts errors.ts __tests__/
  lib/       logger.ts db.ts redis.ts queue.ts app-error.ts http.ts auth-cookie.ts clock.ts container.ts
  config/    env.ts                       # ตรวจ env ด้วย Zod
prisma/      schema.prisma  migrations/<timestamp>_init/migration.sql  migrations/migration_lock.toml
tests/       setup-env.ts  integration/checkout-token-expiry.test.ts  e2e/login.spec.ts checkout.spec.ts
.env.example .gitignore (node_modules .next coverage .env .env.local *.tsbuildinfo next-env.d.ts)
```

- `lib/container.ts` ประกอบ service ทุกตัวครั้งเดียว (เก็บใน `globalThis`) route เรียก `getContainer()`
- `lib/http.ts` มี `handleRoute` (ใส่ requestId, แปลง `AppError` → `{ error: { code, message } }`, error ไม่รู้จัก → 500 โดยไม่ส่ง stack), `parseJsonBody(request, schema)`, `requireUser(request, roles)`

## Environment variables (`.env.example` ต้องครบ)

```
NODE_ENV  LOG_LEVEL  APP_BASE_URL
DATABASE_URL  REDIS_URL
JWT_ACCESS_SECRET  JWT_REFRESH_SECRET        # ยาว ≥ 32 ตัว
JWT_ACCESS_TTL_SECONDS=900  REFRESH_TOKEN_TTL_DAYS=30
THAIPAY_MERCHANT_ID  THAIPAY_WEBHOOK_SECRET  THAIPAY_GATEWAY_URL
LINE_CHANNEL_TOKEN
```
7 ตัวที่ checklist บังคับ: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN` · คอมเมนต์อยู่บรรทัดแยกเสมอ

## ตารางฐานข้อมูล (snake_case พหูพจน์)

`users` · `refresh_tokens` (token_hash UNIQUE, family_id, revoked_at, used_at, expires_at) · `member_profiles` · `member_consents` (UNIQUE user_id + consent_version) · `orders` (amount_satang integer, status enum pending/paid/refunded) · `payment_events` (event_id UNIQUE, received_at, payload_hash) · `audit_logs`

## ประวัติโปรเจกต์ (ไว้อ้างอิง)

| โปรเจกต์ | ลูกค้า | ปี | บทเรียน |
|---|---|---|---|
| ShopDee Member | ช้อปดีมาร์ท | 2025 | บั๊ก token หลุดกลางจ่ายเงิน → `token-expiry-fix.md` |
| FitPlus Membership | ฟิตพลัสยิม | 2025 | ใช้ fix แล้ว ไม่เจออีก |
| BaanRai Loyalty | ร้านกาแฟบ้านไร่ 30 สาขา | 2026 | webhook ซ้ำ → `webhook-idempotency.md` |
| DentDee Clinic | คลินิกฟันดีเด่น | 2026 | จ่ายมัดจำนัดหมาย ขึ้นโครงเสร็จใน 1.5 วัน |
