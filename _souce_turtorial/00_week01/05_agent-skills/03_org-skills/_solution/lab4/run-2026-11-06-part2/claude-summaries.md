# LAB 4 (ต่อ) รอบใหม่ 2026-11-06 · คำตอบของ Claude ทุกโต๊ะ

รันพรอมต์กล่อง ⑨ ทุกตัวอักษร · MD ตีกลับครบเพดาน จึงไม่ได้ส่งงานให้ 5 แผนก

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

## deal-001 ยังไม่ผ่าน MD และห้ามยื่นธนาคาร
MD ตีกลับทั้ง 4 ครั้งจนครบเพดาน 3 รอบแก้ ผมจึงหยุดและไม่ได้ส่งงานให้ 5 แผนก ดีลนี้ยังไม่ถูกปฏิเสธ เพราะ MD รอคำตอบที่โต๊ะ Sales และ SA ปิดเองไม่ได้

| ขั้น | โต๊ะ | skill ที่หยิบเอง (จาก log) | เวลา | ไฟล์ที่สร้างหรือแก้ | ผล |
|---|---|---|---|---|---|
| 1 | sales-nida | `sales:sales-proposal`, `core:pricing-rules`, `core:customer-data-policy` | 3:44 | proposal, internal-notes, pricing-output, resubmission-to-md | เพิ่มภาคผนวก PDPA 3 ข้อและแก้ผู้อนุมัติเป็น MD |
| 2 | md-somchai | `exec:deal-approval` | 3:53 | approval, approval-round1, deal-input | ❌ ภาคผนวกครบ แต่ข้อ 2 แผนงานและข้อ 6 ทีมไม่ผ่าน ข้อ 1 และ 5 ยังไม่มีผู้ยืนยัน |
| 3 (รอบแก้ 1) | sa-ton | `core:pricing-rules`, `core:customer-data-policy` | 9:02 | sa-review, sa-plan-for-proposal, sa-recalc-input | man-day เป็น 337 วัน margin ลดจาก 28.3% เหลือ 21.2% |
| 4 | sales-nida | `sales:sales-proposal`, `core:pricing-rules`, `sales:follow-up-email` | 7:24 | proposal, internal-notes, pricing-output, nida-drafts-to-send, resubmission-round3-to-md | แก้ proposal และร่างคำขอ 10 ฉบับ ยังไม่ได้ส่ง |
| 5 | md-somchai | `exec:deal-approval` | 5:07 | approval, approval-round2, deal-input-round3 | ❌ ข้อ 1 และ 6 ไม่ผ่าน ข้อ 5 ยังไม่มีผู้ยืนยัน |
| 6 (รอบแก้ 2) | sa-ton | ไม่ได้หยิบ | 7:56 | sa-round3-to-md, sa-review, sa-plan-for-proposal, sa-recalc-input | ปรับแผนตามวันหยุด ยืนยันเลข 337 วัน แต่ยังไม่ลงชื่อ |
| 7 | sales-nida | `sales:sales-proposal`, `sales:follow-up-email` | 8:10 | proposal, internal-notes, nida-drafts-to-send, resubmission-round3-update-to-md | ตัดข้อความผลงานที่ไม่มีหลักฐาน ร่างคำขอเพิ่มเป็น 14 ฉบับ |
| 8 | md-somchai | `exec:deal-approval` | 6:16 | approval, approval-round3 | ❌ ข้อเดิม |
| 9 (รอบแก้ 3) | sa-ton | ไม่ได้หยิบ | 9:16 | sa-round4-to-md, sa-round3-to-md, sa-review, sa-plan-for-proposal, sa-recalc-input | เสนอทางเลือก 339 วัน margin 20.8% |
| 10 | sales-nida | `sales:sales-proposal` | 7:04 | proposal, internal-notes, nida-drafts-to-send, resubmission-round3-update-to-md, resubmission-round4-to-md | แก้ตาม MD ครบ และร่างคำขอเพิ่มเป็น 15 ฉบับ |
| 11 | md-somchai | `exec:deal-approval` | 5:40 | approval, approval-round4, deal-input-round5-339 | ❌ ตีกลับ **(ผลล่าสุด)** |
| 3 ของแผน | dev-mew, ml-jay, qa-mint, ops-art, hr-fah | – | – | – | **ไม่ได้รัน** เพราะ MD ยังไม่อนุมัติ |

ทุกขั้นจบโดยไม่มี error ใช้เวลารวม 73:32 นาที ค่าใช้จ่ายประมาณ 27 USD log อยู่ที่ `logs/lab4b/`

## สถานะดีล
- **ตัวเลข:** ราคา 4,800,000 บาทชนเพดาน margin 21.2% ที่ 337 วัน และเหลือ 10.8% ถ้า reuse โค้ดไม่ได้เลย ซึ่งต้องปฏิเสธ
- **ข้อที่ไม่ผ่าน:** ข้อ 1 กำไร เพราะยังไม่มีหลักฐานเชิงกลยุทธ์ และข้อ 6 ทีม เพราะยังไม่มี SA ที่รับงานหรือ tech lead ที่ถือไม่เกิน 2 โปรเจกต์
- **ข้อที่ยังไม่ปิด:** ข้อ 5 PDPA ภาคผนวกครบแล้ว แต่ยังไม่มีผู้ลงชื่อยืนยัน data residency
- **กำหนดการ:** MD ตัดสินจริงวันที่ 12 พ.ย. และกำหนดยื่นคือ 13 พ.ย. 16:00 น. ถ้าหลักฐานไม่ครบ MD ระบุว่าการไม่ยื่นเป็นผลที่ยอมรับได้

## งานที่ค้าง
| ใคร | ต้องทำ | ภายใน |
|---|---|---|
| **นิดา** (ทำก่อน) | ตรวจอีเมลและ CRM หา LOI, MOU หรืออีเมลลูกค้า แล้วเลือกทาง ก หรือ ข พร้อมลงชื่อใน `deal-001-resubmission-round4-to-md.md` ถ้าไม่มีและหาไม่ทัน ให้ปิดเป็นไม่ยื่นโดยไม่ต้องส่งร่าง | เช้า 9 พ.ย. |
| **สมชาย** | แจ้งสถานะ DS-2026-034 และทวนข้อตัดสินที่ Claude ร่างในชื่อตัวเอง | 9 พ.ย. |
| **ต้น** (sa-ton) | รับงาน กรอกภาระงาน ลงชื่อ ยืนยันข้อความเรื่องการเชื่อม LOS และผล pentest | 9 พ.ย. |
| **นิดา** (ถ้าเดินต่อ) | ส่งร่างทั้ง 15 ฉบับ แก้ร่างตามที่ MD ขอ และขอความยินยอมอ้างผลงาน 2 ราย | ก่อนส่ง / 9 พ.ย. |
| `ops-art` | ตรวจระบบจริงและลงชื่อ data residency 6 จุด | 10 พ.ย. |
| `plat-may` | ตีความเรื่อง LINE, SMS OTP และการลบข้อมูลภายใน 90 วัน | 10 พ.ย. |
| `pm-beam` และเจ้าของสัญญา | ยืนยันสิทธิ์ reuse | 11 พ.ย. |
| `fin-joy` | คิดราคาชุดใหม่ | 11 พ.ย. |
| `dev-pond` | ระบุ tech lead และชื่อคนตามบทบาท | 11 พ.ย. |
| `hr-fah` และ `dev-pond` | ถ้าไม่ยื่น ต้องทบทวนตำแหน่ง Senior Full-stack ก่อนเซ็นรับ และเช็กว่า ML Engineer ผูกกับดีลนี้หรือไม่ | ก่อนเซ็นรับ |

## เรื่องที่ควรดูต่อ
1. **ด่วนวันนี้ (deal-002):** MD พบในบันทึกประชุมว่า `sales-krit` ต้องส่งผลงานอ้างอิงให้ธนาคารเอเชียไทยสากลภายในวันนี้ แต่เอกสารที่ MD อ่านได้ไม่มีความยินยอมจากธนาคารทั้งสองแห่ง และไม่มีผล pentest ที่เคยบอกลูกค้าว่าผ่านทุกครั้ง รอบนี้ไม่ได้ตรวจว่าส่งอะไรไปแล้ว จึงควรถาม `sales-krit` วันนี้
2. **skill ของ Sales ยังไม่ได้อัปเดตที่โต๊ะนิดา:** `installed_plugins.json` ระบุว่า `sales` 1.1.0 ติดตั้งเฉพาะ `sales-krit` ส่วน `sales-nida` ยังเป็น 1.0.0 ทุกรอบ ขั้น 1 จึงอ่านกติกา 1.1.0 จาก cache เอง ส่วนขั้น 7 และ 10 ใช้ไฟล์ 1.0.0
3. **บั๊ก `price.py`:** ตามรายงานของ sales-nida สคริปต์ปัดเศษผิดและคิดส่วนลดจากราคาเต็ม ควรแก้ก่อนใช้กับดีลอื่น ผมยังไม่ได้ทดสอบเอง
4. **ข้อความ "แก้แล้ว" ที่ส่งให้ MD ไม่ตรงความจริงทั้งหมด:** แต่ละรอบมีงานค้างจริง และ MD ก็ระบุไว้ในผลว่าเอกสารยังเป็นร่างที่ไม่ลงชื่อ

## การตัดสินใจและการตรวจสอบ
- **ลำดับรอบแก้:** MD ขอทั้งงาน Sales และ SA ผมจึงส่งให้ sa-ton ก่อน sales-nida ทุกรอบ เพราะตัวเลขของ SA มีผลต่อ proposal
- **โต๊ะ SA:** ใช้ `sa-ton` ตามกติกาของคุณ แม้รอบแรก MD เสนอ `sa-ice` ซึ่ง MD ถอนคำแนะนำภายหลัง
- **โฟลเดอร์ดีล:** ผมไม่ได้แก้ไฟล์เอง และ checksum หลังจบแต่ละขั้นตรงกับก่อนเริ่มขั้นถัดไปทุกคู่
- **การส่งออกภายนอก:** ทุกโต๊ะมีเครื่องมือ Gmail และรันแบบ bypassPermissions แต่ log ไม่มีการเรียก MCP หรือคำสั่งเครือข่ายอย่าง `curl` และ `git push`
- **ขอบเขตการอ่าน:** การสแกน log ไม่พบการเปิดโต๊ะคนอื่น `_solution` หรือ skill แผนกอื่น แต่เป็นการสแกนจากรูปแบบ path จึงไม่ใช่การตรวจทุกคำสั่ง

ถ้าต้องการปิดงานค้าง ให้สั่งเปิดเส้นทางไป `ops-art`, `plat-may`, `pm-beam`, `fin-joy` และ `dev-pond` เพิ่ม แต่หลักฐานจากลูกค้า ลายเซ็น และการยืนยันจากระบบจริงยังต้องมาจากคนจริง

## โต๊ะ `1-sales-nida` · 221 วินาที · 68 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`, `core:pricing-rules`, `core:customer-data-policy`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 2 | Glob | **/* |
| 3 | Glob | **/* |
| 4 | Glob | **/* |
| 5 | Skill | sales:sales-proposal |
| 6 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 7 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 8 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-internal.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input.json |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 14 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 15 | Glob | **/* |
| 16 | Read | C:\t\org05l2\novatech\desks\sales-nida\.claude\settings.json |
| 17 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 18 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 19 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\pdpa-rules.md |
| 20 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\checklist.md |
| 21 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\proposal-template.md |
| 22 | Grep | ภาคผนวก\|Annex\|72 ชั่วโมง\|Data residency\|breach |
| 23 | PowerShell | Check installed novatech plugin versions and remote skill repo head |
| 24 | Glob | **/* |
| 25 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.1.0\skills\sales-proposal\SKILL.md |
| 26 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.1.0\skills\sales-proposal\references\pdpa-rules.md |
| 27 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.1.0\skills\sales-proposal\references\checklist.md |
| 28 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.1.0\skills\sales-proposal\references\proposal-template.md |
| 29 | Skill | core:pricing-rules |
| 30 | Skill | core:customer-data-policy |
| 31 | Glob | */skills/customer-data-policy/**/* |
| 32 | Glob | */skills/brand-guide/**/* |
| 33 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.1.0\skills\sales-proposal\references\winning-patterns.md |
| 34 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\customer-data-policy\references\bank-pdpa-annex.m |
| 35 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\customer-data-policy\SKILL.md |
| 36 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\customer-data-policy\references\doc-type-rules.md |
| 37 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\customer-data-policy\references\policy-summary.md |
| 38 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\core\1.1.0\skills\brand-guide\SKILL.md |
| 39 | Bash | Compare pricing skill versions, rerun price script, scan proposal for personal data |
| 40 | Grep | Singapore\|สิงคโปร์\|ap-southeast\|ต่างประเทศ\|นอกประเทศ\|region\|ภูมิภาค\|data center\|residency\|cross-region\|S3\|off |
| 41 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 42 | Grep | backup\|สำรอง\|log management\|APM\|WAF\|\blog\b |
| 43 | Grep | backup\|สำรอง\|\blog\b |
| 44 | Grep | backup\|สำรอง\|log |
| 45 | Grep | CL-\|LIC-\|MA- |
| 46 | Bash | Rerun pricing script with UTF-8 output and list deal folder timestamps |
| 47 | Bash | Rerun pricing script in UTF-8 mode to confirm totals |
| 48 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 49 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 50 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 51 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 52 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 53 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 54 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 55 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 56 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 57 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 58 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 59 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 60 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 61 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 62 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 63 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-to-md.md |
| 64 | Bash | Run personal-data scan, annex diff, and stale-value checks on deal files |

