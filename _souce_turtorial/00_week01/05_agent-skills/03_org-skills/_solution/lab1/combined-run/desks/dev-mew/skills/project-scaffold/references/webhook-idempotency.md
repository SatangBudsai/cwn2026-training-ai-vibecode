# Payment webhook idempotency (BaanRai 2026)

## ปัญหา
ThaiPay GW ส่ง webhook ซ้ำได้ (เจอ 3 ครั้งต่อ event ตอนระบบเขาช้า) → แต้มสะสมเพิ่มซ้ำ

## ลำดับใน `handleWebhook(rawBody, signature)`

1. **ตรวจลายเซ็นก่อนทุกอย่าง**: HMAC-SHA256 (hex) ของ raw body ด้วย `THAIPAY_WEBHOOK_SECRET` เทียบกับ header `x-thaipay-signature` ด้วย `timingSafeEqual` · ไม่ผ่าน → `PAYMENT_INVALID_SIGNATURE` (401)
2. parse body ด้วย Zod: `{ event_id, type: "payment.succeeded" | "payment.failed", order_id (uuid), amount_satang (int) }`
3. **insert ลง `payment_events` ก่อน** (`event_id UNIQUE`, `received_at`, `payload_hash` = sha256 ของ body) → ถ้าชน unique = ตอบ 200 `{ data: { duplicate: true } }` แล้วจบ ไม่ประมวลผลซ้ำ
4. ตรวจยอดเงินตรงกับ order, เปลี่ยนสถานะ, บันทึก audit, โยนงานหนัก (แจ้งเตือน/แต้ม) เข้าคิว
5. **ตอบ 200 ภายใน 3 วินาที** — ห้ามทำงานหนักใน request

## สถานะ order: ทางเดียว ห้ามถอย

```
pending → paid → refunded
```
ใช้ตาราง `ALLOWED_ORDER_TRANSITIONS` และ update แบบมีเงื่อนไขสถานะเดิม (compare-and-set) · เปลี่ยนผิดทาง → error 409

## test ที่ต้องมี
- ลายเซ็นผิด/ไม่มี → 401
- event เดิมส่ง 2 ครั้ง → ครั้งที่ 2 `duplicate: true` และไม่มีงานเข้าคิวเพิ่ม
- paid → pending ไม่ได้, refunded → paid ไม่ได้
