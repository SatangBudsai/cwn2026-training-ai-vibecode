---
name: req-to-spec
description: |
  แปลง TOR / proposal ลูกค้าเป็น SPEC.md (requirement มีรหัส ไม่ตกหล่น + คำถามที่ลูกค้ามักลืมเขียน) และ TEST-PLAN.md ที่ส่งต่อ QA ได้ทันที ตามมาตรฐานสถาปัตยกรรมและนโยบายข้อมูลลูกค้าของโนวาเทค
  ใช้เมื่อผู้ใช้พูดว่า "ทำ spec จาก TOR นี้", "แตก requirement เป็นหัวข้อให้หน่อย", "เขียน spec พร้อมแผนทดสอบ" หรือ /req-to-spec
metadata:
  owner: sa-ton
  layer: department
  version: 0.1.0
  uses: []
  next: [arch-template, test-from-plan, pricing-calc, sales-proposal, tech-risk-review, project-scaffold, mlflow-experiment]
  follows: [customer-data-policy, coding-standard]
---

# TOR → SPEC + TEST-PLAN (req-to-spec)

ทำเหมือน SA อาวุโส: อ่าน TOR ทุกบรรทัดให้เป็น requirement ที่มีรหัส แล้ว **หาสิ่งที่ TOR ไม่ได้เขียนแต่ลูกค้าจะถามทีหลัง** เขียนเป็นคำถาม + สมมติฐาน
ผลลัพธ์: `work/<deal>/SPEC.md` + `work/<deal>/TEST-PLAN.md` (ผ่าน `check-spec.mjs`)

`SKILL_DIR` = โฟลเดอร์ของ skill นี้ · ความรู้บริษัทที่ต้องใช้สรุปไว้ใน `references/` แล้ว ไม่ต้องมี company-kit ก็ทำได้

## ขั้นตอน

1. **อ่าน input** — TOR/proposal ที่ผู้ใช้ให้ (ไฟล์หรือข้อความ) + โน้ตของผู้ใช้ใน `notes/` ถ้ามี · ถ้าไม่ได้บอก deal ให้ใช้ชื่อโฟลเดอร์ `work/<deal-id>-<ชื่อสั้น>/`
   จดตัวเลขสำคัญ: จำนวนผู้ใช้/สาขา, ระยะเวลา, งบ (รวมอะไรบ้าง), KPI, SLA, วันยื่นข้อเสนอ
2. **แตก requirement** ตามแม่แบบ [references/spec-template.md](references/spec-template.md)
   - 1 บรรทัด = 1 สิ่งที่ทดสอบได้ · รหัส `FR-<MOD>-NN` / `NFR-<หมวด>-NN` · ระดับ M (TOR เขียน) / S (TOR ไม่เขียนแต่จำเป็น) / C (ทางเลือก)
   - คอลัมน์ "ที่มา" = เลขข้อ TOR หรือ `GAP` — **ทุกข้อใน TOR ต้องถูกอ้างอย่างน้อย 1 ครั้ง** (ไล่ทีละข้อ)
   - ตัวเลขใน TOR ใส่ให้ครบตามตัวอักษร (เช่น "เหลือ 3 คิว", "MAPE ≤ 20%") อย่าปัดเป็นคำกว้าง ๆ
3. **ไล่ checklist สิ่งที่ลูกค้ามักลืม** [references/forgotten-topics.md](references/forgotten-topics.md) ทุกหมวด → ข้อที่ TOR ไม่ได้พูด กลายเป็น requirement ระดับ S + คำถาม `Q-NN` ในหัวข้อ "คำถามถึงลูกค้า"
   - ทุกคำถามมี **ทำไมสำคัญ** + **สมมติฐานที่ใช้ถ้าไม่ได้คำตอบ** + ป้าย 🔴 (กระทบราคา/ขอบเขต ต้องถามก่อนยื่น) / 🟡 (ใส่เป็นสมมติฐานได้)
4. **ใส่มาตรฐานบริษัท** จาก [references/novatech-standards.md](references/novatech-standards.md): โครง modular monolith + เกณฑ์แยก service, คิว, ข้อมูลอ่อนไหว, token 15 นาที, alert TLS, การตั้งชื่อ — ใส่แค่สถาปัตยกรรมเบื้องต้น + Mermaid 1 ภาพ รายละเอียดให้ `arch-template`
5. **เขียน TEST-PLAN.md** ตาม [references/test-plan-format.md](references/test-plan-format.md) (รูปแบบที่ `test-from-plan` ของ QA อ่านได้) — ทุก requirement มี test หรืออยู่ในหัวข้อ "Requirement ที่ตรวจด้วยวิธีอื่น" · test ที่ขึ้นกับสมมติฐานติดป้าย *(สมมติฐาน Q-NN)*
6. **ตรวจ** `node $SKILL_DIR/scripts/check-spec.mjs work/<deal>` → ต้อง ✅ · ⚠️ requirement ที่ไม่มี test: เพิ่ม test หรือย้ายเข้าหัวข้อตรวจด้วยวิธีอื่น (ห้ามปล่อยค้าง)
7. **สรุปให้ผู้ใช้**: จำนวน requirement / test / คำถาม 🔴 · 3–5 GAP ที่สำคัญที่สุด · ความเสี่ยงด้านเวลา · การตัดสินใจที่ทำเอง (ดู [references/decisions.md](references/decisions.md))

## กติกา

- **ข้อมูลส่วนบุคคล** (customer-data-policy): ห้ามคัดลอกเบอร์มือถือของผู้ประสานงานจาก TOR ลง SPEC — ใช้ชื่อ + อีเมลบริษัท และเขียนว่า "เบอร์มือถือเก็บใน CRM" · ข้อมูลทดสอบเป็น synthetic เสมอ · ตัวอย่างเลขบัตร/เบอร์ใช้แบบปิดบัง (`1-XXXX-XXXXX-XX-3`, `08X-XXX-1234`)
- **ไม่เดาแทนลูกค้าแบบเงียบ ๆ**: อะไรที่ TOR ไม่บอก → สมมติฐาน + Q-NN เสมอ ไม่ใช่เขียนเป็นข้อเท็จจริง
- **ไม่คิดราคา** — แค่ชี้ว่าอะไรกระทบราคา (🔴) แล้วส่งต่อ `pricing-calc`
- SPEC เป็นเอกสารภายในจนกว่าผู้ใช้จะบอกว่าจะส่งลูกค้า · ไม่ส่งไฟล์ออกนอกเครื่อง
