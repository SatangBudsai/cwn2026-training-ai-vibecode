# LAB 4 (ต่อ) · ผลรันจริงแบบวางพรอมต์ครั้งเดียว (2026-11-05)

รันที่สำเนาแยก `C:/t/org05p/novatech` (บริษัท 28 คน หลัง LAB 5) ด้วย `claude -p` ที่โฟลเดอร์ `novatech/` · พรอมต์ = [`prompt.txt`](prompt.txt) ทุกตัวอักษร · รวม 25 นาที 15 วินาที (21:00:17 → 21:25:32)

## คำตอบสุดท้ายของ Claude ตัวหลัก (ผู้ประสานงาน)

deal-001 is done for this round. MD gave a **🟡 conditional approval** in round 3, and I sent work to all 5 departments. The deal is **not ready to submit to the bank yet**: conditions C1–C5 must be closed by 10 Nov, and C6 must be closed before the contract is signed.

All 10 desk runs exited with code 0. Logs are in `logs/lab4b/<ลำดับ>-<user>.jsonl`. I didn't change any file in the deal folder myself.

| ขั้น | โต๊ะ | skill ที่หยิบเอง (จาก log) | เวลา | ไฟล์ที่ได้ (ใน `deals/deal-001/`) | ผล |
|---|---|---|---|---|---|
| 1 | sales-nida | `sales:sales-proposal` | 4:02 | proposal, internal-notes, pricing-input.json, pricing-output.md, **resubmit-to-md.md** | Added the 3-item PDPA annex and switched to price version B: 4,800,000 baht, margin 27.1% |
| 2 | md-somchai | `exec:deal-approval` | 2:09 | approval.md (new), approval-r1.md, work/deal-001/deal-input-r2.json | ❌ Rejected on item 2 only: big phases overlap in months 4 and 5 |
| 3 | sa-ton | — (no skill) | 4:38 | **sa-response-r2.md** | Revised the plan without changing the price; confirmed 286 man-days (with 8 assumptions) but **could not confirm** LIC-APM keeps logs in Thailand |
| 4 | sales-nida | — | 5:09 | proposal (section 6 + the conditions SA asked for), **sales-requests-r3.md**, internal-notes, resubmit-to-md.md | Put the new plan into the proposal and drafted requests to the DPO, legal and PM office (not actually sent) |
| 5 | md-somchai | `exec:deal-approval` | 2:41 | approval.md (new), approval-r2.md | 🟡 **Conditional approval**, margin 27.1% |
| 6 | dev-mew | — (read `project-scaffold`, didn't call it, because that template is for a payment system) | 3:59 | dev-scaffold-plan.md | Plan in two phases (before/after signing), 2 repos; no code written |
| 6 | ml-jay | `mlops:mlflow-experiment` | 2:09 | ml-experiment-plan.md, work/ml/experiment-registry.csv | P0/P1 experiment plan; r03 (MAPE 15.2%) can't be reproduced yet; draft C5 confirmation |
| 6 | qa-mint | — | 3:36 | qa-test-readiness.md | **Not ready to run**: no TEST-PLAN.md and no system yet; 3 gaps in the proposal's test plan |
| 6 | ops-art | `devops:deploy-checklist` | 3:28 | log-backup-residency.md, work/2027-05-18-nlp-queue-pilot/deploy-checklist.md | Checklist 🔴 NO-GO for now; backup 🟡 needs paperwork; **LIC-APM logs 🔴 not confirmed** |
| 6 | hr-fah | `hr:jd-writer` | 1:55 | work/NVT-JOB-2026-021-senior-fullstack.md, work/NVT-JOB-2026-021-check.md | Job post for Senior Full-stack Developer, 75–105k baht/month |

The loop with MD took 2 of the allowed 3 rounds. In step 6 the 5 desks ran at the same time; the times shown are per desk. I checked the logs: no desk opened another person's desk or `_solution/`. Each one opened only its own department's plugin plus the shared ones (`core`, `novatech-skills`).

**Where the deal stands:** 🟡 approved with conditions. It can be submitted to the bank (deadline 13 Nov 2026) once C1–C5 are closed by 10 Nov.

**Still open, and who owns it:**
- **C1 – proof that logs stay in Thailand:** ops-art with purchasing, by 9 Nov. Both sa-ton and ops-art said they couldn't confirm it. If we have to run our own log system, the price changes and the approval lapses, so it goes back to MD.
- **C2 – breach notice within 24 hours:** the DPO (`plat-may`). If there's no answer by 9 Nov 12:00, sales-nida switches to the 72-hour wording.
- **C3 – wording on penalties and the liability cap:** legal.
- **C4 – document number, and the SA name on the cover page:** sales-nida.
- **C5 – confirm ML 22 man-days is enough:** ml-jay has written a draft but hasn't confirmed it yet. If it isn't enough, it goes back to MD.
- **C6 – team availability:** PM office and Sales confirm sa-ton holds at most 2 projects, and name a Tech Lead who isn't Pond. Must close before signing.
- **Handed back by the 5 departments:**
  - qa-mint: define what "UAT passed" means, because payment 2 (1,435,200 baht) depends on it, and set load-test targets.
  - ops-art: no deploys are allowed from the 25th to month-end, so the pilot system must be live by 18 May.
  - hr-fah: wait for the deal result before posting the job ad, and Sales should check the numbers taken from the TOR.

Two side issues came up:
- **SA name mismatch:** MD's round-2 note sent the plan to "SA (ไอศวรรย์)", but following your mapping I sent it to sa-ton. MD then settled it in round 3: sa-ton is this deal's SA.
- **`price.py` breaks on Windows:** it fails on Thai output unless you set `PYTHONIOENCODING=utf-8`. Whoever looks after that skill should fix it.

## โต๊ะ `1-sales-nida` · 240 วินาที · 36 รอบ

skill ที่หยิบเอง: `sales:sales-proposal`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List allowed files and read MD rejection |
| 2 | Skill | sales:sales-proposal |
| 3 | Bash | Read sales-proposal skill references |
| 4 | Bash | Read current proposal |
| 5 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-sales-nida\7a732220-9ad0-4a63-b03e-b70b5b37c768\tool-results\ |
| 6 | Bash | Read deal internal files |
| 7 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-sales-nida\7a732220-9ad0-4a63-b03e-b70b5b37c768\tool-results\ |
| 8 | Bash | Read TOR and price.py usage |
| 9 | Bash | Write version B pricing input and run price.py |
| 10 | Bash | Rerun price.py with UTF-8 output |
| 11 | Grep | เครดิต\|ค่าปรับ\|ความรับผิด\|credit |
| 12 | Grep | (?i)apm\|monitor\|log\|region\|ภูมิภาค\|ในประเทศ |
| 13 | Grep | (?i)APM\|CL-M\|MA- |
| 14 | Read | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 15 | Bash | Back up round-1 files to my desk |
| 16 | Bash | Archive round-1 pricing input (version A) |
| 17 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 18 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 19 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 20 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 21 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 22 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 23 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 24 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 25 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 26 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 27 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 28 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 29 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 30 | Bash | Run checklist searches on proposal |
| 31 | Bash | Check brand-guide money formatting rules |
| 32 | Bash | Regenerate pricing output for version B |
| 33 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-internal-notes.md |
| 34 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-resubmit-to-md.md |

**คำตอบของโต๊ะนี้**

แก้ proposal deal-001 ครบทุกข้อที่ MD สั่งแล้ว และส่งกลับในโฟลเดอร์ดีลแล้ว แต่ยังมีบางข้อที่ต้องรอคนอื่นยืนยันก่อนยื่นธนาคาร (อยู่ท้ายสรุปนี้)

**ที่แก้ใน `deal-001-proposal-nakhonluang.md`**
- **ภาคผนวก PDPA:** เพิ่ม "ภาคผนวก ก: ภาคผนวก PDPA" ต่อท้ายหัวข้อ 9 มี 3 ข้อตาม template ของ skill ที่อัปเดตแล้ว คือ DPA (ข้อตกลงการประมวลผลข้อมูล), เก็บข้อมูลรวม backup และ log ในประเทศไทยเท่านั้น, และการแจ้งเหตุข้อมูลรั่ว หัวข้อ 2, 4.1 และ 4.2 อ้างถึงภาคผนวกนี้แล้ว
- **ใช้ราคาฉบับ B ตามที่ MD แนะนำ:** 4,800,000 บาท (ไม่รวม VAT), รวม VAT 5,136,000 บาท, margin 27.1% รัน `price.py` แล้วได้ตรงกับตัวเลขของบัญชีทุกบรรทัด แก้หัวข้อ 1, 2 และ 7 ให้ตรงกัน งวดค่าพัฒนาเป็น 1,076,400 / 1,435,200 / 1,076,400 บาท ค้นทั้งไฟล์แล้วไม่เหลือตัวเลขฉบับ A
- **เงื่อนไขสัญญา (หัวข้อ 7):** เครดิต 30 วัน, ค่าปรับรวมไม่เกิน 10% ของมูลค่าสัญญา, ความรับผิดรวมไม่เกินมูลค่าสัญญา, hosting ม.ค.–ธ.ค. 2027 พร้อมตัวเลือกขยายถึงสิ้นปี MA (426,000 บาท) และเพิ่มข้อนี้เป็นคำถามถึงธนาคาร
- **เรื่อง reuse โค้ด:** ตัดคำว่า "ต่อยอดจากงานที่ส่งมอบแล้ว" ออก เพราะยังไม่ได้เช็กสิทธิ์โค้ดของงานเกษตรไทย เหลือแค่อ้างประสบการณ์ของทีม
- **ตรวจก่อนส่ง:** ค้นในไฟล์ไม่พบเบอร์มือถือ เลขบัตร 13 หลัก ต้นทุน หรือ margin

**ไฟล์อื่น**
- `deal-001-internal-notes.md`: แก้ผู้อนุมัติเป็น MD และใส่ตารางว่าแก้ข้อไหนของ MD ไปแล้ว พร้อมเรื่องที่ฉันตัดสินใจแทน (D1–D15)
- `deal-001-pricing-input.json` และ `deal-001-pricing-output.md`: เปลี่ยนเป็นฉบับ B
- `deal-001-resubmit-to-md.md`: บันทึกส่งกลับให้ MD ตอบทีละข้อ
- ไฟล์รอบแรกสำรองไว้ที่ `desks/sales-nida/archive/deal-001-r1/` ไม่ได้แก้ `approval.md` หรือไฟล์ของบัญชี

**ต้องตัดสินใจ**
- **แจ้งเหตุข้อมูลรั่ว:** MD เขียนไว้ 72 ชั่วโมง แต่ template ของ DPO ใน skill ใหม่กำหนด 24 ชั่วโมง และห้ามแก้ถ้อยคำเอง ฉันจึงใช้ 24 ชั่วโมงซึ่งเข้มกว่า ส่วน 72 ชั่วโมงในภาคผนวกเป็นเส้นตายที่ธนาคารต้องแจ้ง สคส. ถ้า MD ต้องการ 72 ชั่วโมงจริง ต้องประสาน DPO
- **เพดานความรับผิดเท่ากับมูลค่าสัญญา:** เป็นข้อสมมติของฉันเอง ไม่มีในกฎของบริษัท ต้องให้ MD หรือฝ่ายกฎหมายยืนยัน

**ยังค้าง ต้องได้ก่อนยื่นธนาคาร 13 พ.ย.**
- SA (ไอศวรรย์) ยืนยัน man-day 286 เป็นลายลักษณ์อักษร และยืนยันว่าระบบ monitoring/log (LIC-APM) เก็บข้อมูลในไทยจริง ใน proposal เขียนไว้แล้วว่าอยู่ในไทย
- `ml-jay` ยืนยันว่า ML 20 md พอ และย้ายงานจูนโมเดลรอบ 2 ไปอยู่ใน MA ได้
- สถานะทีม SA และ Tech Lead ช่วง ม.ค.–มิ.ย. 2027 ฉันเปิดไม่ได้จากที่ที่อ่านได้
- เลขที่เอกสาร NVT-PRP-2026-xxx

หมายเหตุ: `price.py` พิมพ์ภาษาไทยบน Windows ไม่ได้ (error เรื่อง encoding) ต้องรันโดยตั้ง `PYTHONIOENCODING=utf-8` ควรแจ้งผู้ดูแล skill

## โต๊ะ `2-md-somchai` · 126 วินาที · 13 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | exec:deal-approval |
| 2 | Bash | cd "C:/t/org05p/novatech/deals/deal-001" && ls -la && for f in *; do echo "=== $f"; cat "$f"; done; echo; ls C:/t/org05p |
| 3 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-md-somchai\b2ca8d65-1ae6-4792-9630-68afe704e2b7\tool-results\ |
| 4 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-md-somchai\b2ca8d65-1ae6-4792-9630-68afe704e2b7\tool-results\ |
| 5 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-md-somchai\b2ca8d65-1ae6-4792-9630-68afe704e2b7\tool-results\ |
| 6 | Bash | cd C:/t/org05p/novatech; find desks/md-somchai company-kit -type f \| head -100; ls deals/deal-001/work -R |
| 7 | Bash | cd C:/t/org05p/novatech; cat desks/md-somchai/notes/deal-rules.md; echo ======; grep -n -i -E "72\|24 ชั่วโมง\|breach\|แ |
| 8 | Bash | cd C:/t/org05p/novatech; cat company-kit/customer-data-policy.md company-kit/deal-001/tor-bank-queue.md company-kit/meet |
| 9 | Bash | cd C:/t/org05p/novatech/deals/deal-001; grep -n -E "0[0-9]{1,2}-?[0-9]{3}-?[0-9]{4}\|[0-9]{13}\|ต้นทุน\|margin\|buffer\| |
| 10 | Bash | cd C:/t/org05p/novatech/deals/deal-001; cp approval.md approval-r1.md; ls |
| 11 | Write | C:\t\org05p\novatech\deals\deal-001\approval.md |

**คำตอบของโต๊ะนี้**

ผลรอบ 2 คือ **❌ ตีกลับอีกรอบ** แต่ตีกลับด้วยข้อเดียว คือข้อ 2 แผนงาน ข้ออื่นผ่านหมดแล้ว ผมเขียนผลไว้ใน `deals/deal-001/approval.md` และย้ายผลรอบ 1 ไปเก็บที่ `approval-r1.md`

**กำไร 27.1%** ผมรันสคริปต์ซ้ำได้ราคา 4,800,000 ต้นทุน 3,497,500 ตรงกับที่ Sales สรุปมา มี buffer 10% ครบและไม่ได้ตัด QA ส่วนลด 619,000 (13.7%) ผมอนุมัติให้เฉพาะราคาฉบับ B เท่านั้น ถ้าจะใช้ ML 35 วันหรือเปลี่ยนเป็น MA 24 ชั่วโมงในงบเดิม margin จะต่ำกว่า 25% ต้องส่งกลับมาพิจารณาใหม่

เหตุผลหลัก:
1. **ภาคผนวก PDPA ผ่านแล้ว** มีครบ 3 ข้อ แต่ข้อแจ้งเหตุเขียนว่าจะแจ้งธนาคารภายใน 24 ชั่วโมง ซึ่งเข้มกว่ากฎเรา (72 ชั่วโมง) ผมตรวจไม่ได้ว่าถ้อยคำนี้มาจาก DPO จริงหรือไม่ จึงตั้งเงื่อนไขให้ DPO (`plat-may`) ยืนยันก่อนยื่น ถ้าไม่ยืนยันให้กลับไปใช้ 72 ชั่วโมง
2. **แผนงานไม่ผ่าน** มีงานใหญ่ 2 เฟสซ้อนกันในเดือนเดียว 2 เดือน:
   - เดือน 4 ทำ integration กับ core banking พร้อมกับ pen test ของธนาคาร ทั้งที่ pen test ต้องทำบนระบบที่เชื่อมเสร็จแล้ว
   - เดือน 5 ทำ UAT 3 สัปดาห์พร้อมกับนำร่อง 10 สาขา ถ้า UAT ช้าไปสัปดาห์เดียว นำร่องจะหลุดเดือน 5 ซึ่งผิด TOR

   ผมเสนอให้ไอศวรรย์ (SA) จัดลำดับงานใหม่ โดยไม่ต้องเปลี่ยนราคา
3. **ยังไม่มีใครรับรองตัวเลขและภาคผนวก**
   - ไอศวรรย์ยังไม่ยืนยันว่า 286 man-day พอสำหรับงาน
   - ยังไม่มีใครยืนยันว่าระบบ monitoring/log เก็บข้อมูลในไทย ถ้าไม่ใช่ ภาคผนวกข้อ 2 จะไม่เป็นความจริง
   - `ml-jay` ยังไม่ยืนยันว่า ML 20 man-day พอ

ข้อ 6 (ทีมว่าง) ยังไม่มีข้อมูล และเสี่ยงชนกับ deal-002 ที่ไอศวรรย์ดูอยู่และจะเริ่มช่วงเดียวกัน ข้อนี้ถ้าไม่ผ่านจะได้แค่อนุมัติแบบมีเงื่อนไข ไม่ถึงขั้นตีกลับ

ยังทันยื่นวันที่ 13 พ.ย. ถ้าได้แผนใหม่และคำยืนยันทั้งหมดภายในวันที่ 10 พ.ย. รอบหน้าผมจะดูแค่ข้อ 2, ข้อ 5 และข้อ 6

ไฟล์ตรวจตัวเลขอยู่ที่ `deals/deal-001/work/deal-001/deal-input-r2.json` ผมไม่ได้แก้ไฟล์ของ Sales หรือบัญชีเลย และไม่ได้เปิดโต๊ะของคนอื่นหรือ skill ของแผนกอื่น

## โต๊ะ `3-sa-ton` · 275 วินาที · 15 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List files on desk, deal, company-kit |
| 2 | Bash | Read MD approval results |
| 3 | Bash | Read desk settings and company-kit README |
| 4 | Bash | Search references to SA desks |
| 5 | Bash | Read internal notes |
| 6 | Bash | Proposal headings and price list |
| 7 | Bash | Read proposal sections 1–6 |
| 8 | Bash | Read arch standards and TOR |
| 9 | Bash | Read pricing files for plan B |
| 10 | Bash | Read won proposals for comparison |
| 11 | Bash | Search for APM vendor and region hints |
| 12 | Bash | Find timeline/log references in proposal tail |
| 13 | Bash | Check weekdays of 2027 plan dates |
| 14 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-sa-response-r2.md |

**คำตอบของโต๊ะนี้**

ทำส่วนของ SA ที่ MD ตีกลับในรอบ 2 เสร็จแล้ว อยู่ในไฟล์ `deals/deal-001/deal-001-sa-response-r2.md` ไฟล์เดียว ผมไม่ได้แก้ proposal หรือไฟล์ของ Sales และบัญชี เพราะ MD ให้ SA ส่งแผนให้ Sales เป็นคนแก้ proposal หัวข้อ 6

**เรื่องที่ต้องรู้ก่อน:** MD ส่งงานข้อนี้ถึง "SA (ไอศวรรย์)" และ proposal ก็ใส่ชื่อไอศวรรย์เป็น SA ผู้จัดทำ แต่โต๊ะนี้เป็นของต้นตระกูล (`sa-ton`) ผมจึงลงชื่อต้นตระกูลเท่านั้น ไม่ได้ลงนามแทนไอศวรรย์ และเว้นช่องให้ไอศวรรย์ลงชื่อร่วม ถ้า MD ต้องการคำยืนยันจากเธอโดยตรง

**สิ่งที่ MD ขอจาก SA และผล**

1. **ปรับแผนหัวข้อ 6 ไม่ให้มี 2 เฟสใหญ่ในเดือนเดียว:** ทำแล้ว ตามทางที่ MD แนะนำ ราคาเท่าเดิมและ man-day รวมยังเป็น 318
   - เชื่อม core banking และตู้ Q-Matic ย้ายไปทำทั้งเดือน 3 และหยุดรับฟีเจอร์ใหม่สิ้นเดือน
   - เดือน 4 เหลือ load test และ pen test (1–12 เม.ย.) แล้วทดสอบซ้ำหลังสงกรานต์ (22–23 เม.ย.)
   - UAT 3 สัปดาห์ 26 เม.ย.–14 พ.ค. แล้วนำร่อง 10 สาขา 18–31 พ.ค.
   - ถ้า UAT เลื่อน 1 สัปดาห์ นำร่องยังเริ่มได้ในเดือน 5 ตาม TOR
   - ในเอกสารมีตารางพร้อมวางแทนหัวข้อ 6 ตาราง man-day รายเดือนที่รวมได้ 318 และจุดที่ Sales ต้องแก้ให้ตรงกัน (หัวข้อ 2 ข้อ 4 และข้อ 6 ต้องใส่วันที่ขอ sandbox และช่วง pen test)
2. **ยืนยัน man-day 286:** ยืนยันแบบมีเงื่อนไข ผมแตกงาน Dev-Sr 55 + Dev 90 ตามขอบเขต TOR แล้วพอ แต่ตึง
   - งานแก้ผล pen test และ UAT ต้องใช้ buffer 32 md เกือบทั้งหมด
   - ใส่ข้อสมมติไว้ 8 ข้อ เช่น วันที่ได้ sandbox, API ของตู้ Q-Matic ใช้ได้, ขอบเขตการอบรม
   - ขอให้ Sales ใส่ 3 ข้อในนั้นลงใน proposal (A1–A3) เพื่อกันงานเพิ่มไหลเข้าราคา fixed-price
3. **ยืนยันว่า LIC-APM และ log เก็บข้อมูลในไทย:** ยืนยันไม่ได้ ใน price-list รายการ cloud ระบุ "Thailand region" แต่ LIC-APM ไม่ระบุทั้ง region และผู้ให้บริการ และไม่มีเอกสารอื่นยืนยันเลย
   - ดังนั้นหัวข้อ 4.1 และภาคผนวก ก ข้อ 2 ยังยื่นไม่ได้ ตามที่ MD สั่ง
   - ทางออกเรียงตามที่แนะนำ:
     - ขอหนังสือยืนยันจากผู้ให้บริการภายใน 9 พ.ย.
     - ถ้าไม่มี region ไทย ให้เปลี่ยนผู้ให้บริการในต้นทุนเดิม
     - ถ้าไม่มีทั้งสองทาง ตั้งระบบ log เองบน cloud ไทย ทางนี้ราคาเปลี่ยน ต้องกลับไปที่ MD
   - เพิ่มในสถาปัตยกรรมด้วย: ปิดบังข้อมูลส่วนบุคคลใน log และแยกเก็บ audit log บน cloud ไทย ไม่ฝากไว้กับ LIC-APM

**ยังค้างอยู่กับคนอื่น ผมจดไว้ในเอกสารแต่ไม่ได้ทำแทน**
- `ml-jay` ยืนยันว่า ML 22 md พอ
- DPO ยืนยันการแจ้งเหตุภายใน 24 ชั่วโมง
- ฝ่ายกฎหมายยืนยันเพดานความรับผิด
- Sales และ PM office ทำสถานะทีม รวมถึงต้องระบุว่า SA ของโครงการนี้คือใคร

วันหยุดที่ใช้วางแผนอิงจากวันหยุดประจำปีที่รู้กันอยู่แล้ว ต้องเช็กอีกครั้งเมื่อธนาคารประกาศปฏิทินวันหยุดปี 2027

## โต๊ะ `4-sales-nida` · 306 วินาที · 25 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List files in my desk, deal, and company kit |
| 2 | Bash | Read MD approval and related deal files |
| 3 | Read | C:\t\org05p\novatech\deals\deal-001\approval.md |
| 4 | Read | C:\t\org05p\novatech\deals\deal-001\approval-r1.md |
| 5 | Read | C:\t\org05p\novatech\deals\deal-001\deal-001-sa-response-r2.md |
| 6 | Read | C:\t\org05p\novatech\deals\deal-001\deal-001-resubmit-to-md.md |
| 7 | Read | C:\t\org05p\novatech\deals\deal-001\deal-001-internal-notes.md |
| 8 | Bash | Search breach notification rules and locate sales plugin skills |
| 9 | Bash | Check the sales-proposal skill for breach-notification wording |
| 10 | Read | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 11 | Bash | Read brand guide and doc-number rules |
| 12 | Bash | Find penalty, liability, training terms in TOR and deal summaries |
| 13 | Bash | Check desk settings and team info in company kit |
| 14 | Bash | Read deal summaries and deal-002 timeline for team load |
| 15 | Bash | Back up round-2 sales files to my desk archive |
| 16 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 17 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-proposal-nakhonluang.md |
| 18 | Bash | Find numbered confirm items and cross-references |
| 19 | Bash | Renumber confirm items and add SA's A1–A3 wording |
| 20 | Bash | Scan proposal for PII and internal terms |
| 21 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-sales-requests-r3.md |
| 22 | Bash | Update internal notes for round 3 |
| 23 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-resubmit-to-md.md |
| 24 | Bash | Spot-check edited plan and training lines in proposal |

**คำตอบของโต๊ะนี้**

แก้งานส่วนของคุณตามที่ MD ขอในรอบ 2 ครบแล้ว และวางไว้ในโฟลเดอร์ดีลแล้วค่ะ แต่**ดีลนี้ยังยื่นลูกค้าไม่ได้** เพราะคำขอที่ร่างไว้ยังไม่ได้ส่งจริงและยังไม่มีใครตอบ ฉันไม่ได้เขียนว่าใครยืนยันแล้วแทนเจ้าตัว

**ไฟล์ที่แก้หรือสร้างใน `deals/deal-001/`**
- **`deal-001-proposal-nakhonluang.md`**
  - หัวข้อ 6: วางแผนใหม่ของ SA ทั้งตาราง เดือน 3 เป็นงานเชื่อมระบบ เดือน 4 เป็น pen test 1–12 เม.ย. และทดสอบซ้ำ 22–23 เม.ย. UAT 26 เม.ย.–14 พ.ค. นำร่อง 18–31 พ.ค. เพิ่มย่อหน้า "ถ้างานเลื่อน" ด้วย
  - หัวข้อ 2 (สิ่งที่ขอยืนยัน): ใส่ข้อความที่ SA ขอ (A1–A3) คือวันส่งเอกสาร API 29 ม.ค. กับวันเปิดสภาพแวดล้อมทดสอบ 26 ก.พ. ในข้อ 4, ข้อใหม่เรื่องตู้ Q-Matic สำหรับทดสอบ (ข้อเดิมเลื่อนเลขเป็น 6–9), ช่วง pen test ในข้อ 7 และ audit log เก็บบนระบบนี้ในข้อ 8
  - หัวข้อ 7: เพิ่มขอบเขตการอบรมในส่วน "สิ่งที่ไม่รวม"
  - ราคา งวดชำระ และ man-day ไม่เปลี่ยน ตรวจแล้วไม่มีเบอร์มือถือ เลข 13 หลัก หรือคำว่าต้นทุน/margin/buffer
- **`deal-001-sales-requests-r3.md`** (ไฟล์ใหม่): ข้อความพร้อมส่งถึง
  - DPO (`plat-may`) เรื่องแจ้งเหตุ 24 ชม. พร้อมข้อความสำรองแบบ 72 ชม.
  - ฝ่ายกฎหมาย เรื่องค่าปรับและเพดานความรับผิด
  - คนออกเลขที่เอกสาร `NVT-PRP-2026-xxx`
  - PM office เรื่องสถานะทีม SA/Tech Lead ช่วง ม.ค.–มิ.ย. 2027
  - มีตารางติดตามงานของ DevOps และ `ml-jay` ที่บล็อกการยื่นด้วย
- **`deal-001-internal-notes.md`**: เพิ่มส่วนสรุปรอบ 3 ปรับบันทึกการตัดสินใจ D12–D15 เพิ่ม D16 และอัปเดตเช็กลิสต์ก่อนยื่น
- **`deal-001-resubmit-to-md.md`**: เขียนใหม่เป็นฉบับรอบ 3 ฉบับรอบ 2 เก็บไว้ที่ `desks/sales-nida/archive/deal-001-r2/`

**เรื่องที่ควรรู้ก่อนส่ง MD**
1. **SA ยืนยันไม่ได้ว่าระบบ monitoring/log (LIC-APM) เก็บข้อมูลในไทย** ข้อความหัวข้อ 4.1 และภาคผนวก ก ข้อ 2 ยังอยู่ในร่าง แต่ห้ามยื่นจนกว่า DevOps หรือจัดซื้อจะหาหลักฐานได้ภายใน 9 พ.ย.
2. **เรื่องแจ้งเหตุ 24 ชม. หาที่มาไม่เจอ** template ของ skill อ้างว่าเป็นถ้อยคำ DPO แต่ `customer-data-policy.md` ไม่มีระยะเวลาแจ้งลูกค้า ถ้า DPO ไม่ตอบภายใน 9 พ.ย. 12:00 จะเปลี่ยนเป็น 72 ชม. ตามที่ MD สั่ง
3. **ทีมน่าจะเกินเกณฑ์ไม่เกิน 2 โปรเจกต์** ข้อมูลใน company-kit ชี้ว่า ถ้าชนะทุกดีล:
   - ไอศวรรย์จะถือ 3 โปรเจกต์ช่วง ก.พ.–พ.ค. 2027 (DS-2026-031, deal-001, deal-002)
   - ปอนด์ (Tech Lead) ถือ 3 โปรเจกต์ช่วง ม.ค.–ก.พ. 2027 ตามที่เขียนใน DS-2026-034

   ยังต้องให้ PM office ยืนยัน
4. **คนลงนามยืนยันแผนกับ man-day คือ `sa-ton` ไม่ใช่ไอศวรรย์ที่อยู่ในช่อง "จัดทำโดย"** ฉันยังไม่เปลี่ยนชื่อ SA ใน proposal เพราะขึ้นกับผลสถานะทีม เรื่องนี้ใส่เป็นคำถามให้ MD ตัดสินไว้ใน resubmit แล้ว

**สิ่งที่คุณต้องทำต่อ:** ส่งข้อความในไฟล์ requests ผ่านช่องทางจริง (#ask-pdpa อีเมล หรือแชต) แล้วบันทึกคำตอบในช่อง "คำตอบ" ของแต่ละข้อ ฉันส่งเองไม่ได้จากเครื่องนี้

ฉันเปิดเฉพาะโต๊ะของคุณ, `company-kit/`, `deals/deal-001/` และ skill ของแผนกขายเท่านั้น

## โต๊ะ `5-md-somchai` · 159 วินาที · 17 รอบ

skill ที่หยิบเอง: `exec:deal-approval`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, deal folder, company kit |
| 2 | Skill | exec:deal-approval |
| 3 | Bash | Read skill references, script header, my notes |
| 4 | Bash | Read prior approvals and resubmission docs |
| 5 | Read | C:/t/org05p/novatech/deals/deal-001/approval.md |
| 6 | Read | C:/t/org05p/novatech/deals/deal-001/deal-001-resubmit-to-md.md |
| 7 | Read | C:/t/org05p/novatech/deals/deal-001/deal-001-sa-response-r2.md |
| 8 | Bash | Proposal outline and pricing inputs |
| 9 | Bash | Re-run deal number check |
| 10 | Read | C:/t/org05p/novatech/deals/deal-001/deal-001-proposal-nakhonluang.md |
| 11 | Read | C:/t/org05p/novatech/deals/deal-001/deal-001-sales-requests-r3.md |
| 12 | Read | C:/t/org05p/novatech/deals/deal-001/deal-001-internal-notes.md |
| 13 | Bash | Check PII/internal terms, APM price, team mentions |
| 14 | Bash | Archive round-2 approval file |
| 15 | Write | C:/t/org05p/novatech/deals/deal-001/approval.md |

**คำตอบของโต๊ะนี้**

ผมพิจารณา deal-001 รอบ 3 เสร็จแล้ว ผลคือ **🟡 อนุมัติแบบมีเงื่อนไข** เขียนผลไว้ที่ `deals/deal-001/approval.md` ส่วนผลรอบ 2 ผมเปลี่ยนชื่อเป็น `approval-r2.md` เก็บไว้

**Margin 27.1%** ผมรันสคริปต์ตรวจตัวเลขซ้ำแล้ว ตรงกับสรุปดีล ตัวเลขนี้รวม buffer 10% แล้วและไม่ได้ตัด QA ราคา ส่วนลด และงวดเงินไม่เปลี่ยนจากรอบก่อน

**เหตุผลหลัก**
1. **ข้อ 2 แผนงาน ที่ตีกลับรอบก่อน ตอนนี้ผ่านแล้ว** การเชื่อมระบบย้ายไปเดือน 3 เดือน 4 เหลือแต่ load test กับ pen test ส่วน UAT 3 สัปดาห์ (26 เม.ย.–14 พ.ค.) อยู่ก่อนนำร่อง 18–31 พ.ค. SA ยืนยัน man-day 286 เป็นลายลักษณ์อักษร โดยมีข้อสมมติ 8 ข้อ ที่ต้องระวังคือ buffer เหลือแค่ 32 md
2. **ภาคผนวก PDPA มีครบ 3 ข้อ แต่ยังอ้างอิงไม่ได้ 2 จุด** จุดแรก ไม่มีหลักฐานว่า log ของ LIC-APM เก็บในไทย และ SA ไม่ยอมลงนามข้อนี้ จุดที่สอง การแจ้งเหตุภายใน 24 ชม. ยังไม่มีคำยืนยันจาก DPO ผมจึงตั้งทั้งสองจุดเป็นเงื่อนไขที่ต้องปิดก่อนยื่นลูกค้า ไม่ได้ถือว่าผ่านแล้ว
3. **ข้อ 6 ทีมว่าง ไม่ผ่าน** ไอศวรรย์และปอนด์อาจถือคนละ 3 โปรเจกต์ แต่แก้ได้ด้วยการเปลี่ยนคนโดยไม่ต้องเลื่อนวันเริ่ม ผลจึงเป็น 🟡 ไม่ใช่ตีกลับ

**ตอบเรื่องที่ Sales ขอให้ตัดสิน**
- **SA ของดีลนี้เป็นต้นตระกูล (`sa-ton`)** ส่วน **Tech Lead ต้องไม่ใช่ปอนด์** PM office ต้องยืนยันว่าทั้งสองคนถือไม่เกิน 2 โปรเจกต์ เรื่องนี้ต้องเสร็จก่อนลงนามสัญญา
- **ถ้า DPO ไม่ตอบภายใน 9 พ.ย. 12:00 ใช้ข้อความ 72 ชม. ได้เลย** ไม่ต้องส่งกลับมาให้ผมดูอีก

**ต้องปิดก่อนยื่น (ภายใน 10 พ.ย.)**
- C1: หลักฐานว่า log เก็บในไทย
- C2: คำตอบจาก DPO หรือเปลี่ยนเป็น 72 ชม.
- C3: ฝ่ายกฎหมายยืนยันถ้อยคำค่าปรับและเพดานความรับผิด
- C4: ได้เลขที่เอกสาร และแก้ชื่อ SA ในหน้า "จัดทำโดย"
- C5: `ml-jay` ยืนยันว่า ML 22 md พอ และเพิ่มหนึ่งประโยคเรื่องงานเพิ่มในหัวข้อ 7 (ไม่แตะตัวเลข)

**การอนุมัตินี้สิ้นผล และต้องกลับมาที่ผม ถ้าเกิดกรณีใดกรณีหนึ่งต่อไปนี้**
- ต้องตั้งระบบ log เอง หรือต้นทุน log เกิน 5,500 บาท/เดือน
- ML 22 md ไม่พอ
- กฎหมายแก้จนค่าปรับรวมเกิน 10% หรือกลายเป็นความรับผิดไม่จำกัด
- ราคาในเล่มเปลี่ยน
- ต้องเลื่อนนำร่องออกจากเดือน 5

ผมเปิดอ่านแค่โต๊ะของผม `company-kit` โฟลเดอร์ดีล และ skill ของแผนกผู้บริหาร (exec) กับไฟล์ตรวจตัวเลขของมันเท่านั้น

## โต๊ะ `6-dev-mew` · 235 วินาที · 17 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, company kit, and deal files |
| 2 | Bash | Read deal approval and notes files |
| 3 | Bash | Read remaining deal files |
| 4 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-dev-mew\70e38344-8416-4065-9295-c3921194b775\tool-results\bwm |
| 5 | Bash | Read desk settings and the proposal |
| 6 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-dev-mew\70e38344-8416-4065-9295-c3921194b775\tool-results\bpq |
| 7 | Bash | Read company kit standards and scaffold notes |
| 8 | Bash | Read TOR, runbook, incident, meeting notes |
| 9 | Bash | Read archived scaffold skill on my desk |
| 10 | Bash | Locate dev plugin scaffold skill path only |
| 11 | Bash | Read installed dev scaffold skill and diff with archive |
| 12 | Bash | Read dev scaffold SKILL.md and references |
| 13 | Bash | Check what scaffold check script enforces |
| 14 | Bash | Grep data policy for dev-relevant rules |
| 15 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-dev-scaffold-plan.md |
| 16 | Edit | C:\t\org05p\novatech\deals\deal-001\deal-001-dev-scaffold-plan.md |

**คำตอบของโต๊ะนี้**

ผมเขียนแผนไว้ที่ `C:\t\org05p\novatech\deals\deal-001\deal-001-dev-scaffold-plan.md` แล้ว ยังไม่ได้เขียนโค้ด และไม่ได้สร้าง repo

**สิ่งที่ควรรู้ก่อนอ่านแผน**

1. **ดีลนี้ยังไม่ได้อนุมัติเต็ม** MD ให้ 🟡 อนุมัติแบบมีเงื่อนไข ข้อ C1–C5 ต้องปิดก่อนยื่นลูกค้า ส่วน C6 (ตัว SA และ Tech Lead) ต้องปิดก่อนเซ็นสัญญา คาดว่าจะเซ็นวันที่ 4 ม.ค. 2027 ผมจึงแบ่งแผนเป็นสองช่วง
   - **ก่อนเซ็น:** ทำแค่ร่าง ADR, รายการคำถามถึงธนาคาร และร่าง API ระหว่างระบบหลักกับ forecast-service ไม่ใช้ข้อมูลลูกค้า ถ้าแพ้ดีลก็ไม่มีอะไรค้าง
   - **หลังเซ็น:** ขึ้นโครงจริงในเดือนมกราคม ภายใน man-day ที่ขายไว้ คือ Dev-Sr 6 + Dev 4 วัน

2. **skill `project-scaffold` ของแผนกใช้ตรง ๆ ไม่ได้** skill นี้สร้างระบบสมาชิกกับชำระเงิน และสคริปต์ตรวจบังคับให้มีโมดูล payment กับค่าตั้งของ ThaiPay แต่ดีลนี้ไม่มีการชำระเงินเลย การยืนยันตัวตนก็ต่างกัน: ลูกค้าใช้เลขบัตร + วันเกิด + OTP แล้วผูก LINE ส่วนพนักงานเข้าด้วย SSO ของ Entra ID
   - แผนจึงหยิบมาเฉพาะส่วนฐานของ template คือ lib, logger, audit, notification, health check และชุดทดสอบ
   - แล้วเพิ่มโมดูลของงานนี้: identity, staff-auth, branch, booking, kiosk, forecast, report
   - แยกออกเป็น 2 repo คือ `nlp-core-connector` (ต่อ core banking ผ่าน mTLS) และ `nlp-forecast-service`

3. **ข้อจำกัดเรื่อง deploy** runbook ห้าม deploy ระบบของลูกค้าธนาคารช่วงวันที่ 25 ถึงสิ้นเดือน ทำให้ช่วงนำร่อง 25–31 พ.ค. deploy ไม่ได้
   - ระบบนำร่องต้องขึ้น production ภายใน 18 พ.ค.
   - การขยายสาขาในเดือนมิถุนายนต้องเปิดด้วย flag ต่อสาขา ไม่ใช่ deploy ใหม่

**ในแผนยังมี**
- สิ่งที่ต้องมีในโครงตั้งแต่วันแรก เช่น ปิดบังเลขบัตร/CIF/ชื่อ/เบอร์ใน log, alert ใบรับรอง mTLS ก่อนหมดอายุ 21 วัน (บทเรียนจาก incident ก.ย.), audit log ที่แก้ไขไม่ได้แยกเก็บในไทย, ปลายทาง log ที่เปลี่ยนได้ด้วยค่าตั้งเพราะยังรอผล C1
- คำถาม 7 ข้อที่ต้องได้คำตอบจากธนาคารในเดือนแรก ผูกกับข้อสมมติ S1–S8 ของ SA
- ความเสี่ยงฝั่ง Dev และเรื่องที่ผมไม่ได้ตัดสินเอง ส่วนนี้รวมถึงตัว Tech Lead ซึ่งต้องไม่ใช่ปอนด์ และสิทธิ์ใช้โค้ดจากงานเกษตรไทย/NovaQueue (แผนนี้ไม่นำโค้ดนั้นมาใช้)

ผมเปิดอ่านเฉพาะโต๊ะของผม, `company-kit/`, `deals/deal-001/` และ skill `project-scaffold` ของแผนก Dev ใน plugins ไม่ได้เปิดโต๊ะคนอื่น skill แผนกอื่น หรือ `_solution/`

แผนนี้ต้องให้ Tech Lead ที่ PM office เสนอชื่อ และ `sa-ton` รับรองก่อนลงมือทำจริง

## โต๊ะ `6-hr-fah` · 126 วินาที · 13 รอบ

skill ที่หยิบเอง: `hr:jd-writer`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Skill | hr:jd-writer |
| 2 | Bash | cd "C:/Users/oishi/.claude/plugins/cache/novatech-skills/hr/1.0.0/skills/jd-writer" && ls -R && cat references/*.md; ech |
| 3 | Bash | cd /c/t/org05p/novatech && cat company-kit/jd-template.md; echo =====; cat company-kit/hr-benefits-faq.md; echo ====; gr |
| 4 | Bash | cd /c/t/org05p/novatech/deals/deal-001 && grep -n -i -E "อัตรากำลัง\|รับคน\|NVT-JOB\|hire\|headcount\|จ้าง\|เริ่มโปรเจกต |
| 5 | Bash | cd /c/t/org05p/novatech/deals/deal-001 && sed -n 1,140p deal-001-proposal-nakhonluang.md |
| 6 | Bash | cd /c/t/org05p/novatech/deals/deal-001 && grep -n -E "^##\|ทีม\|สัปดาห์\|เดือนที่\|Stack\|TypeScript\|Next\|Node\|Redis\ |
| 7 | Bash | cd /c/t/org05p/novatech/deals/deal-001 && sed -n 107,121p deal-001-proposal-nakhonluang.md; echo ====; head -30 approval |
| 8 | Bash | cd /c/t/org05p/novatech/company-kit && cat brand-guide.md \| head -120; echo ====; grep -n -i -E "JD\|ประกาศ\|TOR\|ชื่อล |
| 9 | Bash | mkdir -p /c/t/org05p/novatech/deals/deal-001/work && cat > /c/t/org05p/novatech/deals/deal-001/work/NVT-JOB-2026-021-sen |
| 10 | Bash | cat > /c/t/org05p/novatech/deals/deal-001/work/NVT-JOB-2026-021-check.md <<'EOF' # ใบตรวจประกาศ NVT-JOB-2026-021 — Senio |
| 11 | Bash | cd /c/t/org05p/novatech/deals/deal-001/work && sed -i 's/ต้องส่งภายใน 25 ธ.ค. 2026 (ระวังช่วงหยุดปีใหม่)/ต้องส่งภายใน 24 |

**คำตอบของโต๊ะนี้**

ประกาศรับสมัครเสร็จแล้วค่ะ วางไว้ในโฟลเดอร์ดีลตามที่ขอ และผ่านเช็กลิสต์ "เช็กก่อนส่ง" ครบ 7 ข้อ

- ตัวประกาศ: `C:\t\org05p\novatech\deals\deal-001\work\NVT-JOB-2026-021-senior-fullstack.md`
- ใบตรวจ: `C:\t\org05p\novatech\deals\deal-001\work\NVT-JOB-2026-021-check.md` มีตารางผลตรวจ, จุดที่แก้จากฉบับเดิม และเรื่องที่ต้องให้คนตัดสิน

ตำแหน่งนี้คือ Senior Full-stack Developer รหัส NVT-JOB-2026-021 ที่ MD อนุมัติไว้เมื่อ 30 ต.ค. เงินเดือน 75,000 – 105,000 บาท/เดือน ยาว 45 บรรทัด ไม่เกิน 1 หน้า A4 สวัสดิการทุกข้อตรงกับ `hr-benefits-faq.md` และไม่มีชื่อธนาคาร เลข TOR ผู้ติดต่อ หรือมูลค่าดีล

**แก้จากฉบับตัวอย่างเดิมให้ตรงกับ proposal ล่าสุด (5 พ.ย.)**
- **ทีม:** เปลี่ยนจาก 7 คนเป็น 9 คน ตามหัวข้อ 5 ของ proposal
- **การไปที่ธนาคาร:** ฉบับเดิมเขียนว่า "UAT ที่ธนาคารประมาณ 4 วัน" ซึ่งน่าจะต่ำกว่าจริง เพราะ UAT อย่างเดียวก็ 3 สัปดาห์ ยังมีช่วงนำร่องและ hypercare ต่ออีก ฉบับนี้จึงเขียนเป็น "เป็นบางช่วง" ไปก่อน
- **ยี่ห้อตู้คิวของธนาคาร:** ตัดออก ใช้คำว่า "ตู้กดบัตรคิวเดิมของสาขา" แทน

**เรื่องที่ต้องตัดสินก่อนลงประกาศ**
1. **ดีลยังไม่ชนะ:** MD อนุมัติแบบมีเงื่อนไข ยื่นลูกค้า 13 พ.ย. ต้องเลือกว่าจะลงประกาศเลยหรือรอผลดีล
2. **ตัวเลขจาก TOR:** "120 สาขา / 38 นาที" อาจทำให้คนเดาได้ว่าลูกค้าคือใครระหว่างประมูล ฉบับนี้ปัดเป็น "กว่า 100 แห่ง / เกือบ 40 นาที" ถ้าจะใช้ตัวเลขเต็ม ควรให้ Sales (`sales-nida`) ยืนยันก่อน
3. **บทบาทของคนใหม่:** เงื่อนไข C6 ของ MD ระบุว่าคุณปอนด์อาจต้องถือ 3 โปรเจกต์ช่วง ม.ค.–ก.พ. 2027 ต้องถามคุณปอนด์ว่าคนใหม่มาเป็น Dev ใต้คุณปอนด์ (ตามที่เขียนไว้) หรือมาแทนบทบาท Tech Lead ในดีลนี้ ถ้ามาแทน ต้องแก้หัวข้อทีมและอาจต้องปรับช่วงเงินเดือน
4. **on-call และจำนวนวันที่ธนาคาร:** ใส่ on-call ไว้ตามเงื่อนไขใน FAQ ให้คุณปอนด์ยืนยันว่าตำแหน่งนี้อยู่ในผลัดจริง และประมาณจำนวนวันที่ต้องอยู่หน้างาน
5. **วันเริ่มงาน 4 ม.ค. 2027 ค่อนข้างตึง:** เหลือราว 8 สัปดาห์ สัมภาษณ์ใช้ 3 สัปดาห์ และผู้สมัครส่วนใหญ่ต้องแจ้งออกจากที่เดิม 30 วัน ถ้าจะทันต้องลงประกาศภายในสัปดาห์นี้

**ขั้นถัดไป:** เมื่อได้คนแล้ว ส่งต่อ `onboarding-pack` (hr-oat) ภายใน 24 ธ.ค. 2026 เพื่อให้ครบ 5 วันทำการก่อนวันเริ่มงาน (หักวันหยุด 31 ธ.ค. และ 1 ม.ค. แล้ว)

ไฟล์ที่เปิดอ่านมีแค่ skill jd-writer ของ HR, `company-kit/` และ `deals/deal-001/` ไม่ได้เปิดโต๊ะของคนอื่น, skill ของแผนกอื่น หรือ `_solution/` และไม่ได้เปิดไฟล์ `.gitea-token` บนโต๊ะของคุณ

## โต๊ะ `6-ml-jay` · 212 วินาที · 17 รอบ

skill ที่หยิบเอง: `mlops:mlflow-experiment`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, deal folder, and company kit |
| 2 | Skill | mlops:mlflow-experiment |
| 3 | Bash | Read skill references and ML experiment data |
| 4 | Bash | Read TOR, bank meeting notes, grep deal for ML items |
| 5 | Bash | Read TOR ML-related lines and meeting notes |
| 6 | Bash | Grep deal-001 docs for ML/forecast mentions |
| 7 | Bash | Read ML sections of deal internal notes, approval, proposal |
| 8 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-ml-jay\e333c141-9dc5-47bb-b5d9-0a1480fc7ca1\tool-results\b87l |
| 9 | Bash | Read ML man-day breakdown, proposal plan, onboarding and policy rows |
| 10 | Bash | Check data policy ML rows and run comparison script |
| 11 | Bash | Show data policy structure and plugin list |
| 12 | Bash | Read data policy and core skill ML rows |
| 13 | Bash | Read ML rows of data policy rules |
| 14 | Bash | Write experiment registry CSV and check column counts |
| 15 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-ml-experiment-plan.md |

**คำตอบของโต๊ะนี้**

วางแผนการทดลองไว้ในโฟลเดอร์ดีลแล้ว มี 2 ไฟล์:

- `deals/deal-001/deal-001-ml-experiment-plan.md` คือตัวแผน
- `deals/deal-001/work/ml/experiment-registry.csv` คือทะเบียน run มี 15 แถว เป็น run เดิม r01–r03 ที่ใส่สถานะและเหตุผลแล้ว กับ run ที่จะรันรอบหน้าอีก 12 แถว

**สถานะตอนนี้**
- **r03 ได้ MAPE 15.2% แต่ยังนับว่าชนะไม่ได้** r03 เปลี่ยนข้อมูล (v3/40 สาขา → v4/38 สาขา), feature และจำนวน tree พร้อมกัน จึงยังแยกไม่ได้ว่าดีขึ้นเพราะอะไร
- **ยังรันซ้ำไม่ได้สักตัว** ไม่มี run ไหน fix seed ไม่มี run ไหนลง MLflow และ notebook ของ r03 อยู่บนเครื่องต้า
- **ตัวเลขทั้งหมดมาจากข้อมูลของเกษตรไทย** ยังไม่ใช่ข้อมูลของนครหลวงฯ ใช้อ้างใน proposal ไม่ได้ ซึ่งตรงกับ internal-notes ข้อ 3

**แผนแบ่งเป็น 2 ช่วง**
- **P0 (9 พ.ย.–18 ธ.ค. 2026) ทดลองกับข้อมูลเกษตรไทย** ทุก run เปลี่ยนทีละอย่าง และเขียนเกณฑ์ตัดสินไว้ก่อนรัน
  - `r03b` รัน r03 ซ้ำ 3 seed เพื่อดูว่าได้ผลเดิมไหม
  - `r02b` รัน r02 บนข้อมูล v4 เพื่อแยกว่าที่ดีขึ้นมาจากข้อมูลหรือ feature
  - `r01b` รัน baseline บนข้อมูลชุดเดียวกัน
  - backtest แบบพยากรณ์ล่วงหน้า 7 วันตามการใช้งานจริง
  - `r04` และ `r05` สองทางแก้ปัญหาพยากรณ์ต่ำช่วงเที่ยง
  - แปลง notebook เป็น pipeline ที่รันซ้ำได้
- **P1 (ม.ค.–มิ.ย. 2027) ใช้ข้อมูลธนาคาร** แบ่ง 22 man-day ตามตารางรายเดือนของ SA (2/6/6/4/3/1) และผูกกับสิ่งที่ proposal หัวข้อ 6 สัญญาจะส่งมอบแต่ละเดือน

**ความเสี่ยงที่ยังไม่มีใครพูดถึงในดีล**
1. **ยังไม่ได้ตกลงกับธนาคารว่าคิด MAPE แบบไหน** ธนาคารมีสาขาเล็กหลายแห่ง ชั่วโมงที่มีลูกค้า 0–2 คนจะดัน MAPE ขึ้นมาก จึงควรตกลงวิธีคิดในเดือน 1
2. **ช่วงทดสอบของธนาคารยากกว่าที่เราทดสอบไว้** "3 เดือนล่าสุด" ของข้อมูลธนาคารน่าจะเป็น ต.ค.–ธ.ค. ซึ่งมีปีใหม่และวันหยุดยาวมากกว่าช่วงที่เราทดสอบไว้ (ก.ค.–ก.ย.)

**สิ่งที่คุณต้องตัดสินเอง**
- **ส่งคำยืนยัน C5/R6 (22 man-day พอไหม) ภายใน 10 พ.ย.** ผมเขียนร่างไว้ในแผนแล้ว ร่างตอบว่า "พอ ถ้ามีเงื่อนไข" และเงื่อนไขหลักคือ P0 ต้องเสร็จก่อนลงนาม
- **P0 ใช้ประมาณ 6–8 man-day ที่ไม่ได้อยู่ในงบดีล** ต้องขอหัวหน้าทีม ML อนุมัติเป็นงานภายใน
- **ควรรอผล `r03b` และ `r02b` ก่อนลงชื่อยืนยัน** สองตัวนี้กำหนดรัน 9 พ.ย. ต้องขอ notebook กับข้อมูล v4 จากต้าก่อน ถ้า r03 รันซ้ำไม่ได้ผลเดิม ควรบอก MD ตรง ๆ

ผมยังไม่ได้เขียนอะไรลงไฟล์อื่นในดีล รวมถึงช่องคำตอบใน `deal-001-sales-requests-r3.md` ด้วย

ไฟล์ที่อ่านมีแค่ในโต๊ะของคุณ, `company-kit/` และ `deals/deal-001/` และใช้ skill ของ mlops กับ core เท่านั้น

## โต๊ะ `6-ops-art` · 204 วินาที · 17 รอบ

skill ที่หยิบเอง: `devops:deploy-checklist`

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, company kit, and deal files |
| 2 | Bash | Read desk settings and archived skill header |
| 3 | Skill | devops:deploy-checklist |
| 4 | Bash | Read deploy-checklist skill references |
| 5 | Bash | Read company runbook and architecture standards |
| 6 | Bash | Read TOR, data policy, and coding rules hits |
| 7 | Bash | Search deal files for log, backup, and region terms |
| 8 | Bash | Focused search for hosting, region, and log tooling |
| 9 | Bash | Read SA log-residency section, latest approval, notes |
| 10 | Read | C:\Users\oishi\.claude\projects\C--t-org05p-novatech-desks-ops-art\e2213ffd-62f3-48fd-991b-73fe2b51a9ab\tool-results\b3m |
| 11 | Bash | Check price list, archived skill refs, proposal plan |
| 12 | Bash | Find pilot and go-live dates in proposal |
| 13 | Bash | Check candidate pilot deploy dates against rules |
| 14 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-log-backup-residency.md |
| 15 | Write | C:\t\org05p\novatech\deals\deal-001\work\2027-05-18-nlp-queue-pilot\deploy-checklist.md |

**คำตอบของโต๊ะนี้**

ตอบสั้น ๆ ก่อน: **ยังยืนยันไม่ได้ว่า log อยู่ในไทย ส่วน backup น่าจะอยู่ในไทย แต่ยังไม่มีหลักฐานเป็นลายลักษณ์อักษร** ตอนนี้จึงยังยื่นหัวข้อ 4.1 และภาคผนวก ก ข้อ 2 ไม่ได้ เพราะในเล่มเขียนว่า "backup และ log ทั้งหมดอยู่ในไทย"

## log กับ backup เก็บในไทยได้ไหม
| ข้อมูล | ผล | เหตุผล |
|---|---|---|
| ฐานข้อมูล, ไฟล์, audit log 2 ปี | 🟢 อยู่ในไทย | อยู่ในแพ็กเกจ cloud CL-M ที่ price-list ระบุ "Thailand region" |
| Backup / snapshot ของฐานข้อมูล | 🟡 ได้ แต่มีเงื่อนไข | อยู่ในบัญชี cloud เดียวกัน แต่ยังต้องขอเอกสารจากผู้ให้บริการ cloud และตั้งค่าห้ามคัดลอกสำรองไปต่างประเทศ ถ้ามีไซต์สำรองกู้ระบบก็ต้องอยู่ในไทยด้วย |
| log, monitoring, trace (บริการ LIC-APM) | 🔴 ยืนยันไม่ได้ | price-list ไม่ระบุทั้ง region และชื่อผู้ให้บริการ และในโต๊ะผมก็ไม่มีเอกสารของบริการนี้ |

เงื่อนไขนี้คือ C1 ใน `approval.md` เป็นงานของ DevOps กับฝ่ายจัดซื้อ **กำหนดส่ง 9 พ.ย.** มีทางเลือกดังนี้:
1. ขอหนังสือยืนยัน region ไทยจากผู้ให้บริการ log รายเดิม
2. ถ้าไม่มี region ไทย เปลี่ยนไปใช้ผู้ให้บริการที่มี region ไทย ต้นทุนไม่เกิน 5,500 บาท/เดือน
3. ถ้าไม่ได้ทั้งสองทาง ต้องตั้งระบบ log เอง ราคาจะเปลี่ยนและต้องกลับไปให้ MD อนุมัติใหม่

## Checklist ขึ้นระบบ: 🔴 NO-GO
ดีลนี้ยังไม่ได้ยื่นข้อเสนอ ยังไม่มีโค้ด ไม่มีผล UAT และไม่มี release notes จึงตัดสิน GO ไม่ได้ ผมทำเป็นร่างไว้สำหรับวันขึ้นระบบนำร่อง 10 สาขาในเดือน พ.ค. 2027

ระหว่างทำเจอปัญหา 2 เรื่องในแผนงานหัวข้อ 6 ของ proposal ซึ่งควรแก้ก่อนยื่น 13 พ.ย.:
- **นำร่อง 18 พ.ค. ไม่มีวันที่ deploy ได้ตามกติกา** UAT จบวันศุกร์ 14 พ.ค. คืนก่อนเปิดนำร่องคือวันจันทร์ 17 ซึ่งห้าม deploy ส่วนวันพฤหัส 13 ก็ยังไม่มีลายเซ็นรับ UAT ผมเสนอให้ deploy วันอังคาร 18 พ.ค. 21:00 แล้วเปิดนำร่องวันพุธ 19 พ.ค. ซึ่งยังอยู่ในเดือนที่ 5 และต้องส่งประกาศถึงธนาคารภายในวันพุธ 12 พ.ค.
- **แผนสำรอง "UAT เลื่อนแล้วนำร่อง 24 พ.ค." ใช้ไม่ได้** วันที่ 24 เป็นวันจันทร์ และ 25–31 พ.ค. เป็นช่วงห้าม deploy ของลูกค้าธนาคาร วันถัดไปที่ทำได้คือ 1 มิ.ย. ซึ่งหลุดเดือนที่ 5 ตาม TOR ถ้า UAT เลื่อน ต้องเซ็นรับให้ได้ภายใน 19 พ.ค. เพื่อ deploy วันพฤหัส 20 พ.ค.

สคริปต์ตรวจวันไม่รู้วันหยุดราชการ ผมใส่ไว้แค่ 4 พ.ค. ต้องเช็กปฏิทินวันหยุดปี 2570 ที่ประกาศจริงอีกครั้ง โดยเฉพาะวันวิสาขบูชา

ใน checklist มีหัวข้อใหม่ 1.9 ให้ตรวจ region จริงของทุกที่เก็บข้อมูลก่อนขึ้นระบบ และเพิ่มการนับเหตุ "ผูกบัญชี LINE กับลูกค้าผิดคน" เป็นเกณฑ์ข้อมูลผิดที่ต้อง rollback พร้อมแจ้งผู้ดูแล PDPA (`plat-may`) ในประกาศถึงธนาคารยังเว้นเบอร์ on-call กลางไว้ เพราะไม่มีข้อมูล ช่องที่เป็น `____` คือข้อมูลที่ยังไม่มี

## สิ่งที่คุณต้องทำ
- ระบุว่าบริการ log ที่ใช้อยู่คือเจ้าไหน แล้วขอหนังสือยืนยัน region จากผู้ให้บริการ log และผู้ให้บริการ cloud ภายใน 9 พ.ย.
- ส่งหลักฐานให้ `sa-ton` รับรอง แล้วบันทึกคำตอบในช่อง R5 ของ `deal-001-sales-requests-r3.md` ผมยังไม่ได้แก้ไฟล์นี้เพราะเป็นไฟล์ของ Sales
- แจ้ง Sales กับ `sa-ton` เรื่องแก้วันนำร่องในหัวข้อ 6

ผมอ่านเฉพาะโต๊ะของคุณ, `company-kit/`, `deals/deal-001/` และ skill deploy-checklist ของแผนก DevOps เอง ไม่ได้เปิดโต๊ะคนอื่น ไม่ได้เปิด skill ของแผนกอื่น และไม่ได้เปิด `_solution/`

ไฟล์อยู่ในโฟลเดอร์ดีล:
- `C:\t\org05p\novatech\deals\deal-001\deal-001-log-backup-residency.md`
- `C:\t\org05p\novatech\deals\deal-001\work\2027-05-18-nlp-queue-pilot\deploy-checklist.md`

## โต๊ะ `6-qa-mint` · 112 วินาที · 11 รอบ

skill ที่หยิบเอง: — ไม่ได้เรียก skill

| # | เครื่องมือ | อะไร |
|---|---|---|
| 1 | Bash | List my desk, deal folder and company kit |
| 2 | Bash | Read settings, search deal for test plan, read QA skill |
| 3 | Bash | Read QA skill and search deal for test plan refs |
| 4 | Bash | Find test plan mentions in deal files |
| 5 | Bash | Read latest approval and proposal plan section |
| 6 | Bash | Find testing requirements in TOR and deal notes |
| 7 | Bash | Read TOR requirements and SA man-day breakdown |
| 8 | Bash | Check UAT acceptance, load criteria and test data rules |
| 9 | Bash | Check weekdays of key test dates |
| 10 | Write | C:\t\org05p\novatech\deals\deal-001\deal-001-qa-test-readiness.md |

**คำตอบของโต๊ะนี้**

**คำตอบ: ยังรันไม่ได้** ผมเขียนผลไว้ที่ `deals/deal-001/deal-001-qa-test-readiness.md` แล้ว

**ทำไมยังรันไม่ได้**
- โฟลเดอร์ดีลไม่มีไฟล์ `TEST-PLAN.md` เลย ไม่มี URL ไม่มี test case และไม่มีข้อมูลทดสอบ
- ระบบยังไม่มีอยู่จริง ดีลนี้อยู่ขั้นยื่นข้อเสนอ (ยื่น 13 พ.ย.) ลงนามสัญญาคาดว่า 4 ม.ค. 2027 ระบบบน uat จะขึ้นครั้งแรกราว ก.พ. 2027
- ตอนนี้มีแค่แผนการทดสอบใน proposal (หัวข้อ 6) ผมเลยตรวจส่วนนั้นแทน

**ผลตรวจแผนใน proposal: ใช้ยื่นได้ แต่ควรแก้ 3 จุดก่อนลงนามสัญญา**
1. **ไม่มีนิยามว่า "ผ่าน UAT" คืออะไร** แต่งวด 2 (40% = 1,435,200 บาท) จ่ายเมื่อผ่าน UAT ถ้าไม่เขียนไว้ ธนาคารเลื่อนการจ่ายงวดนี้ได้เรื่อย ๆ
2. **load test ไม่มีเป้าตัวเลข** TOR ไม่ระบุจำนวนผู้ใช้พร้อมกันหรือเวลาตอบสนอง เลยทดสอบได้แต่ตัดสินผ่านหรือไม่ผ่านไม่ได้
3. **เวลาแก้ผล pen test ตึงมาก** หลังหักสงกรานต์เหลือแค่ 4 วันทำการ (16–21 เม.ย.) ก่อนทดสอบซ้ำ 22–23 เม.ย. ถ้าธนาคารใช้ช่วงสำรองที่ SA เสนอ การทดสอบซ้ำจะไปชนกับ UAT บน env `uat` เดียวกัน

**ข้อสังเกตอื่น**
- วันหยุดธนาคาร 2027 ยังไม่ประกาศ ถ้ามีวันหยุดชดเชยวันแรงงาน วันทำการ UAT จะเหลือ 13 วัน และถ้า UAT เลื่อน แผนยังไม่ได้บอกว่าวันอบรม 17 พ.ค. เลื่อนตามด้วย
- QA มี man-day ช่วง ม.ค.–ก.พ. น้อยเกินจะเขียน test plan ให้ครบ ควรขยับมาจาก มิ.ย. โดยไม่เปลี่ยนยอดรวม
- ข้อมูลทดสอบต้องเป็นข้อมูลสังเคราะห์ตาม `customer-data-policy` ข้อ 4 ควรขอธนาคารเตรียมชุดลูกค้าทดสอบบน sandbox ไว้ด้วย

ไม่มีข้อไหนกระทบราคา ในไฟล์ระบุแล้วว่าแต่ละเรื่องต้องส่งให้ใคร (Sales, SA, PM office, ฝ่ายกฎหมาย) ส่วน `TEST-PLAN.md` จริง ผมจะเขียนหลังลงนามสัญญา เมื่อได้ URL ของ uat, เป้า load test และข้อมูลทดสอบแล้ว

ผมอ่านแค่โต๊ะของคุณ, `company-kit/` และ `deals/deal-001/` ไม่ได้รัน test และไม่ได้แก้ไฟล์อื่นในดีล

