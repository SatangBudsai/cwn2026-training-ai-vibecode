---
name: pricing-calc
description: |
  คิดราคาโปรเจกต์และกำไรของโนวาเทคจากตารางราคามาตรฐาน (price-list) ตามกฎกำไร — บวก buffer 10% งาน fixed-price, margin หลังส่วนลด, เกณฑ์ 25%/15%, สิทธิ์ให้ส่วนลด, ห้ามลด MA/hosting, VAT 7% — ได้ใบคิดราคาภายใน (มีต้นทุน/margin/ผู้อนุมัติ) + ร่างตารางราคาสำหรับใบเสนอราคา (ไม่มีต้นทุน) ใช้เมื่อผู้ใช้พิมพ์ "คิดราคาโปรเจกต์นี้", "ดีลนี้กำไรเท่าไหร่", "ทำใบเสนอราคา", ขอราคาแบบช่วง/ราคาเข้างบ หรือส่ง TOR/SPEC/รายการ man-day มาให้คิดราคา
metadata:
  owner: fin-joy
  layer: department
  version: 0.1.0
  uses: []
  next: [sales-proposal, deal-approval, pipeline-review, cost-headcount-review]
  follows: [customer-data-policy, pricing-rules]
---

# pricing-calc — คิดราคาและกำไร 1 ดีล

ทำเรื่องเดียว: เอาขอบเขตงาน 1 ดีล → รายการราคาตาม price-list → ตัวเลขกำไร + ผู้อนุมัติ
ไม่เขียน proposal (→ `sales-proposal`) · ไม่ตัดสินอนุมัติดีล (→ `deal-approval`) · ไม่ออกใบแจ้งหนี้ (→ `invoice-check`)

อ่าน skill `core:pricing-rules` ก่อน (ราคาขาย + ต้นทุน 16 รายการ, สูตร, buffer, เกณฑ์ margin, สิทธิ์ส่วนลด, VAT) ความรู้เฉพาะงานนี้อยู่ใน skill:
- `references/script-notes.md` — วิธีที่สคริปต์คิด buffer และ % ส่วนลด
- `references/estimate-benchmarks.md` — man-day ของดีลที่ชนะ ใช้เทียบ + รายการที่มักลืม
- `assets/example-deal.json` — ตัวอย่าง input จริง (deal-001 ฉบับเข้างบ)

สคริปต์ใช้ตารางราคาของ `core:pricing-rules` เป็นค่าเริ่มต้น ถ้าเครื่องนี้มี `company-kit/price-list.csv` ใหม่กว่า ให้ส่ง `--price-list` ชี้ไปที่ไฟล์นั้น

## ขั้นตอน

1. **อ่านขอบเขต** — TOR / SPEC ของ SA / สถาปัตยกรรม / โน้ตใน `notes/` ถ้ามี · จดไว้: ระยะเวลา, งบลูกค้า (ก่อน VAT?), รวม hosting/MA ปีแรกไหม, SLA (24x7 หรือเวลาทำการ), fixed-price ไหม
2. **ประมาณ man-day ก่อน buffer** ต่อบทบาท (`MD-*`) เทียบ `estimate-benchmarks.md` · ใส่หมายเหตุสั้น ๆ ว่าบทบาทนั้นทำอะไร · ถ้า SA ให้ตัวเลขมาแล้ว ใช้ของ SA
3. **เพิ่มรายการไม่ใช่ค่าแรง** — hosting (`CL-*`), license (`LIC-*`), MA (`MA-*`) ตามที่ TOR ต้องการ · ของนอกตารางใส่ใน `external` (ต้นทุนผู้ขาย + ≥ 20%)
4. **เขียน input** `work/<deal>-input.json` ตามรูปแบบ `assets/example-deal.json` (ใส่ `assumptions`, `decisions`, `cut_options` ด้วย)
5. **คำนวณด้วย script** (อย่าคิดเลขเอง):
   ```
   python <skill>/scripts/price_calc.py work/<deal>-input.json --out-dir work
   ```
   ได้ `work/<deal>-pricing-internal.md` + `work/<deal>-quotation-draft.md` · ถ้ามี ❌ (รหัสไม่อยู่ใน price-list, markup < 20%, ส่วนลด > 10% แต่ margin < 15%) script ไม่ออกร่างใบเสนอราคา และ exit 1 → แก้ input แล้วรันใหม่
6. **ถ้าเกินงบลูกค้า** — ทำฉบับที่ 2 (`<deal>-B`) โดยลดขอบเขตก่อน (MA-STD แทน PREM ถ้า SLA ยอม, ย้ายงานไปเฟส 2/MA) แล้วค่อยใช้ส่วนลดพิเศษ · **ห้ามตัด QA / buffer / ลด MA-hosting เพื่อให้ราคาลง** · เทียบให้เห็นทั้ง 2 ฉบับ
7. **ตรวจก่อนส่งต่อ**
   - ร่างใบเสนอราคาไม่มีคำว่า ต้นทุน / margin / buffer
   - ไม่มีเบอร์มือถือ เลขบัตร ปชช. เลขบัญชีของลูกค้า (TOR มักมีเบอร์ผู้ประสานงาน — ไม่คัดลอกมา) ตาม `customer-data-policy`
8. **บอกผู้ใช้** สั้น ๆ: ราคาก่อน VAT / รวม VAT, margin, ผู้อนุมัติ, เกินงบไหม, ไฟล์ที่ได้, จุดที่ตัดสินใจเอง และ skill ถัดไป (`sales-proposal` ใส่ตาราง, `deal-approval` ถ้าต้องผ่าน MD — ลูกค้าธนาคารหรือ ≥ 1M ต้องผ่าน MD เสมอ)

## ตอบคำถาม "ดีลนี้กำไรเท่าไหร่" จากสรุปดีลที่มีอยู่
ไม่ต้องคิดใหม่ทั้งหมด: แปลงตารางในสรุปดีลเป็น input (man-day ที่รวม buffer แล้ว → ตั้ง `"fixed_price": false` เพื่อไม่บวกซ้ำ) รัน script แล้วเทียบกับตัวเลขในเอกสาร · บอกถ้าไม่ตรง หรือไม่มี buffer / ส่วนลดเกินสิทธิ์
