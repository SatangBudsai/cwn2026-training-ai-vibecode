# deal-001 nlp-queue — แผนขึ้นโปรเจกต์ (scaffold plan)

> เอกสารภายใน ห้ามแนบไปกับ proposal · จัดทำ: มิว (`dev-mew`, tech lead ที่เสนอ — รอปอนด์ยืนยัน) · 3 พ.ย. 2026 · **แผนเท่านั้น ยังไม่สร้างโค้ด**
> อ้างอิง: `SPEC.md` v0.2 · `TEST-PLAN.md` v0.2 · `deal-001-workplan-r2.md` · `approval.md` (รอบ 3) · skill `project-scaffold` v1.0.0 · coding-rules v2026.2 · arch-standards v4 · `deploy-runbook`

---

## 0. สถานะและเงื่อนไขก่อนเริ่มจริง

| เรื่อง | สถานะ | ผลต่อแผนนี้ |
|---|---|---|
| MD | 🟡 **อนุมัติแบบมีเงื่อนไข** (รอบ 3) — A1–A4 ต้องครบก่อนยื่น 13 พ.ย. · B1–B3 ต้องครบก่อนเซ็นสัญญา | ยังไม่ได้งาน ยังไม่ได้เซ็นสัญญา → ตอนนี้เตรียมได้แค่บนโต๊ะเรา ด้วยข้อมูลสังเคราะห์ |
| A4 ใช้งานเกษตรไทยซ้ำได้ไหม (เมย์ + ปอนด์) | รอคำตอบ | กำหนดว่าจะใช้ทาง R (reuse) หรือ N (สร้างใหม่) ในข้อ 4 |
| B1 ทีมครบ | รอ | **ถ้า B1 ไม่ครบ ให้เลื่อนวันเริ่มงาน** (MD สั่งไว้) → ห้ามเปิด repo ของลูกค้าก่อนรู้ว่าทีมครบ |
| วันเริ่ม | คาด จ. 4 ม.ค. 2027 (W1) | งบตั้งโครง + ADR + CI = **4 man-day ของ Senior Dev** (workplan-r2 ข้อ 2) ต้องเสร็จใน W1–W2 |

**สิ่งที่ทำได้ก่อนเซ็นสัญญา (ไม่กิน man-day ของดีล):** เพิ่มโหมด booking ให้ skill (ข้อ 2) และร่าง ADR ไว้ล่วงหน้า · **สิ่งที่ห้ามทำ:** สร้าง repo ภายใต้ชื่อลูกค้า, ขอ sandbox/ข้อมูลจริง, ดึงโค้ดเกษตรไทยมาก่อนที่เมย์ยืนยันสิทธิ์

---

## 1. template ของ skill ตรงกับงานนี้แค่บางส่วน

`project-scaffold` สร้างระบบ **สมาชิก + ชำระเงิน** แต่ nlp-queue **ไม่มีการชำระเงิน** และลูกค้าไม่ได้ login ด้วยอีเมล + รหัสผ่าน

