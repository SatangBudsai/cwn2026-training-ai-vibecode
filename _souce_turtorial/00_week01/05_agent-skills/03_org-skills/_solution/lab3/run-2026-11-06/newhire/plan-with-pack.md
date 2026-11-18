# แผนขึ้นโปรเจกต์ระบบสมาชิก + ชำระเงิน

> เขียนเมื่อ 2026-11-06 · สถานะ: **แผน ยังไม่มีโค้ด** · ยังไม่ได้รัน scaffold, test หรือ migration
> อ้างอิง: skill `dev:project-scaffold` และ `dev:coding-standard` (novatech-skills `dev` 1.0.0) รวมถึง template ใน skill
> ใน repo นี้ยังไม่มี spec ลูกค้า จึงเว้นชื่อโปรเจกต์ ลูกค้า และราคาไว้ก่อน (ดูข้อ 1)

**หลักของแผน:** ไม่เขียนเองตั้งแต่ศูนย์ ใช้ `project-scaffold` ขึ้นโครงมาตรฐาน 5 โมดูล แล้วแก้จุดเสี่ยงในข้อ 8 และเติมงานตาม spec

---

## 1. ต้องตอบก่อนเริ่ม

กติกาของ skill ห้ามเดาชื่อลูกค้าและราคา ถ้ายังไม่ได้คำตอบแต่ต้องเดินงานต่อ ให้ใส่ค่าสมมติและจดลง `todos` ว่า "ยืนยันกับลูกค้า"

