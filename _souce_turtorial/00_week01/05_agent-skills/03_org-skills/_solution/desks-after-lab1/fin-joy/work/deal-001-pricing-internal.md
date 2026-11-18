# คิดราคา (ภายใน) — ระบบจองคิวสาขาและพยากรณ์ปริมาณคิว (TOR NLP-PROC-2026-114)

> ⚠️ **เอกสารภายใน** มีต้นทุนและ margin — ห้ามส่งลูกค้า
> ลูกค้า: ธนาคารนครหลวงพัฒนา จำกัด (มหาชน) — ฝ่ายพัฒนาช่องทางสาขา · คิดโดย จอย พัฒนสิน (fin-joy) · 2026-11-03 · fixed-price (บวก buffer 10% ใน man-day แล้ว)

## ผลสรุป

| | |
|---|---|
| ราคาขายก่อน VAT (หลังส่วนลด) | **6,087,000** บาท |
| ต้นทุนรวม | 3,925,500 บาท |
| กำไรขั้นต้น | 2,161,500 บาท |
| **Gross margin** | **35.5%** → ✅ ผ่าน |
| **ผู้อนุมัติ (เข้มสุดของ margin + ส่วนลด)** | **หัวหน้าทีมขาย (sales-nida)** |
| ส่วนลด | 0 บาท = 0.0% ของยอดที่ลดได้ → ไม่มีส่วนลด |
| VAT 7% / รวมทั้งสิ้น | 426,090 / 6,513,090 บาท |
| งบลูกค้า (ก่อน VAT) | 4,800,000 บาท · ใช้ 126.8% |

man-day รวม 340 วัน (ประเมินก่อน buffer 306 วัน)

## ⚠️ ข้อสังเกต

- ราคาก่อน VAT 6,087,000 เกินงบลูกค้า 4,800,000 อยู่ 1,287,000 บาท

## รายการ

| รหัส | รายการ | ประเมิน | จำนวน (รวม buffer) | หน่วย | ราคา/หน่วย | ราคาขาย | ต้นทุน/หน่วย | ต้นทุน | margin บรรทัด | หมายเหตุ |
|---|---|--:|--:|---|--:|--:|--:|--:|--:|---|
| MD-SA | Solution Architect (SA) | 15 | 17 | man-day | 18,000 | 306,000 | 11,000 | 187,000 | 38.9% | workshop เดือน 1, ตอบ open questions, ADR, คุม integration core/Q-Matic |
| MD-PM | Project Manager | 40 | 44 | man-day | 16,000 | 704,000 | 10,000 | 440,000 | 37.5% | ~ครึ่งเวลา 6 เดือน + นำร่อง 10 สาขา/rollout 120 สาขา |
| MD-DEV-SR | Senior Developer / Tech Lead | 55 | 61 | man-day | 15,000 | 915,000 | 9,500 | 579,500 | 36.7% | tech lead: identity/OTP, slot lock, core-connector mTLS |
| MD-DEV | Developer | 100 | 111 | man-day | 11,000 | 1,221,000 | 7,000 | 777,000 | 36.4% | 2 คน: booking, LIFF, branch console, walk-in Q-Matic, report/Excel |
| MD-UX | UX/UI Designer | 12 | 14 | man-day | 12,000 | 168,000 | 7,500 | 105,000 | 37.5% | หน้าจอลูกค้า + branch console + dashboard |
| MD-QA | QA Engineer | 36 | 40 | man-day | 9,000 | 360,000 | 5,800 | 232,000 | 35.6% | แผนทดสอบ, UAT ≥ 3 สัปดาห์, retest หลัง pen test, นำร่อง |
| MD-DEVOPS | DevOps Engineer | 18 | 20 | man-day | 14,000 | 280,000 | 9,000 | 180,000 | 35.7% | 3 env, CI/CD, observability + alert TLS/mTLS cert |
| MD-ML | ML Engineer / Data Scientist | 30 | 33 | man-day | 17,000 | 561,000 | 11,000 | 363,000 | 35.3% | เตรียมข้อมูล 24 เดือน, โมเดล 7 วัน, MAPE ≤ 20%, MLflow + rollback |
| CL-M | Cloud hosting Medium (Thailand region) 4 vCPU x3 + managed PostgreSQL HA + Redis | 12 | 12 | month | 45,000 | 540,000 | 32,000 | 384,000 | 28.9% | ปีแรก: PostgreSQL HA + Redis (BullMQ) ตาม arch ของ SA |
| LIC-LINE | LINE OA Messaging API (plan + push quota) | 12 | 12 | month | 6,000 | 72,000 | 4,500 | 54,000 | 25.0% | LINE OA แจ้งเตือน 3 จังหวะต่อคิว |
| LIC-APM | Monitoring / APM + log management license | 12 | 12 | month | 8,000 | 96,000 | 5,500 | 66,000 | 31.2% | monitoring + log (audit/observability) |
| LIC-WAF | Web Application Firewall + DDoS protection | 12 | 12 | month | 12,000 | 144,000 | 9,000 | 108,000 | 25.0% | ข้อกำหนดความปลอดภัยธนาคาร |
| MA-PREM | Maintenance Premium 24x7 (per system) | 1 | 1 | year | 720,000 | 720,000 | 450,000 | 450,000 | 37.5% | TOR: Sev 1 ตอบรับ 30 นาที → ต้อง 24x7 |
| | **รวม** | | | | | **6,087,000** | | **3,925,500** | **35.5%** | |

## สมมติฐาน

- man-day ประเมินจาก SPEC ของ SA (sa-ton) + สถาปัตยกรรม (sa-ice) และเทียบดีลที่ชนะ: เกษตรไทย 2025 (40 สาขา 4 เดือน 225 man-day ไม่มี ML)
- ทีมหลัก 8 บทบาท 6 เดือน (~120 วันทำการ) · บวก buffer 10% ทุกบทบาทแล้ว (ไม่แสดงให้ลูกค้าเห็น)
- Hosting CL-M 12 เดือน = ปีแรกตาม TOR ข้อ 6 (env dev/uat ระหว่างพัฒนาอยู่ในก้อนเดียวกัน)
- ค่า SMS/OTP ใช้ gateway ของธนาคาร ธนาคารจ่าย (Q-05) · pen test ธนาคารจ่าย 1 รอบ + retest (Q-14) — ถ้าไม่ใช่ ต้องเพิ่มบรรทัด external
- ไม่รวมค่าอุปกรณ์/ตู้ Q-Matic และ agent ที่สาขา (Q-13)

## จุดที่ตัดสินใจเอง (ให้ Sales/MD ยืนยัน)

- ประมาณการ man-day เป็นของบัญชี (จอย) — ให้ SA/tech lead ยืนยันก่อนส่ง
- เลือก MA-PREM 24x7 เพราะ TOR เขียน Sev 1 ตอบรับ 30 นาที (SPEC NFR-OPS-03 ตีความเป็น 24x7)
- ราคานี้เกินงบ 1.29M — ไม่แนะนำให้ยื่นตามนี้ ใช้เป็นฐานเทียบกับฉบับ B

## ถ้าต้องลดราคา — ตัวเลือกที่ไม่ผิดกฎ

- MA-PREM → MA-STD ถ้าธนาคารรับ Sev 1 ในเวลาทำการ: −360,000
- ML เหลือ baseline + MLflow/rollback (ปรับจูนย้ายไป MA): −10 man-day ก่อน buffer
- Dev −10 man-day (ลด report/Excel เฟสแรก)
- ส่วนลดพิเศษได้เฉพาะค่าแรง/license — ห้ามลด MA และ hosting
