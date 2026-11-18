# LAB 5 · ผลรันจริง 2026-11-04 (บริษัท 28 คน)

ทุกขั้นรันด้วย claude -p ที่โต๊ะของคนนั้นแบบแยกเครื่อง (เหลือแค่โต๊ะนั้น + plugin core กับแผนกของเขา) ส่วน PR อยู่บน Gitea จริง

## lab5-1-nida-pr · โต๊ะ sales-nida · 09:02:16–09:04:39

พรอมต์: MD ตีกลับดีล deal-001 เพราะ proposal ไม่มีภาคผนวก PDPA (เหตุผลอยู่ใน ../../deals/deal-001/approval.md)
แก้ skill sales-proposal ในคลังกลาง novatech/org-skills ให้ใส่ภาคผนวกนี้ทุกครั้งที่ลูกค้าเป็นธนาคาร แล้วเปิด PR ให้ทีมรีวิว (token ของผมอยู่ใน .gitea-token)

I opened the PR: **http://localhost:3300/novatech/org-skills/pulls/1** (branch `sales-proposal/pdpa-annex-bank` into `main`). It can be merged and needs at least one approval.

**Where the rule came from:** the PDPA annex rule was already written in the repo, in `exec/deal-approval/references/approval-rules.md` (MD rule, in effect since 1 Jul 2026). I copied the wording from there so it matches what the MD checks at approval.

**Changes to `sales-proposal` (version 1.1.0 → 1.2.0):**
- **`SKILL.md`**:
  - Step 3 now says: if the customer is a bank or financial institution, always add a "ภาคผนวก PDPA" at the end of the proposal.
  - A new must-follow rule says a proposal without all 3 items must not be sent.
  - It warns that the older winning proposals pre-date the rule and don't have this annex.
- **`references/proposal-template.md`**:
  - Adds the annex with exactly 3 items: (1) DPA: Novatech is the processor, the bank is the controller, and processing follows the bank's instructions only. (2) All personal data, including backups and logs, stays in a data centre in Thailand only. (3) The bank is notified within 72 hours of learning of an incident.
  - It sits after section 9, so the 9 sections keep their order.
  - Section 4.2 must refer to the annex instead of saying "within the time required by law". That was reason 2 the MD gave.
- **`references/checklist.md`**: adds 3 PDPA checks for the annex.

**Scope:** you said "banks", but I used "banks and financial institutions" because that is how the original rule is written. Tell me if you want it limited to banks only.

`build.py --check`, `claude plugin validate .` and `claude plugin validate plugins/sales` all pass.

**Reviewers:** the code owner for `plugins/sales` is you, and Gitea doesn't auto-request the PR author. So I requested reviews from `md-somchai` (owner of the rule), `sales-krit` (shares this skill with you) and `plat-may` (owns PDPA policy).

**Open question in the PR:** the rule's wording now lives in two places (deal-approval and this template). I linked the template back to the original, but the repo README says a rule copied into two skills should move to `core` (`customer-data-policy`). I asked `plat-ken` in the PR whether to move it; if yes, that would be a separate PR.

This only fixes the skill. The deal-001 proposal itself still needs the annex and the 4.2 fix before you resend it. You need to resend by 13 Nov. I can update the proposal file for you if you want.

## lab5-2-may-review · โต๊ะ plat-may · 09:04:43–09:07:07

พรอมต์: รีวิว PR #1 ใน novatech/org-skills (http://localhost:3300 token ของผมอยู่ใน .gitea-token) ในฐานะเจ้าของนโยบายข้อมูลลูกค้า
ถ้ามีจุดที่ต้องแก้ให้ request changes พร้อมเหตุผลเป็นคอมเมนต์ใน PR ถ้าดีแล้วให้ approve (ยังไม่ต้อง merge)

ผมส่ง review แบบ **Request changes** ใน PR #1 แล้ว (http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-8) มีความเห็นหลัก 1 ก้อนกับคอมเมนต์ในบรรทัดอีก 3 จุดที่ `proposal-template.md` บรรทัด 34, 37 และ 38 ยังไม่ได้ merge

**ส่วนที่ผ่าน:** ข้อความภาคผนวกทั้ง 3 ข้อตรงกับกติกาต้นฉบับใน `deal-approval/references/approval-rules.md` ขอบเขตใช้ "ธนาคาร/สถาบันการเงิน" ถูก ลำดับ 9 หัวข้อเดิมไม่เปลี่ยน และไม่ได้คัดลอกรายการห้ามกับตาราง mask ของ `customer-data-policy` ไปไว้ ข้อ DPA กับข้อ data residency ใช้ได้

