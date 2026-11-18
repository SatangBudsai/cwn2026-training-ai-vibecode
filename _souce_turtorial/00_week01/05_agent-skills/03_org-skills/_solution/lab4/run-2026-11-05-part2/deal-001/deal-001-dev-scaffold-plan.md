# deal-001 — แผนขึ้นโปรเจกต์ (Dev) · ระบบจองคิวสาขาและพยากรณ์ปริมาณคิว

> เอกสารภายใน ห้ามส่งลูกค้า · จัดทำโดย มิว อินทรสุวรรณ (`dev-mew`) · 5 พ.ย. 2026 · **ยังไม่เขียนโค้ด**
> spec ที่ใช้: TOR NLP-PROC-2026-114 (`company-kit/deal-001/tor-bank-queue.md`), proposal รอบ 3 (`deal-001-proposal-nakhonluang.md`), แผน/ข้อสมมติของ SA (`deal-001-sa-response-r2.md`), ผล MD (`approval.md` รอบ 3)
> มาตรฐาน: `company-kit/arch-standards.md` v4, `company-kit/coding-rules.md` v2026.2, `company-kit/deploy-runbook.md`, `company-kit/customer-data-policy.md`, skill `dev:project-scaffold` v1.1.0

---

## 0. สถานะดีลที่แผนนี้ขึ้นอยู่

- MD ให้ผล **🟡 อนุมัติแบบมีเงื่อนไข** (ยังไม่ใช่อนุมัติเต็ม): ยื่นลูกค้าได้เมื่อปิด C1–C5 (ภายใน 10 พ.ย.) · C6 (SA/Tech Lead) ต้องปิดก่อนลงนาม · ยังไม่ได้งาน ยังไม่เซ็นสัญญา (คาดลงนาม 4 ม.ค. 2027)
- แผนนี้จึงแบ่งเป็น **(ก) เตรียมภายในก่อนลงนาม** ซึ่งไม่ใช้ข้อมูลลูกค้าและไม่สร้างของที่ต้องทิ้งถ้าแพ้ดีล กับ **(ข) ขึ้นโปรเจกต์จริงสัปดาห์แรกหลังลงนาม** ภายใต้ man-day ที่ขายไว้
- เงื่อนไขที่กระทบงาน Dev โดยตรง:

| เงื่อนไข | กระทบ Dev อย่างไร | สิ่งที่แผนนี้ทำ |
|---|---|---|
| C1 log/APM อยู่ในไทย | ปลายทางของ log/trace ยังไม่รู้ | ทำ log/trace ให้ส่งผ่าน OpenTelemetry + ตั้งปลายทางด้วย env ไม่ผูกผู้ให้บริการ (ข้อ 4.6) · ถ้าผลเป็นทาง 3 ราคาเปลี่ยน → MD ไม่ใช่ Dev ตัดสิน |
| C6 Tech Lead (ไม่ใช่ปอนด์) | Tech Lead เป็นเจ้าของ repo/ADR/การรีวิว | แผนนี้เป็นร่างเสนอ Tech Lead ที่ PM office เสนอชื่อ — ให้ Tech Lead คนนั้นรับรองก่อนเริ่ม (ข้อ 7) |
| C5 ข้อสมมติ S1–S8 | buffer เหลือ 32 md ถ้าข้อสมมติไม่จริงต้องเป็น change request | โครงต้องทำให้เห็นเร็วว่าข้อสมมติผิด (ข้อ 6) |

## 1. ข้อสรุปหลัก: skill `project-scaffold` ใช้ตรง ๆ ไม่ได้

skill ของแผนก (`dev:project-scaffold` v1.1.0) สร้าง **ระบบสมาชิก + ชำระเงิน** โมดูลบังคับ `auth / member / payment / notification / audit` และ `check.mjs` บังคับให้มีโมดูล `payment` + env `THAIPAY_*` — แต่ดีลนี้:

