# deal-001 · คิดราคาและกำไร — ธนาคารนครหลวงพัฒนา (TOR NLP-PROC-2026-114)

> **เอกสารภายใน — มีต้นทุนและ margin ห้ามส่งลูกค้า** (margin-rules ข้อ 5)
> คิดราคาโดย: จอย พัฒนสิน (`fin-joy`) · 2026-11-04 · ส่งถึง: ทีมขาย (`sales-nida`) · กำหนดยื่นข้อเสนอ 13 พ.ย. 2026 16:00
> แหล่ง: `company-kit/price-list.csv`, `margin-rules.md` v2026.1, `deal-001/tor-bank-queue.md`, `won-proposals/` (2 ฉบับ)
> ไฟล์ตั้งต้นที่คำนวณซ้ำได้: `work/deal-001-lines.csv` → `python .claude/skills/pricing-calc/scripts/calc.py work/deal-001-lines.csv --fixed-price --target 4800000`

## สรุปสั้นสำหรับเซลส์

| | ตามราคา price-list | **เสนอ (ลดให้พอดีงบ TOR)** |
|---|---:|---:|
| รวมก่อน VAT | 5,293,000 | **4,800,000** |
| ส่วนลดพิเศษ | 0 | 493,000 (9.31%) |
| ต้นทุนรวม | 3,416,700 | 3,416,700 |
| กำไรขั้นต้น | 1,876,300 | 1,383,300 |
| **Gross margin** | 35.45% | **28.82%** |
| ผลตามเกณฑ์ | ผ่าน | **ผ่าน (≥ 25%)** |
| ผู้อนุมัติ | sales-nida | **sales-nida** (ทั้ง margin และส่วนลด 5–10%) |
| VAT 7% / รวมทั้งสิ้น | 370,510 / 5,663,510 | 336,000 / 5,136,000 |

- งบ TOR = **ไม่เกิน 4,800,000 บาท ไม่รวม VAT** รวมค่าพัฒนา + hosting ปีแรก + MA ปีแรก → ราคา price-list เกินงบ 493,000 บาท ถ้ายื่นราคาเต็มเสี่ยงตกรอบ
- เสนอยื่น **4,800,000** โดยมีบรรทัด "ส่วนลดพิเศษ" แยก ลดจากค่าแรง/license เท่านั้น (ห้ามลด MA, cloud)
- **กันชน:** ถ้าเซลส์อยากลดเพิ่ม ส่วนลดเกิน 10% (> 529,300) ต้อง MD · margin แตะ 25% ที่ราคาสุทธิ 4,555,600 · แตะ 15% (เส้น reject) ที่ 4,019,647

## สมมติฐานการประมาณ man-day (ก่อน buffer)

อ้างอิงงานที่ชนะ: เกษตรไทย 2025 (จองคิว LINE/เว็บ 40 สาขา 4 เดือน) = 225 man-day · สยามรุ่งเรือง 2024 (portal + integration ระบบธนาคาร + pentest 5 เดือน) = 325 man-day
deal-001 ใหญ่กว่าเกษตรไทย (120 สาขา, core banking mTLS, Q-Matic, SSO Entra ID, ML พยากรณ์, audit 2 ปี) แต่ **ต่อยอด booking engine/หน้าจอจากเกษตรไทย** และโมเดล ML ต้นแบบ r03 (MAPE 19.8) ได้ → ฐาน 275 man-day, หลังบวก buffer 10% (fixed-price, ปัดขึ้นเป็นวันเต็ม) = **305 man-day**

## รายละเอียด — ราคาตาม price-list

