# สรุปมาตรฐานสถาปัตยกรรมโนวาเทค v4 (+ ข้อที่เกี่ยวจากนโยบายอื่น)

> ต้นฉบับ: `company-kit/arch-standards.md` v4 (ปรับปรุง 2026-05-20, ผู้ดูแล `sa-ton` + `sa-ice`) · สรุปเมื่อ 2026-11-03
> ถ้าต้นฉบับมีเวอร์ชันใหม่กว่า v4 ให้ยึดต้นฉบับ แล้วแจ้ง `sa-ice` ให้อัปเดตไฟล์นี้

## 1. ค่าเริ่มต้น: modular monolith
- 1 แอป Next.js + Node.js/TypeScript แบ่งโมดูลตามโดเมน (คำนามเอกพจน์: `booking`, `branch`, `notification`, `report`)
- โมดูลคุยผ่าน `modules/<name>/index.ts` เท่านั้น ห้ามอ่านตารางโมดูลอื่นตรง ๆ
- ฐานข้อมูลเดียว แต่ละโมดูลมี schema ของตัวเอง (`booking.*`, `branch.*`)
- เหตุผล: ทีมโปรเจกต์ 4–8 คน แยกเร็วเกินทำให้ deploy/debug ช้า

## 2. เกณฑ์แยก service (เข้าข้อใดข้อหนึ่ง + เขียน ADR ทุกครั้ง)
1. ภาษา/runtime ต่าง — เช่น ML Python → `<project>-forecast-service`
2. โหลดต่างกัน > 10 เท่า หรือต้อง scale แยก — เช่น ตัวรับ webhook ปริมาณสูง
3. รอบการปล่อยต่างกันชัด หรือคนละทีมดูแล
4. ความปลอดภัยต้องแยกเครือข่าย — เช่น ตัวเชื่อม core banking ที่ใช้ mTLS (`<project>-core-connector`)

## 3. คิว
- งานไม่ต้องตอบทันที (SMS/LINE, รายงาน, sync ระบบภายนอก, batch พยากรณ์) → คิว
- **BullMQ บน Redis** สำหรับระบบเล็ก-กลาง · **RabbitMQ** เมื่อหลาย service ต้อง subscribe event เดียวกัน
- ทุก job idempotent, retry exponential backoff สูงสุด 5 ครั้ง, ล้มครบ → dead-letter queue + แจ้งเตือน

## 4. ข้อมูล
- PostgreSQL managed เป็นหลักเสมอ (production เปิด HA)
- Redis: cache (**TTL ทุก key**), session, rate limit, slot lock
- ไฟล์อัปโหลด → object storage ภูมิภาคไทย + สแกนไวรัสก่อนใช้
- ข้อมูลอ่อนไหว (เลขบัตรประชาชน, เบอร์โทร) → เข้ารหัสระดับคอลัมน์ หรือเก็บเป็น hash ถ้าใช้แค่ค้นหา
- ลูกค้าธนาคาร: deploy บน cloud region ประเทศไทยเท่านั้น

## 5. Observability
- Log JSON (ตามกติกาโค้ดข้อ 8) → log management กลาง
- Metric: request rate, error rate, latency p95, queue depth, DB connections
- Tracing OpenTelemetry ข้าม service
- Alert ขั้นต่ำ: error rate > 2% 5 นาที · p95 > 2 วินาที · queue ค้าง > 1,000 job · **TLS cert หมดอายุภายใน 21 วัน** (เพิ่มหลัง incident ก.ย. 2026 ที่ payment ล่ม 47 นาทีเพราะ cert หมดอายุไม่มี alert)
- `/healthz` (process) และ `/readyz` (DB + Redis + คิว)

## 6. สัญลักษณ์แผนภาพ
- C4 ระดับ 1 (Context) + 2 (Container) ทุกโปรเจกต์ · ระดับ 3 เฉพาะโมดูลซับซ้อน
- Mermaid ใน Markdown เก็บที่ `docs/architecture.md`
- สี: ระบบเรา Nova Navy `#0B2545` · ระบบลูกค้า/ภายนอก Line Gray `#CBD2D9` · คิว/ฐานข้อมูล Nova Teal `#13A89E` (ตัวอักษร Ink `#1F2933` บนพื้นเทา)
- ทุกเส้นเขียน protocol + sync/async เช่น `REST/mTLS (sync)`, `BullMQ (async)`
- trust boundary = กรอบประระหว่างเครือข่ายเรากับลูกค้า

## 7. การตั้งชื่อ
| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| service / repo | kebab-case `<project>-<part>` | `nlp-queue-web`, `nlp-forecast-service` |
| โมดูล | คำนามเอกพจน์ | `booking`, `branch` |
| ฐานข้อมูล | `nvt_<project>_<env>` | `nvt_nlpqueue_prod` |
| คิว / event | `<domain>.<event>` อดีตกาล | `booking.created`, `notification.failed` |
| env | `dev`, `uat`, `prod` เท่านั้น | |

## 8. ADR
ทุกการตัดสินใจที่ต่างจากมาตรฐาน หรือการแยก service → `docs/adr/NNNN-<title>.md` (บริบท → ทางเลือก → ตัดสิน → ผลที่ตามมา)

## จากนโยบายอื่นที่ต้องใช้ตอนวาด
- **PDPA ภายใน:** ใช้ skill `core:customer-data-policy`
- **แบรนด์:** ใช้ skill `core:brand-guide`
- **กติกาโค้ดที่กระทบแผนภาพ:** access token อายุ 15 นาที + rotate refresh token (เขียนในหัวข้อ auth ถ้าระบบมี login ลูกค้า)
