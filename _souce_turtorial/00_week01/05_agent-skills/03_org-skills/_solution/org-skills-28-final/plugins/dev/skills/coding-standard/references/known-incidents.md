# บั๊กที่ทีมเคยเจ็บ — ต้องเช็กทุกครั้งที่โค้ดแตะ auth / payment

สรุปจาก `company-kit/project-scaffold-notes.md` (มิว `dev-mew`, 2026-10-15)

## 1. token หลุดกลางจ่ายเงิน — ShopDee Member 2025 (→ กติกาข้อ 9)

อาการ: จ่ายเงินที่ gateway (ThaiPay GW) เสร็จ กลับมาโดนเด้งไป login ตะกร้าหาย บางคนจ่ายซ้ำ (คืนเงิน 37 รายการ)
ต้นเหตุ: access 60 นาที · refresh 30 วันไม่หมุน · client ไม่ refresh ก่อนไป gateway · callback ผูกผลจ่ายเงินกับ session

ต้องเห็นในโค้ด:
- [ ] access `expiresIn: "15m"`
- [ ] refresh ออกใหม่ทุกครั้ง + `family_id` + revoke ทั้ง family เมื่อเจอ token ที่ใช้แล้ว
- [ ] client refresh ล่วงหน้า 60 วิ และ **ก่อน redirect ไป gateway ทุกครั้ง**
- [ ] หน้า callback อ่านผลจาก `order_id` ไม่พึ่ง session
- [ ] E2E: ตั้ง access 5 วิใน test → จ่ายเงิน → ต้องเห็นหน้า "ชำระเงินสำเร็จ"

## 2. webhook ส่งซ้ำ แต้มเพิ่มซ้ำ — BaanRai Loyalty 2026 (→ กติกาข้อ 10)

อาการ: gateway ส่ง webhook ซ้ำได้ถึง 3 ครั้ง/event ตอนระบบเขาช้า

ต้องเห็นในโค้ด:
- [ ] ตรวจลายเซ็น HMAC-SHA256 ด้วย `THAIPAY_WEBHOOK_SECRET` **ก่อนทำอะไรทั้งหมด**
- [ ] ตาราง `payment_events (event_id UNIQUE, received_at, payload_hash)` — insert ก่อน ถ้าชน unique ตอบ 200 แล้วจบ
- [ ] ตอบ 200 ภายใน 3 วินาที งานหนักโยนเข้าคิว (BullMQ)
- [ ] สถานะ order ไปทางเดียว `pending → paid → refunded` ห้ามถอย

## ตัวแปร env ที่ `.env.example` ของโปรเจกต์สมาชิก+ชำระเงินต้องมี

`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN`
