# TEST-REPORT · สกิล `dag-planner` (ต่อยอดจาก `./base_skills`)

ทดสอบ 10 พ.ย. 2026 ใน container `multi-account` · base skills ใน container ตรงกับ `./base_skills` ทุกไฟล์ (agent-team · yolo · cyolo) · บัญชีพร้อม: yolo1, yolo2, yolo3, cyolo1, cyolo2

**ผล: PASS 8 / 8** · ไม่ได้รันทีมจริงด้วยโทเคน (ข้อ 7 ใช้ตัวจำลองของ agent-team ตามสเปก)

| ข้อ | ทดสอบ | ผล | หลักฐาน |
|---|---|---|---|
| 1 | คัดลอกโฟลเดอร์ + `doctor` | PASS | yolo1–5 และ cyolo1–5 เห็น `skills/dag-planner/SKILL.md` · `doctor` ทั้งสำเนาฝั่ง Claude และ Codex ขึ้น "พร้อมใช้ ✅" และบอก `base skills: /root/ai-accounts/.Claude/shared/skills` |
| 2 | `dag` จับข้อผิดพลาด | PASS | วงวน (บอกเส้นทางวน) · `id ซ้ำ: B01` · `depends_on อ้าง id ที่ไม่มีจริง 'B99'` · `skill ไม่รู้จัก 'gpt'` |
| 3 | แผนตัวอย่าง 8 บล็อก ครบ 6 สกิล (`cafe8`) | PASS | สายวิกฤต B01 → B02 → B05 → B07 → B08 ยาว 7.2M tok · rank ทุกบล็อกตรงกับสคริปต์คำนวณอิสระ · `dag.png` มีป้ายสกิลครบ ([ภาพ](../img/real-test-cafe8-dag.png)) |
| 4 | `plan` จากโควตาจริง (`--max-agents 4`) | PASS | `yolo` → Claude · `cyolo`/`image` → Codex ทุกบล็อก · review: yolo3 ทำ, cyolo2 ตรวจ (คนละ CLI) · ไม่มีบัญชีใดเกิน slot (ตรวจจาก `plan.json`) · บล็อก debate/review/best_of มีแท่งหลายแถวใน `gantt-plan.png` |
| 5 | `plan --accounts yolo1:5,yolo2,cyolo1,cyolo2` | PASS | yolo1 ไม่ได้บล็อกเลย |
| 6 | `export` | PASS | `validate_graph()` ของ `team.py` ใน base skill รับ 8 node · `team.py run graph.json --dry-run --workers …` รับกราฟและแจกบัญชีได้ |
| 7 | `run` → `report` ด้วยตัวจำลอง `MA_SIMULATE_LIMIT=<ทุกบัญชี>` | PASS | ใช้ 0 โทเคน · `REPORT.md` แสดง failed/blocked ตรงกับ `state.json` · tokens ของบล็อก 0 = ledger 0 · ได้ `gantt-actual.png` และ `compare.png` · `calib.json` ไม่ถูกเขียน (ไม่มีบล็อกที่ `ok`) ตามที่ออกแบบ |
| 8 | เรียกจาก host | PASS | `docker exec … dagplan.py doctor` และ `docker exec -i … dag <แผน> --blocks - < blocks.json` · บน host (ไม่ผ่าน container) `dag` + `plan --accounts yolo1:80,yolo2:90,cyolo1:70,cyolo2:95` + `export` ทำงานด้วย `./base_skills` |

## ข้อบกพร่องที่พบและแก้ระหว่างทดสอบ

- `report` ล้มเมื่อมีบล็อกที่ `blocked` (มีเวลาจบแต่ไม่มีเวลาเริ่ม) → แก้ใน `dagplan.py` แล้ว ทดสอบข้อ 7 ซ้ำผ่าน

## สิ่งที่ยังไม่ได้ทดสอบ

- **การรันทีมจริงด้วยโทเคน** (`run` แล้วบล็อกจบสถานะ `ok` · การเขียน `calib.json`) ยังไม่ได้ทำกับ base skills ชุดนี้ ผลรันจริงในหัวข้อ "ภาคต่อ" ของ README มาจากการรันเมื่อ 8 พ.ย. 2026 กับ agent-team รุ่นก่อน

## ไฟล์ที่สร้าง

```text
skills/dag-planner/
├── SKILL.md
├── scripts/      dagplan.py · kcquest.py · render.py
└── references/   blocks.md · kcquest.md · run.md
```

## สิ่งที่ต่างจากสกิลรุ่นก่อน (ที่อ่านสกิลบท 04 จาก container)

| เรื่อง | รุ่นก่อน | รุ่นนี้ (ตาม `./base_skills`) |
|---|---|---|
| หา base skills | โฟลเดอร์ข้างเคียงใน shared เท่านั้น | `$DAGPLAN_BASE_SKILLS` → โฟลเดอร์ข้างเคียง → `./base_skills` |
| ความพร้อมและโควตา | อ่านไฟล์แคช `readiness.json` · `quota.json` | `team.py check --json` · `team.py quota --json` |
| วางแผนโดยไม่มีบัญชี | ไม่ได้ | ได้ เมื่อทุกบัญชีใน `--accounts` ระบุ % |
| ตรวจ `graph.json` | `references/graph.md` + `add_node()` | `validate_graph()` ของ `team.py` |
| node ภาพ / หลายบัญชี | `image` · `candidates` | `type: image` + `path` · `accounts` · `worker`/`reviewer` |
| สั่งรัน | `--run` · `--accounts` · `--detach` ของ team.py | `--run-id` · `--workers` · `--detach` แยก process เอง |
| สถานะบล็อกที่เสร็จ | `done` | `ok` |
