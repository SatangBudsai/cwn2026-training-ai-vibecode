---
name: sales-proposal
description: |
  ร่าง proposal (ข้อเสนอโครงการ) ลูกค้าองค์กร โดยเฉพาะธนาคาร จาก TOR — โครง 9 หัวข้อแบบที่ชนะมาแล้ว เน้นความปลอดภัยและ SLA คิดราคาจาก price-list พร้อมเช็ก margin/ส่วนลด/งบ และตัดข้อมูลส่วนบุคคลออก ใช้เมื่อผู้ใช้พิมพ์ "ทำ proposal ให้ลูกค้าธนาคาร", "ร่างข้อเสนอโครงการตาม TOR", "ทำโปรให้ลูกค้าหน่อย" หรือขอข้อเสนอ/ใบเสนอโครงการให้ลูกค้า
metadata:
  owner: sales-nida
  layer: department
  version: 1.0.0
  uses: [pricing-calc]
  next: [deal-approval, follow-up-email, req-to-spec]
  follows: [customer-data-policy, brand-guide, pricing-rules]
---

# sales-proposal — ร่าง proposal ลูกค้าธนาคารจาก TOR

ผลลัพธ์ 3 ไฟล์ในโฟลเดอร์งาน: `<deal>-proposal-<ลูกค้า>.md` (ส่งลูกค้า), `<deal>-pricing-input.json` + `<deal>-pricing-output.md` (ราคา), `<deal>-internal-notes.md` (ต้นทุน margin เรื่องที่ต้องตัดสิน — ห้ามส่งลูกค้า)

## ขั้นตอน

1. **อ่าน TOR** แล้วจดลงตาราง "ข้อ TOR → ความต้องการ → สิ่งที่เราส่งมอบ": ขอบเขต, ระยะเวลา, **งบ (รวมอะไรบ้าง)**, ข้อกำหนดความปลอดภัย, SLA, **เอกสารที่ต้องยื่น**, วันกำหนดยื่น
   - หาสิ่งที่ TOR ไม่ชัดแต่กระทบราคา (สเปกระบบเดิม, เวลาให้บริการ, วันส่งข้อมูล) → ใส่เป็น "สิ่งที่ขอยืนยัน" ท้ายหัวข้อ 2
2. **คิดราคา** — เขียน `pricing-input.json` (man-day ก่อน buffer + hosting/license/MA ปีแรก + `budget`) แล้วรัน
   `python scripts/price.py <file>.json` (สคริปต์บวก buffer 10% เอง, ตรวจ margin/ส่วนลด/งบ)
   - เกินงบ → ลด man-day อย่างมีเหตุผล (reuse งานเดิม) ก่อน แล้วค่อยใช้ส่วนลด (ห้ามลด MA/cloud)
   - ถ้ามี skill `pricing-calc` ของบัญชี ให้ใช้ยืนยันตัวเลขอีกชั้น
3. **เขียน proposal** ตาม `references/proposal-template.md` (9 หัวข้อ ลำดับห้ามสลับ) — ข้อความตัวอย่างดีลที่ชนะอยู่ใน `references/winning-patterns.md`
   - ธนาคารอ่าน **ความปลอดภัย (4.2)** และ **SLA (8)** ละเอียดที่สุด: ตอบทุกข้อของ TOR ด้วยมาตรการจริง ระบุชั่วโมงที่ SLA ครอบคลุมให้ชัด
   - ผลงานอ้างอิงเลือกที่ใกล้ TOR ที่สุด ตามจำนวนที่ TOR ขอ
4. **ตรวจก่อนส่ง** ด้วย `references/checklist.md` (แบรนด์ + PDPA + ราคา) แก้จนผ่านทุกข้อ
5. **เขียน internal-notes**: ตัวเลขภายใน, ผู้อนุมัติ, และ "เรื่องที่ต้องตัดสินใจ" ทุกจุดที่เลือกแทนเจ้าของดีล

## กติกาที่ห้ามพลาด
- กติการาคาทั้งหมดอยู่ใน skill `core:pricing-rules` อ่านก่อนคิดราคา · margin < 15% = ห้ามส่ง · 15–25% → ส่งต่อ `deal-approval` (MD)
- ห้ามต้นทุน/margin ในเอกสารลูกค้า · ห้ามเบอร์มือถือ/เลขบัตร/เลขบัญชี (แม้ TOR จะให้มา) — กติกาอยู่ใน skill `core:customer-data-policy` ส่วนเฉพาะ proposal อยู่ใน `references/pdpa-rules.md`
- ห้ามอ้างตัวเลขที่ยังไม่ใช่ผลงานจริง (ผลทดลอง, ต้นแบบ) เป็นคำสัญญา
- ไม่รู้ = ถาม หรือเขียนเป็นข้อสมมติใน internal-notes อย่าเดา

## ต่อจากนี้
- margin 15–25% หรือส่วนลด > 10% → `deal-approval` · ยื่นแล้ว → `follow-up-email` · ชนะดีล → `req-to-spec`
