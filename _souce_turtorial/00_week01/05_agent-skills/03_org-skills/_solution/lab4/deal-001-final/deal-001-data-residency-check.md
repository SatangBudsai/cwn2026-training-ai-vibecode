# deal-001 นครหลวงพัฒนา — ตรวจ data residency (log + backup อยู่ในไทยไหม)

> เอกสารภายใน ห้ามแนบไปกับ proposal · ตอบเงื่อนไข **A1** ของ `approval.md` (MD, 3 พ.ย. 2026) และ SPEC `NFR-DAT-02`
> จัดทำ 3 พ.ย. 2026 · ฝั่ง DevOps (`ops-art`) · กำหนดส่งคำตอบ: **ภายใน 10 พ.ย. 2026** (ยื่นลูกค้า 13 พ.ย. 16:00)
> ที่มา: `company-kit/price-list.csv`, `company-kit/arch-standards.md` v4 ข้อ 4–5, `SPEC.md` v0.2 (NFR-AVL-02, NFR-OPS-02, NFR-DAT-02), `desks/sa-ice/work/deal-001-nlp-queue-architecture.md`, `customer-data-policy` → `bank-pdpa-annex.md`

## คำตอบ ณ วันนี้: ❌ ยังยืนยันเป็นลายลักษณ์อักษรไม่ได้

ภาคผนวก PDPA ข้อ 2 สัญญาว่า "ข้อมูลส่วนบุคคลทั้งหมดจัดเก็บใน data center ในประเทศไทยเท่านั้น รวมถึง backup และ log"
- **มีหลักฐานแล้ว** (จากเอกสาร ยังไม่ได้ดูหน้าตั้งค่า cloud จริง): compute, PostgreSQL ตัวหลัก, Redis และ object storage อยู่ region ไทย
- **ยังไม่มีหลักฐาน** 5 จุด ที่ MD ถามถึงโดยตรง: backup/snapshot ของ PostgreSQL, ที่เก็บ audit log 2 ปี, log management กลาง, log ของ WAF/DDoS และ monitoring/APM/trace
- ระบบนี้ยังไม่ได้สร้าง จึงยังไม่มี infra-as-code ให้ตรวจ ต้องตรวจจากบริการที่จะใช้จริงแทน
- ผมจะไม่เซ็นยืนยันจากเอกสารอย่างเดียว เพราะถ้าข้อใดผิด ข้อ 2 จะเป็นคำสัญญาที่ทำไม่ได้

**สถานะเงื่อนไข A1: ยังไม่ปิด** · ห้ามยื่นภาคผนวกข้อ 2 จนกว่าตาราง "ต้องตรวจ" จะเป็น ✅ ครบทุกแถว

## ตรวจทีละจุด

| # | จุดที่เก็บข้อมูล | หลักฐานที่มี | สถานะ | ต้องตรวจอะไรเพิ่ม |
|---|---|---|---|---|
| 1 | PostgreSQL ตัวหลัก (HA) | CL-M = "Cloud hosting Medium (Thailand region) … managed PostgreSQL HA + Redis" (price-list) · arch-standards ข้อ 4 | 🟡 มีในเอกสาร | ดู region ในหน้าตั้งค่า cloud จริง และดูว่า standby ของ HA อยู่ zone ในไทย ไม่ใช่ region อื่น |
| 2 | **Backup / snapshot / PITR ของ PostgreSQL** (รายวัน เก็บ 35 วัน + snapshot ก่อน deploy) | ไม่มี | ❓ | ที่เก็บ backup อัตโนมัติอยู่ region ไหน · มีการตั้งค่าคัดลอก backup ข้าม region (cross-region copy) ไหม → ต้อง **ปิด** · DR ตาม NFR-AVL-02 (RPO 15 นาที / RTO 4 ชม.) ต้องทำภายในไทย ห้ามใช้ region DR นอกประเทศ |
| 3 | Redis | CL-M (Thailand region) | 🟡 มีในเอกสาร | ดู region ในหน้าตั้งค่า และดูว่า persistence/backup ของ Redis อยู่ที่ไหน |
| 4 | Object storage (ไฟล์ Excel ที่ export) | arch-standards ข้อ 4 "object storage ภูมิภาคไทย" · architecture ของ sa-ice | 🟡 มีในเอกสาร | ดู region ของ bucket และปิด replication ข้าม region |
| 5 | **Audit log (เก็บ ≥ 2 ปี, append-only)** | ไม่มีเอกสารบอกว่าเก็บที่ไหน | ❓ | ถ้าเก็บใน PostgreSQL ให้ตามข้อ 1–2 · ถ้าย้ายไปเก็บระยะยาว (archive) ต้องระบุที่เก็บและ region |
| 6 | **Log ของแอป → "log management กลาง"** (arch-standards ข้อ 5) | ไม่มีเอกสารบอกว่าระบบกลางอยู่ที่ไหน | ❓ **เสี่ยงสูงสุด** | log management กลางของบริษัทอยู่ region ไหน ถ้าเป็น SaaS ต่างประเทศ ต้องแยก stack log ของดีลนี้ให้อยู่ในไทย · แม้ pino redact เลขบัตรแล้ว log ก็ยังมี userId, IP และ LINE userId ซึ่งเป็นข้อมูลส่วนบุคคล |
| 7 | **Log ของ WAF + DDoS** (LIC-WAF) | price-list ไม่ได้ระบุ region | ❓ | บริการ WAF/DDoS หลายเจ้าทำงานที่ edge ทั่วโลก และเก็บ log ไว้นอกประเทศ · ต้องรู้ชื่อผู้ให้บริการ ที่เก็บ log และจุดที่ถอดรหัส TLS (ถ้าถอดที่ edge นอกไทย ข้อมูลจะผ่านเครื่องนอกประเทศ) |
| 8 | **Monitoring / APM / trace (OpenTelemetry)** | ราคาไม่มี LIC-APM (โน้ตภายในข้อ 8) · แต่ NFR-OPS-02 ต้องมี metric, trace และ alert | ❓ | ใช้เครื่องมืออะไรแทน APM และเก็บที่ไหน · trace มักติด header, URL และ userId มาด้วย · ถ้าเพิ่ม LIC-APM ภายหลังต้องตรวจข้อนี้ใหม่ (bank-pdpa-annex) |
| 9 | KMS (key ของ AES-256 / HMAC เลขบัตร) | NFR-SEC-02 | 🟡 | key และ backup ของ key อยู่ region ไทย |
| 10 | MLflow / model registry / ข้อมูลเทรน 24 เดือน (SFTP) | TOR บอกว่าข้อมูลย้อนหลัง "ไม่ระบุตัวตน" | 🟢 เสี่ยงต่ำ | วาง MLflow และที่รับไฟล์ SFTP ไว้ใน region ไทยด้วยอยู่แล้ว เพื่อไม่ต้องอธิบายเพิ่ม |
| 11 | CI/CD log, error tracking, ช่อง `#deploy`, ticket | ไม่ควรมีข้อมูลลูกค้าอยู่แล้ว | 🟢 | ถ้ามีเครื่องมือ error tracking (เช่น ส่ง stack trace + request) ต้องนับเป็น log ตามข้อ 6 |

