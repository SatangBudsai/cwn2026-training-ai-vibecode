---
name: arch-template
description: วาดแผนภาพ architecture ตามมาตรฐานโนวาเทค v4 จาก TOR หรือ spec — เลือกแบบแผน (modular monolith / แยก service / คิวงาน) ตามเกณฑ์บริษัท แล้วออกเอกสาร Markdown ที่มี Mermaid C4 ระดับ 1 (Context) + 2 (Container) สีและป้ายเส้นตามมาตรฐาน ตารางโมดูล คิว/event ADR และคำถามเปิด ใช้เมื่อผู้ใช้พูดว่า "วาด architecture ระบบนี้", "ออกแบบโครงระบบให้หน่อย", "ระบบจองคิวควรแบ่ง service ยังไง" หรือขอแผนภาพสถาปัตยกรรม / C4 สำหรับโปรเจกต์หรือ proposal
metadata:
  owner: sa-ice
  layer: personal
  version: 0.1.0
  uses: req-to-spec
  next: project-scaffold
  follows: customer-data-policy
---

# arch-template — วาด architecture ตามมาตรฐานบริษัท

งานนี้ทำซ้ำทุกโปรเจกต์ และโครงเดิมเหมือนกัน 80% skill นี้คือโครงนั้น เหลือแค่เติมส่วนที่ต่างของแต่ละระบบ

## ข้อมูลเข้า

- TOR, spec หรือ requirement ของระบบ ถ้ามี spec จาก `req-to-spec` (`sa-ton`) อยู่แล้วให้ใช้ spec นั้นก่อน เพราะแตกหัวข้อไว้ครบกว่า
- ชื่อโปรเจกต์สั้น ๆ (project code) เช่น `nlp-queue` ถ้าไม่มีให้ตั้งจากชื่อลูกค้าและชื่อระบบ แล้วบอกผู้ใช้

## ขั้นตอน

1. **อ่านมาตรฐาน** ใน [references/arch-standards.md](references/arch-standards.md) (ฉบับสรุปของ `company-kit/arch-standards.md` v4) ถ้าเครื่องนี้มีไฟล์ต้นฉบับและเวอร์ชันใหม่กว่า ให้ใช้ต้นฉบับ และแจ้งผู้ใช้ว่าสรุปใน skill ล้าสมัยแล้ว
2. **แตกสิ่งที่ระบบต้องมี** จาก TOR ออกเป็น 4 กลุ่ม:
   - ผู้ใช้ (Person) แต่ละบทบาท
   - ระบบภายนอก / ระบบเดิมของลูกค้า พร้อม protocol ที่ TOR ระบุ
   - โดเมนธุรกิจ จะกลายเป็นโมดูล (คำนามเอกพจน์)
   - งานที่ไม่ต้องตอบทันที จะกลายเป็น job ในคิว
3. **ตัดสินแบบแผน** ตามตารางเลือกใน references:
   - เริ่มจาก modular monolith 1 ตัวเสมอ
   - แยก service เฉพาะที่เข้าเกณฑ์ข้อใดข้อหนึ่งจาก 4 ข้อ และเขียนว่าเข้าข้อไหน
   - เลือกคิว: BullMQ หรือ RabbitMQ
   - ทุกจุดที่ไม่ตรงมาตรฐาน ให้ใส่ไว้ในรายการ ADR
4. **วาด Mermaid** โดยคัดลอกโครงจาก [references/diagram-template.md](references/diagram-template.md):
   - C4 L1 Context และ C4 L2 Container (บังคับทั้งคู่)
   - L3 เฉพาะเมื่อโมดูลซับซ้อนจริง
   - ใช้ `classDef` ตามสีมาตรฐาน
   - ทุกเส้นมีป้าย `protocol (sync|async)`
   - trust boundary เป็น subgraph กรอบประ
5. **เขียนเอกสาร** ตามโครง 9 หัวข้อใน diagram-template แล้วบันทึกไฟล์:
   - ไฟล์งานส่วนตัว: `work/<deal-or-project>-architecture.md`
   - ไฟล์ใน repo โปรเจกต์: `docs/architecture.md`
6. **ตรวจก่อนส่ง** ตาม checklist ด้านล่าง

## Checklist ก่อนส่ง

- [ ] มีทั้ง L1 และ L2, สีถูก: ของเรา `#0B2545`, ภายนอก `#CBD2D9`, คิว/DB `#13A89E`
- [ ] ทุกเส้นมี protocol + sync/async
- [ ] มีกรอบประ trust boundary ระหว่างเครือข่ายเรากับลูกค้า
- [ ] ชื่อ service `<project>-<part>`, DB `nvt_<project>_<env>`, event `<domain>.<event>` แบบอดีตกาล, env มีแค่ dev/uat/prod
- [ ] service ที่แยกออกมาทุกตัวอ้างเกณฑ์ได้ และมี ADR
- [ ] ระบบธนาคาร: cloud region ไทย, mTLS แยกเป็น connector, alert ใบรับรอง TLS ภายใน 21 วัน
- [ ] ข้อมูลอ่อนไหว (เลขบัตร, เบอร์) มีวิธีเก็บ (hash หรือเข้ารหัสคอลัมน์)
- [ ] สิ่งที่ TOR ไม่ระบุ ให้เขียนเป็น "คำถามเปิด" ห้ามเดาเงียบ ๆ
- [ ] **ข้อมูลลูกค้า** (ทำตาม `customer-data-policy`): ห้ามคัดลอกเบอร์มือถือ อีเมลส่วนตัว หรือเลขบัตรจาก TOR ลงเอกสาร ระบุแค่ชื่อองค์กรและเลข TOR

## ส่งต่อ

เอกสารนี้เป็นข้อมูลเข้าของ `project-scaffold` (`dev-mew`) สำหรับขึ้นโครงโปรเจกต์ตามโมดูลและ service ที่ออกแบบไว้