| สิ่งที่ template มี | deal-001 ต้องการ | ผล |
|---|---|---|
| `payment` + ThaiPay GW webhook, order, refund | **ไม่มีการชำระเงิน** ในขอบเขต TOR | ตัดทิ้ง · ถ้ารันสคริปต์ตรง ๆ จะได้โค้ดจ่ายเงินและ secret ที่ไม่ใช้ = attack surface เกินจำเป็นในระบบธนาคาร |
| `member` ระดับ basic/silver/gold | ลูกค้าธนาคาร + ระดับลูกค้าจาก core banking (อ่านอย่างเดียว) | ไม่ใช้ · เก็บเฉพาะที่จำเป็นต่อการจอง (PDPA: เท่าที่จำเป็น) |
| `auth` อีเมล + รหัสผ่าน | ลูกค้า: เลขบัตร + วันเกิด + OTP (gateway ธนาคาร) + ผูก LINE · พนักงาน: SSO Entra ID | เขียนใหม่ แต่ **คงกลไก token ตาม coding-rules ข้อ 9** (access 15 นาที, refresh หมุน + reuse detection) |
| `notification`, `audit`, `lib/*`, `config/env.ts`, healthz/readyz, logger, Vitest/Playwright config | ต้องใช้ทั้งหมด | **นำมาใช้** |

**ทางที่เสนอ:** ขึ้นโครงด้วยมือโดย **คัดเฉพาะส่วนฐานของ template** (lib, config, logger, app-error, http, queue/worker, audit, notification, test config) แล้วเพิ่มโมดูลของโดเมนนี้ · ไม่รัน `scaffold.mjs` แล้วค่อยลบ payment (ลบไม่หมดง่าย และ `check.mjs` จะล้มอยู่ดี) · ตรวจคุณภาพด้วย checklist ของ skill ข้อที่ไม่ผูกกับ payment + `coding-standard` 10 ข้อ
ระยะยาว (หลังโปรเจกต์นี้ ไม่อยู่ใน man-day ลูกค้า): ผม (เจ้าของ skill) เพิ่ม profile `booking` ให้ skill ไม่บังคับ payment — ต้องเช็กผลกระทบกับ skill อื่นผ่าน `skill-finder` ก่อนแก้

## 2. Repo และชื่อ (arch-standards ข้อ 7)

| repo | ประเภท | เหตุผลที่แยก (ADR) |
|---|---|---|
| `nlp-queue-web` | modular monolith Next.js 15 + TS (เว็บจอง, LIFF, Branch Console, หลังบ้าน, dashboard, API, worker) | ค่าเริ่มต้น ข้อ 1 |
| `nlp-core-connector` | service Node/TS เล็ก ๆ เรียก Customer Lookup API ผ่าน mTLS เท่านั้น | ข้อ 2.4 แยกเครือข่าย — ADR-0002 |
| `nlp-forecast-service` | Python (โครงเป็นงานของ ML `ml-jay`; Dev ทำแค่สัญญา API/ตารางผลพยากรณ์) | ข้อ 2.1 runtime ต่าง — ADR-0003 |

- DB: `nvt_nlpqueue_dev` / `_uat` / `_prod` · env มีแค่ `dev`, `uat`, `prod` · คิว/event ใช้ `<domain>.<event>` อดีตกาล
- รุ่นเครื่องมือตาม skill: Node 22, Next 15.5.x, React 19.x, TS 5.9.x, Prisma 6.19.x, Zod 4, pino 9, Vitest 3.2.x, Playwright · ปักเวอร์ชันตรงตัว

## 3. โมดูลใน `nlp-queue-web` (`src/modules/<m>/` ครบ index/service/repository/schema/errors/__tests__)

