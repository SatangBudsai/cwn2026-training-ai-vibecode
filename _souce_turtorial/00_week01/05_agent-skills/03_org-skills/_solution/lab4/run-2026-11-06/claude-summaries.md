# LAB 4 รอบใหม่ 2026-11-06 · คำตอบของ Claude ทุกโต๊ะ

รันพรอมต์กล่อง ⑦ ทุกตัวอักษร · บริษัท 28 คน คลัง 12 plugin

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

เดินดีล deal-001 ครบ 3 โต๊ะแล้ว ผลคือ **MD ตีกลับ Sales ยังไม่อนุมัติ** ทุกโต๊ะรันจบตามลำดับ (exit code 0, stderr ว่าง) รวมเวลา 11 นาที 27 วินาที

| โต๊ะ | skill ที่หยิบเอง (ดูจาก log) | เวลา | ไฟล์ที่ได้ใน `deals/deal-001/` | ผล |
|---|---|---|---|---|
| **sales-nida** | `sales:sales-proposal`, `core:pricing-rules`, `core:customer-data-policy`, `core:brand-guide` | 6 นาที 16 วินาที | `deal-001-proposal-nakhonluangpattana.md`, `deal-001-pricing-input.json`, `deal-001-pricing-output.md`, `deal-001-internal-notes.md` | ร่าง proposal เสร็จ ราคา 4,800,000 บาทก่อน VAT (เท่าเพดานงบ) ส่วนลด 507,000 บาท margin 28.3% |
| **fin-joy** | `finance:pricing-calc`, `core:pricing-rules` | 3 นาที 32 วินาที | `deal-001-finance-check.md`, `deal-001-finance-check-input.json`, `deal-001-pricing-internal.md`, `deal-001-quotation-draft.md` | ราคาและ margin ถูกต้อง แต่ผู้อนุมัติผิด ดีลนี้ต้องผ่าน MD เพราะส่วนลดจริงคือ 11.9% ของยอดที่ลดได้ และลูกค้าเป็นธนาคาร |
| **md-somchai** | `exec:deal-approval` | 1 นาที 39 วินาที | `approval.md`, `deal-input.json` | ❌ ตีกลับ Sales ตามกติกาข้อ 5 |

## ทำไม MD ตีกลับ
ลูกค้าเป็นธนาคาร แต่ proposal ไม่มี **"ภาคผนวก PDPA"** ซึ่งเป็นข้อที่ต้องตรวจก่อน จึงตีกลับทันทีและยังไม่พิจารณาอีก 6 ข้อ หัวข้อ 4 ของ proposal ใช้แทนไม่ได้ เพราะขาดเนื้อหาทั้ง 3 ข้อที่ภาคผนวกต้องมี:
- **DPA:** ไม่ระบุว่าโนวาเทคเป็นผู้ประมวลผล ธนาคารเป็นผู้ควบคุม และประมวลผลตามคำสั่งธนาคารเท่านั้น
- **Data residency:** ระบุแค่ hosting และ audit log ในไทย ไม่ครอบคลุมข้อมูลทั้งหมดรวม backup และ log
- **แจ้งเหตุละเมิดภายใน 72 ชั่วโมง:** ไม่มีเลย

Margin ไม่ใช่เหตุที่ตีกลับ และ MD ยังไม่ถือว่าข้อกำไรผ่าน นอกจากนี้ Sales ต้องแก้โน้ตภายในและ `deal-001-pricing-output.md` ที่ยังเขียนว่าหัวหน้าทีมขายอนุมัติเองได้

## เรื่องที่อาจติดในรอบหน้า
กำหนดยื่นคือ 13 พ.ย. 2026 เวลา 16:00 น. และเมื่อส่งกลับมา MD จะพิจารณาใหม่ทั้ง 7 ข้อ
- **Reuse โค้ด:** ยังไม่ยืนยันสิทธิ์ และ SA ยังไม่ตรวจ man-day ถ้าใช้โค้ดเดิมไม่ได้เลย margin จะเหลือ 14.9% ซึ่งต่ำกว่าเกณฑ์ปฏิเสธ 15%
- **MA 8x5 หรือ 24x7:** TOR ให้ตอบรับ Sev 1 ใน 30 นาทีโดยไม่จำกัดเวลาทำการ ถ้าใส่ 24x7 ในราคาหลัก margin จะเหลือ 23.5%
- **ทีม:** tech lead จะถือ 3 โปรเจกต์ช่วง ม.ค.–ก.พ. 2027 ซึ่งเกินเกณฑ์ 2 โปรเจกต์

