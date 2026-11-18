# deal-001 — ผลคิดราคา (เอกสารภายใน ห้ามส่งลูกค้า)

> สร้างจาก `sales-proposal/scripts/price.py` + `deal-001-pricing-input.json` · price-list ของ `pricing-rules` (core) · 5 พ.ย. 2026
> ส่วน "ตารางราคาสำหรับลูกค้า" คัดลอกไปหัวข้อ 7 ของ proposal แล้ว ส่วน "สรุปภายใน" ห้ามออกนอกบริษัท

## ตารางราคาสำหรับลูกค้า (ไม่รวม VAT)

| รหัส | รายการ | จำนวน | ราคาต่อหน่วย | รวม (บาท) |
|---|---|---|---|---|
| MD-SA | Solution Architect (SA) | 17 man-day | 18,000 | 306,000 |
| MD-PM | Project Manager | 33 man-day | 16,000 | 528,000 |
| MD-DEV-SR | Senior Developer / Tech Lead | 39 man-day | 15,000 | 585,000 |
| MD-DEV | Developer | 77 man-day | 11,000 | 847,000 |
| MD-UX | UX/UI Designer | 11 man-day | 12,000 | 132,000 |
| MD-QA | QA Engineer | 33 man-day | 9,000 | 297,000 |
| MD-DEVOPS | DevOps Engineer | 14 man-day | 14,000 | 196,000 |
| MD-ML | ML Engineer / Data Scientist | 39 man-day | 17,000 | 663,000 |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis (ปีแรก) | 12 month | 45,000 | 540,000 |
| LIC-LINE | LINE OA Messaging API (plan + push quota) (ปีแรก) | 12 month | 6,000 | 72,000 |
| LIC-WAF | Web Application Firewall + DDoS protection (ปีแรก) | 12 month | 12,000 | 144,000 |
| LIC-APM | Monitoring / APM + log management license (ปีแรก) | 12 month | 8,000 | 96,000 |
| MA-STD | Maintenance Standard 8x5 (per system) (ปีแรก) | 1 year | 360,000 | 360,000 |
| | **รวมก่อน VAT** | | | **4,766,000** |
| | VAT 7% | | | 333,620 |
| | **รวมทั้งสิ้น** | | | **5,099,620** |

## สรุปภายใน (ห้ามใส่ในเอกสารลูกค้า)

- ราคาตาม price-list 4,766,000 · ส่วนลด 0 (0.0% ของราคาเต็ม)
- ต้นทุน 3,087,400 · กำไรขั้นต้น 1,678,600 · **margin 35.2%**
- เกณฑ์ margin: ผ่าน — หัวหน้าทีมขายอนุมัติได้
- ผู้อนุมัติส่วนลด: เซลส์เจ้าของดีล
- เทียบงบ 4,800,000: อยู่ในงบ เหลือ 34,000