| โมดูล | ขอบเขต (ข้อ TOR) | schema DB | หมายเหตุออกแบบ |
|---|---|---|---|
| `identity` | ยืนยันตัวตนลูกค้า เลขบัตร + วันเกิด + OTP, ผูก LINE userId, session ลูกค้า (3.1) | `identity.*` | เลขบัตรเก็บเป็น HMAC เท่านั้น (คีย์จาก KMS) · CIF เข้ารหัสระดับคอลัมน์ · จำกัดจำนวนครั้ง OTP/ยืนยันผิดด้วย Redis rate limit · token ตาม coding-rules ข้อ 9 |
| `staff-auth` | SSO Microsoft Entra ID (OIDC), map กลุ่ม → บทบาท พนักงาน/ผู้จัดการสาขา/ผู้บริหาร/ผู้ดูแล (3.2) | `staff_auth.*` | ข้อสมมติ S5 · session ของแอปหลัง OIDC ใช้กลไก token เดียวกับข้อ 9 · ถ้าต่างจากมาตรฐาน → ADR |
| `branch` | สาขา 120 แห่ง, ประเภทบริการ 5 ประเภท, ช่องบริการต่อช่วงเวลา, หน้าวางแผนสาขา (3.1, 3.2) | `branch.*` | เจ้าของข้อมูลตั้งค่าที่ `booking` อ่านผ่าน `index.ts` |
| `booking` | จอง/เลื่อน/ยกเลิก ช่อง 15 นาที, slot lock, ลำดับคิวรวม walk-in, เรียก/ย้ายคิว, บันทึกเวลาให้บริการ (3.1, 3.2) | `booking.*` | slot lock ใน Redis (มี TTL) **+ unique constraint ใน DB เป็นด่านสุดท้าย** (บทเรียนเดียวกับ `payment_events`) · สถานะคิวเปลี่ยนทางเดียวแบบ compare-and-set |
| `kiosk` | เชื่อมตู้ Q-Matic: ออกบัตรคิว walk-in เข้าลำดับเดียวกัน (3.1, 3.4) | `kiosk.*` | ความเสี่ยงสูงสุด (S4) · event จากตู้ต้องตรวจลายเซ็น/ที่มา + idempotent ด้วย event id (coding-rules ข้อ 10) · sync ผ่านคิว |
| `notification` | แจ้งเตือน 1 วัน / 30 นาที / เหลือ 3 คิว ผ่าน LINE Messaging API + ช่องทางของธนาคารสำหรับเว็บ (3.1) | `notification.*` | จาก template · delayed job, `jobId` = bookingId + จังหวะ (กันส่งซ้ำ) · job ส่งแค่ id ไม่ใส่ชื่อ/เบอร์ (decisions ข้อ 7) · retry 5 ครั้ง → dead-letter + alert |
| `forecast` | รับผลพยากรณ์จาก `nlp-forecast-service`, แสดงคู่ช่องบริการ, สถานะรุ่นโมเดล, shadow mode flag (3.3) | `forecast.*` | Dev ไม่ทำโมเดล · สัญญา API/ตารางตกลงกับ `ml-jay` ในเดือน 1 |
| `report` | Dashboard 3 ระดับ สาขา/ภาค/ประเทศ: เวลารอเฉลี่ย, จำนวนคิว, no-show, ส่งออก Excel (3.5) | `report.*` | ข้อสมมติ S6 (ไม่มีตัวสร้างรายงานเอง) · ส่งออกผ่านคิว |
| `audit` | บันทึกทุกการเข้าถึงข้อมูลลูกค้า แก้ไขไม่ได้ เก็บ 2 ปี ส่งออกได้ (4) | `audit.*` | จาก template + เพิ่ม: append-only (สิทธิ์ DB ไม่มี UPDATE/DELETE), archive ไป object storage ภูมิภาคไทยใน CL-M · **ไม่ฝากกับ LIC-APM** (S8) |

`nlp-core-connector`: endpoint เดียวรับคำค้นจาก `identity` → เรียก Customer Lookup API (S2: 1 endpoint คืนชื่อ/ระดับ/CIF) · ตรวจ response ด้วย Zod · ไม่ log ค่าที่ค้น · มี mock server ตามเอกสาร API สำหรับ dev/uat ก่อน sandbox ธนาคารพร้อม

## 4. สิ่งที่ต้องอยู่ในโครงตั้งแต่วันแรก (ไม่ใช่เพิ่มทีหลัง)