**นอกขอบเขตของเรา แต่ต้องแจ้งเมย์ (`plat-may`):** LINE Messaging API, Microsoft Entra ID และ SMS gateway เป็นบัญชีของธนาคาร ข้อมูลที่ส่งไประบบเหล่านี้ (เช่น ข้อความแจ้งเตือน, LINE userId) อาจถูกประมวลผลนอกประเทศ ถ้อยคำ "ข้อมูลส่วนบุคคลทั้งหมด" ในข้อ 2 อาจถูกตีความว่ารวมส่วนนี้ด้วย ควรให้เมย์ตัดสินว่าต้องเขียนข้อยกเว้นไหม (ห้ามแก้ถ้อยคำภาคผนวกเอง)

## ต้องทำให้เสร็จก่อน 10 พ.ย. 2026

| # | งาน | ใคร | กำหนด |
|---|---|---|---|
| R1 | ระบุผู้ให้บริการ cloud และบริการที่จะใช้จริงสำหรับ CL-M, WAF/DDoS, log management กลาง และ monitoring | อาร์ต (`ops-art`) | พ. 4 พ.ย. |
| R2 | ตรวจหน้าตั้งค่าหรือเอกสารของผู้ให้บริการทีละแถว (ข้อ 1–9) แล้วแนบภาพหน้าจอ/ลิงก์เอกสารเป็นหลักฐาน · ตั้งค่า backup ไม่ให้คัดลอกข้าม region | อาร์ต | ศ. 6 พ.ย. |
| R3 | ถ้าข้อ 6–8 อยู่นอกไทย: ประเมินทางเลือกที่ทำให้อยู่ในไทย (เช่น stack log/monitoring แยกใน region ไทย, WAF ที่เก็บ log ในไทย) พร้อม man-day/ค่าใช้จ่ายที่เพิ่ม | อาร์ต | ศ. 6 พ.ย. |
| R4 | ถ้ามีข้อใดทำไม่ได้ หรือต้องมีค่าใช้จ่ายเพิ่ม → แจ้งเมย์ (`plat-may`) + นิดา (`sales-nida`) แล้วส่งกลับให้ MD ตามเงื่อนไข A1 | อาร์ต | จ. 9 พ.ย. |
| R5 | ถ้าผ่านครบ → ส่งคำยืนยันด้านล่างให้นิดา, เมย์ และ MD เป็นลายลักษณ์อักษร (อีเมล) | อาร์ต | จ. 9 พ.ย. |
| R6 | ใส่เรื่องนี้ใน infra-as-code ตอนสร้างระบบ และตรวจซ้ำก่อน go-live (TEST-PLAN "ตรวจด้วยวิธีอื่น" NFR-DAT-02) | อาร์ต | ก่อน deploy นำร่อง (ดู `deal-001-deploy-checklist.md` ข้อ 1.9) |

## ร่างคำยืนยัน (ส่งได้เมื่อ R2 เป็น ✅ ครบทุกแถวแล้วเท่านั้น)

> เรื่อง: ยืนยัน data residency ดีล deal-001 (ภาคผนวก PDPA ข้อ 2)
>
> ฝ่าย DevOps ตรวจแล้ว ณ วันที่ ____ ระบบ nlp-queue จะจัดเก็บข้อมูลทุกจุดต่อไปนี้ใน cloud region ประเทศไทย (ผู้ให้บริการ ____ / region ____):
> PostgreSQL ตัวหลักและ standby · backup อัตโนมัติ, PITR และ snapshot (ปิดการคัดลอกข้าม region) · Redis · object storage · audit log รวมที่เก็บระยะยาว 2 ปี · log ของแอป (ที่ ____) · log ของ WAF/DDoS (ที่ ____) · monitoring, metric และ trace (ที่ ____) · KMS key
> DR ตาม RPO 15 นาที / RTO 4 ชม. ทำภายใน region ไทย
> หลักฐาน: ____ (ภาพหน้าจอ/เอกสารผู้ให้บริการ)
> ข้อสังเกตที่อยู่นอกขอบเขตของโนวาเทค: LINE, Entra ID และ SMS gateway เป็นบัญชีของธนาคาร (ส่งให้ plat-may พิจารณาแล้ว)
>
> อาร์ต พงษ์ไพบูลย์ (`ops-art`)
