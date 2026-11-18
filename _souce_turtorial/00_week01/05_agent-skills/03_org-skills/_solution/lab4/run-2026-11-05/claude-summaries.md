# LAB 4 · ผลรันจริงแบบวางพรอมต์ครั้งเดียว (2026-11-05)

รันที่สำเนาแยก `C:/t/org05p/novatech` (บริษัท 28 คน หลัง LAB 3) ด้วย `claude -p` ที่โฟลเดอร์ `novatech/` · พรอมต์ = [`prompt.txt`](prompt.txt) ทุกตัวอักษร · Claude ตัวหลักเปิด `claude -p` ที่โต๊ะทีละโต๊ะเอง · รวม 10 นาที 15 วินาที (13:08:13 → 13:18:28)

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

All 3 desks ran in order, each one waiting for the previous to finish, and every run ended successfully (rc=0). **MD rejected the deal.** I didn't edit anything in the deal folder myself. Logs are at `logs/lab4/<user>.jsonl`.

| Desk | Skills its Claude picked (from the log) | Time | Files produced in `deals/deal-001/` | Result |
|---|---|---|---|---|
| **sales-nida** | `sales:sales-proposal`, then `core:brand-guide` | 4m37s (277s, 20 turns) | `deal-001-proposal-nakhonluang.md`, `deal-001-internal-notes.md`, `deal-001-pricing-input.json`, `deal-001-pricing-output.md` | Drafted the proposal at 4,766,000 THB before VAT (TOR budget is 4.8M), margin 35.2%. It removed a mobile phone number from the TOR to comply with PDPA. The document number is still `NVT-PRP-2026-XXX`. Its notes say the head of the sales team can approve the deal alone, which is wrong. |
| **fin-joy** | `finance:pricing-calc` | 2m56s (176s, 17 turns) | `deal-001-fin-review.md`, plus input/pricing-internal/quotation-draft files for option A and option B | All of sales' numbers are correct. Problems: the approver must be MD, and man-days were cut to fit the budget. Recommends option B: 4,800,000 THB, margin 27.1%, with a 619,000 discount line. Also flagged the 24x7 MA requirement and a hosting gap. |
| **md-somchai** | `exec:deal-approval` (also read its own desk note `notes/deal-rules.md`) | 1m28s (88s, 13 turns) | `approval.md` (plus `work/deal-001/deal-input*.json` from its number check) | **❌ Rejected** |

**Why MD rejected it**
1. **The proposal has no PDPA appendix.** MD's desk rule (`desks/md-somchai/notes/deal-rules.md`, rule 3) requires every bank deal to include three things:
   - a DPA
   - customer data stored only in Thailand
   - data breaches reported within 72 hours

   None of the three appear in the proposal. Under that rule the deal goes straight back to Sales without looking at anything else this round.
2. **The man-days were cut to fit the budget.** The numbers in options A and B are correct. If SA can't confirm option A's man-days, MD recommends option B.
3. **The approver in sales' internal-notes is wrong.** A bank deal of 1M THB or more must go through MD, not the head of the sales team.

MD also asked for these fixes before the next round:
- state the payment terms and put a cap on penalties
- decide on support hours: the TOR's 30-minute Sev 1 response may mean 24x7 support, which adds 360,000 THB
- close the hosting gap of about 426,000 THB
- confirm SA and Tech Lead are actually available

If Sales fixes these and sends the deal back by 10 Nov, there's still time before the 13 Nov submission deadline.

**Did the desks follow the access rules?** I checked every tool call in the logs. None opened another person's desk, `_solution/`, or another department's skills in `~/.claude/plugins`. Each desk used only its own department's skills plus `core`.

A key point from this run: the rule that caused the rejection lives only in MD's own notes. Neither sales' `sales-proposal` skill nor finance's `pricing-calc` skill knows about it, so both earlier desks missed the missing PDPA appendix.