| รหัส | รายการ | จำนวนฐาน | จำนวนคิดเงิน | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | หมายเหตุ |
|---|---|---:|---:|---|---:|---:|---:|---:|---|
| MD-SA | Solution Architect (SA) | 20 | 22 | man-day | 18,000 | 396,000 | 11,000 | 242,000 | core banking mTLS + Q-Matic + SSO Entra + ML architecture |
| MD-PM | Project Manager | 40 | 44 | man-day | 16,000 | 704,000 | 10,000 | 440,000 | 6 เดือน + นำร่อง 10 สาขา -> 120 สาขา |
| MD-DEV-SR | Senior Developer / Tech Lead | 45 | 50 | man-day | 15,000 | 750,000 | 9,500 | 475,000 | tech lead: integration core banking / Q-Matic / slot lock |
| MD-DEV | Developer | 85 | 94 | man-day | 11,000 | 1,034,000 | 7,000 | 658,000 | web + LIFF + branch console + walk-in + dashboard/Excel + audit log |
| MD-UX | UX/UI Designer | 10 | 11 | man-day | 12,000 | 132,000 | 7,500 | 82,500 | ต่อยอดหน้าจอจากงานเกษตรไทย |
| MD-QA | QA Engineer | 35 | 39 | man-day | 9,000 | 351,000 | 5,800 | 226,200 | UAT + retest หลัง pentest + rollout 120 สาขา |
| MD-DEVOPS | DevOps Engineer | 15 | 17 | man-day | 14,000 | 238,000 | 9,000 | 153,000 | mTLS + HA + monitoring + เก็บ audit log 2 ปี |
| MD-ML | ML Engineer / Data Scientist | 25 | 28 | man-day | 17,000 | 476,000 | 11,000 | 308,000 | ต่อยอดโมเดล r03 + ข้อมูลจริง 24 เดือน + pipeline รายคืน + monitoring/rollback |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis | 12 | 12 | month | 45,000 | 540,000 | 32,000 | 384,000 | hosting ปีแรก |
| LIC-LINE | LINE OA Messaging API (plan + push quota) | 12 | 12 | month | 6,000 | 72,000 | 4,500 | 54,000 | LINE OA ปีแรก |
| LIC-WAF | Web Application Firewall + DDoS protection | 12 | 12 | month | 12,000 | 144,000 | 9,000 | 108,000 | WAF + DDoS ปีแรก (ธนาคารเน้นความปลอดภัย) |
| LIC-APM | Monitoring / APM + log management license | 12 | 12 | month | 8,000 | 96,000 | 5,500 | 66,000 | APM + log ปีแรก (SLA 99.5% / ติดตามความแม่นยำ) |
| MA-STD | Maintenance Standard 8x5 (per system) | 1 | 1 | year | 360,000 | 360,000 | 220,000 | 220,000 | MA ปีแรก 8x5 |
| | **รวมตาม price-list** | | | | | **5,293,000** | | **3,416,700** | |

- ราคาขายสุทธิ (ก่อน VAT): **5,293,000** บาท
- ต้นทุนรวม: **3,416,700** บาท
- กำไรขั้นต้น: **1,876,300** บาท
- Gross margin (หลังส่วนลด): **35.45%** -> ผ่าน (>= 25%) -> หัวหน้าทีมขาย sales-nida อนุมัติ
- ส่วนลด 0% -> ผู้อนุมัติส่วนลด: -
- VAT 7%: 370,510 · รวมทั้งสิ้น: 5,663,510 บาท
- risk buffer 10% man-day: บวกแล้ว (ปัดขึ้นเป็นวันเต็ม)

## รายละเอียด — ราคาที่เสนอ (target = งบ TOR)

| รหัส | รายการ | จำนวนฐาน | จำนวนคิดเงิน | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | หมายเหตุ |
|---|---|---:|---:|---|---:|---:|---:|---:|---|
| MD-SA | Solution Architect (SA) | 20 | 22 | man-day | 18,000 | 396,000 | 11,000 | 242,000 | core banking mTLS + Q-Matic + SSO Entra + ML architecture |
| MD-PM | Project Manager | 40 | 44 | man-day | 16,000 | 704,000 | 10,000 | 440,000 | 6 เดือน + นำร่อง 10 สาขา -> 120 สาขา |
| MD-DEV-SR | Senior Developer / Tech Lead | 45 | 50 | man-day | 15,000 | 750,000 | 9,500 | 475,000 | tech lead: integration core banking / Q-Matic / slot lock |
| MD-DEV | Developer | 85 | 94 | man-day | 11,000 | 1,034,000 | 7,000 | 658,000 | web + LIFF + branch console + walk-in + dashboard/Excel + audit log |
| MD-UX | UX/UI Designer | 10 | 11 | man-day | 12,000 | 132,000 | 7,500 | 82,500 | ต่อยอดหน้าจอจากงานเกษตรไทย |
| MD-QA | QA Engineer | 35 | 39 | man-day | 9,000 | 351,000 | 5,800 | 226,200 | UAT + retest หลัง pentest + rollout 120 สาขา |
| MD-DEVOPS | DevOps Engineer | 15 | 17 | man-day | 14,000 | 238,000 | 9,000 | 153,000 | mTLS + HA + monitoring + เก็บ audit log 2 ปี |
| MD-ML | ML Engineer / Data Scientist | 25 | 28 | man-day | 17,000 | 476,000 | 11,000 | 308,000 | ต่อยอดโมเดล r03 + ข้อมูลจริง 24 เดือน + pipeline รายคืน + monitoring/rollback |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis | 12 | 12 | month | 45,000 | 540,000 | 32,000 | 384,000 | hosting ปีแรก |
| LIC-LINE | LINE OA Messaging API (plan + push quota) | 12 | 12 | month | 6,000 | 72,000 | 4,500 | 54,000 | LINE OA ปีแรก |
| LIC-WAF | Web Application Firewall + DDoS protection | 12 | 12 | month | 12,000 | 144,000 | 9,000 | 108,000 | WAF + DDoS ปีแรก (ธนาคารเน้นความปลอดภัย) |
| LIC-APM | Monitoring / APM + log management license | 12 | 12 | month | 8,000 | 96,000 | 5,500 | 66,000 | APM + log ปีแรก (SLA 99.5% / ติดตามความแม่นยำ) |
| MA-STD | Maintenance Standard 8x5 (per system) | 1 | 1 | year | 360,000 | 360,000 | 220,000 | 220,000 | MA ปีแรก 8x5 |
| | **รวมตาม price-list** | | | | | **5,293,000** | | **3,416,700** | |
| | ส่วนลดพิเศษ (9.31% ของราคา price-list) | | | | | −493,000 | | | ลดจากค่าแรง/license เท่านั้น |

