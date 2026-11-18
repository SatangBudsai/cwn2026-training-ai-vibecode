# กติกาโค้ดของทีม Dev (Coding Rules) — 10 ข้อ

> ผู้ดูแล: ปอนด์ เจริญกิจ (`dev-pond`) tech lead · v2026.2 · stack: TypeScript, Node.js 22, Next.js 15 (App Router), PostgreSQL 16, Prisma
> ใช้เป็นเกณฑ์ให้คะแนน code review: ผ่านข้อละ 1 คะแนน เต็ม 10 · ต่ำกว่า 8 ไม่ merge

1. **โครงโฟลเดอร์ตามโมดูล** — โค้ดธุรกิจอยู่ใน `src/modules/<module>/` แต่ละโมดูลมี `index.ts` (public interface), `service.ts`, `repository.ts`, `schema.ts`, `errors.ts`, `__tests__/` · หน้าเว็บอยู่ใน `src/app/` และเรียกโมดูลผ่าน `index.ts` เท่านั้น ห้าม import ไฟล์ภายในของโมดูลอื่น

2. **การตั้งชื่อ** — ไฟล์และโฟลเดอร์ `kebab-case`, ตัวแปร/ฟังก์ชัน `camelCase`, type/class `PascalCase`, ค่าคงที่ `UPPER_SNAKE_CASE`, ตารางและคอลัมน์ฐานข้อมูล `snake_case` พหูพจน์ (`bookings`, `created_at`) · ฟังก์ชันขึ้นต้นด้วยกริยา (`createBooking`, ไม่ใช่ `booking`)

3. **TypeScript strict** — เปิด `"strict": true`, ห้าม `any` (ใช้ `unknown` แล้ว narrow), ข้อมูลจากภายนอก (request body, API ภายนอก, env) ต้องตรวจด้วย Zod schema ก่อนใช้

4. **Error แบบมี type** — ทุกโมดูลประกาศ error เป็น class ที่ extend `AppError` (มี `code`, `httpStatus`, `message`) เช่น `SlotFullError` (`BOOKING_SLOT_FULL`, 409) · ห้าม `throw new Error("...")` ลอย ๆ และห้าม `catch` แล้วเงียบ · ส่งผู้ใช้เฉพาะ `code` + ข้อความที่แปลแล้ว ไม่ส่ง stack trace

5. **ไม่มีความลับในโค้ด** — รหัสผ่าน, API key, secret ทุกตัวอ่านจาก environment variable ผ่าน `src/config/env.ts` (ตรวจด้วย Zod) · `.env` อยู่ใน `.gitignore` เสมอ · ต้องมี `.env.example` ที่มีครบทุกตัวแปรแต่ค่าเป็นตัวอย่าง · คอมเมนต์ใน `.env` เขียนบรรทัดแยก ห้ามต่อท้ายค่า

6. **Test ทุกโมดูล** — ทุกโมดูลมี unit test ของ `service.ts` (Vitest) ครอบคลุม ≥ 80% ของบรรทัด · flow สำคัญ (login, จ่ายเงิน, จอง) มี E2E test ด้วย Playwright · PR ที่เพิ่มฟีเจอร์โดยไม่มี test ไม่รีวิว

7. **Migration ผ่านเครื่องมือเท่านั้น** — เปลี่ยน schema ด้วย `prisma migrate dev` แล้ว commit ไฟล์ใน `prisma/migrations/` · ห้ามแก้ฐานข้อมูลด้วยมือ ห้ามแก้ migration ที่ merge แล้ว · migration ที่ลบ/เปลี่ยนชื่อคอลัมน์ต้องทำ 2 รอบปล่อย (expand → contract)

8. **Log เป็น JSON** — ใช้ `pino` ผ่าน `src/lib/logger.ts` เท่านั้น (ห้าม `console.log` ใน production code) · ทุกบรรทัดมี `level`, `time`, `module`, `requestId`, `msg` · ห้าม log รหัสผ่าน, token, เลขบัตรประชาชน, เบอร์โทรเต็ม (ใช้ redact ของ pino)

9. **Token: access 15 นาที + refresh หมุนทุกครั้ง** — refresh token ต้องหมุน (rotate) ทุกครั้งที่ใช้ และ access token อายุ 15 นาที — เคยมีบั๊ก token หมดอายุแล้วผู้ใช้หลุดกลางการชำระเงินในโปรเจกต์ 2025 · refresh token เก็บใน cookie `httpOnly; Secure; SameSite=Lax`, เก็บ hash ในฐานข้อมูล, ใช้ซ้ำ = เพิกถอนทั้งตระกูล (reuse detection) · ฝั่ง client ต้อง refresh ก่อนหมดอายุ 60 วินาที และก่อนพาผู้ใช้ไปหน้าชำระเงินเสมอ

10. **API ตอบรูปแบบเดียว + validate ทุก input** — route handler ตอบ `{ data }` เมื่อสำเร็จ และ `{ error: { code, message } }` เมื่อผิดพลาด · ทุก endpoint ตรวจ input ด้วย Zod และตรวจสิทธิ์ (role) ก่อนเรียก service · webhook ภายนอกต้องตรวจลายเซ็นและเป็น idempotent (เก็บ event id)

---

### ตัวอย่างการให้คะแนนใน code review

```
coding-rules: 8/10  ✅ merge ได้
- ❌ ข้อ 5: ไม่มี .env.example
- ❌ ข้อ 9: access token ตั้ง 60 นาที และ refresh ไม่หมุน
```
