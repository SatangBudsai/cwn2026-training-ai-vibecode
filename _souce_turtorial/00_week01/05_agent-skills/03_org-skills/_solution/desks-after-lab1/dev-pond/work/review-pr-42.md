# Code review — PR #42 "เพิ่ม refresh token + webhook ThaiPay"

> รีวิวโดย: `dev-pond` (ผ่าน skill `coding-standard` v0.1.0) · 2026-11-03
> เกณฑ์: `coding-rules.md` v2026.2 · โค้ดที่รีวิว: [`pr-sample/`](pr-sample/)

```
coding-rules: 0/10  ❌ ห้าม merge (ต่ำกว่า 8)
- ❌ ข้อ 1: route import ไฟล์ภายในโมดูล (modules/auth/service, modules/payment/repository) ไม่ผ่าน index.ts · ไม่มี schema.ts / errors.ts / __tests__/
- ❌ ข้อ 2: ไฟล์ kebab-case ถูก แต่ฟังก์ชัน `token` ไม่ขึ้นต้นด้วยกริยา และ `prisma.RefreshToken` ไม่ map ตาราง `refresh_tokens`
- ❌ ข้อ 3: `refreshToken: any` และ `req.json()` ไม่ผ่าน Zod
- ❌ ข้อ 4: throw new Error ลอย ๆ · catch {} เงียบใน webhook · ส่ง stack trace ให้ผู้ใช้
- ❌ ข้อ 5: JWT_SECRET hard-code · .env ถูกเอาออกจาก .gitignore และมี secret จริง + คอมเมนต์ต่อท้ายค่า
- ❌ ข้อ 6: ไม่มี unit test และ E2E ทั้งที่แตะ flow login + จ่ายเงิน
- ❌ ข้อ 7: แก้ schema ด้วย psql มือ ไม่มีไฟล์ใน prisma/migrations/
- ❌ ข้อ 8: console.log และ log refresh token เต็ม ๆ
- ❌ ข้อ 9: access 60 นาที, refresh ไม่หมุน, ไม่มี reuse detection, เทียบ token ตรง ๆ (ไม่ได้เก็บ hash)
- ❌ ข้อ 10: response ไม่อยู่ในรูป { data } / { error: { code, message } } · webhook ไม่ตรวจลายเซ็น ไม่ idempotent · refresh รับ userId จาก body (ไม่ตรวจสิทธิ์)
```

## รายละเอียดทีละจุด (เรียงตามความเสี่ยง)

| # | ไฟล์:บรรทัด | ข้อ | ปัญหา | แก้แบบมาตรฐานทีม |
|---|---|---|---|---|
| 1 | `src/app/api/payment/webhook/route.ts:5-10` | 10, 4 | ไม่ตรวจ HMAC, ไม่เก็บ event id → ใครก็ยิงให้ order เป็น paid ได้ และ gateway ส่งซ้ำ = แต้มเพิ่มซ้ำ (บั๊ก BaanRai 2026) · `catch (e) {}` กลืน error แล้วตอบ ok | ตรวจ `x-thaipay-signature` ด้วย HMAC-SHA256 + `env.THAIPAY_WEBHOOK_SECRET` ก่อนอ่าน body · `insert payment_events(event_id UNIQUE)` ก่อน ถ้าชน = ตอบ 200 จบ · ตอบภายใน 3 วิ แล้วโยนงานเข้าคิว · log error ด้วย logger แล้ว throw `AppError` |
| 2 | `src/modules/auth/service.ts:12-13` | 9 | access 60 นาที + คืน refresh เดิม (ต้นเหตุบั๊ก ShopDee 2025 ผู้ใช้หลุดกลางจ่ายเงิน) | `expiresIn: "15m"` · ออก refresh ใหม่ทุกครั้ง เก็บ hash ใน `refresh_tokens` พร้อม `family_id` · ถ้าเจอ token ที่ใช้แล้ว → revoke ทั้ง family · ส่ง refresh ผ่าน cookie `httpOnly; Secure; SameSite=Lax` ไม่ใช่ JSON body |
| 3 | `src/modules/auth/service.ts:4` · `.env` · `.gitignore` | 5 | secret อยู่ในโค้ด และ .env กำลังจะถูก commit | อ่านจาก `src/config/env.ts` (Zod) · คืน `.env` เข้า .gitignore · **หมุน secret ที่หลุดแล้วทั้งสองตัว** · เพิ่มตัวแปรใน `.env.example` · คอมเมนต์ขึ้นบรรทัดใหม่ |
| 4 | `src/modules/auth/service.ts:10` | 8 | `console.log` พร้อม refresh token เต็ม | `logger.info({ module: "auth", userId }, "token refreshed")` · ตั้ง pino redact `*.refreshToken`, `*.password` |
| 5 | `src/app/api/auth/refresh/route.ts:9` | 4, 10 | คืน `e.stack` ให้ client, status 500 ทุกกรณี | `{ error: { code: "AUTH_REFRESH_INVALID", message } }` + status จาก `AppError.httpStatus` (401) |
| 6 | `src/app/api/auth/refresh/route.ts:4-6` | 3, 10 | รับ `userId` จาก body → ขอ token ของคนอื่นได้ถ้ารู้ refresh · ไม่ validate | ไม่รับ userId จาก client: หา user จาก refresh token ที่ตรวจแล้ว · body ผ่าน `RefreshInputSchema` (Zod) |
| 7 | `route.ts` ทั้งสองไฟล์ | 1 | import `@/modules/auth/service`, `@/modules/payment/repository` และเรียก `prisma` ตรงจาก route | export `refreshSession` จาก `modules/auth/index.ts`, `handlePaymentEvent` จาก `modules/payment/index.ts` · SQL อยู่ใน `repository.ts` เท่านั้น |
| 8 | PR description | 7 | เพิ่ม `family_id` ด้วย psql มือ | `prisma migrate dev --name add-refresh-token-family` แล้ว commit migration · ลบคอลัมน์ที่เพิ่มด้วยมือใน dev DB ก่อน |
| 9 | — | 6 | ไม่มี test เลย | Vitest: rotate สำเร็จ / reuse → revoke family / หมดอายุ · webhook: ลายเซ็นผิด → 401, event ซ้ำ → ไม่บวกแต้ม · E2E: access 5 วิ → จ่ายเงิน → กลับมาหน้า "ชำระเงินสำเร็จ" |
| 10 | `src/modules/auth/service.ts:6` | 2 | ชื่อ `token` ไม่ใช่กริยา · `prisma.RefreshToken` ไม่ตรงชื่อตาราง `refresh_tokens` | `refreshSession()` · model `RefreshToken @@map("refresh_tokens")` |

## ข้อความตอบกลับใน PR (copy ได้)

> ขอบคุณครับ ตอนนี้ได้ **0/10** ยัง merge ไม่ได้ — เรื่องด่วนสุด 3 อย่าง: (1) webhook ต้องตรวจลายเซ็น + กันซ้ำด้วย event_id (2) token ต้อง 15 นาที + หมุน refresh ตามข้อ 9 เพราะเคยทำผู้ใช้หลุดกลางจ่ายเงินมาแล้ว (3) เอา secret ออกจากโค้ด/.env แล้วหมุน secret ใหม่ด้วย · ที่เหลือดูตารางด้านบน แนะนำเริ่มจากโครงของ `project-scaffold` จะได้ข้อ 1, 5, 8 ฟรี แล้วเพิ่ม test ตามข้อ 9 ในตาราง
