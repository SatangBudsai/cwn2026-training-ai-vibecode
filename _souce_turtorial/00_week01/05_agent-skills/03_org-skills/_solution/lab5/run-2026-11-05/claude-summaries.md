# LAB 5 · ผลรันจริงแบบวางพรอมต์ครั้งเดียว (2026-11-05)

รันที่สำเนาแยก `C:/t/org05p/novatech` (ต่อจาก LAB 4 รอบเดียวกัน) ด้วย `claude -p` ที่โฟลเดอร์ `novatech/` · พรอมต์ = [`prompt.txt`](prompt.txt) ทุกตัวอักษร · รวม 21 นาที 40 วินาที (13:18:46 → 13:40:26) · PR #1 เปิด 13:20:58 → merge 13:36:59

รีวิวและคอมเมนต์ทั้งหมดใน PR: [`pr1/pr1-reviews.md`](pr1/pr1-reviews.md) · diff: [`pr1/pr1.diff`](pr1/pr1.diff) · proposal ของ sales-krit: [`krit-deal-002/`](krit-deal-002/)

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

LAB 5 เดินครบแล้ว PR #1 ถูก merge และ proposal deal-002 ของ sales-krit มีภาคผนวก PDPA ครบ 3 ข้อ ใช้รีวิวไป 3 รอบ ซึ่งอยู่ในเพดานที่กำหนด ผมเป็นแค่คนส่งงานต่อ ไม่ได้แก้ skill หรือ PR เอง

| # | ขั้น | ใคร | ทำอะไร | ผล |
|---|---|---|---|---|
| 1 | 1 | sales-nida | แก้ skill `sales-proposal` (1.1.0 → 1.2.0) ให้ใส่ภาคผนวก PDPA เมื่อลูกค้าเป็นธนาคาร แล้วเปิด PR #1 ขอรีวิวจาก plat-may และ md-somchai | เปิด PR #1 |
| 2 | 2 | plat-may | รีวิวรอบ 1: ข้อแจ้งเหตุ 72 ชม. ผิดฝั่ง ตามกฎหมายผู้ประมวลผลต้องแจ้ง "โดยไม่ชักช้า" จึงขอเป็นไม่เกิน 24 ชม. และขอว่าห้ามเขียนให้ภาคผนวกเป็น DPA เอง | request changes |
| 3 | 3 | md-somchai | รีวิวรอบ 1: ขอขยายขอบเขตเป็น "ธนาคารหรือสถาบันการเงิน" และให้หัวข้อมีคำว่า "ภาคผนวก PDPA" ตรงตามกติกา | request changes |
| 4 | แก้รอบ 1 | sales-nida | แก้ครบทั้งสองคน push commit `2bafbe1` แล้วตอบคอมเมนต์ | push + ตอบคอมเมนต์ |
| 5 | 2 (รอบ 2) | plat-may | ขอเปลี่ยนคำว่า "ลูกค้า" ในภาคผนวกเป็น "ผู้ว่าจ้าง" เพราะธนาคารอาจอ่านว่าหมายถึงเจ้าของข้อมูล | request changes |
| 6 | 3 (รอบ 2) | md-somchai | เทียบกับกติกาแล้วตรง ส่วน 24 ชม. เข้มกว่ากติกา 72 ชม. จึงยังผ่าน | **approve** |
| 7 | แก้รอบ 2 | sales-nida | แก้ตาม plat-may push commit `ffc4bbb` แล้วตอบคอมเมนต์ | push + ตอบคอมเมนต์ |
| 8 | 2 (รอบ 3) | plat-may | ตรวจแล้วว่าแก้ครบ | **approve** |
| 9 | 4 | sales-nida | ตรวจว่า approve ครบ แล้ว merge (merge commit `f5c1935`) | **merge** |
| 10 | 5 | sales-krit | อัปเดต skill เป็น 1.2.0 แล้วแก้ร่าง proposal deal-002 เดิมให้ตรง skill ใหม่ | เสร็จ (ยังไม่ส่งลูกค้า) |

**ภาคผนวก PDPA ใน proposal ของ sales-krit: ครบ 3 ข้อ** ผมเปิดไฟล์ `desks/sales-krit/work/deal-002/deal-002-proposal-ati-bank.md` ดูเองแล้ว
1. **DPA:** ธนาคารเป็นผู้ควบคุมข้อมูล โนวาเทคเป็นผู้ประมวลผลตามคำสั่งเท่านั้น และจะลงนาม DPA ตามมาตรา 40 ก่อนเริ่มประมวลผล
2. **Data residency:** ข้อมูลส่วนบุคคลทั้งหมด รวม backup และ log เก็บใน data center ในไทยเท่านั้น
3. **แจ้งเหตุละเมิด:** แจ้งผู้ว่าจ้างไม่เกิน 24 ชม. และช่วยให้ผู้ว่าจ้างแจ้ง สคส. ได้ภายใน 72 ชม.

หัวข้อชื่อ "ภาคผนวก ก: ภาคผนวก PDPA" และหัวข้อ 4.2 อ้างถึงภาคผนวกนี้

**เรื่องที่ควรรู้**
- **approval ของ md-somchai อยู่บน commit เก่า:** md-somchai approve ที่ `2bafbe1` ส่วนการแก้รอบสุดท้าย `ffc4bbb` ไม่ได้ให้ md-somchai รีวิวซ้ำ เพราะในรีวิวเขียนไว้ว่าถ้าแก้แค่คำตามที่ plat-may ขอก็ไม่ต้องรีวิวใหม่ sales-nida ถือข้อนี้แล้ว merge ถ้าต้องการ approve บน commit ล่าสุดจริง ๆ ต้องให้ md-somchai รีวิวเพิ่มอีกรอบ
- **ตัวเลขยังไม่ตรงกัน:** ภาคผนวกใช้ 24 ชม. แต่กติกาที่เขียนไว้ของ MD ยังเป็น 72 ชม. md-somchai บอกว่าจะพิจารณาแก้กติกาแยกจาก PR นี้
- **ขั้น 5 กระทบโต๊ะอื่น:** `claude plugin update` บอกว่าล่าสุดแล้ว เพราะเลขเวอร์ชันของแพ็ก sales ยังเป็น 1.0.0 sales-krit จึงถอนแล้วติดตั้งแพ็กใหม่ ที่เก็บไฟล์แพ็กใช้ร่วมกัน sales-mook และ sales-nida จึงได้ 1.2.0 ไปด้วย ควรให้เจ้าของ skill เพิ่มเลขเวอร์ชันของแพ็กทุกครั้งที่แก้
- **งานที่ยังค้างก่อนยื่น deal-002:** ยังไม่มีเลขเอกสารจริง ต้องให้ SA/DevOps ยืนยัน man-day และให้ fin-joy ตรวจราคา ราคาจะเกินงบถ้าธนาคารต้องการ WAF หรือ MA แบบ 24x7 และ `price.py` ล่มบน Windows ภาษาไทยถ้าไม่รันด้วย `python -X utf8`

