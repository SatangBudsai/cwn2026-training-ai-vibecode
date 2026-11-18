# รันจริงและรายงาน (`export` · `run` · `report`)

ทุกอย่างในหน้านี้อ้างตาม base skill `agent-team` (`SKILL.md` หัวข้อ "กราฟงาน (JSON)" และ `references/details.md`) ถ้า base skill เปลี่ยน ให้อ่านไฟล์นั้นใหม่ก่อนแก้

## export → `graph.json`

| บล็อก | node ที่ได้ |
|---|---|
| `yolo` / `cyolo` | `{"account": "yolo"/"cyolo"}` (`type` = `task`) |
| `image` | `{"type": "image", "account": "cyolo", "path": "/workspace/plans/<แผน>/app/<output>.png"}` (agent-team ตรวจ PNG ให้) |
| `review` | `{"type": "review", "worker": <ฝั่งผู้ทำตามแผน>, "reviewer": <อีกฝั่ง>, "criteria": <done + ไฟล์มีจริง>, "max_rounds": 2}` |
| `debate` | `{"type": "debate", "accounts": ["yolo","cyolo"], "judge": <ฝั่งผู้ตัดสินตามแผน>}` |
| `best_of` | `{"type": "best_of", "accounts": [<ฝั่งของผู้ตอบตามแผน>], "judge": …, "criteria": <done>}` |

ทุก node: `id` = id บล็อก · `depends_on` · `difficulty` (+ `review_difficulty`/`judge_difficulty` เท่ากัน) · `cwd` = `/workspace/plans/<แผน>/app` · `timeout` · เรียง node ตามลำดับ topological

prompt ของ node บอก: เป้าหมายรวม · บล็อกนี้ทำอะไร (`title` + `detail`) · path ไฟล์ผลใน `app/` · เกณฑ์ `done` · path ไฟล์ของบล็อกก่อนหน้า (ไม่ยัดเนื้อหาลง prompt · ผลของ debate/best_of ใช้ `{{file:id}}`) · ห้ามแก้ไฟล์ของบล็อกอื่นยกเว้นบล็อก `exclusive` · ตอบสั้นว่าเขียนไฟล์อะไร · ไม่ใช้ `{{id}}` กับผลยาว

ตรวจก่อนเขียนไฟล์: ส่งกราฟให้ `graph_nodes()` + `validate_graph()` ของ `team.py` จริง (id · type · depends_on · prompt · วงวน) โดยไม่สร้าง run และไม่เรียกโมเดล · ตรวจเพิ่มว่า `path` ของภาพและ `cwd` เป็น absolute path · อยากดูว่า agent-team จะแจกบัญชีอย่างไรโดยไม่รันจริง: `team.py run graph.json --dry-run --workers ...`

## ทำไมส่งเป็น "ฝั่ง" ไม่ใช่บัญชีตามแผน

ใน agent-team `account` ที่เจาะจง (`yolo2`) = **ไม่ย้ายอัตโนมัติ** (บัญชีนั้นไม่พร้อม/ล้ม → งานล้ม) ส่วนฝั่ง (`yolo`/`cyolo`) ระบบเลือกบัญชีในฝั่งเองจากโควตาและโหลด และย้ายบัญชีเมื่อโควตา/ล็อกอินล้ม ดังนั้น `export` ใช้ฝั่งตามบัญชีที่ KC-QUEST เลือก และจำกัดรายชื่อบัญชีด้วย `--workers <บัญชีในแผน>` → failover ยังทำงาน · ผลคือบัญชีจริงอาจต่างจากแผน ซึ่ง `report` แสดงให้เห็น · อยากห้ามบัญชีไหน ให้ตัดออกจาก `--accounts` ตอน `plan`

## run

`team.py run /workspace/plans/<แผน>/graph.json --run-id <แผน>-<YYYYmmdd-HHMMSS> --workers <บัญชีในแผน>` · run_id เก็บใน `/workspace/plans/<แผน>/run.json` (`run_id` + `history`) · ผลของ run อยู่ที่ `/workspace/.agent-team/<run_id>/` · difficulty → รุ่น/effort (agent-team เลือกให้) · agent-team **ไม่ retry งานที่เสียโทเค็น** (ล้ม → บล็อกที่ขึ้นกับมันเป็น `blocked`)

`--detach`: `team.py` ไม่มีโหมดเบื้องหลัง สกิลนี้จึงแยก process เอง เขียน log ที่ `/workspace/plans/<แผน>/run.log` · ดูสถานะด้วย `team.py status --run <run_id>` · จบแล้วค่อย `report`

ทดสอบเส้นทางรันโดยไม่ใช้โทเค็น: ตั้ง env `MA_SIMULATE_LIMIT=yolo1,cyolo1,...` (ตัวจำลองของ agent-team) การเรียกบัญชีเหล่านั้นจะล้มทันทีเหมือนโควตาหมด

## report

อ่าน `<run>/state.json` (สถานะ `ok` | `failed` | `bad_output` | `blocked` · `started`/`ended` · `events`) + `<run>/ledger.jsonl` (แถวที่ไม่มี `event` = การเรียกโมเดล · node ของบล็อก = `B03` หรือ `B03#w1` `B03#r1` (review) · `B03#A` `B03#judge` (debate/best_of))

| ไฟล์ | เนื้อหา |
|---|---|
| `gantt-actual.svg/png` | แถว = บัญชีที่เรียกจริง · แท่ง = ts_start–ts_end ของการเรียกในบล็อกนั้น (แยกบทบาท ทำ/ตรวจ/ตอบ/ตัดสิน) · บล็อกหลายบัญชีเชื่อมด้วยเส้นประ |
| `compare.svg/png` | ทุกบล็อก: ซ้าย = ช่วงตามแผน · ขวา = ช่วงจริง (แกนแยกเพราะสเกลต่างกันก่อนปรับ k) |
| `REPORT.md` | ตาราง บล็อก · สกิล · บัญชีแผน/จริง · นาทีแผน/จริง · tokens · ครั้ง · สถานะ · ไฟล์ผล + ตรวจว่า tokens รวม = ledger · รายการบล็อกที่บัญชีต่างจากแผน · events (`worker_switch` ฯลฯ) |
| `/workspace/plans/calib.json` | `k[skill]` = นาทีจริง ÷ นาทีแผน (ก่อนคูณ k) เฉพาะบล็อกที่ `ok` · `history` (เขียนเมื่อ run จบแล้วเท่านั้น) |

tokens = นิยามเดียวกับ `row_tokens` ของ base skill: input (ไม่รวม cache read · Codex = input − cached_input) + cache_write + output · debate/best_of: `report` เขียนคำตอบที่ถูก/ชนะ (ค่า `value` ใน state) ลง `app/<output>` เป็นข้อความเท่านั้น (ไม่รันผลลัพธ์)
