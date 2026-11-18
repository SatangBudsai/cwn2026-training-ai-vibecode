# ฐานเทียบ man-day จาก proposal ที่ชนะ (ใช้ประมาณงานใหม่)

> สรุปจาก `company-kit/won-proposals/` · ตัวเลขคือจำนวนที่ใส่ในใบเสนอราคา (ทีมละ 1 คน ยกเว้น Dev 2 คน)

| บทบาท (code) | สยามรุ่งเรือง 2024 Loan Tracking Portal (5 เดือน) | เกษตรไทย 2025 Branch Appointment LINE+เว็บ 40 สาขา (4 เดือน) |
|---|---:|---:|
| SA (MD-SA) | 20 | 15 |
| PM (MD-PM) | 40 | 30 |
| Senior Dev (MD-DEV-SR) | 60 | 40 |
| Dev (MD-DEV) | 120 | 80 |
| UX (MD-UX) | 20 | 15 |
| QA (MD-QA) | 50 | 35 |
| DevOps (MD-DEVOPS) | 15 | 10 |
| **รวม man-day** | **325** | **225** |
| Cloud | CL-M × 12 | CL-S × 12 |
| License | — | LIC-LINE × 12 |
| MA | MA-STD 1 ปี | MA-STD 1 ปี |
| **รวมก่อน VAT** | **5,020,000** | **3,597,000** |

ลักษณะงาน
- สยามรุ่งเรือง: portal ลูกค้า + console เจ้าหน้าที่ (SSO AD) + แจ้งเตือน SMS/อีเมล + integration ระบบ LOS ของธนาคาร + pentest ของธนาคาร
- เกษตรไทย: จอง/เลื่อน/ยกเลิกผ่าน LIFF + เว็บ, branch console, slot lock Redis, dashboard — ต่อมากลายเป็นผลิตภัณฑ์ **NovaQueue** (ต่อยอดได้ ลดงาน UX/Dev ของงานจองคิวใหม่)
- ทั้งคู่ SLA: Sev 1 ตอบ 30 นาที, uptime ≥ 99.5% แต่ขาย **MA-STD (8x5)**

แนวปรับเมื่อเทียบ
- PM ≈ 7–8 man-day ต่อเดือนของโครงการ
- เพิ่มงาน: integration ระบบธนาคารแบบ mTLS / ระบบเดิมเพิ่มเครื่อง → +SA, +Senior Dev, +DevOps
- มี ML: เพิ่มบรรทัด MD-ML (มีโมเดลต้นแบบแล้ว ≈ 25 วัน, เริ่มใหม่ทั้งหมดมากกว่านี้)
- ขยายจำนวนสาขา/rollout: +PM, +QA
- ตัวเลขเหล่านี้ยัง **ไม่รวม buffer 10%** งาน fixed-price (script บวกให้)
- ทุกตัวเลขที่บัญชีประมาณเองต้องให้ SA ยืนยันก่อนยื่น
