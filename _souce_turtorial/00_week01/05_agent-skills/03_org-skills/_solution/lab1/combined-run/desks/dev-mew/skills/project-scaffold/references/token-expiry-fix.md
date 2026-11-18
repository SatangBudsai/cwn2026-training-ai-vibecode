# Fix บั๊ก token หมดอายุกลางการจ่ายเงิน (ShopDee 2025)

## อาการ
ลูกค้ากดจ่าย → ไปหน้า gateway → จ่ายเสร็จกลับมา → เด้งไปหน้า login, ตะกร้าหาย, บางคนจ่ายซ้ำ (วันนั้นคืนเงิน 37 รายการ)

## ต้นเหตุ
- access 60 นาที, refresh 30 วัน **ไม่หมุน**, client ไม่ refresh ก่อนออกไป gateway
- ผู้ใช้ค้างหน้า gateway นาน (สแกน QR / รอ OTP) → กลับมา access หมดพอดี → refresh ใช้ไม่ได้เพราะอีกแท็บ logout ไปแล้ว
- หน้า callback ผูกผลการจ่ายกับ session แทนที่จะผูกกับ order

## สิ่งที่ต้องทำในทุกโปรเจกต์ (ห้ามข้าม)

1. **access token 15 นาที** (`ACCESS_TOKEN_TTL_SECONDS = 900`)
2. **refresh token หมุนทุกครั้งที่ใช้** + reuse detection
   - เก็บเฉพาะ hash (sha256) ของ refresh token ใน `refresh_tokens` พร้อม `family_id`
   - ตอน refresh: หาไม่เจอ / revoked / หมดอายุ → `InvalidTokenError` (401)
   - ถ้า token นี้ `used_at` มีค่าแล้ว (ถูกใช้ไปแล้ว) → revoke ทั้ง family + บันทึก audit `auth.refresh_reused` → `RefreshTokenReusedError` (`AUTH_REFRESH_REUSED`, 401)
   - ปกติ: mark `used_at` แล้วออกคู่ใหม่ใน family เดิม
   - logout = revoke ทั้ง family
3. refresh token อยู่ใน cookie `httpOnly; Secure; SameSite=Lax; Path=/api/auth` · access token ส่งใน body (`accessToken`, `accessTokenExpiresAt`) ใช้เป็น `Authorization: Bearer`
4. **ฝั่ง client** (`modules/auth/client.ts`):
   - `shouldRefreshAccessToken(expiresAtMs, nowMs)` → true เมื่อเหลือ ≤ 60 วินาที
   - `redirectToPaymentGateway({ refreshSession, createCheckoutUrl, navigate })` → **refresh ก่อนเสมอ** แล้วค่อยพาไป gateway
5. **callback อ่านผลจาก `order_id`** — `GET /api/payment/result/[orderId]` และหน้า `/payment/result?order_id=...` ไม่ต้องมี session ตอบสถานะ + ข้อความ "ชำระเงินสำเร็จ" แล้วค่อยให้ login ต่อถ้าจำเป็น ตะกร้าไม่หาย
6. **regression test**: ตั้ง access อายุ 5 วินาที → สร้าง order → refresh ก่อน redirect → เดินเวลา 10 นาที (ใช้ `clock` ที่ inject ได้) → webhook จ่ายสำเร็จ → อ่านผลด้วย order_id ต้องได้ "ชำระเงินสำเร็จ" และ access เก่าต้องใช้ไม่ได้แล้ว แต่ refresh ใหม่ยังใช้ได้
   - เต็มรูปแบบควรมี E2E Playwright `tests/e2e/checkout.spec.ts` ด้วย (ต้องมี DB + browser)