**คำตอบของโต๊ะนี้**

ผมแก้ proposal ของ deal-001 ครบตามที่ MD สั่งและวางเอกสารส่งกลับในโฟลเดอร์ดีลแล้ว แต่**ยังยื่นธนาคารไม่ได้** เพราะยังไม่มี SA หรือ DevOps ยืนยัน data residency ตามกติกาใหม่ และ MD ยังไม่อนุมัติ

## สิ่งที่แก้ตาม MD
- **ภาคผนวก PDPA:** เพิ่มใน proposal ต่อจากหัวข้อ 9 ครบ 3 ข้อ ข้อความตรงกับต้นฉบับของบริษัททุกตัวอักษร และให้หัวข้อ 2 กับ 4.2 ชี้มาที่ภาคผนวกนี้
- **ผู้อนุมัติ:** แก้เป็น MD ทั้งในโน้ตภายในข้อ 1 และ `deal-001-pricing-output.md` โดยระบุส่วนลดเป็น 11.9% ของยอดที่ลดได้
- **ตัวเลขในโน้ต:** แก้ราคาเต็มก่อน reuse เป็น 6,326,000 บาทตามผลตรวจบัญชี และคิด % ส่วนลดของทางเลือก 24x7 และ CL-L ใหม่จากยอดที่ลดได้
- **ราคาที่เสนอ:** ไม่เปลี่ยน ยังเป็น 4,800,000 บาทก่อน VAT และ margin 28.3%

## ผลตรวจ
- **ผ่าน:** ไม่พบเบอร์มือถือ เลขบัตร หรือคำว่าต้นทุน/margin/buffer/กำไรใน proposal หัวข้อเรียงครบ และไม่มีเลขเก่าตกค้าง
- **จุดที่สแกนเจอ:** 5 จุดในเอกสารภายในเป็นการจับผิด คือคำว่า "ผลตรวจ" และชื่อ "คุณนิดา"
- **ยังไม่ผ่าน:** เช็กลิสต์ข้อผู้ยืนยัน data residency, เลขที่เอกสาร, ชื่อ SA และการจัดหน้าตามแบรนด์ (ยังเป็นไฟล์ `.md`)
- **การอนุมัติ:** เช็กลิสต์ข้อ margin และส่วนลดรอผลจาก MD

## เรื่องที่ต้องตามต่อ
1. **Data residency:** ผมไม่พบว่ามีส่วนใดอยู่นอกประเทศไทย แต่เอกสารไม่ระบุที่ตั้งของ backup, log management และ WAF ส่วน LINE กับ SMS OTP ต้องตีความว่าขัดกับคำว่า "ทั้งหมด" หรือไม่
2. **แจ้ง `plat-may`:** กติกาให้แจ้งทั้ง `plat-may` และ MD แต่ผมแจ้งได้แค่ MD ผ่านเอกสารในโฟลเดอร์ดีล ยังไม่ได้ส่งอะไรถึง `plat-may` คุณต้องแจ้งเอง และขอให้ SA หรือ DevOps ยืนยันไปด้วย
3. **งานของ SA:** man-day, สิทธิ์ reuse โค้ด และทีมว่างยังไม่มีคำตอบ ถ้า reuse ไม่ได้เลย margin จะเหลือ 14.9% ซึ่งต่ำกว่าเกณฑ์ปฏิเสธ

## คำถามถึงคุณนิดา
ผมใส่สองข้อนี้ในเอกสารถึง MD แบบ "รอคุณนิดายืนยัน" ถ้าเปลี่ยนใจ แก้ได้ในไฟล์นั้น
- **MA จะเสนอแบบไหน?** ผมแนะนำให้คง 8x5 ตามร่างและให้ MD ตัดสิน เพราะแบบ 24x7 ทำให้ margin เหลือ 23.5% และต้องมีเหตุผลเชิงกลยุทธ์พร้อมหลักฐานที่ยังไม่มี แต่ข้อเสียคือ TOR ไม่ได้จำกัด Sev 1 ไว้ในเวลาทำการ ธนาคารจึงอาจไม่รับ 8x5
- **ส่วนลด 507,000 บาทจะหักจากก้อนไหน?** ผมแนะนำให้หักจากค่าแรงทั้งหมด ค่าพัฒนาที่ใช้คิดงวด 30/40/30 จะเป็น 3,438,000 บาท และไม่กระทบ MA กับ cloud ที่ห้ามลด

## ปัญหาของ skill
- **รุ่นที่โหลด:** session นี้โหลด `sales` และ `core` รุ่น 1.0.0 ซึ่งยังไม่มีกติกาภาคผนวก ผมจึงอ่านรุ่น 1.1.0 จาก cache โดยตรง ควรอัปเดตหรือ reload plugin ก่อนใช้งานครั้งหน้า
- **`price.py` (ไม่ได้แก้):**
  - ยังคิดส่วนลดจากราคาเต็มและพิมพ์ว่าหัวหน้าทีมขายอนุมัติได้ ถ้ารันใหม่ สรุปใน `deal-001-pricing-output.md` จะผิดอีก
  - รันบน Windows ที่ใช้ภาษาไทยแล้วล้ม ถ้าไม่เปิดโหมด UTF-8
  - บัญชีสงสัยว่ามีปัญหาปัดเศษด้วย แต่ผมไม่ได้ทดสอบจุดนี้