1. **coding-rules 10 ข้อ** — โครงตั้งเป้า ≥ 9/10 วันส่ง (ข้อ 6 E2E อาจยังไม่ครบจนมี flow จอง)
2. **ข้อมูลอ่อนไหว** — pino redact: เลขบัตร, CIF, ชื่อ, เบอร์โทร, OTP, token (ตาม SA ข้อ 4 + coding-rules ข้อ 8) · มี unit test ยืนยันว่า log ที่มีค่าพวกนี้ถูกปิดบัง
3. **Token** — access 15 นาที, refresh หมุน + reuse detection, cookie `httpOnly; Secure; SameSite=Lax`, client refresh `min(60 วิ, ครึ่งอายุ)`, Web Locks สำหรับหลายแท็บ (บทเรียน sukjai-spa) — LIFF เปิดใน in-app browser ของ LINE ต้องทดสอบเรื่อง cookie ใน LIFF ตั้งแต่ spike สัปดาห์แรก
4. **เข้ารหัส** — TLS 1.2+ ทุกช่องทาง, AES-256 at rest, คีย์ HMAC/คอลัมน์อยู่ใน KMS ไม่อยู่ใน env ไฟล์
5. **health / alert** — `/healthz`, `/readyz` (DB + Redis + คิว) · alert error > 2%, p95 > 2 วิ, คิวค้าง > 1,000 · **ใบรับรอง TLS และ client cert mTLS ของ uat/prod หมดภายใน 21 วัน** (บทเรียน incident 2026-09: cert ที่ติดตั้งมือไม่มี alert) · ทะเบียน cert เก็บใน repo `docs/certificates.md` ไม่ใช่ปฏิทินส่วนตัว
6. **observability ไม่ผูกผู้ให้บริการ** — OpenTelemetry exporter ตั้งปลายทางด้วย env (รอผล C1) · audit log แยกจาก log ปฏิบัติการเสมอ
7. **feature flag ต่อสาขา** — นำร่อง 10 สาขาและขยาย 30/40/40 เปิดด้วย flag/ค่าตั้งสาขา ไม่ต้อง deploy ใหม่ · flag ของผลพยากรณ์ (shadow mode → แสดงผล) แยกจาก flag การจอง
8. **ข้อมูลทดสอบสังเคราะห์เท่านั้น** — seed ใช้เลขบัตรปลอม (สุ่มให้ผ่าน checksum), ชื่อสมมติ, อีเมล `@example.com` · ห้ามคัดลอกข้อมูลบัตรคิวย้อนหลังของธนาคารเข้า repo หรือเครื่องตัวเอง (`customer-data-policy` ข้อ 4)
9. **CI** — typecheck, lint, Vitest + coverage ≥ 80% ของ service, `prisma validate`, `next build` (กับดัก NODE_ENV readonly), secret scan, dependency audit · E2E Playwright บน uat
10. **docs** — `docs/architecture.md` (C4 ระดับ 1–2, Mermaid, สี/trust boundary ตาม arch-standards ข้อ 6) · `docs/adr/` · `.env.example` ครบ ไม่มี `.env` ใน repo

## 5. ลำดับงานและเวลา

### (ก) ก่อนลงนาม — พ.ย.–ธ.ค. 2026 (งานภายใน ไม่ใช้ข้อมูลลูกค้า, ไม่สร้าง repo ลูกค้า)

| # | งาน | ใคร | ผล |
|---|---|---|---|
| P1 | ร่าง ADR-0001 โครงโมดูล (ข้อ 3), ADR-0002 core-connector, ADR-0003 forecast-service, ADR-0004 session ลูกค้า (เลขบัตร+OTP+LINE) / พนักงาน (Entra) | `dev-mew` ร่าง → SA (`sa-ton`) + Tech Lead รับรอง | ร่าง ADR ในโฟลเดอร์ดีล |
| P2 | รายการคำถามเทคนิคที่ต้องได้จากธนาคารในเดือน 1 (ข้อ 6) ส่ง SA/PM | `dev-mew` | ใช้ใน kick-off |
| P3 | ร่างสัญญา API `nlp-queue-web` ↔ `nlp-forecast-service` | `dev-mew` + `ml-jay` | ร่าง 1 หน้า |
| P4 | ทำ checklist ฉบับ booking (ตัดข้อ payment ออกจาก checklist ของ skill) | `dev-mew` | ใช้ตรวจตอนส่งโครง |

ถ้าแพ้ดีล: เสียแค่เวลาร่างเอกสาร ไม่มีโค้ดหรือ infra ค้าง

