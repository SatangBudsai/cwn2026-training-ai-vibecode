# คิดราคา (ภายใน) — ระบบจองคิวสาขาและพยากรณ์ปริมาณคิว (TOR NLP-PROC-2026-114) — ฉบับ B (เข้างบ 4.8M)

> ⚠️ **เอกสารภายใน** มีต้นทุนและ margin — ห้ามส่งลูกค้า
> ลูกค้า: ธนาคารนครหลวงพัฒนา จำกัด (มหาชน) — ฝ่ายพัฒนาช่องทางสาขา · คิดโดย จอย พัฒนสิน (fin-joy) · 2026-11-03 · fixed-price (บวก buffer 10% ใน man-day แล้ว)

## ผลสรุป

| | |
|---|---|
| ราคาขายก่อน VAT (หลังส่วนลด) | **4,800,000** บาท |
| ต้นทุนรวม | 3,497,500 บาท |
| กำไรขั้นต้น | 1,302,500 บาท |
| **Gross margin** | **27.1%** → ✅ ผ่าน |
| **ผู้อนุมัติ (เข้มสุดของ margin + ส่วนลด)** | **MD (md-somchai)** |
| ส่วนลด | 619,000 บาท = 13.7% ของยอดที่ลดได้ → MD เท่านั้น และ margin หลังลดต้อง ≥ 15% |
| VAT 7% / รวมทั้งสิ้น | 336,000 / 5,136,000 บาท |
| งบลูกค้า (ก่อน VAT) | 4,800,000 บาท · ใช้ 100.0% |

man-day รวม 318 วัน (ประเมินก่อน buffer 286 วัน)

## รายการ

| รหัส | รายการ | ประเมิน | จำนวน (รวม buffer) | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | margin บรรทัด | หมายเหตุ |
|---|---|--:|--:|---|--:|--:|--:|--:|--:|---|
| MD-SA | Solution Architect (SA) | 15 | 17 | man-day | 18,000 | 306,000 | 11,000 | 187,000 | 38.9% | workshop เดือน 1, ตอบ open questions, ADR, คุม integration core/Q-Matic |
| MD-PM | Project Manager | 40 | 44 | man-day | 16,000 | 704,000 | 10,000 | 440,000 | 37.5% | ~ครึ่งเวลา 6 เดือน + นำร่อง 10 สาขา/rollout 120 สาขา |
| MD-DEV-SR | Senior Developer / Tech Lead | 55 | 61 | man-day | 15,000 | 915,000 | 9,500 | 579,500 | 36.7% | tech lead: identity/OTP, slot lock, core-connector mTLS |
| MD-DEV | Developer | 90 | 100 | man-day | 11,000 | 1,100,000 | 7,000 | 700,000 | 36.4% | 2 คน: booking, LIFF, branch console, walk-in Q-Matic, report/Excel |
| MD-UX | UX/UI Designer | 12 | 14 | man-day | 12,000 | 168,000 | 7,500 | 105,000 | 37.5% | หน้าจอลูกค้า + branch console + dashboard |
| MD-QA | QA Engineer | 36 | 40 | man-day | 9,000 | 360,000 | 5,800 | 232,000 | 35.6% | แผนทดสอบ, UAT ≥ 3 สัปดาห์, retest หลัง pen test, นำร่อง |
| MD-DEVOPS | DevOps Engineer | 18 | 20 | man-day | 14,000 | 280,000 | 9,000 | 180,000 | 35.7% | 3 env, CI/CD, observability + alert TLS/mTLS cert |
| MD-ML | ML Engineer / Data Scientist | 20 | 22 | man-day | 17,000 | 374,000 | 11,000 | 242,000 | 35.3% | โมเดล baseline + MLflow/rollback; ปรับจูนรอบ 2 ย้ายไป MA |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis | 12 | 12 | month | 45,000 | 540,000 | 32,000 | 384,000 | 28.9% | ปีแรก: PostgreSQL HA + Redis (BullMQ) ตาม arch ของ SA |
| LIC-LINE | LINE OA Messaging API (plan + push quota) | 12 | 12 | month | 6,000 | 72,000 | 4,500 | 54,000 | 25.0% | LINE OA แจ้งเตือน 3 จังหวะต่อคิว |
| LIC-APM | Monitoring / APM + log management license | 12 | 12 | month | 8,000 | 96,000 | 5,500 | 66,000 | 31.2% | monitoring + log (audit/observability) |
| LIC-WAF | Web Application Firewall + DDoS protection | 12 | 12 | month | 12,000 | 144,000 | 9,000 | 108,000 | 25.0% | ข้อกำหนดความปลอดภัยธนาคาร |
| MA-STD | Maintenance Standard 8x5 (per system) | 1 | 1 | year | 360,000 | 360,000 | 220,000 | 220,000 | 38.9% | 8x5 — ใช้ได้ต่อเมื่อธนาคารตกลง Sev 1 ตอบรับ 30 นาทีในเวลาทำการ (Q-15) |
| — | ส่วนลดพิเศษ | | | | | −619,000 | | | | ปิดส่วนต่างให้เข้างบ 4.8M · 13.7% > 10% → ต้องให้ MD อนุมัติ |
| | **รวม** | | | | | **4,800,000** | | **3,497,500** | **27.1%** | |

## สมมติฐาน

- man-day ประเมินจาก SPEC ของ SA (sa-ton) + สถาปัตยกรรม (sa-ice) และเทียบดีลที่ชนะ: เกษตรไทย 2025 (40 สาขา 4 เดือน 225 man-day ไม่มี ML)
- ทีมหลัก 8 บทบาท 6 เดือน (~120 วันทำการ) · บวก buffer 10% ทุกบทบาทแล้ว (ไม่แสดงให้ลูกค้าเห็น)
- Hosting CL-M 12 เดือน = ปีแรกตาม TOR ข้อ 6 (env dev/uat ระหว่างพัฒนาอยู่ในก้อนเดียวกัน)
- ค่า SMS/OTP ใช้ gateway ของธนาคาร ธนาคารจ่าย (Q-05) · pen test ธนาคารจ่าย 1 รอบ + retest (Q-14) — ถ้าไม่ใช่ ต้องเพิ่มบรรทัด external
- ไม่รวมค่าอุปกรณ์/ตู้ Q-Matic และ agent ที่สาขา (Q-13)
- ต่างจากฉบับ A: MA-STD แทน MA-PREM, ML 20 man-day, Dev 90 man-day (ก่อน buffer)

## จุดที่ตัดสินใจเอง (ให้ Sales/MD ยืนยัน)

- แนะนำฉบับนี้: margin หลังลด 27.1% ยังผ่านเกณฑ์ 25% แต่ส่วนลด 13.7% เกิน 10% → ต้องส่ง MD (md-somchai) และเป็นลูกค้าธนาคาร ต้องผ่าน MD อยู่แล้ว
- MA-STD 8x5 ขัดกับ TOR ที่ต้องการ Sev 1 30 นาที ถ้าธนาคารไม่ยอม (Q-15) ต้องกลับไปใช้ MA-PREM แล้วราคาจะเกินงบ 360,000
- ตัด ML ปรับจูนรอบ 2 ออก — เสี่ยง MAPE ไม่ถึง 20% ต้องให้ ml-jay ยืนยัน
- ทางเลือกไม่ลดราคา: เสนอแยก MA ปีแรกเป็นสัญญาต่างหาก (ต้องให้ Sales ถามว่าธนาคารรับได้ไหม)
