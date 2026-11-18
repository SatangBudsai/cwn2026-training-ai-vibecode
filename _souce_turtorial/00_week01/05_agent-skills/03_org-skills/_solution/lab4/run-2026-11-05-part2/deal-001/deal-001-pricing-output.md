# deal-001 — ผลคิดราคา รอบ 2 ฉบับ B (เอกสารภายใน ห้ามส่งลูกค้า)

> สร้างจาก `sales-proposal/scripts/price.py` + `deal-001-pricing-input.json` · price-list ของ `pricing-rules` (core) · 5 พ.ย. 2026
> ฉบับ B = man-day ตามขอบเขต (286 md ก่อน buffer) + ส่วนลดพิเศษให้เท่างบ — ตรงกับ `deal-001-B-pricing-internal.md` ของบัญชี (fin-joy) ทุกบรรทัด
> ฉบับ A รอบแรก (237 md, 4,766,000) เลิกใช้ — ดู `deal-001-A-*` ถ้าต้องเทียบ
> ส่วน "ตารางราคาสำหรับลูกค้า" คัดลอกไปหัวข้อ 7 ของ proposal แล้ว ส่วน "สรุปภายใน" ห้ามออกนอกบริษัท

## ตารางราคาสำหรับลูกค้า (ไม่รวม VAT)

| รหัส | รายการ | จำนวน | ราคาต่อหน่วย | รวม (บาท) |
|---|---|---|---|---|
| MD-SA | Solution Architect (SA) | 17 man-day | 18,000 | 306,000 |
| MD-PM | Project Manager | 44 man-day | 16,000 | 704,000 |
| MD-DEV-SR | Senior Developer / Tech Lead | 61 man-day | 15,000 | 915,000 |
| MD-DEV | Developer | 100 man-day | 11,000 | 1,100,000 |
| MD-UX | UX/UI Designer | 14 man-day | 12,000 | 168,000 |
| MD-QA | QA Engineer | 40 man-day | 9,000 | 360,000 |
| MD-DEVOPS | DevOps Engineer | 20 man-day | 14,000 | 280,000 |
| MD-ML | ML Engineer / Data Scientist | 22 man-day | 17,000 | 374,000 |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis (ปีแรก) | 12 month | 45,000 | 540,000 |
| LIC-LINE | LINE OA Messaging API (plan + push quota) (ปีแรก) | 12 month | 6,000 | 72,000 |
| LIC-WAF | Web Application Firewall + DDoS protection (ปีแรก) | 12 month | 12,000 | 144,000 |
| LIC-APM | Monitoring / APM + log management license (ปีแรก) | 12 month | 8,000 | 96,000 |
| MA-STD | Maintenance Standard 8x5 (per system) (ปีแรก) | 1 year | 360,000 | 360,000 |
| | ส่วนลดพิเศษ | | | −619,000 |
| | **รวมก่อน VAT** | | | **4,800,000** |
| | VAT 7% | | | 336,000 |
| | **รวมทั้งสิ้น** | | | **5,136,000** |

## สรุปภายใน (ห้ามใส่ในเอกสารลูกค้า)

- ราคาตาม price-list 5,419,000 · ส่วนลด 619,000 (11.4% ของราคาเต็ม)
- ต้นทุน 3,497,500 · กำไรขั้นต้น 1,302,500 · **margin 27.1%**
- เกณฑ์ margin: ผ่าน — หัวหน้าทีมขายอนุมัติได้
- ผู้อนุมัติส่วนลด: MD เท่านั้น
- เทียบงบ 4,800,000: อยู่ในงบ เหลือ 0

## หมายเหตุภายใน
- สคริปต์แสดง "หัวหน้าทีมขายอนุมัติได้" จากเกณฑ์ margin อย่างเดียว — **ผู้อนุมัติจริงของดีลนี้คือ MD** (ลูกค้าธนาคาร, มูลค่า ≥ 1M, ส่วนลด 13.7% ของยอดที่ลดได้ > 10%)
- ส่วนลด 619,000 = 11.4% ของราคาเต็ม / 13.7% ของยอดที่ลดได้ (ไม่รวม MA/CL ตาม margin-rules) · หักจากค่าพัฒนาเท่านั้น ไม่ลด MA/CL
- ยอดงวด: ค่าพัฒนา 4,207,000 − 619,000 = 3,588,000 → 1,076,400 / 1,435,200 / 1,076,400 · recurring 1,212,000
