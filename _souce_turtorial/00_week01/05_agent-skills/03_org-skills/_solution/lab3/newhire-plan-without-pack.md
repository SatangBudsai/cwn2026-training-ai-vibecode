# แผนขึ้นโปรเจกต์: ระบบสมาชิก + ชำระเงิน

> สถานะ: ร่างแรก (วันที่ 2026-11-03) ยังไม่มีโค้ด
> โฟลเดอร์โปรเจกต์ตอนนี้ว่างอยู่ จึงยังไม่มี stack หรือข้อกำหนดเดิมให้ยึด แผนนี้เลยตั้งสมมติฐานไว้ก่อน (ดูหัวข้อ 0) **ต้องคอนเฟิร์มกับทีม/หัวหน้าก่อนเริ่มเขียนโค้ด**

---

## 0. สมมติฐานและคำถามที่ต้องถามทีม

| เรื่อง | สมมติฐานในแผนนี้ | ต้องถาม |
|---|---|---|
| ภาษา/เฟรมเวิร์ก | TypeScript + Node.js 22 + Fastify (หรือ NestJS ถ้าทีมใช้อยู่) | ทีมมี stack มาตรฐานไหม |
| ฐานข้อมูล | PostgreSQL 16 + Prisma (หรือ Drizzle) | มี DB กลางหรือ migration tool ที่ใช้อยู่ไหม |
| Cache/คิว | Redis (rate limit, คิว job ผ่าน BullMQ) | มี infra ให้แล้วหรือไม่ |
| ผู้ให้บริการชำระเงิน | ทำเป็น adapter รองรับหลายเจ้า เริ่มจากเจ้าเดียว (เช่น Omise / 2C2P / Stripe) | สัญญาจริงใช้เจ้าไหน ต้องรองรับ PromptPay QR และบัตรไหม |
| รูปแบบการเก็บเงิน | ซื้อครั้งเดียว + สมัครสมาชิกรายเดือน (subscription) | มี subscription จริงไหม มีคืนเงิน/คูปองไหม |
| Client | Web (SPA) + อาจมี mobile app | มี mobile ไหม (มีผลกับวิธีเก็บ token) |
| Compliance | **ไม่เก็บเลขบัตรเอง** ใช้ tokenization ของ provider → อยู่ใน PCI DSS SAQ-A, ทำตาม PDPA | ฝ่าย legal/security มีข้อกำหนดเพิ่มไหม |
| Deploy | Docker + CI (GitHub Actions) | ปลายทาง deploy ที่ไหน (k8s / cloud run / VM) |

---

## 1. โครงโฟลเดอร์

```
.
├─ src/
│  ├─ main.ts                 # bootstrap server
│  ├─ app.ts                  # ประกอบ plugin/โมดูลทั้งหมด
│  ├─ config/                 # อ่าน env + validate ด้วย schema (zod) ล้มทันทีถ้า env ขาด
│  ├─ shared/
│  │  ├─ errors/              # AppError, error codes, error handler กลาง
│  │  ├─ http/                # middleware: request-id, auth guard, rate limit
│  │  ├─ logger/              # structured log (pino) + ซ่อนข้อมูลลับ
│  │  ├─ db/                  # prisma client, transaction helper
│  │  └─ utils/               # money (หน่วยสตางค์), clock, id
│  ├─ modules/
│  │  ├─ auth/                # login, logout, refresh, token service
│  │  ├─ users/               # สมัคร, โปรไฟล์, ยืนยันอีเมล, รีเซ็ตรหัสผ่าน
│  │  ├─ plans/               # แพ็กเกจ/ราคา (catalog)
│  │  ├─ subscriptions/       # สถานะสมาชิก, ต่ออายุ, ยกเลิก
│  │  ├─ payments/            # สร้างรายการชำระ, state machine, คืนเงิน
│  │  │  └─ providers/        # adapter ต่อผู้ให้บริการ (interface + implement ราย provider + fake)
│  │  ├─ webhooks/            # รับ webhook จาก provider, ตรวจลายเซ็น, กันซ้ำ
│  │  └─ audit/               # บันทึกเหตุการณ์สำคัญ (login, จ่ายเงิน, เปลี่ยนสิทธิ์)
│  └─ jobs/                   # งานเบื้องหลัง: ต่ออายุ, reconcile, ส่งอีเมล, outbox
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ test/
│  ├─ unit/                   # (หรือวาง *.spec.ts ข้างไฟล์ต้นทาง)
│  ├─ integration/
│  ├─ e2e/
│  └─ fixtures/               # payload webhook ตัวอย่าง, factory ข้อมูลทดสอบ
├─ docs/
│  ├─ adr/                    # Architecture Decision Records
│  └─ api/                    # OpenAPI spec
├─ docker-compose.yml         # postgres, redis, mailpit สำหรับ dev
├─ .env.example               # ไม่มีค่าจริง
└─ work/plan.md               # ไฟล์นี้
```

