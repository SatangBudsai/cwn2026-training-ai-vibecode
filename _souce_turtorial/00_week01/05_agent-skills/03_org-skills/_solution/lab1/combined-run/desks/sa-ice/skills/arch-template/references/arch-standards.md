# สรุปมาตรฐานสถาปัตยกรรมโนวาเทค v4

> สรุปจาก `company-kit/arch-standards.md` v4 (ปรับปรุง 2026-05-20, ผู้ดูแล `sa-ton` + `sa-ice`) · สรุปเมื่อ 2026-11-04
> เก็บไว้ใน skill เพื่อให้ใช้ได้บนเครื่องที่ไม่มี company-kit ถ้าต้นฉบับมีเวอร์ชันใหม่กว่า ให้ใช้ต้นฉบับ

## ตารางเลือกแบบแผน

| สถานการณ์ | แบบแผน |
|---|---|
| ระบบใหม่ทุกระบบ | **Modular monolith 1 ตัว** (Next.js + Node.js/TypeScript) แบ่งโมดูลตามโดเมน |
| มีส่วนที่ใช้ภาษา/runtime อื่น เช่น โมเดล ML Python | แยก service เช่น `<project>-forecast-service` |
| ส่วนที่โหลดต่างกันเกิน 10 เท่า หรือต้อง scale แยก เช่น ตัวรับ webhook ปริมาณสูง | แยก service |
| รอบปล่อยต่างกันชัดเจน หรือคนละทีมดูแล | แยก service |
| ต้องแยกเครือข่ายเพื่อความปลอดภัย เช่น เชื่อม core banking ด้วย mTLS | แยก service เช่น `<project>-core-connector` |
| งานที่ไม่ต้องตอบผู้ใช้ทันที (SMS/LINE, รายงาน, sync ภายนอก, batch ML) | ใส่คิว |
| ระบบเล็ก-กลาง | คิวใช้ **BullMQ บน Redis** |
| มีหลาย service ต้อง subscribe event เดียวกัน | คิวใช้ **RabbitMQ** |

ทุกครั้งที่แยก service ให้เขียนว่าเข้าเกณฑ์ข้อไหน และบันทึกลง ADR

## กติกา modular monolith

- โมดูลคุยกันผ่าน `modules/<name>/index.ts` ห้ามเรียกตารางของโมดูลอื่นตรง ๆ
- ใช้ฐานข้อมูลเดียว โดยแต่ละโมดูลมี schema ของตัวเอง (`booking.*`, `branch.*`)
- เหตุผล: ทีมโปรเจกต์ 4–8 คน ถ้าแยก service เร็วเกินไป deploy และ debug จะช้าลง

## กติกาคิว

- ทุก job ต้อง idempotent
- retry แบบ exponential backoff สูงสุด 5 ครั้ง
- job ที่ล้มครบ 5 ครั้ง ส่งไป dead-letter queue และแจ้งเตือน

## ข้อมูล

- **PostgreSQL** แบบ managed เป็นฐานข้อมูลหลักเสมอ (production เปิด HA)
- **Redis** ใช้ทำ cache (ทุก key ต้องกำหนด TTL), session, rate limit, slot lock
- ไฟล์อัปโหลดเก็บใน object storage ภูมิภาคไทย และสแกนไวรัสก่อนใช้
- ข้อมูลอ่อนไหว (เลขบัตรประชาชน, เบอร์โทร) เข้ารหัสระดับคอลัมน์ หรือเก็บเป็น hash ถ้าใช้แค่ค้นหา
- **ลูกค้าธนาคาร: deploy บน cloud region ประเทศไทยเท่านั้น**

## Observability (ต้องปรากฏในเอกสาร)

- Log แบบ JSON (ตาม `coding-rules.md` ข้อ 8) ส่งเข้า log management กลาง
- Tracing ด้วย OpenTelemetry ข้าม service
- Metric: request rate, error rate, latency p95, queue depth, DB connections
- Alert ขั้นต่ำ:
  - error rate > 2% นาน 5 นาที
  - p95 > 2 วินาที
  - queue ค้าง > 1,000 job
  - **ใบรับรอง TLS จะหมดอายุภายใน 21 วัน** (เพิ่มหลัง incident 2026-09)
- Health check: `/healthz` (process) และ `/readyz` (DB + Redis + คิว)

## สัญลักษณ์แผนภาพ

- **C4 model**:
  - ระดับ 1 (Context) และ 2 (Container) บังคับทุกโปรเจกต์
  - ระดับ 3 ทำเฉพาะโมดูลที่ซับซ้อน
- วาดด้วย **Mermaid** ใน Markdown และเก็บใน repo ที่ `docs/architecture.md` เพื่อให้รีวิวใน PR ได้
- สี:

| ประเภท | สี |
|---|---|
| ระบบของเรา | Nova Navy `#0B2545` |
| ระบบลูกค้า / ภายนอก | Line Gray `#CBD2D9` |
| คิว / ฐานข้อมูล | Nova Teal `#13A89E` |

- ทุกเส้นเชื่อมต้องเขียน protocol + sync/async เช่น `REST/mTLS (sync)`, `BullMQ (async)`
- วาด trust boundary เป็นกรอบประระหว่างเครือข่ายเรากับเครือข่ายลูกค้า

## การตั้งชื่อ

| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| service / repo | kebab-case `<project>-<part>` | `nlp-queue-web`, `nlp-forecast-service` |
| โมดูล | คำนามเอกพจน์ | `booking`, `branch` |
| ฐานข้อมูล | `nvt_<project>_<env>` | `nvt_nlpqueue_prod` |
| คิว / event | `<domain>.<event>` อดีตกาล | `booking.created`, `notification.failed` |
| env | `dev`, `uat`, `prod` เท่านั้น | |

## ADR

ทุกการตัดสินใจที่ต่างจากมาตรฐาน (รวมถึงการแยก service) ให้เขียนเป็น `docs/adr/NNNN-<title>.md` ตามลำดับ บริบท → ทางเลือก → ตัดสิน → ผลที่ตามมา