## ผลการตรวจการรัน
- **ข้อความ:** ตรงกับที่กำหนดทุกตัวอักษรทั้งสามโต๊ะ โดยเทียบกับ transcript ของแต่ละ session และคั่นกติกาท้ายข้อความด้วยเว้นวรรคหนึ่งช่อง
- **ขอบเขต:** ไม่พบ tool call ที่อ้างถึงโต๊ะคนอื่น, skill แผนกอื่น, `_solution` หรือ `.gitea-token` การตรวจนี้ดูจาก input ของ tool call เท่านั้น ไม่เห็นสิ่งที่สคริปต์ไปเปิดระหว่างรัน
- **การบังคับใช้:** กติกาเป็นแค่ข้อความ ไม่ได้ล็อกสิทธิ์จริง และโหมด `bypassPermissions` ไม่กั้นการเข้าถึงไฟล์
- **การมองเห็น skill:** แต่ละโต๊ะเห็น plugin ของ NovaTech เฉพาะ `core` กับของแผนกตัวเอง แต่ยังเห็น skill ระดับเครื่องด้วย เช่น `hyperframes` และ `exam-mcq` จึงไม่ได้เห็น "เฉพาะ skill ของโต๊ะ" แบบแยกขาด แต่ไม่มีโต๊ะไหนหยิบ skill กลุ่มนี้มาใช้
- **การแก้ไฟล์ดีล:** ผมไม่ได้แก้ไฟล์ในโฟลเดอร์ดีล สร้างเองแค่ `logs/lab4/` ส่วน `deals/deal-001/` ถูกสร้างโดยโต๊ะ sales-nida เพราะยังไม่มีมาก่อน

Log อยู่ที่ `logs/lab4/sales-nida.jsonl`, `logs/lab4/fin-joy.jsonl` และ `logs/lab4/md-somchai.jsonl`

ถ้าจะเดินต่อรอบที่สอง ให้ส่งงานกลับโต๊ะ sales-nida ตามรายการแก้ใน `deals/deal-001/approval.md`

## โต๊ะ `fin-joy` · 210 วินาที · 25 รอบ

skill ที่หยิบเอง: `finance:pricing-calc`, `core:pricing-rules`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List files in the desk, company kit, and deal folder |
| 2 | Skill | finance:pricing-calc |
| 3 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 4 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 5 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 6 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 7 | Skill | core:pricing-rules |
| 8 | Bash | List finance pricing skill files and print its references |
| 9 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 10 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 11 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 12 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 13 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\finance\1.0.0\skills\pricing-calc\scripts\price_calc.py |
| 14 | Bash | Compare price lists, rules and scripts across kit, plugin and archive |
| 15 | Bash | Run pricing scenarios, compare proposal table, and scan for leaks |
| 16 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 17 | Bash | Generate official pricing files in the deal folder and check them |
| 18 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 19 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 20 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 21 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 22 | Grep | ต้นทุน\|margin\|buffer\|กำไร |

**คำตอบของโต๊ะนี้**

ตรวจดีล-001 เสร็จแล้ว **ราคาและกำไรถูกทุกบรรทัด แต่ผู้อนุมัติในโน้ตของเซลส์ผิด ดีลนี้ต้องให้ MD อนุมัติ** จึงยังไม่ควรยื่นจนกว่า MD จะอนุมัติ

| รายการ | ค่า (บาท) |
|---|--:|
| ราคาตาม price-list | 5,307,000 |
| ส่วนลดพิเศษ | 507,000 |
| รวมก่อน VAT (เท่าเพดานงบพอดี) | 4,800,000 |
| รวม VAT 7% | 5,136,000 |
| ต้นทุน | 3,441,600 |
| กำไรขั้นต้น | 1,358,400 |
| **Margin** (ผ่านเกณฑ์ 25% แต่ต่ำกว่าเป้า 30%) | **28.3%** |

