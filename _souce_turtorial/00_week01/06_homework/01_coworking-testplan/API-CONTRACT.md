# สัญญา API ขั้นต่ำ (ทุกทีมต้องมีเหมือนกัน)

เว็บของแต่ละทีม AI สร้างเองจึงหน้าตาไม่เหมือนกัน แต่ **ขั้น 5 (แลกบั๊กข้ามทีม)** ต้องรันแผนของทีมหนึ่งกับเว็บของอีกทีม และ **ขั้น 3 (property test)** ต้องยิง API ตรง
จึงบังคับให้ทุกเว็บมี endpoint และ `data-testid` ชุดเดียวกันนี้ **ใส่ไฟล์นี้ลงในพรอมต์สร้างเว็บ (`BUILD-PROMPT.md`) ทั้งไฟล์**
เพิ่ม endpoint อื่นได้ แต่ห้ามเปลี่ยนชื่อ รูปแบบ หรือความหมายของที่อยู่ในไฟล์นี้

## 1. พื้นฐาน

| เรื่อง | ค่า |
|---|---|
| เว็บ | `http://localhost:3000` (Docker โปรเจกต์ `cowork-web`) |
| ฐานข้อมูล | PostgreSQL 16 ใน Docker **แยกอีกโปรเจกต์** `cowork-db` พอร์ตเครื่องเรา `5434` |
| เวลา | ISO 8601 พร้อม offset `+07:00` เสมอ เช่น `2026-11-18T17:00:00+07:00` |
| เงิน | หน่วย **สตางค์ (integer)** ใน API ทุกจุด (กันปัญหาทศนิยม) หน้าเว็บแสดงเป็นบาท |
| ผู้ใช้ | ส่ง header `X-Test-User: <member_id>` แทนการล็อกอินจริง (ใช้ได้เฉพาะเมื่อ `TEST_MODE=1`) · ไม่ส่ง = ลูกค้าไม่ล็อกอิน |
| error | HTTP 4xx + `{ "error": "<CODE>", "message": "<ไทย>" }` · CODE เป็นตัวพิมพ์ใหญ่คั่นด้วย `_` |

## 2. endpoint สำหรับทดสอบ (มีเฉพาะ `TEST_MODE=1`)

| method | path | ทำอะไร | ตอบ |
|---|---|---|---|
| POST | `/api/test/reset` | ล้างข้อมูลทั้งหมดแล้ว seed ใหม่ตาม `TEST-DATA.md` · เวลาระบบกลับเป็นพุธ 18 พ.ย. 2026 10:00 | `{ "ok": true }` |
| POST | `/api/test/clock` | ตั้งเวลาระบบ body `{ "now": "<ISO>" }` (ใช้ทดสอบยกเลิก/no-show/ขึ้นเดือนใหม่) | `{ "ok": true, "now": "<ISO>" }` |
| GET | `/api/test/bug-mode` | โหมดบั๊กปัจจุบัน | `{ "bugMode": 0 \| 1 \| 2 }` |

## 3. endpoint ของระบบ

| method | path | body / query | ตอบ (สำเร็จ) |
|---|---|---|---|
| GET | `/api/spaces` | — | `[{ "id": "DESK-01", "type": "desk" \| "small" \| "large", "hourlyRate": 6000 }]` |
| GET | `/api/me` | (ต้องมี `X-Test-User`) | `{ "id", "name", "tier": "BASIC" \| "PLUS" \| "PRO", "lastMonthHours", "hoursToNextTier", "bannedUntil": "<ISO>" \| null }` |
| POST | `/api/quote` | `{ "spaceId", "start", "end", "coupon"?: string }` | ดูข้อ 4 · **ไม่บันทึกอะไร** |
| POST | `/api/bookings` | เหมือน `/api/quote` + `"taxInfo"?: { "company", "taxId" }` | `201` + `{ "id": "BK-<ตัวเลข>", "status": "CONFIRMED", "quote": { ...ข้อ 4 } }` |
| GET | `/api/bookings/:id` | — | `{ "id", "spaceId", "start", "end", "status", "quote", "taxIdMasked" }` |
| POST | `/api/bookings/:id/cancel` | — | `{ "status": "CANCELLED", "refund": <สตางค์> }` |
| POST | `/api/admin/bookings/:id/no-show` | (พนักงาน: `X-Test-User: STAFF`) | `{ "status": "NO_SHOW" }` |
| GET | `/api/admin/bookings?date=YYYY-MM-DD` | (พนักงาน) | รายการจองของวันนั้น |

