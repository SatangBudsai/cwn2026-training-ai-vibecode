# บั๊กจริงที่อยู่เบื้องหลังกติกา + โครงมาตรฐาน
(สรุปจาก company-kit/project-scaffold-notes.md ของ dev-mew อัปเดต 2026-10-15 — ใช้อ้างเหตุผลในคอมเมนต์รีวิว)

## 1. Token หลุดกลางจ่ายเงิน — ShopDee Member 2025 (→ กติกาข้อ 9)
อาการ: จ่ายที่ gateway เสร็จกลับมาโดนเด้งไปหน้า login, ตะกร้าหาย, บางคนจ่ายซ้ำ → คืนเงิน 37 รายการ
ต้นเหตุ: access 60 นาที, refresh 30 วันไม่หมุน, client ไม่ refresh ก่อนไป gateway, อีกแท็บ logout แล้ว refresh ใช้ไม่ได้, **หน้า callback ผูกผลกับ session แทน order**
ต้องเห็นในโค้ด:
- access 15 นาที, refresh หมุนทุกครั้ง + reuse detection (revoke ทั้ง family)
- client refresh ล่วงหน้า 60 วินาที และ **refresh ก่อน redirect ไป gateway ทุกครั้ง**
- callback page อ่านผลจาก `order_id` (ไม่ต้องมี session) แล้วค่อยให้ login ต่อถ้าจำเป็น
- E2E: ตั้ง access อายุ 5 วินาทีใน test → จ่ายเงิน → ต้องกลับมาหน้า "ชำระเงินสำเร็จ"

## 2. Webhook ซ้ำ แต้มเพิ่มซ้ำ — BaanRai Loyalty 2026 (→ กติกาข้อ 10)
gateway (ThaiPay GW) ส่ง webhook ซ้ำได้ราว 3 ครั้งต่อ event ตอนระบบเขาช้า
ต้องเห็นในโค้ด:
- ตรวจลายเซ็น HMAC-SHA256 ด้วย `THAIPAY_WEBHOOK_SECRET` **ก่อนทุกอย่าง**
- ตาราง `payment_events (event_id UNIQUE, received_at, payload_hash)` · **insert ก่อน** → ชน unique = ตอบ 200 แล้วจบ ไม่ประมวลผลซ้ำ
- ตอบ 200 ภายใน 3 วินาที งานหนักโยนเข้าคิว (BullMQ)
- สถานะ order เปลี่ยนได้ทางเดียว `pending → paid → refunded` ห้ามถอย

## 3. โครงโฟลเดอร์มาตรฐาน (→ กติกาข้อ 1, 5, 6, 8)
```
src/
  app/            # Next.js App Router (หน้าเว็บ + route handlers) เช่น api/auth, api/payment/webhook
  modules/<m>/    # index.ts service.ts repository.ts schema.ts errors.ts __tests__/
                  # โมดูลมาตรฐาน: auth, member, payment, notification, audit
  lib/            # logger.ts db.ts redis.ts queue.ts app-error.ts
  config/env.ts
prisma/           # schema.prisma migrations/
tests/e2e/        # login.spec.ts checkout.spec.ts
.env.example
```
ตัวแปรที่ `.env.example` ต้องมี (โปรเจกต์สมาชิก + ชำระเงิน): `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN`