log ทั้ง 10 ไฟล์อยู่ที่ `logs/lab5/1-sales-nida.jsonl` … `10-sales-krit.jsonl` (stderr อยู่ไฟล์ `.stderr` ข้างกัน)

## ขั้น 1-sales-nida · 130 วินาที · 11 รอบ

<details><summary>เครื่องมือที่ใช้ (10 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List desk and read approval reason` |
| 2 | Bash | `Inspect desk .claude config` |
| 3 | Bash | `Verify token user and clone org-skills` |
| 4 | Bash | `Read repo README and sales plugin files` |
| 5 | Bash | `Read sales-proposal skill files` |
| 6 | Bash | `Search core/sales for PDPA appendix rules` |
| 7 | Bash | `Create branch, add PDPA appendix, run build` |
| 8 | Bash | `Find duplicate-rule check in build.py` |
| 9 | Bash | `Merge appendix into template, rebuild, validate` |
| 10 | Bash | `Commit, push branch, open PR, request reviewers` |

</details>

**คำตอบสุดท้าย**

ฉันเปิด PR แล้ว และขอรีวิวจาก `plat-may` กับ `md-somchai` เรียบร้อย ตรวจแล้วว่าทั้งสองคนอยู่ในรายชื่อผู้รีวิวจริง
**PR #1:** http://localhost:3300/novatech/org-skills/pulls/1 (branch `sales/proposal-bank-pdpa-appendix` → `main`)

**สิ่งที่แก้ใน `plugins/sales/skills/sales-proposal/` (เวอร์ชัน 1.1.0 → 1.2.0)**
- **`references/proposal-template.md`**: เพิ่มส่วน "ภาคผนวก ก: PDPA" ต่อท้ายหัวข้อ 9 โดยไม่เปลี่ยนลำดับ 9 หัวข้อเดิม บังคับใส่ทุกครั้งที่ลูกค้าเป็นธนาคาร และใช้ข้อความ 3 ข้อตามที่ MD เขียนไว้ใน `approval.md`:
  1. DPA: ธนาคารเป็นผู้ควบคุมข้อมูล ส่วนโนวาเทคเป็นผู้ประมวลผลตามคำสั่งธนาคารเท่านั้น
  2. Data residency: ข้อมูลส่วนบุคคลทั้งหมด รวมถึง backup และ log เก็บใน data center ในประเทศไทยเท่านั้น
  3. แจ้งเหตุข้อมูลรั่วภายใน 72 ชั่วโมงนับจากทราบเหตุ
- **`SKILL.md`**: เพิ่มเรื่องนี้ในขั้นตอนที่ 3 และในกติกาที่ห้ามพลาด ถ้าไม่มีภาคผนวกนี้ ห้ามส่งเข้า `deal-approval`
- **`references/checklist.md`**: เพิ่มข้อตรวจว่าในไฟล์ proposal ต้องค้นเจอคำว่า `ภาคผนวก`, `DPA`, `data residency` และ `72 ชั่วโมง` ครบทุกคำ

ฉันรัน `python scripts/build.py`, `claude plugin validate .` และ `claude plugin validate plugins/sales` ผ่านทั้งหมด

**สิ่งที่ต่างจากแผนแรก**
- **ไม่ได้แยกเป็นไฟล์ใหม่:** ตอนแรกฉันใส่ภาคผนวกไว้ในไฟล์ใหม่ชื่อ `bank-pdpa-appendix.md` แต่ `build.py` ไม่ให้ผ่าน เพราะชื่อไฟล์มีคำว่า "pdpa" และไฟล์นอก core ใช้ชื่อแบบนี้ไม่ได้ ฉันจึงย้ายเนื้อหาไปไว้ใน `proposal-template.md` แทน
- **มีข้อความกติกาซ้ำ 2 ที่:** skill `customer-data-policy` ใน core ระบุว่าภาคผนวกนี้เป็นกติกาของ MD และอยู่ใน `deal-approval` ตอนนี้ข้อความ 3 ข้อจึงซ้ำอยู่ใน template ของ sales ด้วย ใน PR ฉันขอให้ `plat-may` ตัดสินว่าควรย้ายข้อความไปไว้ใน core แล้วให้ sales อ้างถึงแทนหรือไม่ และขอให้ `md-somchai` ยืนยันว่าข้อความตรงกับเกณฑ์ข้อ 5 ที่จะใช้ตรวจรอบหน้า
- **เลขข้อที่อ้างยังไม่ได้ตรวจ:** ใน template ฉันเขียนอ้างว่า "`deal-approval` ข้อ 5" โดยเอาเลขข้อมาจาก `approval.md` เพราะไม่ได้เปิด skill ของแผนก exec ตามที่คุณสั่ง

ฉันทำงานใน clone ของคลังที่ scratchpad เท่านั้น ไม่ได้เปิดโต๊ะคนอื่น, skill แผนกอื่นใน `~/.claude/plugins` หรือ `_solution/` และใช้ token ในฐานะ `sales-nida`

PR นี้แก้แค่ skill ส่วน proposal ของ deal-001 เองยังต้องเพิ่มภาคผนวกและแก้ข้ออื่นที่ MD ตีกลับ ให้เสร็จภายใน 10 พ.ย.

## ขั้น 2-plat-may · 122 วินาที · 7 รอบ

<details><summary>เครื่องมือที่ใช้ (6 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `ls -la && cat CLAUDE.md 2>/dev/null / head -50` |
| 2 | Bash | `find .claude -type f / head; T=$(cat .gitea-token / tr -d '\r\n'); curl -s -H "Authorization: token $T" http:/` |
| 3 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); curl -s -H "Authorization: token $T" http://localhost:3300/api/v1/repos/` |
| 4 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); B=http://localhost:3300/api/v1/repos/novatech/org-skills; curl -s -H "Au` |
| 5 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); B=http://localhost:3300/api/v1/repos/novatech/org-skills/raw; for f in S` |
| 6 | Bash | `cat > "C:/Users/oishi/AppData/Local/Temp/claude/3fd79bde67fee096/dbd823c5-dae6-44c2-96b6-b60c81ac4bab/scratchp` |

</details>

**คำตอบสุดท้าย**

ผมโพสต์รีวิวใน PR #1 เป็น **Request changes** แล้ว (review id 10) ใช้บัญชี `plat-may` และไม่ได้ merge

