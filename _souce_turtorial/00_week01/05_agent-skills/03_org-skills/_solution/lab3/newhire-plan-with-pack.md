# แผนขึ้นโปรเจกต์ ระบบสมาชิก + ชำระเงิน

> สถานะ: **แผนเท่านั้น ยังไม่มีโค้ด** · จัดทำ 2026-11-03
> อ้างอิง: skill `dev:project-scaffold` (scaffold-rules, team-standards = coding-rules v2026.2 + arch-standards v4, decisions)
> Stack: TypeScript · Node.js 22 · Next.js 15 (App Router) · PostgreSQL 16 + Prisma · BullMQ บน Redis · Vitest · Playwright · pino
> Gateway: ThaiPay GW

---

## 0. ต้องได้คำตอบก่อนเริ่ม (ยังไม่มี spec)

ในโฟลเดอร์ยังไม่มี spec ลูกค้า ข้อเหล่านี้ห้ามเดา — ถ้ายังไม่ได้คำตอบ จะใส่ค่าสมมติและจดลง `todos` ใน `scaffold.json` ว่า "ยืนยันกับลูกค้า"

| # | คำถาม | กระทบอะไร |
|---|---|---|
| 1 | ชื่อโปรเจกต์ (kebab-case ไม่เกิน 3 คำ) / ชื่อที่แสดงบนเว็บ / ชื่อลูกค้า | ชื่อ repo, DB `nvt_<name>_<env>` |
| 2 | แพ็กเกจและราคา (หน่วยสตางค์) · ราคาคงที่ หรือมีหลังบ้านแก้ราคา | คงที่ = `catalog.ts` · แก้ได้ = ตาราง `payment.packages` |
| 3 | วิธี login: อีเมล+รหัสอย่างเดียว หรือมี OTP มือถือ · ผู้ให้บริการ SMS | OTP ไม่อยู่ใน template, เป็นงานเพิ่ม |
| 4 | ต้องการ reset password / refund ผ่านระบบไหม | TODO ทั้งคู่ |
| 5 | ช่องทางแจ้งเตือน: อีเมล / SMS / LINE | provider จริงของ notification |
| 6 | เวอร์ชันข้อความยินยอม PDPA (`YYYY-MM-v1`) | ตาราง `member.consents` |
| 7 | ลูกค้าเป็นธนาคาร/สถาบันการเงินไหม | ต้อง deploy region ไทยเท่านั้น |

---

## 1. โครงโฟลเดอร์

Modular monolith 1 ตัว ฐานข้อมูลเดียว แยก schema ต่อโมดูล

```
work/
├── plan.md                  ← ไฟล์นี้
├── scaffold.json            ← config ที่อ่านมาจาก spec (ขั้นที่ 1)
├── SCAFFOLD-REPORT.md       ← สรุปส่งทีม (ขั้นที่ 5)
└── <name>/
    ├── src/
    │   ├── app/                         หน้าเว็บ + route handler (บางที่สุด: parse → requireUser → เรียก service)
    │   │   ├── api/auth/{register,login,refresh,logout}/route.ts
    │   │   ├── api/payment/checkout/route.ts          รับแค่ packageId
    │   │   ├── api/payment/webhook/route.ts           ThaiPay GW → HMAC → idempotent
    │   │   ├── api/payment/orders/[orderId]/route.ts  หน้า callback ใช้ดึงผล
    │   │   ├── login/  checkout/  payment/callback/
    │   │   ├── healthz/route.ts                       process ยังทำงาน
    │   │   └── readyz/route.ts                        เช็ก DB + Redis + คิว
    │   ├── modules/<m>/                 โค้ดธุรกิจ (กติกาข้อ 1)
    │   │   ├── index.ts                 public API ของโมดูล โมดูลอื่น import ผ่านไฟล์นี้เท่านั้น
    │   │   ├── service.ts               logic (เป้า coverage ≥ 80%)
    │   │   ├── repository.ts            Prisma เฉพาะตารางของโมดูลตัวเอง
    │   │   ├── schema.ts                Zod ของ input/output
    │   │   ├── errors.ts                error class ของโมดูล (extend AppError)
    │   │   └── __tests__/service.test.ts
    │   ├── lib/
    │   │   ├── app-error.ts  http.ts (route(), requireUser(), รูปแบบ response)
    │   │   ├── logger.ts (pino + redact)  db.ts  redis.ts  queue.ts
    │   │   └── client/auth-client.ts    จัดการ access token ฝั่ง browser
    │   ├── config/env.ts                ตรวจ env ทั้งหมดด้วย Zod ตอนบูต
    │   └── workers/main.ts              worker BullMQ: payment.paid, notification.requested
    ├── prisma/schema.prisma + migrations/
    ├── tests/e2e/{login,checkout}.spec.ts helpers.ts
    ├── docs/architecture.md             C4 ระดับ 1–2 (Mermaid) · docs/adr/ เมื่อต้องเบี่ยงจากมาตรฐาน
    ├── .env.example  .gitignore  package.json  tsconfig.json (strict)
    └── vitest.config.ts  playwright.config.ts  next.config.ts
```