| # | คำถาม | ถามใคร (ควรยืนยัน) | ถ้ายังไม่มีคำตอบ |
|---|---|---|---|
| 1 | ชื่อโปรเจกต์ (kebab-case ไม่เกิน 3 คำ), ชื่อระบบ, ชื่อลูกค้า | หัวหน้างาน / PM | ใช้ชื่อชั่วคราว + TODO |
| 2 | แพ็กเกจและราคา (เก็บเป็นสตางค์) · มีหลังบ้านแก้ราคาไหม | ลูกค้า / PM | ถ้าไม่มีหลังบ้าน ใช้ `catalog.ts` · ถ้ามี ย้ายเป็นตาราง `payment.packages` |
| 3 | เวอร์ชันข้อความยินยอม PDPA (`YYYY-MM-v1`) | ลูกค้า / PM | ใช้ค่าสมมติ + TODO |
| 4 | ใช้ ThaiPay GW ไหม · มี sandbox และเอกสาร payload จริงไหม · gateway retry webhook เมื่อเราตอบ 5xx ไหม · `return_url` กลับมาด้วย GET หรือ POST | เจ้าของบัญชี gateway | ใช้ payload ตาม template ([ข้อ 8](#8-จุดเสี่ยงที่พบจากการอ่าน-template) R1, R4 ขึ้นกับคำตอบนี้) |
| 5 | ต้องมี OTP มือถือ, reset password, refund จริงไหม · ใช้ผู้ให้บริการ SMS / อีเมลเจ้าไหน | ลูกค้า / PM | ทำเป็น TODO ตาม template |
| 6 | หลังจ่ายสำเร็จต้องเกิดอะไร (เปิดสิทธิ์, เพิ่มแต้ม, แจ้งเตือน) | ลูกค้า / PM | worker มีแค่ audit + แจ้งเตือน |
| 7 | order ที่ค้าง `pending` ต้องหมดอายุไหม · กดจ่ายซ้ำควรใช้ order เดิมไหม (R3) | PM + `dev-mew` | ยังไม่ทำ แต่จดเป็นความเสี่ยง |
| 8 | ลูกค้าเป็นธนาคารไหม (ถ้าใช่ ต้อง deploy region ไทยเท่านั้น) | SA (`sa-ton`, `sa-ice`) | ถือว่าไม่ใช่ จนกว่าจะยืนยัน |

**ผู้ดูแลที่ระบุในเอกสาร:** `dev-mew` (โน้ต scaffold) · `dev-pond` (coding-rules, อนุมัติการต่างจากมาตรฐาน) · `sa-ton`, `sa-ice` (architecture)

---

## 2. Stack และสภาพเครื่อง

**Stack ทีม:** TypeScript (`strict`) · Node.js 22 · Next.js 15 App Router · PostgreSQL 16 + Prisma · BullMQ บน Redis · Zod · pino · Vitest · Playwright
**สถาปัตยกรรม:** modular monolith ตัวเดียว · ฐานข้อมูลเดียว แยก schema ต่อโมดูล · DB ชื่อ `nvt_<project>_<env>` · env มีแค่ `dev`, `uat`, `prod`

| รายการ | ผลตรวจเครื่องนี้ | ต้องทำ |
|---|---|---|
| Node | **v26.7.0** (ทีมใช้ 22) | ใช้ Node 22 ก่อนติดตั้ง เพราะ `engines: >=22` จะไม่เตือนว่าเวอร์ชันต่างจากทีม |
| npm | 12.2.0 | ใช้ได้ template มี `allowScripts` สำหรับ npm 12 แล้ว |
| Docker | 29.9.2 | ใช้ขึ้น DB/Redis ได้ พอร์ต 55432, 56379, 3100 ไม่ชนกับ container ที่รันอยู่ตอนตรวจ (ยังไม่ได้เช็กโปรเซสนอก Docker) |
| Git | โฟลเดอร์นี้ยังไม่เป็น repo | `git init` ในโฟลเดอร์โปรเจกต์ ก่อน commit ครั้งแรก |
| Shell | PowerShell 5.1 | ใช้ `&&` ไม่ได้ คำสั่งตัวอย่างของ skill ต้องปรับ หรือรันผ่าน Git Bash |

---

## 3. โครงโฟลเดอร์

```
work/
├─ plan.md                     ไฟล์นี้
├─ scaffold.json               ค่าตั้งต้นจาก spec (ห้ามมีข้อมูลส่วนบุคคล)
├─ SCAFFOLD-REPORT.md          ผลตรวจและ TODO สำหรับส่งทีม
└─ <name>/
   ├─ .env.example             ค่าตัวอย่างครบทุกตัว (.env ห้ามขึ้น git)
   ├─ prisma/
   │  ├─ schema.prisma         schema: auth, member, payment, audit
   │  └─ migrations/           commit ทุกครั้ง ห้ามแก้ของที่ merge แล้ว
   ├─ docs/
   │  ├─ architecture.md       C4 ระดับ 1–2 ด้วย Mermaid
   │  └─ adr/NNNN-<title>.md   บันทึกการตัดสินใจที่ต่างจากมาตรฐาน
   ├─ src/
   │  ├─ app/                  หน้าเว็บ + route handler เท่านั้น ห้ามมี business logic
   │  │  ├─ api/auth/{register,login,refresh,logout}/
   │  │  ├─ api/payment/{checkout,webhook,orders/[orderId]}/
   │  │  ├─ login/  checkout/  payment/callback/
   │  │  └─ healthz/  readyz/
   │  ├─ modules/<module>/     auth, member, payment, notification, audit
   │  │  ├─ index.ts           ทางเข้าเดียวจากภายนอกโมดูล
   │  │  ├─ service.ts         business logic (รับ dependency ผ่าน deps ทำให้ test ง่าย)
   │  │  ├─ repository.ts      จุดเดียวที่แตะ Prisma
   │  │  ├─ schema.ts          Zod + type
   │  │  ├─ errors.ts          error class ของโมดูล
   │  │  └─ __tests__/
   │  ├─ lib/                  logger, db, redis, queue, app-error, http, client/auth-client
   │  ├─ config/env.ts         จุดเดียวที่อ่าน env (ตรวจด้วย Zod)
   │  └─ workers/main.ts       BullMQ worker แยก process
   └─ tests/e2e/               login.spec.ts, checkout.spec.ts, helpers.ts
```

**กติกาที่พลาดบ่อย**
- import ข้ามโมดูลผ่าน `index.ts` เท่านั้น ห้าม `@/modules/x/service`
- route ห้ามเรียก `prisma` ตรง และห้ามอ่านตารางของโมดูลอื่น
- ห้ามใช้ `process.env.X` นอก `src/config/env.ts`
- ไฟล์ `kebab-case` · ตาราง/คอลัมน์ `snake_case` พหูพจน์ (ใช้ `@map`/`@@map`) · คิว `<domain>.<event>` เป็นอดีตกาล

---

## 4. โมดูล

| โมดูล | รับผิดชอบ | มีใน template | ต้องเติม |
|---|---|---|---|
| `auth` | สมัคร, login, refresh, logout, ตรวจ role | อีเมล + รหัสผ่าน, refresh, logout | OTP, reset password, rate limit login |
| `member` | โปรไฟล์, ระดับสมาชิก, consent PDPA | ครบ | ตาม spec |
| `payment` | สร้าง order, redirect, webhook, สถานะ order | ครบ ยกเว้น refund จริง | refund API, R1, R3 |
| `notification` | แจ้งเตือนผ่านคิว | คิว + worker | provider จริง (ตอนนี้ log ว่า "sent" แต่ยังไม่ส่งจริง) |
| `audit` | บันทึก action สำคัญ | ครบ | action ใหม่ตาม spec |

**ความสัมพันธ์**
- `app/api/*` เรียกทุกโมดูลผ่าน `index.ts`
- `payment` ส่งงาน `payment.paid` เข้าคิว แล้ว worker เรียก `audit` และ `notification`
- job ส่งแค่ `memberId` แล้ว worker ไปดึงช่องทางติดต่อเอง เพื่อไม่ให้มีอีเมล/เบอร์ใน Redis

**กฎเงินที่ห้ามถอดออก**
- checkout รับแค่ `packageId` ราคามาจาก server เสมอ และเก็บเป็นสตางค์
- สถานะ order เดินทางเดียว `pending → paid → refunded` อัปเดตแบบ `WHERE status = from`
- ตรวจ HMAC-SHA256 ก่อนทำอย่างอื่น · ตรวจยอดตรงกับ order · `event_id` unique · ตอบ 200 ภายใน 3 วินาที

---

## 5. การจัดการ token

ที่มาของกติกา: บั๊ก ShopDee 2025 จ่ายเสร็จแล้วเด้งไป login ตะกร้าหาย บางคนจ่ายซ้ำ ต้องคืนเงิน 37 รายการ

| รายการ | access token | refresh token |
|---|---|---|
| รูปแบบ | JWT HS256 (`sub`, `role`) | สุ่ม 32 bytes ไม่ใช่ JWT |
| อายุ | **15 นาที** (production บังคับ 900 วิ) | 30 วัน |
| ฝั่ง client | หน่วยความจำเท่านั้น ห้าม localStorage | cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/auth` |
| ฝั่ง server | ไม่เก็บ | เก็บแค่ SHA-256 พร้อม `family_id`, `used_at`, `revoked_at` |

**วงจรชีวิต**
1. **Login:** ออก token คู่ใหม่ และเริ่ม family ใหม่
2. **Refresh:** ทำ token เก่าเป็น used แบบ atomic แล้วออกคู่ใหม่ใน family เดิม
3. **Reuse:** ใช้ token เก่าซ้ำ หรือชนกันพร้อมกัน → revoke ทั้ง family, ล้าง cookie, บันทึก audit `auth.refresh_reused`
4. **Logout:** revoke ทั้ง family
5. **เปิดหน้าใหม่:** เรียก `refreshNow()` ตอน mount เพื่อกู้ session จาก cookie

**ฝั่ง client (`auth-client.ts`)**
- refresh ล่วงหน้า `min(60 วิ, ครึ่งอายุ token)` กัน refresh วนเมื่อ TTL สั้น
- ใช้ Web Locks ให้ refresh ทีละแท็บ
- `goToGateway`: หยุด timer → refresh → หยุด timer อีกครั้ง → redirect ถ้าไม่หยุด refresh อาจถูกตัดกลางทาง server หมุนแล้วแต่ browser ไม่ได้ cookie ใหม่ และครั้งต่อไปจะโดน revoke

**Flow จ่ายเงิน**
```
checkout → POST /api/payment/checkout (ได้ orderId + redirectUrl)
         → goToGateway: refresh ก่อนออกจากหน้า
         → ผู้ใช้อยู่ gateway นานแค่ไหนก็ได้ (access หมดได้ ไม่เป็นไร)
         → ระหว่างนั้น webhook เปลี่ยนสถานะ order (ไม่ขึ้นกับ session)
         → กลับ /payment/callback?order_id=...
         → อ่านสถานะจาก order_id แบบ poll ทุก 2 วิ สูงสุด 30 รอบ
         → กู้ session เงียบ ๆ ถ้ากู้ไม่ได้ก็ยังเห็นผลจ่ายเงิน ไม่เด้งไป login
```

**การตัดสินใจที่คงไว้:** ไม่มี grace window สำหรับ refresh ซ้ำ ผลคือถ้า response หายกลางทาง ผู้ใช้ต้อง login ใหม่ การเปลี่ยนต้องมี ADR และให้ `dev-pond` อนุมัติ

---

## 6. การจัดการ error

**รูปแบบ response เดียว:** `{ data }` หรือ `{ error: { code, message } }`

**ลำดับการทำงาน**
1. service โยน class ที่ extend `AppError` (`code`, `httpStatus`, `message` ภาษาไทยที่แปลแล้ว)
2. `route()` ใน `lib/http.ts` แปลง `AppError` เป็น response ตาม `httpStatus`
3. error อื่นทั้งหมด: log พร้อม `requestId` แล้วตอบ `INTERNAL_ERROR` 500 โดยไม่ส่ง stack
4. input ทุกตัวผ่าน Zod ถ้าไม่ผ่านโยน `ValidationError` (400)

| Code | HTTP | เมื่อไร | สิ่งที่ client ทำ |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | input ผิดรูป | แสดงข้อความ |
| `AUTH_UNAUTHORIZED`, `AUTH_ACCESS_INVALID` | 401 | ไม่มี / token ไม่ผ่าน | refresh แล้วลองใหม่ (ดู R5) |
| `AUTH_REFRESH_INVALID`, `AUTH_REFRESH_REUSED` | 401 | refresh ไม่ผ่าน / ถูกใช้ซ้ำ | ล้าง session ไป login |
| `AUTH_FORBIDDEN` | 403 | role ไม่พอ | แจ้งไม่มีสิทธิ์ |
| `AUTH_EMAIL_TAKEN` | 409 | อีเมลซ้ำ | แสดงข้อความ |
| `PAYMENT_ORDER_NOT_FOUND`, `PAYMENT_PACKAGE_NOT_FOUND` | 404 | ไม่พบข้อมูล | แสดงข้อความ |
| `PAYMENT_WEBHOOK_SIGNATURE_INVALID` | 401 | ลายเซ็นผิด | gateway เท่านั้น (ต้องมี log/alert, R6) |
| `PAYMENT_AMOUNT_MISMATCH` | 422 | ยอดไม่ตรง | gateway เท่านั้น (ต้องมี log/alert, R6) |
| `PAYMENT_INVALID_TRANSITION` | 409 | สถานะถอยหลัง | ไม่ต้องทำอะไร |
| `INTERNAL_ERROR` | 500 | error ไม่คาดคิด | ให้ลองใหม่ |

**กติกา**
- ห้าม `throw new Error` ลอย ๆ, ห้าม catch เงียบ, ห้ามส่ง `e.message`/`e.stack` ดิบให้ผู้ใช้
- ตั้งชื่อ code เป็น `<MODULE>_<REASON>` และเพิ่มใน `errors.ts` ของโมดูลนั้น

**Log**
- JSON ผ่าน pino เท่านั้น ห้าม `console.*` · ทุกบรรทัดมี `level, time, module, requestId, msg`
- redact รหัสผ่าน, token, เลขบัตร, เบอร์เต็ม ตรวจก่อนส่งด้วย `core:customer-data-policy`

**คิว**
- ทุก job idempotent · retry exponential 5 ครั้ง · ล้มครบเข้า `system.dead-lettered` พร้อม log ระดับ error
- ผูก alert ที่ระบบ log (error > 2% ใน 5 นาที, p95 > 2 วิ, คิวค้าง > 1,000, TLS หมดภายใน 21 วัน)

---

## 7. การทดสอบ

**เกณฑ์ผ่าน:** `service.ts` ≥ 80% บรรทัด · flow login และจ่ายเงินมี E2E · coding-rules ≥ 8/10 (checklist ส่งทีมต้องผ่านครบ 10 ข้อ) · E2E ล้ม**ห้ามแก้ test ให้ผ่าน**

| ชั้น | เครื่องมือ | ครอบคลุม | สถานะ |
|---|---|---|---|
| Static | `check.mjs`, `tsc --noEmit` | โครงสร้างและ coding-rules ส่วนที่ตรวจอัตโนมัติ | มีแล้ว |
| Unit | Vitest | `service.ts` ทั้ง 5 โมดูล ฉีด repository ผ่าน deps | มีแล้ว ต้องเติมตามด้านล่าง |
| Integration | Vitest + Postgres/Redis จริง | repository และ route | **เสนอเพิ่ม** |
| E2E | Playwright (พอร์ต 3100, access TTL 5 วิ) | login, checkout | มีแล้ว ต้องเติมตามด้านล่าง |
| Smoke | `/healthz`, `/readyz`, `next build` | ความพร้อม deploy | มีแล้ว |

**มีใน template แล้ว**
- Auth: access 15 นาที, หมุน refresh, reuse แล้ว revoke family, token หมดอายุ/ไม่รู้จัก, logout, hash รหัสผ่าน
- Payment: ราคาจาก server, อ่านสถานะด้วย `order_id`, ลายเซ็นผิด, webhook ซ้ำ 3 ครั้ง, ยอดไม่ตรง, สถานะห้ามถอย
- E2E: access หมดระหว่างอยู่ gateway 7 วิ → กลับมาเห็น "ชำระเงินสำเร็จ" และไม่เด้งไป login

**เสนอเพิ่ม (เรียงตามความเสี่ยง)**

| # | กรณีทดสอบ | ชั้น | กันเรื่อง |
|---|---|---|---|
| 1 | Redis ล่ม / publish ล้มหลัง insert event แล้ว gateway ส่งซ้ำ → งานหลังจ่ายต้องยังเกิด | Unit + Integration | R1 |
| 2 | DB ล้มระหว่าง insert event กับเปลี่ยนสถานะ → order ต้องไม่ค้าง `pending` | Integration | R1 |
| 3 | รัน worker จริง → หลังจ่ายมี audit `payment.paid` และสิทธิ์/แต้มเกิดครั้งเดียว | E2E / Integration | R2 |
| 4 | ส่ง event ซ้ำพร้อมกันจริง → ชน unique และสถานะเปลี่ยนครั้งเดียว | Integration | race |
| 5 | refresh token เดียวกันพร้อมกัน → `markUsed` ผ่านครั้งเดียว | Integration | race |
| 6 | จบ E2E checkout แล้ว `auth.refresh_reused` ต้องเป็น 0 | E2E | client refresh ผิดจังหวะ |
| 7 | webhook มาช้ากว่าผู้ใช้กลับ → หน้าแสดงกำลังตรวจสอบ แล้วเปลี่ยนเป็นสำเร็จ | E2E | polling |
| 8 | webhook ไม่มาเลยจนครบ 30 รอบ → มีข้อความบอกผู้ใช้และไม่ชวนจ่ายซ้ำ | E2E | R3 |
| 9 | สองแท็บ refresh พร้อมกัน → ไม่โดน revoke | E2E | Web Locks |
| 10 | นาฬิกาเครื่องผู้ใช้เร็ว/ช้า → ไม่ refresh วนและไม่ค้าง 401 | Unit (client) | R5 |
| 11 | webhook สลับลำดับ (refunded มาก่อน succeeded) | Unit | ความถูกต้องของสถานะ |

**ข้อมูลทดสอบ:** ใช้อีเมล `@example.com` และชื่อสมมติเท่านั้น

---

## 8. จุดเสี่ยงที่พบจากการอ่าน template

ทุกข้อมาจาก**การอ่านโค้ด ยังไม่ได้รันพิสูจน์** ควรเขียน test ให้ล้มก่อน แล้วค่อยแก้ และควรคุยกับ `dev-mew` / `dev-pond` เพราะ R1 และ R5 อาจต้องแก้ที่ template กลาง

| # | ระดับ | ปัญหา | ที่มา | ข้อเสนอ |
|---|---|---|---|---|
| **R1** | **สูง (เงิน)** | `handleWebhook` บันทึก event → เปลี่ยนสถานะ → ส่งเข้าคิว แบบไม่มี transaction ถ้าล้มหลังบันทึก event เมื่อ gateway ส่งซ้ำจะถูกมองเป็น duplicate ลูกค้าจ่ายแล้วแต่ order อาจค้าง `pending` หรือไม่ได้สิทธิ์ | `payment/service.ts:116-135` | รวม insert event + เปลี่ยนสถานะ + แถว outbox ใน transaction เดียว แล้วให้ relay ส่งเข้าคิว · ยังคงกติกา "ชน unique = ตอบ 200" |
| **R2** | สูง | E2E เปิดแค่ `next dev` ไม่เปิด worker งานหลังจ่ายจึงไม่ถูกทดสอบ end-to-end | `playwright.config.ts:13-19` | เพิ่ม worker ใน E2E หรือมี integration test แยก |
| **R3** | สูง | ไม่มีสถานะ failed/expired และกดจ่ายแต่ละครั้งสร้าง order ใหม่ ถ้า poll ครบ 60 วิแล้วยังไม่จบ ผู้ใช้อาจจ่ายซ้ำ ซึ่งเป็นอาการเดียวกับ ShopDee | `payment/service.ts:72-88`, `payment-result.tsx:9-28` | ตัดสินตามคำถามข้อ 7 · การเพิ่มสถานะต้องไม่ขัดกติกาทางเดียว จึงควรปรึกษา `dev-pond` |
| **R4** | กลาง | payload และพฤติกรรมของ gateway อ้างจากโปรเจกต์เก่า และเอกสารทีมระบุว่า ThaiPay GW เป็นชื่อ "สมมติ" | `decisions.md` ข้อ 5, `scaffold-rules.md` | ยืนยันกับ sandbox จริงก่อน UAT รวมถึง `return_url` และการ retry |
| **R5** | กลาง | เวลาหมดอายุคำนวณจากนาฬิกาเครื่องผู้ใช้ ถ้าเร็วเกิน `delay` จะเป็น 0 และ refresh วนไม่หยุด ถ้าช้าไปจะส่ง token หมดอายุ และ `authFetch` ไม่ retry เมื่อได้ 401 | `auth-client.ts:22-28,73-78` | ให้ server ส่งอายุเป็นวินาทีแล้วนับจากเวลาในเครื่อง + retry หลัง refresh 1 ครั้ง |
| **R6** | กลาง | `route()` ไม่ log `AppError` ลายเซ็นผิดและยอดไม่ตรงจึงไม่ทิ้งร่องรอย ทั้งที่เป็นสัญญาณถูกโจมตีหรือยอดถูกแก้ | `lib/http.ts:41` | log ระดับ warn + audit เฉพาะ event ฝั่ง payment |
| R7 | กลาง | ไม่พบ rate limit ใน template เสี่ยงโดนเดารหัสผ่านที่ login และ `register` บอกได้ว่าอีเมลไหนมีบัญชีแล้ว | ค้นทั้ง `templates/` · `auth/service.ts:89` | เพิ่ม rate limit บน Redis (มี TTL) ก่อนเปิดใช้จริง |
| R8 | ต่ำ | `JWT_REFRESH_SECRET` บังคับใน env แต่ไม่ถูกใช้ เพราะ refresh เป็นค่าสุ่ม | `config/env.ts:10` | คงไว้ตาม checklist แล้วแจ้ง `dev-mew` ว่าควรเอาออกจากมาตรฐานไหม |

---

## 9. ลำดับงาน

**ขั้น 0 — เตรียมตัว**
- [ ] อ่าน `scaffold-rules.md`, `coding-rules.md`, `known-incidents.md`
- [ ] ส่งคำถามข้อ 1 ให้ผู้เกี่ยวข้อง และขอ spec
- [ ] สลับเป็น Node 22

**ขั้น 1 — ขึ้นโครง** (ด่านผ่าน: `check.mjs` ผ่านทุกข้อ)
- [ ] เขียน `work/scaffold.json` จาก spec
- [ ] รัน `scaffold.mjs --config work/scaffold.json --out work/<name>`
- [ ] รัน `check.mjs work/<name>`
- [ ] `git init` และตรวจว่า `.env` ไม่ขึ้น git

**ขั้น 2 — ทำให้รันได้** (ด่านผ่าน: unit, E2E, build, health ผ่าน)
- [ ] คัดลอก `.env.example` เป็น `.env` แล้ว `npm install`
- [ ] `tsc --noEmit` และ `vitest run --coverage`
- [ ] ขึ้น Postgres 16 ที่ 55432 และ Redis 7 ที่ 56379 ด้วย Docker แล้วแก้ URL ใน `.env`
- [ ] `prisma migrate dev --name init`, `playwright test`, `next build`
- [ ] เช็ก `/healthz`, `/readyz` แล้วหยุด container ที่สร้างเอง
- [ ] เขียน `SCAFFOLD-REPORT.md` บันทึกผลจริงและค่าที่สมมติ

**ขั้น 3 — ปิดความเสี่ยงเงิน** (ด่านผ่าน: test เพิ่มข้อ 1–6 ผ่าน)
- [ ] คุย R1, R3, R5 กับ `dev-mew` / `dev-pond` และเขียน ADR ถ้าต่างจากมาตรฐาน
- [ ] เขียน test ให้ล้ม → แก้ R1 → เพิ่ม worker ใน E2E (R2) → แก้ R5, R6

**ขั้น 4 — งานตาม spec** (ด่านผ่าน: แต่ละ PR ได้ ≥ 8/10)
- [ ] งานหลังจ่าย (สิทธิ์/แต้ม ที่ idempotent ด้วย `eventId`)
- [ ] provider แจ้งเตือนจริง
- [ ] OTP, reset password, refund, rate limit ตามที่ spec ยืนยัน
- [ ] เบอร์มือถือเข้ารหัสหรือเก็บ hash

**ขั้น 5 — ส่งต่อ**
- [ ] รีวิวด้วย `coding-standard`
- [ ] ส่ง QA ด้วย `test-from-plan`
- [ ] เตรียมปล่อยด้วย `deploy-checklist`
- [ ] อัปเดต `docs/architecture.md` และตรวจ checklist ส่งทีมครบ

> `test-from-plan` และ `deploy-checklist` ถูกอ้างในเอกสาร แต่ไม่อยู่ใน plugin `dev` บนเครื่องนี้ ใช้ `core:skill-finder` หาหรือถามทีมว่าอยู่ที่ไหน

**อ้างอิงเวลา:** DentDee ขึ้นโครงเสร็จใน 1.5 วัน ก่อนมี skill นี้ · ขั้น 3–4 ขึ้นกับ spec จึงยังประเมินไม่ได้

---

## 10. สิ่งที่ห้ามทำ

- ถอดของที่กันบั๊กเดิม: access 15 นาที, การหมุน refresh + reuse detection, refresh ก่อนไป gateway, callback อ่านจาก `order_id`, `event_id` unique, HMAC, สถานะทางเดียว
- รับราคาจาก client
- ใส่ความลับจริงลง `.env.example` หรือ commit `.env` (ถ้าหลุดต้องหมุน secret แม้ลบแล้ว)
- แก้ DB มือ, แก้ migration ที่ merge แล้ว, หรือ rename คอลัมน์ในรอบเดียว (ต้อง expand → contract)
- คัดลอกข้อมูลส่วนบุคคลจาก spec ลง `scaffold.json`, README หรือ log