- ราคาขายสุทธิ (ก่อน VAT): **4,800,000** บาท
- ต้นทุนรวม: **3,416,700** บาท
- กำไรขั้นต้น: **1,383,300** บาท
- Gross margin (หลังส่วนลด): **28.82%** -> ผ่าน (>= 25%) -> หัวหน้าทีมขาย sales-nida อนุมัติ
- ส่วนลด 9.31% -> ผู้อนุมัติส่วนลด: หัวหน้าทีมขาย (sales-nida)
- VAT 7%: 336,000 · รวมทั้งสิ้น: 5,136,000 บาท
- risk buffer 10% man-day: บวกแล้ว (ปัดขึ้นเป็นวันเต็ม)

## จุดที่ตัดสินใจเอง / ต้องยืนยันก่อนยื่น

1. **man-day ทุกบทบาท** เป็นค่าประมาณของบัญชีจากงานเทียบเคียง → ควรให้ SA (`sa-ton`, req-to-spec) ยืนยันก่อนยื่น ถ้า SA ได้ตัวเลขต่างไป รัน script ใหม่ได้ทันที
2. **Cloud = CL-M** (HA + Redis) ไม่ใช่ CL-L · 120 สาขาเล็กกว่า NovaQueue v2 ที่รันอยู่ ถ้า SA/DevOps ต้องการ queue แยก (CL-L) ราคาเพิ่ม +480,000 / ต้นทุน +360,000 → ถ้ายังยื่น 4.8M ส่วนลดจะเป็น 16.9% และ margin เหลือ 21.3% → ต้อง MD อนุมัติทั้งคู่
3. **MA = MA-STD 8x5** ตาม proposal ธนาคารที่ชนะ 2 ฉบับ (Sev 1 ตอบ 30 นาทีในเวลาทำการ) · ถ้าธนาคารตีความ Sev 1 30 นาทีเป็น 24x7 ต้องใช้ MA-PREM (+360,000 ราคา / +230,000 ต้นทุน) → ถ้ายังยื่น 4.8M ส่วนลด 15.1% และ margin 24.0% → ต้อง MD · ควรถามลูกค้าให้ชัดก่อน
4. **ใส่ WAF + APM** เพราะ TOR เน้นความปลอดภัย (ธปท./PDPA, pentest) และต้องติดตามความแม่นยำโมเดล/uptime 99.5% · ถ้าธนาคารมี WAF ของตัวเองตัดได้ (−144,000)
5. **Penetration test โดยผู้ทดสอบอิสระที่ธนาคารกำหนด** ไม่มีใน price-list ถือว่า **ธนาคารเป็นผู้จ่าย** · ถ้าต้องให้เราจ่าย ต้องเอาใบเสนอราคาผู้ทดสอบมาบวก ≥ 20% (margin-rules ข้อ 1) ซึ่งจะเกินงบ
6. **ส่วนลด 493,000 (9.31%)** = ลดให้พอดีงบพอดี ไม่ได้ต่ำกว่างบเผื่อแข่งราคา · การลดเพิ่มเป็นการตัดสินใจของเซลส์/MD
7. ระยะเวลา 6 เดือน + MA เริ่มหลัง go-live → ช่วง hosting 12 เดือนจะคร่อมช่วงพัฒนา ถือว่า "ปีแรก" ตาม TOR

> หมายเหตุ PDPA: TOR มีเบอร์มือถือผู้ประสานงานของธนาคาร — **ไม่คัดลอก** ลงเอกสารนี้หรือใบเสนอราคา (customer-data-policy ข้อ 2)