ตั้งชื่อ: ไฟล์ kebab-case · ตัวแปร camelCase · type PascalCase · ค่าคงที่ UPPER_SNAKE · ตาราง/คอลัมน์ snake_case พหูพจน์ (ใช้ `@@map`/`@map`) · ฟังก์ชันขึ้นต้นด้วยกริยา · event `<domain>.<event>` อดีตกาล · env มีแค่ `dev` `uat` `prod`

---

## 2. โมดูล

| โมดูล | DB schema / ตาราง | หน้าที่ | ใน template | งานเพิ่มตาม spec |
|---|---|---|---|---|
| `auth` | `auth.users`, `auth.refresh_tokens` | สมัคร, login, refresh (หมุน), logout | มี | OTP มือถือ, reset password |
| `member` | `member.members`, `member.consents` | โปรไฟล์, ระดับสมาชิก, consent PDPA พร้อมเวอร์ชัน | มี | ฟิลด์โปรไฟล์ตาม spec |
| `payment` | `payment.orders`, `payment.payment_events` | สร้าง order, redirect ไป gateway, รับ webhook, ดูสถานะ | มี | refund API, ตาราง packages (ถ้าแก้ราคาได้) |
| `notification` | — (คิว) | ส่งอีเมล/SMS/LINE ผ่าน BullMQ | มีคิว + worker | ต่อ provider จริง |
| `audit` | `audit.audit_logs` | บันทึก ใคร ทำอะไร เมื่อไร | มี | action เพิ่มตาม spec |

กติกาข้ามโมดูล
- เรียกกันผ่าน `index.ts` เท่านั้น ห้ามอ่านตารางของโมดูลอื่นตรง ๆ (check.mjs ตรวจ import ให้)
- ทางที่ข้อมูลไหลหลัก: `payment` (webhook) → คิว `payment.paid` → worker → `member` (อัปเดตระดับ/สิทธิ์) + `notification` + `audit`
- job ในคิวส่งแค่ `memberId` / `orderId` ห้ามใส่อีเมลหรือเบอร์ worker ไปดึงเอง (ลดข้อมูลส่วนบุคคลใน Redis)
- ทุก job idempotent · retry แบบ exponential ไม่เกิน 5 ครั้ง · ล้มครบ → dead-letter + แจ้งเตือน
- Redis ทุก key ต้องมี TTL · เบอร์/เลขบัตร เก็บแบบเข้ารหัสหรือ hash

---

## 3. การจัดการ token

> บั๊กเดิมที่ต้องกัน (ShopDee 2025): token หมดตอนผู้ใช้อยู่หน้า gateway → กลับมาโดนเด้งไป login, ตะกร้าหาย, บางคนจ่ายซ้ำ (ต้องคืนเงิน 37 รายการ)
> ต้นเหตุ: access 60 นาที + refresh 30 วันไม่หมุน, client ไม่ refresh ก่อนไป gateway, callback ผูกกับ session

### 3.1 ฝั่ง server
| เรื่อง | ค่า / วิธี |
|---|---|
| Access token | JWT อายุ **15 นาที** (`JWT_ACCESS_SECRET`) ส่งใน body ของ response |
| Refresh token | **หมุนทุกครั้งที่ใช้** · DB เก็บแค่ **hash** · มี `family` ผูกทุกตัวที่หมุนต่อกันมา |
| Reuse detection | ถ้ามีคนใช้ refresh ที่ถูกหมุนไปแล้ว → **revoke ทั้ง family** + audit `auth.refresh_reused` |
| Cookie | `httpOnly; Secure; SameSite=Lax; Path=/api/auth` (ไม่ส่ง cookie ไปทุก request) |
| Logout | revoke family + ล้าง cookie |
| Grace window | **ไม่มี** (ตามมาตรฐาน) ถ้าลูกค้าบ่นว่าหลุดบ่อย ต้องเขียน ADR และให้ `dev-pond` อนุมัติก่อน |