**ต้องแก้ก่อน merge (🔴)**
1. **ข้อ 3 ที่ให้แจ้งเหตุภายใน 72 ชม. ผิดฝั่ง** 72 ชม. เป็นเส้นตายที่ธนาคาร (ผู้ควบคุมข้อมูล) ต้องแจ้ง สคส. ตามมาตรา 37(4) ส่วนเราเป็นผู้ประมวลผล มาตรา 40(2) ให้แจ้งธนาคาร "โดยไม่ชักช้า" ถ้าเราใช้ 72 ชม. เต็ม ธนาคารจะไม่เหลือเวลาเลย ผมเสนอถ้อยคำใหม่เป็น "โดยไม่ชักช้า ไม่เกิน 24 ชม." ขอให้แก้คำที่ใช้ค้นใน checklist จาก `72 ชั่วโมง` เป็น `24 ชั่วโมง` ด้วย และขอ MD ให้ปรับเกณฑ์ข้อ 5 ของ `deal-approval` ให้ตรงกัน
2. **ย่อหน้าเปิดที่บอกว่าภาคผนวก "ใช้เป็นข้อตกลงการประมวลผลข้อมูล" ใช้ไม่ได้** proposal เป็นแค่ข้อเสนอ ประกาศตัวเองเป็น DPA ไม่ได้ ผมเสนอให้เปลี่ยนเป็น "จะลงนาม DPA ตามมาตรา 40 ก่อนเริ่มประมวลผลข้อมูล โดยมีสาระอย่างน้อยดังนี้" และเติมในข้อ 1 ให้ครบประเด็นหลักของมาตรา 40 คือ มาตรการความปลอดภัย การใช้ผู้ประมวลผลช่วงต้องได้รับความยินยอมจากธนาคาร และการลบหรือคืนข้อมูลเมื่อจบสัญญา ยังคงเป็น 3 ข้อเท่าเดิม และคำที่ checklist ค้นยังใช้ได้

ข้อ 2 เรื่องเก็บข้อมูลในประเทศไทย (รวม backup และ log) ใช้ได้ตามที่เขียนมา

**เรื่องย้ายไป core (🟡) ตอบว่าควรย้าย แต่ไม่ต้องรอข้อนี้** เพื่อให้ deal-001 ทันวันที่ 10 พ.ย. ให้ PR นี้เก็บถ้อยคำไว้ใน template ของ sales ไปก่อน แล้วเพิ่มหมายเหตุว่าถ้อยคำกฎหมายเป็นของ DPO ส่วนเกณฑ์ตรวจเป็นของ MD ในรีวิวผมเขียนในนามคุณว่าหลัง 10 พ.ย. คุณจะเปิด PR ใน core ย้ายถ้อยคำไปไว้ใน `customer-data-policy/references/` และแก้แถว proposal ใน `doc-type-rules.md` ซึ่งตอนนี้ยังชี้ไปที่กติกาของ MD

ในรีวิวยังบอกฝ่ายขายด้วยว่า ถ้า deal-001 ฉบับใหม่ใช้ถ้อยคำเดิมไปแล้ว ให้บอกคุณก่อนส่งให้ธนาคาร

ผมดูแค่ diff ของ PR กับไฟล์ `customer-data-policy` ของคุณใน main ทาง API ไม่ได้เปิด skill ของแผนกอื่น โต๊ะของคนอื่น หรือ `_solution/` จึงยังไม่ได้ดูเกณฑ์ข้อ 5 ใน `deal-approval` เอง ที่เขียนไว้ว่าเกณฑ์นั้นใช้ 72 ชม. มาจากคำอธิบายใน PR

ร่างรีวิวเก็บไว้ที่ `C:\Users\oishi\AppData\Local\Temp\claude\3fd79bde67fee096\dbd823c5-dae6-44c2-96b6-b60c81ac4bab\scratchpad\review.md`

## ขั้น 3-md-somchai · 75 วินาที · 7 รอบ

