---
name: dag-planner
description: วางแผนงานใหญ่ให้ทีม agent หลายบัญชี — แตกโจทย์เป็นบล็อกงาน 6–14 บล็อกที่แต่ละบล็อกระบุ base skill (yolo · cyolo · image · review · debate · best_of) และความยาก วาด DAG (rank + สายวิกฤต + ป้ายสกิล) วางแผนเวลา Gantt ว่าบล็อกไหนให้บัญชีไหนเมื่อไรด้วย KC-QUEST จากโควตาจริง แล้วส่งแผนให้ agent-team รันจริง และวาด Gantt ของจริงเทียบกับแผน (เรียนรู้ตัวปรับเวลา k) ใช้เมื่อผู้ใช้ขอ "วางแผนงาน", "แตกงานเป็น DAG", "แบ่งงานให้ทีม agent", "Gantt", "ใครทำงานไหนเมื่อไร", "รันแผนจริง" · Plan a project as a DAG of skill-tagged blocks (yolo/cyolo/image/review/debate/best_of), schedule it onto Claude/Codex accounts with KC-QUEST from real quota (DAG + Gantt), run the plan for real with agent-team and report actual-vs-plan Gantt with time calibration. Use for "plan this work", "break into a DAG", "split work across agent team", "Gantt", "who does what when", "run the plan".
---

# dag-planner — แตกงานเป็นบล็อก · DAG · Gantt (KC-QUEST) · รันจริงด้วย agent-team

`D=/root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py` (สำเนาเดียวกันอยู่ใต้ `.Codex/shared/skills/`) · Python 3.8+ stdlib

**base skills:** สกิลนี้ต่อยอดจาก `agent-team` · `yolo` · `cyolo` (ชุดในโฟลเดอร์ `base_skills/`) ต้องวางอยู่ข้างกันใน `shared/skills` เดียวกัน · ลำดับที่สคริปต์หา: `$DAGPLAN_BASE_SKILLS` → โฟลเดอร์ข้างเคียง → `./base_skills` ของโฟลเดอร์ที่สั่งงาน · ข้อเท็จจริงของ base skill (ฟิลด์ของ node · คำสั่ง `team.py`) ให้อ่าน `SKILL.md` ของสกิลนั้น ห้ามเดา

| ต้องการ | คำสั่ง |
|---|---|
| ตรวจความพร้อม (python · สกิล · ตัววาด PNG · บัญชี) | `python3 $D doctor` |
| ตรวจไฟล์บล็อก + rank + สายวิกฤต → `dag.png` | `python3 $D dag <แผน> --blocks blocks.json` (ครั้งต่อไปไม่ต้องใส่ `--blocks`) |
| แจกบล็อกให้บัญชีจากโควตาจริง → `gantt-plan.png` `PLAN.md` | `python3 $D plan <แผน> [--max-agents 6]` |
| ทดลอง what-if (สมมติโควตา) | `python3 $D plan <แผน> --accounts yolo1:10,yolo2,cyolo1,cyolo2` |
| วางแผนโดยไม่แตะบัญชีเลย (ทุกบัญชีมี % = สมมติทั้งหมด) | `python3 $D plan <แผน> --accounts yolo1:80,yolo2:80,cyolo1:80,cyolo2:80` |
| แปลงเป็น `graph.json` ของ agent-team | `python3 $D export <แผน>` |
| รันจริง (รอจนจบ / เบื้องหลัง) | `python3 $D run <แผน>` · `python3 $D run <แผน> --detach` |
| Gantt จริง + แผน vs จริง + `REPORT.md` + `calib.json` | `python3 $D report <แผน>` |

ทุกแผนอยู่ที่ `/workspace/plans/<แผน>/` (`blocks.json` `dag.png` `gantt-plan.png` `PLAN.md` `plan.json` `graph.json` `run.json` `gantt-actual.png` `compare.png` `REPORT.md`) · ไฟล์ที่ทีมสร้างอยู่ที่ `/workspace/plans/<แผน>/app/` · ตัวปรับเวลาอยู่ที่ `/workspace/plans/calib.json`