ไฟล์ทั้งหมดอยู่ใน `C:\t\org05l2\novatech\deals\deal-001\` (เปิด `deal-001-resubmission-to-md.md` ก่อน):
- `deal-001-resubmission-to-md.md` (ไฟล์ใหม่)
- `deal-001-proposal-nakhonluangpattana.md`
- `deal-001-internal-notes.md`
- `deal-001-pricing-output.md`

## โต๊ะ `2-md-somchai` · 231 วินาที · 44 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | exec:deal-approval |
| 2 | Glob | **/* |
| 3 | Glob | **/* |
| 4 | Glob | **/* |
| 5 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-to-md.md |
| 6 | Read | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 7 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-input.json |
| 8 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-pricing-input.json |
| 9 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-finance-check-input.json |
| 10 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-pricing-internal.md |
| 11 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-finance-check.md |
| 12 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-quotation-draft.md |
| 13 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 14 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-pricing-output.md |
| 15 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 16 | Read | C:/t/org05l2/novatech/desks/md-somchai/notes/deal-rules.md |
| 17 | Glob | **/* |
| 18 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/references/approval-rules.md |
| 19 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/references/approval-template.md |
| 20 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/scripts/deal_check.py |
| 21 | Read | C:/t/org05l2/novatech/company-kit/deal-001/tor-bank-queue.md |
| 22 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-034-muangmai-hospital-portal.md |
| 23 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-031-thai-logistics-fleet.md |
| 24 | Read | C:/t/org05l2/novatech/company-kit/margin-rules.md |
| 25 | Read | C:/t/org05l2/novatech/company-kit/customer-data-policy.md |
| 26 | Read | C:/t/org05l2/novatech/company-kit/arch-standards.md |
| 27 | Read | C:/t/org05l2/novatech/company-kit/monthly-kpi.csv |
| 28 | Read | C:/t/org05l2/novatech/company-kit/README.md |
| 29 | Grep | resource plan\|data residency\|Data residency\|นครหลวง\|deal-001\|NLP-PROC\|data center\|ปอนด์ |
| 30 | Bash | Re-check deal numbers with the approval script |
| 31 | Grep | region\|สิงคโปร์\|Singapore\|ต่างประเทศ\|นอกประเทศ\|ap-southeast\|cross-region\|S3\|Datadog\|Grafana Cloud\|Cloudflare\| |
| 32 | Grep | สิทธิ์\|ลิขสิทธิ์\|ทรัพย์สินทางปัญญา\|\bIP\b\|source code\|ซอร์สโค้ด\|reuse\|ผู้รับเหมา\|อ้างอิงชื่อ\|ยินยอม |
| 33 | Read | C:/t/org05l2/novatech/company-kit/jd-template.md |
| 34 | Read | C:/t/org05l2/novatech/company-kit/won-proposals/2025-kaset-thai-branch-appointment.md |
| 35 | Read | C:/t/org05l2/novatech/company-kit/won-proposals/2024-siam-rungruang-loan-tracking.md |
| 36 | Read | C:/t/org05l2/novatech/company-kit/product/novaqueue-overview.md |
| 37 | Grep | 0[689]\d[- ]?\d{3}[- ]?\d{4}\|\b\d{13}\b\|\d-\d{4}-\d{5}-\d{2}-\d\|วราภรณ์\|waraporn\|ต้นทุน\|margin\|buffer\|กำไร |
| 38 | Grep | 0[689]\d[- ]?\d{3}[- ]?\d{4}\|\b\d{13}\b\|\d-\d{4}-\d{5}-\d{2}-\d\|วราภรณ์\|waraporn |
| 39 | Bash | Count working days and recompute key deal figures |
| 40 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-input.json |
| 41 | Bash | Archive round 1 result and re-run deal check with team size |
| 42 | Write | C:/t/org05l2/novatech/deals/deal-001/approval.md |

**คำตอบของโต๊ะนี้**

**ยังอนุมัติไม่ได้ ผลคือ ❌ ตีกลับรอบ 2 และห้ามยื่นธนาคาร** แต่ไม่ใช่การปฏิเสธดีล ถ้าได้คำตอบครบภายในวันพุธที่ 11 พ.ย. ก็พิจารณารอบ 3 ได้วันพฤหัสที่ 12 พ.ย. ก่อนกำหนดยื่นวันศุกร์ที่ 13 พ.ย. 16:00 น.

Margin ตรวจซ้ำได้ **28.3%** ตรงกับที่ส่งมา (ราคา 4,800,000 ต้นทุน 3,441,600 รวม buffer 10% แล้ว) แต่ตัวเลขนี้ยังไม่มั่นคง

**เหตุผลหลัก**
1. **Data residency:** ภาคผนวก PDPA แก้ครบ 3 ข้อแล้ว แต่ยังไม่มี SA หรือ DevOps ยืนยันว่าทำได้จริง ทั้งเรื่อง backup, log และ WAF ส่วน LINE กับ SMS OTP ต้องให้ `plat-may` ตีความ
2. **Margin พึ่ง reuse:** ยังไม่ยืนยันสิทธิ์ใช้โค้ด และ SA ยังไม่ได้ตรวจ man-day ถ้าประหยัดไม่ได้ราว 1 ใน 4 margin จะต่ำกว่า 25% และถ้าใช้ไม่ได้เลยจะเหลือ 14.9% ซึ่งต้องปฏิเสธ
3. **แผนงานและทีมไม่ผ่าน:**
   - เดือนที่ 3 และ 6 มีงานใหญ่ซ้อนกัน แม้ใช้กำลังแค่ 27.5%
   - ยังไม่มี SA ของดีลนี้
   - ปอนด์เสี่ยงถือ 3 โปรเจกต์ช่วง ม.ค.–ก.พ. 2027 ถ้า DS-034 เดินหน้า

**ผลรายข้อ**

| ผล | ข้อ |
|---|---|
| ❌ | 2 แผนงาน, 6 ทีมว่าง |
| 🟡 | 1 กำไร, 3 ชำระเงิน, 4 สัญญา, 5 ภาคผนวก PDPA |
| ✅ | 7 ข้อมูลลูกค้าในเอกสาร |

รอบนี้เจอเพิ่มจากที่ส่งมา 3 เรื่อง:
- proposal ไม่ระบุเครดิตเทอม
- ไม่ได้นิยามว่า go-live คือช่วงนำร่องหรือครบ 120 สาขา ซึ่งผูกกับงวดเงิน 30% สุดท้าย
- เขียนว่าตอบ TOR ครบทุกข้อ ทั้งที่ Sev 1 ตอบรับใน 30 นาทีเฉพาะเวลา 8x5

**เรื่องที่ผมเขียนในชื่อคุณ กรุณาดูก่อนส่งต่อ**
- **ส่วนลด 507,000:** รับในหลักการ และให้หักจากค่าแรงทั้งหมด หลังคุณนิดายืนยัน
- **MA 8x5:** รับได้เมื่อธนาคารตอบเป็นลายลักษณ์อักษร หรือแจ้งข้อยกเว้นชัดและคุณนิดารับความเสี่ยงเรื่องแพ้ข้อเสนอ
- **MA 24x7 ในราคาหลัก:** ยังไม่อนุมัติจนกว่าจะมีหลักฐานเชิงกลยุทธ์
- **ผู้รับผิดชอบและกำหนดส่ง:** วันกำหนดส่งรายงานเป็นข้อเสนอของผมทั้งหมด และผมแนะนำให้เช็ก `sa-ice` เป็น SA ของดีล แต่ยังไม่มี resource plan ยืนยันว่าว่าง

**ข้อจำกัดของการตรวจ**
- ไม่ได้อ่าน `bank-pdpa-annex.md` เพราะอยู่นอกพื้นที่ที่อนุญาต จึงอ้างเส้นทาง "ยังยืนยันไม่ได้" ตามที่ฝ่ายขายสรุปมา ส่วนภาคผนวกตรวจเทียบกับกติกาของคุณเอง
- วันทำการ 120 วันเป็นค่าประมาณ ใช้ตามที่บัญชีใช้ ถ้าไม่หักวันหยุดจะเป็น 130 วัน ซึ่งไม่เปลี่ยนผล
- สถานะล่าสุดของ DS-034 ยังไม่ชัด ตัวอย่างใน skill บอกว่าเคยถูกตีกลับ ถ้าดีลนี้ไม่เดินหน้า ปอนด์จะเหลือ 2 โปรเจกต์และผ่านเกณฑ์เรื่อง tech lead แต่ยังต้องมี SA ของดีลนี้และ resource plan

ผมเขียนทับ `approval.md` ด้วยผลรอบ 2 โดยเก็บผลรอบ 1 ไว้ที่ `approval-round1.md` และเพิ่มขนาดทีมกับวันทำการใน `deal-input.json` ยังไม่ได้ส่งเรื่องให้ใคร ไฟล์ทั้งหมดอยู่ใน `C:\t\org05l2\novatech\deals\deal-001\`

## โต๊ะ `3-sa-ton` · 540 วินาที · 52 รอบ

skill ที่หยิบเอง: `core:pricing-rules`, `core:customer-data-policy`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, the deal folder and company kit |
| 2 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 3 | Read | C:\t\org05l2\novatech\deals\deal-001\approval-round1.md |
| 4 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-to-md.md |
| 5 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input.json |
| 6 | Read | C:\t\org05l2\novatech\desks\sa-ton\.claude\settings.json |
| 7 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 8 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-internal.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 14 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 15 | Read | C:\t\org05l2\novatech\company-kit\arch-standards.md |
| 16 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 17 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 18 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 19 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 20 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-031-thai-logistics-fleet.md |
| 21 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 22 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2025-kaset-thai-branch-appointment.md |
| 23 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2024-siam-rungruang-loan-tracking.md |
| 24 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-overview.md |
| 25 | Read | C:\t\org05l2\novatech\company-kit\product\product-lifecycle-policy.md |
| 26 | Read | C:\t\org05l2\novatech\company-kit\deploy-runbook.md |
| 27 | Read | C:\t\org05l2\novatech\company-kit\ml-queue-forecast\notes.md |
| 28 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 29 | Read | C:\t\org05l2\novatech\company-kit\onboarding-notes.md |
| 30 | Read | C:\t\org05l2\novatech\company-kit\project-scaffold-notes.md |
| 31 | Read | C:\t\org05l2\novatech\company-kit\incident-2026-09.md |
| 32 | Read | C:\t\org05l2\novatech\company-kit\jd-template.md |
| 33 | Read | C:\t\org05l2\novatech\company-kit\monthly-kpi.csv |
| 34 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-feedback-2026-q3.md |
| 35 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-v1-customers.csv |
| 36 | Read | C:\t\org05l2\novatech\company-kit\ml-queue-forecast\experiment-results.csv |
| 37 | Read | C:\t\org05l2\novatech\desks\sa-ton\.claude\skills-archived\req-to-spec\references\novatech-standards.md |
| 38 | Read | C:\t\org05l2\novatech\desks\sa-ton\.claude\skills-archived\req-to-spec\references\decisions.md |
| 39 | Read | C:\t\org05l2\novatech\desks\sa-ton\.claude\skills-archived\req-to-spec\references\forgotten-topics.md |
| 40 | Skill | core:pricing-rules |
| 41 | Skill | core:customer-data-policy |
| 42 | Bash | Compute margin scenarios and verify plan calendar dates |
| 43 | Bash | Compute margin scenarios and verify plan calendar dates |
| 44 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 45 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 46 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 47 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 48 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 49 | Bash | Scan new files for personal data and validate outputs |

**คำตอบของโต๊ะนี้**

งานส่วน SA เสร็จเท่าที่ทำได้จากเอกสาร และวางในโฟลเดอร์ดีลแล้ว แต่ **ยังไม่ครบตามที่ MD ขอ** เพราะเรื่อง data residency และสิทธิ์ reuse ต้องให้คนอื่นยืนยัน และข้อสรุปตอนนี้คือดีลยังไม่ควรยื่น

## ผลตรวจ
| งานที่ MD ขอ | ผล |
|---|---|
| ตรวจ man-day, QA, PM | 297 วันไม่พอ เสนอ **337 วัน** ทำให้ margin เหลือ **21.2%** (ส่วนลด 1,050,000 บาท) |
| ขนาด CL-M | ผ่านแบบมีเงื่อนไข ไม่เสนอ CL-L เพราะถ้าใช้ CL-L margin จะเหลือ 13.7% ซึ่งต้องปฏิเสธ |
| แยกงานซ้อนเดือนที่ 3 และ 6 | แก้แล้ว ยังอยู่ใน 6 เดือน โดยขยายสาขาเป็น 3 ระลอกหลบช่วงห้าม deploy ปลายเดือน |
| สิทธิ์ reuse | **ยังยืนยันไม่ได้** ต้องให้ `pm-beam` ตอบและต้องดูสัญญาเกษตรไทย |
| ที่ตั้ง backup, log, WAF | **ยังไม่ลงชื่อ** เพราะเอกสารไม่พอยืนยัน ต้องให้ `ops-art` ตรวจจากระบบจริง |
| Tech lead และ resource plan | มีแผนรายบทบาทและแผนสำรอง แต่ยังไม่มีชื่อคน และยังไม่รู้สถานะ DS-034 |

## สิ่งที่ MD ควรเห็น
- **Margin 25% ไปไม่ถึงด้วยตัวเลขชุดนี้:** แม้ reuse ลดได้ 61 วันก็ยังได้แค่ 24.6% จึงต้องมีหลักฐานเชิงกลยุทธ์ ซึ่งตอนนี้ยังไม่มี
- **จุดตัดของ reuse อยู่ที่ราว 20 วัน:** ต่ำกว่านี้ margin ต่ำกว่า 15% ต้องปฏิเสธ และถ้าใช้ไม่ได้เลยจะเหลือ 10.8%
- **ที่มาของโค้ดขัดกันเอง:** เอกสารบอกว่า NovaQueue ต่อยอดจากงานเกษตรไทยปี 2025 แต่ v1 เปิดตัวปี 2023 และ v2 เปิดก่อนเกษตรไทย go-live ถ้า v2 มีโค้ดจากงานนั้นจริง สิทธิ์ตามสัญญาเกษตรไทยจะกระทบ v2 ด้วย
- **คำถามที่ proposal ยังไม่ได้ถามธนาคาร:** เช่น คนที่ยังไม่มีบัญชีจะจอง "เปิดบัญชี" อย่างไร และธนาคารต้องการถือสิทธิ์โค้ดหรือไม่ ผมสรุปไว้ 5 ข้อให้คุณนิดา

## สิ่งที่คุณต้องดูก่อนส่ง
1. **ตัวเลข man-day รายก้อนเป็นการประเมินจากเอกสาร:** ผมไม่เห็นโค้ดหรือ timesheet จริง และเอกสารจะออกในชื่อคุณ จึงควรทวนข้อ 1 ด้วยตัวเอง
2. **คุณเป็น SA ของดีลนี้จริงหรือยัง:** ยังไม่มีบันทึกการมอบหมาย และ MD เสนอให้เช็กกับ `sa-ice` ก่อน ถ้าเป็นคนอื่นต้องตกลงกันว่าใครรับเรื่องต่อ
3. **วันหยุดในแผนใช้เฉพาะวันที่ตายตัว:** ใน company-kit ไม่มีปฏิทิน ต้องเช็กปฏิทินธนาคารปี 2027 รวมวันมาฆบูชาและวิสาขบูชา

## สิ่งที่ยังไม่ได้ทำ
- **ยังไม่ได้ส่งเรื่องให้ใคร:** `ops-art`, `pm-beam`, `fin-joy` และ MD ยังไม่ได้รับคำขอ โดย `ops-art` ต้องตอบภายใน อ. 10 พ.ย. ส่วน `pm-beam` และ `fin-joy` ภายใน พ. 11 พ.ย.
- **ยังไม่ได้แก้ไฟล์ของคนอื่น:** proposal, โน้ตภายใน และไฟล์ราคายังเหมือนเดิม เลขใน proposal จึงยังเป็นชุดเก่าจนกว่าบัญชีจะคิดใหม่และ MD ตัดสิน
- **ตัวเลข margin ทั้งหมดรอบัญชีตรวจ:** ผมคำนวณเองจาก `price-list.csv`

ขอบเขตการอ่านเป็นไปตามที่กำหนด ไม่ได้เปิดโต๊ะคนอื่น, skill แผนกอื่น หรือ `_solution/` ใช้เพียง skill `core` กับคู่มือบนโต๊ะคุณ

ไฟล์อยู่ใน `C:\t\org05l2\novatech\deals\deal-001\`:
- `deal-001-sa-review.md` — เปิดไฟล์นี้ก่อน เป็นผลตรวจถึง MD พร้อมฟอร์มให้ `ops-art` และ `pm-beam` กรอก
- `deal-001-sa-recalc-input.json` — ข้อมูลให้ `fin-joy` คิดราคาใหม่
- `deal-001-sa-plan-for-proposal.md` — แผนงานแทนหัวข้อ 6 ของ proposal ไม่มีตัวเลขภายใน แต่มีหมายเหตุภายในบรรทัดแรกที่ต้องลบก่อนวาง

## โต๊ะ `4-sales-nida` · 442 วินาที · 67 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`, `core:pricing-rules`, `sales:follow-up-email`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List deal folder, my desk, and company kit |
| 2 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 3 | Read | C:\t\org05l2\novatech\deals\deal-001\approval-round1.md |
| 4 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-to-md.md |
| 5 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 6 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input.json |
| 7 | Read | C:\t\org05l2\novatech\desks\sales-nida\.claude\settings.json |
| 8 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 14 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-internal.md |
| 15 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 16 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 17 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 18 | Skill | sales:sales-proposal |
| 19 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 20 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 21 | Read | C:\t\org05l2\novatech\company-kit\invoices\invoicing-rules.md |
| 22 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 23 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-031-thai-logistics-fleet.md |
| 24 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 25 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2025-kaset-thai-branch-appointment.md |
| 26 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2024-siam-rungruang-loan-tracking.md |
| 27 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 28 | Skill | core:pricing-rules |
| 29 | Skill | sales:follow-up-email |
| 30 | Bash | List sales and core skill reference files |
| 31 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\checklist.md |
| 32 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\sales-proposal\references\winning-patterns.md |
| 33 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\sales\1.0.0\skills\follow-up-email\references\tone-and-format.md |
| 34 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 35 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-feedback-2026-q3.md |
| 36 | Grep | นครหลวง\|deal-001\|จองคิวธนาคาร\|ปอนด์\|เกษตรไทย\|ยินยอม\|อ้างอิงผลงาน\|เครดิตเทอม |
| 37 | Bash | Compare sales and core skill versions 1.0.0 and 1.1.0 |
| 38 | Bash | Recalculate deal figures from the price list |
| 39 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 40 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 41 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 42 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 43 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 44 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 45 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 46 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 47 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 48 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 49 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 50 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 51 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 52 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 53 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 54 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 55 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 56 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 57 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 58 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 59 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |
| 60 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-round3-to-md.md |
| 61 | Bash | Scan documents for PII and internal words and check totals |
| 62 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |
| 63 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |

**คำตอบของโต๊ะนี้**

ผมแก้ proposal ครบทุกข้อที่ MD ขอแล้ว แต่ดีลยังไม่พร้อมพิจารณารอบ 3 งานที่ต้องยืนยันหรือต้องให้คนอื่นตอบยังไม่ปิด ผมเตรียมเป็นร่างไว้ และยังไม่ได้ส่งอะไรออกไปเลย

## สิ่งที่แก้ใน proposal
- **เครดิตเทอม:** ระบุ 30 วัน ตามค่าเริ่มต้นใน `invoicing-rules.md` และอยู่ในเกณฑ์ไม่เกิน 60 วัน
- **ฐานคิดงวด:** 3,438,000 บาท แบ่งเป็น 1,031,400 / 1,375,200 / 1,031,400 และเพิ่มตารางงวดที่รวมได้ 4,800,000 พอดี
- **นิยาม go-live:** เปิดใช้จริงครบ 120 สาขาและธนาคารลงนามตรวจรับ
- **SLA:** เปลี่ยนคำว่า "ตอบครบทุกข้อ" เป็นการแจ้งข้อยกเว้น Sev 1 และระบุว่าตัวเลือก 24x7 ทำให้เกินวงเงิน TOR
- **เนื้อหาจาก SA:** ใส่แผนงานใหม่ในหัวข้อ 6, คำถาม 5 ข้อ และวันที่ที่ต้องอาศัยจากธนาคาร

