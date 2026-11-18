# company-kit — ข้อมูลกลางของโนวาเทค

> ความรู้ของบริษัทที่โมเดลไม่มีทางรู้เอง (ราคา กติกา ลูกค้า เหตุการณ์จริง) · บริษัทและลูกค้าทั้งหมดเป็นข้อมูลสมมติ
> ทุกคนอ่านได้ · แก้ไขผ่านเจ้าของไฟล์ (ระบุไว้หัวไฟล์) · วันนี้ในเรื่อง = 3 พ.ย. 2026

| ไฟล์ | เนื้อหา | ใครใช้ (skill) |
|---|---|---|
| `brand-guide.md` · `logo.svg` | สี ฟอนต์ น้ำเสียง โครงสไลด์/เอกสาร การใช้โลโก้ | `exec-ploy` (exec-deck), `hr-fah` (jd-writer), `sales-nida` (sales-proposal), `plat-may` |
| `price-list.csv` | ราคาขาย + ต้นทุน 16 รายการ (man-day, cloud, license, MA) | `fin-joy` (pricing-calc), `sales-nida` |
| `margin-rules.md` | สูตร margin, เกณฑ์ 25% / 15%, ส่วนลด, VAT 7% | `fin-joy`, `md-somchai` |
| `customer-data-policy.md` | PDPA ภายใน: ห้ามเลขบัตร/เบอร์มือถือ/เลขบัญชีในเอกสารภายนอก, วิธี mask | `plat-may` (customer-data-policy) — ทุกคนที่แตะข้อมูลลูกค้า |
| `won-proposals/` | proposal ธนาคารที่ชนะ 2 ฉบับ (2024 สยามรุ่งเรือง, 2025 เกษตรไทย) | `sales-nida`, `sales-krit` |
| `deal-001/tor-bank-queue.md` | TOR ธนาคารนครหลวงพัฒนา: จองคิว 120 สาขา + ML พยากรณ์ งบ 4.8M 6 เดือน | LAB 4 ทุกขั้น |
| `deal-002/tor-bank-dispute.md` | TOR ธนาคารเอเชียไทยสากล: พอร์ทัลโต้แย้งรายการบัตร งบ 2.2M 4 เดือน | `sales-krit` (LAB 5) |
| `meeting-notes/2026-10-28-bank-meeting.md` | บันทึกประชุมลูกค้า deal-002 + follow-up 5 ข้อ (มีเบอร์มือถือลูกค้า) | `sales-krit` (follow-up-email) |
| `deal-summaries/` | สรุปดีล 2 ใบ: DS-2026-031 (margin 31%) · DS-2026-034 (margin 18% แผนเสี่ยง) | `md-somchai` |
| `arch-standards.md` | modular monolith, เกณฑ์แยก service, คิว, PostgreSQL/Redis, observability, C4 + Mermaid, การตั้งชื่อ | `sa-ice` (arch-template), `sa-ton` (req-to-spec) |
| `coding-rules.md` | กติกาโค้ด 10 ข้อ (ใช้ให้คะแนน 0–10) รวมข้อ token 15 นาที + rotate | `dev-pond` (coding-standard), `dev-new` |
| `project-scaffold-notes.md` | โน้ตขึ้นโปรเจกต์สมาชิก+ชำระเงิน 4 โปรเจกต์, บั๊ก token, webhook idempotency | `dev-mew` (project-scaffold) |
| `deploy-runbook.md` | runbook ขึ้นระบบฉบับยาว (backup, dry-run, flag, rollback, แจ้งลูกค้า, smoke test, on-call) | `ops-art` (deploy-checklist) |
| `incident-2026-09.md` | log ดิบ payment ล่ม 47 นาที (TLS cert หมดอายุ ไม่มี alert) | `ops-fon` (postmortem) |
| `ml-queue-forecast/` | `experiment-results.csv` 3 รอบ + `notes.md` ของ DS | `ml-jay` (mlflow-experiment), `ml-pim` (model-release) |
| `hr-benefits-faq.md` | สวัสดิการ ทดลองงาน FAQ | `hr-fah`, `hr-oat` |
| `jd-template.md` | แม่แบบ JD + ตำแหน่งเปิด Senior Full-stack Developer (โปรเจกต์จองคิวธนาคาร) | `hr-fah` (jd-writer) |
| `onboarding-notes.md` | สิ่งที่แต่ละแผนกให้คนใหม่วันแรก รวมแพ็ก skill `core` + แผนก | `hr-oat` (onboarding-pack), `dev-new` |
| `monthly-kpi.csv` | KPI ก.ย. และ ต.ค. 2026 เทียบเป้า | `exec-ploy` (exec-deck) |
| `invoices/INV-2026-0142.md` · `invoices/invoicing-rules.md` | ร่างใบแจ้งหนี้รอตรวจ + กติกาออกใบแจ้งหนี้ | `fin-nok` (invoice-check) |
| `qa/failed-test-log.txt` · `qa/bug-template.md` | log Playwright ที่ล้ม + โน้ต QA, แม่แบบรายงานบั๊ก | `qa-bank` (bug-report), `qa-mint` |
| `product/novaqueue-overview.md` | ผลิตภัณฑ์ NovaQueue (ระบบจองคิว SaaS) v1 on-prem กับ v2 cloud, วงจรชีวิตผลิตภัณฑ์, ตัวเลข ต.ค. 2026 | `pm-beam`, `pm-gift` |
| `product/novaqueue-feedback-2026-q3.md` | เสียงลูกค้า v2 ไตรมาส 3: ตัวเลข no-show + 12 ความเห็น (มีเบอร์ลูกค้าปลายทางใน ticket) | `pm-beam` (prd-writer) |
| `product/product-lifecycle-policy.md` | สิ่งที่ PRD ต้องมี + ขั้นตอนเลิกให้บริการ: ประกาศ 180 วัน, ส่งออกข้อมูล 90 วัน, ห้ามปิดก่อนสัญญา MA หมด, ลบข้อมูลใน 30 วัน | `pm-beam`, `pm-gift` (product-sunset) |
| `product/novaqueue-v1-customers.csv` | ลูกค้า v1 5 ราย: สาขา, วันหมดสัญญา MA, ค่า MA, การใช้งาน 30 วัน | `pm-gift` (product-sunset) |

