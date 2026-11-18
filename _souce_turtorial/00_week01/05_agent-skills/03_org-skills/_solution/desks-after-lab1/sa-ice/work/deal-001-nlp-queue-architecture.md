# สถาปัตยกรรมระบบจองคิวสาขาและพยากรณ์ปริมาณคิว (deal-001)

> ลูกค้า: ธนาคารนครหลวงพัฒนา · อ้างอิง TOR `NLP-PROC-2026-114` · ร่างโดย ไอศวรรย์ บุญมา (`sa-ice`) · 3 พ.ย. 2026
> มาตรฐานที่ใช้: `arch-standards.md` v4 · ใช้เป็นหัวข้อ "สถาปัตยกรรม" ใน proposal และเป็น `docs/architecture.md` ของ repo
> project code: `nlpqueue` · repo prefix: `nlp-queue-*`, `nlp-*`

## 1. สรุป (อ่านบรรทัดนี้พอ)

ระบบหลักเป็น **modular monolith 1 ตัว** (`nlp-queue-web`) + แยก service เพียง **2 ตัว** ตามเกณฑ์มาตรฐาน: `nlp-forecast-service` (Python/ML — เกณฑ์ข้อ 2.1) และ `nlp-core-connector` (mTLS ไป core banking — เกณฑ์ข้อ 2.4) งานที่ไม่ต้องตอบทันที (แจ้งเตือน LINE, sync ตู้คิว, export Excel) ใช้ **BullMQ บน Redis** ทุกอย่างอยู่บน cloud region ประเทศไทย

| แบบแผน | ใช้กับ | เหตุผล |
|---|---|---|
| Modular monolith | จองคิว, สาขา, ลูกค้า, แจ้งเตือน, รายงาน, ตู้คิว | ทีม 4–8 คน ภาระใกล้กัน deploy พร้อมกัน |
| Service แยก | `nlp-forecast-service` | runtime ต่าง (Python, LightGBM) รอบปล่อยโมเดลต่างจากแอป |
| Service แยก | `nlp-core-connector` | ต้องแยกเครือข่าย + ถือ client cert mTLS ของธนาคาร |
| คิวงาน (BullMQ) | แจ้งเตือน, sync ตู้ Q-Matic, export รายงาน, สั่งรันพยากรณ์รายคืน | ไม่ต้องตอบผู้ใช้ทันที, ต้อง retry ได้ |

## 2. C4 ระดับ 1 — Context

```mermaid
flowchart LR
  customer["ลูกค้าธนาคาร<br/>(เว็บ / LINE)"]
  staff["พนักงานสาขา<br/>ผู้จัดการสาขา"]
  exec["ผู้บริหาร"]

  subgraph nvt["ระบบที่เราสร้าง (cloud region ไทย)"]
    sys["ระบบจองคิวสาขา<br/>+ พยากรณ์คิว"]
  end

  subgraph bank["เครือข่ายธนาคาร (trust boundary)"]
    core["Core banking<br/>Customer Lookup API"]
    entra["Microsoft Entra ID<br/>(SSO)"]
    qmatic["ตู้กดบัตรคิว Q-Matic<br/>120 สาขา"]
  end
  line["LINE Platform<br/>Messaging API / LIFF"]
  sms["OTP / SMS gateway"]

  customer -->|"HTTPS (sync)"| sys
  customer -->|"LIFF HTTPS (sync)"| line
  line -->|"Webhook HTTPS (async)"| sys
  sys -->|"Messaging API HTTPS (async)"| line
  staff -->|"HTTPS (sync)"| sys
  exec -->|"HTTPS (sync)"| sys
  sys -->|"REST/mTLS ผ่าน API Gateway (sync)"| core
  sys -->|"OIDC (sync)"| entra
  qmatic <-->|"REST (sync)"| sys
  sys -->|"REST (async)"| sms

  classDef ours fill:#0B2545,stroke:#0B2545,color:#fff
  classDef ext fill:#CBD2D9,stroke:#9AA5B1,color:#1F2933
  class sys ours
  class core,entra,qmatic,line,sms ext
  style bank stroke-dasharray: 5 5
```

## 3. C4 ระดับ 2 — Container

