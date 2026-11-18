# ราคาและกฎ margin (สรุปสำหรับ sales-proposal)

> สรุปจาก `company-kit/price-list.csv` และ `company-kit/margin-rules.md` v2026.1 (ผู้ดูแล `fin-joy`, มีผล 2026-01-01) · สรุปเมื่อ 2026-11-04
> ถ้ามีไฟล์ต้นฉบับใหม่กว่า ให้ใช้ต้นฉบับ

## 1. ตารางราคา (บาท, ไม่รวม VAT)

| code | รายการ | หน่วย | ราคาขาย | ต้นทุน |
|---|---|---|---|---|
| MD-SA | Solution Architect | man-day | 18,000 | 11,000 |
| MD-PM | Project Manager | man-day | 16,000 | 10,000 |
| MD-DEV-SR | Senior Developer / Tech Lead | man-day | 15,000 | 9,500 |
| MD-DEV | Developer | man-day | 11,000 | 7,000 |
| MD-UX | UX/UI Designer | man-day | 12,000 | 7,500 |
| MD-QA | QA Engineer | man-day | 9,000 | 5,800 |
| MD-DEVOPS | DevOps Engineer | man-day | 14,000 | 9,000 |
| MD-ML | ML Engineer / Data Scientist | man-day | 17,000 | 11,000 |
| CL-S | Cloud Small (TH) 2 vCPU×2 + managed PostgreSQL | เดือน | 25,000 | 18,000 |
| CL-M | Cloud Medium (TH) 4 vCPU×3 + PostgreSQL HA + Redis | เดือน | 45,000 | 32,000 |
| CL-L | Cloud Large (TH) 8 vCPU×4 + PostgreSQL HA + Redis + queue | เดือน | 85,000 | 62,000 |
| LIC-LINE | LINE OA Messaging API | เดือน | 6,000 | 4,500 |
| LIC-APM | Monitoring / APM + log | เดือน | 8,000 | 5,500 |
| LIC-WAF | WAF + DDoS protection | เดือน | 12,000 | 9,000 |
| MA-STD | Maintenance Standard 8x5 (ต่อระบบ) | ปี | 360,000 | 220,000 |
| MA-PREM | Maintenance Premium 24x7 (ต่อระบบ) | ปี | 720,000 | 450,000 |

## 2. สูตร

```
ราคาขายรวม (ไม่รวม VAT) = Σ(จำนวน × ราคาขาย) − ส่วนลด
ต้นทุนรวม               = Σ(จำนวน × ต้นทุน)
Gross margin (%)        = (ราคาขายรวม − ต้นทุนรวม) / ราคาขายรวม × 100   ← คิดหลังหักส่วนลด
VAT                     = ราคาขายรวม × 0.07 ปัด 2 ตำแหน่ง
```

- fixed price: บวก **risk buffer 10%** ของ man-day ทุกบทบาท ไว้ในจำนวนวัน (ไม่แยกบรรทัด)
- ของนอกตาราง: ต้นทุนจริงจากผู้ขาย + อย่างน้อย 20% และเขียนหมายเหตุ

## 3. เกณฑ์

| Gross margin | ผล | ผู้อนุมัติ |
|---|---|---|
| ≥ 25% | ผ่าน | หัวหน้าทีมขาย (sales-nida) |
| 15% – < 25% | ต้องให้ MD อนุมัติ + เหตุผลเชิงกลยุทธ์ | MD (md-somchai) |
| < 15% | ปฏิเสธ ห้ามขอยกเว้น | — |

เป้า margin เฉลี่ยบริษัทปี 2026 = 30%

| ส่วนลด (จากราคา price list) | ใครให้ได้ |
|---|---|
| ≤ 5% | เซลส์เจ้าของดีล |
| > 5% – 10% | หัวหน้าทีมขาย |
| > 10% | MD เท่านั้น และ margin หลังลด ≥ 15% |

- ห้ามลด MA และ cloud hosting · ส่วนลดเป็นบรรทัดแยก "ส่วนลดพิเศษ"
- เอกสารลูกค้าแสดง 3 บรรทัด: `รวมก่อน VAT` → `VAT 7%` → `รวมทั้งสิ้น` · **ห้ามแสดงต้นทุน/margin**

## 4. Benchmark จากดีลธนาคารที่ชนะ (man-day ที่เสนอ)

| | Loan portal 2024 (5 เดือน) | นัดหมายสาขา LINE 2025 (4 เดือน, 40 สาขา) |
|---|---|---|
| SA | 20 | 15 |
| PM | 40 | 30 |
| Senior Dev | 60 | 40 |
| Dev (2 คน) | 120 | 80 |
| UX | 20 | 15 |
| QA | 50 | 35 |
| DevOps | 15 | 10 |
| Hosting | CL-M 12 เดือน | CL-S 12 เดือน + LINE 12 เดือน |
| MA | MA-STD | MA-STD |
| รวมก่อน VAT | 5,020,000 | 3,597,000 |

งวดชำระที่ใช้: 30% เซ็นสัญญา · 40% ผ่าน UAT · 30% go-live · MA / hosting / license เก็บล่วงหน้ารายปี

ข้อสังเกตจากงานจริง: ถ้า TOR รวม hosting + MA ปีแรกไว้ในงบ ให้หักส่วนนี้ออกก่อนแล้วดูว่าเหลืองบแรงงานเท่าไร — มักเป็นตัวกำหนดว่าต้องต่อยอดของเดิม (เช่น booking engine ของ NovaQueue) หรือต้องตัดขอบเขต
