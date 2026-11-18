---
name: arch-template
description: |
  วาด architecture ระบบใหม่ตามมาตรฐานโนวาเทค (arch-standards v4) จาก TOR / spec — เลือกแบบแผน monolith / service แยก / คิวงานด้วยเกณฑ์บริษัท
  แล้วเติมแม่แบบที่ใช้ซ้ำ 80% ให้ได้ docs/architecture.md: C4 ระดับ 1–2 (+3 ถ้าซับซ้อน) เป็น Mermaid สีบริษัท, ตาราง container, คิว/event, ข้อมูล-ความปลอดภัย, observability, รายการ ADR และคำถามที่ต้องยืนยัน
  ใช้เมื่อผู้ใช้พูดว่า "วาด architecture ระบบนี้", "ออกแบบโครงระบบให้หน่อย", "ระบบจองคิวควรแบ่ง service ยังไง", "แบ่ง service ยังไงดี" หรือ /arch-template
  ไม่ใช่สำหรับแตก TOR เป็น spec (นั่นคือ req-to-spec) และไม่ใช่การขึ้นโค้ดโปรเจกต์ (นั่นคือ project-scaffold)
metadata:
  owner: sa-ice
  plugin: sa
  layer: department
  version: 0.2.0
  uses: []
  next: [project-scaffold, pricing-calc, sales-proposal]
  follows: [brand-guide, customer-data-policy]
---

# วาด architecture ตามมาตรฐาน (arch-template)

เป้าหมาย: ไม่วาดใหม่จากศูนย์ทุกโปรเจกต์ — ใช้แม่แบบเดิม 80% แล้วคิดเฉพาะ 20% ที่ต่าง (แบ่ง service ไหน, เชื่อมอะไร, ข้อมูลอ่อนไหวอะไร)
ผลลัพธ์: ไฟล์ Markdown 1 ไฟล์ (ค่าเริ่มต้น `work/<deal>-architecture.md` หรือ `docs/architecture.md` ใน repo) ที่ใช้ได้ทั้งเป็นหัวข้อ "สถาปัตยกรรม" ใน proposal และรีวิวใน PR

`SKILL_DIR` = โฟลเดอร์ของ skill นี้ · ความรู้ทั้งหมดที่ต้องใช้อยู่ใน `references/` (ไม่ต้องมี company-kit ในเครื่อง)

## ขั้นตอน

1. **อ่าน input** — spec จาก `req-to-spec` (ถ้ามี) หรือ TOR ตรง ๆ จดเป็นรายการ: ผู้ใช้แต่ละกลุ่ม, ช่องทาง, ระบบภายนอกที่ต้องเชื่อม (+ protocol), ข้อมูลอ่อนไหว, ข้อกำหนดความปลอดภัย/region, งาน async, ML/batch, SLA, ขนาดโหลด
2. **เลือกแบบแผน** — อ่าน `references/pattern-picker.md` ไล่ทีละส่วนของระบบ: เริ่มจาก monolith เสมอ, แยก service เฉพาะที่เข้าเกณฑ์ 4 ข้อ (ต้องระบุเลขเกณฑ์), อะไรเข้าคิว · ทุกการแยก/ไม่แยกที่คนน่าจะถาม → เป็น ADR
3. **ตั้งชื่อ** — กำหนด project code แล้วตั้งชื่อ service, DB, schema, event ตาม `references/arch-standards.md` ข้อ 7
4. **เติมแม่แบบ** — คัดลอก `assets/architecture-template.md` แล้วแทน `{{...}}` ทุกจุด ลบหัวข้อที่ไม่เกี่ยว (เช่น ไม่มี ML ก็ลบ flow พยากรณ์) · ใช้ classDef สีที่ให้ไว้ห้ามเปลี่ยน
5. **ตรวจก่อนส่ง** (ต้องผ่านทุกข้อ)
   - [ ] มี C4 ระดับ 1 + 2, ระดับ 3 เฉพาะโมดูลที่ซับซ้อน
   - [ ] ทุกเส้นเชื่อมมี protocol + `(sync)`/`(async)`
   - [ ] สี: ของเรา Navy `#0B2545`, ภายนอก Line Gray `#CBD2D9`, DB/คิว Teal `#13A89E` · trust boundary เป็นกรอบประ (`stroke-dasharray`)
   - [ ] service ที่แยกทุกตัวอ้างเลขเกณฑ์ข้อ 2.x และมีแถวใน ADR
   - [ ] งาน async ทุกตัวมีชื่อ event `<domain>.<event>` อดีตกาล, idempotent, retry 5 ครั้ง, dead-letter
   - [ ] ข้อมูลอ่อนไหวแต่ละประเภทบอกวิธีเก็บ (เข้ารหัสคอลัมน์ / hash) · ลูกค้าธนาคาร = region ไทย
   - [ ] alert ครบ 5 ข้อขั้นต่ำ **รวม TLS cert หมดอายุใน 21 วัน** (ถ้ามี mTLS ให้ระบุ client cert ด้วย) + `/healthz` `/readyz`
   - [ ] **ไม่มีเบอร์มือถือ / เลขบัตรประชาชน / ชื่อลูกค้าปลายทาง** ในเอกสาร แม้ TOR จะมี (ตรวจด้วย skill `customer-data-policy` (core)) — ชื่อผู้ประสานงานใส่ได้แต่ไม่ต้องใส่ก็ได้
   - [ ] Mermaid parse ได้: label ที่มีวงเล็บ/ทับ/ภาษาไทยอยู่ใน `"..."`, ใช้ `<br/>` ขึ้นบรรทัด
6. **ปิดท้ายด้วย "ประเด็นที่ต้องยืนยัน"** — สิ่งที่ TOR ไม่ชัดแต่เปลี่ยนรูปแผนภาพ (ใครเรียกใคร, เครือข่ายเข้าถึงได้ไหม, ใครเป็นเจ้าของ gateway, เก็บ PII ไหม) อย่าเดาเงียบ ๆ ให้เขียนสมมติฐานที่ใช้วาดไว้ด้วย
7. **บอกผู้ใช้** สั้น ๆ: แบบแผนที่เลือก + เหตุผล 1 บรรทัดต่อ service, ไฟล์ที่ได้, ประเด็นที่ต้องยืนยัน และ skill ถัดไป (`project-scaffold` ขึ้นโค้ด, `pricing-calc` คิด hosting/man-day, `sales-proposal` ใส่ในข้อเสนอ)

## สิ่งที่ห้ามทำ

- ห้ามเริ่มจาก microservices หรือแยก service "เพื่อความยืดหยุ่น" โดยไม่เข้าเกณฑ์
- ห้ามใช้ Kafka/MongoDB/region ต่างประเทศ ฯลฯ ที่ต่างจากมาตรฐานโดยไม่มี ADR
- ห้ามวาดเป็นรูปภาพ (PNG/draw.io) เป็นผลหลัก — ต้องเป็น Mermaid ใน Markdown