| ส่วนใน template | ตัดสิน | เหตุผล / สิ่งที่ต้องทำ |
|---|---|---|
| `auth` — access 15 นาที, refresh หมุนทุกครั้ง + reuse detection, cookie `Path=/api/auth`, client refresh ล่วงหน้า `min(60 วิ, ครึ่ง TTL)`, Web Locks | ✅ **เก็บแกนทั้งหมด** | FR-IDN-06, TC-IDN-07, TC-SEC-06 ใช้กติกาเดียวกัน · ตัดส่วน register/login ด้วยอีเมล + รหัสผ่านออก แล้วให้ token มี `subjectType = customer \| staff` |
| login อีเมล + รหัสผ่าน | ❌ ตัด | ลูกค้า = เลขบัตร + วันเกิด + OTP (FR-IDN-01..03) · พนักงาน = Entra ID OIDC (FR-BRN-01) ระบบเราไม่มีรหัสผ่าน |
| `member` (โปรไฟล์ + ระดับ + consent) | ❌ ตัดโมดูล · ย้าย consent | ห้ามเก็บข้อมูลลูกค้าไว้นานเกิน session (FR-IDN-08) · ย้าย consent + เวอร์ชันข้อความไปไว้ใน `identity` (FR-IDN-09) |
| `payment` + ThaiPay webhook | ❌ ตัดโมดูล · **เก็บ pattern** | ใช้วิธี "insert event ก่อน ถ้าชน unique ตอบ 200 แล้วจบ" + ตรวจ HMAC + `timingSafeEqual` กับ **LINE webhook** (`x-line-signature` = base64 HMAC-SHA256 ด้วย channel secret) และ Q-Matic callback → ตาราง `inbound_events` (TC-SEC-07) · ใช้ "สถานะเดินทางเดียว + `UPDATE ... WHERE status = from`" กับสถานะของ booking และ ticket |
| `notification` (BullMQ + worker) | ✅ เก็บ ปรับ provider | LINE push + SMS ของธนาคาร (Q-05) · idempotency key = `bookingId:type` · job มีแค่ `bookingId` ส่วน worker ไปดึงช่องทางติดต่อเอง (decisions ข้อ 7) |
| `audit` | ✅ เก็บ **ยกระดับ** | NFR-SEC-04: เพิ่ม IP, บันทึก "การอ่าน" ข้อมูลลูกค้าด้วย, append-only ที่ระดับ DB (ไม่ให้สิทธิ์ UPDATE/DELETE กับ role ของแอป + มี trigger กันไว้), เก็บ ≥ 2 ปี, ค้นได้ (FR-ADM-03) |
| `lib/` (logger pino + redact, db, redis, queue, app-error, http `route()`/`requireUser()`), `config/env.ts`, `/healthz` `/readyz` (timeout 2 วิ) | ✅ เก็บ | เพิ่ม redact: เลขบัตร, OTP, เบอร์เต็ม, LINE userId (NFR-SEC-03) · `requireUser()` เพิ่มการตรวจ role + สาขา |
| E2E `checkout.spec.ts` | 🔁 เขียนใหม่เป็น `booking.spec.ts` | หลักการเดิม: ตั้ง access 5 วิ แล้วให้ token หมดระหว่างกรอกจอง ต้องจองสำเร็จโดยไม่เด้งไป login (TC-IDN-07) |
| E2E `login.spec.ts` | 🔁 เขียนใหม่ | OTP ลูกค้า (อ่านจาก SMS stub) + SSO พนักงาน (mock OIDC) |
| `.env.example` THAIPAY_* | ❌ ตัด | ดูรายการ env ใหม่ในข้อ 5 |

### ปัญหากับสคริปต์ของ skill (ต้องแก้ก่อนใช้กับงานนี้)
- `scaffold.mjs` **ไม่ทำงานถ้าไม่มี `packages`** (ต้องมีอย่างน้อย 1 รายการ) และสร้าง `payment` ทุกครั้ง
- `check.mjs` กำหนดตายตัวว่าต้องมีโมดูล `auth member payment notification audit` และ env `THAIPAY_*` → ถ้าใช้กับ nlp-queue **จะไม่ผ่านแน่นอน**

## 2. วิธีขึ้นโครง — แนะนำ: เพิ่มโหมด booking ให้ skill

| ทาง | ทำอย่างไร | ข้อดี / ข้อเสีย |
|---|---|---|
| **A (แนะนำ)** | เพิ่ม `profile: "booking"` ใน `scaffold.json`: ไม่บังคับมี `packages`, รายชื่อโมดูลและ env ที่ต้องมีอ่านจาก config · `check.mjs` อ่านรายชื่อโมดูลจาก `scaffold.json` · ใช้ test ป้องกันบั๊ก token ชุดเดิมแต่เปลี่ยนเป็นจองคิวแทนการจ่ายเงิน | ใช้ซ้ำได้กับงานจองคิว/นัดหมายถัดไป (เกษตรไทย, deal ธนาคารอื่น) · ใช้เวลาประมาณ 1 วัน เป็นงานปรับ skill **ไม่ใช่ man-day ของดีล** · ทำได้ช่วง ธ.ค. |
| B | สร้างด้วย package หลอก 1 ตัว แล้วลบ `payment`/`member` ออกเอง และไม่ใช้ `check.mjs` | เร็ว แต่จะเหลือของที่ไม่ใช้ค้างอยู่ และไม่มีตัวตรวจอัตโนมัติ ซึ่งขัดกับขั้น 3 ของ skill |

