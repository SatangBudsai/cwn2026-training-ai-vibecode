# กติกาโนวาเทคที่ postmortem ต้องใช้ (สรุปจาก company-kit, 2026-11-03)

> สรุปไว้ให้ skill ใช้ได้โดยไม่ต้องมี company-kit ในเครื่อง · ต้นฉบับ: `deploy-runbook.md` (ops-art), `arch-standards.md`, `incident-2026-09.md` · PDPA และน้ำเสียงเอกสารไม่สรุปซ้ำที่นี่ ใช้ skill `customer-data-policy` และ `brand-guide` ของ core

## 1. เมื่อไรต้องเขียน
- เกิดเหตุหลัง deploy หรือระบบ production ล่ม → เขียน postmortem **ภายใน 3 วันทำการ** (runbook ข้อ 6.3)
- เหตุ Sev 1 ถูกนับใน KPI `incidents_sev1` (เป้า 0/เดือน) และขึ้นสไลด์ผู้บริหารหัวข้อ "การส่งมอบโปรเจกต์และเหตุขัดข้อง" → skill ถัดไปคือ `exec-deck`

## 2. Sev / SLA ที่เคยใช้
- Sev 1 = ฟังก์ชันหลักใช้ไม่ได้ (เช่น จ่ายเงินไม่ได้) · SLA ตัวอย่าง (ช้อปดีมาร์ท): **ตอบรับภายใน 30 นาที**
- วัดแยก: เวลาตอบรับ (ผ่าน SLA ไหม) กับ **ใครรู้ก่อน** — ถ้าลูกค้ารู้ก่อนเรา ถือเป็นช่องว่างการเฝ้าระวัง ต้องมี action item
- rollback ตัดสินทันทีถ้า: smoke test ไม่ผ่านและแก้ไม่ได้ใน 15 นาที · error rate > 5% นาน 5 นาที · ข้อมูลผิดแม้รายการเดียว · แจ้งลูกค้าภายใน 30 นาทีหลังถอย

## 3. มาตรฐานการเฝ้าระวัง (ใช้เทียบว่า "ทำไมไม่รู้ตัว")
- Alert ขั้นต่ำ: error rate > 2% 5 นาที · p95 > 2 วินาที · queue ค้าง > 1,000 job · **ใบรับรอง TLS หมดอายุภายใน 21 วัน ทุกโดเมนรวมโดเมนย่อย**
- Health check: `/healthz` (process), `/readyz` (DB + Redis + คิว)
- Metric มาตรฐาน: request rate, error rate, latency p95, queue depth, DB connections · tracing OpenTelemetry
- runbook ข้อ 1.7: ก่อน deploy เช็ก cert ทุกโดเมนที่เกี่ยวข้อง > 21 วัน
- แนวที่ทีมตกลง: uptime check ต้องยิง flow ที่ลูกค้าใช้จริง (synthetic transaction ทุก 5 นาที) · ข้อยกเว้นจาก automation (เช่น cert upload มือ) ต้องอยู่ในทะเบียนกลาง ไม่ใช่ปฏิทินส่วนตัว

## 4. PDPA
ฉบับลูกค้าตรวจด้วย `customer-data-policy` (core) แถว "postmortem / รายงาน incident" (รวมกติกาห้ามชื่อลูกค้ารายอื่น) · log ที่แนบต้องไม่มีข้อมูลส่วนบุคคล เจอให้แจ้ง DevOps ปิดที่ระดับ logger

## 5. น้ำเสียงและรูปเอกสาร
ตาม `brand-guide` (core) · เลขที่ postmortem `NVT-PM-<ปี>-<ลำดับ>`

## 6. ชื่อเฉพาะที่ใช้ซ้ำ
ลูกค้า: ช้อปดีมาร์ท (ระบบ ShopDee Member), สยามรุ่งเรือง, ออมทรัพย์เกษตรไทย, นครหลวงพัฒนา, เอเชียไทยสากล, ไทยโลจิสติกส์ครบวงจร, โรงพยาบาลเมืองใหม่ · payment gateway: ThaiPay GW

## 7. เหตุที่เคยเกิด (ใช้อ้างอิง/เทียบรูปแบบซ้ำ)
| วันที่ | ระบบ | ต้นเหตุ | ระยะ | บทเรียนที่กลายเป็นมาตรฐาน |
|---|---|---|---|---|
| 2026-09-18 | ShopDee payment (`api.pay`) | TLS cert upload มือหมดอายุ, reminder อยู่ในปฏิทินส่วนตัวคนลาออก, ไม่มี alert cert, uptime check ยิงแค่ www | 47 นาที, order ค้าง 214, ตัดเงินแต่ webhook ไม่เข้า 9 | alert cert < 21 วัน, runbook 1.7, ทะเบียน cert มือ (4 ตัว ณ 2026-09), idempotency webhook ช่วยกันจ่ายซ้ำ |