```mermaid
flowchart TB
  subgraph nvt["Novatech cloud — region ไทย (VPC nvt-nlpqueue-prod)"]
    web["nlp-queue-web<br/>Next.js + Node.js/TS<br/>modular monolith"]
    worker["nlp-queue-web (worker)<br/>BullMQ consumers<br/>image เดียวกับ web"]
    forecast["nlp-forecast-service<br/>Python + LightGBM<br/>batch รายคืน + API อ่านผล"]
    conn["nlp-core-connector<br/>Node.js/TS<br/>ถือ client cert mTLS"]
    pg[("PostgreSQL managed HA<br/>nvt_nlpqueue_prod")]
    redis[("Redis<br/>cache / session / slot lock<br/>+ BullMQ")]
    obj[("Object storage ไทย<br/>ไฟล์ export Excel")]
    mlflow[("MLflow<br/>model registry")]
  end

  subgraph bank["เครือข่ายธนาคาร (trust boundary)"]
    apigw["Bank API Gateway"]
    core["Core banking<br/>Customer Lookup"]
    entra["Entra ID"]
    qmatic["Q-Matic"]
  end
  line["LINE Messaging API / LIFF"]

  web -->|"SQL/TLS (sync)"| pg
  web -->|"RESP/TLS (sync)"| redis
  web -->|"BullMQ (async)"| redis
  worker -->|"BullMQ (async)"| redis
  worker -->|"SQL/TLS (sync)"| pg
  worker -->|"HTTPS (async)"| line
  worker -->|"REST (async) sync บัตรคิว"| qmatic
  qmatic -->|"REST (sync) กดบัตร walk-in"| web
  line -->|"Webhook HTTPS (async)"| web
  web -->|"REST internal (sync)"| conn
  conn -->|"REST/mTLS (sync)"| apigw --> core
  web -->|"OIDC (sync)"| entra
  web -->|"REST internal (sync) อ่านผลพยากรณ์"| forecast
  worker -->|"BullMQ job forecast.requested → REST (async)"| forecast
  forecast -->|"SQL/TLS read-only (sync)"| pg
  forecast -->|"HTTPS (sync)"| mlflow
  worker -->|"S3 API (async)"| obj

  classDef ours fill:#0B2545,stroke:#0B2545,color:#fff
  classDef data fill:#13A89E,stroke:#0E7F77,color:#fff
  classDef ext fill:#CBD2D9,stroke:#9AA5B1,color:#1F2933
  class web,worker,forecast,conn ours
  class pg,redis,obj,mlflow data
  class apigw,core,entra,qmatic,line ext
  style bank stroke-dasharray: 5 5
```

### 3.1 รายการ container

| container | เทคโนโลยี | หน้าที่ | ทำไมแยก/ไม่แยก |
|---|---|---|---|
| `nlp-queue-web` | Next.js + Node.js/TS | เว็บจอง, LIFF, branch console, admin, dashboard, API | ค่าเริ่มต้นตามมาตรฐานข้อ 1 |
| `nlp-queue-web` (worker) | image เดียวกัน รันโหมด worker | consume BullMQ | process แยกเพื่อไม่ให้งาน async กิน latency ของ web แต่ยังเป็น codebase/deploy เดียว |
| `nlp-forecast-service` | Python 3.11, LightGBM, FastAPI | เทรน/พยากรณ์รายคืน, API คืนผล 7 วัน | เกณฑ์ข้อ 2.1 (runtime ต่าง) + 2.3 (รอบปล่อยโมเดลต่าง) → ADR-0001 |
| `nlp-core-connector` | Node.js/TS | ห่อ Customer Lookup API, ถือ cert mTLS, rate limit ไปธนาคาร | เกณฑ์ข้อ 2.4 (แยกเครือข่าย) → ADR-0002 |
| PostgreSQL | managed, HA | ข้อมูลหลัก | มาตรฐานข้อ 4 |
| Redis | managed | slot lock, session, cache (TTL ทุก key), rate limit OTP, BullMQ | มาตรฐานข้อ 3–4 |

## 4. C4 ระดับ 3 — โมดูลใน `nlp-queue-web` (เฉพาะส่วนซับซ้อน)

```mermaid
flowchart LR
  subgraph mono["nlp-queue-web — modules/"]
    booking["booking<br/>จอง/เลื่อน/ยกเลิก, slot 15 นาที"]
    branch["branch<br/>สาขา, ช่องบริการ, เวลาเปิด"]
    customer["customer<br/>ยืนยันตัวตน + OTP"]
    counter["counter<br/>เรียกคิว, ย้ายช่อง, เวลาบริการจริง"]
    kiosk["kiosk<br/>adapter Q-Matic (walk-in)"]
    notification["notification<br/>LINE / SMS ผ่านคิว"]
    report["report<br/>dashboard + export Excel"]
    forecastview["forecast<br/>proxy อ่านผลจาก forecast-service"]
    audit["audit<br/>log การเข้าถึงข้อมูลลูกค้า"]
  end
  booking --> branch
  booking --> customer
  booking -. "booking.created / booking.rescheduled / booking.cancelled (BullMQ async)" .-> notification
  kiosk --> booking
  counter --> booking
  counter -. "counter.called (async)" .-> notification
  customer --> audit
  report --> booking
  report --> counter
  forecastview --> branch

  classDef ours fill:#0B2545,stroke:#0B2545,color:#fff
  class booking,branch,customer,counter,kiosk,notification,report,forecastview,audit ours
```

