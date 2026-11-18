# coding-rules 10 ข้อ (สรุปจาก company-kit/coding-rules.md v2026.2 · ผู้ดูแล dev-pond)

stack: TypeScript · Node.js 22 · Next.js 15 (App Router) · PostgreSQL 16 · Prisma
ให้คะแนน: ผ่านข้อละ 1 เต็ม 10 · **ต่ำกว่า 8 ไม่ merge**

| # | กติกา | ผ่านเมื่อ | มองหา (ตัวบ่งชี้ว่าผิด) |
|---|---|---|---|
| 1 | โครงโฟลเดอร์ตามโมดูล | โค้ดธุรกิจใน `src/modules/<module>/` มี `index.ts` `service.ts` `repository.ts` `schema.ts` `errors.ts` `__tests__/` · หน้าเว็บอยู่ `src/app/` เรียกโมดูลผ่าน `index.ts` เท่านั้น | import `@/modules/x/service` หรือ `/repository` จากนอกโมดูล x · logic ธุรกิจอยู่ใน route/page |
| 2 | การตั้งชื่อ | ไฟล์/โฟลเดอร์ `kebab-case` · ตัวแปร/ฟังก์ชัน `camelCase` · type/class `PascalCase` · ค่าคงที่ `UPPER_SNAKE_CASE` · ตาราง/คอลัมน์ `snake_case` พหูพจน์ (`bookings`, `created_at`) · ฟังก์ชันขึ้นต้นด้วยกริยา | `PaymentHelper.ts`, `booking()` แทน `createBooking()`, ตาราง `Booking` |
| 3 | TypeScript strict | `"strict": true` · ไม่มี `any` (ใช้ `unknown` แล้ว narrow) · request body / API ภายนอก / **env** ตรวจด้วย Zod ก่อนใช้ | `: any`, `as any`, `JSON.parse` แล้วใช้เลย, `process.env.X` นอก `src/config/env.ts` |
| 4 | Error แบบมี type | error เป็น class extend `AppError` (`code`, `httpStatus`, `message`) เช่น `SlotFullError` (`BOOKING_SLOT_FULL`, 409) · ผู้ใช้ได้แค่ `code` + ข้อความที่แปลแล้ว | `throw new Error("...")`, `catch {}` หรือ catch แล้วไม่ทำอะไร, ส่ง `stack` / `String(err)` ออก response |
| 5 | ไม่มีความลับในโค้ด | secret ทุกตัวอ่านผ่าน `src/config/env.ts` (Zod) · `.env` อยู่ใน `.gitignore` · `.env.example` ครบทุกตัวแปร ค่าเป็นตัวอย่าง · คอมเมนต์ใน `.env` อยู่บรรทัดแยก ห้ามต่อท้ายค่า | ค่า fallback แบบ `?? "secret"` / `\|\| "secret"`, key ฝังในโค้ด, เพิ่มตัวแปรใหม่แต่ไม่เพิ่มใน `.env.example`, `KEY=x # comment` |
| 6 | Test ทุกโมดูล | unit test ของ `service.ts` (Vitest) ≥ 80% บรรทัด · flow สำคัญ (login, จ่ายเงิน, จอง) มี E2E Playwright · PR เพิ่มฟีเจอร์โดยไม่มี test = ไม่รีวิว | "test ตามมา PR หน้า", ไม่มี `tests/e2e/*.spec.ts` สำหรับ flow สำคัญ |
| 7 | Migration ผ่านเครื่องมือ | เปลี่ยน schema ด้วย `prisma migrate dev` แล้ว commit `prisma/migrations/` · ไม่แก้ migration ที่ merge แล้ว · ลบ/เปลี่ยนชื่อคอลัมน์ทำ 2 รอบปล่อย (expand → contract) | SQL เขียนมือนอก migrations, แก้ไฟล์ migration เก่า, `DROP COLUMN` / `RENAME` ในรอบเดียว |
| 8 | Log เป็น JSON | `pino` ผ่าน `src/lib/logger.ts` เท่านั้น · ทุกบรรทัดมี `level` `time` `module` `requestId` `msg` · redact รหัสผ่าน, token, เลขบัตรประชาชน, เบอร์โทรเต็ม | `console.log` ใน production code, log ทั้ง payload / user object, ไม่มี `module` |
| 9 | Token | access token **15 นาที** · refresh **หมุนทุกครั้งที่ใช้** + reuse detection (ใช้ซ้ำ = revoke ทั้งตระกูล) · refresh token ใน cookie `httpOnly; Secure; SameSite=Lax` เก็บ **hash** ใน DB · client refresh ก่อนหมด 60 วินาที และ **ก่อนพาผู้ใช้ไปหน้าชำระเงินเสมอ** | `expiresIn: "60m"`, refresh ไม่ออกตัวใหม่, เก็บ token ดิบ, เก็บใน localStorage, redirect ไป gateway โดยไม่ refresh |
| 10 | API รูปแบบเดียว + validate | สำเร็จ `{ data }` · ผิดพลาด `{ error: { code, message } }` · ทุก endpoint ตรวจ input (Zod) + สิทธิ์ (role) ก่อนเรียก service · webhook ภายนอกตรวจลายเซ็น + idempotent (เก็บ event id) | `{ ok: true }`, `{ success, msg }`, ไม่เช็ก role, webhook ไม่เช็กลายเซ็น หรือเช็ก event ซ้ำแบบ select ก่อนแล้วค่อย insert ทีหลัง |

## ตัวอย่างผลสั้น (จากต้นฉบับ)
```
coding-rules: 8/10  ✅ merge ได้
- ❌ ข้อ 5: ไม่มี .env.example
- ❌ ข้อ 9: access token ตั้ง 60 นาที และ refresh ไม่หมุน
```
