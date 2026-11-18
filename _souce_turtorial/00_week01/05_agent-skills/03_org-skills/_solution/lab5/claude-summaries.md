# LAB 5 · ทุกขั้นของ PR (รันจริง)

## sales-nida เปิด PR #1 · 116 วินาที · 12 คำสั่ง

PR เปิดแล้วครับ: http://localhost:3300/novatech/org-skills/pulls/1 (branch `sales/proposal-pdpa-annex-bank` → `main`)

**สิ่งที่แก้ใน `sales-proposal` (เวอร์ชัน 1.1.0 → 1.2.0)**
- **`references/proposal-template.md`**: เพิ่มหัวข้อ "ภาคผนวก PDPA" ที่ต้องมีทุกครั้งเมื่อลูกค้าเป็นธนาคารหรือสถาบันการเงิน วางต่อจากหัวข้อ 9 โดยไม่ยุ่งกับลำดับ 9 หัวข้อเดิม ในนั้นมีข้อความพร้อมใช้ 3 ข้อพอดี:
  1. DPA: ธนาคารเป็นผู้ควบคุมข้อมูล โนวาเทคเป็นผู้ประมวลผล และประมวลผลตามคำสั่งธนาคารเท่านั้น
  2. Data residency: ข้อมูลส่วนบุคคลทั้งหมด รวม backup และ log เก็บใน data center ในไทยเท่านั้น
  3. แจ้งเหตุละเมิดภายใน 72 ชั่วโมงนับจากทราบเหตุ

  ผมเขียนกำกับไว้ด้วยว่ามีแค่ในหัวข้อ 4.2 ไม่นับ ซึ่งเป็นสาเหตุที่ deal-001 ถูกตีกลับ
- **`SKILL.md`**: ขั้นที่ 3 สั่งให้ใส่ภาคผนวกนี้ทุกครั้งที่ลูกค้าเป็นธนาคาร และเตือนว่า proposal ที่ชนะก่อน 1 ก.ค. 2026 ยังไม่มีภาคผนวกนี้ ถ้าเอามาเป็นแบบต้องเพิ่มเอง เพิ่มเรื่องนี้ในหมวด "กติกาที่ห้ามพลาด" และใน description ด้วย
- **`references/checklist.md`**: เพิ่มข้อตรวจภาคผนวก PDPA

ข้อความ 3 ข้อผมเอามาจากกติกาของ MD ใน `deal-approval/references/approval-rules.md` จึงตรงกับเกณฑ์ข้อ 5 ที่ MD ใช้ตรวจ

**ตรวจแล้วผ่านทั้งหมด:** `python scripts/build.py --check`, `claude plugin validate .` และ `claude plugin validate plugins/sales`

**เรื่องที่ควรรู้**
- **ผู้รีวิว:** CODEOWNER ของ `plugins/sales` คือคุณเอง Gitea จึงไม่ได้ขอรีวิวจากใครให้อัตโนมัติ แต่ PR ต้องได้ approve อย่างน้อย 1 คนก่อน merge ผมเลยขอรีวิวจาก `sales-krit` (ทีมขาย) และ `exec-ploy` (CODEOWNER ของ exec) ให้แล้ว ใน PR ยังขอให้ MD ยืนยันว่าข้อความภาคผนวกตรงตามที่ต้องการ
- **กติกาเดียวกันอยู่ 2 ที่:** แพ็ก sales ไม่ได้ติดตั้ง exec จึงอ่านกติกาของ MD ตอนทำงานไม่ได้ ผมเลยต้องคัดลอกข้อความมาไว้ใน sales และใส่หมายเหตุว่าถ้า MD แก้กติกาต้องมาแก้ตรงนี้ด้วย ระยะยาวควรย้ายกติกานี้ไปไว้ใน core (`customer-data-policy`) ให้ทั้งสอง skill อ้างที่เดียว ผมเสนอเรื่องนี้ไว้ใน PR แล้วแต่ยังไม่ได้ทำ เพราะเป็นของ `plat-ken`/`plat-may`
- PR นี้แก้แค่ skill ยังไม่ได้แก้ proposal ของ deal-001 ที่ `work/deal-001-proposal-nakhonluang-queue.md` ต้องส่งกลับให้ MD ภายใน 10 พ.ย. และยังต้องแก้โน้ตภายในที่เขียนว่า "ไม่ต้องเข้า MD" ด้วย ถ้าต้องการผมเพิ่มภาคผนวกให้ต่อได้เลย

## plat-may รีวิวรอบ 1 · 110 วินาที · 8 คำสั่ง

I posted a **Request changes** review on PR #1 (http://localhost:3300/novatech/org-skills/pulls/1), plus one inline comment on `proposal-template.md` line 37. I did not merge.

**What's already good:** the 3 annex items match the MD's rules in `approval-rules.md` word for word. I also ran `build.py --check` and it passes.

