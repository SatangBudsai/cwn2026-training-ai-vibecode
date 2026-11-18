# แหล่งข้อมูลที่ใช้ทบทวน pipeline

> สรุปจาก `company-kit/README.md` (โนวาเทค, ข้อมูลสมมติ) · ปรับปรุง 2026-11-04
> ถ้าเครื่องมี `company-kit/` ให้อ่านต้นฉบับ ถ้าไม่มี ให้ขอไฟล์จากผู้ใช้

| ข้อมูล | ไฟล์ใน company-kit | ดึงอะไร |
|---|---|---|
| KPI รายเดือน | `monthly-kpi.csv` | pipeline_value, win_rate, deals_won/lost, gross_margin, revenue, customer_nps (เทียบเดือนก่อน + target) และคอลัมน์ note |
| สรุปดีลที่คิดราคาแล้ว | `deal-summaries/DS-*.md` (จาก `pricing-calc` ของ `fin-joy`) | ลูกค้า (ใหม่/เดิม), ตาราง man-day + ราคา/ต้นทุน, ส่วนลด, buffer, แผนงาน/ทีม, เงื่อนไขชำระ, ค่าปรับ, เส้นตายที่เซลส์ขอ |
| TOR ดีลที่ยังไม่คิดราคา | `deal-*/tor-*.md` | งบ (ไม่รวม VAT), วันยื่น, ระยะเวลา, ฟีเจอร์บังคับ, SLA, เอกสารที่ต้องยื่น |
| บันทึกประชุมลูกค้า | `meeting-notes/*.md` (จาก `sales-krit`) | follow-up + วันครบกำหนด, สิ่งที่เรารับปาก, คู่แข่ง, ความรู้สึกลูกค้า |
| ผลงานอ้างอิง | `won-proposals/` | มีผลงานพอตามที่ TOR ขอไหม |
| ผลิตภัณฑ์ | `product/novaqueue-overview.md`, `novaqueue-v1-customers.csv`, `product-lifecycle-policy.md` | ลูกค้าแต่ละเวอร์ชัน, วันหมด MA, ใครสนใจย้าย |
| เสียงลูกค้า + ลำดับฟีเจอร์ | `product/novaqueue-feedback-*.md`, `desks/pm-beam/work/*-feature-priority-*.md` (จาก `prd-writer`) | ฟีเจอร์ที่ลูกค้าขอ, ลำดับที่ Product วาง |
| ความพร้อม ML | `ml-queue-forecast/` | ตัวเลขที่ขายได้จริงหรือยัง (ข้อมูลเปรียบเทียบกันได้ไหม, มี monitoring/rollback ไหม) |
| ราคา/กติกากำไร | `price-list.csv`, `margin-rules.md` | อยู่ใน `core:pricing-rules` ส่วนเฉพาะงานนี้อยู่ใน `deal-rules.md` |

## คนในสายธุรกิจ (สำหรับมอบงาน)

| user | บทบาท | skill |
|---|---|---|
| `sales-nida` | หัวหน้าทีมขาย | `sales-proposal` |
| `sales-krit` | เซลส์ | `follow-up-email` |
| `sa-ton` | SA อาวุโส | `req-to-spec` |
| `sa-ice` | SA | `arch-template` |
| `pm-beam` | Head of Product | `prd-writer` |
| `pm-gift` | PM วงจรชีวิตผลิตภัณฑ์ | `product-sunset` |

ส่งต่อนอกสาย: `md-somchai` (`deal-approval`), `cto-nat` (`tech-risk-review`), `fin-joy` (`pricing-calc`), `exec-ploy` (`exec-deck`), `plat-may` (`customer-data-policy`)

## ชื่อที่ต้องใช้ให้ตรงกัน
ธนาคาร: สยามรุ่งเรือง, ออมทรัพย์เกษตรไทย, นครหลวงพัฒนา (deal-001), เอเชียไทยสากล (deal-002) · ผลิตภัณฑ์: **NovaQueue** v1 (on-prem, ดูแลอย่างเดียว) / v2 (cloud SaaS, ฟีเจอร์ใหม่ทำที่นี่เท่านั้น)
