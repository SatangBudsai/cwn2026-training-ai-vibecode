# [BUG] จองช่วง 15:00 ขึ้น "เต็มแล้ว" (409) ทั้งที่หน้าจอบอกว่าง 3 ที่ บน UAT

ระบบ / repo / เวอร์ชัน : kaset-appointment-web · release/2026.11 · 3b7e9f1 (CI run #1873)
สภาพแวดล้อม          : uat · https://uat.kaset-appointment.novatech.example · Playwright 1.48.2 chromium + mobile-safari · runner TZ=UTC (ผู้ใช้/สาขาอยู่ Asia/Bangkok, UTC+7)
ความรุนแรง (Severity) : Sev2 — จองไม่ได้บางช่วงเวลา (15:00 ขึ้นไป) ในหลายสาขา ทั้งที่ควรจองได้
ความเร่งด่วน (Priority): P1 — ต้องแก้ก่อน release ถัดไป (ลูกค้าเกษตรไทยจะ deploy release นี้ 2026-11-10)
พบเมื่อ / โดย          : 2026-11-02 · แบงค์ ศักดิ์ดี (qa-bank) · จาก test `booking/create-booking.spec.ts:41` "จองช่วงเวลา 15:00 วันศุกร์ได้" + ทดสอบมือบน UAT

## ขั้นตอนทำซ้ำ
1. เปิด https://uat.kaset-appointment.novatech.example แล้ว login ด้วย user ทดสอบ `qa-user-07` (OTP)
2. ไปที่ `/booking/new?branch=BR-012`
3. ประเภทบริการ: เลือก `deposit-withdraw` (ฝาก-ถอน)
4. วันที่: `2026-11-06` (วันศุกร์)
5. กดปุ่มช่วงเวลา `15:00` — หน้าจอแสดง "ว่าง 3 ที่"
6. กด "ยืนยันการจอง"
7. ดูข้อความในกล่องผลลัพธ์ (`data-testid="booking-result"`)

## ผลที่คาดหวัง
ข้อความ "จองสำเร็จ" และได้นัด BR-012 วันศุกร์ 6 พ.ย. 2026 เวลา 15:00 (เวลาไทย) เพราะ `GET /api/slots` บอกว่าช่วง 15:00 เหลือ 3 ที่

## ผลที่เกิดจริง
- ขึ้นข้อความ "ช่วงเวลานี้เต็มแล้ว กรุณาเลือกเวลาอื่น" (`<div role="alert" data-testid="booking-result">`)
- `POST /api/bookings` ตอบ **409** `{"error":{"code":"BOOKING_SLOT_FULL","message":"slot is full"}}`
- ไม่มีนัดถูกสร้าง

## ทำซ้ำได้บ่อยแค่ไหน
- CI: 2 / 2 (chromium และ mobile-safari ล้มเหมือนกัน, 409 ทั้งคู่)
- ทดสอบมือบน UAT: ล้มทุกครั้งที่ลองช่วง 15:00 และ 15:30
- เกิดเฉพาะเงื่อนไข: ช่วงเวลาตั้งแต่ 15:00 ขึ้นไป (สาขาปิด 15:30) · เป็นทั้ง BR-012 และ BR-005 · บน UAT
- ไม่เกิดเมื่อ: จอง 09:00 / 10:30 / 13:00 บน UAT (ผ่าน) · รันบนเครื่อง local (TZ Asia/Bangkok, `npm run dev` ต่อ DB local) จอง 15:00 ผ่าน

## หลักฐาน
- ภาพหน้าจอ / วิดีโอ / trace (chromium):
  - `test-results/create-booking-15-00-chromium/test-failed-1.png`
  - `test-results/create-booking-15-00-chromium/trace.zip`
  - `test-results/create-booking-15-00-chromium/video.webm`
- request/response (จาก trace):
  ```
  GET  /api/slots?branch=BR-012&date=2026-11-06   200  (slot "15:00" remaining=3)
  POST /api/bookings                               409  {"error":{"code":"BOOKING_SLOT_FULL","message":"slot is full"}}
       request body: {"branchId":"BR-012","service":"deposit-withdraw","slotStart":"2026-11-06T15:00:00.000Z"}
  ```
- log ฝั่ง server (uat):
  - chromium `requestId=req_8d21f0`
    ```
    {"level":"warn","time":"2026-11-02T09:14:31.882Z","module":"booking","requestId":"req_8d21f0",
     "msg":"slot full","branchId":"BR-012","slotStart":"2026-11-06T15:00:00.000Z",
     "resolvedLocalSlot":"2026-11-06 22:00","capacity":0}
    ```
  - mobile-safari `requestId=req_8d22a4` (409 เหมือนกัน)

## ข้อสังเกตของ QA (ไม่ใช่การวินิจฉัย)
- หน้าจอเลือก 15:00 (เวลาไทย) แต่ request ส่ง `slotStart` เป็น `2026-11-06T15:00:00.000Z` คือ 15:00 **UTC** และ server แปลงเป็น `resolvedLocalSlot: 2026-11-06 22:00` (= +7 ชม.) ซึ่งเป็นเวลาที่สาขาปิดแล้ว จึงได้ `capacity: 0` → 409
- ตัวเลข "ว่าง 3 ที่" (`GET /api/slots`) กับผลจอง (`POST /api/bookings`) ไม่ตรงกัน แปลว่าสองจุดนี้อาจตีความเวลาไม่เหมือนกัน
- ต่างกันระหว่างกรณีผ่าน/ไม่ผ่าน: local (TZ Asia/Bangkok + DB local) ผ่าน · UAT (runner TZ=UTC) ไม่ผ่าน
- commit ที่น่าสงสัย: "refactor: move slot time handling to date-fns-tz" (dev: มิว `dev-mew`) เข้า release/2026.11 เมื่อ 2026-10-30 (ยังไม่มี hash ของ commit นี้ใน log)
- จุดที่ยังอธิบายไม่ได้ ฝาก Dev ตรวจด้วย: ถ้าเวลาเลื่อน +7 ชม. ทุกช่วง 09:00–13:00 ก็น่าจะล้มด้วย (เลยเวลาปิด) แต่กลับผ่าน · ไม่มี trace ของเคสที่ผ่านมาเทียบ — ควรดู `slotStart` ของเคส 09:00 ด้วย

## ผลกระทบ
- ลูกค้าปลายทางของเกษตรไทยจองช่วงบ่าย (15:00–15:30) ไม่ได้ในทุกสาขาที่ลองแล้ว (BR-012, BR-005) ทั้งที่ระบบโชว์ว่าว่าง → เสียคิวช่วงบ่ายและสับสนกับข้อความ "เต็มแล้ว"
- จำนวนสาขาที่โดนทั้งหมดยังไม่ได้ตรวจ (ลองแค่ 2 สาขา)
- deadline: เกษตรไทย deploy release/2026.11 วันที่ 2026-11-10

---
ข้อมูลทดสอบ: `qa-user-07` เป็นข้อมูลสังเคราะห์ ไม่ใช่ลูกค้าจริง · รายงานนี้ไม่มีเลขบัตร/เบอร์/เลขบัญชีของใคร (ตาม customer-data-policy v1.4)
