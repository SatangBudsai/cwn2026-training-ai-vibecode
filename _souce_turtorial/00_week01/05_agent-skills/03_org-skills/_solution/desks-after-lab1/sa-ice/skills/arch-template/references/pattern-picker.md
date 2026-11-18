# เลือกแบบแผน: ระบบแบบไหนใช้อะไร

ไล่ทีละ "ส่วน" ของระบบ (ไม่ใช่ทั้งระบบทีเดียว) ตอบคำถามตามลำดับ หยุดที่ข้อแรกที่ใช่

| # | คำถาม | ถ้าใช่ |
|---|---|---|
| 1 | เป็นภาษา/runtime อื่น (Python ML, ไลบรารีเฉพาะ)? | **service แยก** (เกณฑ์ 2.1) |
| 2 | ต้องถือ cert / อยู่คนละเครือข่าย / ลูกค้าบังคับแยก (mTLS core banking, HSM)? | **service แยก** (เกณฑ์ 2.4) |
| 3 | โหลดสูงกว่าส่วนอื่น > 10 เท่า หรือต้อง scale อิสระ? | **service แยก** (เกณฑ์ 2.2) — ต้องมีตัวเลขโหลดยืนยัน ไม่มี → ไม่แยก แล้วใส่ "ประเด็นที่ต้องยืนยัน" |
| 4 | คนละทีม / ปล่อยคนละรอบชัดเจน? | **service แยก** (เกณฑ์ 2.3) |
| 5 | ผู้ใช้ไม่ต้องรอผลทันที (แจ้งเตือน, export, sync, batch)? | **โมดูลใน monolith + job ในคิว** (worker = image เดียวกัน รันโหมด worker) |
| 6 | อย่างอื่นทั้งหมด | **โมดูลใน monolith** |

คิว: BullMQ เป็นค่าเริ่มต้น · เปลี่ยนเป็น RabbitMQ เมื่อ ≥ 2 service (ไม่ใช่โมดูล) ต้อง subscribe event เดียวกัน → ADR

## โครงซ้ำที่เจอบ่อย (80% ที่ใช้ซ้ำได้)

| ประเภทระบบ | โมดูลมาตรฐาน | service แยกที่มักเกิด | คิว | จุดระวัง |
|---|---|---|---|---|
| **จองคิว / นัดหมายสาขา** (เกษตรไทย 2025, นครหลวงพัฒนา 2026) | `booking`, `branch`, `customer`, `counter`, `notification`, `report`, `audit` (+ `kiosk` ถ้ามีตู้คิว) | `forecast-service` ถ้ามี ML · `core-connector` ถ้าดึงข้อมูลลูกค้าจาก core banking | แจ้งเตือน LINE/SMS, reminder (repeatable job), export, batch พยากรณ์ | กันจองซ้อน = slot lock Redis (TTL) + unique constraint DB · walk-in เข้าตารางคิวเดียวกัน |
| **พอร์ทัลติดตามสถานะ / workflow** (สยามรุ่งเรือง loan 2024) | `case`/`application`, `status`, `notification`, `report`, `audit` | `<system>-connector` ถ้าระบบต้นทางต้อง mTLS/VPN | sync สถานะจากระบบต้นทาง (poll ทุก N นาที + รับ webhook) | webhook ต้อง idempotent · บอกว่าข้อมูลไหน source of truth |
| **พอร์ทัลยื่นคำร้อง + แนบไฟล์** (เช่น dispute บัตร) | `claim`/`dispute`, `document`, `case-work`, `sla`, `notification`, `audit` | `card-connector` ถ้าต้องแยกเครือข่าย | สแกนไวรัสไฟล์, แจ้งเตือน, SLA timer | PCI DSS: ห้ามเก็บเลขบัตรเต็ม ใช้ token, โชว์ 4 หลักท้าย · ไฟล์ → object storage ไทย |
| **สมาชิก + ชำระเงิน** (ShopDee, FitPlus, BaanRai, DentDee) | `auth`, `member`, `payment`, `notification`, `audit` | ปกติไม่มี · webhook gateway โหลดสูงมาก → พิจารณาเกณฑ์ 2.2 | ส่งอีเมล/SMS/LINE | webhook payment idempotency · token 15 นาที + rotate · alert TLS cert (บทเรียน incident ก.ย. 2026) |

## ช่องทาง/ระบบที่เจอบ่อยและวิธีวาดเส้น

| ระบบ | เส้นที่ใช้ |
|---|---|
| LINE OA / LIFF | ผู้ใช้ → LIFF `HTTPS (sync)` · LINE → เรา `Webhook HTTPS (async)` · เรา → LINE `Messaging API HTTPS (async)` ผ่าน worker |
| Core banking / ระบบหลักธนาคาร | web → `<project>-core-connector` `REST internal (sync)` → Bank API Gateway `REST/mTLS (sync)` |
| SSO พนักงาน (Entra ID / AD) | `OIDC (sync)` หรือ `SAML (sync)` |
| ตู้คิว / อุปกรณ์สาขา | `REST (sync)` ขาเข้า + `REST (async)` sync กลับผ่าน worker — ถ้า TOR ไม่บอกทิศทาง ให้ถามลูกค้า |
| ML | worker ส่ง job → forecast-service `REST (async)` · forecast อ่าน DB แบบ read-only จาก view ที่ไม่มี PII · โมเดลอยู่ใน MLflow registry (ถอยรุ่นได้โดยเปลี่ยน stage) |
| SMS / email gateway | worker → gateway `REST (async)` · ถามว่าใช้ของลูกค้าหรือของเรา |