## สิ่งที่ต้องแก้
- **ผู้อนุมัติ:** เซลส์คิดส่วนลด 9.6% จากยอดรวม แต่เมื่อคิดจากยอดที่ลดได้ (ไม่รวม MA และ cloud) จะเป็น **11.9%** ซึ่งเกินสิทธิ์หัวหน้าทีมขาย และ `pricing-calc` ยังกำหนดให้ลูกค้าธนาคารหรือดีลตั้งแต่ 1 ล้านบาทต้องผ่าน MD เสมอ
- **ราคาก่อน reuse ในโน้ต:** ที่ถูกคือ 6,326,000 ไม่ใช่ 6,337,000 เพราะการปัดเศษทศนิยมทำให้ Dev เกินมา 1 วัน เรื่องนี้ไม่กระทบราคาที่ยื่น
- **`price_calc.py`:** มีปัญหาปัดเศษแบบเดียวกัน และแม่แบบพิมพ์คำว่า "margin" ลงร่างใบเสนอราคา ผมแก้เฉพาะในร่างนี้ ตัว skill ยังไม่ได้แก้ ถ้ารันใหม่ต้องแก้ซ้ำ

## ความเสี่ยงที่ MD ควรเห็น
ถ้าคงราคาที่ 4,800,000 margin จะเปลี่ยนตามกรณีนี้:

| กรณี | Margin | ผล |
|---|--:|---|
| Reuse โค้ดไม่ได้เลย (สิทธิ์โค้ดยังไม่ยืนยัน และ SA ยังไม่ตรวจ man-day) | **14.9%** | **ต่ำกว่าเกณฑ์ 15% ต้องปฏิเสธ** |
| ใช้ CL-L แทน CL-M | 20.8% | MD อนุมัติพร้อมเหตุผลเชิงกลยุทธ์ |
| PM ครึ่งเวลา 60 วัน (ก่อน buffer) | 22.7% | MD อนุมัติพร้อมเหตุผลเชิงกลยุทธ์ |
| ธนาคารไม่รับ MA 8x5 จนต้องใช้ MA-PREM | 23.5% | MD อนุมัติพร้อมเหตุผลเชิงกลยุทธ์ |

- **ที่ว่างของต้นทุน:** เพิ่มได้อีกเพียง 158,400 บาท ก่อน margin จะต่ำกว่า 25%
- **QA:** ถูกลดจาก 45 เป็น 38 วัน แต่กติกาห้ามตัด QA เพื่อลดราคา SA จึงต้องยืนยันว่าลดเพราะ reuse จริง
- **ก่อนออกใบแจ้งหนี้:** ต้องตกลงว่าส่วนลดหักจากก้อนไหน และใครรับค่า hosting กับ license ราว 1–2 เดือนที่หมดก่อน MA

## ขอบเขตการตรวจ
- **ไม่ได้ยืนยัน:** ผมตรวจการคำนวณและการใช้กติกาเท่านั้น ไม่ได้ยืนยันว่า man-day เพียงพอ และไม่ได้ตัดสินอนุมัติดีล
- **ไฟล์ของเซลส์:** ไม่ได้แก้ไฟล์เดิม คุณนิดาจึงต้องแก้โน้ตและ `deal-001-pricing-output.md` เอง แล้วส่งเรื่องให้ MD ทันยื่นวันที่ 13 พ.ย. 16:00 น.
- **การเข้าถึง:** อ่านเฉพาะพื้นที่ที่อนุญาตและ skill ของ core กับ finance ไม่ได้เปิด `.gitea-token`

## ไฟล์ที่วางใน `deals/deal-001/`
เริ่มอ่านจาก `deal-001-finance-check.md`
- `deal-001-finance-check.md`
- `deal-001-pricing-internal.md`
- `deal-001-quotation-draft.md`
- `deal-001-finance-check-input.json`

