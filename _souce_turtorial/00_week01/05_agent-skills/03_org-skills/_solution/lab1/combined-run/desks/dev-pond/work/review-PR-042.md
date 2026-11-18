# รีวิว PR #42 — feat(payment): จ่ายมัดจำนัดหมายผ่าน ThaiPay GW + webhook

> ผู้รีวิว: dev-pond (tech lead) · เกณฑ์: `coding-rules.md` v2026.2 (10 ข้อ ข้อละ 1 คะแนน, < 8 ไม่ merge)
> PR ที่รีวิว: `work/PR-042-payment-webhook.diff` (PR สมมติ — โต๊ะนี้ไม่มีโค้ดจริง) · ผู้เปิด: dev-new · วันที่ 2026-11-04

```
coding-rules: 4/10  ❌ ไม่ merge (request changes)
- ❌ ข้อ 3: secret อ่าน process.env ตรง ๆ ไม่ผ่าน Zod (src/config/env.ts)
- ❌ ข้อ 4: throw new Error ลอย ๆ, catch แล้วเงียบ, ส่ง stack trace ให้ผู้เรียก
- ❌ ข้อ 5: มี secret fallback "dev-secret-123" ในโค้ด และ .env.example ไม่มี THAIPAY_WEBHOOK_SECRET
- ❌ ข้อ 6: เพิ่ม flow จ่ายเงินแต่ไม่มี E2E checkout (Playwright)
- ❌ ข้อ 9: ไม่ refresh token ก่อน redirect ไป gateway + หน้า callback ผูกกับ session (ซ้ำรอยบั๊ก ShopDee 2025)
- ❌ ข้อ 10: response ไม่ใช่ { data } / { error: { code, message } } และ webhook ไม่ idempotent จริง
```

## ผลรายข้อ

| ข้อ | กติกา | ผล | หลักฐาน (ไฟล์:จุด) |
|---|---|---|---|
| 1 | โครงโฟลเดอร์ตามโมดูล | ✅ | `route.ts` และ `callback/page.tsx` import ผ่าน `@/modules/payment`, `@/modules/auth` (index) ไม่แตะไฟล์ภายใน |
| 2 | การตั้งชื่อ | ✅ | ฟังก์ชันขึ้นต้นด้วยกริยา (`createDepositOrder`, `handleWebhook`, `verifySignature`), ค่าคงที่ `WEBHOOK_SECRET`, ตาราง `payment_events` / `event_id` |
| 3 | TS strict + Zod ทุกข้อมูลภายนอก | ❌ | body webhook ตรวจด้วย `WebhookPayloadSchema` ดีแล้ว แต่ env `THAIPAY_WEBHOOK_SECRET` อ่านจาก `process.env` ตรง ๆ ใน `service.ts` ไม่ผ่าน Zod |
| 4 | Error แบบมี type | ❌ | `service.ts`: `throw new Error("order not found")` · `catch (e) { // ignore }` เงียบ · `route.ts` ตอบ `reason: String(err), stack: ...` ให้ภายนอก |
| 5 | ไม่มีความลับในโค้ด | ❌ | `service.ts`: `process.env.THAIPAY_WEBHOOK_SECRET \|\| "dev-secret-123"` · PR ไม่ได้เพิ่มตัวแปรใน `.env.example` |
| 6 | Test ทุกโมดูล | ❌ | unit test มี (CI 84% ≥ 80 ✅) แต่ "จ่ายเงิน" เป็น flow สำคัญ ต้องมี E2E Playwright — description บอกว่า "ตามมา PR หน้า" = ไม่ผ่าน |
| 7 | Migration ผ่านเครื่องมือ | ✅ | `prisma/migrations/20261102_add_payment_events/` สร้างจาก `prisma migrate dev`, เป็นการเพิ่มตาราง (ไม่ต้อง expand→contract) |
| 8 | Log เป็น JSON (pino) | ✅ | ใช้ `logger` จาก `@/lib/logger` มี `module` · ไม่มี `console.log` · ไม่ log ข้อมูลส่วนตัว (แนะนำ: ใส่ `requestId` ใน webhook log ด้วย) |
| 9 | Token 15 นาที + refresh หมุน + refresh ก่อนไปจ่ายเงิน | ❌ | `deposit-button.tsx` `window.location.href = data.gatewayUrl` โดยไม่ refresh ก่อน · `callback/page.tsx` ถ้าไม่มี session → `/login` และอ่าน `session.lastOrder` แทน `order_id` |
| 10 | API รูปแบบเดียว + validate + webhook ปลอดภัย | ❌ | `route.ts` ตอบ `{ ok: true }` / `{ ok:false, reason }` · `handleWebhook` เช็ก `findEvent` ก่อนแล้วค่อย `insertEvent` **หลัง** อัปเดต (gateway ยิงซ้ำพร้อมกันได้ → ประมวลผลซ้ำ) · ไม่กันสถานะถอยหลัง |

