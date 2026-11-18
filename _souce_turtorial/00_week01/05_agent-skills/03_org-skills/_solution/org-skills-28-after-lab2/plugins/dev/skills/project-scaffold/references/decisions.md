# ทางแยกที่ template เลือกไว้ (และเมื่อไรควรเปลี่ยน)

1. **refresh ซ้ำ = revoke ทันที ไม่มี grace window** — ตาม coding-rules ข้อ 9 ตรงตัว ปลอดภัยสุด แต่ถ้า response refresh หาย (เน็ตหลุด/ปิดแท็บกลางทาง) ผู้ใช้ต้อง login ใหม่ · ถ้าลูกค้าบ่นเรื่องหลุดบ่อย ทางเลือก = grace 10–30 วินาทีที่ยอมให้ token เพิ่งใช้คืนตัวลูกตัวเดิม → ต่างจากมาตรฐาน ต้องเขียน ADR และให้ `dev-pond` อนุมัติ
2. **access token เก็บในหน่วยความจำ ไม่ใช่ localStorage** — กัน XSS ขโมย · ผลคือเปิดหน้าใหม่ต้อง refresh 1 ครั้ง (`refreshNow()` ตอน mount)
3. **refresh cookie `Path=/api/auth`** — ไม่ส่ง cookie ไปทุก request · ถ้าย้าย route auth ต้องแก้ path ด้วย
4. **ราคาอยู่ใน `src/modules/payment/catalog.ts`** — พอสำหรับแพ็กเกจคงที่ · ถ้า spec มีหลังบ้านแก้ราคา ย้ายเป็นตาราง `payment.packages`
5. **webhook payload ThaiPay GW** (`event_id`, `type`, `order_id`, `amount_satang`, header `x-thaipay-signature` = hex HMAC-SHA256 ของ raw body) — ตามที่ใช้ใน 4 โปรเจกต์ก่อน · ถ้าลูกค้าใช้ gateway อื่น แก้ `thaiPayWebhookSchema` + `verifyWebhookSignature`
6. **OTP มือถือ / reset password ยังไม่อยู่ใน template** — ขึ้นกับผู้ให้บริการ SMS ของแต่ละลูกค้า ใส่เป็น TODO เสมอ · เบอร์มือถือเก็บแบบเข้ารหัส/hash (arch-standards ข้อ 4)
7. **คิวไม่ใส่อีเมล/เบอร์** — job ส่งแค่ `memberId` แล้ว worker ไปดึงช่องทางติดต่อเอง (ลดข้อมูลส่วนบุคคลใน Redis)
8. **E2E port 3100 + `reuseExistingServer: false`** — เครื่อง dev มักมีโปรเจกต์อื่นเปิด 3000 อยู่ (เคยเกือบรัน E2E ใส่เว็บอื่น)
9. **npm 12 บล็อก install script** — `allowScripts` ใน package.json อนุญาตแค่ prisma + esbuild, ปิด `msgpackr-extract` (native, ไม่จำเป็น)
