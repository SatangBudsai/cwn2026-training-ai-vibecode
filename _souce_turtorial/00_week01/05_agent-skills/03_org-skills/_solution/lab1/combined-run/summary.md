# LAB 1 · ผลรันจริงของพรอมต์รวม (24 โต๊ะ)

- รันที่สำเนาแยก `C:/t/org05r/novatech` ด้วย `claude -p` (Opus 5.5) วาง [`prompt.txt`](prompt.txt) ที่ `novatech/` ทุกตัวอักษร
- รอบ 1 · 07:50:18–08:01:37 · Claude เปิด workflow agent ย่อยครั้งละ 4 ตัว เสร็จ 9 โต๊ะ (+ dev-mew ค้างกลางทาง) แล้ว `claude -p` หยุดงานเบื้องหลังเองหลังจบ turn 10 นาที (`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`) · ในแอป Claude Code ไม่มีข้อจำกัดนี้
- รอบ 2 · 08:01:59–08:17:24 · วางพรอมต์เดิมซ้ำ (ตั้ง `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`) ข้าม 9 โต๊ะที่เสร็จแล้วตามพรอมต์ ทำอีก 15 โต๊ะ
- ตรวจหลังรอบ 2 พบว่า `md-somchai` มีแค่โฟลเดอร์ `deal-approval/references/` ว่าง ๆ ไม่มี `SKILL.md` (agent ถูกตัดกลางทางในรอบ 1) แต่รอบ 2 ข้ามไปเพราะพรอมต์เดิมเขียนว่า "ข้ามโต๊ะที่มี skill อยู่แล้ว" → แก้พรอมต์เป็น "ข้ามโต๊ะที่มีไฟล์ `SKILL.md` อยู่แล้ว"
- รอบ 3 · 08:29:50–08:33:37 · วางพรอมต์ที่แก้แล้ว ข้าม 23 โต๊ะ ทำใหม่แค่ `md-somchai`
- รวม **24/24 โต๊ะได้ skill ครบ (มี `SKILL.md` ทุกโต๊ะ)** · ราว 31 นาที · ค่าใช้จ่ายที่ CLI รายงาน 27.06 USD
- ผลงานของทุกโต๊ะ: [`desks/`](desks/) (skill อยู่ที่ `desks/<user>/skills/` = `.claude/skills/` ในโต๊ะจริง · ตัด `node_modules/` ของ dev-mew ออก)

## สรุปของ Claude ตอนจบรอบ 2

LAB 1 is finished for all 24 people. 15 desks were run with a new agent each, 4 at a time, and 9 desks already had a skill so I skipped them. On disk, all 15 desks now have a `SKILL.md` whose header says `owner: <user>`. Nothing in `company-kit/`, `people/`, `seed/` or the 4 desks without a prompt file (dev-new, hr-namtan, plat-ken, sales-mook) was changed.