<details><summary>เครื่องมือที่ใช้ (6 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List my desk files` |
| 2 | Bash | `Read my notes and desk config` |
| 3 | Bash | `Fetch PR #1 metadata and diff from Gitea` |
| 4 | Bash | `Check existing reviews and comments on PR` |
| 5 | Bash | `Read full text of existing reviews` |
| 6 | Bash | `Post request-changes review on PR #1` |

</details>

**คำตอบสุดท้าย**

ผมกด **Request changes** ที่ PR #1 แล้ว (review id 11) ไม่ได้ approve และไม่ได้ merge: http://localhost:3300/novatech/org-skills/pulls/1

ผมเทียบ PR กับกติกาของคุณใน `notes/deal-rules.md` v2026.3 ข้อ 3 มี 2 จุดที่ไม่ตรง

1. **ประเภทลูกค้าแคบกว่ากติกา** กติกาของคุณใช้กับ "ธนาคาร**หรือสถาบันการเงิน**" แต่ PR เขียนว่า "ลูกค้าเป็นธนาคาร" ทุกจุด ทั้ง SKILL.md, checklist และ template ถ้าลูกค้าเป็นบริษัทประกัน บล. ลีสซิ่ง หรือบริษัทบัตรเครดิต Sales จะไม่ใส่ภาคผนวกนี้เลย ผมขอให้แก้ทุกจุด และให้ใช้ชื่อลูกค้าในบล็อกภาคผนวกแทนการเขียนว่า "ธนาคาร" ตายตัว ส่วนธนาคารรัฐ PR จัดไว้เป็นกรณี "ไม่แน่ใจ" แต่ธนาคารรัฐก็คือธนาคาร ต้องใส่ภาคผนวกแน่นอน
2. **ชื่อภาคผนวกไม่ตรง** กติกากำหนดชื่อ "ภาคผนวก PDPA" แต่หัวข้อใน PR คือ "ภาคผนวก ก: การคุ้มครองข้อมูลส่วนบุคคล (PDPA)" ค้นคำว่า "ภาคผนวก PDPA" ไม่เจอ ผมขอให้ใส่คำนี้ในหัวข้อ และให้ checklist ค้นด้วยคำนี้

ส่วนที่ตรงแล้ว:
- มี 3 ข้อพอดี: DPA, เก็บข้อมูลในไทยรวม backup และ log, แจ้งเหตุภายใน 72 ชม.
- บังคับใส่ทุกครั้งแม้ TOR ไม่ขอ
- หัวข้อ 4.2 ใช้แทนภาคผนวกไม่ได้
- ไม่มีภาคผนวกห้ามส่งเข้า deal-approval

**ต้องให้คุณดูต่อ:** plat-may (DPO) กด Request changes ไว้ก่อนแล้ว ขอเปลี่ยนการแจ้งเหตุเป็นไม่เกิน 24 ชม. และขอให้คุณแก้กติกาของคุณจาก 72 เป็น 24 ชม. ด้วย ในรีวิวผมตอบในนามคุณไปว่า 24 ชม. เข้มกว่า จึงยังผ่านกติกา และคุณไม่ขัด ส่วนจะแก้ตัวเลขในกติกาหรือไม่ จะพิจารณาแยกต่างหาก ผมไม่ได้แก้ `deal-rules.md` ถ้าคุณไม่เห็นด้วยกับที่ผมตอบไป บอกได้เลย ผมจะแก้ข้อความในรีวิวให้

ข้อความรีวิวเต็มเก็บไว้ที่ `C:\Users\oishi\AppData\Local\Temp\claude\de5b838c84f47a01\87f33d61-fe1b-4d6b-9359-3bfeebceab58\scratchpad\review.md`

ผมไม่ได้เปิดโต๊ะของคนอื่น ไม่ได้เปิด skill ของแผนกอื่นใน `~/.claude/plugins` และไม่ได้เปิด `_solution/` โค้ดที่ตรวจทั้งหมดอ่านจาก diff ของ PR ผ่าน Gitea API ด้วย token ของคุณ

## ขั้น 4-sales-nida · 190 วินาที · 14 รอบ

<details><summary>เครื่องมือที่ใช้ (13 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List working directory contents` |
| 2 | Bash | `Inspect local Claude config` |
| 3 | Bash | `Fetch PR #1 details and comments` |
| 4 | Bash | `Fetch inline review comments and changed files` |
| 5 | Bash | `Clone repo on PR branch` |
| 6 | Bash | `Show the PR commit diff` |
| 7 | Bash | `Read skill files and build script` |
| 8 | Bash | `Search other references to 72h and appendix` |
| 9 | Bash | `Apply review fixes and run build check` |
| 10 | Bash | `Validate plugins, commit, and push` |
| 11 | Bash | `Commit with Nida identity and push` |
| 12 | Bash | `Update PR description and post reply comment` |
| 13 | Bash | `Edit comment to drop unverified claim` |

</details>

**คำตอบสุดท้าย**

I've fixed PR #1 as requested by both reviewers, pushed it to the same branch, `sales/proposal-bank-pdpa-appendix` (commit `2bafbe1`), and posted a reply on the PR listing what changed: http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-23

Two reviewers had asked for changes: plat-may (the DPO) and md-somchai (the MD). There were no inline comments. I only changed the three files the PR already touched, under `plugins/sales/skills/sales-proposal/`. `scripts/build.py --check` and `claude plugin validate` (both the repo and `plugins/sales`) pass.

**What plat-may asked for**
- **Point 3 (breach notification):** changed from 72 hours to "without delay, and no later than 24 hours", plus cooperating so the customer can notify the PDPC within 72 hours. I used the exact wording plat-may proposed. The checklist now searches for `24 ชั่วโมง` instead of `72 ชั่วโมง`.
- **Opening paragraph:** it no longer says the appendix is the DPA. It now says we will sign a DPA under section 40 before processing any data.
- **Point 1:** added security measures, a ban on sub-processors without the customer's consent, and deleting or returning data when the contract ends. There are still exactly 3 points.
- **Reference line under the heading:** now says the legal wording belongs to the DPO and the review criterion belongs to the MD. The text stays in the sales template for now; plat-may will move it to core after 10 Nov.

**What md-somchai asked for**
- **Customer scope:** changed from "bank" to "bank or financial institution" everywhere. State banks always need the appendix; "not sure" now covers only bank subsidiaries, fintech and nano/pico finance. The template text uses `<ชื่อลูกค้าเต็ม>` / "ลูกค้า" (full customer name / "customer") instead of "bank".
- **Heading:** now `ภาคผนวก ก: ภาคผนวก PDPA (การคุ้มครองข้อมูลส่วนบุคคล)`, and the checklist searches for `ภาคผนวก PDPA`.

I also updated the PR title and description to match, and the reply @-mentions both reviewers asking for a second review.

**Please check**
- To fit md-somchai's wider scope, I replaced "bank" with "customer" in plat-may's legal wording (4 places). I asked plat-may in the comment to confirm that's legally fine.
- plat-may asked to be told if the revised deal-001 proposal already went to the bank with the old wording. I had no way to confirm whether it did, so the reply only says the revised version will be made from this template after merge. If it was already sent, please tell plat-may yourself.
- I didn't touch `approval-rules.md` (the review rules in `deal-approval`, owned by the MD) or core. md-somchai said they'd consider changing the 24-hour rule separately.
- My working copy of the repo is at `~/work/org-skills`. I set its git identity to your account (นิดา แก้วมณี / sales-nida@novatech.test), the same one on the first commit.

## ขั้น 5-plat-may · 131 วินาที · 11 รอบ

<details><summary>เครื่องมือที่ใช้ (10 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List desk files` |
| 2 | Bash | `Check desk config, user, and PR` |
| 3 | Bash | `Fetch PR diff, comments, reviews` |
| 4 | Bash | `Read full diff and comments` |
| 5 | Read | `C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-plat-may\cbccde78-c03e-44e4-a8ce-19b405f659c9\tool-` |
| 6 | Bash | `Fetch inline review comments and list core policy files` |
| 7 | Bash | `Read core customer-data-policy files from main` |
| 8 | Bash | `Read branch template, patterns, and round-2 commit diff` |
| 9 | Bash | `Post REQUEST_CHANGES review on PR #1` |
| 10 | Bash | `Verify inline review comment` |

</details>

**คำตอบสุดท้าย**

ผมส่งรีวิวรอบสองของ PR #1 เป็น **Request changes** แล้ว (review #12 ในชื่อ plat-may) โดยแนบคอมเมนต์ไว้ที่ย่อหน้าเปิดของภาคผนวกใน `proposal-template.md` บรรทัด 36 และไม่ได้ merge

**ที่ผ่านแล้วจากรอบแรก**
- การแจ้งเหตุละเมิดแก้เป็น "ไม่เกิน 24 ชม." แล้ว และแยกเส้นตาย 72 ชม. ซึ่งเป็นของผู้ควบคุมข้อมูลไว้ชัดเจน checklist ก็เปลี่ยนไปค้นคำว่า `24 ชั่วโมง` แล้ว
- ย่อหน้าเปิดไม่ได้อ้างว่าภาคผนวกนี้เป็น DPA แล้ว และข้อ 1 ครบสาระหลักตาม ม.40
- ข้อ data residency, กติกาที่ต้องไม่ขัดกับหัวข้อ 4.1, บรรทัดที่ระบุว่าถ้อยคำเป็นของ DPO และการขยายขอบเขตเป็นธนาคารหรือสถาบันการเงิน ใช้ได้ทั้งหมด

**สิ่งที่ต้องแก้ก่อน merge (1 จุด)**
นิดาเปลี่ยนคำว่า "ธนาคาร" ในบล็อกภาคผนวกเป็น "ลูกค้า" ตามที่ MD ขอ แต่ในเอกสารที่ส่งให้ธนาคาร คำว่า "ลูกค้า" มักหมายถึงลูกค้าของธนาคาร ซึ่งก็คือเจ้าของข้อมูล ถ้าอ่านแบบนั้น ถ้อยคำปัจจุบันจะมีความหมายว่า:
- ก่อนใช้ผู้ประมวลผลช่วง เราต้องได้รับความยินยอมจากเจ้าของข้อมูลทุกคน ซึ่งทำไม่ได้จริง
- เราจะแจ้งเหตุละเมิดถึงเจ้าของข้อมูลโดยตรง ซึ่งเป็นหน้าที่ของผู้ควบคุมตาม ม.37(4) และขัดกับข้อ 1 ของเราเอง

ผมจึงให้ถ้อยคำทดแทนครบทั้งบล็อกไว้ในรีวิว โดยนิยามคู่สัญญาครั้งเดียวในย่อหน้าเปิดว่า `<ชื่อลูกค้าเต็ม> ("ผู้ว่าจ้าง")` แล้วใช้คำว่า "ผู้ว่าจ้าง" ตลอดบล็อก ถ้อยคำนี้ยังมี 3 ข้อพอดีและมีคำที่ MD ใช้ค้นครบ จึงยังผ่านเกณฑ์ของ MD

**ข้อแนะนำที่ไม่บล็อกการ merge**
- บรรทัดที่บอกว่า "เพิ่มรายละเอียดมาตรการได้" ควรเขียนให้ชัดว่าเพิ่มได้เฉพาะมาตรการทางเทคนิคที่ทำจริงอยู่แล้ว ถ้าเป็นข้อผูกพันทางกฎหมายใหม่ต้องถาม DPO ก่อน
- หัวเอกสารใน template ยังเขียนว่า "เสนอต่อ: <ชื่อธนาคารเต็ม>" ผมระบุไว้ว่าเรื่องนี้ให้ Sales กับ MD ตัดสิน

ในรีวิวผมยังรับปากไว้ว่าหลังวันที่ 10 พ.ย. คุณจะเปิด PR ใน core เพื่อย้ายถ้อยคำภาคผนวกไปไว้ที่ `customer-data-policy` และแก้ `doc-type-rules.md` ที่ตอนนี้ยังเขียนว่าภาคผนวกนี้ "เป็นกติกาของ MD" และย้ำว่าห้ามส่ง deal-001 ฉบับใหม่ให้ลูกค้าก่อน PR นี้ merge

ตลอดการรีวิว ผมเปิดแค่ PR, ไฟล์ใน repo และ policy ใน core ของคุณ ไม่ได้เปิดโต๊ะของคนอื่น, ไม่ได้เปิดโฟลเดอร์ `~/.claude/plugins` และไม่ได้เปิด `_solution`

## ขั้น 6-md-somchai · 64 วินาที · 8 รอบ

<details><summary>เครื่องมือที่ใช้ (7 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `ls -la && cat *.md 2>/dev/null / head -100` |
| 2 | Bash | `find . -type f -not -name .gitea-token / head -50; for f in $(find notes .claude -type f); do echo "=== $f"; c` |
| 3 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); H="Authorization: token $T"; B=http://localhost:3300/api/v1/repos/novate` |
| 4 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); H="Authorization: token $T"; B=http://localhost:3300/api/v1/repos/novate` |
| 5 | Read | `C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-md-somchai\d77d1c6a-283d-467a-a3df-614213070e56\too` |
| 6 | Bash | `T=$(cat .gitea-token / tr -d '\r\n'); B=http://localhost:3300/api/v1/repos/novatech/org-skills; curl -s -H "Au` |
| 7 | Bash | `cat > "C:/Users/oishi/AppData/Local/Temp/claude/de5b838c84f47a01/d77d1c6a-283d-467a-a3df-614213070e56/scratchp` |

</details>

**คำตอบสุดท้าย**

I approved PR #1 as you (md-somchai) on the latest commit `2bafbe1`. I didn't merge it.

**Why I approved:** I checked the text against `notes/deal-rules.md` section 3, the PDPA appendix rule, and it now matches:
- **Customer scope:** It now says "ธนาคารหรือสถาบันการเงิน" in every place: SKILL.md, the checklist and the template. State banks are a definite "must include". Unclear cases such as bank subsidiaries and fintech get the appendix anyway, with a note in internal-notes.
- **Appendix title:** It contains the exact phrase "ภาคผนวก PDPA", and the checklist now searches for that phrase.
- **Exactly 3 items:**
  1. DPA: we are the processor, the customer is the controller, and we process only on the customer's instructions.
  2. Data residency in Thailand, including backup and log.
  3. Breach notification within 24 hours. That's stricter than your 72-hour rule, so it passes. You said the same in round one.
- **Other rules:** A proposal without the appendix can't go to `deal-approval`, section 4.2 doesn't count as a substitute, and if the TOR is stricter, the TOR wins.

**Notes I put in the review:**
- The DPO (plat-may) still has changes requested. They want the word "ลูกค้า" inside the appendix replaced with "ผู้ว่าจ้าง", because a bank may read "ลูกค้า" as its own customers, who are the data owners. That's a legal wording question and doesn't affect your rules. I wrote that if Sales makes the change and keeps the 3 items and the title, they don't need you to review again.
- The PR can't be merged until the DPO approves. I also repeated that the new deal-001 must not go to the customer before the merge.
- Changing your rule from 72 to 24 hours is a separate decision for you, outside this PR. The PR text no longer matches your written rule on that number.

I only read your desk folder, the token file and the PR on Gitea.

## ขั้น 7-sales-nida · 154 วินาที · 22 รอบ

<details><summary>เครื่องมือที่ใช้ (21 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List desk contents` |
| 2 | Bash | `Inspect .claude settings` |
| 3 | Bash | `Identify user and fetch PR #1` |
| 4 | Bash | `Fetch PR comments and reviews` |
| 5 | Read | `C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-sales-nida\4ddb5b5e-5987-4066-808f-2702d8c86907\too` |
| 6 | Bash | `Fetch inline comments and clone PR branch` |
| 7 | Bash | `Show changed files and template` |
| 8 | Bash | `Check references and other diffs` |
| 9 | Bash | `Apply DPO wording to template` |
| 10 | Bash | `Verify wording match and run checks` |
| 11 | Bash | `Compare line by line` |
| 12 | Bash | `Re-verify with UTF-8 decoding and show diff` |
| 13 | Bash | `Commit as Nida and push to PR branch` |
| 14 | Bash | `Post reply comment on PR` |
| 15 | Bash | `Update PR description with round-two fixes` |
| 16 | Bash | `Verify stored PR body is intact` |
| 17 | Bash | `Diagnose PR body check` |
| 18 | Bash | `Locate corrupted characters` |
| 19 | Bash | `Compare server PR body with sent payload` |
| 20 | Bash | `Inspect corruption location` |
| 21 | Bash | `Re-PATCH PR body via urllib and verify` |

</details>

**คำตอบสุดท้าย**

เสร็จแล้วค่ะ ทั้งการแก้ การ push และการตอบคอมเมนต์ใน PR #1 (`sales/proposal-bank-pdpa-appendix`) ทำในนามของนิดา (`sales-nida`) ด้วย token ใน `.gitea-token` โดย clone รีโปไว้ใน scratchpad ของเครื่องนี้ ไม่ได้เปิดโต๊ะคนอื่น skill แผนกอื่น หรือ `_solution`

**สถานะคอมเมนต์ใน PR**
- **MD (md-somchai):** approve แล้วที่ `2bafbe1` และบอกว่าถ้าแก้ตาม DPO แล้วยังมี 3 ข้อพอดี สาระครบ และหัวยังมี `ภาคผนวก PDPA` ก็ไม่ต้องรีวิวซ้ำ
- **DPO (plat-may):** รอบสองยังขอแก้ 1 จุดที่บล็อก merge (🔴) และมีคำแนะนำอีก 2 จุด (🟡) ซึ่งแก้ครบทั้งหมดแล้วตามด้านล่าง

**สิ่งที่แก้** (commit `ffc4bbb` แก้ไฟล์เดียวคือ `plugins/sales/skills/sales-proposal/references/proposal-template.md`)
1. **🔴 คำว่า "ลูกค้า" ในบล็อกกำกวม:** แทนบล็อกภาคผนวกด้วยข้อความที่ DPO ให้มา เทียบด้วยสคริปต์แล้วตรงทุกตัวอักษร
   - ย่อหน้าเปิดนิยาม `<ชื่อลูกค้าเต็ม> ("ผู้ว่าจ้าง")` ไว้จุดเดียว แล้วใช้ "ผู้ว่าจ้าง" ตลอดบล็อก
   - เพิ่มบรรทัด "คู่สัญญา" ใต้หัวภาคผนวก บอก Sales ว่าในบล็อกห้ามใช้คำว่า "ลูกค้า" พร้อมเหตุผล
2. **🟡 กติกาเรื่องการเพิ่มเนื้อหาใต้แต่ละข้อ:** เพิ่มได้เฉพาะมาตรการทางเทคนิคที่ทำจริงอยู่แล้วและตรงกับ 4.1/4.2 ถ้าเป็นข้อผูกพันทางกฎหมายใหม่ต้องถาม DPO ก่อน
3. **🟡 หัวเอกสาร:** เปลี่ยน `เสนอต่อ: <ชื่อธนาคารเต็ม>` เป็น `<ชื่อลูกค้าเต็ม>` ให้ตรงกับขอบเขต "ธนาคารหรือสถาบันการเงิน" ที่ MD อนุมัติ DPO บอกว่าเรื่องนี้ให้ Sales/MD ตัดสิน จึงตัดสินในฐานะ Sales และเขียนในคอมเมนต์ไว้ว่า MD ค้านได้

`python scripts/build.py --check` และ `claude plugin validate` (ทั้งคลังและ `plugins/sales`) ผ่านทั้งหมด

**สิ่งที่โพสต์ใน PR**
- คอมเมนต์ตอบทั้งสองท่าน (#issuecomment-28) สรุปว่าแก้อะไรทีละข้อ mention @plat-may ให้รีวิวรอบสาม และแจ้งว่ายังไม่ merge และยังไม่ส่ง deal-001 ให้ลูกค้า
- เพิ่มหัวข้อ "แก้ตามรีวิวรอบสอง (`ffc4bbb`)" ในคำอธิบาย PR ส่ง PATCH ครั้งแรกด้วย curl แล้วมีตัวอักษรไทยเพี้ยน 1 ตัว จึงส่งใหม่ ตรวจแล้วตอนนี้ตรงกับที่ตั้งใจทุกตัวอักษร

**ที่ยังไม่ได้ทำ**
- ไม่ได้ตอบใต้คอมเมนต์ inline ของ DPO แยก เพราะ API ของ Gitea ไม่มี endpoint ตอบคอมเมนต์รีวิว แต่เรื่องเดียวกันตอบไว้ในคอมเมนต์หลักแล้ว
- ยังไม่ merge เพราะต้องรอ DPO approve ก่อน
- deal-001 ฉบับใหม่ยังไม่ได้ทำ ตามที่ทั้งสองท่านขอว่าห้ามส่งก่อน merge

## ขั้น 8-plat-may · 78 วินาที · 9 รอบ

<details><summary>เครื่องมือที่ใช้ (8 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List desk files and read markdown` |
| 2 | Bash | `Check user and PR details` |
| 3 | Bash | `Fetch PR diff, comments, reviews` |
| 4 | Read | `C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-plat-may\5bf766e2-bf1d-4be3-9735-cc7dcbf1d5b2\tool-` |
| 5 | Bash | `Fetch inline comments and commits` |
| 6 | Bash | `Compare appendix block to my proposed wording` |
| 7 | Bash | `Fetch head template and compare block` |
| 8 | Bash | `Submit approving review on PR #1` |

</details>

**คำตอบสุดท้าย**

ดิฉัน approve PR #1 แล้วค่ะ (review #14 บน commit `ffc4bbb`) ยังไม่ได้ merge ตอนนี้ PR ยังเปิดอยู่

**ทำไมถึง approve:** นี่คือรีวิวรอบสาม ในรอบสองติดอยู่ 🔴 จุดเดียว คือคำว่า "ลูกค้า" ในบล็อกภาคผนวกกำกวม ธนาคารอาจอ่านว่าหมายถึงเจ้าของข้อมูล รอบนี้แก้ครบแล้ว:
- ดิฉันใช้สคริปต์เทียบบล็อกภาคผนวกใน `proposal-template.md` กับถ้อยคำที่เสนอไว้ในรีวิวรอบสอง ตรงกันทุกตัวอักษร
- นิยาม `<ชื่อลูกค้าเต็ม> ("ผู้ว่าจ้าง")` ครั้งเดียว และในบล็อกไม่มีคำว่า "ลูกค้า" เหลืออยู่
- เกณฑ์ของ MD ยังผ่าน คือมี 3 ข้อพอดี และค้นเจอ keyword ครบทั้ง 4 คำ (`ภาคผนวก PDPA`, `DPA`, `data residency`, `24 ชั่วโมง`)
- ข้อแนะนำ 🟡 สองข้อจากรอบสองก็แก้แล้ว (กติกาว่าใต้ข้อเพิ่มอะไรได้บ้าง และหัวเอกสาร "เสนอต่อ")
- MD (md-somchai) approve ไว้ตั้งแต่รอบสอง และเขียนไว้ว่าการเปลี่ยนเป็น "ผู้ว่าจ้าง" ไม่ต้องรอเขารีวิวซ้ำ

**ในคอมเมนต์ approve ดิฉันใส่ไว้ด้วย:**
- หมายเหตุที่ไม่บล็อก: ถ้า TOR ขอเงื่อนไขเข้มกว่า ให้ใช้ของ TOR ได้ แต่แก้ได้แค่ตัวเลขให้เข้มขึ้น ถ้าจะแก้ถ้อยคำส่วนอื่นยังต้องถาม DPO ก่อน และขอ MD ว่าถ้าปรับเกณฑ์ข้อ 5 ให้ใช้ "แจ้งผู้ว่าจ้างไม่เกิน 24 ชม." จะได้ตรงกับ template
- ย้ำว่าห้ามส่ง deal-001 ฉบับใหม่ให้ลูกค้าก่อน PR นี้ merge
- งานต่อของเราเอง: หลัง 10 พ.ย. ต้องเปิด PR ใน core ย้ายบล็อกนี้ไปไว้ที่ `customer-data-policy/references/` และแก้แถว proposal ใน `doc-type-rules.md` ให้ชี้ไปที่นั่น

ดิฉันอ่านแค่ PR และไฟล์ template ใน branch ของ PR ผ่าน API ด้วย token ใน `.gitea-token` ไม่ได้เปิดโต๊ะของคนอื่น ไม่ได้เปิด skill ของแผนกอื่นใน `~/.claude/plugins` และไม่ได้เปิด `_solution` ค่ะ

## ขั้น 9-sales-nida · 63 วินาที · 10 รอบ

<details><summary>เครื่องมือที่ใช้ (9 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `List desk files` |
| 2 | Bash | `Inspect settings and gitea config` |
| 3 | Bash | `Check PR #1 and its reviews` |
| 4 | Bash | `Get head, commits, review bodies, protection` |
| 5 | Bash | `Locate review headers and protection settings` |
| 6 | Bash | `Read latest reviews and protection output` |
| 7 | Bash | `Check protection and diff of last commit` |
| 8 | Bash | `Get diff of last commit` |
| 9 | Bash | `Merge PR #1 and verify` |

</details>

**คำตอบสุดท้าย**

PR #1 merge เข้า `main` แล้วครับ ผมเช็กสถานะหลัง merge ได้ว่า PR ปิดแล้ว ผู้ merge คือ sales-nida และ merge commit คือ `f5c1935`

**สถานะการ approve ก่อน merge**
- **plat-may (DPO):** approve ที่ commit ล่าสุด `ffc4bbb` ซึ่งเป็นรีวิวรอบสาม คำขอแก้ก่อนหน้านี้ไม่มีผลแล้ว
- **md-somchai (MD):** approve ที่ `2bafbe1` ซึ่งเป็น commit ก่อนหน้า Gitea จึงแสดงว่า approval นี้ไม่ตรงกับ commit ล่าสุด แต่ MD เขียนไว้ในรีวิวว่า ถ้าแก้ "ลูกค้า" เป็น "ผู้ว่าจ้าง" ตาม DPO แล้วยังมี 3 ข้อพอดี สาระครบ และหัวข้อยังมีคำว่า `ภาคผนวก PDPA` ก็ไม่ต้องรีวิวซ้ำ

ผมเปิด diff ของ `ffc4bbb` ดูแล้ว เป็นการแก้ถ้อยคำอย่างเดียว:
- ในบล็อกภาคผนวกเปลี่ยนคำว่า "ลูกค้า" เป็น "ผู้ว่าจ้าง"
- หัวเอกสาร "เสนอต่อ:" เปลี่ยนจาก `<ชื่อธนาคารเต็ม>` เป็น `<ชื่อลูกค้าเต็ม>` จุดนี้อยู่นอกบล็อก ส่วน DPO ตรวจแล้วว่าไม่มีปัญหาด้าน PDPA
- เพิ่มบรรทัดกติกาเรื่องคู่สัญญา

ส่วน 3 ข้อ หัวข้อ `ภาคผนวก PDPA` และเงื่อนไขแจ้งเหตุภายใน 24 ชั่วโมงยังอยู่ครบ จึงเข้าเงื่อนไขของ MD และผมถือว่า approve ครบแล้วจึง merge

**งานที่ต้องทำต่อตามที่ reviewer ฝากไว้**
- **deal-001:** ทำฉบับใหม่จาก template ที่เพิ่ง merge แล้วส่งเข้า `deal-approval` ก่อน ห้ามส่งให้ลูกค้าโดยตรง
- **MD:** จะพิจารณาเปลี่ยนเกณฑ์ข้อ 5 ใน `deal-approval` เป็น 24 ชั่วโมงแยกจาก PR นี้
- **DPO:** หลัง 10 พ.ย. จะเปิด PR ใน core ย้ายบล็อกภาคผนวกไปไว้ที่ `customer-data-policy/references/` แล้วจะแจ้งให้ sales เปลี่ยน template ไปอ้างถึงที่นั่นแทนการคัดลอก

ผมใช้แค่ไฟล์ในโต๊ะ sales-nida กับ API ของ Gitea ด้วย token ของคุณ ไม่ได้เปิดโต๊ะของคนอื่น ไม่ได้เปิด skill ของแผนกอื่น และไม่ได้เปิดโฟลเดอร์ `_solution`

## ขั้น 10-sales-krit · 144 วินาที · 19 รอบ

<details><summary>เครื่องมือที่ใช้ (18 ครั้ง)</summary>

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | `Explore desk contents` |
| 2 | Bash | `List desk files and plugin metadata` |
| 3 | Bash | `Check marketplace git state` |
| 4 | Bash | `Fetch marketplace updates` |
| 5 | Bash | `Diff incoming changes for sales and core` |
| 6 | Bash | `Update marketplace and plugins via CLI` |
| 7 | Bash | `Check installed sales-proposal version` |
| 8 | Bash | `Reinstall sales plugin at project scope` |
| 9 | Bash | `Read sales-proposal skill files` |
| 10 | Bash | `Read TOR and existing deal-002 work files` |
| 11 | Read | `C:\t\org05p\novatech\desks\sales-krit\work\deal-002\deal-002-proposal-ati-bank.md` |
| 12 | Bash | `List core skills and read brand-guide` |
| 13 | Bash | `Replace PDPA appendix and 4.2 reference` |
| 14 | Bash | `Verify pricing, PII scan, and checklist keywords` |
| 15 | Bash | `Re-run pricing script with UTF-8 output` |
| 16 | Bash | `Re-run pricing script in UTF-8 mode` |
| 17 | Bash | `Update internal notes for skill 1.2.0 changes` |
| 18 | Bash | `Verify appendix matches DPO template verbatim` |

</details>

**คำตอบสุดท้าย**

ฉันอัปเดต skill ในโต๊ะนี้เป็นฉบับล่าสุดแล้ว และทำ proposal deal-002 ให้ตรงกับฉบับใหม่แล้ว ราคา margin และการตรวจข้อมูลส่วนบุคคลผ่านหมด แต่ยังส่งลูกค้าไม่ได้ จนกว่างานในรายการด้านล่างจะเสร็จ

## 1. อัปเดต skill

ดึงคลัง novatech-skills มาจาก Gitea แล้ว มีงานใหม่ 1 PR (#1 merge แล้ว) ที่แก้แค่ `sales-proposal` จาก 1.1.0 เป็น 1.2.0 ส่วน `core` ไม่มีอะไรเปลี่ยน

ตัวเลขเวอร์ชันของแพ็ก sales ยังเป็น 1.0.0 เหมือนเดิม คำสั่ง `claude plugin update` เลยตอบว่า "ล่าสุดแล้ว" ทั้งที่ยังไม่ได้ของใหม่ ฉันจึงถอนแล้วติดตั้งแพ็ก sales ใหม่เฉพาะโต๊ะนี้ ตอนนี้ skill ที่ติดตั้งเป็น 1.2.0 แล้ว แต่ที่เก็บไฟล์ของแพ็ก sales บนเครื่องนี้ใช้ร่วมกับโต๊ะ sales-mook และ sales-nida สองโต๊ะนั้นจึงได้ 1.2.0 ไปด้วย

**สิ่งที่เปลี่ยนใน sales-proposal 1.2.0** (มาจากที่ MD ตีกลับ deal-001 เมื่อ 5 พ.ย.)
- **ลูกค้าเป็นธนาคารหรือสถาบันการเงิน ต้องมี "ภาคผนวก ก: ภาคผนวก PDPA" ทุกครั้ง** แม้ TOR ไม่ขอ วางต่อท้ายหัวข้อ 9 ถ้าไม่มี ห้ามส่งเข้า `deal-approval`
- ภาคผนวกมี 3 ข้อพอดี ถ้อยคำเป็นของ DPO แก้ได้แค่ชื่อลูกค้า:
  - ลงนาม DPA ตามมาตรา 40 ก่อนเริ่มประมวลผลข้อมูล
  - ข้อมูลอยู่ในไทยทั้งหมด รวม backup และ log (data residency)
  - แจ้งเหตุละเมิดข้อมูลให้ลูกค้า**ไม่เกิน 24 ชั่วโมง**
- ในภาคผนวกต้องเรียกลูกค้าว่า "ผู้ว่าจ้าง" ห้ามใช้คำว่า "ลูกค้า"
- หัวข้อ 4.2 ใช้แทนภาคผนวกไม่ได้ ให้อ้างถึงภาคผนวกแค่ 1 บรรทัด
- เช็กลิสต์ข้อ PDPA เพิ่มคำที่ต้องค้นเจอในไฟล์: `ภาคผนวก PDPA`, `DPA`, `data residency`, `24 ชั่วโมง`
- หัวเอกสารเปลี่ยนจาก "ชื่อธนาคารเต็ม" เป็น "ชื่อลูกค้าเต็ม"

## 2. Proposal deal-002 (`work/deal-002/`)

โต๊ะนี้มีร่างที่ทำไว้เมื่อ 4 พ.ย. ด้วย skill ฉบับเก่าอยู่แล้ว มีจุดที่ผิดฉบับใหม่ คือภาคผนวกเขียนถ้อยคำเอง สัญญาแจ้งเหตุ "ไม่เกิน 72 ชม." (ช้ากว่ามาตรฐาน 24 ชม.) และไม่มีการลงนาม DPA ตามมาตรา 40 ฉันจึงแก้ร่างเดิมแทนการเขียนใหม่:

- **`deal-002-proposal-ati-bank.md`**
  - เปลี่ยนภาคผนวกเป็นบล็อกของ DPO ทั้งบล็อก เติมชื่อธนาคารเอเชียไทยสากลฯ ตรวจด้วยสคริปต์แล้วว่าตรงต้นฉบับทุกบรรทัด และไม่มีคำว่า "ลูกค้า"
  - ใต้ข้อ 1–2 เพิ่มเฉพาะมาตรการเทคนิคที่เขียนไว้แล้วในหัวข้อ 4.1/4.2
  - แก้ 4.2 ให้อ้างภาคผนวกแทนการเขียน 72 ชม. และเปลี่ยนวันที่เอกสารเป็น 5 พ.ย. 2026
- **ราคาไม่เปลี่ยน**: รันสคริปต์ราคาซ้ำ ได้ผลตรงกับ `deal-002-pricing-output.md`
  - ยอดรวม 2,200,000 บาท ไม่รวม VAT เท่างบ TOR พอดี
  - margin 33.9%: หัวหน้าทีมขาย (sales-nida) อนุมัติได้ ไม่ต้องเข้า deal-approval
- **ตรวจข้อมูลส่วนบุคคลแล้ว**: สคริปต์สแกนพบ 0 จุด ไม่มีเบอร์มือถือผู้ประสานงานจาก TOR ไม่มีเลข 13 หลัก ไม่มีต้นทุนหรือ margin ในเอกสารลูกค้า
- **`deal-002-internal-notes.md`**: บันทึกว่าแก้อะไรตาม 1.2.0 และทำไม พร้อมอัปเดตเช็กลิสต์

**ต้องทำก่อนยื่น 20 พ.ย.** (จาก internal-notes)
- ขอเลขที่เอกสาร NVT-PRP จริง ตอนนี้ยังเป็นตัวแทนอยู่
- SA และ DevOps ยืนยันว่าจำนวน man-day ที่บางมากทำได้จริง และยืนยันเรื่องขนาด hosting (CL-S)
- fin-joy ตรวจราคาด้วย `pricing-calc`
- sales-nida อนุมัติ margin
- ปัญหาเรื่องราคาที่ต้องคุยก่อนยื่น:
  - WAF ไม่อยู่ในราคาหลัก ถ้าธนาคารไม่มี WAF ต้องเพิ่ม 144,000 บาท/ปี ซึ่งเกินงบ
  - MA ที่รวมในราคาเป็น 8x5 ถ้าธนาคารต้องการ 24x7 จะเกินงบ 360,000 บาท
- จัดหน้า PDF ตามคู่มือแบรนด์

**ควรแจ้ง sales-nida (เจ้าของ skill):**
- สคริปต์ราคา `price.py` ล่มบน Windows ภาษาไทย เพราะพิมพ์อักษร "−" ไม่ได้ ต้องรันแบบ `python -X utf8 ...`
- ควรเพิ่มเวอร์ชันของแพ็ก sales ด้วย ไม่อย่างนั้นโต๊ะอื่นที่สั่งอัปเดตจะไม่ได้ skill ฉบับใหม่

ฉันไม่ได้เปิดโต๊ะอื่น ไม่ได้เปิด skill ของแผนกอื่น (ดูเฉพาะไฟล์ของ sales และ core) และไม่ได้แตะ `_solution/`