### 3.2 ฝั่ง client (`src/lib/client/auth-client.ts`)
- เก็บ access token ไว้ใน **หน่วยความจำ** ไม่ใช้ localStorage (กัน XSS) → ตอน mount เรียก `refreshNow()` 1 ครั้ง
- ตั้ง timer refresh ล่วงหน้า = **`min(60 วิ, ครึ่งอายุ token)`** — ถ้าใช้ 60 วิตรง ๆ ตอน TTL 5 วิ จะ refresh วนไม่หยุด
- หลายแท็บ: ใช้ `navigator.locks` ให้ refresh ได้ทีละแท็บ
- `goToGateway()`: **refresh ก่อน redirect ทุกครั้ง → หยุด timer → แล้วค่อย redirect**
  (ถ้า refresh โดนตัดกลางทางตอนเปลี่ยนหน้า server หมุน token ไปแล้วแต่ browser ไม่ได้ cookie ใหม่ ครั้งต่อไปจะนับเป็น reuse แล้วทั้ง family โดน revoke = บั๊กเดิมกลับมา)

### 3.3 Flow ชำระเงิน
1. `/checkout` → POST `/api/payment/checkout` ส่ง **แค่ `packageId`** — server เป็นคนดูราคาจาก catalog (ไม่รับราคาจาก client)
2. ได้ order `pending` + URL gateway → `goToGateway()`
3. ผู้ใช้อยู่หน้า gateway นานได้ (QR/OTP) — token หมดก็ไม่เป็นไร
4. กลับมา `/payment/callback?order_id=…` → ดึงผลจาก `order_id` **โดยไม่ต้องมี session** → แล้วค่อยกู้ session จาก refresh cookie ตะกร้าไม่หาย

### 3.4 Webhook (BaanRai 2026: webhook ซ้ำ 3 ครั้ง → แต้มเพิ่มซ้ำ)
ลำดับใน `POST /api/payment/webhook`:
1. ตรวจ **HMAC-SHA256** ของ raw body กับ header `x-thaipay-signature` ด้วย `THAIPAY_WEBHOOK_SECRET` เทียบด้วย `timingSafeEqual` → ไม่ผ่าน = 401
2. Zod ตรวจ payload (`event_id`, `type`, `order_id`, `amount_satang`)
3. **INSERT `payment_events` ก่อน** (`event_id` UNIQUE) → ชน unique = ตอบ 200 แล้วจบ
4. ตรวจยอดตรงกับ order (กันยอดถูกแก้)
5. เปลี่ยนสถานะแบบมีเงื่อนไข `UPDATE … WHERE status = 'pending'` — สถานะไปทางเดียว `pending → paid → refunded`
6. enqueue `payment.paid` (jobId = event_id) แล้ว **ตอบ 200 ภายใน 3 วินาที**

---

## 4. การจัดการ error

- `src/lib/app-error.ts`: `AppError { code, httpStatus, message }` · แต่ละโมดูลประกาศ error ของตัวเองใน `errors.ts`
  ตัวอย่าง: `InvalidCredentialsError` (401), `RefreshTokenReusedError` (401), `PackageNotFoundError` (404), `InvalidWebhookSignatureError` (401), `AmountMismatchError` (409), `InvalidOrderTransitionError` (409)
- **ห้าม** `throw new Error(...)` ลอย ๆ · **ห้าม** catch แล้วเงียบ (catch ต้อง log หรือแปลงเป็น AppError แล้ว throw ต่อ)
- `route()` ใน `lib/http.ts` ครอบทุก handler:
  - สำเร็จ → `{ data }`
  - `AppError` → `{ error: { code, message } }` ข้อความแปลแล้ว ไม่มี stack และไม่มีรายละเอียดภายใน
  - `ZodError` → 400 `VALIDATION_ERROR`
  - อื่น ๆ → 500 `INTERNAL_ERROR` + log ระดับ error พร้อม requestId
- ทุก input (body, query, API ภายนอก, env) ผ่าน Zod · ตรวจ role ด้วย `requireUser()` **ก่อน** เรียก service
- Log: JSON ผ่าน pino เท่านั้น (ห้าม `console.log`) ทุกบรรทัดมี `level, time, module, requestId, msg` · redact รหัสผ่าน, token, เลขบัตร, เบอร์เต็ม
- env ผิดหรือขาด → `config/env.ts` ล้มตั้งแต่บูต ไม่ปล่อยให้ไปพังกลางทาง
- คิว: retry exponential ไม่เกิน 5 → dead-letter + alert
- Observability: request rate, error rate, p95, queue depth, DB connections (OpenTelemetry) · alert error > 2% นาน 5 นาที, p95 > 2 วิ, คิวค้าง > 1,000, TLS cert หมดภายใน 21 วัน

---

## 5. การทดสอบ