**จองทับกัน** ต้องตอบ `409` + `{ "error": "SLOT_TAKEN" }` · error อื่นตั้งชื่อเองได้ แต่ต้องเขียนไว้ใน `REQUIREMENTS.md`

## 4. รูปแบบใบเสนอราคา (quote) — ตัวที่ property test ใช้เทียบ

```json
{
  "spaceId": "SMALL-2",
  "start": "2026-11-18T16:00:00+07:00",
  "end": "2026-11-18T18:00:00+07:00",
  "lines": [
    { "from": "2026-11-18T16:00:00+07:00", "to": "2026-11-18T17:00:00+07:00", "peak": false, "amount": 25000 },
    { "from": "2026-11-18T17:00:00+07:00", "to": "2026-11-18T18:00:00+07:00", "peak": true,  "amount": 30000 }
  ],
  "subtotal": 55000,
  "discount": { "type": "MEMBER" | "COUPON" | "NONE", "code": "PLUS" | "WELCOME100" | "LONGDAY15" | null, "amount": 5500 },
  "total": 49500,
  "reason": "ส่วนลดสมาชิก Plus ถูกกว่าคูปอง"
}
```

กติกาของรูปแบบนี้ (ไม่ใช่กติการาคา — กติการาคามาจาก `INTERVIEW.md` เท่านั้น):
- `subtotal` = ผลรวม `lines[].amount` · `total` = `subtotal − discount.amount`
- `lines` แบ่งช่วงที่จุดเปลี่ยนพีค/ไม่พีคเท่านั้น
- การปัดเศษเป็นเรื่องที่ **ร้านยังไม่ตอบ** ให้ตัดสินใน `REQUIREMENTS.md` พร้อมป้ายที่มา แล้วทำให้เว็บ แผน และ oracle ใช้แบบเดียวกัน

## 5. `data-testid` ขั้นต่ำ

| testid | อยู่ที่ |
|---|---|
| `space-card-<id>` | การ์ดห้อง/โต๊ะ |
| `booking-date`, `booking-start`, `booking-end` | ช่องเลือกวันเวลา |
| `coupon-input`, `quote-button` | คูปอง + ปุ่มขอราคา |
| `quote-line`, `quote-subtotal`, `quote-discount`, `quote-total`, `quote-reason` | ใบเสนอราคาบนหน้าจอ |
| `confirm-booking` | ปุ่มยืนยัน |
| `booking-id`, `booking-status` | หน้าหลังจองสำเร็จ |
| `cancel-booking`, `refund-amount` | ยกเลิก |
| `member-tier`, `hours-to-next-tier` | หน้าข้อมูลสมาชิก |
| `error-message` | ข้อความ error ทุกจุด |
| `<body data-bug-mode="0|1|2">` | บอกโหมดบั๊กปัจจุบัน |

## 6. โหมดบั๊ก

| ค่า | ใครฝัง | เฉลยอยู่ที่ |
|---|---|---|
| `BUG_MODE=0` | — | — |
| `BUG_MODE=1` | Claude ตอนสร้างเว็บ (เลือกเอง 3 ตัวแบบบท 04) | `web/BUGS.md` (ห้ามเปิดจนจบขั้น 5) |
| `BUG_MODE=2` | **ทีมคู่** (ขั้น 5) | ไฟล์เข้ารหัสที่ส่งผู้สอน |
