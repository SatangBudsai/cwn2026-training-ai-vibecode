# มาตรฐานโนวาเทคที่ SPEC ต้องสอดคล้อง (สรุปจาก company-kit)

> ต้นฉบับ: `company-kit/arch-standards.md` v4 (2026-05-20), `coding-rules.md` v2026.2, `customer-data-policy.md` v1.4 (2026-03-10)
> ถ้าต้นฉบับใหม่กว่านี้ ใช้ต้นฉบับ แล้วแจ้งเจ้าของ skill (`sa-ton`) ให้อัปเดตไฟล์นี้

## สถาปัตยกรรม (arch-standards)
- เริ่มที่ **modular monolith 1 ตัว** (Next.js + Node.js/TypeScript) โมดูลตามโดเมน คุยผ่าน `modules/<name>/index.ts` · DB เดียว schema ต่อโมดูล
- **แยก service เมื่อเข้าข้อใดข้อหนึ่ง** (เขียน ADR ทุกครั้ง): (1) runtime ต่าง เช่น ML Python → `forecast-service` (2) โหลดต่างกัน > 10 เท่า (3) รอบปล่อย/ทีมต่าง (4) ต้องแยกเครือข่าย เช่น ตัวเชื่อม core banking mTLS → `core-connector`
- งาน async (SMS/LINE, รายงาน, sync ภายนอก, batch) → คิว **BullMQ บน Redis** (RabbitMQ เมื่อหลาย service subscribe event เดียวกัน) · job idempotent, retry exponential สูงสุด 5 ครั้ง → dead-letter + alert
- **PostgreSQL** managed (HA ใน prod) · **Redis** cache (TTL ทุก key), session, rate limit, slot lock · ไฟล์ → object storage ภูมิภาคไทย + สแกนไวรัส
- ข้อมูลอ่อนไหว (เลขบัตรประชาชน, เบอร์) เข้ารหัสระดับคอลัมน์ หรือ hash ถ้าใช้ค้นหา · ลูกค้าธนาคาร deploy cloud region ไทยเท่านั้น
- Observability: log JSON, metric (request/error rate, p95, queue depth, DB conn), OpenTelemetry · alert ขั้นต่ำ: error > 2% 5 นาที, p95 > 2 วินาที, queue ค้าง > 1,000, **TLS cert หมดภายใน 21 วัน** · `/healthz` + `/readyz`
- แผนภาพ: C4 L1+L2 ด้วย Mermaid · เส้นเชื่อมเขียน protocol + sync/async เช่น `REST/mTLS (sync)` · สี: ของเรา `#0B2545`, ภายนอก `#CBD2D9`, คิว/DB `#13A89E`
- ชื่อ: service `<project>-<part>` (เช่น `nlp-queue-web`) · โมดูล คำนามเอกพจน์ · DB `nvt_<project>_<env>` · event `<domain>.<event>` อดีตกาล (`booking.created`) · env `dev` `uat` `prod`

## กติกาโค้ดที่ต้องโผล่ใน SPEC (coding-rules)
- ข้อ 9: **access token 15 นาที + refresh หมุนทุกครั้ง + reuse detection** · refresh ก่อนหมด 60 วินาที และก่อนพาไปหน้าชำระเงิน (บั๊กปี 2025 ผู้ใช้หลุดกลางจ่ายเงิน) → ใส่เป็น FR + test ที่ตั้ง token อายุสั้นใน uat
- ข้อ 8: ห้าม log รหัสผ่าน, token, เลขบัตรประชาชน, เบอร์เต็ม
- ข้อ 10: API ตอบ `{ data }` / `{ error: { code, message } }` · webhook ตรวจลายเซ็น + idempotent (เก็บ event id)
- ข้อ 4: error มีรหัส เช่น `BOOKING_SLOT_FULL` (409) — ใช้รหัสนี้ใน "ผลที่คาดหวัง" ของ test ได้

## นโยบายข้อมูลลูกค้า (customer-data-policy)
- ห้ามแบบเต็มในเอกสารออกนอกบริษัท: เลขบัตรประชาชน, **เบอร์มือถือบุคคล (รวมพนักงานลูกค้าองค์กร)**, เลขบัญชี/บัตรของลูกค้าปลายทาง, ชื่อลูกค้าปลายทาง
- เบอร์มือถือที่อยู่ใน TOR → เก็บ CRM เท่านั้น ไม่คัดลอกลงเอกสาร · ไม่จำเป็นต้องอ้าง = ตัดทิ้งดีกว่าปิดบัง
- รูปแบบปิดบัง: มือถือ `081-XXX-4567` · บัตรประชาชน `1-XXXX-XXXXX-XX-3` · บัญชี `XXX-X-X6789-X` · บัตรเครดิต `4111 XXXX XXXX 1234`
- ข้อมูลทดสอบ synthetic เท่านั้น · สำเนาข้อมูลลูกค้าปลายทางลบภายใน 90 วันหลังส่งมอบ · ข้อมูลอ่อนไหวมาตรา 26 ห้ามเก็บถ้าไม่จำเป็น
- ไม่แน่ใจ → ถาม `plat-may` (#ask-pdpa)

## ข้อมูลจากโปรเจกต์เก่าที่ใช้อ้างอิงได้ (ภายใน)
- แอปนัดหมายสาขา ออมทรัพย์เกษตรไทย (2025): LINE OA + เว็บ, slot lock ใน Redis, UX ผู้สูงอายุ (ตัวใหญ่ ≤ 4 ขั้น), ทดสอบที่สาขาจริง 3 แห่ง
- พยากรณ์คิวต้นแบบ (ข้อมูลเกษตรไทย 2026): baseline MAPE 31.5% → LightGBM + feature วันหยุด/payday MAPE 15.2% · พยากรณ์ต่ำช่วง 11:00–13:00 −20 ถึง −30% ในสาขาย่านออฟฟิศ · สาขาใหม่ < 8 สัปดาห์ใช้ fallback · เสนอเกณฑ์ถอยกลับ MAPE รายสัปดาห์ > 22% สองสัปดาห์ติด