## โต๊ะ `sales-nida` · 277 วินาที · 20 รอบ

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List my desk, deal folder, and company kit` |
| 2 | **Skill** | **`sales:sales-proposal`** |
| 3 | Bash | `Read sales-proposal skill references and script` |
| 4 | Bash | `Read TOR, kit README, and meeting notes` |
| 5 | Bash | `Read pricing, ML notes, and product overview` |
| 6 | Bash | `Read won proposals` |
| 7 | **Skill** | **`core:brand-guide`** |
| 8 | Bash | `Read brand-guide document sections 5 and 6` |
| 9 | Bash | `Read brand guide head and data policy skill` |
| 10 | Bash | `Read PDPA policy and compare price lists` |
| 11 | Bash | `Find used proposal numbers and deals folder` |
| 12 | Bash | `Check doc number usage and arch standards` |
| 13 | Bash | `Create deal folder and run pricing script` |
| 14 | Write | `C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md` |
| 15 | Bash | `Scan proposal for PII and banned words` |
| 16 | Bash | `Add internal-only header to pricing output` |
| 17 | Write | `C:\t\org05p\novatech\deals\deal-001\deal-001-internal-notes.md` |

**คำตอบสุดท้าย**

ร่าง proposal เสร็จแล้ว วางไว้ใน `deals/deal-001/` ราคารวม **4,766,000 บาท (ไม่รวม VAT)** อยู่ในวงเงิน TOR 4.8 ล้าน margin 35.2% ไม่มีส่วนลด คุณนิดาในฐานะหัวหน้าทีมขายอนุมัติเองได้ ไม่ต้องเข้า MD แต่ยังยื่นไม่ได้ทันที เพราะเลขเอกสารยังว่างและตัวเลขยังไม่ผ่านบัญชี (รายละเอียดด้านล่าง)

**ไฟล์ที่วางไว้**
- `deal-001-proposal-nakhonluang.md` คือฉบับส่งลูกค้า ครบ 9 หัวข้อ ตอบเอกสารที่ TOR ขอยื่นครบ 4 รายการ หัวข้อความปลอดภัย (4.2) ตอบ TOR ข้อ 4 ทีละข้อ
- `deal-001-pricing-input.json` และ `deal-001-pricing-output.md` คือการคิดราคา (ภายใน) รันจากสคริปต์ของ skill ไม่ได้พิมพ์ตัวเลขเอง
- `deal-001-internal-notes.md` คือตัวเลขภายใน เรื่องที่ฉันเลือกแทนไว้ 12 ข้อ และเช็กลิสต์ก่อนยื่น ไฟล์นี้ห้ามส่งลูกค้า

**ผลตรวจก่อนส่ง**
- PDPA ผ่าน: ตัดเบอร์มือถือของคุณวราภรณ์ที่อยู่ใน TOR ออกแล้ว เหลือแค่ชื่อ ตำแหน่ง และอีเมลบริษัท
- ไม่มีคำโอ้อวด ไม่มีต้นทุนหรือ margin ในฉบับลูกค้า
- เรื่องโมเดลพยากรณ์ ไม่ได้อ้าง MAPE 15.2% หรือ 19.8% เพราะเป็นแค่ผลทดลองบนข้อมูลของธนาคารเกษตรไทย ไม่ใช่ผลงานจริง ในเอกสารเขียนแค่ว่าจะเปิดใช้เมื่อผ่านเกณฑ์ MAPE ≤ 20% ของ TOR บนข้อมูลของธนาคารนครหลวงพัฒนา

**ต้องจัดการก่อนยื่น (กำหนดยื่น 13 พ.ย. 16:00 น.)**
1. **ส่งตัวเลขให้คุณจอยฝ่ายบัญชี (`fin-joy`) ตรวจซ้ำ** ฉันไม่ได้ใช้ skill คิดราคาของบัญชี เพราะไม่ได้ติดตั้งไว้และเป็นของแผนกอื่น
2. **ใส่เลขที่เอกสาร** ตอนนี้เป็น `NVT-PRP-2026-XXX` เพราะในโฟลเดอร์ที่ฉันเปิดได้ไม่มีทะเบียนเลขเอกสาร
3. **ให้ SA ยืนยันจำนวน man-day** ฉันลดลงเพื่อให้อยู่ในงบ โดยอ้างว่านำงานเดิมของเกษตรไทยและ NovaQueue มาใช้ ส่วน Developer 77 man-day ใน 6 เดือนค่อนข้างตึง ต้องเช็กสิทธิ์ในโค้ดด้วยว่าเอางานของเกษตรไทยมาใช้กับลูกค้ารายอื่นได้
4. **ตัดสินเรื่อง SLA** ร่างนี้ใช้บริการ 8x5 และเสนอแบบ 24x7 เป็นตัวเลือกเสริม ถ้าธนาคารบังคับ 24x7 ราคาจะเพิ่ม 360,000 บาท และเกินงบ 326,000 บาท ลดราคา MA ไม่ได้ จึงต้องตัด scope ส่วนอื่นแทน
5. **จัดรูปแบบตามแบรนด์ตอนแปลงเป็น PDF หรือ Word** ไฟล์ .md ยังไม่มีหน้าปกพร้อมโลโก้ ฟอนต์ IBM Plex Sans Thai และท้ายกระดาษพร้อมเลขหน้า

ฉันอ่านเฉพาะโต๊ะของคุณ `company-kit/` และ `deals/deal-001/` ใช้ skill ของฝ่ายขายและของ core เท่านั้น ไม่ได้เปิด `_solution/`

## โต๊ะ `fin-joy` · 176 วินาที · 17 รอบ

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List my desk, deal and company kit files` |
| 2 | **Skill** | **`finance:pricing-calc`** |
| 3 | Bash | `Read deal-001 files and list skill dir` |
| 4 | Read | `C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-fin-joy\7227ceae-ca66-488e-a548-1fe2c8eec663\tool-r` |
| 5 | Bash | `Read pricing-calc skill files and locate pricing-rules` |
| 6 | Bash | `Read pricing rules, price list, and TOR` |
| 7 | Bash | `Compare core and company-kit price lists` |
| 8 | Read | `C:/t/org05p/novatech/company-kit/deal-001/tor-bank-queue.md` |
| 9 | Bash | `Run self-test, sales input, and earlier finance B version` |
| 10 | Bash | `Test variants without discount` |
| 11 | Bash | `Run discounted sensitivity variants` |
| 12 | Bash | `Write A/B inputs into deal folder and run calc` |
| 13 | Bash | `Remove internal word from quotation footers and view B` |
| 14 | Bash | `Strip internal labels from quotation draft titles` |
| 15 | Write | `C:/t/org05p/novatech/deals/deal-001/deal-001-fin-review.md` |