ไม่ว่าจะเลือกทางไหน ห้ามถอดของที่กันบั๊กเดิมออก (รายการ "ห้าม" ของ skill) และห้ามแก้ test ให้ผ่าน

## 3. Repo และ service (arch-standards: `<project>-<part>`)

| Repo | อะไร | ขึ้นด้วย | เจ้าของ |
|---|---|---|---|
| `nlp-queue-web` | modular monolith Next.js 15 + TS + Prisma + BullMQ worker | skill (ข้อ 2) | มิว |
| `nlp-core-connector` | service แยก Node/TS, mTLS กับ Customer Lookup API (ADR-0001) | โครงเล็ก เขียนเอง: route เดียว, Zod, pino, `/healthz` `/readyz`, client cert จาก KMS/secret store | มิว |
| `nlp-forecast-service` | Python batch รายคืน + MLflow (ADR-0002) | ML ขึ้นเอง | เจ (`ml-jay`) |
| infra-as-code | region ไทย, env, WAF, backup | DevOps | อาร์ต (`ops-art`) |

### โมดูลใน `nlp-queue-web` (SPEC หัวข้อ 6 + `auth`)

| โมดูล | Prisma schema | ตารางหลัก | FR | event ที่ปล่อย |
|---|---|---|---|---|
| `auth` *(เพิ่มจาก SPEC — ADR-0003)* | `auth` | `refresh_tokens` (มี subject_type), `staff_sessions` | FR-IDN-06, FR-BRN-01 | — |
| `identity` | `identity` | `customers` (`nid_hmac` UNIQUE, `nid_ciphertext` ถ้าจำเป็น, `line_user_id`), `consents`, `otp_attempts` (หรือใช้ Redis + TTL) | FR-IDN-01..09 | — |
| `booking` | `booking` | `bookings`, `slot_counters` | FR-BKG-01..13 | `booking.created/rescheduled/cancelled/checked_in` |
| `walkin` | `walkin` | `tickets`, `qmatic_sync_states`, `hourly_counts` (ไม่มีข้อมูลระบุตัวลูกค้า) | FR-WLK-01..04 | `ticket.issued/called/served` |
| `branch` | `branch` | `branches`, `service_types`, `counter_templates`, `counter_overrides`, `holidays` | FR-BRN-02..08, FR-ADM-01..02 | — |
| `notification` | `notification` | `notification_logs`, `inbound_events` (LINE webhook) | FR-NTF-01..06 | `notification.sent/failed` |
| `report` | `report` | ตาราง aggregate รายสาขา/ชั่วโมง (สร้างจากคิว `report.*`) | FR-RPT-01..05 | — |
| `admin` | — (เรียกผ่าน `index.ts` ของ branch/audit) | — | FR-ADM-01..03 | — |
| `audit` | `audit` | `audit_logs` (append-only) | NFR-SEC-04 | — |

**ข้อมูลที่ forecast-service ใช้ร่วม:** ห้ามอ่านตารางของโมดูลอื่นตรง ๆ → ให้ `walkin` เปิด view `walkin.v_hourly_counts` ที่อ่านได้อย่างเดียว ผ่าน DB role แยก และ forecast-service เขียนลง schema `forecast` ของตัวเอง ส่วน `branch` อ่านผ่าน view อีกที → กำหนดใน ADR-0002 (รวมถึงการเลือกระหว่าง BullMQ กับ RabbitMQ ถ้า forecast ต้องรับ event)

## 4. booking engine — จุดที่เสี่ยงที่สุดของการขึ้นโครง

**กันจองซ้อน (FR-BKG-03, TC-BKG-03 ส่ง 10 คำขอพร้อมกัน ต้องสำเร็จแค่ 1):** จำนวนช่องมีมากกว่า 1 จึงใช้ unique `(branch, service, slot)` ตรง ๆ ไม่ได้ → ใช้ Redis slot lock (TTL 5 นาที) + `slot_counters` อัปเดตแบบมีเงื่อนไข `UPDATE ... SET booked = booked + 1 WHERE booked < capacity` ใน transaction เดียวกับ insert booking · partial unique index `(customer, branch, date) WHERE status = active` สำหรับ FR-BKG-05 · ส่วนการเลื่อนคิว (FR-BKG-06) ทำใน transaction เดียว → ADR-0004