หลักการ: แต่ละโมดูลแบ่งชั้น `routes → service → repository` โมดูลเรียกกันผ่าน service ที่ export ออกมาเท่านั้น ห้าม query ตารางของโมดูลอื่นตรงๆ

---

## 2. โมดูลและหน้าที่

### 2.1 users
- สมัคร: email + password, ยืนยันอีเมลด้วยลิงก์ (token ใช้ครั้งเดียว อายุ 24 ชม.)
- รีเซ็ตรหัสผ่าน: token ใช้ครั้งเดียว อายุ 30 นาที, ตอบแบบเดียวกันเสมอไม่ว่าอีเมลมีอยู่จริงหรือไม่ (กันการเดาว่าอีเมลไหนเป็นสมาชิก)
- hash รหัสผ่านด้วย **argon2id**
- PDPA: เก็บ consent, ลบหรือ anonymize บัญชีได้เมื่อผู้ใช้ขอ

### 2.2 auth
- login / logout / refresh / logout ทุกอุปกรณ์
- rate limit + หน่วงเวลาเมื่อ login ผิดซ้ำ (ต่อ IP และต่อบัญชี)
- เผื่อไว้สำหรับ MFA (TOTP) ในเฟสหลัง
- รายละเอียด token อยู่ในหัวข้อ 3

### 2.3 plans
- แพ็กเกจ, ราคา, รอบบิล, เก็บเงินเป็น **จำนวนเต็มหน่วยสตางค์** + สกุลเงิน (ห้ามใช้ float)
- ราคาที่ผูกกับ subscription แล้วต้องไม่เปลี่ยนย้อนหลัง (เก็บเป็น version)

### 2.4 subscriptions
- สถานะ: `trialing → active → past_due → canceled / expired`
- ผูกสิทธิ์ (entitlement) กับสถานะ ให้โค้ดส่วนอื่นเช็คผ่าน `hasAccess(userId, feature)` เท่านั้น
- job ต่ออายุ + เก็บเงินซ้ำเมื่อล้มเหลว (dunning) ตามช่วงเวลาที่กำหนด

### 2.5 payments
- state machine: `pending → requires_action → succeeded | failed | canceled`, `succeeded → refunded / partially_refunded`
- **ยอดเงินคำนวณฝั่ง server เสมอ** จาก plan ห้ามรับยอดจาก client
- ทุกคำสั่งที่สร้างหรือเปลี่ยนรายการเงินต้องมี **Idempotency-Key** (เก็บใน DB พร้อม response เดิม ถ้าส่งซ้ำให้คืนผลเดิม)
- บันทึกเงินแบบ append-only (ledger) ไม่ UPDATE ยอดทับ
- `PaymentProvider` interface: `createCharge`, `getCharge`, `refund`, `verifyWebhook` → มี implement จริง + `FakeProvider` สำหรับ dev/test

### 2.6 webhooks
- ตรวจลายเซ็นด้วย raw body + secret และเช็ค timestamp กัน replay
- เก็บ `event_id` ไว้กันประมวลผลซ้ำ (provider ส่งซ้ำได้เสมอ)
- ตอบ 2xx เร็วๆ แล้วไปประมวลผลในคิว
- **ยึดสถานะจาก provider** ไม่เชื่อ redirect หรือ callback ฝั่ง client ว่า "จ่ายแล้ว"
- job reconcile รายวัน: เทียบรายการกับ API ของ provider หาอันที่สถานะไม่ตรง

### 2.7 audit
- บันทึก: login สำเร็จ/ล้มเหลว, เปลี่ยนรหัสผ่าน, ชำระเงิน, คืนเงิน, เปลี่ยนสิทธิ์
- ห้ามบันทึก password, token หรือข้อมูลบัตร

---

## 3. การจัดการ Token

