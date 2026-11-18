# สถาปัตยกรรมระบบจองคิวสาขาและพยากรณ์ปริมาณคิว (deal-001)

> ลูกค้า: ธนาคารนครหลวงพัฒนา · TOR NLP-PROC-2026-114 · project code `nlp-queue`
> ผู้จัดทำ: ไอศวรรย์ บุญมา (`sa-ice`) · ร่าง v0.1 · 2026-11-04 · ตามมาตรฐานสถาปัตยกรรมโนวาเทค v4 (`arch-standards.md`)
> ปลายทางเมื่อเปิดโปรเจกต์: `docs/architecture.md` ใน repo `nlp-queue-web`
> สถานะ: ร่างสำหรับข้อเสนอทางเทคนิค (TOR ข้อ 7.1) — รอ `sa-ton` รีวิว

---

## 1. สรุปแบบแผนที่เลือก

| เรื่อง | เลือก | เหตุผล (อ้างมาตรฐาน) |
|---|---|---|
| ตัวหลัก | **Modular monolith** `nlp-queue-web` (Next.js + Node.js/TypeScript) | ค่าเริ่มต้น §1 · ทีม 4–8 คน, งาน 6 เดือน |
| แยก service | `nlp-forecast-service` (Python) | §2 ข้อ 1 ภาษา/runtime ต่าง (ML) |
| แยก service | `nlp-core-connector` | §2 ข้อ 4 เชื่อม core banking ผ่าน mTLS ต้องแยกเครือข่าย |
| ไม่แยก | ตัวรับ LINE webhook, ตัวเชื่อม Q-Matic | โหลดไม่ถึง 10 เท่าของระบบหลัก (120 สาขา) → อยู่ในโมดูล `line`, `kiosk` |
| คิวงาน | **BullMQ บน Redis** | §3 ระบบขนาดกลาง, event ไม่มีหลาย service subscribe ตัวเดียวกัน |
| ข้อมูล | PostgreSQL managed (HA) `nvt_nlpqueue_prod` + Redis | §4 |
| ที่ตั้ง | Cloud region ประเทศไทยเท่านั้น | §4 ระบบลูกค้าธนาคาร |

---

## 2. C4 ระดับ 1 — System Context

```mermaid
flowchart LR
    customer["ลูกค้าธนาคาร<br/>[Person]<br/>จอง / เลื่อน / ยกเลิกคิว"]
    staff["พนักงานสาขา<br/>[Person]<br/>เรียกคิว ย้ายช่อง"]
    manager["ผู้จัดการสาขา<br/>[Person]<br/>ปรับช่องบริการ ดูพยากรณ์ 7 วัน"]
    exec["ผู้บริหารธนาคาร<br/>[Person]<br/>Dashboard + Excel"]

    nlpq["ระบบจองคิวสาขา<br/>และพยากรณ์คิว<br/>[Software System]<br/>โนวาเทค"]

    line["LINE Platform<br/>[External]<br/>Messaging API / LIFF"]
    sms["SMS Gateway<br/>[External]<br/>ส่ง OTP"]

    subgraph bank["เครือข่ายธนาคารนครหลวงพัฒนา (trust boundary)"]
        core["Core Banking<br/>Customer Lookup API<br/>[Existing System]"]
        entra["Microsoft Entra ID<br/>[Existing System] SSO"]
        qmatic["ตู้กดบัตรคิว Q-Matic<br/>[Existing System] 120 สาขา"]
    end

    customer -- "HTTPS (sync)" --> nlpq
    customer -- "LINE app / LIFF (sync)" --> line
    line -- "LIFF HTTPS + Webhook (sync)" --> nlpq
    nlpq -- "Messaging API REST (async)" --> line
    nlpq -- "REST/HTTPS (async)" --> sms
    staff -- "HTTPS (sync)" --> nlpq
    manager -- "HTTPS (sync)" --> nlpq
    exec -- "HTTPS (sync)" --> nlpq
    nlpq -- "REST/mTLS ผ่าน API Gateway (sync)" --> core
    nlpq -- "OIDC (sync)" --> entra
    qmatic -- "REST/HTTPS (sync)" --> nlpq

    classDef ours fill:#0B2545,stroke:#0B2545,color:#FFFFFF
    classDef ext fill:#CBD2D9,stroke:#7B8794,color:#0B2545
    class nlpq ours
    class customer,staff,manager,exec,line,sms,core,entra,qmatic ext
    style bank fill:none,stroke:#7B8794,stroke-dasharray:6 4
```

---

## 3. C4 ระดับ 2 — Container

