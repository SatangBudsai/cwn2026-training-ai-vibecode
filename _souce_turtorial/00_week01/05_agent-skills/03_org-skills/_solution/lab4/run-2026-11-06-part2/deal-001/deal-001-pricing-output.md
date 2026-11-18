## ตารางราคาสำหรับลูกค้า (ไม่รวม VAT)

| รหัส | รายการ | จำนวน | ราคาต่อหน่วย | รวม (บาท) |
|---|---|---|---|---|
| MD-SA | Solution Architect (SA) | 17 man-day | 18,000 | 306,000 |
| MD-PM | Project Manager | 39 man-day | 16,000 | 624,000 |
| MD-DEV-SR | Senior Developer / Tech Lead | 50 man-day | 15,000 | 750,000 |
| MD-DEV | Developer | 88 man-day | 11,000 | 968,000 |
| MD-UX | UX/UI Designer | 14 man-day | 12,000 | 168,000 |
| MD-QA | QA Engineer | 42 man-day | 9,000 | 378,000 |
| MD-DEVOPS | DevOps Engineer | 16 man-day | 14,000 | 224,000 |
| MD-ML | ML Engineer / Data Scientist | 31 man-day | 17,000 | 527,000 |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis (production ปีแรก) | 12 month | 45,000 | 540,000 |
| CL-S | Cloud hosting Small (Thailand region) 2 vCPU x2 + managed PostgreSQL (dev/UAT ระหว่างโครงการ) | 6 month | 25,000 | 150,000 |
| LIC-LINE | LINE OA Messaging API (plan + push quota) (ปีแรก) | 12 month | 6,000 | 72,000 |
| LIC-APM | Monitoring / APM + log management license (ปีแรก) | 12 month | 8,000 | 96,000 |
| LIC-WAF | Web Application Firewall + DDoS protection (ปีแรก) | 12 month | 12,000 | 144,000 |
| MA-STD | Maintenance Standard 8x5 (per system) (ปีแรก) | 1 year | 360,000 | 360,000 |
| | ส่วนลดพิเศษ | | | −507,000 |
| | **รวมก่อน VAT** | | | **4,800,000** |
| | VAT 7% | | | 336,000 |
| | **รวมทั้งสิ้น** | | | **5,136,000** |

## สรุปภายใน (ห้ามใส่ในเอกสารลูกค้า)

- ราคาตาม price-list 5,307,000 · ส่วนลด 507,000 (11.9% ของยอดที่ลดได้ 4,257,000 · 9.6% ของราคาเต็ม)
- ต้นทุน 3,441,600 · กำไรขั้นต้น 1,358,400 · **margin 28.3%**
- เกณฑ์ margin: ผ่านเกณฑ์ 25% แต่ต่ำกว่าเป้าบริษัท 30%
- **ผู้อนุมัติ: MD (`md-somchai`)** เพราะส่วนลดเกิน 10% และเป็นลูกค้าธนาคารมูลค่าเกิน 1 ล้านบาท ตาม `deal-001-finance-check.md` หัวหน้าทีมขายอนุมัติเองไม่ได้
- เทียบงบ 4,800,000: อยู่ในงบ เหลือ 0

- **ยังไม่ใช่ตัวเลขสุดท้าย:** `deal-001-sa-review.md` เสนอ 337 วัน ส่วนลด 1,050,000 (21.9%) ต้นทุน 3,784,100 margin 21.2% รอ `fin-joy` คิดใหม่จาก `deal-001-sa-recalc-input.json` และ MD ตัดสิน ตารางด้านบนจึงยังเป็นชุด 297 วัน

> แก้สรุปส่วนนี้ด้วยมือตาม `approval.md` ส่วนตารางราคาตรงกับผลจาก `price.py` · `price.py` ยังคิดส่วนลดจากราคาเต็มและจะพิมพ์ผู้อนุมัติเดิม ถ้ารันใหม่ต้องแก้ซ้ำ
