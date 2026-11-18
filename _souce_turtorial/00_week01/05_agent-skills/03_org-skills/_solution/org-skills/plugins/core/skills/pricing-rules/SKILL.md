---
name: pricing-rules
description: ตารางราคามาตรฐาน (price-list 16 รายการ ราคาขาย + ต้นทุน) และกฎกำไร margin-rules v2026.1 ของโนวาเทคฉบับเดียวของบริษัท — สูตร margin หลังส่วนลด, buffer 10% งาน fixed-price, เกณฑ์ 25%/15%, สิทธิ์ให้ส่วนลด 5/10%, ห้ามลด MA/hosting, VAT 7%, ห้ามแสดงต้นทุนในเอกสารลูกค้า ใช้เมื่อถาม "ราคา man-day SA เท่าไหร่", "ส่วนลดเท่านี้ใครอนุมัติ", "margin ขั้นต่ำเท่าไหร่", "ต้องบวก buffer ไหม" หรือเมื่อ skill อื่น (pricing-calc, sales-proposal, deal-approval) ต้องใช้ราคา/กฎกำไร — ไม่ใช่การคิดราคาทั้งดีล (นั่นคือ pricing-calc)
metadata:
  owner: fin-joy
  plugin: core
  layer: core
  version: 1.0.0
  uses: []
  next: [pricing-calc]
  follows: []
---

# pricing-rules — ราคาและกฎกำไรฉบับเดียวของบริษัท

ทำเรื่องเดียว: เป็นแหล่งเดียวของ **ราคา/ต้นทุน** และ **กฎกำไร/ส่วนลด/VAT** ให้คนและ skill อื่นอ้าง
ไม่คิดราคาทั้งดีล (→ `pricing-calc` ของบัญชี) · ไม่ตัดสินอนุมัติดีล (→ `deal-approval` ของ MD)

`SKILL_DIR` = โฟลเดอร์ของ skill นี้

| ไฟล์ | เนื้อหา |
|---|---|
| `references/price-list.csv` | `code,item,unit,unit_price_thb,cost_thb` 16 รายการ (MD-* ค่าแรง, CL-* cloud, LIC-* license, MA-*) ไม่รวม VAT |
| `references/margin-rules.md` | สูตร, buffer 10%, เกณฑ์ margin + ผู้อนุมัติ, สิทธิ์ส่วนลด, VAT, ตัวอย่างตรวจ script |

## ตอบคำถามราคา/กฎ

1. อ่านไฟล์ที่เกี่ยวข้องข้างบน แล้วตอบพร้อมอ้างรหัสรายการ (`MD-SA`) หรือหัวข้อใน margin-rules
2. ตัวเลขที่ต้องคำนวณ (ราคารวม, margin, VAT) **อย่าคิดในหัว** — ส่งต่อ `pricing-calc` หรือใช้สคริปต์ของ skill ที่เรียกอยู่
3. ต้นทุนและ margin เป็นข้อมูลภายใน — ห้ามใส่ในเอกสาร/อีเมลที่ส่งลูกค้า

## สำหรับสคริปต์ของ skill อื่น

สคริปต์ `pricing-calc/scripts/price_calc.py`, `sales-proposal/scripts/price.py`, `deal-approval/scripts/deal_check.py` หา `price-list.csv` ของ skill นี้เองตามลำดับ:
1. `--price-list <path>` ที่ส่งมา
2. ตัวแปร `NOVATECH_PRICE_LIST`
3. ในคลังเดียวกัน `plugins/core/skills/pricing-rules/references/price-list.csv` (เดินขึ้นจากโฟลเดอร์สคริปต์)
4. marketplace ที่ติดตั้งแล้ว `~/.claude/plugins/marketplaces/novatech-skills/plugins/core/...` หรือ cache `~/.claude/plugins/cache/novatech-skills/core/*/skills/pricing-rules/...`

ถ้าสคริปต์บอกว่าหาไม่เจอ ให้ส่ง `--price-list "<SKILL_DIR ของ pricing-rules>/references/price-list.csv"` (ดู "Base directory" ตอนเปิด skill นี้)

## เปลี่ยนราคา/กฎ

แก้ที่ skill นี้ที่เดียวผ่าน PR (CODEOWNER: `fin-joy` + ทีมกลาง) แล้วรันตัวอย่างตรวจท้าย `margin-rules.md` ด้วย `pricing-calc` ให้ได้ตัวเลขเดิม · **ห้ามคัดลอก price-list ไปเก็บใน skill อื่น** (เคยมี 3 สำเนาใน sales/finance/exec)