**ข้อที่ต้องแก้: ข้อ 3 การแจ้งเหตุละเมิดข้อมูล**
- ตาม PDPA ม.37(4) ธนาคารในฐานะผู้ควบคุมข้อมูลต้องแจ้ง สคส. ภายใน 72 ชม. ส่วนม.40(2) ให้โนวาเทคในฐานะผู้ประมวลผลแจ้งธนาคาร "โดยไม่ชักช้า"
- ถ้าเราสัญญาไว้แค่ "ภายใน 72 ชม." เราอาจใช้เวลาจนหมดเส้นตายของธนาคาร และธนาคารจะแจ้ง สคส. ไม่ทัน
- ผมเสนอให้เขียนว่า "**โดยไม่ชักช้า และไม่เกิน 72 ชั่วโมง** นับจากที่ทราบเหตุ…" ข้อความนี้ยังมีคำว่า "72 ชั่วโมง" จึงยังผ่านเกณฑ์ข้อ 5 ของ `deal-approval` และ checklist ที่ค้นคำนี้
- ขอให้แก้ข้อความหัวข้อ 4.2 และ checklist ให้ตรงกันด้วย
- ผมแท็ก `md-somchai` ไว้ว่าควรแก้ถ้อยคำในต้นฉบับ `approval-rules.md` แบบเดียวกัน และเสนอเปิด PR แยกฝั่ง exec ให้

**ข้อเสนอที่ไม่บล็อก**
- กรณีลูกค้าที่ไม่ใช่ธนาคารแต่มีข้อมูลอ่อนไหวตามม.26 ควรเพิ่มให้แจ้ง `plat-may` ด้วย ตามแถวข้อมูลสุขภาพใน `doc-type-rules.md`
- ข้อ DPA อาจเพิ่มประโยคว่ารายละเอียดจะจัดทำเป็นข้อตกลงแนบท้ายสัญญา

**คำถามที่ผู้เปิด PR ถามทีมกลาง (`plat-ken`) เรื่องข้อความกติกาที่อยู่ 2 ที่**
- ผมตอบในส่วนของเจ้าของ `customer-data-policy` ว่าไม่ต้องบล็อก PR นี้ เพราะมีลิงก์กลับไปที่ต้นฉบับแล้ว
- ระยะยาวผมรับย้ายถ้อยคำภาคผนวกมาไว้ใน `customer-data-policy` ได้ ส่วนกติกา "ต้องมี / ไม่มีถือว่าตีกลับ" ยังเป็นของ MD ใน `deal-approval`
- ถ้าจะย้ายให้ทำเป็น PR แยก ส่วนเรื่องโครงสร้างคลังให้ `plat-ken` ตัดสิน

เมื่อผู้เปิด PR แก้ข้อ 3 แล้ว บอกผมได้เลย ผมจะเข้าไปตรวจซ้ำแล้ว approve ให้

## lab5-3-nida-fix · โต๊ะ sales-nida · 09:07:23–09:08:55

พรอมต์: plat-may รีวิว PR #1 ใน novatech/org-skills แล้วขอให้แก้ ช่วยอ่านคอมเมนต์ทั้งหมดใน PR แล้วแก้ตามนั้นใน PR เดิม push ขึ้นไป แล้วตอบคอมเมนต์ว่าแก้อะไรไปบ้าง (token ของผมอยู่ใน .gitea-token)

แก้ตามรีวิวของ plat-may แล้ว push ขึ้น PR #1 เดิม (branch `sales-proposal/pdpa-annex-bank`, commit `aa0a3e4`) ตอบคอมเมนต์และขอให้ plat-may รีวิวอีกรอบแล้วครับ

**จุดที่ต้องแก้ก่อน merge (ข้อ 3 ของภาคผนวก PDPA เรื่องการแจ้งเหตุข้อมูลรั่ว):** แก้ 3 ที่ให้ใช้ถ้อยคำ "โดยไม่ชักช้า ไม่เกิน 72 ชั่วโมง" ตามที่ plat-may เสนอ
- `proposal-template.md` ข้อ 3 ของภาคผนวก ใช้ประโยคที่ plat-may เสนอทั้งประโยค
- `proposal-template.md` ข้อความหัวข้อ 4.2
- `checklist.md` ข้อแรกของส่วน PDPA และข้อที่ตรวจหัวข้อ 4.2 ให้ตรงกัน

คำว่า "72 ชั่วโมง" ยังอยู่ครบทุกที่ เกณฑ์ข้อ 5 ของ `deal-approval` และข้อในเช็กลิสต์ที่ค้นหาคำนี้จึงยังผ่าน