### (ข) หลังลงนาม — เดือน 1 (ม.ค. 2027) ตามแผนของ SA

งบ Dev เดือน ม.ค. ตาม sa-response ข้อ 2: **Dev-Sr 6 md + Dev 4 md + DevOps 5 md** — โครงต้องจบในงบนี้

| สัปดาห์ | งาน | md (โดยประมาณ) |
|---|---|---|
| 1 (4–8 ม.ค.) | ลงนาม NDA ธนาคารทุกคนก่อนแตะงาน · Tech Lead รับรอง ADR · สร้าง 2 repo (`nlp-queue-web`, `nlp-core-connector`) · โครงฐานจาก template + โมดูลว่าง 9 ตัว + migration แรก + CI | Dev-Sr 2, Dev 2 |
| 2 (11–15 ม.ค.) | `identity` + `staff-auth` โครง token (ข้อ 9) + spike cookie ใน LIFF · `audit` append-only · logger redact + test · healthz/readyz | Dev-Sr 2, Dev 2 |
| 3 (18–22 ม.ค.) | mock Customer Lookup API + mock Q-Matic (จากข้อสมมติ S2/S4 ก่อน) · `docs/architecture.md` · ตรวจ checklist + `coding-standard` | Dev-Sr 1 |
| 4 (25–29 ม.ค.) | รับเอกสาร API ธนาคาร (S1 กำหนด 29 ม.ค.) → ปรับ mock ให้ตรงเอกสาร · ส่งโครงเข้าเดือน 2 | Dev-Sr 1 |

DevOps (5 md, งานของทีม DevOps): dev/uat บน cloud ภูมิภาคไทย, WAF, KMS, CI/CD, ปลายทาง log ตามผล C1

**นิยามว่าเสร็จ (ส่งโครงให้ทีม):** typecheck/test/build ผ่านจริงใน CI · coverage service ≥ 80% · migration แรกผ่านบน PostgreSQL 16 · `/healthz` `/readyz` 200 บน dev · log ไม่มีเลขบัตร/CIF/ชื่อ/เบอร์ (มี test) · `coding-standard` ≥ 8/10 · `SCAFFOLD-REPORT.md` ระบุสิ่งที่ยังไม่ได้ทำตามจริง

### จุดในแผนรวมที่ Dev ต้องระวัง (deploy-runbook)

- production deploy ได้แค่ อ.–พฤ. 21:00–23:00 · **ลูกค้าธนาคารห้าม deploy วันที่ 25–สิ้นเดือน** และก่อนวันหยุดยาว
- ผลคือ **ช่วงนำร่อง 25–31 พ.ค. ห้าม deploy** (ยกเว้น hotfix Sev 1) → ระบบนำร่องต้องขึ้น production และผ่าน smoke test ภายใน **18 พ.ค. (อังคาร) หรือก่อนหน้า** หลัง UAT ลงนาม (runbook 1.2) · ขยาย 1 / 7 / 14 มิ.ย. ทำด้วย flag ต่อสาขา ไม่ใช่ deploy · hypercare จบ 25 มิ.ย. ก่อนช่วงห้าม deploy
- ปิดรับฟีเจอร์สิ้นเดือน 3 (31 มี.ค.) ก่อน pen test 1–12 เม.ย. · วันหยุด 6, 13–15 เม.ย., 4 พ.ค. ไม่วาง deploy

## 6. คำถามที่ต้องได้จากธนาคารในเดือน 1 (ส่งผ่าน SA/PM — ผูกกับข้อสมมติ S1–S8)

