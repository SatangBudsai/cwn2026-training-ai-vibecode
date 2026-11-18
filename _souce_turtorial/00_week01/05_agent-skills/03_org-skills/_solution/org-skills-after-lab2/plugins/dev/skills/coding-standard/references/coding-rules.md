# กติกาโค้ดทีม Dev — 10 ข้อ (สรุปจาก `company-kit/coding-rules.md` v2026.2)

Stack: TypeScript · Node.js 22 · Next.js 15 (App Router) · PostgreSQL 16 · Prisma · Vitest · Playwright · pino · Zod
ข้อละ 1 คะแนน เต็ม 10 · **< 8 ห้าม merge**

| # | กติกา | เช็กอะไร (❌ ถ้าเจอ) |
|---|---|---|
| 1 | โครงตามโมดูล: `src/modules/<module>/{index,service,repository,schema,errors}.ts` + `__tests__/` · หน้าเว็บ/route ใน `src/app/` เรียกโมดูลผ่าน `index.ts` เท่านั้น | import `@/modules/x/service` หรือไฟล์ภายในโมดูลอื่น · route เรียก `prisma` ตรง · โมดูลขาดไฟล์มาตรฐาน |
| 2 | ไฟล์/โฟลเดอร์ `kebab-case` · ตัวแปร/ฟังก์ชัน `camelCase` · type/class `PascalCase` · ค่าคงที่ `UPPER_SNAKE_CASE` · ตาราง/คอลัมน์ `snake_case` พหูพจน์ · ฟังก์ชันขึ้นต้นด้วยกริยา | `booking()` แทน `createBooking()` · ตาราง `Booking`/`booking` · `createdAt` ในฐานข้อมูล (ต้อง `@map("created_at")`) |
| 3 | `"strict": true` · ห้าม `any` (ใช้ `unknown` แล้ว narrow) · ข้อมูลภายนอก (body, API นอก, env) ผ่าน Zod ก่อนใช้ | `any`, `as any`, `req.json()` แล้วใช้ตรง, `process.env.X` ตรง |
| 4 | error เป็น class extend `AppError` (`code`, `httpStatus`, `message`) เช่น `SlotFullError` (`BOOKING_SLOT_FULL`, 409) · ห้าม `throw new Error()` ลอย ๆ · ห้าม catch เงียบ · ส่งผู้ใช้แค่ `code` + ข้อความแปลแล้ว | `throw new Error("...")` · `catch {}` / catch แล้ว return ok · ส่ง `e.stack`/`e.message` ดิบ |
| 5 | ไม่มีความลับในโค้ด: อ่านผ่าน `src/config/env.ts` (Zod) · `.env` อยู่ใน `.gitignore` · มี `.env.example` ครบทุกตัว (ค่าตัวอย่าง) · คอมเมนต์ใน .env อยู่บรรทัดแยก | string secret ในโค้ด · `.env` ใน diff · ไม่มี/ไม่ครบ `.env.example` · `KEY=val # comment` |
| 6 | unit test `service.ts` ทุกโมดูล (Vitest) ≥ 80% บรรทัด · flow login / จ่ายเงิน / จอง มี E2E (Playwright) · PR ฟีเจอร์ไม่มี test = ไม่รีวิว | ไม่มีไฟล์ใน `__tests__/` · แตะ flow สำคัญแต่ไม่มี `tests/e2e/*.spec.ts` |
| 7 | schema เปลี่ยนด้วย `prisma migrate dev` + commit `prisma/migrations/` · ห้ามแก้ DB มือ · ห้ามแก้ migration ที่ merge แล้ว · ลบ/เปลี่ยนชื่อคอลัมน์ = 2 รอบปล่อย (expand → contract) | `schema.prisma` เปลี่ยนแต่ไม่มี migration ใหม่ · แก้ไฟล์ migration เก่า · rename คอลัมน์ในรอบเดียว · "รัน psql แล้ว" |
| 8 | log JSON ด้วย pino ผ่าน `src/lib/logger.ts` · ห้าม `console.log` ใน production code · ทุกบรรทัดมี `level, time, module, requestId, msg` · ห้าม log รหัสผ่าน, token, เลขบัตร ปชช., เบอร์โทรเต็ม (ใช้ redact) | `console.*` · log object ที่มี token/password/phone · ไม่มี `module`/`requestId` |
| 9 | access token **15 นาที** · refresh **หมุนทุกครั้ง** · refresh ใน cookie `httpOnly; Secure; SameSite=Lax` · เก็บ **hash** ใน DB · ใช้ซ้ำ = revoke ทั้ง family · client refresh ก่อนหมด 60 วิ และก่อนไปหน้าจ่ายเงินเสมอ | `expiresIn` ≠ 15m · คืน refresh เดิม · refresh ใน body/localStorage · `where: { token }` (ไม่ hash) · ไม่มี family/reuse detection |
| 10 | route ตอบ `{ data }` / `{ error: { code, message } }` · ทุก endpoint validate ด้วย Zod + ตรวจ role ก่อนเรียก service · webhook ตรวจลายเซ็น + idempotent (เก็บ event id) | รูป response อื่น · ไม่มี auth/role check · รับ `userId` จาก body · webhook ไม่ตรวจ HMAC / ไม่มี `event_id UNIQUE` |

## ตัวอย่างโค้ดที่ถูก (ใช้อ้างตอนแนะนำวิธีแก้)

```ts
// src/modules/booking/errors.ts
export class SlotFullError extends AppError {
  constructor() { super("BOOKING_SLOT_FULL", 409, "ช่วงเวลานี้เต็มแล้ว"); }
}

// src/app/api/bookings/route.ts
import { createBooking, CreateBookingSchema } from "@/modules/booking";
export async function POST(req: Request) {
  const user = await requireRole(req, ["member"]);
  const input = CreateBookingSchema.parse(await req.json());
  try {
    return Response.json({ data: await createBooking(user.id, input) });
  } catch (e) {
    if (e instanceof AppError)
      return Response.json({ error: { code: e.code, message: e.message } }, { status: e.httpStatus });
    logger.error({ module: "booking", err: e }, "create booking failed");
    throw e;
  }
}
```