```mermaid
flowchart TB
    customer["ลูกค้าธนาคาร<br/>[Person]"]
    branchUsers["พนักงาน / ผู้จัดการสาขา / ผู้บริหาร<br/>[Person]"]
    line["LINE Platform<br/>[External]"]
    sms["SMS Gateway<br/>[External]"]

    subgraph nova["Cloud region ประเทศไทย — เครือข่ายโนวาเทค (trust boundary)"]
        web["nlp-queue-web<br/>[Container: Next.js + Node.js/TS]<br/>Modular monolith<br/>booking · branch · customer · kiosk<br/>line · notification · staffing · report · audit"]
        worker["nlp-queue-worker<br/>[Container: Node.js/TS]<br/>BullMQ workers จาก codebase เดียวกัน"]
        connector["nlp-core-connector<br/>[Container: Node.js/TS]<br/>แยกเครือข่าย ถือ client cert mTLS"]
        forecast["nlp-forecast-service<br/>[Container: Python]<br/>train + predict ทุกคืน, model registry, rollback"]
        pg[("PostgreSQL managed HA<br/>nvt_nlpqueue_prod<br/>schema ต่อโมดูล + forecast.*")]
        redis[("Redis<br/>cache TTL · session · rate limit<br/>slot lock · BullMQ")]
        obj[("Object storage ภูมิภาคไทย<br/>ไฟล์ Excel export")]
    end

    subgraph bank["เครือข่ายธนาคารนครหลวงพัฒนา (trust boundary)"]
        apigw["Bank API Gateway<br/>[Existing]"]
        core["Core Banking<br/>Customer Lookup API<br/>[Existing]"]
        entra["Microsoft Entra ID<br/>[Existing]"]
        qmatic["Q-Matic kiosk<br/>[Existing]"]
    end

    customer -- "HTTPS (sync)" --> web
    customer -- "LIFF (sync)" --> line
    line -- "Webhook HTTPS (sync)" --> web
    branchUsers -- "HTTPS (sync)" --> web
    web -- "OIDC (sync)" --> entra
    qmatic -- "REST/HTTPS ticket (sync)" --> web

    web -- "SQL/TLS (sync)" --> pg
    web -- "Redis TLS (sync)" --> redis
    web -- "BullMQ enqueue (async)" --> redis
    redis -- "BullMQ consume (async)" --> worker
    worker -- "SQL/TLS (sync)" --> pg
    worker -- "Messaging API REST (async)" --> line
    worker -- "REST/HTTPS OTP + แจ้งเตือน (async)" --> sms
    worker -- "S3 API (async)" --> obj

    web -- "REST internal (sync)" --> connector
    connector -- "REST/mTLS (sync)" --> apigw
    apigw -- "REST (sync)" --> core

    redis -- "BullMQ forecast.requested (async)" --> forecast
    forecast -- "SQL/TLS อ่าน view ไม่ระบุตัวตน + เขียน forecast.* (sync)" --> pg
    web -- "REST internal ดึงผลพยากรณ์ (sync)" --> forecast

    classDef ours fill:#0B2545,stroke:#0B2545,color:#FFFFFF
    classDef ext fill:#CBD2D9,stroke:#7B8794,color:#0B2545
    classDef data fill:#13A89E,stroke:#0E7F77,color:#FFFFFF
    class web,worker,connector,forecast ours
    class customer,branchUsers,line,sms,apigw,core,entra,qmatic ext
    class pg,redis,obj data
    style nova fill:none,stroke:#0B2545,stroke-dasharray:6 4
    style bank fill:none,stroke:#7B8794,stroke-dasharray:6 4
```

---

## 4. โมดูลใน `nlp-queue-web`

คุยกันผ่าน `modules/<name>/index.ts` เท่านั้น ห้ามอ่านตารางข้ามโมดูล

| โมดูล | schema | หน้าที่ (TOR) |
|---|---|---|
| `booking` | `booking.*` | จอง / เลื่อน / ยกเลิก, slot 15 นาที, กันจองซ้อนด้วย slot lock ใน Redis (3.1) |
| `branch` | `branch.*` | 120 สาขา, ประเภทบริการ, ช่องบริการต่อช่วงเวลา, หน้าจอเรียกคิว / ย้ายช่อง / เวลาบริการจริง (3.2) |
| `customer` | `customer.*` | ยืนยันตัวตน เลขบัตร + วันเกิด + OTP, เรียก `nlp-core-connector` (3.1, 3.4) |
| `kiosk` | `kiosk.*` | รับบัตรคิว walk-in จาก Q-Matic เข้าคิวเดียวกัน (3.1, 3.4) |
| `line` | — | LIFF + webhook ของ LINE OA (3.1, 3.4) |
| `notification` | `notification.*` | แจ้งเตือน 1 วัน / 30 นาที / เหลือ 3 คิว ผ่าน LINE หรือ SMS (3.1) |
| `staffing` | — | แสดงผลพยากรณ์ 7 วันให้ผู้จัดการสาขา (ดึงจาก `nlp-forecast-service`) (3.2, 3.3) |
| `report` | `report.*` | Dashboard รายสาขา/ภาค/ประเทศ, export Excel (3.5) |
| `audit` | `audit.*` | Audit log ทุกการเข้าถึงข้อมูลลูกค้า เก็บ ≥ 2 ปี (4) |

