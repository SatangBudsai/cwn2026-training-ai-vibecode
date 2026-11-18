# มาตรฐานสถาปัตยกรรมโนวาเทค (Architecture Standards) v4

> ผู้ดูแล: ต้นตระกูล มีชัย (`sa-ton`) + ไอศวรรย์ บุญมา (`sa-ice`) · ปรับปรุง 2026-05-20
> ใช้กับ: `arch-template`, `req-to-spec`, `project-scaffold`

## 1. ค่าเริ่มต้น: Modular Monolith

ทุกระบบใหม่เริ่มจาก **modular monolith 1 ตัว** (Next.js + Node.js/TypeScript) แบ่งโมดูลตามโดเมน (เช่น `booking`, `branch`, `notification`, `report`)
- โมดูลคุยกันผ่าน interface ของโมดูล (`modules/<name>/index.ts`) ห้ามเรียกตารางของโมดูลอื่นตรง ๆ
- ฐานข้อมูลเดียว แต่แต่ละโมดูลมี schema ของตัวเอง (`booking.*`, `branch.*`)
- เหตุผล: ทีมโปรเจกต์ของเรา 4–8 คน แยก service เร็วเกินทำให้ deploy และ debug ช้าลง

## 2. เมื่อไหร่แยก service

แยกเป็น service ต่างหาก **เมื่อเข้าข้อใดข้อหนึ่ง** (เขียนเหตุผลลง ADR ทุกครั้ง)
1. ภาษา/runtime ต่างกัน — เช่น โมเดล ML (Python) → แยกเป็น `forecast-service`
2. โหลดต่างกันมาก (> 10 เท่า) หรือต้อง scale แยก — เช่น ตัวรับ webhook ปริมาณสูง
3. รอบการปล่อยต่างกันชัดเจน หรือคนละทีมดูแล
4. ข้อกำหนดความปลอดภัยต้องแยกเครือข่าย — เช่น ตัวเชื่อม core banking ที่ใช้ mTLS (`core-connector`)

## 3. งานแบบ async ใช้คิว (Queue)

- งานที่ไม่ต้องตอบผู้ใช้ทันที (ส่ง SMS/LINE, สร้างรายงาน, sync กับระบบภายนอก, รัน batch พยากรณ์) → ใส่คิว
- ใช้ **BullMQ บน Redis** สำหรับระบบขนาดเล็ก-กลาง, RabbitMQ เมื่อมีหลาย service ต้อง subscribe event เดียวกัน
- ทุก job ต้อง idempotent, retry แบบ exponential backoff สูงสุด 5 ครั้ง, job ที่ล้มครบให้ไป dead-letter queue + แจ้งเตือน

## 4. ข้อมูล

- **PostgreSQL** (managed, เปิด HA สำหรับ production) เป็นฐานข้อมูลหลักเสมอ
- **Redis** สำหรับ cache (TTL ต้องกำหนดทุก key), session, rate limit, slot lock
- ไฟล์อัปโหลดเก็บ object storage ภูมิภาคไทย, สแกนไวรัสก่อนใช้
- ข้อมูลอ่อนไหว (เลขบัตรประชาชน, เบอร์โทร) เข้ารหัสระดับคอลัมน์ หรือเก็บเป็น hash ถ้าใช้แค่ค้นหา
- ระบบลูกค้าธนาคาร: deploy บน cloud region ประเทศไทยเท่านั้น

## 5. Observability

- Log แบบ JSON ตาม `coding-rules.md` ข้อ 8 ส่งเข้า log management กลาง
- Metric มาตรฐาน: request rate, error rate, latency p95, queue depth, DB connections
- Tracing ด้วย OpenTelemetry ข้าม service
- Alert ขั้นต่ำ: error rate > 2% 5 นาที, p95 > 2 วินาที, queue ค้าง > 1,000 job, **ใบรับรอง TLS หมดอายุภายใน 21 วัน** (เพิ่มหลัง incident 2026-09)
- Health check `/healthz` (process) และ `/readyz` (DB + Redis + คิว)

## 6. สัญลักษณ์แผนภาพ (Diagram Notation)

- ใช้แบบ **C4 model** ระดับ 1 (Context) และ 2 (Container) ทุกโปรเจกต์, ระดับ 3 เฉพาะโมดูลซับซ้อน
- วาดด้วย **Mermaid** ใน Markdown (เก็บใน repo `docs/architecture.md`) เพื่อให้รีวิวใน PR ได้
- สี: ระบบของเรา = Nova Navy `#0B2545`, ระบบลูกค้า/ภายนอก = Line Gray `#CBD2D9`, คิว/ฐานข้อมูล = Nova Teal `#13A89E`
- ทุกเส้นเชื่อมเขียน protocol + sync/async เช่น `REST/mTLS (sync)`, `BullMQ (async)`
- ขอบเขตความเชื่อถือ (trust boundary) วาดกรอบประระหว่างเครือข่ายเรากับลูกค้า

## 7. การตั้งชื่อ

| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| service / repo | kebab-case `<project>-<part>` | `nlp-queue-web`, `nlp-forecast-service` |
| โมดูล | คำนามเอกพจน์ | `booking`, `branch` |
| ฐานข้อมูล | `nvt_<project>_<env>` | `nvt_nlpqueue_prod` |
| คิว / event | `<domain>.<event>` อดีตกาล | `booking.created`, `notification.failed` |
| env | `dev`, `uat`, `prod` เท่านั้น | |

## 8. ADR (Architecture Decision Record)

ทุกการตัดสินใจที่ต่างจากมาตรฐานนี้ เขียน ADR ใน `docs/adr/NNNN-<title>.md` (บริบท → ทางเลือก → ตัดสิน → ผลที่ตามมา)