- โมดูลคุยกันผ่าน `modules/<name>/index.ts` เท่านั้น · schema ฐานข้อมูลแยกต่อโมดูล: `booking.*`, `branch.*`, `customer.*`, `counter.*`, `kiosk.*`, `notification.*`, `report.*`, `audit.*`
- **กันจองซ้อน:** slot lock ใน Redis (`slot:{branch}:{date}:{slot}` TTL 120 วินาที) + unique constraint `(branch_id, slot_start, service_counter_seq)` ใน PostgreSQL เป็นด่านสุดท้าย
- **walk-in:** Q-Matic เรียก `POST /api/kiosk/tickets` → `kiosk` แปลงเป็นคิวในตารางเดียวกับ `booking` (ช่องทาง = `walk_in`) ลำดับคิวรวมเป็นชุดเดียว

## 5. Flow สำคัญ

### 5.1 จองคิวผ่าน LINE (ลูกค้าเดิม)

```mermaid
sequenceDiagram
  autonumber
  participant U as ลูกค้า (LIFF)
  participant W as nlp-queue-web
  participant C as nlp-core-connector
  participant B as Core banking
  participant R as Redis
  participant Q as BullMQ
  U->>W: เลขบัตร ปชช. + วันเกิด (HTTPS sync)
  W->>W: HMAC เลขบัตร → ค้นหา / ส่ง OTP (rate limit ใน Redis)
  U->>W: OTP
  W->>C: lookup(เลขบัตร) REST internal (sync)
  C->>B: Customer Lookup REST/mTLS (sync)
  B-->>C: ชื่อ, ระดับลูกค้า, CIF
  C-->>W: ผลลัพธ์ (ไม่ cache เลขบัตร)
  W->>W: audit.customer_accessed
  U->>W: เลือกสาขา / บริการ / slot
  W->>R: SET slot lock NX EX 120
  W->>W: INSERT booking (unique constraint)
  W->>Q: booking.created (async)
  Q-->>U: ยืนยันการจองทาง LINE (worker)
```

### 5.2 พยากรณ์รายคืน

1. 01:00 BullMQ repeatable job `forecast.requested` → worker เรียก `nlp-forecast-service` `POST /runs`
2. forecast-service อ่านข้อมูลคิวรายชั่วโมง (ไม่ระบุตัวตน) จาก view `report.hourly_queue` แบบ read-only
3. ใช้โมเดลรุ่น `Production` จาก MLflow registry → เขียนผล 7 วัน × 120 สาขา × ชั่วโมง ลง schema `forecast.*`
4. บันทึก MAPE ย้อนหลังของเมื่อวานเทียบของจริง (ติดตามความแม่นยำหลังใช้งาน ตาม TOR 3.3) · ถ้า MAPE 7 วัน > 20% → alert
5. ถอยกลับรุ่นเดิม = เปลี่ยน stage ใน MLflow แล้วรันใหม่ ไม่ต้อง deploy (TOR 3.3)
6. งานล้ม → retry exponential backoff 5 ครั้ง → `forecast.failed` เข้า dead-letter + แจ้งเตือน, dashboard แสดงผลรอบล่าสุดที่สำเร็จพร้อมวันที่

## 6. คิวและ event

| ชื่อ (`<domain>.<event>`) | ผู้ส่ง | ผู้รับ | หมายเหตุ |
|---|---|---|---|
| `booking.created` / `booking.rescheduled` / `booking.cancelled` | booking | notification, report | idempotency key = `booking_id + version` |
| `booking.reminder_due` | repeatable job | notification | แจ้งเตือน 1 วัน, 30 นาที |
| `counter.called` | counter | notification | แจ้งเมื่อเหลือ 3 คิว |
| `kiosk.ticket_synced` | kiosk | report | sync สถานะกลับ Q-Matic |
| `report.export_requested` | report | report worker | สร้าง Excel → object storage, ลิงก์หมดอายุ 24 ชม. |
| `forecast.requested` / `forecast.completed` / `forecast.failed` | scheduler / forecast | report, alert | |
| `notification.failed` | notification | dead-letter + alert | ครบ 5 ครั้ง |