## ผู้บริหารสายใช้ข้อมูลอะไร (ชั้น 2 ของผังองค์กร)

ผู้บริหารสายไม่มีไฟล์ของตัวเอง แต่อ่าน **ข้อมูลของหลายแผนกในสายพร้อมกัน** เพื่อตัดสินใจภาพรวม

| ผู้บริหาร | ดูแลแผนก | อ่านไฟล์ | skill |
|---|---|---|---|
| `cco-wit` สายธุรกิจ | Sales · SA · Product | `monthly-kpi.csv` (pipeline, win rate), `deal-summaries/`, `deal-001/`, `deal-002/`, `product/novaqueue-feedback-2026-q3.md` | `pipeline-review` |
| `cto-nat` สายเทคโนโลยี | Dev · QA · DevOps · ML · ทีมกลาง | `incident-2026-09.md`, `deploy-runbook.md`, `arch-standards.md`, `ml-queue-forecast/`, `qa/failed-test-log.txt`, `monthly-kpi.csv` (incident) | `tech-risk-review` |
| `cfo-ying` สายบริหารและการเงิน | HR · บัญชี | `monthly-kpi.csv` (รายได้, margin, headcount, ตำแหน่งว่าง), `margin-rules.md`, `hr-benefits-faq.md`, `jd-template.md` | `cost-headcount-review` |

> `monthly-kpi.csv` เป็นตัวเลขของทั้งบริษัท (พนักงานจริง 88 คน) ส่วน 28 คนในแล็บคือ **ตัวแทน** ของแต่ละแผนก

## ชื่อที่ใช้ซ้ำข้ามไฟล์ (ให้ตรงกัน)

- ลูกค้าธนาคาร: **สยามรุ่งเรือง** (ลูกค้าเก่า loan portal), **ออมทรัพย์เกษตรไทย** (ลูกค้าเก่า แอปนัดหมาย + ข้อมูล ML), **นครหลวงพัฒนา** (deal-001), **เอเชียไทยสากล** (deal-002)
- ลูกค้าอื่น: ช้อปดีมาร์ท (ShopDee, incident ก.ย.), ไทยโลจิสติกส์ครบวงจร (DS-031), โรงพยาบาลเมืองใหม่ (DS-034), สำนักงานที่ดินเขต 4 และสหกรณ์ครูภาคเหนือ (ลูกค้า NovaQueue v1)
- ผลิตภัณฑ์ของบริษัท: **NovaQueue** (v1 on-prem 2023, v2 cloud SaaS 2025)
- payment gateway สมมติ: ThaiPay GW