**คำตอบสุดท้าย**

ตรวจดีล deal-001 แล้ว ตัวเลขที่ฝ่ายขายคำนวณถูกทุกตัว แต่ยังไม่ควรยื่น เพราะผู้อนุมัติผิด และจำนวนวันทำงานคน (man-day) ถูกลดลงเพื่อให้ราคาเข้างบ

**ตัวเลขฉบับฝ่ายขาย (ฉบับ A)**
- สคริปต์ของบัญชีได้ตรงกับฝ่ายขาย: ก่อน VAT 4,766,000 · ต้นทุน 3,087,400 · margin 35.2% · รวม VAT 5,099,620
- ใช้ man-day 237 วัน และ 263 วันหลังบวก buffer 10%
- price-list ที่ใช้ตรงกับ company-kit ทุกบรรทัด และตารางราคาใน proposal ตรงกับผลคำนวณ

**สิ่งที่ต้องแก้ก่อนยื่น**
1. **ผู้อนุมัติต้องเป็น MD (md-somchai) ผ่าน deal-approval** โน้ตของฝ่ายขายบอกว่าหัวหน้าทีมขายอนุมัติเองได้ ซึ่งไม่ถูก เพราะลูกค้าเป็นธนาคารและมูลค่าเกิน 1 ล้าน
2. **man-day ต่ำกว่างานที่ต้องทำ** โน้ตของฝ่ายขายเขียนไว้เองว่าลดลงเพราะงบบังคับ ทำให้ Dev 70 วันกับ Dev-Sr 35 วันต่ำกว่างานเกษตรไทย (80 และ 40) ซึ่งมีแค่ 40 สาขาและไม่มี ML ส่วน PM 30 วันก็ต่ำสำหรับโครงการ 6 เดือน งานนี้เป็นราคาเหมา ถ้างานเกินกำไรจะลดลงเอง
3. **ความเสี่ยงเรื่อง MA:** TOR ต้องการให้ตอบรับปัญหาร้ายแรงภายใน 30 นาที แต่ไม่ระบุช่วงเวลา ฉบับนี้ใช้ MA-STD ที่ดูแลเฉพาะเวลาทำการ ถ้าธนาคารต้องการ 24 ชม. ต้องใช้ MA-PREM ซึ่งแพงขึ้น 360,000 และห้ามลดราคา MA
4. **ความเสี่ยงเรื่อง hosting:** ค่า hosting และ license นับ 12 เดือนจากวันลงนาม แต่ MA นับหลังขึ้นระบบ จึงมีช่วงประมาณ 6 เดือนที่ไม่มี hosting ถ้าธนาคารตีความว่าปีแรกนับหลังขึ้นระบบ ต้องเพิ่มประมาณ 426,000 ซึ่งเกินงบ

