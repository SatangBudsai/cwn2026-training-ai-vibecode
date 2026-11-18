# มาตรฐานบริษัทที่ spec ต้องผูก (สรุป)

> สรุปจาก `company-kit/arch-standards.md` v4 (2026-05-20, ผู้ดูแล sa-ton + sa-ice) และ `company-kit/customer-data-policy.md` v1.4 (2026-03-10, ผู้ดูแล plat-may)
> ถ้าต้นฉบับมีเวอร์ชันใหม่กว่านี้ ให้ยึดต้นฉบับ แล้วแจ้ง `sa-ton` ให้อัปเดตไฟล์นี้

## A. สถาปัตยกรรม (arch-standards v4)

**ค่าเริ่มต้น:** modular monolith 1 ตัว (Next.js + Node.js/TypeScript) โมดูลตามโดเมน คุยผ่าน `modules/<name>/index.ts`, DB เดียวแต่ schema แยกต่อโมดูล

**แยก service เมื่อเข้าข้อใดข้อหนึ่ง (เขียน ADR):**
1. runtime ต่าง — ML Python → `<project>-forecast-service`
2. โหลดต่าง > 10 เท่า / scale แยก
3. รอบปล่อยต่าง / คนละทีม
4. ความปลอดภัยต้องแยกเครือข่าย — ตัวเชื่อม core banking mTLS → `<project>-core-connector`

**งาน async:** ใส่คิว — BullMQ บน Redis (เล็ก-กลาง), RabbitMQ เมื่อหลาย service subscribe event เดียวกัน · job idempotent, retry exponential ≤ 5 ครั้ง, ล้มครบ → dead-letter + alert

**ข้อมูล:** PostgreSQL managed (HA ใน prod) · Redis: cache (TTL ทุก key), session, rate limit, slot lock · ไฟล์ → object storage ภูมิภาคไทย + สแกนไวรัส · ข้อมูลอ่อนไหว (เลขบัตร, เบอร์) เข้ารหัสระดับคอลัมน์ หรือ hash ถ้าใช้ค้นหาอย่างเดียว · **ลูกค้าธนาคาร: cloud region ประเทศไทยเท่านั้น**

**Observability:** log JSON · metric: request rate, error rate, p95, queue depth, DB connections · OpenTelemetry · alert ขั้นต่ำ: error > 2% 5 นาที, p95 > 2 วินาที, คิวค้าง > 1,000 job, **ใบรับรอง TLS หมดอายุภายใน 21 วัน** · `/healthz` (process), `/readyz` (DB + Redis + คิว)

**การตั้งชื่อ:** service/repo `<project>-<part>` kebab-case · โมดูล = คำนามเอกพจน์ · DB `nvt_<project>_<env>` · event `<domain>.<event>` อดีตกาล (`booking.created`) · env: `dev`, `uat`, `prod` เท่านั้น

**แผนภาพ:** C4 ระดับ 1–2 ด้วย Mermaid — งานของ `arch-template` ไม่ต้องวาดใน spec

## B. ข้อมูลลูกค้า (customer-data-policy v1.4)

**ห้ามใส่แบบเต็มในเอกสารที่ออกนอกบริษัท** (spec/แผนทดสอบมักถูกแนบในข้อเสนอ → ถือว่าออกนอก):
1. เลขบัตรประชาชน
2. เบอร์มือถือส่วนตัว — รวมพนักงานของลูกค้าองค์กร (ผู้ประสานงานใน TOR) → ใช้อีเมล/เบอร์สำนักงาน, เบอร์มือถือเก็บใน CRM เท่านั้น
3. เลขบัญชี / เลขบัตร ของลูกค้าปลายทาง
4. ชื่อ-นามสกุลลูกค้าปลายทาง (ใช้รหัสเคส)

ไม่จำเป็นต้องอ้าง → ตัดทิ้งดีกว่าปิดบัง · ถ้าจำเป็น mask: มือถือ `081-XXX-4567`, เลขบัตร `1-XXXX-XXXXX-XX-3`, บัญชี `XXX-X-X6789-X`, บัตร `4111 XXXX XXXX 1234`

**ข้อมูลทดสอบ:** synthetic เท่านั้น ห้ามคัดลอกข้อมูลจริง · log/รายงานบั๊กห้ามมีเลขบัตร/เบอร์/บัญชีจริง · เข้าถึงข้อมูล prod ต้องมี ticket + ผู้อนุมัติฝั่งลูกค้า

**Retention:** สำเนาข้อมูลลูกค้าปลายทางที่ได้ระหว่างโครงการ ลบภายใน 90 วันหลังส่งมอบ · TOR/proposal/สัญญา เก็บ 5 ปีหลังจบสัญญา

**สงสัย:** ถาม `plat-may` (ช่อง `#ask-pdpa`)
