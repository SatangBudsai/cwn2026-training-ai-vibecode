# สรุปมาตรฐานโนวาเทคที่ใช้ทบทวนความเสี่ยง

> สรุปจาก company-kit: `arch-standards.md` v4 (2026-05-20, sa-ton/sa-ice), `deploy-runbook.md` (2026-10-01, ops-art), `customer-data-policy.md` v1.4 (plat-may), `people/README.md`, `monthly-kpi.csv` · snapshot ณ 2026-11-04 · ถ้าเครื่องนี้มี company-kit ให้เช็กไฟล์ต้นฉบับว่ามีเวอร์ชันใหม่กว่าไหม

## สถาปัตยกรรม (arch-standards v4)

- ค่าเริ่มต้น: **modular monolith 1 ตัว** (Next.js + Node.js/TypeScript) แบ่งโมดูลตามโดเมน ฐานข้อมูลเดียวแยก schema ต่อโมดูล — ทีมโปรเจกต์ 4–8 คน
- **แยก service เมื่อ** (ต้องมี ADR): runtime ต่าง (ML Python → `forecast-service`) · โหลดต่าง > 10 เท่า · รอบปล่อย/ทีมต่าง · ต้องแยกเครือข่ายเพื่อความปลอดภัย (ตัวเชื่อม core banking mTLS → `core-connector`)
- งาน async → คิว: BullMQ บน Redis (เล็ก-กลาง), RabbitMQ เมื่อหลาย service subscribe · job ต้อง idempotent, retry exponential สูงสุด 5, ล้มครบ → dead-letter + alert
- ข้อมูล: PostgreSQL managed + HA สำหรับ prod · Redis (cache มี TTL, session, rate limit, slot lock) · ไฟล์ใน object storage ภูมิภาคไทย · เลขบัตร/เบอร์โทรเข้ารหัสระดับคอลัมน์ หรือ hash ถ้าใช้แค่ค้นหา · **ลูกค้าธนาคาร deploy region ไทยเท่านั้น**
- Observability: log JSON, metric (rate, error, p95, queue depth, DB conn), OpenTelemetry · alert ขั้นต่ำ: error > 2% 5 นาที, p95 > 2 วิ, queue ค้าง > 1,000, **cert TLS หมดภายใน 21 วัน** · `/healthz` + `/readyz`
- ชื่อ: repo `<project>-<part>` (เช่น `nlp-queue-web`), DB `nvt_<project>_<env>`, env มีแค่ dev/uat/prod

## การขึ้นระบบ (deploy-runbook)

- 3 บทบาททุกรอบ: Deploy lead · Verifier (ไม่ใช่คนเขียนฟีเจอร์) · Comms — คนเดียวถือไม่เกิน 2
- **ช่วงที่ deploy ได้: อังคาร–พฤหัส 21:00–23:00** · ห้ามวันศุกร์, ก่อนวันหยุดยาว, **วันที่ 25–สิ้นเดือนสำหรับลูกค้าธนาคาร** (ยกเว้น hotfix Sev1)
- ก่อน deploy: UAT + ลูกค้าเซ็นรับเป็นลายลักษณ์อักษร · แจ้งลูกค้าล่วงหน้า ≥ 3 วันทำการ · migration dry-run บน staging ขนาดใกล้จริง (> 5 นาที/lock ตารางใหญ่ → แยกรอบ) · migration ย้อนได้หรือแบบ expand · ฟีเจอร์เสี่ยงอยู่หลัง feature flag · **cert ทุกโดเมนเหลือ > 21 วัน** · on-call 2 ชม. หลัง deploy + เช้าวันถัดไป
- วัน deploy: snapshot DB, จด image tag เดิม, ปิด batch ที่ชนกับ migration (เช่น batch พยากรณ์รอบคืน)
- smoke test ใน 15 นาที: login, flow หลัก 1 รอบ, webhook เข้า, error < 1%, p95 ไม่แย่ลงเกิน 20%
- rollback ทันทีถ้า: smoke ไม่ผ่านและแก้ไม่ได้ใน 15 นาที · error > 5% นาน 5 นาที · ข้อมูลผิดแม้รายการเดียว — ลำดับ: ปิด flag → image เดิม → restore snapshot (ต้อง deploy lead + หัวหน้า dev ตกลงร่วม) → แจ้งลูกค้าใน 30 นาที
- เกิดเหตุ → postmortem ภายใน 3 วันทำการ

## นโยบายข้อมูลลูกค้า (customer-data-policy v1.4) — ส่วนที่ใช้กับรายงานนี้

- ห้ามใส่ในเอกสารที่ส่งออกนอก (และไม่ควรคัดลอกลงเอกสารภายในโดยไม่จำเป็น): เลขบัตรประชาชน, **เบอร์มือถือส่วนตัว** (รวมของพนักงานลูกค้าองค์กรใน TOR — ใช้เบอร์สำนักงาน/อีเมลบริษัท), เลขบัญชี/บัตรของลูกค้าปลายทาง, ชื่อลูกค้าปลายทาง (ใช้รหัสเคส)
- เบอร์มือถือใน TOR/ประชุม → เก็บใน CRM ภายในเท่านั้น

## โครงทีมสายเทคโนโลยี (ใครรับเรื่องอะไร)

| แผนก | หัวหน้า | คน | skill ที่ส่งต่อได้ |
|---|---|---|---|
| Dev | `dev-pond` | `dev-mew` (scaffold สมาชิก+ชำระเงิน), `dev-new` (คนใหม่) | `coding-standard`, `project-scaffold` |
| QA | `qa-mint` | `qa-bank` | `test-from-plan`, `bug-report` |
| DevOps | `ops-art` | `ops-fon` | `deploy-checklist`, `postmortem` |
| ML/MLOps | `ml-jay` | `ml-pim` | `mlflow-experiment`, `model-release` |
| ทีมกลาง | `plat-ken` | `plat-may` | `skill-finder`, `customer-data-policy` |

ฝั่งอื่นที่เกี่ยว: SA `sa-ton` (`req-to-spec`), `sa-ice` (`arch-template`) · Sales `sales-nida` (`sales-proposal`) · MD `md-somchai` (`deal-approval`) · การเงิน `cfo-ying` (`cost-headcount-review`), `fin-joy` (`pricing-calc`)

## สัญญาณกำลังคน (monthly-kpi ก.ย. → ต.ค. 2026)

- projects_active 9 → 10 · projects_on_time 7 → 7 (ตรงเวลา = เลื่อน milestone ≤ 1 สัปดาห์)
- gross_margin 29.4% → 27.1% (เป้า 30%) — ต.ค. ลดเพราะโปรเจกต์ DentDee เกินแผน 18 man-day
- headcount 86 → 88 · open_positions 4 → 6 (เพิ่ม Senior Full-stack สำหรับโปรเจกต์จองคิวธนาคาร + ML Engineer)
- incidents_sev1: ก.ย. 1 (ShopDee payment ล่ม 47 นาที), ต.ค. 0 · sev2: 2 → 1
- ตำแหน่ง NVT-JOB-2026-021 Senior Full-stack: 1 อัตรา เริ่มงานไม่เกิน 4 ม.ค. 2027 เหตุผล "ทีมปัจจุบันไม่พอ"
