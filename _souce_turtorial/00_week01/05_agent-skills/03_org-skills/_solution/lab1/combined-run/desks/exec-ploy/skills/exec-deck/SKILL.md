---
name: exec-deck
description: ทำสไลด์ประชุมผู้บริหารต้นเดือนของโนวาเทค (HTML 16:9 + PDF) จาก monthly-kpi.csv ให้ MD อ่านจบใน 5 นาที — 7 หน้าตามโครงบังคับของ brand guide (ปก, สรุป 3 บรรทัด ดี/น่าห่วง/ต้องตัดสินใจ, การเงิน, pipeline + ดีลรออนุมัติ, ส่งมอบ + เหตุขัดข้อง, คน, เรื่องที่ขอให้ MD ตัดสิน) สีผ่านเป้า Teal ต่ำกว่าเป้า Spark Orange ไม่เกิน 1 จุดต่อหน้า ใช้เมื่อผู้ใช้พูดว่า "ทำสไลด์ประชุมผู้บริหารเดือนนี้", "สรุป KPI เดือนที่แล้วเป็นสไลด์", "เตรียม deck ให้ MD" หรือ /exec-deck
metadata:
  owner: exec-ploy
  layer: personal
  version: 1.0.0
  uses: [customer-data-policy]
  follows: [pipeline-review, cost-headcount-review, tech-risk-review]
  next: [deal-approval]
---

# exec-deck — สไลด์ประชุมผู้บริหารต้นเดือน

เป้าหมายเดียว: MD เปิดแล้วรู้ใน 5 นาทีว่า **อะไรดี อะไรน่าห่วง และต้องตัดสินอะไรวันนี้**

## Input
- `monthly-kpi.csv` (คอลัมน์ `metric,unit,<YYYY-MM>...,target_monthly,note`) — ในบริษัทอยู่ที่ `company-kit/monthly-kpi.csv`
- (ถ้ามี) สรุปดีลที่ส่งถึง MD เดือนนี้ เช่น `company-kit/deal-summaries/*.md` — ใช้เฉพาะ ลูกค้า มูลค่า margin ส่วนลด ความเสี่ยงหลัก เส้นตาย
- กติกาแบรนด์และความหมายของ KPI สรุปไว้แล้วใน `references/` — ไม่ต้องเปิด brand guide ฉบับเต็ม

## ขั้นตอน
1. **ตั้งเดือน**: ประชุมเดือน N ใช้ข้อมูลเดือน N-1 (`month`) เทียบเดือน N-2 (`prev_month`) ถามวันประชุมถ้าผู้ใช้ไม่บอก (ไม่รู้จริง ๆ ใช้วันนี้แล้วแจ้งว่าสมมติ)
2. **อ่านตัวเลข** ตาม `references/kpi-data.md`: เทียบเป้า (ระวังตัวที่ "น้อยดี"), เทียบเดือนก่อน, อ่าน `note` เพื่อหาสาเหตุ
3. **เขียน `content.json`** ใน `work/` ตามรูปแบบ `assets/content-example.json`
   - หัวสไลด์ = ประโยคข้อสรุป มีตัวเลข (เช่น "รายได้ ต.ค. 9.12 ล้านบาท ผ่านเป้า แต่กำไรขั้นต้นลดเหลือ 27.1%")
   - สรุป 3 บรรทัด: ดี / น่าห่วง / ต้องตัดสินใจ — บรรทัดละประโยคเดียว
   - bullet ≤ 3 ต่อหน้า, เรื่องให้ MD ตัดสิน ≤ 4 เรื่อง เรียงตามเส้นตาย (เรื่องแรกได้สีส้ม)
   - เรื่องให้ตัดสิน: เสนอ "ทางเลือก" ไม่ตัดสินแทน MD
4. **สร้างไฟล์**: `python <skill>/scripts/build_deck.py --kpi <monthly-kpi.csv> --content work/content.json --out work/`
   ได้ `work/<file_stem>.html` + `.pdf` (PDF พิมพ์ด้วย Edge/Chrome headless; ไม่มีเบราว์เซอร์ → เปิด HTML แล้ว Print เป็น PDF)
   สคริปต์ลงสีการ์ด KPI เอง และ warn ถ้า bullet/เรื่องตัดสินเกิน
5. **ตรวจก่อนส่ง** (เช็กลิสต์ด้านล่าง) แล้วสรุปให้ผู้ใช้: ไฟล์ที่ได้ + จุดที่สมมติเอง

## เช็กลิสต์ก่อนส่ง
- [ ] 7 หน้า เรียงตามโครงบังคับ, ไม่เกิน 6 บรรทัดต่อหน้า
- [ ] ตัวเลขทุกตัวตรงกับ CSV (ทศนิยม %, หน่วยล้านบาท, "ไม่รวม VAT")
- [ ] Spark Orange ไม่เกิน 1 จุดต่อหน้า, ไม่มีแดงสด ไม่มี gradient ไม่มีอีโมจิ
- [ ] เขียน "โนวาเทค"/"Novatech" ถูก, ไม่มีคำโอ้อวด ("ดีที่สุด", "100%")
- [ ] ไม่มีเบอร์มือถือ / เลขบัตร / เลขบัญชีลูกค้า (ตาม `customer-data-policy`)
- [ ] โลโก้ขาวบนปก, โลโก้ Navy มุมขวาล่างทุกหน้าอื่น

## ไฟล์ใน skill
- `scripts/build_deck.py` — render HTML + PDF (Python standard library เท่านั้น)
- `references/brand-rules.md` — สี ฟอนต์ น้ำเสียง โครงสไลด์ โลโก้ (สรุปจาก brand guide v3.2)
- `references/kpi-data.md` — ความหมาย KPI แต่ละตัว ทิศทางดี/แย่ ไปอยู่หน้าไหน
- `assets/logo.svg` — โลโก้ Novatech, `assets/content-example.json` — ตัวอย่าง content (ประชุม พ.ย. 2026)