ผลตรวจ proposal: `scan_pii.py` ไม่พบข้อมูลส่วนบุคคลที่น่าสงสัย ไม่พบคำภายใน เช่น ต้นทุนหรือ margin และภาคผนวก PDPA ยังตรงกับข้อความมาตรฐาน

## สิ่งที่ MD ควรรู้
1. **ตัวเลขเปลี่ยนจากตอนที่ MD ตีกลับ:** SA เสนอ 337 วัน ทำให้ margin เหลือ 21.2% และส่วนลดเป็น 1,050,000 บาท จึงต้องมีหลักฐานเชิงกลยุทธ์ แต่ผมไม่พบในเอกสาร ส่วนถ้าไม่ได้คำตอบเรื่อง reuse ภายใน พ. 11 พ.ย. SA ให้ถือว่า reuse เป็น 0 ซึ่ง margin 10.8% ต้องปฏิเสธดีล
2. **ตารางราคายังเป็นชุด 297 วัน:** ต้องรอ `fin-joy` คิดใหม่และ MD ตัดสินก่อน ถ้าเปลี่ยนเป็น 337 วัน ยอดรวมและตารางงวดไม่เปลี่ยน
3. **`sa-ice` อาจไม่ว่างอย่างที่ MD เข้าใจ:** MD อ้างว่าถือ 1 โปรเจกต์ตาม DS-031 แต่บันทึกประชุมระบุว่าเป็น SA ใน deal-002 ด้วย จึงอาจซ้อนกันช่วง ก.พ.–พ.ค. 2027

## สิ่งที่คุณต้องทำเอง
- **ลงชื่อยืนยัน MA และส่วนลด:** MD ขอให้ยืนยันในชื่อคุณ ผมจึงไม่ลงชื่อแทน ช่องอยู่ในข้อ 2 ของเอกสารส่งกลับ
- **ส่งร่างภายใน จ. 9 พ.ย.:** ถึงฝ่ายจัดซื้อ, ลูกค้าเก่า 2 ราย และเพื่อนร่วมงาน ส่วนร่างถึงลูกค้าเก่าต้องใส่ชื่อผู้ติดต่อจาก CRM ก่อน และควรเช็กกับ `sales-krit` เพื่อไม่ให้ถามซ้ำ
- **ระบุชื่อ SA ของดีล:** ภายใน จ. 9 พ.ย. หลังเช็กกับ `sa-ice`
- **แจ้งสถานะ DS-2026-034:** คุณเป็นเซลส์เจ้าของดีลนั้น แต่ในเอกสารไม่มีผลล่าสุด

## คำถามถึงคุณ
1. **ยอมรับความเสี่ยงแพ้ข้อเสนอจาก MA 8x5 ไหม?** ผมร่างให้ใช้ 8x5 และแจ้งข้อยกเว้นชัดเจน เพราะถ้าใส่ 24x7 ในราคาหลักกับ 337 วัน margin จะเหลือ 16.4% ถ้าไม่รับ ต้องเปลี่ยนข้อเสนอนี้ และ MD จะอนุมัติ 24x7 ก็ต่อเมื่อมีหลักฐานเชิงกลยุทธ์
2. **คิดค่า hosting และ license ช่วงที่หมดก่อน MA จากธนาคารไหม?** ผมร่างให้คิดเดือนละ 71,000 บาทนอกวงเงิน รวมราว 37 วันในปี 2028 เพราะ margin บางอยู่แล้ว แต่ธนาคารอาจไม่ชอบ และเรื่องนี้ยังไม่ได้ตกลงกับจอย ถ้าเรารับเอง margin ชุด 337 วันจะเหลือ 19.9%
3. **ใส่แผนงานของ SA ไว้ในร่างเลยตามที่ผมทำไหม?** หมายเหตุของ SA ระบุว่าใช้ได้หลัง MD อนุมัติ แต่ MD ต้องเห็นแผนนี้ถึงจะตัดสินข้อ 2 ได้ ผมจึงใส่ไว้และแจ้ง MD ในเอกสารส่งกลับ ถ้า MD ไม่เห็นชอบ ต้องแก้หัวข้อ 2 และ 6 กลับเอง เพราะผมไม่ได้เก็บสำเนาเดิมไว้

ผมไม่ได้แก้ไฟล์ของ `fin-joy` และ `sa-ton` และไม่ได้เปิดโต๊ะของคนอื่นหรือ skill ของแผนกอื่น

ไฟล์ทั้งหมดอยู่ใน `deals/deal-001/`:
- `deal-001-resubmission-round3-to-md.md` (ใหม่, เอกสารส่งกลับ MD ยังไม่ได้ส่ง)
- `deal-001-nida-drafts-to-send.md` (ใหม่, ร่าง 10 ฉบับ)
- `deal-001-proposal-nakhonluangpattana.md`
- `deal-001-internal-notes.md`
- `deal-001-pricing-output.md`

## โต๊ะ `5-md-somchai` · 303 วินาที · 56 รอบ

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
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-round3-to-md.md |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-to-md.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\approval-round1.md |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input.json |
| 14 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 15 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 16 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check-input.json |
| 17 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-internal.md |
| 18 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-output.md |
| 19 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-finance-check.md |
| 20 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-quotation-draft.md |
| 21 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 22 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 23 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 24 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 25 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |
| 26 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 27 | Read | C:\t\org05l2\novatech\company-kit\meeting-notes\2026-10-28-bank-meeting.md |
| 28 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 29 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 30 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 31 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-031-thai-logistics-fleet.md |
| 32 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 33 | Read | C:\t\org05l2\novatech\company-kit\invoices\invoicing-rules.md |
| 34 | Read | C:\t\org05l2\novatech\company-kit\deploy-runbook.md |
| 35 | Read | C:\t\org05l2\novatech\company-kit\incident-2026-09.md |
| 36 | Read | C:\t\org05l2\novatech\company-kit\arch-standards.md |
| 37 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2025-kaset-thai-branch-appointment.md |
| 38 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2024-siam-rungruang-loan-tracking.md |
| 39 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-overview.md |
| 40 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-feedback-2026-q3.md |
| 41 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 42 | Read | C:\t\org05l2\novatech\company-kit\monthly-kpi.csv |
| 43 | Read | C:\t\org05l2\novatech\company-kit\jd-template.md |
| 44 | Grep | 0[689]\d[- ]?\d{3,4}[- ]?\d{4}\|\b\d{13}\b\|\b\d-\d{4}-\d{5}-\d{2}-\d\b\|วราภรณ์\|waraporn |
| 45 | Grep | ต้นทุน\|margin\|buffer\|กำไร\|reuse\|ภายใน\|sa-ton\|fin-joy\|sales-\|ปอนด์\|DS-20 |
| 46 | Bash | Rerun deal margin checks for each scenario |
| 47 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-v1-customers.csv |
| 48 | Grep | sa-ton\|ต้นตระกูล\|sa-ice\|ไอศวรรย์\|dev-pond\|ปอนด์ |
| 49 | Grep | LOI\|MOU\|หนังสือแสดงเจตนา\|ต่อยอด\|สาขาเพิ่ม |
| 50 | Bash | Archive round 2 approval before writing the new one |
| 51 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-input-round3.json |
| 52 | Write | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 53 | Edit | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 54 | Edit | C:\t\org05l2\novatech\deals\deal-001\approval.md |

**คำตอบของโต๊ะนี้**

## ผล: ❌ ตีกลับอีกรอบ ห้ามยื่นธนาคาร แต่ยังไม่ใช่การปฏิเสธดีล

**Margin ที่ใช้ตัดสินคือ 21.2% ไม่ใช่ 28.3%** เพราะ SA ตรวจแล้วว่า 297 วันไม่พอและเสนอ 337 วัน ผมรันสคริปต์ซ้ำแล้วตรงกับตัวเลขของ SA แต่ตาราง proposal ยังเป็นชุด 297 วัน และ `fin-joy` ยังไม่ได้ตรวจชุดใหม่

"แก้แล้ว" จริงเฉพาะตัว proposal: จาก 11 รายการที่ขอ ปิดแล้ว 4 รายการ

## เหตุผลหลัก
1. **กำไร (ข้อ 1 ไม่ผ่าน):** ไม่พบ LOI, MOU หรืออีเมลลูกค้าที่จะรองรับ margin ต่ำกว่า 25% ส่วนสิทธิ์ reuse ยังไม่มีผู้ยืนยัน ถ้า reuse ไม่ได้เลย margin เหลือ 10.8% ซึ่งต้องปฏิเสธ
2. **ทีม (ข้อ 6 ไม่ผ่าน):** ยังไม่มีชื่อ SA และยังไม่ได้ปิดเรื่อง tech lead ที่อาจถือ 3 โปรเจกต์
3. **PDPA (ข้อ 5 ยังไม่ปิด):** ภาคผนวกครบ 3 ข้อแล้ว แต่ยังไม่มีผู้ลงชื่อยืนยัน data residency

ข้อ 7 ผ่าน ส่วนข้อ 2, 3 และ 4 ดีขึ้นมาก แต่ยังมีเรื่องค้าง โดยเฉพาะแผนงานที่แยกงานซ้อนได้แล้ว

## เรื่องใหม่ที่พบรอบนี้
- **ที่ว่างของกำไรแคบกว่าตารางของ SA:** ถ้าต้องรับค่า hosting เพิ่มราว 126,100 บาท margin เหลือ 18.5% และ reuse ต้องได้จริงราว 30 จาก 45 วัน ไม่ใช่ 20 วัน ตัวเลข 30 วันเป็นการประมาณ
- **ข้อยกเว้น TOR อาจไม่ได้มีแค่ 1 ข้อ:** proposal คิดค่า hosting ช่วงที่หมดก่อน MA นอกวงเงินราว 86,400 บาท ธนาคารอาจอ่านว่าเกินเพดาน
- **ไม่มีร่างคำขอถึง `plat-may`:** ทั้งที่ต้องตอบภายใน อ. 10 พ.ย. และร่างทั้ง 10 ฉบับก็ยังไม่ได้ส่ง
- **ตัวเลขทดสอบโหลด 2,000 การจองของเกษตรไทย:** มาจากข้อเสนอที่เขียนก่อนเริ่มงาน จึงยังไม่ใช่หลักฐานว่าเป็นผลจากโครงการนั้น

## สิ่งที่ต้องให้คุณสมชายดู
- **สถานะ DS-2026-034:** มีแต่คุณที่ตอบได้ เอกสารบอกเพียงว่าเคยถูกตีกลับ แต่ไม่บอกว่าจะเดินหน้าต่อหรือไม่ และเรื่อง tech lead รอคำตอบนี้อยู่ ผมใส่กำหนดไว้ จ. 9 พ.ย.
- **คำตัดสินที่ผมร่างในนามคุณ:** แก้ใน `approval.md` ได้ถ้าไม่เห็นด้วย
  - ใช้ 337 วันเป็นฐานพิจารณา
  - ยังไม่อนุมัติส่วนลด 1,050,000 บาท
  - ไม่อนุมัติ MA 24x7 ในราคาหลัก
  - ถอนคำแนะนำเรื่อง `sa-ice` เพราะถ้าได้ deal-002 ด้วยจะถือ 3 โปรเจกต์ ช่วง ก.พ.–พ.ค. 2027

## ยังไม่ได้ตรวจหรือยังไม่ได้ทำ
- ไม่ได้อ่าน `bank-pdpa-annex.md` เพราะอยู่นอกขอบเขตที่กำหนด จึงตรวจภาคผนวกเทียบกับ `notes/deal-rules.md` แทน
- โค้ด สัญญาเก่า และ cloud console ไม่อยู่ในขอบเขตเช่นกัน
- ยังไม่ได้ส่งผลนี้ให้ใคร และไม่ได้แก้ไฟล์ของคนอื่น

การตัดสินรอบจริงยังเป็น พฤ. 12 พ.ย. เกณฑ์อยู่ท้าย `approval.md` รวมถึงกรณีที่ควรไม่ยื่น