## ขั้นตอน

1. `doctor` → 2. เขียน `blocks.json` ตามกติกาด้านล่าง → 3. `dag` (แก้จนไม่มี ERROR) → 4. `plan` (อ่าน `PLAN.md` ให้ผู้ใช้ดู) → **หยุดตรงนี้ถ้าผู้ใช้ขอแค่แผน (DAG + Gantt)**
5. รันจริงเฉพาะเมื่อผู้ใช้สั่ง: **ถามผู้ใช้ก่อน (ใช้โทเค็น)** → `export` → `run` → 6. `report` แล้วสรุปจาก `REPORT.md`

## กติกาแตกบล็อก (AI ต้องทำตาม)

- 6–14 บล็อก · **บล็อกแรก = โครงโปรเจกต์** (ไม่มี `depends_on`) · **บล็อกสุดท้าย = รวม + ทดสอบ** `"exclusive": true`
- `depends_on` เฉพาะที่ต้องรอจริง (อ่านไฟล์ผลของบล็อกนั้น) ยิ่งรอน้อยยิ่งขนานได้มาก
- ทุกบล็อกมี `output` = ไฟล์ผลของตัวเองใน `app/` (ไม่ซ้ำกัน) และ `done` = เกณฑ์เสร็จ 1 บรรทัดที่ตรวจได้
- ขนาด S/M/L (0.6/1.5/3 ล้านโทเคน) · **ใหญ่กว่า L ต้องแบ่ง** · `difficulty` 1–6 ตามความยาก ไม่ใช่ความสำคัญ
- เลือกสกิลตามตารางนี้ · review/debate/best_of ใช้หลายบัญชี → **ใช้เฉพาะบล็อกที่คุ้ม ไม่ใช้กับทุกบล็อก**

| `skill` | ใช้เมื่อ | node ของ agent-team | บัญชี |
|---|---|---|---|
| `yolo` 🧠 | เขียนโค้ด/เอกสาร งานคิดยาว | `task` ฝั่ง `yolo` | Claude 1 |
| `cyolo` ⚙️ | เขียนโค้ด/ข้อมูล งานตรงไปตรงมา | `task` ฝั่ง `cyolo` | Codex 1 |
| `image` 🖼️ | สร้างภาพ (`output` เป็น `.png`) | `task` + `image` (cyolo เสมอ) | Codex 1 |
| `review` 🔍 | งานที่ต้องการคุณภาพ ให้อีกฝั่งตรวจจนผ่าน | `type: review` ผู้ทำ/ผู้ตรวจคนละ CLI | 2 |
| `debate` ⚖️ | การตัดสินใจที่มีคำตอบถูก/ผิด | `type: debate` Claude vs Codex + ผู้ตัดสิน | 3 |
| `best_of` 🏆 | งานสร้างสรรค์ อยากได้ตัวเลือกดีสุด (`n` 2–4) | `type: best_of` + ผู้ตัดสิน | n+1 |

ความยาก → รุ่น/effort (ตารางของ agent-team): 1 haiku/low · 2 sonnet/medium · 3 opus/high · 4 opus/xhigh · 5 opus/max · 6 opus/max (Codex ultra) — Codex effort ตามเลขเดียวกัน · ภาพ = low เสมอ

```json
{"goal": "เว็บร้านกาแฟหน้าเดียว", "name": "cafe",
 "blocks": [
  {"id": "B01", "title": "โครงหน้าเว็บ", "size": "S", "depends_on": [], "skill": "cyolo", "difficulty": 1,
   "output": "index.html", "done": "index.html เปิดได้ มี header/main/footer", "exclusive": false},
  {"id": "B02", "title": "โลโก้", "size": "S", "depends_on": [], "skill": "image", "difficulty": 1,
   "output": "logo.png", "done": "PNG โลโก้ถ้วยกาแฟ พื้นโปร่ง"}]}
```