**Must fix before I'll approve:**
1. **Sensitive data:** the template says that for a non-bank client with health data, it's enough to note a DPA in internal-notes. That conflicts with policy v1.4. Sensitive data under section 26 (health, religion, biometrics) has to go to `plat-may` (you) before the proposal is sent. I gave them replacement wording.
2. **Duplicated rule:** this PR copies the MD's rule into a second skill. Inside `sales-proposal` it's also written out three times (SKILL.md, checklist, template). The README says a rule copied into two or more skills belongs in `core`. The author asked you whether to move it, and I answered yes, in this PR. The suggested split:
   - `customer-data-policy` gets a new file, `references/bank-pdpa-annex.md`.
   - `sales-proposal` and `deal-approval` both point to that file instead of copying the text.
   - The MD still owns the approval criteria; you own the PDPA wording.

   I also wrote that if deal-001 has to be resent before this merges, they can paste the 3 items from `approval-rules.md` into the proposal now. Sales isn't blocked.

**Noted, not blocking:**
- **72 hours:** under PDPA section 37(4), the bank itself has 72 hours from learning of a breach to notify the PDPC. If we, as processor, take the full 72 hours, the bank has no time left. I wrote that you'll raise this with the MD, and that the skill keeps the MD's wording until then.
- **Logs in Thailand:** the annex promises all logs stay in Thailand, but we also sell `LIC-APM` (monitoring/log management). Someone needs to confirm with `ops-art` that its data is stored in a Thai region before we promise this to clients.

**What I committed you to in the comment (not done yet):**
- You'll open a PR on the `core` side to add `bank-pdpa-annex.md`.
- `exec-ploy` will need to update `deal-approval` to point to the same file.

I can open the `core` PR now if you'd like.

## sales-nida แก้ตามรีวิว · 131 วินาที · 14 คำสั่ง

ผมแก้ PR #1 ตามรีวิวของ plat-may ครบทั้ง 2 ข้อ push ขึ้น branch เดิม (`sales/proposal-pdpa-annex-bank`, commit `49ebcd9`) และตอบคอมเมนต์ใน PR แล้ว: http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-8

**ข้อ 1: ข้อมูลอ่อนไหว ม.26 ต้องส่งให้ plat-may** (คอมเมนต์ในบรรทัดก็พูดเรื่องเดียวกัน)
- `proposal-template.md`: เปลี่ยนบรรทัดท้ายเป็นข้อความตามที่ plat-may เสนอ คือ "ต้องส่งให้ `plat-may` ดูก่อนส่ง proposal" แล้วค่อยจด DPA ใน internal-notes
- `SKILL.md` ขั้น 3: เพิ่มบรรทัดเดียวกันนี้ไว้ในขั้นตอนหลักด้วย

**ข้อ 2: เลิกเก็บสำเนากติกา ให้อ้างจาก core แทน**
- ลบข้อความภาคผนวก 3 ข้อที่คัดลอกมาออกจาก template, SKILL.md และ checklist แล้วให้อ้าง `customer-data-policy` → `references/bank-pdpa-annex.md` แทน ถ้าหาไฟล์นั้นไม่เจอ skill จะสั่งให้หยุดแล้วถาม plat-may
- กติกาฝั่ง sales ยังอยู่ครบตามที่ plat-may บอกให้คงไว้ ได้แก่ บังคับเมื่อลูกค้าเป็นธนาคาร ใส่ต่อท้ายหัวข้อ 9 มีใน 4.2 อย่างเดียวไม่นับ 4.2 ห้ามขัดกับภาคผนวก และ proposal ที่ชนะก่อน 1 ก.ค. ยังไม่มีภาคผนวกนี้
- checklist เหลือ 1 บรรทัด: "มีภาคผนวก PDPA ครบตาม `customer-data-policy`"
- version ยังเป็น 1.2.0 เพราะ PR ยังไม่ได้ merge

`build.py --check` กับ `claude plugin validate` (ทั้งคลังและแพ็ก sales) ผ่านทั้งหมด ผมแก้คำอธิบาย PR ให้ตรงกับของใหม่ด้วย เพราะของเดิมยังบอกว่าคัดลอกข้อความ 3 ข้อมาเก็บไว้

**ข้อควรรู้**
- **ต้องรอ PR ฝั่ง core ก่อน merge:** ไฟล์ `bank-pdpa-annex.md` ที่ skill อ้างถึงยังไม่มีใน `main` ต้องรอ plat-may เปิด PR ฝั่ง core ผมเขียนในคอมเมนต์แล้วว่าควร merge PR core ก่อนหรือพร้อมกับ PR นี้
- **คอมเมนต์ในบรรทัดยังไม่ได้ตอบในเธรด:** API ของ Gitea ตอบในเธรดนั้นตรง ๆ ไม่ได้ ผมเลยรวมคำตอบไว้ในคอมเมนต์หลักแทน ถ้าอยากให้เธรดนั้นปิดด้วย ต้องกด resolve เองในหน้าเว็บ
- **ข้อสังเกตที่ไม่ block มีงานรอคุณ:** เรื่อง 72 ชม. ผมไม่ได้แก้ตามที่ plat-may ขอ แต่ในคอมเมนต์ผมรับปากในนามคุณไว้ 2 เรื่อง คือจะยืนยันกับ ops-art ว่า APM/log เก็บข้อมูลในไทย และจะส่ง deal-001 รอบใหม่โดยใส่ข้อความ 3 ข้อจาก `approval-rules.md` ไปก่อน