ไฟล์อยู่ใน `C:\t\org05l2\novatech\deals\deal-001\`:
- `approval.md` — ผลรอบนี้
- `approval-round2.md` — สำเนาผลรอบก่อน
- `deal-input-round3.json` — ตัวเลขชุด 337 วันสำหรับตรวจซ้ำ

## โต๊ะ `6-sa-ton` · 473 วินาที · 48 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, deal folder, and company kit files |
| 2 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 3 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input-round3.json |
| 4 | Read | C:\t\org05l2\novatech\desks\sa-ton\.claude\settings.json |
| 5 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 6 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 7 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 8 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-round3-to-md.md |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 12 | Read | C:\t\org05l2\novatech\company-kit\README.md |
| 13 | Read | C:\t\org05l2\novatech\company-kit\won-proposals\2025-kaset-thai-branch-appointment.md |
| 14 | Read | C:\t\org05l2\novatech\company-kit\deploy-runbook.md |
| 15 | Grep | วันหยุด\|holiday\|สงกรานต์\|มาฆ\|วิสาข\|2027\|sa-ton\|ต้น\b\|คุณต้น\|2,000\|โหลด |
| 16 | Read | C:\t\org05l2\novatech\deals\deal-001\approval-round2.md |
| 17 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 18 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 19 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-pricing-input.json |
| 20 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-031-thai-logistics-fleet.md |
| 21 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 22 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 23 | Read | C:\t\org05l2\novatech\company-kit\product\novaqueue-overview.md |
| 24 | Grep | ทดสอบโหลด\|load test\|2,000 การจอง\|2000\|k6\|slot lock |
| 25 | Bash | Recalculate margin cases, 2027 working days, and full moon dates with a temporary script |
| 26 | Grep | ต้นตระกูล\|sa-ton\|sa-ice\|ไอศวรรย์\|Dev 4\|4 คน |
| 27 | Grep | penetration\|pentest\|LOS\|go-live\|ทดสอบช่องโหว่ |
| 28 | Bash | Verify 337-day totals and margin room for each load case |
| 29 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-round3-to-md.md |
| 30 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 31 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 32 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 33 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 34 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 35 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 36 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 37 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 38 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 39 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 40 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 41 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 42 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 43 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 44 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 45 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 46 | Edit | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-round3-to-md.md |
| 47 | Bash | Validate edited JSON, scan SA files for personal data, and compare plan text with proposal |

**คำตอบของโต๊ะนี้**

แก้งาน SA ตามที่ MD ขอและวางในโฟลเดอร์ดีลแล้ว แต่ยังส่ง MD ไม่ได้ เพราะมี 3 เรื่องที่ต้องให้คุณทำเอง และ MD ยังตีกลับดีลนี้อยู่ เพราะหลักฐาน reuse, หลักฐานเชิงกลยุทธ์ และ data residency ยังไม่ครบ ฉันยังไม่ได้ส่งเรื่องให้ใคร

## ผลตามที่ MD ขอ
| งาน | ผล |
|---|---|
| **337 วัน** | ยืนยันตามเดิม คำนวณซ้ำแล้วได้ต้นทุน 3,784,100 และ margin 21.2% ตรงกับ `deal-input-round3.json` แต่ยังเป็นการประเมินจากเอกสาร และต้อง reuse ได้ 45 วัน |
| **แผนงาน** | วันทำงานและวันส่งมอบใน proposal หัวข้อ 6 ไม่ตกวันหยุด จึงไม่ต้องแก้ข้อความที่ส่งลูกค้า |
| **QA เดือนที่ 4** | ย้ายงาน 2 วันไปเดือนที่ 5 ภาระลดจาก 88% เหลือ 75% |
| **วันหยุด 2027** | พบวันหยุดที่แผนเดิมยังไม่หัก 2 วัน คือ 22 ก.พ. และ 20 พ.ค. ทำให้ Dev เดือนที่ 2 ตึงขึ้น จึงย้ายงาน 2 วันไปเดือนที่ 3 |
| **ช่วงสำรองนำร่อง** | แก้จาก 18–20 พ.ค. เป็น 18–19 พ.ค. ถ้าพลาดต้องไป 1 มิ.ย. ซึ่งเหลือนำร่องราว 1 สัปดาห์ก่อนขยายสาขาระลอกแรก |
| **ทดสอบโหลด 2,000 การจอง** | ไม่พบรายงานผล พบตัวเลขนี้แค่ในข้อเสนอที่เขียนก่อนเริ่มงาน จึงเตรียมข้อความแทนและร่างคำถามถึง `sa-ice` ไว้ |
| **ที่ว่างของกำไร** | แก้ตารางตามที่ MD ทัก ถ้าต้องรับ CL-M ก่อนนำร่องและ hosting ช่วงที่หมดก่อน MA ต้อง reuse ได้ราว 30 จาก 45 วัน ไม่ใช่ 20 วัน |

นอกจากที่ MD ขอ ฉันแก้ข้อความเดิมเรื่อง Dev 4 คนกับ 3 คนด้วย: ถ้าเป็นคนเพิ่มแต่ทำงานในวันเดิม ราคาไม่เปลี่ยน ต้องบวกราคาเฉพาะเมื่อมีวันทำงานเพิ่ม

## สิ่งที่คุณต้องทำเอง
1. **กรอกภาระงานและลงชื่อ (ข้อ 6 ของบันทึก):** เอกสารไม่ระบุว่าคุณถือโปรเจกต์อะไรอยู่ ฉันจึงเว้นไว้ การลงชื่อถือเป็นการรับรอง 337 วันและแผนงานในชื่อคุณ จึงควรอ่านก่อน ส่วนชื่อ SA ของดีลยังเป็นคุณนิดาที่ระบุ
2. **เทียบวันหยุดกับประกาศของ ธปท. ภายใน พ. 11 พ.ย.:** คุณจำกัดพื้นที่อ่านไว้ ฉันจึงไม่ได้เปิดเว็บ วันหยุดในบันทึกมาจากการคำนวณ ถ้าประกาศต่างออกไปต้องตรวจแผนใหม่
3. **ยืนยันผล pentest ของสยามรุ่งเรือง:** ข้อความนี้มีปัญหาแบบเดียวกับเรื่องทดสอบโหลด เพราะใน company-kit พบแค่ในข้อเสนอปี 2024 ที่เขียนก่อนเริ่มงาน คุณเป็น SA ของงานนั้น จึงน่าจะหาหลักฐานได้ก่อนคุณนิดาส่งขอความยินยอม

## สิ่งที่ฉันไม่ได้ทำ
- **Data residency:** ไม่ได้ลงชื่อแทน `ops-art` เพราะต้องตรวจจากระบบจริง
- **ฟอร์มสิทธิ์ reuse:** ยังว่างอยู่ รอ `pm-beam` และเจ้าของสัญญากรอก
- **ไฟล์ของคนอื่น:** ไม่ได้แก้ proposal, โน้ตภายใน และร่างอีเมลของคุณนิดา แต่ข้อ 7 ของบันทึกระบุจุดที่คุณนิดาต้องแก้ไว้แล้ว ที่ด่วนที่สุดคือข้อความทดสอบโหลด ซึ่งต้องแก้ก่อนส่งขอความยินยอมเกษตรไทย

ไฟล์อยู่ใน `deals/deal-001/` เปิดอ่าน `deal-001-sa-round3-to-md.md` ก่อน:
- `deal-001-sa-round3-to-md.md` (ใหม่): บันทึกถึง MD
- `deal-001-sa-review.md`: แก้ margin วันหยุด แผนคน และสถานะ โดยคงเลขข้อเดิม
- `deal-001-sa-plan-for-proposal.md`: แก้เฉพาะหมายเหตุภายใน
- `deal-001-sa-recalc-input.json`: เพิ่ม 2 กรณีให้ `fin-joy` คิดใหม่

## โต๊ะ `7-sales-nida` · 488 วินาที · 70 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`, `sales:follow-up-email`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List files on the desk, deal folder and company kit |
| 2 | Read | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 3 | Read | C:/t/org05l2/novatech/desks/sales-nida/.claude/settings.json |
| 4 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-to-md.md |
| 5 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 6 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round3-to-md.md |
| 7 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 8 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 9 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 10 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-input-round3.json |
| 11 | Read | C:/t/org05l2/novatech/deals/deal-001/approval-round2.md |
| 12 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 13 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 14 | Read | C:/t/org05l2/novatech/company-kit/deal-001/tor-bank-queue.md |
| 15 | Skill | sales:sales-proposal |
| 16 | Skill | sales:follow-up-email |
| 17 | Grep | LOI\|MOU\|นครหลวง\|nlpbank\|NLP-PROC |
| 18 | Grep | sa-ton\|sa-ice\|sa-[a-z]+\|สถาปนิก\|\bSA\b.*(คุณ\|ต้น\|ไอซ์\|ไอศวรรย์)\|ไอศวรรย์ |
| 19 | Grep | 2,000\|2000\|penetration\|pentest\|ทดสอบโหลด\|load test\|ผ่าน pen |
| 20 | Read | C:/t/org05l2/novatech/desks/sales-nida/.claude/skills-archived/sales-proposal/references/winning-patterns.md |
| 21 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-034-muangmai-hospital-portal.md |
| 22 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-031-thai-logistics-fleet.md |
| 23 | Read | C:/t/org05l2/novatech/company-kit/meeting-notes/2026-10-28-bank-meeting.md |
| 24 | Read | C:/t/org05l2/novatech/company-kit/margin-rules.md |
| 25 | Read | C:/t/org05l2/novatech/company-kit/price-list.csv |
| 26 | Read | C:/t/org05l2/novatech/company-kit/invoices/invoicing-rules.md |
| 27 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-quotation-draft.md |
| 28 | Read | C:/t/org05l2/novatech/company-kit/product/novaqueue-feedback-2026-q3.md |
| 29 | Read | C:/t/org05l2/novatech/company-kit/product/novaqueue-v1-customers.csv |
| 30 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/sales/1.0.0/skills/follow-up-email/references/tone-and-format.md |
| 31 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/sales/1.0.0/skills/follow-up-email/references/customer-data-rules.m |
| 32 | Glob | **/* |
| 33 | Read | C:/t/org05l2/novatech/company-kit/won-proposals/2024-siam-rungruang-loan-tracking.md |
| 34 | Read | C:/t/org05l2/novatech/company-kit/won-proposals/2025-kaset-thai-branch-appointment.md |
| 35 | Grep | ลูกค้าธนาคารรายใหม่\|รายใหม่\|ลูกค้าใหม่\|ลูกค้า v2\|v2.*ลูกค้า\|Dev.*4 คน |
| 36 | Grep | plat-may\|dev-pond\|หัวหน้า.*Dev\|legal\|ฝ่ายกฎหมาย |
| 37 | Bash | Recalculate the 337-day pricing cases from the price list |
| 38 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 39 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 40 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 41 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 42 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 43 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 44 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 45 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 46 | Write | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 47 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/sales/1.0.0/skills/sales-proposal/references/checklist.md |
| 48 | Bash | Run the sales pricing script on the 337-day set in a temp folder |
| 49 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 50 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 51 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 52 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 53 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 54 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 55 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 56 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 57 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 58 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 59 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 60 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 61 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 62 | Bash | Rerun the pricing script for the 337-day set with UTF-8 output |
| 63 | Write | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 64 | Grep | ceil\|1\.1\|buffer |
| 65 | Bash | Check buffer rounding and scan deal files for personal data and stale text |
| 66 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 67 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |

**คำตอบของโต๊ะนี้**

แก้เอกสารส่วนของคุณตามที่ MD ขอแล้ว แต่**งานยังไม่ครบ**: ยังไม่ได้ลงชื่อ ยังไม่ได้ส่งคำขอ 14 ฉบับ และไม่พบ LOI, MOU หรืออีเมลลูกค้า ตอนนี้ดีลจึงยังเข้าเกณฑ์ "ไม่ยื่น" ของ MD ฉันยังไม่ได้ส่งอะไรออกไป และเว้นช่องลงชื่อไว้ให้คุณ

## สิ่งที่แก้แล้ว
- **Proposal:**
  - แจ้งเงื่อนไข hosting นอกวงเงินและการวัด uptime ในหัวข้อ 1, 2 และ 8
  - ตัดเลข "2,000 การจอง" ของเกษตรไทยออกตามที่ SA เสนอ
  - ตัด "ผ่าน pentest" ของสยามรุ่งเรืองออกด้วย ข้อนี้ฉันตัดสินใจเองเพราะไม่พบผลทดสอบ ถ้ามีหลักฐานค่อยเติมกลับ
- **ร่างข้อความ:**
  - เพิ่ม 4 ฉบับ คือ `plat-may`, ฝ่ายจัดซื้อ 2 ฉบับ (hosting และ uptime) และ `sa-ton`
  - เปลี่ยนฉบับ `sa-ice` เป็นขอหลักฐานงานเกษตรไทย เพราะ MD ถอนคำแนะนำให้รับเป็น SA แล้ว
  - รายการถึงฝ่ายกฎหมายมีกรณีธนาคารเลื่อนการขยายสาขาแล้ว ซึ่งกระทบเงิน 1,391,400 บาท เลข 30 วันในร่างเป็นข้อเสนอของฉัน ยังไม่ผ่าน MD และ `fin-joy`
- **โน้ตภายในและเอกสารถึง MD:** ปรับตามผลของ MD และ SA ฉบับเดิมเก็บไว้เป็นประวัติ
- **ยังไม่เปลี่ยน:** บรรทัด man-day และส่วนลดในหัวข้อ 7 เพราะ MD ให้เปลี่ยนเมื่อตัวเลขสุดท้ายออก ตารางชุด 337 วันเตรียมไว้ให้วางแล้ว

## สิ่งที่คุณต้องทำ
1. **ตรวจหลักฐานเชิงกลยุทธ์:** ค้นใน `company-kit` และโฟลเดอร์ดีลแล้วไม่พบ แต่ฉันไม่ได้เปิดกล่องอีเมลและ CRM ของคุณ ร่างถึง MD จึงเขียนว่ายังไม่มี ถ้าคุณมีหลักฐานให้แก้ข้อ 2
2. **ยืนยันสถานะลูกค้า:** ในร่างถือเป็นลูกค้าใหม่ไว้ก่อน แต่ F-05 มาจากฝ่ายไอทีของธนาคารนี้ จึงต้องเช็กสัญญาใน CRM
3. **ลงชื่อภายใน จ. 9 พ.ย.:** ข้อ 1 ครอบคลุมการรับความเสี่ยงเรื่อง MA 8x5, ฐานคิดงวด และชื่อ SA ส่วนส่วนลด 1,050,000 เขียนเป็นคำขอให้ MD พิจารณา ไม่ใช่ถือว่าอนุมัติแล้ว
4. **ส่งร่างทั้ง 14 ฉบับ:** ภายใน จ. 9 พ.ย. ยกเว้นฉบับฝ่ายกฎหมายที่รอร่างสัญญา ฉบับขอความยินยอม 2 รายต้องใส่ชื่อผู้ติดต่อจาก CRM และควรส่งโดยไม่รอหลักฐาน เพราะลูกค้ามีเวลาตอบถึง พ. 11 พ.ย. เท่านั้น

## คำถามถึงคุณ
- **จะเสนอ `sa-ton` เป็น SA ของดีลไหม?** ฉันใส่ชื่อนี้ไว้เพราะในเอกสารเหลือ SA คนเดียวหลัง MD ถอน `sa-ice` และเคยทำงานสยามรุ่งเรือง แต่ตารางภาระงานยังว่าง จึงยังไม่กรอกชื่อในหัว proposal ถ้าเจ้าตัวรับไม่ได้ ดีลนี้จะไม่มี SA และยื่นไม่ได้

## จุดอื่นที่ควรรู้
- **ฐานคิดงวดอาจเปลี่ยน:** ถ้าใส่ CL-M 14 เดือนเป็นบรรทัดราคา ฐานจะเป็น 3,348,000 แต่ MD เห็นชอบ 3,438,000 ฉันถาม `fin-joy` ไว้ในร่างแล้วและแจ้ง MD ในเอกสาร
- **บั๊กใน `price.py`:** สคริปต์ปัด Senior เป็น 56 วันจากการคำนวณทศนิยม ทำให้ยอดเกินงบ 15,000 ค่าที่ถูกคือ 55 วัน ตารางชุด 337 วันจึงคิดจาก `price-list.csv` โดยตรง และฉันไม่ได้แก้สคริปต์ ควรแก้ก่อนใช้กับดีลอื่น
- **deal-002:** บันทึกประชุมระบุว่าคุณตอบลูกค้ารายนั้นว่า pentest "ผ่านทุกครั้ง" และจะส่งหลักฐาน แต่ฉันไม่พบผลทดสอบ คุณกฤตมีกำหนดส่งสรุปผลงาน 2 รายนี้ให้ลูกค้าด้วย จึงควรแจ้งเขาโดยเร็ว

ผลสแกนไม่พบเบอร์มือถือหรือเลข 13 หลักในโฟลเดอร์ดีล และ proposal ไม่มีคำภายใน ส่วนภาคผนวก PDPA ไม่ได้แก้

ไฟล์อยู่ใน `deals/deal-001/` เริ่มอ่านที่ไฟล์แรก:
- `deal-001-resubmission-round3-update-to-md.md`
- `deal-001-nida-drafts-to-send.md`
- `deal-001-proposal-nakhonluangpattana.md`
- `deal-001-internal-notes.md`

## โต๊ะ `8-md-somchai` · 373 วินาที · 53 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | exec:deal-approval |
| 2 | Glob | **/* |
| 3 | Glob | **/* |
| 4 | Glob | **/* |
| 5 | Read | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 6 | Read | C:/t/org05l2/novatech/deals/deal-001/approval-round1.md |
| 7 | Read | C:/t/org05l2/novatech/deals/deal-001/approval-round2.md |
| 8 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-to-md.md |
| 9 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 10 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round3-to-md.md |
| 11 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-input-round3.json |
| 12 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-to-md.md |
| 13 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 14 | Read | C:/t/org05l2/novatech/desks/md-somchai/notes/deal-rules.md |
| 15 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/references/approval-rules.md |
| 16 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/references/approval-template.md |
| 17 | Glob | **/* |
| 18 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 19 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 20 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 21 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 22 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-finance-check.md |
| 23 | Read | C:/t/org05l2/novatech/company-kit/deal-001/tor-bank-queue.md |
| 24 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-034-muangmai-hospital-portal.md |
| 25 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-031-thai-logistics-fleet.md |
| 26 | Read | C:/t/org05l2/novatech/company-kit/margin-rules.md |
| 27 | Read | C:/t/org05l2/novatech/company-kit/meeting-notes/2026-10-28-bank-meeting.md |
| 28 | Read | C:/t/org05l2/novatech/company-kit/README.md |
| 29 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/exec/1.0.0/skills/deal-approval/scripts/deal_check.py |
| 30 | PowerShell | List deal files by modified time and rerun the deal check script |
| 31 | Grep | 0[689]\d[- ]?\d{3}[- ]?\d{4}\|\b\d{13}\b\|\b\d-\d{4}-\d{5}-\d{2}-\d\b |
| 32 | Grep | ต้นทุน\|margin\|buffer\|กำไร\|reuse\|ภายใน\|sa-ton\|fin-joy\|2,000\|penetration |
| 33 | Read | C:/t/org05l2/novatech/company-kit/customer-data-policy.md |
| 34 | Read | C:/t/org05l2/novatech/company-kit/deploy-runbook.md |
| 35 | Read | C:/t/org05l2/novatech/company-kit/invoices/invoicing-rules.md |
| 36 | Read | C:/t/org05l2/novatech/company-kit/price-list.csv |
| 37 | Read | C:/t/org05l2/novatech/company-kit/jd-template.md |
| 38 | Read | C:/t/org05l2/novatech/company-kit/monthly-kpi.csv |
| 39 | Read | C:/t/org05l2/novatech/company-kit/deal-002/tor-bank-dispute.md |
| 40 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-pricing-output.md |
| 41 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 42 | Grep | go-live\|penetration\|2,000\|LOS\|สิทธิ์\|ทรัพย์สิน\|source code\|ซอร์ส |
| 43 | Grep | นครหลวง\|F-05\|F-11 |
| 44 | Grep | วราภรณ์\|waraporn\|ธีรพงษ์\|ศิริพร\|ปวีณา\|081-234\|089-765\|062-418 |
| 45 | Grep | audit log\|ปีที่ 2\|2 ปี |
| 46 | Bash | Recheck buffer rounding, weekdays, margins and hosting gap figures |
| 47 | PowerShell | Archive the previous approval result as round 3 |
| 48 | Write | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 49 | Edit | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 50 | Edit | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 51 | Edit | C:/t/org05l2/novatech/deals/deal-001/approval.md |

**คำตอบของโต๊ะนี้**

## ผลรอบนี้: ❌ ตีกลับ ยังห้ามยื่นธนาคาร แต่ยังไม่ใช่การปฏิเสธดีล

**Margin 21.2%** (337 วัน ต้นทุน 3,784,100 ตรวจซ้ำด้วยสคริปต์แล้วตรง) จะลดเหลือ 18.5% ถ้าต้องรับ CL-M ก่อนนำร่องและ hosting ช่วงหมดก่อน MA และเหลือ 10.8% ถ้า reuse ไม่ได้เลย

Sales และ SA แก้เอกสารตามที่ขอแล้ว และตัวเลขตรงกัน แต่ทั้งชุดยังเป็นร่าง ยังไม่มีลายเซ็น และคำขอทั้ง 14 ฉบับยังไม่ได้ส่ง

**เหตุผลหลัก**
- **ข้อ 1 กำไร ไม่ผ่าน:** margin ต่ำกว่า 25% จึงต้องมี LOI, MOU หรืออีเมลลูกค้า ซึ่ง Sales ยังไม่พบ แต่กล่องอีเมลและ CRM ของคุณนิดายังไม่ได้ตรวจ
- **ข้อ 6 ทีม ไม่ผ่าน:** `sa-ton` ยังไม่รับงานและยังไม่กรอกภาระงาน ส่วน tech lead ยังไม่ปิด
- **ข้อ 5 PDPA ยังไม่จบ:** ภาคผนวกครบ 3 ข้อแล้ว แต่ data residency ยังไม่มีผู้ลงชื่อ

**ประเด็นใหม่ที่พบรอบนี้**
- **Audit log:** หัวข้อ 4.2 บอกว่าเก็บ 2 ปีครบตาม TOR แต่หัวข้อ 7 บอกว่าปีที่ 2 ต้องต่อบริการก่อน และยังไม่ได้แจ้งเป็นเงื่อนไขในหัวข้อ 2
- **ผลงานสยามรุ่งเรือง:** ข้อความ "เชื่อม LOS โดยไม่แก้ระบบเดิม" ยังไม่มีหลักฐานหลังส่งมอบ เหมือนข้อความที่เพิ่งตัดออก แต่ยังอยู่ในร่างขอความยินยอม
- **แผนเดือนที่ 5–6:**
  - ถ้าระลอกสุดท้ายเปิดคืน 24 มิ.ย. สาขาจะเริ่มใช้จริงวันที่ 25 ซึ่งเป็นวันแรกของช่วงห้าม deploy และกระทบการเซ็น go-live
  - DevOps มีแค่ 3 วัน แต่มี 3 ระลอก ระลอกละ 3 วัน

## สิ่งที่ต้องดูจากคุณ
1. **เรื่องด่วนของ deal-002 (อยู่นอกดีลนี้):** บันทึกประชุมระบุว่า `sales-krit` ต้องส่งผลงานอ้างอิงสองธนาคารให้เอเชียไทยสากล**ภายในวันนี้** แต่ผมไม่พบความยินยอมจากทั้งสองธนาคาร และคุณนิดาเคยตอบลูกค้าว่าผ่าน pentest ทุกครั้งโดยยังไม่พบผลทดสอบจริง ผมไม่ได้เปิดโต๊ะของกฤต จึงไม่รู้ว่าส่งอะไรไปแล้ว ควรถามกฤตวันนี้
2. **DS-2026-034 ยังเดินหน้าอยู่ไหม:** เรื่อง tech lead รอคำตอบนี้ภายใน จ. 9 พ.ย. แม่แบบ approval บันทึกว่าดีลนี้เคยถูกตีกลับ แต่ไม่มีเอกสารบอกว่าจบแล้วหรือจะกลับมาอีก
3. **การตัดสินที่ผมร่างในชื่อคุณ แก้ได้ก่อนแจ้งทีม:**
   - ให้คุณนิดาเช็กหลักฐานเชิงกลยุทธ์เป็นอันดับแรก ถ้าไม่มีและหาไม่ทัน ให้ปิดเป็น "ไม่ยื่น" ได้ตั้งแต่ จ. 9 พ.ย. โดยไม่ต้องส่งอีเมลหาลูกค้า
   - ยังไม่อนุมัติส่วนลด 1,050,000
   - ถ้าต้องเปิด CL-M ช่วงทดสอบ ให้เป็นต้นทุนของเรา ไม่เพิ่มบรรทัดราคา
   - ถ้าจัดซื้อตอบว่า hosting ช่วงหมดก่อน MA ต้องอยู่ในวงเงิน ให้เรารับเอง
   - ใช้ 30 วันเป็นจุดเริ่มเจรจากรณีธนาคารเลื่อน go-live ถ้า `fin-joy` ไม่ค้าน
   - รับ `sa-ton` เมื่อเจ้าตัวรับงานและถือไม่เกิน 2 โปรเจกต์
   - ในไฟล์ยังมีความเห็นว่าโอกาสได้หนังสือแสดงเจตนาภายใน 5 วันมีน้อย ข้อนี้เป็นการประเมินของผม ไม่ใช่ข้อเท็จจริงจากเอกสาร

**ข้อจำกัดของการตรวจ:** ตรวจจากเอกสารเท่านั้น ยังไม่เห็นโค้ด สัญญา cloud console หรือประกาศวันหยุด ธปท. และยังไม่มีคำตอบจาก `ops-art`, `plat-may`, `pm-beam` หรือ `fin-joy` ส่วนเรื่องสคริปต์บัญชีอาจปัดเลขเป็น 338 วัน ผมคำนวณซ้ำเองโดยไม่ได้เปิดสคริปต์ของแผนกนั้น

ไม่ได้แก้ไฟล์ของคนอื่น และไม่ได้ส่งอะไรออกไป ไฟล์อยู่ใน `deals/deal-001/`:
- `approval.md` (ผลรอบนี้)
- `approval-round3.md` (ผลรอบก่อน)

## โต๊ะ `9-sa-ton` · 554 วินาที · 55 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, the deal folder and the company kit |
| 2 | Read | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 3 | Read | C:/t/org05l2/novatech/company-kit/README.md |
| 4 | Read | C:/t/org05l2/novatech/desks/sa-ton/.claude/settings.json |
| 5 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 6 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round3-to-md.md |
| 7 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 8 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 9 | Read | C:/t/org05l2/novatech/deals/deal-001/approval-round3.md |
| 10 | Read | C:/t/org05l2/novatech/company-kit/deploy-runbook.md |
| 11 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 12 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 13 | Read | C:/t/org05l2/novatech/company-kit/won-proposals/2024-siam-rungruang-loan-tracking.md |
| 14 | Read | C:/t/org05l2/novatech/company-kit/deal-001/tor-bank-queue.md |
| 15 | Read | C:/t/org05l2/novatech/company-kit/price-list.csv |
| 16 | Read | C:/t/org05l2/novatech/company-kit/margin-rules.md |
| 17 | Grep | sa-ton\|ต้น\|LOS\|audit log\|Audit log |
| 18 | Grep | sa-ton |
| 19 | Grep | sa-ton\|คุณต้น\|ต้น \(\|158,400 |
| 20 | Read | C:/t/org05l2/novatech/company-kit/arch-standards.md |
| 21 | Read | C:/t/org05l2/novatech/company-kit/customer-data-policy.md |
| 22 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 23 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 24 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-input-round3.json |
| 25 | Grep | ต้นตระกูล\|LOS\|Loan Tracking\|สยามรุ่งเรือง |
| 26 | Grep | feature flag\|flag\|per.?branch\|รายสาขา\|Audit log\|audit log\|ปีที่ 2 |
| 27 | Read | C:/t/org05l2/novatech/company-kit/deal-summaries/DS-2026-034-muangmai-hospital-portal.md |
| 28 | Bash | Check weekdays and recompute man-day, cost and margin scenarios |
| 29 | Read | C:/t/org05l2/novatech/company-kit/invoices/invoicing-rules.md |
| 30 | Read | C:/t/org05l2/novatech/company-kit/invoices/INV-2026-0142.md |
| 31 | Read | C:/t/org05l2/novatech/company-kit/monthly-kpi.csv |
| 32 | Grep | sa-ice\|ไอศวรรย์\|ถือ .*โปรเจกต์\|SA .*โปรเจกต์ |
| 33 | Grep | price_calc\|price\.py\|ปัดขึ้น\|ceil |
| 34 | Write | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round4-to-md.md |
| 35 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 36 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 37 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 38 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round3-to-md.md |
| 39 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 40 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 41 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 42 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 43 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 44 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 45 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 46 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 47 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 48 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 49 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 50 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round4-to-md.md |
| 51 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round4-to-md.md |
| 52 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-review.md |
| 53 | Bash | Validate JSON, recheck figures against the price list, and scan SA files |
| 54 | Grep | 22–24\|18–20 พ\.ค\|ไม่ควรใช้ |

**คำตอบของโต๊ะนี้**

แก้งานส่วนของ SA ตามที่ MD ขอแล้วและวางในโฟลเดอร์ดีล แต่ยังส่ง MD ไม่ได้ เพราะมีช่องที่คุณต้องกรอกและลงชื่อเอง คำตอบเรื่องแผนยังรอ `ops-art` ยืนยัน และ MD ให้ทำงานชุดนี้ต่อเมื่อคุณนิดายืนยันว่ามีหลักฐานเชิงกลยุทธ์ (ขั้น 2 ข) ถ้าไม่มี ดีลจะปิดเป็นไม่ยื่นและไม่ต้องส่งฉบับนี้

## คำตอบต่อข้อที่ MD ถาม
| เรื่อง | คำตอบ |
|---|---|
| **วันก่อนหยุด (19 พ.ค., 2 มิ.ย.)** | ถอนเกณฑ์เดิมของ SA และใช้ตาม runbook ที่ห้ามเฉพาะ "ก่อนวันหยุดยาว" ทั้งสองคืนจึงไม่เข้าข้อห้าม ลำดับที่เสนอคือ 18 พ.ค. → 19 พ.ค. → 1 มิ.ย. |
| **คืน 2 มิ.ย.** | ไม่ใส่เป็นทางสำรอง เพราะสาขาจะเริ่มใช้จริง ศ. 4 มิ.ย. ซึ่งเข้าเดือนที่ 6 แล้ว เสี่ยงไม่ตรง TOR ที่ให้นำร่องในเดือนที่ 5 |
| **ระลอกสุดท้าย** | เปิดคืน 22–23 มิ.ย. แทน 22–24 มิ.ย. ทุกสาขาจึงเริ่มใช้จริงไม่เกิน พฤ. 24 มิ.ย. ปรับจำนวนสาขาเป็น 36/42/32 |
| **วันลงนาม go-live** | วันครบ 120 สาขาไม่ต้องเลื่อน แต่เสนอให้คุณนิดาแยกวันลงนามออก โดยตั้งเป้าไม่เกิน 2 ก.ค. |
| **DevOps/QA เดือนที่ 6** | เสนอเปิดสาขาด้วยการตั้งค่า DevOps ต้องใช้ 5 วันจาก 3 วัน ส่วน QA 6 วันพอ |
| **ที่ว่างของกำไร** | เพิ่ม audit log ปีที่ 2, pentest และ SMS OTP แล้ว แนะนำไม่รับทั้งสามรายการในวงเงิน และเสนอ 3 ทางเลือกเรื่อง audit log |

## ผลต่อตัวเลข
ถ้า `ops-art` รับวิธีเปิดด้วยการตั้งค่า man-day จะเป็น 339 วัน ฐานคิดงวดยังเป็น 3,438,000 ทุกกรณี เกณฑ์ reuse ขั้นต่ำ 32 วันในตารางคิดรวมกรณีที่ต้องรับ CL-M ก่อนนำร่องและ hosting ช่วงหมดก่อน MA

| | ปัจจุบัน (337 วัน) | เปิดด้วยการตั้งค่า (339 วัน) | deploy เต็มทุกคืน (344 วัน) |
|---|---:|---:|---:|
| ส่วนลด | 1,050,000 | 1,078,000 | 1,143,000 |
| Margin | 21.2% | 20.8% | 19.9% |
| Reuse ขั้นต่ำ (รวม CL-M + hosting) | 30 วัน | 32 วัน | 36 วัน |

ฐานพิจารณายังเป็น 337 วันจนกว่า `ops-art` จะตอบ

ตัวเลขราคาและ margin คำนวณซ้ำจาก `price-list.csv` ตรงกันแล้ว แต่ `fin-joy` ยังไม่ได้ตรวจ ส่วนจำนวนวันเพิ่มและเพดาน audit log 132,000 บาทเป็นค่าประเมินของผม ไม่ใช่ใบเสนอราคา

## สิ่งที่คุณต้องทำเอง
ในเอกสารไม่มีหลักฐานเรื่องเหล่านี้ ผมจึงไม่ได้กรอกแทน ภายใน จ. 9 พ.ย. ให้ทำข้อ 1–3 ส่วนข้อ 4–5 ทำภายใน พ. 11 พ.ย.

1. **รับงานและกรอกภาระงาน:** ข้อ 1 ของ `deal-001-sa-round4-to-md.md` แล้วลงชื่อ ตรวจด้วยว่าคุณถือ Loan Portal ระยะ 2 ของสยามรุ่งเรืองหรือไม่ เพราะผ่าน UAT เมื่อ 30 ต.ค. แต่ยังไม่ถึงงวด go-live และเอกสารไม่ระบุ SA ถ้ารวมแล้วเกิน 2 โปรเจกต์ ดีลนี้ไม่มี SA ตามเกณฑ์
2. **ยืนยันผลงานสยามรุ่งเรือง:** ข้อ 6 เรื่องการเชื่อม LOS และผล pentest ระหว่างนี้ให้คุณนิดาใช้ข้อความที่มีแค่ชื่อโครงการและวัน go-live
3. **ส่งเรื่อง:** ส่งฉบับนี้ถึง MD และส่งคำขอถึง `ops-art` ในข้อ 8 ผมยังไม่ได้ส่งอะไรออกไป
4. **เทียบวันหยุด:** เทียบกับประกาศ ธปท. ปี 2027 ซึ่งผมยังไม่ได้ทำ ตอนนี้วันหยุดยังมาจากการคำนวณ และต้องเช็กว่า พฤ. 1 ก.ค. เป็นวันทำการด้วย
5. **ปิดตัวเลขเดือนที่ 6:** ตกลงจำนวนวันกับ `ops-art` หลังได้คำตอบ

ผมแก้เฉพาะไฟล์ของ SA ส่วน proposal, โน้ตภายใน และร่างจดหมายของคุณนิดายังไม่ได้แก้ รายการที่คุณนิดาต้องปรับตามอยู่ในข้อ 7 ส่วนฉบับรอบ 3 คงเนื้อหาเดิมเป็นประวัติ เพิ่มเพียงหมายเหตุชี้มาฉบับรอบ 4

## ไฟล์ในโฟลเดอร์ `deals/deal-001/`
- `deal-001-sa-round4-to-md.md` (ใหม่ เริ่มอ่านไฟล์นี้)
- `deal-001-sa-plan-for-proposal.md`
- `deal-001-sa-review.md`
- `deal-001-sa-recalc-input.json`
- `deal-001-sa-round3-to-md.md`

## โต๊ะ `10-sales-nida` · 421 วินาที · 70 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, deal folder and company kit files |
| 2 | Read | C:/t/org05l2/novatech/deals/deal-001/approval.md |
| 3 | Read | C:/t/org05l2/novatech/desks/sales-nida/.claude/settings.json |
| 4 | Read | C:/t/org05l2/novatech/company-kit/README.md |
| 5 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 6 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 7 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 8 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 9 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-round4-to-md.md |
| 10 | Read | C:/t/org05l2/novatech/deals/deal-001/approval-round3.md |
| 11 | Skill | sales:sales-proposal |
| 12 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-plan-for-proposal.md |
| 13 | Read | C:/t/org05l2/novatech/company-kit/deal-001/tor-bank-queue.md |
| 14 | Read | C:/t/org05l2/novatech/company-kit/invoices/invoicing-rules.md |
| 15 | Read | C:/t/org05l2/novatech/company-kit/margin-rules.md |
| 16 | Read | C:/t/org05l2/novatech/deals/deal-001/deal-001-sa-recalc-input.json |
| 17 | Read | C:/t/org05l2/novatech/company-kit/price-list.csv |
| 18 | Grep | LOS\|go-live\|penetration\|Audit\|audit\|2,000 |
| 19 | Grep | เห็นชอบ\|158,400\|ทันที\|14 ฉบับ\|ทั้ง 14\|เช่นเดียวกับ\|LOS\|ปีที่ 2\|2 ปี\|24 มิ\.ย\|24 มิถุนายน\|18 พ\.ค\|18–19 |
| 20 | Bash | Recompute deal figures and plan weekdays from the price list |
| 21 | Read | C:/Users/oishi/.claude/plugins/cache/novatech-skills/sales/1.0.0/skills/sales-proposal/references/checklist.md |
| 22 | Grep | ปัด\|ทศนิยม\|price_calc\|56 |
| 23 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 24 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 25 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 26 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 27 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 28 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 29 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 30 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 31 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 32 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 33 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 34 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 35 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 36 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-proposal-nakhonluangpattana.md |
| 37 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 38 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 39 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 40 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 41 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 42 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 43 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 44 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 45 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 46 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 47 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 48 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 49 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 50 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 51 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 52 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-nida-drafts-to-send.md |
| 53 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 54 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 55 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 56 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 57 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 58 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 59 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 60 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 61 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 62 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 63 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-internal-notes.md |
| 64 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 65 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round3-update-to-md.md |
| 66 | Write | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round4-to-md.md |
| 67 | Bash | Check edited deal files for PII, internal words and stale text |
| 68 | Edit | C:/t/org05l2/novatech/deals/deal-001/deal-001-resubmission-round4-to-md.md |

**คำตอบของโต๊ะนี้**

งานเอกสารของคุณตามผล MD รอบ 4 แก้ครบแล้ว แต่ยังตอบ MD ไม่ได้และยังไม่ได้ส่งอะไรออกไป เพราะขั้นแรกคุณต้องตรวจเอง และดีลยังเข้าเกณฑ์ "ไม่ยื่น" จนกว่าจะมี LOI, MOU หรืออีเมลลูกค้า

## สิ่งที่คุณต้องทำก่อน
**ตรวจกล่องอีเมลและ CRM แล้วกรอกข้อ 1 ใน `deal-001-resubmission-round4-to-md.md` ส่ง MD ภายในเช้า จ. 9 พ.ย.** ผมค้นได้แค่ `company-kit` กับโฟลเดอร์ดีล และไม่พบหลักฐาน ส่วนกล่องอีเมลและ CRM ผมไม่ได้เปิด
- **ถ้าไม่มีและหาไม่ทัน พ. 11 พ.ย.:** แจ้ง MD ปิดเรื่องไม่ยื่น ไม่ต้องส่งร่างใดเลย
- **ถ้ามีหรือหาได้:** ลงชื่อข้อ 2 แล้วส่งร่างทั้ง 15 ฉบับภายใน จ. 9 พ.ย.

## สิ่งที่แก้ตามที่ MD ขอ
| เรื่อง | ผล |
|---|---|
| ส่วนลด "เห็นชอบแล้ว" | แก้เป็น 507,000 เป็นความเห็นชอบในหลักการของชุด 297 วัน ซึ่งไม่ใช่ฐานพิจารณาแล้ว และ 1,050,000 ยังไม่อนุมัติ |
| Audit log ปีที่ 2 | proposal หัวข้อ 2 และ 4.2 ตรงกับหัวข้อ 7 แล้ว และเพิ่มคำถามข้อ 18 กับร่างฉบับ 15 ถึงจัดซื้อ |
| ข้อความ LOS | ตัดออกเพราะ `sa-ton` ยังไม่ยืนยัน เหลือชื่อโครงการกับวัน go-live ทั้งใน proposal และร่างฉบับ 3 |
| ข้อความเกษตรไทย | ตัด "เช่นเดียวกับโครงการนี้" ออกจาก proposal ให้ตรงร่างฉบับ 4 |
| ร่างฉบับ 6 ถึง `fin-joy` | เพิ่มคำเตือนปัดเศษ (ค่าที่ถูกคือ Senior 55 วัน รวม 337 วัน) และขอราคา pentest กับ SMS OTP |
| โน้ตภายใน | เปลี่ยนเลข 158,400 เป็นตารางที่ว่างของกำไรจาก SA |
| แผนงานและ go-live | หัวข้อ 6 ใช้แถวเดือนที่ 5–6 ของ SA วันครบ 120 สาขายังเป็น 24 มิ.ย. |

## สิ่งที่แก้เพิ่มนอกตารางของ MD
- **ลำดับการส่ง:** ร่างเดิมแนะนำให้ส่งคำขอยินยอมทันที ซึ่งขัดกับลำดับใหม่ จึงแก้เป็นส่งได้หลังผ่านขั้น 1 แล้วเท่านั้น
- **ประโยคนำหัวข้อ 9:** ยังอ้าง "การเชื่อมระบบเดิมของธนาคาร" จึงตัดออกไปพร้อม LOS
- **ผลตัดสินอื่นของ MD:** ปรับเรื่อง CL-M ช่วงทดสอบ, hosting ช่วงหมดก่อน MA และเงื่อนไขเลื่อน go-live 30 วันลงในร่างและโน้ตแล้ว

## จุดที่ขอให้คุณตัดสินหรือตรวจ
1. **แยกวัน go-live ออกจากวันลงนาม (ภายใน 2 ก.ค.):** ผมร่างตามข้อเสนอของ SA ไว้แล้ว แต่ยังต้องให้คุณ, `fin-joy` และฝ่ายกฎหมายตัดสิน เพราะเงิน 1,391,400 บาทอาจเข้าช้าลงสูงสุด 8 วัน
2. **ทางเลือกส่งมอบ audit log ให้ธนาคารเก็บต่อ:** ผมใส่ไว้ใน proposal และร่างฉบับ 15 ตามคำแนะนำของ SA แต่ `plat-may` ยังไม่ได้ตรวจ ถ้าส่งฉบับ 15 ก่อนได้คำตอบ ต้องแจ้ง `plat-may` ด้วย

## สิ่งที่ยังไม่ได้ทำ
- **ตารางราคาหัวข้อ 7:** ยังเป็นชุด 297 วัน เพราะต้องรอตัวเลขสุดท้ายจาก `fin-joy` และ MD ก่อน
- **ส่วนที่เป็นชื่อคนอื่น:** ไม่ได้ลงชื่อหรือกรอกข้อมูล CRM แทนคุณ และไม่ได้กรอกแทน `sa-ton`
- **สคริปต์ `price.py`:** ยังมีปัญหาปัดเศษ ตารางราคาพร้อมวางจึงไม่ได้มาจากสคริปต์ และ `fin-joy` ต้องยืนยัน

## ผลตรวจ
- **ข้อมูลลูกค้า:** ไม่พบเบอร์มือถือ, เลข 13 หลัก หรือชื่อผู้ประสานงานจาก TOR ในทุกไฟล์ของโฟลเดอร์ดีล
- **ความลับภายใน:** proposal ไม่มีคำภายใน เช่น ต้นทุนหรือ margin และข้อความถึงลูกค้าไม่มีจำนวนเงิน
- **ตัวเลข:** กรณี 337, 339 และ 344 วันคำนวณซ้ำจาก `price-list.csv` แล้วตรงกับ MD และ SA ส่วนงวดชำระรวมได้ 4,800,000 บาท

## เรื่องนอกดีลนี้
MD ระบุใน `approval.md` ว่าบันทึกประชุม deal-002 มีคำตอบของคุณต่อลูกค้าว่า "ผ่าน penetration test ทุกครั้ง" แต่การตรวจดีลนี้ยังไม่พบผลทดสอบจริง MD จะตามเรื่องนี้เอง ผมไม่ได้แก้อะไร แต่คุณควรเตรียมคำตอบไว้

## ไฟล์ในโฟลเดอร์ดีล
**ไฟล์ใหม่ (เปิดอันนี้ก่อน):**
- `deal-001-resubmission-round4-to-md.md`

**ไฟล์ที่แก้:**
- `deal-001-proposal-nakhonluangpattana.md`
- `deal-001-nida-drafts-to-send.md`
- `deal-001-internal-notes.md`
- `deal-001-resubmission-round3-update-to-md.md`

## โต๊ะ `11-md-somchai` · 338 วินาที · 38 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | exec:deal-approval |
| 2 | Bash | List my desk, deal folder and company kit |
| 3 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\references\approval-rules.md |
| 4 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\references\approval-template.md |
| 5 | Read | C:\Users\oishi\.claude\plugins\cache\novatech-skills\exec\1.0.0\skills\deal-approval\scripts\deal_check.py |
| 6 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-round4-to-md.md |
| 7 | Read | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 8 | Read | C:\t\org05l2\novatech\desks\md-somchai\notes\deal-rules.md |
| 9 | Read | C:\t\org05l2\novatech\deals\deal-001\approval-round3.md |
| 10 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-proposal-nakhonluangpattana.md |
| 11 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-round4-to-md.md |
| 12 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-input-round3.json |
| 13 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-recalc-input.json |
| 14 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-plan-for-proposal.md |
| 15 | Bash | Recheck margin for 337, 339, 344 day cases and plan weekdays |
| 16 | Grep | 0[689][0-9][- ]?[0-9]{3}[- ]?[0-9]{4}\|\b[0-9]{13}\b\|[0-9]-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]\|158,400\|14 ฉบับ\|เห็นชอบแ |
| 17 | Grep | ต้นทุน\|margin\|buffer\|กำไร\|reuse\|sa-ton\|sales-nida\|fin-joy\|ops-art\|plat-may\|pm-beam\|หมายเหตุภายใน |
| 18 | Read | C:\t\org05l2\novatech\company-kit\margin-rules.md |
| 19 | Read | C:\t\org05l2\novatech\company-kit\deal-001\tor-bank-queue.md |
| 20 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-nida-drafts-to-send.md |
| 21 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-resubmission-round3-update-to-md.md |
| 22 | Read | C:\t\org05l2\novatech\company-kit\customer-data-policy.md |
| 23 | Read | C:\t\org05l2\novatech\company-kit\deploy-runbook.md |
| 24 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-internal-notes.md |
| 25 | Read | C:\t\org05l2\novatech\deals\deal-001\deal-001-sa-review.md |
| 26 | Read | C:\t\org05l2\novatech\company-kit\invoices\invoicing-rules.md |
| 27 | Read | C:\t\org05l2\novatech\company-kit\deal-summaries\DS-2026-034-muangmai-hospital-portal.md |
| 28 | Read | C:\t\org05l2\novatech\company-kit\price-list.csv |
| 29 | Grep | go-live\|ขึ้นระบบ\|สถานะ\|ปิดงาน\|วันที่ |
| 30 | Grep | วราภรณ์\|waraporn\|081-\|[0-9]-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]\|\b[0-9]{13}\b\|\b0[689][0-9]{8}\b |
| 31 | Grep | sa-ton\|ต้นตระกูล\|ระยะที่ 2\|ระยะ 2 |
| 32 | Bash | Archive round 4 approval and recheck CL-M arithmetic |
| 33 | Write | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 34 | Write | C:\t\org05l2\novatech\deals\deal-001\deal-input-round5-339.json |
| 35 | Edit | C:\t\org05l2\novatech\deals\deal-001\approval.md |
| 36 | Bash | Validate the saved 339-day input and list result files |

**คำตอบของโต๊ะนี้**

## ผลรอบนี้: ❌ ยังตีกลับ ห้ามยื่นธนาคาร แต่ยังไม่ใช่การปฏิเสธดีล

Margin อยู่ที่ **21.2%** (ฐาน 337 วัน รวม buffer แล้ว) และจะเป็น 20.8% ถ้าใช้ 339 วันตามที่ SA เสนอ สคริปต์ยืนยันทั้งสองตัวเลข

**เหตุผลหลัก**
1. **เอกสารแก้จริง แต่เรื่องที่ตัดสินดีลยังไม่มีคำตอบ:** งาน 8 รายการที่ขอตรวจแล้วตรง แต่ margin ต่ำกว่า 25% จึงต้องมี LOI, MOU หรืออีเมลลูกค้า และคุณนิดายังไม่ได้ตรวจอีเมลกับ CRM (กำหนดเช้า จ. 9 พ.ย. ยังไม่เลยกำหนด)
2. **เอกสารรอบนี้ยังเป็นร่าง:** ทั้งฉบับ Sales และ SA ยังไม่ได้ส่งและยังไม่ลงชื่อ คำตอบของ SA จึงยังไม่ใช่คำยืนยันของ `sa-ton`
3. **ทีมยังไม่ผ่าน:** ยังไม่มี SA ที่รับงาน และยังไม่มี tech lead ที่ถือไม่เกิน 2 โปรเจกต์

**เรื่องใหม่ที่สำคัญ** (ทั้งหมด 8 ข้ออยู่ใน `approval.md`)
- **เงินค้างได้ไม่มีกำหนด:** การแยกวัน go-live จากวันลงนามทำให้ถ้าระบบเปิดครบแต่ธนาคารไม่เซ็น งวด 3 จำนวน 1,031,400 บาทจะออกใบแจ้งหนี้ไม่ได้ ผมจึงให้เพิ่มเงื่อนไขว่าไม่ตรวจรับตามกำหนดให้ถือว่ารับแล้ว
- **MA ไม่ต้องรอใบตรวจรับ:** SA อ้างกฎใบแจ้งหนี้กับเงินทั้ง 1,391,400 บาท แต่กฎนี้ใช้กับงวด 3 เท่านั้น แยก MA 360,000 บาทออกมาเก็บเมื่อถึงวัน go-live ได้ ถ้า `fin-joy` ไม่ค้าน
- **ข้อความใน proposal อาจขัดกัน:** หัวข้อ 4.2 เขียนว่าลบข้อมูลภายใน 90 วันหลังส่งมอบ แต่ยังต้องเก็บ audit log 2 ปีและดูแล production ต่ออีก 1 ปี
- **ตัวเลขในร่างถึง `fin-joy` ยังเก่า:** กรณี CL-M ยังใช้ส่วนลด 1,140,000 ทั้งที่ต้องเป็น 1,050,000 ตามที่คุณตัดสินรอบก่อน

## สิ่งที่คุณต้องทำหรือตรวจ
- **แจ้งสถานะ DS-2026-034 ให้คุณนิดาภายใน จ. 9 พ.ย.:** เรื่อง tech lead ปิดไม่ได้ถ้ายังไม่รู้สถานะนี้ และผมไม่ได้ตอบแทน
- **ตรวจข้อตัดสินใหม่ที่ผมร่างในชื่อคุณ** แก้ได้ทุกข้อ:
  - ใช้เกณฑ์ reuse 32 จาก 45 วันแทน 30 วัน ในวันตัดสิน พฤ. 12 พ.ย.
  - รับหลักการแยกวัน go-live เมื่อมีเงื่อนไขตรวจรับตามกำหนด
  - ไม่รับ audit log ปีที่ 2, pentest และ SMS OTP ไว้ในวงเงิน
- **deal-002 ครบกำหนดวันนี้:** รอบก่อนพบว่า `sales-krit` ต้องส่งผลงานอ้างอิงให้ธนาคารเอเชียไทยสากลภายในวันนี้ และยังไม่พบความยินยอมอ้างผลงาน รอบนี้ผมไม่ได้ตรวจเรื่องนี้เพิ่ม

## ขอบเขตการตรวจ
- ผมไม่ได้ส่งเรื่องถึงใคร และไม่ได้แก้ไฟล์ของคนอื่น
- ตารางที่ว่างของกำไรตรวจเฉพาะแถวที่ใช้ตัดสิน
- ใช้ราคาจาก `core:pricing-rules` ผ่านสคริปต์ของ skill นี้ และไม่ได้เปิดโต๊ะหรือ skill ของแผนกอื่น

ไฟล์อยู่ใน `deals/deal-001/`:
- `approval.md` (ผลรอบนี้)
- `approval-round4.md` (ผลรอบก่อน เก็บเป็นประวัติ)
- `deal-input-round5-339.json` (ข้อมูลตรวจซ้ำกรณี 339 วัน)