| # | คำถาม | ข้อสมมติ | ถ้าไม่ตรง |
|---|---|---|---|
| Q1 | Customer Lookup API: endpoint, field, error code, rate limit, รูปแบบ client cert mTLS + วันหมดอายุ | S1, S2 | หลาย API/ขั้นตอนเพิ่ม → แจ้ง SA ทันที (CR) |
| Q2 | Q-Matic: เอกสาร REST API รุ่นที่ใช้, รับลำดับคิวจากระบบนอกได้ไหม, วิธียืนยันที่มา event, ตู้/ตัวจำลอง 1 ชุด | S4 | ประเมินไม่ได้ → SA คุยผู้ผลิต |
| Q3 | OTP gateway ของธนาคาร: API, อายุ OTP, ค่าจำกัดการส่ง | S3 | ต้องต่อผู้ให้บริการใหม่ +5 md (CR) |
| Q4 | Entra ID: OIDC มาตรฐาน, ชื่อกลุ่มที่ map เป็นบทบาท, สาขาของพนักงานมาจาก claim ไหน | S5 | map เอง +3 md (CR) |
| Q5 | LINE OA: channel/LIFF ID สำหรับ dev/uat/prod, ใครเป็นเจ้าของ channel | — | ต่อ LIFF ไม่ได้ในเดือน 2 |
| Q6 | ช่องทางแจ้งเตือนผู้จองผ่านเว็บ (SMS gateway ธนาคาร?) | S3 | |
| Q7 | สาขาที่เปิดเสาร์-อาทิตย์/ในห้าง และเวลาทำการ | proposal ข้อ 2.2 | กระทบตาราง slot |

ทุกคำตอบที่ทำให้ข้อสมมติไม่จริง → บันทึกและส่ง SA/PM เป็น change request ไม่ดูดซับเข้า buffer เงียบ ๆ

## 7. สิ่งที่ผมไม่ได้ตัดสิน / ต้องให้คนอื่นยืนยัน

| เรื่อง | เจ้าของ |
|---|---|
| ใครเป็น Tech Lead (ต้องไม่ใช่ปอนด์, ≤ 2 โปรเจกต์) และรับรองแผนนี้ | PM office + MD (C6) |
| SA ของโครงการ (`sa-ton` ตามคำตัดสิน MD) รับรอง ADR | `sa-ton` |
| ปลายทาง log/APM ในไทย | DevOps + จัดซื้อ (C1) |
| สัญญา API forecast และ ML 22 md | `ml-jay` (C5) |
| สิทธิ์ใช้โค้ดจากงานเกษตรไทย / NovaQueue — **แผนนี้ไม่นำโค้ดเหล่านั้นมาใช้** จนกว่าฝ่ายกฎหมายยืนยันสิทธิ์ IP (internal-notes D2) | ฝ่ายกฎหมาย + `pm-beam` |
| การแก้ skill `project-scaffold` ให้มี profile booking | `dev-mew` หลังโปรเจกต์นี้ + เช็กผลกระทบด้วย `skill-finder` |

## 8. ความเสี่ยงฝั่ง Dev

| ความเสี่ยง | ผล | ทางรับมือ |
|---|---|---|
| Q-Matic API ทำไม่ได้ตามที่คิด (S4) | งาน `kiosk` บานปลาย กระทบ integration เดือน 3 | mock ตั้งแต่ ม.ค. · เปิดตัวจำลองตู้ให้ได้ต้นเดือน 3 · SA แจ้ง CR ทันทีที่เห็นเอกสาร |
| sandbox + mTLS ช้ากว่า 26 ก.พ. (S1) | integration ไปชน pen test เหมือนแผนที่ MD ตีกลับ | ทำทุกอย่างบน mock ก่อน · core-connector แยก repo ทดสอบได้อิสระ · แจ้ง PM ทันทีที่เลื่อน |
| cookie/refresh ใน LINE in-app browser ทำงานต่างจากเบราว์เซอร์ | ผู้ใช้หลุด session (บั๊กแบบ ShopDee) | spike สัปดาห์ 2 + E2E บน LIFF จริงใน uat |
| log หลุดข้อมูลส่วนบุคคลไปผู้ให้บริการ log | ผิดภาคผนวก PDPA | redact ที่ logger + test · audit แยกเก็บในไทย · เจอใน log → แจ้ง DevOps และ `plat-may` ภายใน 1 ชม. |
| client cert mTLS หมดอายุเงียบ | ยืนยันตัวตนลูกค้าไม่ได้ทั้งระบบ (Sev 1) | alert 21 วัน + ทะเบียน cert ใน repo |
| buffer ตึง (32 md) | งานแก้ pen test/UAT ไม่พอ | ไม่เพิ่มของนอก TOR · ปิดรับฟีเจอร์ 31 มี.ค. |