**ฉบับที่แนะนำ (ฉบับ B)**
- ใช้ man-day 286 วัน และ 318 วันหลังบวก buffer
- ลดราคาเป็นบรรทัด "ส่วนลดพิเศษ" 619,000 (13.7%) โดยไม่ลด MA และ hosting
- ราคาก่อน VAT 4,800,000 เท่างบพอดี · รวม VAT 5,136,000 · margin 27.1% · MD อนุมัติ
- งาน ML ลดเหลือ 20 วัน ต้องให้ ml-jay ยืนยันว่ายังทำความแม่นยำได้ตามเกณฑ์ TOR
- ถ้าคง ML 35 วันในราคาเดิม margin เหลือ 23.2% · ถ้าใช้ MA-PREM ในราคาเดิม margin เหลือ 22.3% ทั้งสองแบบยังให้ MD พิจารณาได้

**สิ่งที่ตัดสินใจเอง**
- ใช้ man-day ของฉบับ B จากที่บัญชีประเมินไว้เมื่อวันที่ 3 พ.ย. ยังไม่มี SA ยืนยัน
- ร่างตารางราคาที่สคริปต์สร้างมีคำว่า "margin" ในหมายเหตุท้ายตาราง และหัวเรื่องมีป้ายภายใน ผมลบออกแล้วเพื่อให้ส่งลูกค้าได้ ยังมีบรรทัดหมายเหตุที่ต้องลบก่อนใส่ใน proposal
- ไฟล์เดิมของฝ่ายขายไม่ได้แก้

**ขั้นต่อไป:** ฝ่ายขายส่งดีลเข้า deal-approval ให้ MD เลือกฉบับ A หรือ B ระหว่างนั้น SA ยืนยัน man-day และถามธนาคารเรื่องชั่วโมงดูแล MA กับช่วงเวลา hosting