**บทเรียนเรื่องเขตเวลา (งานเกษตรไทย `kaset-appointment-web` CI #1873, 2 พ.ย. 2026):** หลัง refactor ไปใช้ `date-fns-tz` (commit ของมิวเอง 30 ต.ค.) ถ้า runner ตั้ง TZ=UTC ช่วง 15:00 จะถูกแปลงเป็น 22:00 ทำให้ capacity = 0 และได้ 409 · ในเครื่องที่ตั้ง TZ=Asia/Bangkok ไม่เจอบั๊กนี้ ดังนั้นในโครงใหม่ต้อง:
- เก็บเวลาเป็น `timestamptz` (UTC) และแปลงเป็นเวลาท้องถิ่นด้วย `Asia/Bangkok` แบบระบุชัดในฟังก์ชันเดียวของ `booking` ห้ามพึ่ง TZ ของเครื่อง
- CI รัน unit + E2E **สองรอบ TZ=UTC และ TZ=Asia/Bangkok** · test case ช่วงก่อนสาขาปิด (15:00/15:30) และข้ามเที่ยงคืน UTC
- ⚠️ **แยกจากดีลนี้แต่เร่งด่วน:** เกษตรไทยจะ deploy release/2026.11 วันที่ **10 พ.ย. 2026** โดยที่บั๊กนี้ยังอยู่ → มิวต้องแก้หรือขอเลื่อนก่อน และถ้าจะใช้ booking engine ซ้ำ ต้องเอารุ่นที่แก้แล้วเท่านั้น

**ทางแยกตามคำตอบ A4**
| | R — ใช้ซ้ำได้ (เมย์ยืนยันสิทธิ์ + ปอนด์ยืนยันด้านเทคนิค) | N — ใช้ซ้ำไม่ได้ |
|---|---|---|
| ทำอย่างไร | port booking engine, slot lock, LINE notification, UX ผู้สูงอายุ จากเกษตรไทย (รุ่นที่แก้ TZ แล้ว) เข้าโมดูลตามโครงนี้ ไม่ copy ทั้ง repo · ไม่ใช้โมเดล r03 และข้อมูลเกษตรไทย (workplan-r2 ข้อ 2 เงื่อนไข 3) | สร้างใหม่บนโครงนี้ตามข้อ 4 ด้านบน |
| man-day | ตามแผน (Senior 53 / Dev 94) | +25 (Senior +12, Dev +13) · margin 27.3% · buffer ของ Dev หมด · ต้นตระกูลต้องลงแผนให้เห็นก่อนยื่น (A4) |
| ผลต่อการขึ้นโครง | sprint 1 (W3–W4) เป็นงาน port + test | sprint 1 ใช้เวลาไปกับ booking engine เต็ม ๆ → ต้องเริ่ม identity ตั้งแต่ W2 |

## 5. Env, stub และ config

**`.env.example` (ค่าตัวอย่างเท่านั้น):** `DATABASE_URL` (`nvt_nlpqueue_<env>`), `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL_SEC`, `NID_HMAC_KEY` (production ดึงจาก KMS), `KMS_KEY_ID`, `CORE_CONNECTOR_URL`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_TOKEN`, `LIFF_ID`, `SMS_GATEWAY_URL`, `SMS_API_KEY` (รอ Q-05), `QMATIC_BASE_URL`, `QMATIC_API_KEY` (รอ Q-13/Q-22), `TEST_ENDPOINTS_ENABLED`, `LOG_LEVEL` · cert mTLS อยู่ใน `nlp-core-connector` เท่านั้น

**stub ที่ต้องมีตั้งแต่วันแรก** (ความเสี่ยงอันดับ 1 ใน SPEC ข้อ 7 คือ sandbox มาช้ากว่า W3): Customer Lookup stub (มีโหมดตอบช้า > 3 วิ ใช้กับ TC-IDN-05), Q-Matic simulator, SMS stub ที่ `GET /api/test/sms`, mock OIDC ที่มีผู้ใช้ทดสอบ 5 บทบาทตาม TEST-PLAN, fixture `customers.json` ที่เป็นข้อมูลสังเคราะห์
→ `/api/test/*` เปิดได้เฉพาะเมื่อ `TEST_ENDPOINTS_ENABLED=true` และ **`env.ts` ต้องไม่ยอมเปิดใน prod** (ทำเหมือนที่บังคับ TTL 900 ใน prod)

**⚠️ env ไม่ตรงกับมาตรฐาน:** TEST-PLAN ใช้ `perf` (load test) และ `sec` (pen test) แต่ arch-standards กำหนดให้มีแค่ `dev` `uat` `prod` → ต้องตกลงกับต้นตระกูล + อาร์ตก่อน W1 ว่าจะเขียน ADR-0005 ขอยกเว้น หรือจะใช้ `uat` ที่ตรึง build แทน · กระทบงบ hosting (CL-M) และภาคผนวก PDPA ข้อ 2 (env เพิ่มก็ต้องอยู่ region ไทยด้วย)

## 6. ADR ที่ต้องเขียนในช่วง W1–W2

| ADR | เรื่อง | ผู้อนุมัติ |
|---|---|---|
| 0001 | แยก `nlp-core-connector` (mTLS, เกณฑ์ 2.4) | ต้นตระกูล |
| 0002 | แยก `nlp-forecast-service` + การใช้ข้อมูลร่วมผ่าน view/schema `forecast` + BullMQ หรือ RabbitMQ | ต้นตระกูล + เจ |
| 0003 | โมเดล session: ลูกค้า (OTP) และพนักงาน (OIDC → token ของเราตามข้อ 9) + เพิ่มโมดูล `auth` นอก SPEC | ต้นตระกูล + ปอนด์ (เจ้าของ coding-rules) |
| 0004 | booking engine: slot counter + Redis lock + เขตเวลา (+ ใช้ซ้ำจากเกษตรไทยหรือไม่) | ต้นตระกูล |
| 0005 | env `perf`/`sec` (ข้อยกเว้นมาตรฐาน) | ต้นตระกูล + อาร์ต |
| 0006 | audit append-only + retention 2 ปี + anonymize การจอง (Q-16) | ต้นตระกูล + เมย์ (PDPA) |

## 7. ลำดับงาน

**ก่อนเซ็นสัญญา (พ.ย.–ธ.ค. 2026 · บนโต๊ะ dev-mew · ข้อมูลสังเคราะห์)**
1. ⚠️ แก้บั๊ก TZ ของเกษตรไทยก่อน deploy 10 พ.ย. (งานของเกษตรไทย ไม่ใช่ดีลนี้)
2. ปรับ skill ตามทาง A (ข้อ 2) แล้วลองรันกับ `scaffold.json` ร่าง (ข้อ 8) ให้ `check.mjs` ผ่าน · ยังไม่ push ขึ้น repo ลูกค้า
3. ร่าง ADR-0001..0006 รอคำตอบ Q-xx
4. ปรึกษาต้นตระกูล + อาร์ตเรื่อง env (ข้อ 5)

**W1–W2 (4–15 ม.ค. 2027 · 4 man-day ของ Senior)** — เริ่มได้เมื่อ B1 ครบและเซ็นสัญญาแล้ว
| วัน | งาน | เสร็จเมื่อ |
|---|---|---|
| 1 | สร้าง repo 3 ตัว · รัน scaffold ด้วย `scaffold.json` จริง · `check.mjs` ผ่าน | โครงขึ้น, check ผ่านครบ |
| 2 | Prisma schema 8 ตัว + migration แรก · stub ทุกระบบ · `.env.example` | `prisma migrate dev` ผ่าน · `/readyz` 200 · Redis ล่มแล้วได้ 503 |
| 3 | CI: lint, `tsc`, vitest (coverage ≥ 80%) TZ 2 รอบ, Playwright, `next build`, scan PII ใน log · env `dev` (อาร์ต) | pipeline เขียวบน `dev` |
| 4 | ADR-0001..0006 เป็นฉบับจริง · walkthrough ให้ทีม Dev 2 คน + ML | ทีมเริ่ม sprint 1 ได้ W3 |

**Definition of done ของโครง** (ก่อนส่งต่อ sprint 1)
- `check.mjs` (โหมด booking) ผ่านครบ · `tsc` strict ผ่าน · `service.ts` coverage ≥ 80%
- E2E: `booking.spec` ที่ token 5 วิแล้วจองสำเร็จโดยไม่เด้ง login, `auth.refresh_reused` = 0 · login OTP + SSO mock
- concurrency test: ส่ง 10 คำขอพร้อมกันไปยังช่องสุดท้าย ต้องสำเร็จ 1 ที่เหลือได้ 409 (โครงของ TC-BKG-03)
- LINE webhook: ลายเซ็นผิดถูกปฏิเสธ 401 · event ซ้ำ 3 ครั้งประมวลผลครั้งเดียว (TC-SEC-07)
- ค้นเลขบัตรสังเคราะห์ใน DB, log, error response ต้องไม่เจอแบบข้อความธรรมดา (โครงของ TC-SEC-01)
- `SCAFFOLD-REPORT.md` → ส่งต่อ `coding-standard` (ปอนด์) → `test-from-plan` (QA) → `deploy-checklist` (อาร์ต)

## 8. ร่าง `scaffold.json` (โหมด booking — ใช้ได้หลังทำข้อ 2 ทาง A)

```json
{
  "profile": "booking",
  "name": "nlp-queue",
  "title": "ระบบจองคิวสาขา",
  "client": "ธนาคารนครหลวงพัฒนา จำกัด (มหาชน)",
  "consentVersion": "2027-01-v1",
  "modules": ["auth", "identity", "booking", "walkin", "branch", "notification", "report", "admin", "audit"],
  "todos": [
    "OTP: ใช้ Customer Lookup API ส่งเอง หรือให้เราส่งผ่าน SMS gateway ของธนาคาร (Q-05)",
    "Entra ID group → role + attribute สาขา (Q-10)",
    "Q-Matic: เครือข่ายสาขาออก cloud ได้ไหม ถ้าไม่ได้ต้องมี agent ที่สาขา ซึ่งเปลี่ยน architecture (Q-13)",
    "กติกาคิวจองกับ walk-in (Q-06) · นิยามเวลารอ (Q-07) — ยืนยันกับลูกค้า",
    "ค่า default 14 วัน / 30 นาที / 2 คิว (Q-02, Q-03) — ตั้งเป็น config ไม่ hard-code",
    "ภาษาอังกฤษ (Q-12) — เตรียมโครง i18n ไว้แต่ยังไม่แปล",
    "consentVersion และข้อความ privacy notice — ยืนยันกับลูกค้า"
  ]
}
```
ไม่มีข้อมูลส่วนบุคคลของผู้ประสานงานหรือลูกค้าในไฟล์นี้ (customer-data-policy)

## 9. สิ่งที่รอคนอื่น (กระทบการขึ้นโครง)

| ถึง | เรื่อง | กระทบ |
|---|---|---|
| ปอนด์ (`dev-pond`) | ยืนยันมิวเป็น tech lead · ด้านเทคนิคของการใช้งานซ้ำ (A4) · ADR-0003 (เพิ่มโมดูล auth) | คนขึ้นโครง, ทาง R/N |
| เมย์ (`plat-may`) | สิทธิ์ใช้โค้ดเกษตรไทยซ้ำ (A4) · ADR-0006 | ทาง R/N |
| ต้นตระกูล (`sa-ton`) | เพิ่มโมดูล `auth` นอก SPEC หัวข้อ 6 · env `perf`/`sec` | SPEC v0.3 |
| อาร์ต (`ops-art`) | A1 (log/backup อยู่ในไทย) · env `dev` พร้อมภายใน W1 · ข้อยกเว้น env | CI W1, ภาคผนวก PDPA |
| ธนาคาร (ผ่าน SA) | Q-05, Q-10, Q-13, Q-22 | stub ต้องใช้แทนไปนานแค่ไหน |
