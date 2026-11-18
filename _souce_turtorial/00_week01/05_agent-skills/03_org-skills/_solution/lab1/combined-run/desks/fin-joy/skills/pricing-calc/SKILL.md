---
name: pricing-calc
description: คิดราคาโปรเจกต์และกำไรขั้นต้นให้ Sales จากตารางราคามาตรฐานของโนวาเทค (price-list) ตามกฎกำไร v2026.1 — แตกงานเป็นบรรทัด man-day/cloud/license/MA, บวก risk buffer 10% งาน fixed-price, ลดราคาให้พอดีงบ TOR, ได้ margin % + คำตัดสินตามเกณฑ์ 25%/15% + ผู้อนุมัติ และได้ 2 ไฟล์ (ฉบับภายในมีต้นทุน / ตารางใบเสนอราคาสำหรับลูกค้า ไม่มีต้นทุน) ใช้เมื่อผู้ใช้พูดว่า "คิดราคาโปรเจกต์นี้", "ดีลนี้กำไรเท่าไหร่", "ทำใบเสนอราคา" หรือ /pricing-calc
metadata:
  owner: fin-joy
  layer: personal
  version: 1.0.0
  uses: [customer-data-policy]
  next: [sales-proposal, deal-approval]
  follows: [req-to-spec]
---

# pricing-calc — คิดราคาและกำไรของดีล

ทำเรื่องเดียว: **จากขอบเขตงาน → ตัวเลขราคา ต้นทุน margin และใครอนุมัติ** ไม่เขียน proposal (นั่นคือ `sales-proposal`) และไม่ตัดสินอนุมัติดีล (นั่นคือ `deal-approval`)

ความรู้ที่ต้องใช้อยู่ใน `references/` ครบ ไม่ต้องเปิด company-kit:
- `references/price-list.csv` — ราคาขาย + ต้นทุน 16 รายการ (snapshot ของ company-kit/price-list.csv)
- `references/margin-rules.md` — สูตร, buffer, เกณฑ์ margin, ส่วนลด, VAT, ห้ามโชว์ต้นทุน (สรุป v2026.1)
- `references/estimating-baselines.md` — man-day ของ proposal ธนาคารที่ชนะ ใช้เทียบเวลาประมาณงาน

ถ้ามี `company-kit/price-list.csv` ในเครื่องและใหม่กว่า snapshot ให้ใช้ตัวนั้นผ่าน `--prices` และแจ้งผู้ใช้ว่าราคาเปลี่ยน

## ขั้นตอน

1. **อ่านขอบเขต** (TOR / brief): จดระยะเวลา, งบ (รวม/ไม่รวม VAT? รวม hosting/MA ไหม?), fixed-price ไหม, SLA, integration, ความปลอดภัย, ของที่ไม่อยู่ใน price-list (เช่น pentest ภายนอก)
2. **แตกเป็นบรรทัด** ใน `lines.csv` (`code,qty,note`) — code ต้องมีใน price-list เท่านั้น
   - man-day: ใส่จำนวน **ก่อน buffer** เทียบกับ `estimating-baselines.md` แล้วอธิบายเหตุผลใน note · ถ้ามีตัวเลขจาก SA (`req-to-spec`) ให้ใช้ของ SA
   - recurring ปีแรก: cloud (CL-S/M/L) × 12, LINE/WAF/APM × 12 ถ้าขอบเขตต้องใช้, MA-STD (8x5) หรือ MA-PREM (24x7) ตาม SLA
   - ของนอกตาราง: ไม่ใส่ใน script — คิดแยก = ต้นทุนจริงจากใบเสนอราคาผู้ขาย + บวก ≥ 20% พร้อมหมายเหตุ หรือระบุว่า "ไม่รวม"
3. **คำนวณ** ด้วย script (Python 3 stdlib):
   ```
   python scripts/calc.py lines.csv --fixed-price                    # ราคาตาม price-list
   python scripts/calc.py lines.csv --fixed-price --target 4800000   # ลดให้พอดีงบ
   python scripts/calc.py lines.csv --fixed-price --discount 200000 \
          --out-internal X-internal.md --out-customer X-quote.md
   ```
   script บวก buffer 10% ทุกบทบาท (ปัดขึ้นเป็นวันเต็ม), ไม่ยอมลด MA/cloud, คำนวณ margin หลังส่วนลด, VAT 7% ปัด 2 ตำแหน่ง, บอกผลตามเกณฑ์และผู้อนุมัติส่วนลด
4. **ตรวจผล** ตามเกณฑ์: ≥ 25% ผ่าน (sales-nida) · 15–<25% ต้อง MD · < 15% **reject ห้ามส่ง** · ส่วนลด ≤5% เซลส์ / ≤10% หัวหน้าทีมขาย / >10% MD
   - ถ้าราคาเกินงบ: แสดงทั้ง "ราคาเต็ม" และ "ราคาเสนอ" พร้อมจุดกันชน (ราคาที่ margin แตะ 25% และ 15% = ต้นทุน ÷ 0.75 และ ÷ 0.85)
   - ห้ามแอบลดในราคาต่อหน่วยหรือตัด man-day เพื่อให้ตัวเลขสวย — ลดเป็นบรรทัด "ส่วนลดพิเศษ" เท่านั้น
5. **ส่งมอบ 2 ไฟล์** ใน `work/`
   - `<deal>-pricing-internal.md` — มีต้นทุน margin สมมติฐาน man-day และ **"จุดที่ตัดสินใจเอง / ต้องยืนยัน"** (ขนาด cloud, MA 8x5 vs 24x7, ของที่ไม่รวม, ที่มาของ man-day)
   - `<deal>-quote-for-sales.md` — ตารางราคา 3 บรรทัดท้าย (`รวมก่อน VAT` → `VAT 7%` → `รวมทั้งสิ้น`) **ไม่มีต้นทุน/margin**
   - เก็บ `lines.csv` ไว้คู่กันเพื่อคำนวณซ้ำได้

## กติกาที่ห้ามพลาด

- ราคาและต้นทุนมาจาก price-list เท่านั้น ห้ามเดา code ที่ไม่มี (script จะหยุด)
- ห้ามแสดงต้นทุน/margin ในเอกสารที่ส่งลูกค้า
- ข้อมูลลูกค้า (เบอร์มือถือผู้ประสานงานใน TOR, เลขบัตร ฯลฯ) **ไม่คัดลอก** ลงไฟล์ใด ๆ — ตาม `customer-data-policy`
- ตัวเลข man-day ที่บัญชีประมาณเองต้องเขียนว่า "รอ SA ยืนยัน" เสมอ

## ส่งต่อ

- ตารางลูกค้า → `sales-proposal` (sales-nida) วางในหัวข้อราคา
- margin < 25% หรือส่วนลด > 10% → สรุปดีลส่ง `deal-approval` (md-somchai)