## โต๊ะ `md-somchai` · 96 วินาที · 28 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | exec:deal-approval |
| 2 | Glob | **/* |
| 3 | Glob | **/* |
| 4 | Glob | **/* |
| 5 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\references\approval-rules.md |
| 6 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\references\approval-template.md |
| 7 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\scripts\deal_check.py |
| 8 | Read | C:\t\org05l2\novatech\desks\md-somchai\notes\deal-rules.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 14 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-internal.md |
| 15 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 16 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 17 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 18 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 19 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 20 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 21 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 22 | Grep | ภาคผนวก\|PDPA\|72\|breach\|residency\|data center\|แจ้งเหตุ\|ละเมิด\|ผู้ควบคุม\|ผู้ประมวลผล\|ตามคำสั่ง\|DPA\|ข้อตกลงประม |
| 23 | Grep | \b0[689]\d[- ]?\d{3}[- ]?\d{4}\b\|\b\d[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d\b |
| 24 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-input.json |
| 25 | PowerShell | Recheck deal price, cost and margin with the approval script |
| 26 | Write | C:\t\org05l2\novatech\deals\deal-001\approval.md |

**คำตอบของโต๊ะนี้**

**ยังอนุมัติไม่ได้ ผลคือ ❌ ตีกลับ Sales (คุณนิดา)** เพราะลูกค้าเป็นธนาคารแต่ proposal ไม่มี "ภาคผนวก PDPA" ตามกติกาข้อ 5 จึงต้องตีกลับทันทีและไม่พิจารณาข้ออื่นต่อ

- **สิ่งที่ขาด:** ต้องมีภาคผนวกชื่อนี้ 3 ข้อพอดี แต่หัวข้อ 4 ของ proposal แทนกันไม่ได้
  - **DPA:** บอกแค่ว่า "จัดทำข้อตกลงประมวลผลข้อมูล" ไม่ระบุว่าใครเป็นผู้ควบคุม ใครเป็นผู้ประมวลผล และไม่ระบุว่าประมวลผลตามคำสั่งธนาคารเท่านั้น
  - **Data residency:** ระบุแค่ hosting และ audit log ในไทย ไม่ครอบคลุมข้อมูลทั้งหมดรวม backup และ log
  - **แจ้งเหตุละเมิดภายใน 72 ชั่วโมง:** ไม่มีเลย
- **Margin ไม่ใช่เหตุที่ตีกลับ:** 28.3% ตรงกับที่สคริปต์คำนวณซ้ำ (ราคา 4,800,000 บาท ต้นทุน 3,441,600 บาท รวม buffer แล้ว) แต่ข้อกำไรยังไม่ถือว่าผ่าน
- **ผู้อนุมัติในเอกสารเซลส์ผิด:** โน้ตภายในและ `deal-001-pricing-output.md` ยังเขียนว่าหัวหน้าทีมขายอนุมัติเองได้ แต่ดีลนี้ต้องผ่าน MD จึงให้ Sales แก้ด้วย

กำหนดยื่นคือ 13 พ.ย. 2026 16:00 น. ถ้าเซลส์เพิ่มภาคผนวกแล้วส่งกลับมา ต้องพิจารณาใหม่ทั้ง 7 ข้อ

**เรื่องที่น่าจะเป็นปัญหาในรอบหน้า** (ยังไม่ใช่ผลพิจารณา ผมสรุปไว้ท้าย `approval.md` พร้อมเจ้าของงาน)
- **Reuse โค้ด:** ถ้าใช้โค้ดเดิมไม่ได้เลย margin จะเหลือ 14.9% ซึ่งต่ำกว่าเกณฑ์ปฏิเสธ 15% และ SA ยังไม่ได้ตรวจ man-day
- **MA 8x5 หรือ 24x7:** TOR ให้ตอบรับ Sev 1 ใน 30 นาทีโดยไม่จำกัดเวลาทำการ ถ้าใส่ 24x7 ในราคาหลัก margin จะเหลือ 23.5% ซึ่งต้องมีเหตุผลเชิงกลยุทธ์พร้อมหลักฐาน
- **ส่วนลด 11.9%:** เกินสิทธิ์หัวหน้าทีมขาย คุณต้องเป็นผู้ตัดสิน
- **ทีม:** tech lead จะถือ 3 โปรเจกต์ช่วง ม.ค.–ก.พ. 2027 ซึ่งเกินเกณฑ์ 2 โปรเจกต์ และดีลนี้ยังไม่มี SA

ผมลงชื่อคุณสมชายเป็นผู้พิจารณา วันที่ 2026-11-06 ตามวันที่ของระบบ และไม่ได้แก้ proposal ผมอ่านเฉพาะพื้นที่ที่คุณอนุญาตและ skill ของฝ่ายบริหาร ไม่ได้เปิด `.gitea-token` บนโต๊ะคุณ

ไฟล์อยู่ใน `C:\t\org05l2\novatech\deals\deal-001\`
- `approval.md`
- `deal-input.json`

## โต๊ะ `sales-nida` · 373 วินาที · 44 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`, `core:pricing-rules`, `core:customer-data-policy`, `core:brand-guide`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | sales:sales-proposal |
| 2 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 3 | Bash | List my desk, company kit, and deal folder |
| 4 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 5 | Bash | List desk settings, proposal skill files, and deals folder |
| 6 | Skill | core:pricing-rules |
| 7 | Skill | core:customer-data-policy |
| 8 | Skill | core:brand-guide |
| 9 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 10 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 11 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 12 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2025-kaset-thai-branch-appointment.md |
| 13 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2024-siam-rungruang-loan-tracking.md |
| 14 | Read | C:\t\org05l2\novatech\company-kit\ml-queue-forecast\notes.md |
| 15 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-overview.md |
| 16 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-feedback-2026-q3.md |
| 17 | Read | C:\t\org05l2\novatech\company-kit\product\product-lifecycle-policy.md |
| 18 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\proposal-template.md |
| 19 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\checklist.md |
| 20 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\pdpa-rules.md |
| 21 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\winning-patterns.md |
| 22 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\scripts\price.py |
| 23 | Read | C:\t\org05l2\novatech\desks\sales-nida\.claude\settings.json |
| 24 | Read | C:\t\org05l2\novatech\company-kit\arch-standards.md |
| 25 | Read | C:\t\org05l2\novatech\company-kit\ml-queue-forecast\experiment-results.csv |
| 26 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 27 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 28 | Grep | นครหลวง\|deal-001\|NLP-PROC\|จองคิว\|sales-nida |
| 29 | Bash | Create deal folder and run pricing scenarios |
| 30 | Grep | 8x5\|24x7\|เวลาทำการ\|ชั่วโมงทำการ\|on-call |
| 31 | Bash | Run pricing script and comparison scenarios |
| 32 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 33 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 34 | Grep | 0[689]\d-\d{3}-\d{4}\|\b\d{13}\b\|\d-\d{4}-\d{5}-\d{2}-\d\|buffer\|margin\|ต้นทุน\|กำไร\|ดีที่สุด\|อันดับหนึ่ง\|100%\|No |
| 35 | Grep | 0[689]\d-\d{3}-\d{4}\|\b\d{13}\b |
| 36 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 37 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 38 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 39 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |

**คำตอบของโต๊ะนี้**

ร่าง proposal เสร็จและวางไว้ใน `../../deals/deal-001/` แล้ว แต่ยังส่งธนาคารไม่ได้ ต้องกรอกช่องที่เว้นไว้ จัดหน้าตามแบรนด์ และรอคุณอนุมัติส่วนลด กำหนดยื่นคือ **13 พ.ย. 2026 เวลา 16:00 น.**

## สรุปราคา

| รายการ | ค่า |
|---|---|
| ราคาก่อน VAT | 4,800,000 บาท (เท่าเพดานงบ TOR พอดี) |
| ราคารวม VAT 7% | 5,136,000 บาท |
| ส่วนลดพิเศษ | 507,000 บาท (9.6%) อยู่ในอำนาจอนุมัติของคุณ |
| Margin | 28.3% ผ่านเกณฑ์ 25% แต่ต่ำกว่าเป้าบริษัท 30% |

ฉบับก่อน reuse งานเดิมราคา 6,337,000 บาท ผมจึงลด man-day ก่อน แล้วใช้ส่วนลดปิดส่วนที่เหลือ โดยไม่ได้ลด MA หรือ cloud

## เรื่องที่ต้องตัดสินใจ
**จะขาย MA แบบ 8x5 หรือ 24x7?** ในร่างผมเลือก 8x5 และเสนอ 24x7 เป็นตัวเลือกเสริมอีก 360,000 บาท
- **ถ้าคง 8x5:** ระบบจองเปิดทั้งวัน แต่เหตุ Sev 1 นอกเวลาทำการจะไม่มีคนตอบรับใน 30 นาที จึงเสี่ยงพลาด uptime 99.5% ด้วย
- **ถ้าใส่ 24x7 ในราคาหลัก:** ส่วนลดจะเป็น 15.3% และ margin ลดเหลือ 23.5% ต้องให้ MD อนุมัติ

เรื่องอื่นที่ผมเลือกแทนคุณไว้ เช่น ขนาด hosting และค่า pentest/SMS ที่ไม่รวมในราคา อยู่ใน internal notes ข้อ 2

## ก่อนส่ง
- **ช่องที่เว้นไว้:** เลขที่เอกสาร ชื่อ SA และช่วงเวลาที่แน่นอนของบริการ 8x5 เพราะไม่พบข้อมูลในพื้นที่ที่อ่านได้ จึงไม่ได้เดา
- **จัดหน้า:** ไฟล์ยังเป็น `.md` ต้องทำโลโก้ ฟอนต์ และเลขหน้าตามแบรนด์ก่อนยื่น
- **ฝ่ายจัดซื้อ:** ถามว่าต้องแยกซองหรือแยกไฟล์ข้อเสนอเทคนิคกับราคาหรือไม่
- **SA:** man-day เป็นการประเมินของฝั่งขายเทียบกับดีลเก่า ยังไม่มี SA ตรวจ
- **บัญชี:** ยังไม่มีการตรวจราคาชั้นที่สอง เพราะ `pricing-calc` เป็น skill ของแผนกบัญชีและคุณห้ามเปิด จึงควรให้คุณจอยตรวจ
- **สิทธิ์ reuse:** ราคาที่ลดลงอาศัยการนำงานเดิมมาใช้ แต่ผมยังไม่เห็นสัญญาว่าใครถือสิทธิ์โค้ด ควรเช็กก่อนยื่น

## จุดที่ควรรู้
- **TOR ขัดกันเอง:** ข้อ 3.1 ต้องตรวจวันเกิดและส่ง OTP แต่ API ในข้อ 3.4 คืนแค่ชื่อ ระดับลูกค้า และ CIF ผมใส่เป็นข้อขอยืนยันกับธนาคารแล้ว
- **ผลทดลอง ML:** ไม่ได้อ้าง MAPE 15.2% เพราะเป็นผลต้นแบบบนข้อมูลของธนาคารอื่น จึงผูกแค่เกณฑ์ตรวจรับ MAPE ไม่เกิน 20% ตาม TOR แต่ยังไม่มีผลบนข้อมูลของธนาคารนี้
- **Pentest:** ไม่ได้เขียนว่า "ผ่านทุกครั้ง" เพราะเอกสารเก่าไม่ตรงกัน จึงอ้างเฉพาะว่าสยามรุ่งเรืองผ่าน
- **เบอร์มือถือ:** เบอร์ผู้ประสานงานใน TOR ไม่ถูกคัดลอกลงไฟล์ไหน ผมค้นซ้ำแล้วไม่พบ
- **ขอบเขตการเข้าถึง:** เปิดเฉพาะโต๊ะของคุณ, `company-kit/` และ skill แผนกขายกับ `core` ส่วน `.gitea-token` บนโต๊ะไม่ได้เปิด
- **โฟลเดอร์กลาง:** `deals/deal-001` ยังไม่มีมาก่อน ผมจึงสร้างใหม่ในเครื่อง ยังไม่ได้ซิงก์ไปที่ไหน ถ้าโฟลเดอร์กลางจริงอยู่บน Gitea ต้องเอาไฟล์ขึ้นอีกครั้ง

## ไฟล์
มีเฉพาะไฟล์ proposal ที่ส่งลูกค้าได้ อีก 3 ไฟล์มีข้อมูลภายใน และ `pricing-output` กับ `internal-notes` มีต้นทุนและ margin

ไฟล์อยู่ใน `C:\t\org05l2\novatech\deals\deal-001\`:
- `deal-001-proposal-nakhonluangpattana.md`
- `deal-001-pricing-input.json`
- `deal-001-pricing-output.md`
- `deal-001-internal-notes.md`

