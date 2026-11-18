# โน้ตขึ้นโปรเจกต์ สมาชิก + ชำระเงิน (ของมิว)

> มิว อินทรสุวรรณ (`dev-mew`) · จดจาก 4 โปรเจกต์ล่าสุด · อัปเดต 2026-10-15
> ยังไม่เป็นทางการ — แต่ทุกโปรเจกต์ใหม่ผมก็ copy จากอันนี้ 555

## โปรเจกต์ที่ผ่านมา

| # | โปรเจกต์ | ลูกค้า | ปี | หมายเหตุ |
|---|---|---|---|---|
| 1 | ShopDee Member | บริษัท ช้อปดีมาร์ท จำกัด | 2025 | **บั๊ก token หลุดกลางจ่ายเงิน** ← ต้นเรื่อง |
| 2 | FitPlus Membership | ฟิตพลัสยิม | 2025 | ใช้ fix แล้ว ไม่เจออีก |
| 3 | BaanRai Loyalty | ร้านกาแฟบ้านไร่ (30 สาขา) | 2026 | เพิ่ม webhook idempotency |
| 4 | DentDee Clinic | คลินิกฟันดีเด่น | 2026 | จ่ายมัดจำนัดหมาย, ขึ้นโครงเสร็จใน 1.5 วัน |

## โมดูลมาตรฐาน (ทุกโปรเจกต์มี)

- `auth` — สมัคร, login (อีเมล+รหัสผ่าน / OTP มือถือ), refresh, logout, reset password
- `member` — โปรไฟล์, ระดับสมาชิก, consent PDPA (เก็บเวอร์ชันของข้อความยินยอม)
- `payment` — สร้างคำสั่งจ่าย, redirect ไป gateway (ThaiPay GW), รับ webhook, คืนเงิน
- `notification` — อีเมล/SMS/LINE ผ่านคิว BullMQ
- `audit` — บันทึกทุก action สำคัญ (ใคร ทำอะไร เมื่อไร)

## โครงโฟลเดอร์ที่ใช้

```
src/
  app/                 # Next.js App Router (หน้าเว็บ + route handlers)
    api/
      auth/  payment/webhook/  ...
  modules/
    auth/      index.ts service.ts repository.ts schema.ts errors.ts __tests__/
    member/    ...
    payment/   ...
    notification/ ...
    audit/     ...
  lib/         logger.ts  db.ts  redis.ts  queue.ts  app-error.ts
  config/      env.ts
prisma/        schema.prisma  migrations/
tests/e2e/     login.spec.ts  checkout.spec.ts
.env.example
```

## ⚠️ บั๊ก token หมดอายุ (ShopDee 2025)

**อาการ:** ลูกค้ากดจ่ายเงิน → ไปหน้า gateway → จ่ายเสร็จกลับมา → โดนเด้งไปหน้า login, ตะกร้าหาย บางคนจ่ายซ้ำ 2 รอบ (วันนั้นคืนเงินไป 37 รายการ)
**ต้นเหตุ:**
- access token อายุ 60 นาที, refresh token อายุ 30 วัน **ไม่หมุน** และ client ไม่ได้ refresh ก่อนออกไป gateway
- ผู้ใช้อยู่หน้า gateway นาน (สแกน QR / รอ OTP ธนาคาร) → กลับมา access หมดพอดี → refresh ใช้ไม่ได้เพราะอีกแท็บ logout ไปแล้ว → เด้ง
- หน้า callback ผูกผลการจ่ายเงินกับ session แทนที่จะผูกกับ order

**แก้แบบนี้ (ใช้ทุกโปรเจกต์หลังจากนั้น):**
1. access token **15 นาที**, refresh token **หมุนทุกครั้งที่ใช้** + reuse detection (ใช้ refresh เก่าซ้ำ = revoke ทั้ง family)
2. client refresh ล่วงหน้า 60 วินาทีก่อนหมด และ **refresh ก่อน redirect ไป gateway ทุกครั้ง**
3. callback page อ่านผลจาก `order_id` (ไม่ต้องมี session) แล้วค่อยให้ login ต่อถ้าจำเป็น — ตะกร้าไม่หาย
4. ใส่ E2E test: ตั้ง access อายุ 5 วินาทีใน test → จ่ายเงิน → ต้องกลับมาหน้า "ชำระเงินสำเร็จ"

## Payment webhook idempotency (BaanRai 2026)

- gateway ส่ง webhook ซ้ำได้ (เจอ 3 ครั้งต่อ event ตอนระบบเขาช้า) → แต้มสะสมเพิ่มซ้ำ
- แก้: ตาราง `payment_events (event_id UNIQUE, received_at, payload_hash)` · insert ก่อน → ถ้าชน unique = ตอบ 200 แล้วจบ ไม่ประมวลผลซ้ำ
- ตรวจลายเซ็น HMAC-SHA256 ด้วย `THAIPAY_WEBHOOK_SECRET` ก่อนทุกอย่าง, ตอบ 200 ภายใน 3 วินาที แล้วโยนงานหนักเข้าคิว
- สถานะ order เปลี่ยนได้ทางเดียว: `pending → paid → refunded` (ห้ามถอย)

## เช็กก่อนส่งโครงให้ทีม

- [ ] `.env.example` ครบ (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `THAIPAY_MERCHANT_ID`, `THAIPAY_WEBHOOK_SECRET`, `LINE_CHANNEL_TOKEN`)
- [ ] migration แรกผ่าน `prisma migrate dev`
- [ ] test auth + payment ผ่าน, E2E checkout ผ่าน
- [ ] `/healthz`, `/readyz` ตอบ 200
- [ ] ผ่าน `coding-rules.md` ครบ 10 ข้อ