| Token | รูปแบบ | อายุ | เก็บที่ client | เก็บที่ server |
|---|---|---|---|---|
| Access token | JWT ลงชื่อด้วย **EdDSA หรือ RS256** (มี `kid` เพื่อหมุน key ได้) | 10–15 นาที | หน่วยความจำ (ตัวแปรใน JS) | ไม่เก็บ (stateless) |
| Refresh token | ค่าสุ่ม opaque 256 บิต | 30 วัน (sliding) + อายุสูงสุดตายตัว | cookie `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh` (mobile: secure storage ของ OS) | เก็บ **hash (SHA-256)** ใน DB พร้อม `family_id`, device, หมดอายุ |
| ยืนยันอีเมล / รีเซ็ตรหัสผ่าน | ค่าสุ่ม opaque | 24 ชม. / 30 นาที | ในลิงก์ | เก็บ hash ใช้ได้ครั้งเดียว |

กติกา:
1. **Refresh token rotation**: ทุกครั้งที่ refresh ให้ออก token ใหม่และยกเลิกตัวเก่า
2. **ตรวจจับ token ถูกขโมย**: ถ้ามีคนใช้ refresh token ที่ถูกหมุนไปแล้ว ให้ยกเลิกทั้ง family และบังคับ login ใหม่ พร้อมบันทึก audit
3. Claim ใน JWT ใส่เท่าที่จำเป็น: `sub`, `iat`, `exp`, `iss`, `aud`, `jti`, `ver`, `scope` ห้ามใส่ข้อมูลส่วนตัว
4. ตอน verify ต้องเช็ค `alg` แบบ allowlist (ห้าม `none`), `iss`, `aud`, `exp` และยอมคลาดเวลาไม่เกิน 30 วินาที
5. Logout ทุกอุปกรณ์ / เปลี่ยนรหัสผ่าน → เพิ่ม `token_version` ของ user แล้วเช็คกับ `ver` ใน JWT (cache ใน Redis) และลบ refresh token ทั้งหมด
6. Private key อยู่ใน secret manager ห้ามอยู่ใน repo มีขั้นตอนหมุน key (เผยแพร่ JWKS ทั้ง key เก่าและใหม่ช่วงเปลี่ยนผ่าน)
7. ใช้ cookie แล้วต้องกัน CSRF: SameSite=Strict + ตรวจ `Origin` บน endpoint refresh
8. ห้าม log token ทุกชนิด ให้ logger ซ่อน header `Authorization`, `Cookie` อัตโนมัติ

---

## 4. การจัดการ Error

### 4.1 รูปแบบ response (RFC 9457 Problem Details)
```json
{
  "type": "https://errors.example.com/payment/card-declined",
  "title": "Card declined",
  "status": 402,
  "code": "PAYMENT_CARD_DECLINED",
  "detail": "ธนาคารปฏิเสธรายการ",
  "requestId": "01J..."
}
```
- `code` คงที่ เอาไว้ให้ client ใช้ตัดสินใจ (ห้ามให้ client parse ข้อความ)
- ทุก response มี `requestId` (มาจาก header `X-Request-Id`) เพื่อตามหาใน log ได้

### 4.2 ประเภท error
| คลาส | HTTP | ตัวอย่าง code |
|---|---|---|
| ValidationError | 400 / 422 | `VALIDATION_FAILED` (มีรายการ field ที่ผิด) |
| AuthenticationError | 401 | `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED` |
| AuthorizationError | 403 | `FORBIDDEN`, `SUBSCRIPTION_REQUIRED` |
| NotFoundError | 404 | `USER_NOT_FOUND` |
| ConflictError | 409 | `EMAIL_TAKEN`, `IDEMPOTENCY_KEY_REUSED` |
| PaymentError | 402 | `PAYMENT_CARD_DECLINED`, `PAYMENT_INSUFFICIENT_FUNDS` |
| RateLimitError | 429 | `RATE_LIMITED` (+ `Retry-After`) |
| ProviderError | 502 / 503 | `PAYMENT_PROVIDER_UNAVAILABLE` |
| Unexpected | 500 | `INTERNAL_ERROR` (ไม่บอกรายละเอียดภายใน) |

### 4.3 กติกา
- โยน `AppError` ที่มี code จาก service แล้วให้ error handler กลางแปลงเป็น HTTP ที่เดียว
- error ที่ไม่คาดคิด → log พร้อม stack (ฝั่ง server เท่านั้น) แล้วส่งไป Sentry หรือเครื่องมือที่ทีมใช้ ส่วน client ได้แค่ 500 ทั่วไป
- login ผิดตอบข้อความเดียวกันทุกกรณี ไม่บอกว่าผิดที่อีเมลหรือรหัสผ่าน
- **เรียก provider ภายนอก**: ตั้ง timeout, retry แบบ exponential backoff เฉพาะ error ที่ retry ได้ และส่ง idempotency key ไปที่ provider ด้วยทุกครั้ง
- **กรณีไม่รู้ผล** (timeout ตอนตัดเงิน): ห้ามสรุปว่าล้มเหลว ให้ตั้งสถานะเป็น `pending` แล้วรอ webhook หรือ reconcile มาตัดสิน
- การเปลี่ยนสถานะเงินกับ DB ต้องอยู่ใน transaction เดียวกัน ส่วน side effect (อีเมล, event) ใช้ **outbox pattern**

