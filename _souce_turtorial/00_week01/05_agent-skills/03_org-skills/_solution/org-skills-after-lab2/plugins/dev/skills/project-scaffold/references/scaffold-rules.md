# กติกาขึ้นโปรเจกต์ สมาชิก + ชำระเงิน

> สรุปจาก `company-kit/project-scaffold-notes.md` (มิว, อัปเดต 2026-10-15) — 4 โปรเจกต์: ShopDee Member 2025, FitPlus 2025, BaanRai Loyalty 2026, DentDee Clinic 2026
> gateway ของบริษัท = **ThaiPay GW** (สมมติ)

## โมดูลมาตรฐาน (ทุกโปรเจกต์มี)

| โมดูล | ขอบเขต | สถานะใน template |
|---|---|---|
| `auth` | สมัคร, login (อีเมล+รหัสผ่าน / OTP มือถือ), refresh, logout, reset password | ✅ อีเมล+รหัส, refresh, logout · ⏳ OTP, reset password = TODO ตาม spec |
| `member` | โปรไฟล์, ระดับสมาชิก, consent PDPA (เก็บเวอร์ชันข้อความยินยอม) | ✅ |
| `payment` | สร้างคำสั่งจ่าย, redirect ไป gateway, รับ webhook, คืนเงิน | ✅ (refund API ของ gateway = TODO) |
| `notification` | อีเมล/SMS/LINE ผ่านคิว BullMQ | ✅ คิว + worker (provider จริง = TODO) |
| `audit` | บันทึกทุก action สำคัญ (ใคร ทำอะไร เมื่อไร) | ✅ |

## โครงโฟลเดอร์

```
src/app/            หน้าเว็บ + route handlers (api/auth/*, api/payment/{checkout,webhook,orders/[orderId]}, healthz, readyz)
src/modules/<m>/    index.ts service.ts repository.ts schema.ts errors.ts __tests__/
src/lib/            logger.ts db.ts redis.ts queue.ts app-error.ts http.ts client/auth-client.ts
src/config/env.ts   ตรวจ env ด้วย Zod
src/workers/main.ts worker BullMQ (payment.paid, notification.requested)
prisma/             schema.prisma (schema แยกต่อโมดูล: auth, member, payment, audit) + migrations/
tests/e2e/          login.spec.ts checkout.spec.ts
```

## ⚠️ บั๊ก token หมดอายุ (ShopDee 2025) — ห้ามถอยกลับ

**อาการ:** กดจ่าย → ไป gateway → จ่ายเสร็จกลับมา → เด้งไป login, ตะกร้าหาย, บางคนจ่ายซ้ำ (คืนเงิน 37 รายการ)
**ต้นเหตุ:** access 60 นาที + refresh 30 วันไม่หมุน · client ไม่ refresh ก่อนไป gateway · อยู่หน้า gateway นาน (QR/OTP) · callback ผูกกับ session

**วิธีแก้ (ทุกโปรเจกต์):**
1. access token **15 นาที**, refresh token **หมุนทุกครั้งที่ใช้** + reuse detection (ใช้ refresh เก่าซ้ำ = revoke ทั้ง family)
2. client refresh ล่วงหน้า 60 วินาทีก่อนหมด และ **refresh ก่อน redirect ไป gateway ทุกครั้ง**
3. callback อ่านผลจาก `order_id` (ไม่ต้องมี session) แล้วค่อยกู้ session จาก refresh cookie — ตะกร้าไม่หาย
4. E2E: ตั้ง access 5 วินาที → จ่ายเงิน → ต้องกลับมาหน้า "ชำระเงินสำเร็จ"

**บทเรียนเพิ่ม (sukjai-spa 2026-11, เจอจาก E2E ข้อ 4):**
- ระยะ refresh ล่วงหน้า = `min(60 วิ, ครึ่งอายุ token)` — ถ้าใช้ 60 วิตรง ๆ กับ TTL 5 วิ client จะ refresh วนไม่หยุด
- `goToGateway` ต้อง **หยุด timer ก่อน redirect** — refresh ที่ถูกตัดกลางทางตอนเปลี่ยนหน้า: server หมุน token แล้วแต่ browser ไม่ได้ cookie ใหม่ → ครั้งต่อไปเป็น reuse → โดน revoke ทั้งตระกูล = บั๊กเดิมกลับมา
- หลายแท็บ: ใช้ Web Locks (`navigator.locks`) ให้ refresh ทีละแท็บ

## Webhook idempotency (BaanRai 2026)

- gateway ส่ง webhook ซ้ำได้ (เจอ 3 ครั้งต่อ event) → แต้มสะสมเพิ่มซ้ำ
- ตาราง `payment_events (event_id UNIQUE, received_at, payload_hash)` · **insert ก่อน** → ชน unique = ตอบ 200 แล้วจบ
- ตรวจลายเซ็น **HMAC-SHA256** ด้วย `THAIPAY_WEBHOOK_SECRET` ก่อนทุกอย่าง (header `x-thaipay-signature`, เทียบด้วย `timingSafeEqual`)
- ตอบ 200 ภายใน 3 วินาที → งานหนักโยนเข้าคิว (`payment.paid`, jobId = event id)
- สถานะ order ทางเดียว: `pending → paid → refunded` (ห้ามถอย) · อัปเดตแบบมีเงื่อนไข `WHERE status = from`
- ตรวจยอดใน webhook ตรงกับ order (กันยอดถูกแก้)

## Checklist ก่อนส่งโครงให้ทีม

- [ ] `.env.example` ครบ: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN`
- [ ] migration แรกผ่าน `prisma migrate dev`
- [ ] test auth + payment ผ่าน, E2E checkout ผ่าน
- [ ] `/healthz`, `/readyz` ตอบ 200
- [ ] ผ่าน coding-rules ครบ 10 ข้อ (ดู `team-standards.md`)

ประวัติเวลา: DentDee ขึ้นโครงเสร็จใน 1.5 วัน (ก่อนมี skill นี้)