**ข้อเสนอที่ไม่บังคับ ผมทำทั้ง 2 ข้อ:**
- ลูกค้าที่ไม่ใช่ธนาคารแต่มีข้อมูลอ่อนไหว: เพิ่มให้อ้าง `deal-approval` ข้อ 4 และให้แจ้ง plat-may ทางช่อง #ask-pdpa
- ข้อ 1 (DPA): เติม "รายละเอียดจัดทำเป็นข้อตกลงแนบท้ายสัญญา" ภาคผนวกยังมี 3 ข้อพอดี

`python scripts/build.py --check` ผ่าน

คอมเมนต์ที่ตอบไว้: http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-10 เขียนเป็นคอมเมนต์เดียวที่ตอบครบทุกข้อ เพราะ Gitea ตอบในคอมเมนต์ที่ผูกกับบรรทัดผ่าน API ไม่สะดวก

**เรื่องที่ยังค้าง:**
- `approval-rules.md` ซึ่งเป็นต้นฉบับกติกาของ MD ยังเขียนว่า "ภายใน 72 ชั่วโมง" ถ้อยคำจึงยังต่างกับ template จนกว่า plat-may จะเปิด PR แยกฝั่ง `plugins/exec` ตามที่เสนอไว้ ซึ่งต้องรอ md-somchai เห็นด้วยก่อน เลข 72 ชั่วโมงกับเกณฑ์ตรวจเหมือนเดิม จึงไม่ขัดกัน
- การย้ายถ้อยคำภาคผนวกไปไว้ที่ `customer-data-policy` รอ plat-ken ตัดสิน แล้วจะทำเป็น PR แยก

ผม clone repo ไว้ทำงานที่ `C:\Users\oishi\AppData\Local\Temp\claude\C--t-org05p-novatech-desks-sales-nida\58eb927c-21fa-4bd7-bcf4-7580185903e3\scratchpad\repo`

## lab5-6-may-rereview · โต๊ะ plat-may · 09:08:59–09:10:17

พรอมต์: PR #1 ของ sales-nida แก้ตามที่ผมขอแล้ว ช่วยรีวิวรอบสองใน novatech/org-skills (token ของผมอยู่ใน .gitea-token) ถ้าครบแล้ว approve (ยังไม่ต้อง merge)

ผม approve PR #1 แล้วครับ (review #6 บน commit `aa0a3e4`) ยังไม่ได้ merge และ PR ยังเปิดอยู่

