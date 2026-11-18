# สรุปกติกาโค้ดทีม Dev 10 ข้อ (v2026.2, ผู้ดูแล dev-pond)

> ใช้ให้คะแนน code review ข้อละ 1 คะแนน · ต่ำกว่า 8 ไม่ merge · ต้นฉบับเต็มคือ coding-rules ของทีม (skill `coding-standard`)

| # | กติกา | วิธีตรวจในโครงนี้ |
|---|---|---|
| 1 | โค้ดธุรกิจใน `src/modules/<module>/` มี `index.ts service.ts repository.ts schema.ts errors.ts __tests__/` · `src/app/` เรียกผ่าน `index.ts` เท่านั้น ห้าม import ไส้ในของโมดูลอื่น | `grep -rn "modules/[a-z-]*/[a-z]" src/app` ต้องว่าง |
| 2 | ไฟล์/โฟลเดอร์ kebab-case · ตัวแปร camelCase · type PascalCase · ค่าคงที่ UPPER_SNAKE_CASE · ตาราง/คอลัมน์ snake_case พหูพจน์ · ฟังก์ชันขึ้นต้นด้วยกริยา | ดู `@@map`/`@map` ใน prisma |
| 3 | `"strict": true`, ห้าม `any`, ข้อมูลภายนอก (body, API, env) ตรวจด้วย Zod | `grep -rnw any src` ต้องว่าง |
| 4 | error เป็น class extend `AppError` (`code`, `httpStatus`, `message`) · ห้าม `throw new Error` ลอย ๆ · ห้าม catch เงียบ · ไม่ส่ง stack ให้ผู้ใช้ | `grep -rn "throw new Error(" src` ต้องว่าง |
| 5 | ไม่มีความลับในโค้ด อ่านผ่าน `src/config/env.ts` (Zod) · `.env` อยู่ใน `.gitignore` · มี `.env.example` ครบ · คอมเมนต์บรรทัดแยก | |
| 6 | unit test ของทุก `service.ts` (Vitest) ≥ 80% บรรทัด · flow login/จ่ายเงิน มี E2E Playwright | `vitest run --coverage` ตั้ง threshold lines 80 |
| 7 | เปลี่ยน schema ด้วย `prisma migrate dev` เท่านั้น commit `prisma/migrations/` · ห้ามแก้ migration ที่ merge แล้ว · ลบ/เปลี่ยนชื่อคอลัมน์ทำ expand → contract | |
| 8 | log JSON ด้วย pino ผ่าน `src/lib/logger.ts` · ห้าม `console.log` · มี `level time module requestId msg` · redact password/token/บัตรประชาชน/เบอร์โทร | `grep -rn console.log src` ต้องว่าง |
| 9 | access 15 นาที + refresh หมุนทุกครั้ง + reuse detection · cookie `httpOnly; Secure; SameSite=Lax` · เก็บ hash · client refresh ก่อนหมด 60 วิ และก่อนไปหน้าจ่ายเงิน | ดู `token-expiry-fix.md` |
| 10 | ตอบ `{ data }` / `{ error: { code, message } }` · validate input ด้วย Zod + ตรวจ role ก่อนเรียก service · webhook ตรวจลายเซ็น + idempotent | ดู `webhook-idempotency.md` |

รูปแบบรายงาน:
```
coding-rules: 9/10  ✅ merge ได้
- ❌ ข้อ 6: ยังไม่มี E2E Playwright
```
