# เกณฑ์ภายในที่ต้องรู้ตอนทบทวน (สรุปจาก company-kit ณ พ.ย. 2026)

## 1. สถาปัตยกรรม (arch-standards v4)
- ค่าเริ่มต้นคือ modular monolith (Next.js + Node/TS) ทีมโปรเจกต์ 4–8 คน
- แยก service เมื่อ: runtime ต่างกัน (ML Python → `forecast-service`), โหลดต่างกัน > 10 เท่า, คนละทีมหรือคนละรอบปล่อย, ต้องแยกเครือข่าย (core banking mTLS → `core-connector`) — ทุกครั้งต้องเขียน ADR
- งาน async ใช้ BullMQ/Redis: job ต้อง idempotent, retry 5 ครั้งแบบ backoff และมี dead-letter queue + alert
- PostgreSQL HA ใน prod, Redis ทุก key มี TTL, ข้อมูลอ่อนไหวเข้ารหัสระดับคอลัมน์หรือเก็บเป็น hash, **ลูกค้าธนาคารต้องอยู่ใน cloud region ไทย**
- Alert ขั้นต่ำ: error > 2% นาน 5 นาที, p95 > 2 วินาที, queue ค้าง > 1,000, **cert เหลือ < 21 วัน**, มี `/healthz` และ `/readyz`

## 2. กติกาโค้ด (coding-rules v2026.2) — ข้อที่เกี่ยวกับความเสี่ยง
- Zod validate ทุก input จากภายนอก, error มี type, ไม่มีความลับในโค้ด
- unit test ≥ 80% และมี E2E สำหรับ login / จ่ายเงิน / จอง
- migration ผ่าน prisma เท่านั้น ถ้าลบหรือเปลี่ยนชื่อคอลัมน์ต้องทำแบบ expand → contract
- log JSON ผ่าน pino ห้าม log token เลขบัตร หรือเบอร์เต็ม
- token: access 15 นาที, refresh rotate + reuse detection
- webhook ต้องตรวจลายเซ็นและเป็น idempotent

## 3. Deploy (deploy-runbook 2026-10-01)
- ต้องมี 3 บทบาท: Deploy lead / Verifier / Comms (คนเดียวถือได้ไม่เกิน 2 บทบาท)
- หน้าต่าง deploy: **อังคาร–พฤหัส 21:00–23:00** ห้ามวันศุกร์ ห้ามก่อนวันหยุดยาว **ลูกค้าธนาคารห้ามวันที่ 25–สิ้นเดือน** ยกเว้น hotfix Sev1
- ต้องมี: UAT เซ็นรับ, แจ้งลูกค้า ≥ 3 วันทำการ, dry-run migration (≤ 5 นาที), feature flag, cert > 21 วัน, snapshot, image tag เดิม, on-call 2 ชม. + เช้าวันถัดไป
- rollback ทันทีเมื่อ: smoke test ไม่ผ่านและแก้ไม่ได้ใน 15 นาที / error > 5% นาน 5 นาที / ข้อมูลเงินผิดแม้รายการเดียว

## 4. ราคาและต้นทุนสำหรับประมาณการคร่าว ๆ
- ราคา ต้นทุน และเกณฑ์ margin ใช้ skill `core:pricing-rules` skill นี้ไม่ได้คิดราคาจริง
- SLA ที่ Sev1 ต้องตอบใน 30 นาทีนอกเวลางาน → ใช้ MA Premium 24×7

## 5. ภาพทีมสายเทคโนโลยี (monthly-kpi ต.ค. 2026 — ตรวจค่าใหม่ทุกครั้ง)
- พนักงาน 88 คน, ตำแหน่งว่าง 6 (รวม Senior Full-stack สำหรับโปรเจกต์จองคิวธนาคาร + ML Engineer)
- โปรเจกต์ที่ทำอยู่ 10 on-time 7, gross margin 27.1% (เป้า 30%), Sev1 ก.ย. 1 ครั้ง / ต.ค. 0 ครั้ง
- หัวหน้าที่รายงานตรงต่อ CTO: `dev-pond` (Dev), `qa-mint` (QA), `ops-art` (DevOps, ทีม 2 คน), `ml-jay` (MLOps), `plat-ken` (ทีมกลาง)
- เจ้าของ skill ที่ใช้ส่งต่อ: spec `sa-ton` (req-to-spec) · ทดสอบ `qa-mint` (test-from-plan) · deploy `ops-art` (deploy-checklist) · โมเดล `ml-pim` (model-release), `ml-jay` (mlflow-experiment) · ราคา `fin-joy` (pricing-calc) · อนุมัติดีล `md-somchai` (deal-approval)

## 6. ข้อมูลลูกค้า
ใช้ skill `core:customer-data-policy`
