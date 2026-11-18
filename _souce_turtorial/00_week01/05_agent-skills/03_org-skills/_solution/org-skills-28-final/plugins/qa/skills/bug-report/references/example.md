# ตัวอย่าง: จาก log ดิบ → รายงานบั๊ก (ย่อ)

ต้นทาง: CI run #1873 kaset-appointment-web · release/2026.11 · 3b7e9f1 · test `create-booking.spec.ts:41` ล้ม 2/2

สิ่งที่ skill ดึงออกมา:
- assertion: expected "จองสำเร็จ" / received "ช่วงเวลานี้เต็มแล้ว..."
- network: GET slots บอก 15:00 remaining=3 แต่ POST bookings → 409 BOOKING_SLOT_FULL
- body ส่ง `slotStart: 2026-11-06T15:00:00.000Z` (=22:00 ไทย) · server log `resolvedLocalSlot 22:00, capacity 0`
- เทียบผ่าน/ไม่ผ่าน: 09:00–13:00 ผ่าน, 15:00–15:30 ไม่ผ่าน, เครื่อง TZ Bangkok ผ่าน, runner TZ=UTC ไม่ผ่าน
- commit น่าสงสัย: "refactor: move slot time handling to date-fns-tz"
- deadline: ลูกค้า deploy 2026-11-10 → P1 · จองไม่ได้บางช่วงเวลา → Sev2

ชื่อที่ได้: `[BUG] จองคิวช่วง 15:00 ขึ้นไป ได้ 409 "เต็มแล้ว" ทั้งที่หน้าจอแสดงว่าง 3 ที่`

สังเกต: ข้อสังเกตของ QA เขียนว่า "ดูเหมือนเวลาท้องถิ่นถูกติดป้าย UTC" + บอกสิ่งที่ยังไม่ได้เก็บ (body ของเคสที่ผ่าน) — ไม่ฟันธงว่าโค้ดบรรทัดไหนผิด