## plat-may เปิด PR #2 (core) · 166 วินาที · 15 คำสั่ง

I opened the core PR: **#2** — http://localhost:3300/novatech/org-skills/pulls/2 (branch `core/customer-data-policy-bank-pdpa-annex` → `main`). `build.py --check`, `claude plugin validate .` and `claude plugin validate plugins/core` all pass.

**What changed (`customer-data-policy` 1.0.0 → 1.1.0)**
- **New file `references/bank-pdpa-annex.md`.** This is now the only place in the repo that holds this rule, and it's the same path PR #1 already points to. It contains:
  - The 3 items as a table. They match `approval-rules.md` in `deal-approval` word for word, including the 72 hours, which I didn't change.
  - Annex wording to use as-is, where only `<ชื่อลูกค้า>` gets replaced.
  - The source (MD's deal-rules v2026.3) and who owns what: MD owns the rule, you maintain the wording.
  - A case for clients that aren't banks but hold sensitive data under section 26: send it to you before it goes out.
  - An internal-only section that stays out of client documents. It links item 3 to the rule that you must be told within 1 hour, and says log/`LIC-APM` storage must be confirmed with `ops-art` before signing. It also says to keep the 72 hours until MD changes the rule.
- **`doc-type-rules.md`:** the proposal row used to point to `deal-approval`. It now points to the new file.
- **`SKILL.md`:** step 3 now checks that bank documents have all 3 annex items and that they match the file (missing, incomplete or reworded = 🔴). The section on how other skills reference this one now says the annex wording lives only here.

**Review and merge**
- Reviewers: `plat-ken` was added automatically as CODEOWNER of core. I also requested `md-somchai` to confirm the wording.
- In the PR description I said #2 should be merged before or together with #1.
- `approval-rules.md` in `deal-approval` still has its own copy of the 3 items. The PR description asks `exec-ploy` to fix that in a separate PR; I didn't touch it because it isn't a core path.

I haven't commented on PR #1. Should I post a note there with the link to #2, so `sales-nida` knows the referenced file now exists?

## plat-ken รีวิว PR #2 · 289 วินาที · 14 คำสั่ง

ผมกด **Request changes** ที่ PR #2 แล้ว (PR ของ plat-may: `customer-data-policy` 1.0.0 → 1.1.0) ยังไม่ได้ approve หรือ merge
รีวิว: http://localhost:3300/novatech/org-skills/pulls/2 (มีความเห็นรวม 1 อัน กับคอมเมนต์ในบรรทัด 4 จุด)

**ส่วนที่ถูกต้องแล้ว**
- ข้อความภาคผนวก 3 ข้อ (DPA, data residency รวม backup/log, แจ้งเหตุ 72 ชม.) ตรงกับต้นฉบับของ MD ใน `md-somchai/notes/deal-rules.md` v2026.3 ข้อ 3
- `build.py --check` ผ่านบน commit 75d0471
- path ของไฟล์ใหม่ตรงกับที่ #1 อ้างไว้

**3 จุดที่ต้องแก้ก่อน approve** ทั้งสามจุดเป็นเรื่องที่ไฟล์นี้เขียนเกินต้นฉบับ ไฟล์นี้จะเป็นที่เดียวในคลังที่เก็บข้อความภาคผนวก เลยต้องตรงกับต้นฉบับ
1. **ขอบเขตกว้างเกินกฎ MD:** MD บังคับภาคผนวกเฉพาะ proposal ที่ส่งธนาคาร แต่ขั้น 3 ใน SKILL.md เขียนว่า "เอกสารถึงลูกค้าธนาคาร" ถ้าปล่อยไว้ ใบแจ้งหนี้ อีเมล หรือบันทึกประชุมที่ส่งธนาคารก็จะโดน 🔴 ไปด้วย
2. **ใส่ข้อบังคับในนาม MD ทั้งที่ MD ไม่ได้เขียน:** PR เขียนว่าลูกค้าที่ไม่ใช่ธนาคารแต่มีข้อมูลอ่อนไหว ม.26 "ต้องมี DPA ในสัญญา (MD นับในเกณฑ์ข้อ 4)" แต่ต้นฉบับของ MD ไม่ได้พูดถึงกรณีนี้เลย และสรุปเดิมใน `deal-approval` ใช้คำว่า "ควร" ผมขอให้กลับไปใช้ "ควร" หรือให้ MD ยืนยันก่อน
3. **จุดเริ่มนับ 72 ชม.:** PR เริ่มนับตอนแจ้ง plat-may ซึ่งอาจช้ากว่าตอนที่พนักงานคนแรกรู้เรื่องได้ถึง 1 ชม. ผมขอให้นับตั้งแต่พนักงานคนแรกพบเหตุ

ผมเสนออีก 2 เรื่องแต่ไม่บล็อกการ merge:
- ถ้าเนื้อหาครบ 3 ข้อแต่ใช้ถ้อยคำต่างจากแบบ ให้เป็น 🟡 แทน 🔴
- SKILL.md เขียนว่า `deal-approval` ใช้ไฟล์นี้อยู่แล้ว แต่จะจริงก็ต่อเมื่อ PR ของ exec-ploy merge

**ผลต่อ PR #1 (sales-proposal):** #1 อ้างไฟล์ที่มาจาก PR #2 จึงต้องรอให้ #2 merge ก่อน ผมยังไม่ได้แตะ #1 และไม่ได้ทำหน้าที่ CODEOWNER ฝั่ง sales แทน sales-nida ระหว่างนี้ deal-001 รอบใหม่ใช้ข้อความจาก `approval-rules.md` ไปก่อนได้ ถ้า plat-may แก้ครบ 3 จุดแล้ว บอกผมได้เลย ผมจะตรวจซ้ำแล้ว approve และ merge #2 ให้

## plat-may รีวิว PR #1 รอบ 2 · 82 วินาที · 8 คำสั่ง

ผม approve PR #1 แล้วครับ ยังไม่ได้ merge PR ยังเปิดอยู่ ลิงก์รีวิว: http://localhost:3300/novatech/org-skills/pulls/1#issuecomment-20

**ตรวจรอบสอง (commit `49ebcd9`)**
- **ข้อ 1 (ข้อมูลอ่อนไหว ม.26):** แก้ตามที่ขอแล้ว ตอนนี้เขียนว่า "ต้องส่งให้ `plat-may` ดูก่อนส่ง proposal" และให้จด DPA ไว้ใน internal-notes ทั้งใน `proposal-template.md` และขั้นที่ 3 ของ `SKILL.md`
- **ข้อ 2 (ไม่เก็บสำเนากติกาไว้หลายที่):** ข้อความภาคผนวก 3 ข้อถูกลบออกจากทั้ง template, checklist และ SKILL.md แล้ว ทุกจุดอ้างไปที่ `customer-data-policy/references/bank-pdpa-annex.md` แทน ค้นใน `sales-proposal` ก็ไม่เจอข้อความที่คัดลอกมาเหลืออยู่ กติกาที่เป็นของ proposal เองยังอยู่ครบ และ checklist เหลือบรรทัดเดียวตามที่ขอ

**ที่ตรวจเพิ่ม**
- รัน `python scripts/build.py --check` บน branch นี้ผ่าน
- path ที่ PR #1 อ้างถึงตรงกับไฟล์ใน PR #2 ฝั่ง core และสอง PR นี้ไม่ชนกัน
- เวอร์ชันขึ้นเป็น `1.2.0` แล้ว

**ก่อน merge:** ต้อง merge PR #2 (core) ก่อนหรือพร้อมกับ PR #1 ไม่อย่างนั้น `sales-proposal` จะอ้างไปที่ไฟล์ที่ยังไม่มีใน main ผมเขียนเรื่องนี้ไว้ในรีวิวแล้ว ส่วนเรื่อง 72 ชม. กับ log ของ `LIC-APM` ผมระบุในรีวิวว่าไม่ทำให้ PR นี้ติด และจะคุยกับ MD และ `ops-art` ต่อ

ครั้งแรกที่ส่งรีวิวล้มเพราะปัญหา encoding ตัวอักษร เลยไม่มีอะไรถูกโพสต์ ส่งรอบสองสำเร็จ จึงมีรีวิวนี้รายการเดียว

## sales-nida ขอ merge (ยังไม่ merge) · 55 วินาที · 8 คำสั่ง

ผมยังไม่ได้ merge PR #1 ครับ ตัว PR เองพร้อมแล้ว แต่ไฟล์ที่มันอ้างถึงยังไม่มีอยู่บน main

**สถานะ PR #1** (`sales-proposal 1.2.0: ใส่ภาคผนวก PDPA ...`)
- `plat-may` approve แล้วบน commit ล่าสุด `49ebcd9` และ approve นี้ยังมีผล
- ไม่มี conflict และ merge ได้ทางเทคนิค
- ยังไม่มีรีวิวจาก `sales-krit` และ `exec-ploy` ทั้งที่ขอไว้ ในเนื้อ PR ก็ขอให้ md-somchai / exec-ploy ยืนยันข้อความภาคผนวกด้วย

**เหตุที่ยังไม่ merge**
- PR #1 ให้ skill ไปอ่าน `plugins/core/skills/customer-data-policy/references/bank-pdpa-annex.md` แต่ไฟล์นี้มากับ PR #2 ของ `plat-may` ซึ่งยังเปิดอยู่ ผมเช็กบน main แล้ว ยังไม่มีไฟล์นี้
- `plat-may` เขียนในรีวิวไว้ชัดว่า "ให้ merge PR #2 ก่อนหรือพร้อมกัน" ถ้า merge #1 ตอนนี้ skill `sales-proposal` จะชี้ไปไฟล์ที่ไม่มี ตาม SKILL.md ใหม่ เจอแบบนี้ skill จะหยุดแล้วถาม จึงใช้ทำ proposal ธนาคารไม่ได้จนกว่า #2 จะเข้า
- PR #2 ติด `plat-ken` ขอแก้ 3 จุด และ `md-somchai` ยังไม่ได้รีวิว

**จุดที่อาจกระทบ PR #1:** ข้อ 2 ที่ `plat-ken` ขอแก้ใน PR #2 คือคำว่า "**ต้อง**มี DPA (MD นับในเกณฑ์ข้อ 4)" สำหรับลูกค้าที่ไม่ใช่ธนาคารแต่มีข้อมูล ม.26 ต้นฉบับของ MD ไม่ได้เขียนไว้ และสรุปเดิมใช้คำว่า "ควร" ใน `proposal-template.md` ของ PR #1 ก็มีคำนี้อยู่ ถ้าฝั่ง core เปลี่ยนเป็น "ควร" ฝั่งเราควรแก้ให้ตรงกันก่อน merge

**ทางเลือก**
1. รอให้ PR #2 แก้และ merge ก่อน แล้วค่อย merge #1 ผมแนะนำทางนี้ ถ้าต้องการ ผมจะคอยเช็กให้
2. ถ้าคุณยืนยันว่าจะ merge #1 ตอนนี้เลย ผมทำได้ แต่ skill จะใช้ทำ proposal ธนาคารไม่ได้จนกว่า #2 จะเข้า

ถ้าต้องส่ง deal-001 รอบใหม่ก่อนนั้น `plat-may` บอกว่าให้ใช้ข้อความ 3 ข้อจาก `approval-rules.md` ใส่ในเอกสารไปก่อนได้เลย

## plat-may แก้ PR #2 · 140 วินาที · 13 คำสั่ง

I made all the changes plat-ken asked for in PR #2 and pushed them to the same branch (`core/customer-data-policy-bank-pdpa-annex`) as commit `f36d4a3`. Then I replied in the PR to say what changed: http://localhost:3300/novatech/org-skills/pulls/2#issuecomment-24

**The 3 required fixes**
1. **Scope:** The PDPA annex now applies only to **proposals** sent to banks and financial institutions, as MD's rule (deal-rules ข้อ 3) says. I spelled out that invoices, emails and meeting minutes sent to a bank don't need it. This is updated in both step 3 of `SKILL.md` and the "ใช้เมื่อไร" section of `bank-pdpa-annex.md`.
2. **DPA for non-bank customers with ม.26 data:** Changed "ต้อง" to "**ควร**", citing `approval-rules.md`, and noted that MD's original rules don't cover this case. The "ส่ง plat-may ดูก่อนส่ง" step now cites the health-data row in `doc-type-rules.md` instead of MD.
3. **When the 72 hours start:** They now start when the first Novatech employee finds the breach. Reporting to plat-may within 1 hour happens inside that 72-hour window; it doesn't start the clock. The customer-facing wording ("นับจากที่ทราบเหตุ") stays the same so it still matches MD's rule exactly.

**Both optional suggestions accepted**
- If all 3 points are covered but the wording differs from the standard text, it's now 🟡. If the annex is missing, incomplete, or contradicts the standard (for example backup or logs stored outside Thailand), it's 🔴.
- `SKILL.md` and the annex header now say `deal-approval` **will** use this file once exec-ploy's separate PR is merged. I didn't open a separate issue for it.

**Also done**
- `python scripts/build.py --check`, `claude plugin validate .` and `claude plugin validate plugins/core` all pass.
- The commit is under your name (plat-may), with a Co-Authored-By line for Claude.
- I updated the PR description to match the new wording and added a "แก้ตามรีวิว" section.
- The reply @-mentions plat-ken, since they asked to be pinged once the fixes were in.
- I left the version at 1.1.0 because it hasn't been merged yet.

The working copy is a clone in the scratchpad (`C:\Users\oishi\AppData\Local\Temp\claude\C--t-org05-novatech-desks-plat-may\69357e99-5d40-47b5-b4c8-73b01aec8055\scratchpad\org-skills`), and I removed the token from its remote URL.

## plat-ken รีวิวรอบ 2 + merge PR #2 · 74 วินาที · 8 คำสั่ง

PR #2 is approved and merged into `main` (merge commit `bcaa672`), and your local `org-skills` checkout is updated.

**Round-two review (f36d4a3).** plat-may fixed all 3 points you asked for:
1. **Scope:** `SKILL.md` step 3 and the annex's "ใช้เมื่อไร" section now apply only to **proposals** to banks or financial institutions. Invoices, emails and minutes no longer get 🔴.
2. **DPA for non-bank customers with section 26 data:** now says "ควร", cites `approval-rules.md`, and notes that `deal-rules` doesn't set this rule. The "send to plat-may" step now cites `doc-type-rules.md`, the health-data row.
3. **When the 72 hours start:** counting starts when the first Novatech employee finds the breach. The 1-hour notice to plat-may falls inside the 72 hours.

plat-may also took both non-blocking suggestions:
- Different wording with all 3 topics covered is now 🟡; missing or contradicting content is 🔴.
- `deal-approval` now says it "จะ" use the file.

The 3-item template text hasn't changed since you checked it in round one. `build.py --check` passes on the PR head, and the branch was up to date with `main`.

**One non-blocking note:** `SKILL.md` says `sales-proposal` uses this file "ตั้งแต่ 1.2.0", which only becomes true once #1 merges. Since #1 is next, I didn't hold the merge for it.

**A problem with the approval comment:** I wrote it in a way that made the shell run the backtick-quoted text, so 5 file and skill names dropped out of the posted text. Gitea won't let me edit a posted review, so I added a separate comment on the PR that fills in the missing names.

PR #1 can go next now that the `bank-pdpa-annex.md` file it points to is on `main`. Tell me if you want me to review it.

## sales-nida ขอ merge (ยังไม่ merge) · 69 วินาที · 10 คำสั่ง

ยังไม่ได้ merge ครับ PR #1 ได้ approve แล้ว แต่มีข้อความหนึ่งบรรทัดที่ขัดกับฉบับ core ที่เพิ่ง merge ไป ผมเลยหยุดไว้ก่อนเพื่อถามคุณ

**สถานะ PR #1**
- `plat-may` approve บน commit ล่าสุด `49ebcd9` แล้ว รีวิวนี้ยังไม่ stale และระบบบอกว่า merge ได้
- PR #2 ฝั่ง core ซึ่งต้อง merge ก่อน ถูก merge ไปแล้วโดย `plat-ken` เมื่อ 09:01 ไฟล์ `bank-pdpa-annex.md` จึงมีอยู่บน main แล้ว
- ส่วน `sales-krit` และ `exec-ploy` ยังไม่ได้รีวิว ทั้งที่ถูกขอไว้

**จุดที่ขัดกัน**
บรรทัดสุดท้ายของหัวข้อภาคผนวกใน `proposal-template.md` เขียนว่า:
> …และจด DPA ไว้ใน internal-notes เป็นเรื่องที่**ต้อง**ใส่ในสัญญา (**MD นับในเกณฑ์ข้อ 4**)

ใน PR #2 `plat-ken` ขอให้แก้ข้อความแบบเดียวกันนี้ เพราะต้นฉบับ `deal-rules.md` ของ MD ไม่ได้กำหนดเรื่องนี้ และสรุปใน `approval-rules.md` ใช้คำว่า "**ควร**" ฝั่ง core ที่ merge แล้วจึงเขียนว่า "**ควร**มี DPA ในสัญญา (ต้นฉบับ deal-rules ไม่ได้กำหนดเรื่องนี้)" แต่ `plat-may` approve PR #1 ก่อนที่ PR #2 จะแก้จุดนี้ ถ้า merge ตอนนี้ skill ฝั่ง sales จะบอกว่า "ต้อง" และอ้างว่าเป็นเกณฑ์ MD ซึ่งขัดกับไฟล์ core ที่ตั้งใจให้เป็นที่อ้างอิงที่เดียว

**ทางที่ผมแนะนำ**
ให้ผมแก้บรรทัดนั้นเป็นประมาณนี้:
> …แต่ต้องส่งให้ `plat-may` ดูก่อนส่ง proposal · เรื่อง DPA ในสัญญาดู `customer-data-policy` → `bank-pdpa-annex.md` ("ใช้เมื่อไร")

แล้ว push เป็น commit ใหม่และขอ `plat-may` approve อีกรอบ เพราะถ้า repo ตั้งให้ approval หายเมื่อมี commit ใหม่ ก็ต้อง approve ใหม่ จากนั้นจึง merge

จะเอาแบบนี้ไหมครับ หรือถ้าต้องการ merge ทันทีตามสภาพตอนนี้แล้วค่อยแก้ทีหลัง บอกได้เลย ผมทำได้เหมือนกัน

## sales-nida แก้ 1 บรรทัด · 36 วินาที · 2 คำสั่ง

แก้บรรทัดนั้นใน PR #1 และส่งคำขอให้ plat-may รีวิวใหม่แล้วครับ PR ยังไม่ได้ merge และตอนนี้ต้องรอ plat-may approve ก่อน

- **บรรทัดที่แก้:** commit `9de7a3a` อยู่บน branch `sales/proposal-pdpa-annex-bank` แก้เฉพาะบรรทัดเรื่องข้อมูลอ่อนไหว ม.26 ใน `proposal-template.md` ข้อความใหม่คือ:
  > …ไม่บังคับภาคผนวกนี้ แต่ **ต้องส่งให้ `plat-may` ดูก่อนส่ง proposal** · เรื่อง DPA ในสัญญาดู `customer-data-policy` → `references/bank-pdpa-annex.md` (หัวข้อ "ใช้เมื่อไร")

  คำว่า "ต้อง" และ "MD นับในเกณฑ์ข้อ 4" ถูกเอาออกแล้ว ตอนนี้ตรงกับไฟล์ฝั่ง core ที่ merge ไปแล้ว ไฟล์อื่นไม่ได้แก้
- **ผลต่อ approve เดิม:** approve ของ plat-may บน commit `49ebcd9` กลายเป็น stale แล้ว เลยต้องรอ approve รอบใหม่ก่อน merge
- **ที่ส่งไปแล้ว:** ส่งคำขอรีวิวถึง plat-may และคอมเมนต์ในเธรด PR #1 ว่าแก้อะไรและแก้เพราะอะไร

เมื่อ plat-may approve แล้ว บอกผมได้เลย ผมจะเช็กอีกรอบแล้ว merge ให้ครับ

## plat-may รีวิว PR #1 รอบ 3 · 99 วินาที · 9 คำสั่ง

ผม approve PR #1 แล้วครับ (review #10 ที่ commit `9de7a3a`) ผมยังไม่ได้ merge เพราะ sales-nida บอกว่าจะ merge เองหลังได้ approve

**สิ่งที่ตรวจ**
- **แก้จุดเดียวจริงตามที่บอก:** commit ใหม่เปลี่ยน 1 บรรทัดใน `proposal-template.md` ไฟล์เดียว
- **ตรงกับ core แล้ว:** บรรทัดลูกค้าที่มีข้อมูลอ่อนไหว ม.26 เดิมเขียนว่า DPA "ต้องใส่ในสัญญา (MD นับในเกณฑ์ข้อ 4)" ตอนนี้ชี้ไปที่ `bank-pdpa-annex.md` หัวข้อ "ใช้เมื่อไร" แทน
  - หัวข้อนี้มีอยู่จริงในไฟล์ที่ merge เข้า `main` ไปแล้วใน #2 และใช้คำว่า "**ควร**มี DPA" ตามที่ plat-ken ขอแก้
  - ส่วน "ต้องส่งให้ plat-may ดูก่อนส่ง proposal" ยังอยู่ครบ
- **ไม่มีข้อความขัดกันเหลือ:** ใน `sales-proposal` ไม่เหลือคำว่า "ต้องใส่ในสัญญา", "เกณฑ์ข้อ 4" หรือ "72 ชม." แล้ว
- **merge ได้:** ผมลอง merge กับ `main` หลัง #2 ในเครื่อง ไม่ conflict และ `python scripts/build.py --check` ผ่าน

เรื่องลำดับ merge ไม่ต้องห่วงแล้ว เพราะ #2 เข้าไปก่อน ส่วน `deal-approval` ยังรอ PR แยกของ exec-ploy

ดู review ได้ที่ http://localhost:3300/novatech/org-skills/pulls/1

## sales-nida merge PR #1 · 60 วินาที · 7 คำสั่ง

PR #1 ได้ approve แล้ว และผม merge เข้า `main` ให้แล้วครับ (merge commit `f1218bf`)

**สถานะก่อน merge**
- `plat-may` approve รอบ 3 บน commit ล่าสุด `9de7a3a` และ approve นี้ยังไม่ stale ส่วนรอบ 1 ที่ request changes ถูก dismiss ไปแล้ว
- ในรีวิวรอบ 3 `plat-may` เขียนไว้ว่า "merge ได้เลยครับ"
- เงื่อนไขใน README คือต้องมี approve อย่างน้อย 1 คน ซึ่งผ่านแล้ว PR นี้แก้เฉพาะไฟล์ใต้ `plugins/sales/` 3 ไฟล์ ซึ่งคุณเป็น CODEOWNER เอง
- PR #2 ฝั่ง core (`bank-pdpa-annex.md`) merge ไปก่อนแล้วโดย `plat-ken` skill จึงไม่ได้อ้างถึงไฟล์ที่ยังไม่มี
- Gitea แจ้งว่า PR นี้ merge ได้ ไม่มี conflict

**เรื่องที่ยังค้างอยู่ แต่ไม่ได้ขวางการ merge**
- `sales-krit` กับ `exec-ploy` ยังไม่ได้รีวิว ในคำอธิบาย PR คุณขอให้ `md-somchai` หรือ `exec-ploy` ยืนยันข้อความภาคผนวก ตอนนี้ข้อความนั้นย้ายไปอยู่ใน core (PR #2) แล้ว จึงอาจแจ้งพวกเขาว่าให้ไปดูที่นั่นแทน
- `deal-approval` ยังรอ PR แยกจาก `exec-ploy` เพื่อให้อ้างไฟล์เดียวกัน
- ก่อนเซ็นสัญญา deal-001 ต้องยืนยันกับ `ops-art` ว่าข้อมูล log ของ `LIC-APM` เก็บอยู่ใน region ไทย
- เรื่องระยะแจ้งเหตุ 72 ชม. `plat-may` จะคุยกับ MD เอง
- PR นี้ไม่มีการตรวจ CI ผลการตรวจที่มีคือที่คุณกับ `plat-may` รันเองในเครื่อง

## sales-krit อัปเดต skill · 83 วินาที · 10 คำสั่ง

อัปเดตเสร็จแล้วครับ โต๊ะนี้ใช้ `core` กับ `sales` จาก novatech-skills ตอนนี้อยู่ที่ commit `f1218bf` แล้ว (เดิม `5878e51`) ต้อง**เริ่ม session ใหม่**ก่อน skill ชุดใหม่ถึงจะมีผล

**สิ่งที่ต้องรู้ก่อน:** ทั้งสองแพ็กยังเป็นเวอร์ชัน 1.0.0 แม้เนื้อหาจะเปลี่ยน ผมเลยสั่ง `claude plugin update` แล้วมันตอบว่า "ล่าสุดแล้ว" แต่ไม่ได้อัปเดตจริง จึงต้องถอนแล้วติดตั้งใหม่สำหรับโต๊ะนี้แทน ไฟล์ติดตั้งนี้ใช้ร่วมกับโต๊ะอื่นที่ติดตั้ง `core` และ `sales` ไว้ด้วย โต๊ะเหล่านั้นจึงจะได้เนื้อหาใหม่ไปด้วยเมื่อเริ่ม session ถัดไป ควรบอก plat-ken ให้เพิ่มเลขเวอร์ชันแพ็กทุกครั้งที่แก้ เพื่อให้ `update` ใช้ได้ปกติ

## อะไรเปลี่ยน (PR #1: ใส่ภาคผนวก PDPA ทุกครั้งที่ลูกค้าเป็นธนาคาร)

**`core:customer-data-policy` 1.0.0 → 1.1.0**
- มีไฟล์ใหม่ `references/bank-pdpa-annex.md` เป็นที่เดียวของบริษัทที่เก็บข้อความ "ภาคผนวก PDPA" ของลูกค้าธนาคาร มี 3 ข้อพอดี:
  1. DPA: โนวาเทคเป็นผู้ประมวลผล ลูกค้าเป็นผู้ควบคุมข้อมูล
  2. Data residency: เก็บข้อมูลในไทยเท่านั้น รวม backup และ log
  3. แจ้งเหตุละเมิดภายใน 72 ชม.
- ตอนตรวจ proposal ถึงธนาคาร:
  - ไม่มีภาคผนวก มีไม่ครบ หรือเนื้อหาขัดกับแบบ = 🔴
  - เนื้อหาครบแต่ถ้อยคำต่างจากแบบ = 🟡 ให้เปลี่ยนเป็นถ้อยคำมาตรฐาน
  - เอกสารอื่นถึงธนาคาร (ใบแจ้งหนี้ อีเมล minutes) ไม่ต้องมีภาคผนวกนี้
- เรื่องภายในก่อนเซ็นสัญญา:
  - ถ้าดีลมีบริการเก็บ log เช่น `LIC-APM` ต้องให้ `ops-art` ยืนยันว่า log อยู่ใน region ไทย
  - เริ่มนับ 72 ชม. ตั้งแต่พนักงานโนวาเทคคนแรกพบเหตุ
- `doc-type-rules.md`: แถว proposal ระบุแล้วว่าลูกค้าธนาคารต้องมีภาคผนวก 3 ข้อ ส่วนลูกค้าอื่นที่มีข้อมูลอ่อนไหว ม.26 ต้องส่งให้ `plat-may` ดูก่อน

**`sales:sales-proposal` 1.1.0 → 1.2.0**
- ลูกค้าธนาคารหรือสถาบันการเงินต้องมีหัวข้อ "ภาคผนวก PDPA" ต่อท้ายหัวข้อ 9 ทุกครั้ง ใช้ข้อความจากไฟล์ใน core ตรงตัว ห้ามแต่งเอง และห้ามคัดลอกมาเก็บใน skill
- เขียนเรื่องนี้ไว้ในหัวข้อ 4.2 อย่างเดียวไม่นับ ซึ่งเป็นเหตุที่ deal-001 ถูก MD ตีกลับ และข้อความใน 4.2 ต้องไม่ขัดกับภาคผนวก
- proposal ที่ชนะก่อน 1 ก.ค. 2026 ยังไม่มีภาคผนวกนี้ ถ้าใช้เป็นแบบต้องเพิ่มเอง
- ระบบที่มีข้อมูลอ่อนไหว ม.26 ต้องส่งให้ `plat-may` ดูก่อนส่ง proposal
- checklist เพิ่มข้อเช็กภาคผนวก PDPA

`deal-approval` ของผู้บริหารยังไม่เปลี่ยน รอ PR แยกของ `exec-ploy`

## กระทบงานที่ค้างอยู่: deal-002 (ธนาคารเอเชียไทยสากล)
ผมเช็ก `deal-002-proposal-ati-card-dispute.md` ตามกติกาใหม่แล้ว ยังไม่ได้แก้ไฟล์:
- 🟢 มีหัวข้อ "ภาคผนวก PDPA" ต่อท้ายหัวข้อ 9 ครบ 3 เรื่อง และข้อความใน 4.2 ไม่ขัดกับภาคผนวก
- 🟡 ถ้อยคำต่างจากแบบมาตรฐาน เช่นใช้ "ธนาคาร" หรือ "เรา" แทน "ธนาคารเอเชียไทยสากล จำกัด (มหาชน)" หรือ "โนวาเทค" ตามกติกาใหม่ควรเปลี่ยนเป็นข้อความมาตรฐานตรงตัว
- ⚠️ ส่วนตัวเลือกเสริมใน proposal มี `LIC-APM` (monitoring และ log) ถ้าลูกค้าเลือก ต้องให้ `ops-art` ยืนยันก่อนว่า log อยู่ใน region ไทย ไม่งั้นข้อ 2 ของภาคผนวกจะเป็นคำสัญญาที่ทำไม่ได้

ให้ผมเปลี่ยนภาคผนวกใน deal-002 เป็นถ้อยคำมาตรฐานเลยไหมครับ

ผมเก็บสำเนาเวอร์ชันเก่าไว้เทียบที่ `C:\Users\oishi\AppData\Local\Temp\claude\C--t-org05-novatech-desks-sales-krit\665a1e46-bfd0-4644-814f-918099b7ecbf\scratchpad\old`