ทุก job idempotent · retry exponential backoff สูงสุด 5 ครั้ง · ล้มครบ → dead-letter queue + แจ้งเตือน

## 7. ข้อมูลและความปลอดภัย

| เรื่อง | การออกแบบ | อ้างอิง |
|---|---|---|
| ฐานข้อมูล | `nvt_nlpqueue_dev` / `_uat` / `_prod`, PostgreSQL managed HA | มาตรฐาน 4, 7 |
| เลขบัตรประชาชน | ค้นหาด้วย HMAC-SHA256 (key ใน KMS) · ถ้าต้องเก็บจริง → เข้ารหัสระดับคอลัมน์ AES-256 · ห้ามลง log | TOR 4, มาตรฐาน 4 |
| เบอร์โทร / LINE userId | เข้ารหัสระดับคอลัมน์ | มาตรฐาน 4 |
| ขณะส่ง | TLS 1.2+ ทุกเส้น, mTLS ไป core banking | TOR 4 |
| Audit log | ทุกการเข้าถึงข้อมูลลูกค้า (ใคร/อะไร/เมื่อไร/เหตุผล) เก็บ ≥ 2 ปี แบบ append-only | TOR 4 |
| ข้อมูล ML | ใช้เฉพาะข้อมูลคิวไม่ระบุตัวตน, forecast-service อ่านได้แค่ view ที่ไม่มี PII | TOR 3.3, PDPA |
| Hosting | cloud region ประเทศไทยเท่านั้น | มาตรฐาน 4 |
| พนักงาน | SSO Entra ID (OIDC), role: teller / branch_manager / executive / admin | TOR 3.2 |

## 8. Observability

- Log JSON ตาม `coding-rules.md` ข้อ 8 → log management กลาง (mask เลขบัตร/เบอร์โทรก่อนเขียน)
- Metric: request rate, error rate, latency p95, queue depth, DB connections + **MAPE รายวัน** ของ forecast
- Tracing OpenTelemetry ข้าม web → core-connector → forecast-service
- Alert: error rate > 2% 5 นาที · p95 > 2 วินาที · queue ค้าง > 1,000 job · **TLS cert หมดอายุใน 21 วัน — รวม client cert mTLS ของ core-connector** · forecast run ล้ม · MAPE 7 วัน > 20%
- `/healthz` และ `/readyz` (DB + Redis + คิว) ทุก service · SLA uptime ≥ 99.5% (TOR 5)

## 9. ADR ที่ต้องเขียน (`docs/adr/`)

| # | เรื่อง | ตัดสิน |
|---|---|---|
| 0001 | แยก `nlp-forecast-service` | แยก — Python runtime + รอบปล่อยโมเดลต่าง |
| 0002 | แยก `nlp-core-connector` | แยก — mTLS / แยกเครือข่ายไปธนาคาร |
| 0003 | ไม่แยก Q-Matic adapter และ LINE webhook เป็น service | ไม่แยก — โหลด 120 สาขา ไม่ถึง 10 เท่าของ web |
| 0004 | BullMQ แทน RabbitMQ | BullMQ — subscriber ของ event อยู่ใน monolith เป็นหลัก, forecast-service ถูกเรียกผ่าน REST |

## 10. ประเด็นที่ต้องยืนยันกับลูกค้า / ทีม (ยังไม่ตัดสิน)

1. **Q-Matic เรียกเข้าได้ไหม** — TOR บอกแค่ "ใช้ REST API" ไม่ชัดว่าตู้ push มาหาเรา หรือเราต้อง poll · ตอนนี้วาดเป็นสองทาง
2. **OTP ส่งทางไหน** — SMS gateway ของธนาคาร หรือของเรา (มีผลต่อราคาและ trust boundary)
3. **API Gateway ของธนาคารเปิดให้เรียกจาก cloud ภายนอกไหม** — ถ้าไม่ ต้องมี site-to-site VPN และ core-connector อาจต้องไปอยู่ฝั่งธนาคาร
4. **เก็บ CIF ไหม** — ถ้าไม่จำเป็นให้ lookup ทุกครั้งแล้วเก็บแค่ HMAC (ลด PII ในระบบ)
5. ขนาดโหลดช่วงวันที่ 25–5 (peak) เพื่อยืนยันว่า monolith + worker 2 ตัวพอ — ส่งให้ `pricing-calc` คิด hosting