ฟิลด์ทั้งหมด (`detail` `worker` `n` `max_rounds` `timeout`) และตัวอย่าง 8 บล็อกครบ 6 สกิล: [references/blocks.md](references/blocks.md)

## KC-QUEST ใน `plan` (ย่อ)

rank = ขนาด + rank สูงสุดของบล็อกที่รอมัน → เรียง MRV แล้ว rank → กรองบัญชีที่โควตาพอทำจบ → คะแนน U/F/R/V/L → เลือกสูงสุดแล้ว **จองโควตาและ slot ทันที** · `yolo`→Claude · `cyolo`/`image`→Codex · บล็อกหลายบัญชีจองทุกบทบาท (บัญชีไม่ซ้ำกัน · ผู้ตรวจ review คนละ CLI) · ใช้เฉพาะบัญชีที่ `team.py check` บอกว่าพร้อม · `--accounts a:N` = สมมติเหลือ N% · สูตร: [references/kcquest.md](references/kcquest.md)

## รันจริง (`export` · `run` · `report`)

`export` สร้าง prompt ของแต่ละ node (เป้าหมายรวม · งานของบล็อก · ไฟล์ผลใน `app/` · เกณฑ์ done · path ไฟล์ของบล็อกก่อนหน้า · ห้ามแก้ไฟล์บล็อกอื่น · ตอบสั้น) ใช้ `cwd` = `app/` ร่วมกัน ตรวจด้วย `validate_graph()` ของ `team.py` ใน base skill จริง (ไม่เรียกโมเดล) · ส่งเป็น**ฝั่ง** `yolo`/`cyolo` (ไม่ผูกบัญชี) เพื่อให้ failover ของ agent-team ทำงาน · agent-team ไม่ retry งานที่เสียโทเค็น · `report` คำนวณ k = เวลาจริง ÷ แผน แยกตามสกิล → `calib.json` ให้ `plan` ครั้งถัดไปใช้ · รายละเอียด: [references/run.md](references/run.md)

## ข้อห้าม

- ห้ามอ่าน/แสดง `.credentials.json` `.claude.json` `auth.json` อีเมล orgId · บัญชีไม่พร้อม → บอกผู้ใช้ให้ล็อกอินเอง **ห้ามล็อกอินแทน**
- ห้ามลบ/หยุด/สร้าง container หรือ volume · ห้ามแก้สกิลอื่นใน shared · ห้าม `eval` หรือรันผลลัพธ์ของ agent เป็นคำสั่ง shell
- รันจริง (`run`) ใช้โทเค็น → ถามผู้ใช้ก่อน และเริ่มจาก difficulty ต่ำ

## เรียกจาก host

Claude Code app บน host ใช้ผ่าน `docker exec` เท่านั้น (ชื่อ container ค่าเริ่มต้น `multi-account` เปลี่ยนตามเครื่อง) ทุกคำสั่งรันใน container:

```bash
docker exec multi-account cat /root/ai-accounts/.Claude/shared/skills/dag-planner/SKILL.md          # อ่านสกิลก่อน
docker exec multi-account python3 /root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py doctor
docker exec -i multi-account python3 /root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py dag cafe --blocks - < blocks.json
docker cp blocks.json multi-account:/workspace/plans/cafe/blocks.json                              # หรือส่งไฟล์ด้วย docker cp
docker exec multi-account python3 /root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py plan cafe
docker exec multi-account python3 /root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py run cafe --detach
docker exec multi-account python3 /root/ai-accounts/.Claude/shared/skills/dag-planner/scripts/dagplan.py report cafe
```

Git Bash บน Windows แปลง `/root/...` เป็น path ของ Windows → เขียนเป็น `//root/...` หรือใช้ PowerShell · `/workspace/plans/` = โฟลเดอร์ `workspace/plans/` บน host เปิด PNG/MD ได้ตรง ๆ