### 5.1 Unit (Vitest) — `service.ts` ต้อง ≥ 80% บรรทัด (ตั้ง threshold ใน vitest.config)
| โมดูล | เคสหลัก |
|---|---|
| auth | สมัครอีเมลซ้ำ · login ผิด/ถูก · refresh หมุนแล้วตัวเก่าใช้ไม่ได้ · **ใช้ตัวเก่าซ้ำ → revoke ทั้ง family** · logout · DB เก็บเป็น hash |
| payment | checkout ด้วย packageId ที่ไม่มี · ราคามาจาก catalog · HMAC ผิด → ปฏิเสธ · **webhook ซ้ำ → ประมวลผลครั้งเดียว** · ยอดไม่ตรง → ปฏิเสธ · สถานะถอยหลังไม่ได้ |
| member | สร้างโปรไฟล์ · บันทึก consent พร้อมเวอร์ชัน · เปลี่ยนระดับ |
| notification | enqueue ด้วย memberId (ไม่มีอีเมล/เบอร์ใน job) · jobId ซ้ำไม่ส่งซ้ำ |
| audit | บันทึก actor/action/เวลา ครบ |

### 5.2 E2E (Playwright) — port 3100, `reuseExistingServer: false`
- `login.spec.ts`: สมัคร → login → เปิดหน้าใหม่ยังอยู่ในระบบ (refresh ตอน mount)
- `checkout.spec.ts` **(หัวใจ)**: ตั้ง `ACCESS_TOKEN_TTL_SEC=5` → checkout → รอเกิน 5 วิที่หน้า gateway → จ่าย → ต้องเห็น **"ชำระเงินสำเร็จ"** และไม่เด้งไป login
- E2E ล้ม **ห้ามแก้ test ให้ผ่าน** → ดู `test-results/*/error-context.md` และ `audit.audit_logs` (ถ้า `auth.refresh_reused` > 0 แปลว่า client ใช้ token ซ้ำ)

### 5.3 ตรวจอื่น
- `check.mjs` (static ตาม coding-rules) · `tsc --noEmit` · `next build`
- `prisma migrate dev --name init` ผ่านบน Postgres 16 ชั่วคราว
- `/healthz` และ `/readyz` ตอบ 200
- DB/Redis สำหรับทดสอบ: container ชั่วคราว bind `127.0.0.1` พอร์ต 55432 / 56379 (เช็ก `docker ps` ก่อนว่าไม่ชน) และ `docker stop` เมื่อเสร็จ
- ข้อมูลทดสอบ/seed ใช้อีเมล `@example.com` และชื่อสมมติเท่านั้น

---

## 6. ขั้นตอนลงมือ (เมื่อพร้อมเขียนโค้ด)

| ขั้น | ทำอะไร | ได้อะไร |
|---|---|---|
| 1 | ได้คำตอบข้อ 0 → เขียน `work/scaffold.json` | config |
| 2 | `scaffold.mjs --config work/scaffold.json --out work/<name>` | โครง 5 โมดูล |
| 3 | `check.mjs work/<name>` ต้องผ่านทุกข้อ | static ผ่าน |
| 4 | `npm install` → `tsc` → `vitest --coverage` → ขึ้น DB/Redis → migrate → Playwright → build | test ผ่านจริง |
| 5 | เขียน `SCAFFOLD-REPORT.md` | ส่งทีม |
| ต่อจากนั้น | `coding-standard` (รีวิว 10 ข้อ ต่ำกว่า 8 ห้าม merge) → `test-from-plan` → `deploy-checklist` | |

อ้างอิงเวลา: DentDee ใช้ 1.5 วันในการขึ้นโครงตอนที่ยังไม่มี skill · ครั้งนี้มี template แล้ว คาดว่าขั้น 2–4 เสร็จภายในวันเดียว ที่เหลือคืองานเพิ่มตาม spec (OTP, refund, provider)

## 7. Checklist ก่อนส่งทีม
- [ ] `.env.example` ครบ: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN` (ค่าตัวอย่างเท่านั้น ห้ามใส่ความลับจริง · `.env` อยู่ใน `.gitignore`)
- [ ] migration แรกผ่าน และ commit `prisma/migrations/`
- [ ] unit auth + payment ผ่าน, coverage service ≥ 80%, E2E checkout ผ่าน
- [ ] `/healthz`, `/readyz` ตอบ 200
- [ ] ผ่าน coding-rules 10 ข้อ
- [ ] ยังมีของกันบั๊กเดิมครบ: access 15 นาที · refresh หมุน + reuse detection · refresh ก่อนไป gateway · callback อ่านจาก `order_id` · `payment_events` unique · HMAC · สถานะไปทางเดียว · checkout รับแค่ `packageId`
