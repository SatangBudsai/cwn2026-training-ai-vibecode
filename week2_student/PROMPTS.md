# พรอมต์ทีละขั้น (Copy & Paste)

> วางใน **Claude Code app บนเครื่องตัวเอง** ที่เปิดโฟลเดอร์งานของกลุ่ม · ต้องทำบท 03–05 ของ week 2 ผ่านแล้ว (container `multi-account` รันอยู่ · มีสกิล `agent-team` และ `dag-planner` · `doctor` ขึ้น "พร้อมใช้")
> ทุกพรอมต์ทำงานใน container ผ่าน `docker exec` เท่านั้น ห้ามให้ Claude ล็อกอินแทนเรา

| ขั้น | ทำอะไร | ใช้โทเคนของทีม |
|---|---|---|
| [0](#ขั้น-0--เอาชุดโจทย์เข้า-container) | เอาชุดโจทย์เข้า container | – |
| [1](#ขั้น-1--วางแผน-dag--gantt) | วางแผน DAG + Gantt | น้อย (AI แตกบล็อก) |
| [2](#ขั้น-2--ตรวจแผนด้วยตัวเอง) | ตรวจแผนด้วยตัวเอง | – |
| [3](#ขั้น-3--รันแผนจริง) | รันแผนจริงด้วย agent-team | **มาก** |
| [4](#ขั้น-4--รัน-test-plan-จนผ่านครบ) | รัน TEST-PLAN จนผ่านครบ 51 ข้อ | ปานกลาง |
| [5](#ขั้น-5--พิสูจน์ว่า-test-จับบั๊กได้-bug_mode) | เปิด BUG_MODE พิสูจน์ว่า test จับบั๊กได้ | ปานกลาง |

---

## ขั้น 0 · เอาชุดโจทย์เข้า container

แตก zip ไว้ที่ `./egov-brief/` ในโฟลเดอร์งานของกลุ่มก่อน แล้ววาง

```text
คัดลอกโฟลเดอร์ ./egov-brief ทั้งโฟลเดอร์เข้า container multi-account ที่ /workspace/egov-brief ด้วย docker cp
ห้ามแก้ไฟล์ในโฟลเดอร์นั้น · ห้ามแก้ไฟล์ตั้งค่า · ห้ามล็อกอินแทนฉัน
ตรวจว่าใน container มีไฟล์ครบ 10 ไฟล์ (README PROMPTS USER-STORIES REQUIREMENTS CONTRACT TEST-DATA TEST-PLAN BUGS DECISIONS brief/BRIEF.md)
แล้วตรวจความพร้อมของ dag-planner ด้วย doctor
ตอบเป็นตาราง รายการ | ผล
```

---

## ขั้น 1 · วางแผน DAG + Gantt

```text
โจทย์: สร้างเว็บ e-Service กลางตามชุดโจทย์ใน /workspace/egov-brief (อ่าน README.md ก่อน) ต้องทำตาม REQUIREMENTS.md CONTRACT.md TEST-DATA.md DECISIONS.md ครบทุกข้อ รันด้วย Docker Compose คำสั่งเดียว รองรับ TEST_MODE=1 และ BUG_MODE ตาม BUGS.md และมีชุด Playwright ครบทุก TC ใน TEST-PLAN.md
ชื่อแผน: egov-eservice
จำนวน agent สูงสุด: 4

ใช้ทีมเอเจนต์ใน container multi-account วางแผนงานนี้ ทำงานใน container ผ่าน docker exec เท่านั้น ห้ามแก้ไฟล์ตั้งค่า ห้ามล็อกอินแทนฉัน
ก่อนเริ่ม ดูว่าใน container มีสกิลที่ช่วยงานนี้ได้หรือไม่ (/root/ai-accounts/.Claude/shared/skills) ถ้ามีให้อ่านและใช้
1. แตกโจทย์เป็นบล็อกงาน 10–14 บล็อก แต่ละบล็อกบอกสกิลที่ใช้ทำ ความยาก ไฟล์ผล เกณฑ์เสร็จ และไฟล์ใน /workspace/egov-brief ที่ต้องอ่าน
   - บล็อกแรก = โครงโปรเจกต์ + docker compose + ฐานข้อมูล + test hook (reset · clock) ตาม CONTRACT
   - บล็อกเขียน Playwright จาก TEST-PLAN.md อ่านได้แค่ TEST-PLAN CONTRACT TEST-DATA ห้ามอ่านโค้ดเว็บ จึงไม่ต้องรอบล็อกเว็บ
   - งานที่มีกฎตัวเลขเยอะ (ค่าธรรมเนียม · SLA วันทำการ · Dashboard) ใช้ review ให้อีกฝั่งตรวจ
   - บล็อกสุดท้าย = รวม + รันชุด Playwright เต็ม + รัน BUG_MODE ทีละตัว แบบ exclusive
2. วาด DAG แล้ววางแผนว่าบล็อกไหนให้บัญชีไหน เมื่อไร (Gantt) จากโควตาจริง
วางแผนเท่านั้น ห้ามสั่ง export run หรือ report
เสร็จแล้วคัดลอก blocks.json dag.png gantt-plan.png และ PLAN.md มาไว้ที่ ./week2/egov-eservice/ บนเครื่อง
ตอบภาษาไทยสั้น ๆ: ตาราง บล็อก | ชื่อ | สกิล | ความยาก | ต้องรอ | rank · สายวิกฤตพร้อมเหตุผล 1 บรรทัด · ตาราง บล็อก | บัญชี | เริ่ม–จบ (นาที)
```

ถ้าบัญชีไม่พร้อมหรือโควตาหมด เพิ่มบรรทัดนี้ (วางแผนได้โดยไม่แตะบัญชี)

```text
ใช้โควตาสมมติ: --accounts yolo1:80,yolo2:60,cyolo1:90,cyolo2:70
```

---

## ขั้น 2 · ตรวจแผนด้วยตัวเอง

ไม่ต้องใช้พรอมต์ เปิด `./week2/egov-eservice/` แล้วตรวจ

| ตรวจ | ดูที่ |
|---|---|
| ทุก FR ใน REQUIREMENTS มีบล็อกที่ทำ ไม่มีข้อไหนตกหล่น | `blocks.json` |
| บล็อก Playwright ไม่มีลูกศรจากบล็อกเว็บ (ทำขนานได้) | `dag.png` |
| บล็อกสุดท้ายเป็นรวม + ทดสอบ มีรูป 🔒 | `dag.png` |
| ไม่มีสองบล็อกที่เขียนไฟล์เดียวกัน | `blocks.json` (ช่อง `output`) |
| ทุกบล็อกมีบัญชีรับ | `PLAN.md` |

แก้ `blocks.json` เองได้ถ้าเห็นว่าไม่สมเหตุผล แล้วสั่ง `dag` กับ `plan` ซ้ำ

---

## ขั้น 3 · รันแผนจริง

⚠️ ขั้นนี้ใช้โทเคนของทุกบัญชีในทีม

```text
รันแผน egov-eservice จริงด้วยสกิล dag-planner ใน container multi-account ผ่าน docker exec เท่านั้น ห้ามแก้ไฟล์ตั้งค่า ห้ามล็อกอินแทนฉัน
1. export แล้ว run --detach
2. ระหว่างรอ รายงานความคืบหน้าทุกครั้งที่มีบล็อกจบ (บล็อก | สถานะ | เวลา)
3. จบแล้วสั่ง report และคัดลอก app/ gantt-actual.png compare.png REPORT.md มาไว้ที่ ./week2/egov-eservice/
ตอบ: ตาราง บล็อก | สถานะ | เวลาแผน | เวลาจริง · บล็อกที่ล้มพร้อมสาเหตุ · คำสั่งเปิดเว็บที่ได้
```

---

## ขั้น 4 · รัน TEST-PLAN จนผ่านครบ

```text
อ่าน ./egov-brief/TEST-PLAN.md และ ./egov-brief/CONTRACT.md
ในโฟลเดอร์ ./week2/egov-eservice/app เปิดเว็บด้วย TEST_MODE=1 (ไม่ตั้ง BUG_MODE) แล้วรัน Playwright ชุดเต็ม
1. ตรวจก่อนว่ามี test ครบทุก TC ใน TEST-PLAN (ชื่อ test ขึ้นต้นด้วยรหัส TC) ถ้าขาดให้เขียนเพิ่มจากการ์ด TC
2. ข้อที่ล้มให้จำแนกเป็น เว็บผิด / test ผิด / แผนผิด พร้อมอ้างกฎใน REQUIREMENTS หรือ DECISIONS
   - เว็บผิด → แก้เว็บ · test ผิด → แก้ test ให้ตรงการ์ด · แผนผิด → ห้ามแก้เอง จดเป็นคำถามถึง TA
   - **ห้ามแก้ผลที่คาดหวังใน test ให้ตรงกับหน้าจอ**
3. วนจนผ่านครบ แล้วเก็บผลไว้ที่ ./week2/egov-eservice/test-report/ (results.json · index.html · GIF ของ TC ระดับ P1)
ตอบ: ตาราง TC | ผล | ประเภทที่ล้ม | แก้อะไร · จำนวนผ่าน/ทั้งหมด
```

---

## ขั้น 5 · พิสูจน์ว่า test จับบั๊กได้ (BUG_MODE)

```text
อ่าน ./egov-brief/BUGS.md
ในโฟลเดอร์ ./week2/egov-eservice/app รันชุด Playwright เต็ม 12 รอบ โดยเปิดเว็บด้วย TEST_MODE=1 และ BUG_MODE=B01 ถึง B12 ทีละตัว
ทุกรอบเทียบกับ BUGS.md ว่า TC ที่ต้องล้ม ล้มจริงไหม และ TC อื่นผ่านไหม (ข้อที่ BUGS.md บอกว่า "อาจล้มด้วย" ไม่นับเป็นผิด)
ถ้าบั๊กตัวไหน TC ไม่ล้ม ให้หาว่าเพราะเว็บไม่ได้ฝังบั๊กตาม BUGS.md หรือ test ตรวจไม่ละเอียด แล้วแก้
เขียนตาราง triage ตามรูปแบบใน BUGS.md ไว้ที่ ./week2/egov-eservice/BUG-HUNT.md
ตอบ: ตาราง บั๊ก | TC ที่ต้องล้ม | ล้มจริง ✅/❌ | หมายเหตุ · สรุปจับได้กี่ตัวจาก 12
```

---

## ส่งอะไร

ตามที่ผู้สอนกำหนด อย่างน้อยควรมีใน repo ของกลุ่ม

```text
week2/egov-eservice/
├── blocks.json · dag.png · gantt-plan.png · PLAN.md      ← ขั้น 1
├── gantt-actual.png · compare.png · REPORT.md            ← ขั้น 3
├── app/                                                  ← เว็บ + ชุด Playwright
├── test-report/                                          ← ขั้น 4 (ผลรัน + GIF)
└── BUG-HUNT.md                                           ← ขั้น 5
```