## ต้องแก้ก่อน merge (เรียงตามความเสี่ยง)

1. **ข้อ 9 — ซ้ำรอยบั๊ก ShopDee 2025 (คืนเงิน 37 รายการ)**
   - `deposit-button.tsx`: เรียก refresh token ก่อน redirect ไป ThaiPay GW ทุกครั้ง
   - `callback/page.tsx`: อ่านผลจาก `order_id` ใน query (ไม่ต้องมี session) แสดงผลก่อน แล้วค่อยชวน login ถ้าจำเป็น
2. **ข้อ 10 — webhook idempotency**
   - ลำดับที่ถูก: ตรวจลายเซ็น → `INSERT payment_events (event_id UNIQUE)` **ก่อน** → ชน unique = ตอบ 200 จบ → ค่อยประมวลผล (หรือโยนเข้าคิว BullMQ ให้ตอบภายใน 3 วินาที)
   - สถานะเดินทางเดียว `pending → paid → refunded` — ปฏิเสธการเปลี่ยนย้อนกลับด้วย error มี type
   - ตอบ `{ data: { received: true } }` / `{ error: { code, message } }`
   - (แนะนำ) ใช้ `crypto.timingSafeEqual` เทียบลายเซ็นแทน `===`
3. **ข้อ 5 + 3 — secret**: ลบ fallback `"dev-secret-123"`, เพิ่ม `THAIPAY_WEBHOOK_SECRET` ใน schema ของ `src/config/env.ts` และ `.env.example` (ค่าเป็นตัวอย่าง)
4. **ข้อ 4 — error**: สร้าง `OrderNotFoundError` (`PAYMENT_ORDER_NOT_FOUND`, 404), `InvalidStatusTransitionError` (`PAYMENT_INVALID_TRANSITION`, 409) ใน `errors.ts` extend `AppError` · เอา `catch` เงียบออก (ให้ error ขึ้นไปพร้อม log) · route ส่งแค่ `code` + ข้อความแปลแล้ว ไม่ส่ง stack
5. **ข้อ 6 — E2E**: เพิ่ม `tests/e2e/checkout.spec.ts` ตามแบบโน้ตโปรเจกต์: ตั้ง access token อายุ 5 วินาทีใน test → จ่ายมัดจำ → ต้องกลับมาเห็น "ชำระเงินสำเร็จ" · เพิ่ม unit test webhook ซ้ำ 3 ครั้งพร้อมกัน และสถานะถอยหลัง

## คำชม
- แยก `schema.ts` และใช้ Zod กับ payload webhook ถูกทาง
- migration สะอาด ใช้เครื่องมือ ตั้งชื่อตารางตามกติกา
- ตรวจลายเซ็นก่อนทำอย่างอื่นใน route — ถูกลำดับแล้ว

## ตัวอย่างคอมเมนต์ที่โพสต์ใน PR (สั้น)
> coding-rules: 4/10 ❌ ยังไม่ merge — จุดที่ต้องแก้มากสุดคือข้อ 9 (refresh ก่อนไป gateway + callback ใช้ order_id) และข้อ 10 (insert event ก่อนประมวลผล) เพราะเคยทำให้ลูกค้าจ่ายซ้ำในโปรเจกต์ ShopDee · รายละเอียดรายข้อตามตารางด้านบน แก้แล้ว re-request ได้เลยครับ