| user | skill ที่ได้ | ไฟล์ใน work/ | มีปัญหาอะไรไหม |
|---|---|---|---|
| dev-mew | project-scaffold | `member-pay-starter/` (โปรเจกต์เดิมที่มีอยู่ agent ตรวจและแก้ต่อ) | test ผ่าน 29 ข้อ ไม่ได้รัน `prisma migrate` เพราะเครื่องนี้ไม่มี PostgreSQL ยังไม่มี E2E ด้วย Playwright ซึ่งกติกาข้อ 6 บังคับ ไม่มี OTP และ reset password |
| hr-oat | onboarding-pack | `dev-new-2026-11-09/` (3 ไฟล์: checklist, จดหมายต้อนรับ, ข้อความขอของ) | กำหนดส่งคำขอคือ 2 พ.ย. ซึ่งเลยมาแล้ว ข้อความจึงเป็นแบบ "ด่วน" agent เดาเองว่าคนใหม่คือ dev-new และเลือกพี่เลี้ยงเป็น dev-mew |
| ml-jay | mlflow-experiment | `2026-W45-queue-forecast-experiments.md`, `compare-runs.md`, `run-registry.csv` | r03 กับ r02 ใช้ข้อมูลคนละรุ่น จึงเทียบกันตรง ๆ ไม่ได้ ไม่ได้รัน r04 และไม่ได้ลง MLflow จริง (ไม่มีข้อมูลดิบและเซิร์ฟเวอร์) ใน CSV ไม่มีค่า seed |
| ml-pim | model-release | `r03-release-plan.md` | ยังปล่อย r03 ไม่ได้จนกว่าจะรันเทียบบนข้อมูล v4 ตัวเลขเกณฑ์ถอยกลับ agent ตั้งเอง ต้องให้ ml-jay อนุมัติ |
| ops-art | deploy-checklist | `deploy-checklist-2026.11.md` | runbook ไม่บอกว่ารอบนี้เป็นระบบหรือลูกค้าไหน จึงเว้นช่องไว้ ⚠ cert ของ BaanRai หมดอายุ 2 พ.ย. และยังไม่มีใครยืนยันว่าต่อแล้ว |
| ops-fon | postmortem | `postmortem-2026-09-18-shopdee-payment.md` | ⚠ เตือนเรื่อง cert ของ BaanRai เหมือนกัน รายงานถึงลูกค้าเลยกำหนดส่ง 21 ก.ย. มาแล้ว |
| plat-may | customer-data-policy | `INV-2026-0142-pdpa-review.md`, `INV-2026-0142-redacted.md` | ใบแจ้งหนี้มีชื่อและเบอร์มือถือของลูกค้าปลายทาง จึงยังส่งไม่ได้ VAT ผิด (ที่ถูกคือ 51,800 รวม 791,800) ส่งต่อให้ fin-nok แก้ ระบบไม่ยอมให้สร้างไฟล์ `report-template.md` จึงย้ายโครงรายงานเข้าไปใน SKILL.md |
| pm-beam | prd-writer | `2026-11-04-novaqueue-q3-prioritization.md`, `PRD-NQ-2026-11-line-queue-alert.md` | ไฟล์ feedback F-08 ใน company-kit มีชื่อและเบอร์ลูกค้า ควรแจ้ง plat-may ให้ปิดบัง ช่อง `follows` ว่าง ตัวเลข effort และเป้าหมาย agent ประมาณเอง |
| pm-gift | product-sunset | `novaqueue-v1-sunset-plan.md`, `novaqueue-v1-eol-announcement-draft.md` | ต้องให้ MD อนุมัติก่อนประกาศ มีเรื่องรอตัดสินใจ 5 ข้อ (D1–D5) ไม่มีราคา v2 และไม่มีเนื้อหา DPA ของธนาคาร |
| qa-bank | bug-report | `BUG-2026-11-02-booking-1500-slot-full.md` | บั๊กเรื่องเขตเวลา UTC ทำให้จองไม่ได้ release จะ deploy 10 พ.ย. ยังอธิบายไม่ได้ว่าทำไมช่วงเวลาอื่นผ่าน ยังไม่ได้ลองเรียกใช้ skill จริง |
| qa-mint | test-from-plan | (โจทย์ไม่ได้ให้ทำ work) | คัดลอกครบ 15 ไฟล์ แก้แค่ metadata 6 บรรทัด hash ของไฟล์อื่นตรงกับต้นฉบับ ไม่มีปัญหา |
| sa-ice | arch-template | `deal-001-architecture.md` | ลอง render แผนภาพแล้วผ่าน มีคำถามค้างถึงลูกค้า 4 ข้อ (SMS OTP, เส้นทางเครือข่าย, Q-Matic, การเลือกช่องทางแจ้งเตือน) |
| sa-ton | req-to-spec | `deal-001-spec.md`, `deal-001-test-plan.md` | TOR ขัดกันเอง: การยืนยันตัวตนต้องใช้ CIF แต่คนที่มาเปิดบัญชียังไม่มี CIF เกณฑ์ MAPE ยังไม่ชัด ตัวเลขหลายตัวเป็นสมมติฐาน มีคำถามถึงลูกค้า 22 ข้อ |
| sales-krit | follow-up-email | `2026-11-04-deal-002-follow-up-email.md` | คำว่า "ผ่าน pen test ทุกครั้ง" ขัดกับ proposal ปี 2024 จึงไม่ได้ใส่ในอีเมล ช่องลายเซ็นยังว่าง |
| sales-nida | sales-proposal | `deal-001-proposal-nlp-bank.md`, `deal-001-pricing-internal.md` | ราคา 4,792,000 บาท margin 35.3% ห่างวงเงินแค่ 8,000 บาท man-day ตึงมาก ถ้าต้องใช้ MA แบบ 24x7 ราคาจะเกินงบ |
| cco-wit, cfo-ying, cto-nat, dev-pond, exec-ploy, fin-joy, fin-nok, hr-fah, md-somchai | ข้าม เพราะมี skill อยู่แล้ว | – | – |

**เรื่องที่เกิดซ้ำหลายโต๊ะ:**
- **ไม่มีนิยามของ `uses` / `next` / `follows`:** ทุก agent ตีความเอง และไม่ตรงกัน เช่น บางคนใช้ `follows` หมายถึงนโยบายที่ต้องทำตาม บางคนหมายถึง skill ที่ส่งงานมาให้ ควรให้ plat-ken ออกกติกาหัวไฟล์ แล้วไล่แก้ทั้ง 15 skill
- **วันที่ไม่ตรงกัน:** README ใน company-kit บอกว่าวันนี้คือ 3 พ.ย. แต่เครื่องเป็น 4 พ.ย. ทุก agent ที่ใช้วันที่ตรวจแล้วว่าไม่กระทบผล
- **ทุก agent ทำตามกฎ:** รายงานว่าไม่ได้เปิดโต๊ะของคนอื่นหรือ `_solution/` และบนดิสก์ไม่พบการเขียนไฟล์นอกโต๊ะของตัวเอง