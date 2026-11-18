# [BUG] จองคิวช่วง 15:00 ขึ้นไป ได้ 409 "เต็มแล้ว" ทั้งที่หน้าจอแสดงว่าง 3 ที่

ระบบ / repo / เวอร์ชัน : kaset-appointment-web · release/2026.11 · 3b7e9f1
สภาพแวดล้อม          : UAT · https://uat.kaset-appointment.novatech.example · chromium + mobile-safari (Playwright 1.48.2) และทดสอบมือบน UAT · CI runner TZ=UTC, สาขาเปิด-ปิดตามเวลาไทย (Asia/Bangkok, UTC+7)
ความรุนแรง (Severity) : **Sev2** — จองไม่ได้บางช่วงเวลา/บางสาขาที่ควรจองได้ (ตามเกณฑ์ระบบจองคิว) และผู้ใช้ไม่มีทางเลี่ยงถ้าต้องการช่วงบ่าย
ความเร่งด่วน (Priority): **P1** — ต้องแก้ก่อน release ถัดไป (ลูกค้าออมทรัพย์เกษตรไทย deploy release นี้ 2026-11-10)
พบเมื่อ / โดย          : 2026-11-02 · แบงค์ ศักดิ์ดี (qa-bank) · จาก CI run #1873 `booking/create-booking.spec.ts:41` + ทดสอบมือบน UAT

## ขั้นตอนทำซ้ำ
1. เปิด UAT https://uat.kaset-appointment.novatech.example แล้ว login ด้วย user ทดสอบ `qa-user-07` (ข้อมูลสังเคราะห์)
2. ไปที่ `/booking/new?branch=BR-012`
3. เลือก "ประเภทบริการ" = `deposit-withdraw` (ฝาก-ถอน)
4. เลือกวันที่ `2026-11-06` (วันศุกร์)
5. กดปุ่มช่วงเวลา `15:00` — หน้าจอแสดง "ว่าง 3 ที่"
6. กด "ยืนยันการจอง"

(ทำซ้ำอัตโนมัติ: `npx playwright test booking/create-booking.spec.ts:41` บน runner TZ=UTC ชี้ไปที่ UAT)

## ผลที่คาดหวัง
- จองสำเร็จ: `booking-result` แสดง "จองสำเร็จ"
- `POST /api/bookings` ตอบ 2xx และจองช่วง 15:00 เวลาไทย ของวันที่ 2026-11-06 ที่สาขา BR-012
  (15:00 เวลาไทย = `2026-11-06T08:00:00.000Z`)

## ผลที่เกิดจริง
- `booking-result` แสดง "ช่วงเวลานี้เต็มแล้ว กรุณาเลือกเวลาอื่น"
- `POST /api/bookings` → **409** `{"error":{"code":"BOOKING_SLOT_FULL","message":"slot is full"}}`
- request body ที่ส่งไป: `{"branchId":"BR-012","service":"deposit-withdraw","slotStart":"2026-11-06T15:00:00.000Z"}`
  → `slotStart` เป็น 15:00 **UTC** (= 22:00 เวลาไทย) ไม่ใช่ 15:00 เวลาไทย
- server log ยืนยันว่าตีความเป็น 22:00 เวลาไทย ซึ่งสาขาปิดแล้ว (`resolvedLocalSlot":"2026-11-06 22:00","capacity":0`)
- ขณะที่ `GET /api/slots?branch=BR-012&date=2026-11-06` → 200 และบอก slot "15:00" `remaining=3` (หน้าจอจึงแสดงว่าง)

## ทำซ้ำได้บ่อยแค่ไหน
- CI: **2/2** (chromium, mobile-safari) ใน run #1873
- ทดสอบมือบน UAT: ช่วง 15:00 และ 15:30 ไม่ผ่านทุกครั้งที่ลอง · สาขา BR-012 และ BR-005 เป็นเหมือนกัน (สาขาปิด 15:30)
- **ไม่เกิดเมื่อ:** จองช่วง 09:00 / 10:30 / 13:00 บน UAT (ผ่าน) · test `create-booking.spec.ts:22` จอง 09:00 วันจันทร์ ผ่าน · เครื่อง QA (TZ Asia/Bangkok) `npm run dev` ต่อ DB local จอง 15:00 ผ่าน

## หลักฐาน
- screenshot : `test-results/create-booking-15-00-chromium/test-failed-1.png`
- trace      : `test-results/create-booking-15-00-chromium/trace.zip` (มี network ทั้ง GET slots และ POST bookings)
- video      : `test-results/create-booking-15-00-chromium/video.webm`
- server log (UAT): `requestId=req_8d21f0` (chromium), `requestId=req_8d22a4` (mobile-safari)
  ```json
  {"level":"warn","time":"2026-11-02T09:14:31.882Z","module":"booking","requestId":"req_8d21f0",
   "msg":"slot full","branchId":"BR-012","slotStart":"2026-11-06T15:00:00.000Z",
   "resolvedLocalSlot":"2026-11-06 22:00","capacity":0}
  ```
- ข้อมูลในรายงานนี้ไม่มีข้อมูลส่วนบุคคล: `qa-user-07` เป็น user สังเคราะห์, request/response/log ไม่มีเลขบัตร/เบอร์/เลขบัญชี

## ข้อสังเกตของ QA (ไม่ใช่การวินิจฉัย)
- ค่าเวลาที่หน้าจอแสดง (15:00) ถูกส่งไปเป็น `15:00:00.000Z` ตรงตัว — ดูเหมือนเวลาท้องถิ่นถูกติดป้าย UTC ระหว่างทาง ทำให้ server เลื่อนไป +7 ชม.
- เกิดเฉพาะ UAT / runner TZ=UTC · ไม่เกิดบนเครื่องที่ TZ=Asia/Bangkok → ความต่างอยู่ที่ timezone ของ environment
- commit ที่น่าสงสัย: `refactor: move slot time handling to date-fns-tz` บน release/2026.11 (2026-10-30)
- ยังไม่ได้เก็บ request body ของเคสที่ "ผ่าน" (09:00–13:00) มาเทียบ — ถ้า dev ต้องการ QA เก็บ trace ให้ได้
- test ไม่ได้ผิด: GET slots บอกว่าง 3 ที่ และเคสเดียวกันผ่านบน TZ ไทย จึงจดเป็นบั๊กของระบบ ไม่แก้ test

## ผลกระทบ
- ลูกค้าปลายทางของออมทรัพย์เกษตรไทยจองคิวช่วงท้ายวัน (15:00–15:30) ไม่ได้ทุกสาขาที่ทดสอบ ทั้งที่หน้าจอบอกว่าง → ประสบการณ์แย่และ slot ว่างเสียเปล่า
- ผูกกับ deadline deploy release/2026.11 วันที่ **2026-11-10** — ถ้าไม่แก้ ควรเลื่อน/ไม่ปล่อย release นี้
- ถ้าต้นเหตุคือการแปลง timezone อาจกระทบส่วนอื่นที่ใช้ slot time (ยกเลิกนัด, แจ้งเตือน) — แนะนำให้ re-test หลังแก้