## 5. คิวและ event (BullMQ)

| คิว / event | ผู้ส่ง → ผู้รับ | หมายเหตุ |
|---|---|---|
| `booking.created` · `booking.rescheduled` · `booking.cancelled` | booking → notification | ตั้งเวลาแจ้งเตือน 1 วัน / 30 นาที |
| `queue.advanced` | branch → notification | แจ้งเมื่อเหลือ 3 คิว |
| `otp.requested` | customer → worker (SMS) | rate limit ต่อเบอร์ด้วย Redis |
| `ticket.issued` | kiosk → booking | walk-in เข้าคิวเดียวกัน |
| `report.requested` | report → worker | สร้าง Excel ลง object storage |
| `forecast.requested` | scheduler ทุกคืน → `nlp-forecast-service` | พยากรณ์ล่วงหน้า 7 วัน รายสาขารายชั่วโมง |
| `forecast.completed` | forecast → staffing | แจ้งผลพร้อมใช้ |
| `notification.failed` | worker → dead-letter + alert | หลัง retry ครบ |

ทุก job idempotent (ใช้ job id = id ของ event), retry exponential backoff สูงสุด 5 ครั้ง, ล้มครบไป dead-letter queue + แจ้งเตือน

## 6. ข้อมูลและความปลอดภัย

- ฐานข้อมูล `nvt_nlpqueue_dev` / `nvt_nlpqueue_uat` / `nvt_nlpqueue_prod` — env มีแค่ `dev`, `uat`, `prod`
- เลขบัตรประชาชน: เก็บเป็น hash (HMAC มี key) ไว้ค้นหา + ถ้าต้องเก็บจริงให้เข้ารหัสระดับคอลัมน์ AES-256 (TOR 4) — เบอร์โทรเข้ารหัสระดับคอลัมน์
- CIF / ชื่อลูกค้าจาก core banking: เก็บเท่าที่จำเป็นต่อการจอง, ทุกการเรียกบันทึกลง `audit.*`
- TLS 1.2+ ทุกเส้น, เส้นไป core banking เป็น mTLS ผ่าน `nlp-core-connector` เท่านั้น
- Redis ทุก key มี TTL (slot lock, session, OTP, cache)
- ข้อมูลบัตรคิวย้อนหลัง 24 เดือนจากธนาคาร (ไม่ระบุตัวตน) โหลดเข้า schema ของ forecast เท่านั้น
- ก่อนเปิดใช้งาน: penetration test โดยผู้ทดสอบที่ธนาคารกำหนด

## 7. Observability

- Log JSON ตาม `coding-rules.md` ข้อ 8 → log management กลาง, tracing OpenTelemetry ข้าม web / worker / connector / forecast
- Metric: request rate, error rate, latency p95, queue depth, DB connections + MAPE ของโมเดลหลังใช้งานจริง
- Alert: error rate > 2% 5 นาที, p95 > 2 วินาที, queue ค้าง > 1,000 job, **ใบรับรอง TLS (รวม client cert mTLS ของ connector) หมดอายุภายใน 21 วัน**
- `/healthz` และ `/readyz` (DB + Redis + คิว) ทุก container

## 8. ADR ที่ต้องเขียน (`docs/adr/`)

| เลข | เรื่อง |
|---|---|
| 0001 | แยก `nlp-forecast-service` (Python) — §2 ข้อ 1 |
| 0002 | แยก `nlp-core-connector` (mTLS, แยกเครือข่าย) — §2 ข้อ 4 |
| 0003 | ใช้ BullMQ ไม่ใช่ RabbitMQ (ยังไม่มี event ที่หลาย service subscribe) |
| 0004 | ให้ `nlp-forecast-service` มี schema `forecast.*` ในฐานเดียวกัน และอ่าน view ไม่ระบุตัวตนจาก `report.*` |

## 9. คำถามเปิด / สมมติฐาน (ต้องยืนยันกับลูกค้า)

1. ผู้ให้บริการ SMS OTP — TOR ไม่ระบุ (ธนาคารมี gateway เองหรือเราจัดหา)
2. เส้นทางเครือข่ายไป Bank API Gateway — internet + mTLS หรือ private link / VPN
3. ทิศทางการเชื่อม Q-Matic — ตู้ push เข้ามา หรือเราต้อง poll (สมมติว่าตู้เรียก REST ของเรา)
4. ลูกค้าเลือกช่องทางแจ้งเตือน LINE หรือ SMS เองได้หรือไม่