---

## 5. การทดสอบ

| ระดับ | เครื่องมือ | ครอบคลุมอะไร |
|---|---|---|
| Unit | Vitest | token service, state machine ของ payment/subscription, การคำนวณเงิน, validation |
| Integration | Vitest + Testcontainers (Postgres, Redis จริง) | repository, transaction, idempotency, refresh rotation + reuse detection |
| Contract | fixture webhook จริงจาก sandbox ของ provider | ตรวจลายเซ็น, parse payload, กันส่งซ้ำ, event มาไม่เรียงลำดับ |
| E2E (API) | Supertest/Playwright API + FakeProvider | สมัคร → ยืนยันอีเมล → login → ซื้อแพ็กเกจ → webhook → ได้สิทธิ์ → ยกเลิก |
| Sandbox | sandbox ของ provider (รันตาม schedule ไม่ทุก PR) | flow จริงกับ provider, 3DS, บัตรถูกปฏิเสธ |
| Security | lint กฎ security, `npm audit`/Dependabot, secret scan (gitleaks), OWASP ZAP baseline | dependency, secret ที่หลุด, ช่องโหว่พื้นฐาน |

เคสที่**ต้องมี**:
- Token: หมดอายุ, ลายเซ็นผิด, `alg=none`, `aud` ผิด, ใช้ refresh token เก่าซ้ำแล้วโดนยกเลิกทั้ง family, logout ทุกอุปกรณ์แล้ว access token เดิมใช้ไม่ได้
- Payment: กดจ่ายซ้ำด้วย idempotency key เดิมแล้วตัดเงินครั้งเดียว, webhook ซ้ำ, webhook มาก่อน response, provider timeout, ยอดที่ client ส่งมาถูกเมิน, คืนเงินบางส่วน
- Concurrency: refresh พร้อมกัน 2 request, webhook กับ reconcile ทำงานชนกัน
- Clock: ฉีด `Clock` เข้าไปเพื่อทดสอบเรื่องหมดอายุหรือต่ออายุโดยไม่ต้อง sleep

เกณฑ์ CI (ทุก PR): lint + typecheck + unit + integration + e2e ผ่านหมด, coverage ของ `auth/` `payments/` `webhooks/` ≥ 90% (ทั้งโปรเจกต์ ≥ 80%), migration รันได้บน DB ว่าง

---

## 6. ลำดับงาน (milestones)

1. **สัปดาห์ 1 – วางฐาน**: คอนเฟิร์มหัวข้อ 0, เขียน ADR, scaffold, docker-compose, config, logger, error handler, CI
2. **สัปดาห์ 2 – สมาชิก**: users + auth (JWT + refresh rotation), ยืนยันอีเมล, รีเซ็ตรหัสผ่าน, rate limit, test ครบ
3. **สัปดาห์ 3 – ชำระเงิน**: plans, payments + FakeProvider, idempotency, webhooks, outbox
4. **สัปดาห์ 4 – ต่อ provider จริง**: adapter ของ provider ที่เลือก, sandbox test, reconcile job
5. **สัปดาห์ 5 – subscription**: ต่ออายุ, dunning, entitlement, ยกเลิก/คืนเงิน
6. **สัปดาห์ 6 – พร้อมขึ้นระบบ**: security review, load test endpoint login/checkout, runbook (key rotation, webhook ล้มเหลว, reconcile ไม่ตรง), monitoring/alert

---

## 7. งานวันแรก (checklist)

- [ ] ส่งหัวข้อ 0 ให้หัวหน้า/ทีมช่วยตอบ
- [ ] ขอสิทธิ์: repo, sandbox ของ payment provider, secret manager, Sentry/log
- [ ] ถามว่ามี coding standard / template โปรเจกต์ของทีมไหม (ถ้ามีให้ปรับโครงหัวข้อ 1 ตาม)
- [ ] `git init` + เขียน README และ `.env.example`
- [ ] เขียน ADR-001 (stack) และ ADR-002 (กลยุทธ์ token) ให้ทีมรีวิว