ไฟล์อยู่ใน `C:\t\org05p\novatech\deals\deal-001\`:
- `deal-001-fin-review.md` — สรุปผลตรวจ เปิดไฟล์นี้ก่อน
- `deal-001-A-fin-input.json`, `deal-001-A-pricing-internal.md`, `deal-001-A-quotation-draft.md` — ฉบับฝ่ายขายที่ตรวจซ้ำ ไฟล์ internal ยังระบุผู้อนุมัติเป็นหัวหน้าทีมขาย เพราะสคริปต์ไม่รู้กฎลูกค้าธนาคาร ให้ยึดไฟล์สรุปผลตรวจ
- `deal-001-B-fin-input.json`, `deal-001-B-pricing-internal.md`, `deal-001-B-quotation-draft.md` — ฉบับที่แนะนำ

## โต๊ะ `md-somchai` · 88 วินาที · 13 รอบ

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List files in my desk, deal, company kit` |
| 2 | **Skill** | **`exec:deal-approval`** |
| 3 | Bash | `Read my desk notes and settings` |
| 4 | Bash | `Read skill references and script header` |
| 5 | Bash | `Read all deal-001 files` |
| 6 | Bash | `Read finance review` |
| 7 | Bash | `Read internal notes and pricing` |
| 8 | Read | `C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md` |
| 9 | Bash | `Check PDPA annex presence, B draft, rest of script` |
| 10 | Bash | `Write deal inputs and run deal check script` |
| 11 | Write | `C:\t\org05p\novatech\deals\deal-001\approval.md` |

**คำตอบสุดท้าย**

ผลคือ **❌ ตีกลับ** ยังอนุมัติไม่ได้ เขียนผลไว้ที่ `deals/deal-001/approval.md` แล้ว

**เหตุผลหลัก**
1. **proposal ไม่มี "ภาคผนวก PDPA"** ลูกค้าเป็นธนาคาร กติกาอนุมัติดีล (`notes/deal-rules.md` ข้อ 3) บังคับให้มีภาคผนวกนี้ 3 ข้อพอดี คือ DPA, การเก็บข้อมูลในไทยเท่านั้น (data residency ไทย) และแจ้งเหตุข้อมูลรั่วภายใน 72 ชม. แต่ค้นทั้งไฟล์ไม่เจอเลย กรณีนี้ต้องตีกลับให้ Sales ทันที และไม่พิจารณาข้ออื่นในรอบนี้
2. **ตัวเลขถูก แต่ man-day ถูกลดให้เข้างบ** รันสคริปต์ตรวจซ้ำแล้วตรงกับที่ Sales และบัญชีคิดไว้
   - ฉบับ A ราคา 4,766,000 บาท margin 35.2%
   - ฉบับ B ราคา 4,800,000 บาท margin 27.1%

   ทั้งสองฉบับรวม buffer 10% แล้ว แต่ฉบับ A ลด man-day ลงให้เข้างบ ถ้า SA ยืนยันจำนวน man-day ของฉบับ A ไม่ได้ ผมแนะนำให้ใช้ฉบับ B
3. **ผู้อนุมัติใน internal-notes ผิด** ดีลธนาคารที่มูลค่าตั้งแต่ 1 ล้านบาทต้องผ่าน MD ไม่ใช่หัวหน้าทีมขาย

**เรื่องที่ต้องแก้ก่อนรอบหน้า**
- ระบุเครดิตเทอม และค่าปรับให้มีเพดาน
- SLA ต้องตอบ Sev 1 ภายใน 30 นาที แต่เสนอ MA แบบ 8x5 ถ้าธนาคารตีความเป็น 24x7 ต้องเพิ่ม 360,000 บาท
- hosting นับ 12 เดือนจากวันลงนาม อาจขาดช่วงประมาณ 6 เดือน (ราว 426,000 บาท)
- เช็กว่า SA และ Tech Lead ว่างจริงในช่วงโครงการ

ในไฟล์ระบุไว้แล้วว่าใครต้องแก้อะไร กำหนดยื่นคือ 13 พ.ย. ยังทันถ้า Sales แก้แล้วส่งกลับมาภายใน 10 พ.ย.

ไฟล์ที่ใช้ตรวจตัวเลขเก็บไว้ที่ `deals/deal-001/work/deal-001/` ผมอ่านแค่โต๊ะของคุณ, company-kit, โฟลเดอร์ดีล และ skill ของแผนก exec เท่านั้น