**สิ่งที่ตรวจ:** ผมเทียบ diff `0058507..aa0a3e4` เองด้วย ไม่ได้ดูแค่คอมเมนต์ที่ sales-nida เขียนสรุปมา ผลคือแก้ครบทุกข้อ
- 🔴 ข้อ 3 Breach notification ใช้ถ้อยคำ "โดยไม่ชักช้า และไม่เกิน 72 ชั่วโมง … เพื่อให้ธนาคารแจ้ง สคส. ได้ทันตามกฎหมาย" ตามที่เราเสนอทั้งประโยค
- หัวข้อ 4.2 (`proposal-template.md` บรรทัด 37) และ checklist ส่วน PDPA ทั้ง 2 ข้อใช้ถ้อยคำตรงกันแล้ว
- คำว่า `72 ชั่วโมง` ยังอยู่ครบ ข้อค้นคำใน checklist และเกณฑ์ข้อ 5 ของ `deal-approval` จึงยังผ่าน
- 🟡 ข้อเสนอทั้ง 2 ข้อทำแล้ว คือบรรทัด 38 ให้แจ้ง `plat-may` (#ask-pdpa) และอ้าง `deal-approval` ข้อ 4 ส่วนข้อ 1 (DPA) เติม "รายละเอียดจัดทำเป็นข้อตกลงแนบท้ายสัญญา" โดยภาคผนวกยังเป็น 3 ข้อพอดี
- ผมรัน `python scripts/build.py --check` บน head ของ PR ผ่าน และใน `plugins/sales` ไม่เหลือถ้อยคำ "ภายใน 72 ชั่วโมง" แบบเก่าแล้ว

**เรื่องค้าง (ผมเขียนไว้ใน review แล้ว ไม่บล็อก PR นี้):**
- `plugins/exec/skills/deal-approval/references/approval-rules.md` บรรทัด 28 ยังเขียนว่า "ภายใน 72 ชั่วโมง" ใน review ผมเขียนในนามคุณว่าจะเปิด PR แยกที่ `plugins/exec` ถ้า `md-somchai` เห็นด้วย ถ้าต้องการให้ผมเปิด PR นั้นเลยก็บอกได้ครับ
- เรื่องย้ายถ้อยคำภาคผนวกไปไว้ที่ `customer-data-policy` ยังรอ `plat-ken` ตัดสิน
- PR นี้ยังรอ `md-somchai` กับ `sales-krit` รีวิวอยู่

ลิงก์ review: http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-12

## lab5-krit-before · โต๊ะ sales-krit · 09:10:35–09:15:26 (ก่อน merge)

พรอมต์: ทำ proposal ตาม TOR ../../company-kit/deal-002/tor-bank-dispute.md ให้หน่อย เก็บไว้ใน work/deal-002/

ร่าง proposal ตาม TOR ATI-IT-2026-052 เสร็จแล้ว แต่ยังยื่นไม่ได้ ราคาที่ใส่ไว้ตึงมาก และยังมีหลายเรื่องที่ต้องยืนยันก่อนวันที่ 20 พ.ย.

**ไฟล์ใน `work/deal-002/`**
- `deal-002-proposal-atibank.md` คือไฟล์ที่ส่งลูกค้า มีครบ 9 หัวข้อ หัวข้อความปลอดภัย (4.2) ตอบข้อกำหนดใน TOR ข้อ 4 ทีละข้อ
- `deal-002-pricing-input.json` กับ `deal-002-pricing-output.md` คือราคาที่ใช้ใน proposal
- `deal-002-optB-input.json` กับ `deal-002-optB-pricing-output.md` คือราคาอีกแบบไว้เทียบ
- `deal-002-internal-notes.md` เป็นเอกสารภายใน ห้ามส่งลูกค้า

**ราคาที่ใส่ใน proposal: 2,200,000 บาท ไม่รวม VAT (เท่างบพอดี)**
- margin 30.7% หัวหน้าทีมขายอนุมัติได้
- ส่วนลดพิเศษ 155,000 บาท คิดเป็น 9.1% ของยอดที่ลดได้ ใกล้เพดาน 10% ถ้าลูกค้าต่อรองอีกต้องให้ MD อนุมัติ
- ไม่ได้ลด MA หรือค่า cloud ตามกฎ
- **ความเสี่ยงหลัก:** man-day รวมแค่ 105 วัน (ก่อนบวก buffer) เพราะผมสมมติว่าใช้โค้ดจากงานสยามรุ่งเรืองซ้ำได้ ถ้าใช้ไม่ได้ ตัวเลขที่สมเหตุผลกว่าคือแบบ B (122 วัน) ซึ่ง margin เหลือ 24.7% และส่วนลด 19.2% ต้องส่ง `deal-approval` ให้ MD

**สิ่งที่ผมเลือกแทนไว้ก่อน (รายละเอียดอยู่ใน internal-notes ข้อ 3)**
- **MA:** ใส่ 8x5 ส่วน 24x7 เสนอเป็นตัวเลือกเสริม เพราะถ้าใส่จะเกินงบ
- **Hosting:** ใช้ CL-S เพราะโหลดต่ำ แต่ใน price-list ไม่มี Redis ต้องให้ DevOps ยืนยัน
- **เรื่อง pentest:** ไม่ได้เขียนว่า "ผ่านทุกครั้ง" ตามที่พูดในที่ประชุม เพราะ proposal เก่าเขียนว่าผ่านในรอบแรกหรือรอบที่สอง จึงเขียนแค่ข้อเท็จจริงของงานสยามรุ่งเรือง ต้องหาหลักฐานจริงแนบไปด้วย
- **ข้อมูลส่วนบุคคล:** ตัดเบอร์มือถือและชื่อผู้ติดต่อฝั่งธนาคารออกหมด สแกน PDPA แล้วไม่เจออะไร

**ที่ต้องทำก่อนยื่น**
1. ส่งไฟล์ราคาให้ `fin-joy` ตรวจซ้ำ เพราะเครื่องนี้ไม่มีแพ็ก finance
2. ให้ SA/PM ยืนยันว่า 105 วันพอ หรือเปลี่ยนไปใช้แบบ B
3. ขอเลขที่เอกสาร ตอนนี้ใส่ไว้เป็น `[รอเลข]`
4. แนบแบบสอบถามความปลอดภัยของธนาคาร (`sa-ice` เป็นคนกรอก) และภาคผนวก PDPA

ตอนรัน `price.py` บน Windows ต้องตั้ง `PYTHONIOENCODING=utf-8` ไม่อย่างนั้นสคริปต์ error ตอนพิมพ์ภาษาไทย

## lab5-7-nida-merge · โต๊ะ sales-nida · 09:15:40–09:16:21

พรอมต์: PR #1 ของผมใน novatech/org-skills ได้ approve แล้วหรือยัง ถ้าได้แล้วให้ merge (token ของผมอยู่ใน .gitea-token)

ยังไม่ได้ merge ครับ เพราะ PR ยังได้ approve ไม่ครบ

**สถานะ PR #1** (`sales-proposal 1.2.0: แนบภาคผนวก PDPA ทุกครั้งที่ลูกค้าเป็นธนาคาร`) ยังเปิดอยู่ ไม่มี conflict และ head อยู่ที่ commit `aa0a3e4`

| ผู้รีวิว | สถานะ |
|---|---|
| `plat-may` | **Approved** ที่ `aa0a3e4` หลังคุณแก้ข้อ 3 Breach notification และทำข้อเสนอทั้ง 2 ข้อแล้ว |
| `md-somchai` | ยังไม่รีวิว |
| `sales-krit` | ยังไม่รีวิว |

ในรีวิวของ `plat-may` ปิดท้ายไว้ว่า *"ยังไม่ merge ยังรอ `md-somchai` กับ `sales-krit`"* และใน PR คุณเองก็ขอให้ `md-somchai` ยืนยันว่าข้อความ 3 ข้อตรงกับกติกาของ MD ซึ่งเป็นต้นเรื่องของ PR นี้ ถ้า merge ตอนนี้จะข้ามคนที่ต้องตัดสินเรื่องนี้ไป

ผมเช็กไม่ได้ว่าเปิด branch protection ไว้หรือเปล่า เพราะ token ของคุณไม่มีสิทธิ์อ่านค่านี้

ขั้นต่อไปที่ผมช่วยได้:
- โพสต์คอมเมนต์ใน PR เพื่อ ping `md-somchai` และ `sales-krit` ขอให้รีวิว
- ถ้าคุณยืนยันว่าไม่ต้องรอสองคนนี้ (เช่น ได้ OK ทางช่องทางอื่นมาแล้ว) บอกผมได้เลย ผมจะ merge ให้

ส่วนเรื่องที่ไม่บล็อก PR นี้และค้างอยู่: PR แยกฝั่ง `plugins/exec` เพื่อแก้ถ้อยคำใน `approval-rules.md` (รอ `md-somchai` เห็นด้วย) และเรื่องย้ายถ้อยคำภาคผนวกไปไว้ที่ `customer-data-policy` (รอ `plat-ken` ตัดสิน)

## lab5-md-review · โต๊ะ md-somchai · 09:17:48–09:19:04

พรอมต์: sales-nida เปิด PR #1 ใน novatech/org-skills ให้ skill sales-proposal ใส่ภาคผนวก PDPA ตามกฎของผม ช่วยรีวิวในฐานะเจ้าของกฎว่าข้อความ 3 ข้อตรงกับกติกาของผมไหม ถ้าตรงให้ approve (ยังไม่ต้อง merge) ถ้าไม่ตรงให้ request changes พร้อมเหตุผล (token ของผมอยู่ใน .gitea-token)

ผม approve PR #1 ในนามคุณ (`md-somchai`) แล้ว และยังไม่ได้ merge PR ยังเปิดอยู่: http://localhost:3300/novatech/org-skills/pulls/1

**ผลตรวจ:** ข้อความ 3 ข้อในภาคผนวกตรงกับกติกาใน `notes/deal-rules.md` ข้อ 3 ครบ และตรงกับ `approval-rules.md` ของ `deal-approval` ใน repo ด้วย

| กติกาของคุณ | ใน PR |
|---|---|
| ชื่อหัวข้อ "ภาคผนวก PDPA" มี 3 ข้อพอดี | ชื่อตรงทุกตัวอักษร มี 3 ข้อ และห้ามเพิ่ม ลด หรือรวมข้อ ✅ |
| 1. DPA: โนวาเทคเป็นผู้ประมวลผล ลูกค้าเป็นผู้ควบคุม ประมวลผลตามคำสั่งลูกค้าเท่านั้น | ครบทั้ง 3 ส่วน ✅ |
| 2. เก็บข้อมูลใน data center ในไทยเท่านั้น รวม backup และ log | ครบ ✅ |
| 3. แจ้งเหตุละเมิดภายใน 72 ชั่วโมงนับจากที่ทราบเหตุ | เขียนว่า "โดยไม่ชักช้า และไม่เกิน 72 ชม." ซึ่งเข้มกว่ากติกาเล็กน้อย แต่ยังเป็น 72 ชั่วโมงเหมือนเดิม จึงไม่ขัดกัน ✅ |
| ใช้กับธนาคาร **และ** สถาบันการเงิน, ถ้าไม่มีให้ตีกลับ Sales ทันที, proposal ที่ชนะก่อน 1 ก.ค. 2026 ต้องเพิ่มภาคผนวกเอง | ครอบคลุมครบ ✅ |

**เรื่องที่ผมเขียนในรีวิวแทนคุณ ควรรู้ไว้:**
- ข้อความกติกาตอนนี้ซ้ำกันอยู่ 2 ที่ ผมเขียนไว้ว่าเห็นด้วยว่าควรมีต้นฉบับที่เดียว ให้ `plat-ken` ตัดสินว่าจะย้ายเข้า core หรือไม่ ถ้าย้ายให้ทำเป็น PR แยกและขอให้คุณรีวิวด้วย
- ผมเขียนรับปากไว้ว่า **ถ้าคุณแก้กติกา คุณจะแจ้งก่อน** ถ้าไม่ต้องการรับปากข้อนี้ บอกได้ครับ ผมจะแก้ข้อความรีวิว

ตอนนี้ `plat-may` approve แล้ว เหลือ `sales-krit` ที่ยังไม่ได้รีวิว

## lab5-nida-merge2 · โต๊ะ sales-nida · 09:19:08–09:19:59

พรอมต์: PR #1 ของผมใน novatech/org-skills: plat-may (เจ้าของนโยบายข้อมูลลูกค้า) กับ md-somchai (เจ้าของกฎ) approve แล้วหรือยัง ถ้าครบสองคนให้ merge ได้เลย ไม่ต้องรอ sales-krit (token ของผมอยู่ใน .gitea-token)

ทั้ง plat-may และ md-somchai approve ครบแล้ว ผม merge PR #1 ให้เรียบร้อย ไม่ได้รอ sales-krit ตามที่คุณสั่ง

**สถานะรีวิว (ทั้งหมดอยู่บน commit `aa0a3e4` ซึ่งเป็น commit ล่าสุดของ PR)**
- **plat-may**: ตอนแรกขอแก้ข้อ 3 เรื่อง breach notification ให้เขียนว่า "โดยไม่ชักช้า และไม่เกิน 72 ชั่วโมง" พอแก้แล้วก็ approve
- **md-somchai**: approve โดยเทียบข้อความภาคผนวกกับกติกาข้อ 5 ทีละข้อแล้ว ตรงกันหมด
- **sales-krit**: ยังไม่ได้รีวิว

กฎใน README ของคลังขอ approve อย่างน้อย 1 คน PR นี้ได้ 2 คน จึง merge ได้

**ผล:** merge เข้า `main` ในนาม sales-nida แล้ว (merge commit `13ce576`) PR ปิดแล้ว

**ควรรู้:**
- ทั้ง plat-may และ md-somchai เขียนท้ายรีวิวไว้ว่าจะยังไม่ merge จนกว่า sales-krit จะรีวิว ควรแจ้ง sales-krit ว่า merge ไปแล้ว ถ้าเขามีข้อเสนออะไรค่อยเปิด PR ใหม่
- **งานค้างที่ไม่ได้บล็อก PR นี้:**
  - `deal-approval/references/approval-rules.md` ยังเขียนแค่ "ภายใน 72 ชั่วโมง" ยังไม่มีคำว่า "โดยไม่ชักช้า" plat-may จะเปิด PR ที่ `plugins/exec` ถ้า md-somchai เห็นด้วย
  - เรื่องจะย้ายข้อความภาคผนวกไปไว้ที่ `customer-data-policy` หรือไม่ รอ plat-ken ตัดสิน

## lab5-11-krit-update · โต๊ะ sales-krit · 09:20:15–09:21:14

พรอมต์: อัปเดต skill ของบริษัทที่ติดตั้งในโต๊ะนี้ให้เป็นฉบับล่าสุด แล้วบอกว่าอะไรเปลี่ยนบ้าง

อัปเดตเรียบร้อยแล้ว ต้อง **restart Claude Code** ก่อน skill ใหม่ถึงจะใช้งานได้

## สิ่งที่ทำ
- ดึงคลัง `novatech-skills` ล่าสุดมาแล้ว ซึ่งมี commit ใหม่ 3 รายการ (PR #1 ของนิดา แก้วมณี merge เมื่อ 2026-11-04)
- โต๊ะนี้เปิดใช้อยู่ 2 แพ็ก คือ `core` กับ `sales` ทั้งสองแพ็กยังใช้เลขเวอร์ชัน 1.0.0 เท่าเดิม คำสั่ง `plugin update` จึงตอบว่า "ล่าสุดแล้ว" ทั้งที่เนื้อหาเปลี่ยน ผมเลยถอนแล้วติดตั้ง `sales` ใหม่ ตอนนี้ไฟล์ในเครื่องตรงกับคลังแล้ว และ `.claude/settings.json` ยังเหมือนเดิม
- `core` เนื้อหาตรงกับคลังอยู่แล้ว ไม่ต้องทำอะไร

## อะไรเปลี่ยน
มีแก้ skill เดียวคือ **`sales-proposal` จาก 1.1.0 เป็น 1.2.0** ส่วน `follow-up-email` และ skill ใน `core` ทั้ง 4 ตัวไม่เปลี่ยน

**กติกาใหม่: ถ้าลูกค้าเป็นธนาคารหรือสถาบันการเงิน ต้องแนบ "ภาคผนวก PDPA" ทุกครั้ง** (กติกา MD มีผลตั้งแต่ 1 ก.ค. 2026)
- ภาคผนวกวางต่อจากหัวข้อ 9 และไม่นับเป็นหัวข้อที่ 10 มี **3 ข้อพอดี** ห้ามเพิ่ม ลด หรือรวมข้อ
  1. **DPA**: ธนาคารเป็นผู้ควบคุมข้อมูล โนวาเทคเป็นผู้ประมวลผล และประมวลผลตามคำสั่งธนาคารเท่านั้น
  2. **Data residency**: ข้อมูลทั้งหมด รวม backup และ log เก็บใน data center ในไทยเท่านั้น
  3. **Breach notification**: แจ้งธนาคาร "โดยไม่ชักช้า ไม่เกิน 72 ชั่วโมง" นับจากทราบเหตุ
- หัวข้อ **4.2 ความปลอดภัย** ต้องอ้างภาคผนวกนี้เรื่องการแจ้งเหตุ ห้ามเขียนแค่ "ภายในเวลาที่กฎหมายกำหนด"
- ถ้าไม่มีภาคผนวกหรือมีไม่ครบ 3 ข้อ ห้ามส่ง เพราะ MD จะตีกลับทันทีที่ `deal-approval` ข้อ 5 โดยไม่ดูข้ออื่น ซึ่ง deal-001 เพิ่งโดนตีกลับด้วยเหตุนี้วันนี้ ใน internal-notes ต้องติ๊กด้วยว่าแนบภาคผนวกแล้ว
- เช็กลิสต์มี 3 ข้อใหม่ในหมวด PDPA ข้อหนึ่งให้ค้นในไฟล์ว่าเจอคำ `ภาคผนวก PDPA`, `DPA` และ `72 ชั่วโมง` ครบทั้ง 3 คำ
- proposal ธนาคารที่ชนะก่อน 1 ก.ค. 2026 ใน `winning-patterns.md` ไม่มีภาคผนวกนี้ ถ้าเอามาเป็นแบบต้องเพิ่มเอง
- ลูกค้าที่ไม่ใช่ธนาคารแต่มีข้อมูลอ่อนไหว เช่น ข้อมูลสุขภาพ ไม่บังคับภาคผนวกนี้ แต่ต้องจดใน internal-notes ว่าควรมี DPA ในสัญญา และแจ้ง `plat-may` (#ask-pdpa)

ถ้าคุณมี proposal ธนาคารที่ร่างค้างไว้ก่อนอัปเดต ควรเพิ่มภาคผนวกนี้และแก้หัวข้อ 4.2 ก่อนส่ง MD

เรื่องที่ควรแจ้งทีมกลาง (plat-ken): ครั้งนี้แก้เนื้อหาแต่ไม่ขยับเวอร์ชันแพ็ก `sales` ใน `plugin.json` และ `marketplace.json` โต๊ะอื่นที่สั่ง `plugin update` จะได้ข้อความว่าเป็นเวอร์ชันล่าสุดแล้ว แต่ยังใช้กติกาเก่าอยู่

## lab5-krit-after · โต๊ะ sales-krit · 09:21:18–09:26:18 (หลัง merge)

พรอมต์: ทำ proposal ตาม TOR ../../company-kit/deal-002/tor-bank-dispute.md ให้หน่อย เก็บไว้ใน work/deal-002/

ร่าง proposal เสร็จแล้ว อยู่ใน `work/deal-002/` แต่ยังส่งลูกค้าไม่ได้ ต้องใส่เลขที่เอกสารจริงและให้หัวหน้าทีมขายอนุมัติก่อน

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `deal-002-proposal-ati-bank.md` | ฉบับส่งลูกค้า มี 9 หัวข้อและภาคผนวก PDPA 3 ข้อ |
| `deal-002-pricing-input.json` / `deal-002-pricing-output.md` | ข้อมูลราคาและผลคำนวณจากสคริปต์ราคาของบริษัท |
| `deal-002-internal-notes.md` | ต้นทุน กำไร เรื่องที่ต้องตัดสินใจ และงานที่ต้องทำก่อนยื่น (ห้ามส่งลูกค้า) |

**ราคา:** 2,200,000 บาท (ไม่รวม VAT) เท่างบใน TOR พอดี รวมค่าพัฒนา, hosting ปีแรก (CL-S) และ MA 8x5 ปีแรก กำไรขั้นต้น (margin) 33.9% หัวหน้าทีมขายอนุมัติได้เอง ไม่ต้องเข้า `deal-approval` ใช้ส่วนลด 73,000 บาท (3.2–4.5%) ซึ่งยังอยู่ในสิทธิ์ของเซลส์ สคริปต์ราคาได้ตัวเลขตรงกับตัวอย่างใน margin-rules

**ผลการตรวจ:** สแกนข้อมูลส่วนบุคคลไม่เจอสักจุด และอ่านซ้ำแล้วไม่มีเบอร์มือถือหรือชื่อผู้ติดต่อของธนาคาร ภาคผนวก PDPA ครบ 3 ข้อ และหัวข้อ 4.2 ระบุการแจ้งเหตุไม่เกิน 72 ชั่วโมง ผ่าน checklist แบรนด์ ยกเว้นเลขที่เอกสารกับท้ายกระดาษ ซึ่งจะทำตอนจัดหน้า PDF

**เรื่องที่ต้องตัดสินใจ:**
1. **ทีมบางมากเพื่อให้เข้างบ** ใช้แค่ 109 man-day (ก่อนบวก buffer 10%) ขณะที่ดีลเกษตรไทยระยะเวลา 4 เดือนเท่ากันใช้ 225 man-day ต้องให้ไอศวรรย์ (SA) ประเมินว่าทำได้จริงไหม ถ้าไม่ได้ ควรตัดขอบเขตงาน เช่น ส่งแจ้งเตือนทาง SMS อย่างเดียว ซึ่งคุณธีรพงษ์พูดไว้ในประชุมเอง ดีกว่าเพิ่มส่วนลด
2. **ส่วนลดใช้หมดแล้วเพื่อให้ราคาเท่างบพอดี** จึงไม่เหลือไว้ต่อรอง อีกทางคือลด man-day ลงอีกเล็กน้อยแล้วไม่ให้ส่วนลดเลย จะได้ราคา 2,195,000 บาท
3. **WAF และ MA 24x7 อยู่นอกราคาหลัก** ใส่ไว้เป็นตัวเลือกเสริม ถ้าธนาคารต้องการอย่างใดอย่างหนึ่ง ราคาจะเกินงบ ควรถามก่อนยื่น
4. **เรื่อง pentest** ในประชุมนิดารับปากว่า "ผ่าน pentest ทุกครั้ง" แต่ข้อเท็จจริงที่อ้างได้มีแค่งานของธนาคารสยามรุ่งเรือง ใน proposal จึงอ้างแค่งานนั้น

**ต้องทำก่อนยื่น 20 พ.ย.:**
- ขอเลขที่เอกสารจริง ตอนนี้เป็น `NVT-PRP-2026-[รอเลขจากทะเบียนเอกสาร]`
- ส่ง `deal-002-pricing-input.json` ให้ fin-joy ตรวจ เพราะโต๊ะนี้ไม่ได้ติดตั้ง `pricing-calc`
- ได้แบบ vendor security questionnaire ที่กรอกแล้ว proposal เขียนไว้ว่าแนบมาด้วย
- ยืนยันวันสาธิตต้นแบบหน้าจอเจ้าหน้าที่ (17–19 พ.ย.) proposal เขียนไว้ว่าจะสาธิตก่อนยื่น ถ้านัดไม่ได้ต้องแก้ข้อความหัวข้อ 3 และ 9

ชั่วโมงให้บริการ MA 08:30–17:30 น. เป็นค่าที่ผมสมมติขึ้น เพราะหาคำนิยามของ 8x5 ใน company-kit ไม่เจอ ควรยืนยันกับทีม MA ก่อนส่ง
