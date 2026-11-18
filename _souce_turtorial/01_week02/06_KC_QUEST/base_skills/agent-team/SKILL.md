---
name: agent-team
description: ให้หลายบัญชี (Claude yoloN + Codex cyoloN) ทำงานร่วมกันแบบ multi-agent - relay, fan-out/fan-in, DAG, review loop, debate, best-of-N, router, กระจายโหลดตามโควตา + failover, human gate, สลับหัวหน้าทีม และสถิติโทเค็นทั้งทีม ใช้เมื่อผู้ใช้พูดว่า "แบ่งงานหลายบัญชี", "ส่งต่องานระหว่าง agent", "ให้ Claude กับ Codex ช่วยกัน", "ตรวจไขว้", "สถิติโทเค็นแต่ละบัญชี" · Use for multi-account agent teams: task graphs, handoff, cross-CLI review, quota-aware dispatch, leader failover, team token stats.
---

# agent-team — หลายบัญชีทำงานร่วมกัน

`T=/root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py` (สำเนาเดียวกันที่ `.Codex/shared/skills/agent-team`) · ทุก run อยู่ที่ `/workspace/.agent-team/<run_id>/`

| ต้องการ | คำสั่ง |
|---|---|
| รันกราฟงาน → ตารางสรุป + โควตา | `python3 $T run graph.json` (path สัมพัทธ์ = ใต้ `/workspace`) · `run -` = อ่าน stdin |
| ใช้เฉพาะบางบัญชี (ไม่แตะบัญชีอื่นเลย) | `python3 $T run graph.json --workers yolo1,yolo2,cyolo1` |
| ผลเป็น JSON | เติม `--json` |
| ดูแผนโดยไม่เรียกโมเดล | `--dry-run` |
| รันต่อเฉพาะงานที่ล้ม/ถูกบล็อก | `python3 $T run --resume <run_id>` · แก้ก่อนรัน: `--set fix.prompt="..."` `--set fix.expect=number` หรือส่งกราฟที่แก้แล้ว `run fixed.json --resume <run_id>` |
| อนุมัติงานที่ `"approve": true` | `python3 $T approve <run_id> <node>` |
| ภาพรวมบัญชี/งานของ run | `python3 $T status` (`--run <id>`, `--refresh`) |
| สถิติ (ตามบัญชี/รุ่น/run) | `python3 $T stats` (run ล่าสุด) · `--all` · `--run <id>` · `--account yolo1` |
| ตรวจความพร้อม / โควตาทุกบัญชี | `python3 $T check` · `python3 $T quota` (ใส่ `--workers a,b` เพื่อจำกัด) |
| หัวหน้าทีมวางแผนเอง + สลับหัวหน้าได้ | `python3 $T lead --goal "เป้าหมาย"` |
| แชร์ความรู้ / ส่งข้อความ | `python3 $T board "ข้อค้นพบ" --author yolo1` · `python3 $T msg yolo1 cyolo1 "ข้อความ"` |

`check` `quota` `status` `stats` คืน 0 เสมอ (แม้บางบัญชีไม่พร้อม) · `run`/`lead` คืน 1 เมื่อมีงานล้ม

## กราฟงาน (JSON)

```json
{"goal": "ทำขนาน → ตรวจ → แก้และทดสอบ",
 "nodes": [
  {"id": "code", "account": "yolo", "difficulty": 2, "cwd": "/workspace/proj",
   "prompt": "เขียน /workspace/proj/calc.py มีฟังก์ชัน add(a,b) และ div(a,b) (หารศูนย์ให้ raise ValueError)"},
  {"id": "test", "account": "cyolo", "difficulty": 2, "cwd": "/workspace/proj",
   "prompt": "เขียน unittest ที่ /workspace/proj/test_calc.py ทดสอบ add และ div (รวมกรณีหารศูนย์ ValueError)"},
  {"id": "review", "kind": "review", "depends_on": ["code", "test"], "difficulty": 3,
   "prompt": "ตรวจ /workspace/proj/calc.py และ test_calc.py แล้วเขียนรายการปัญหาที่ต้องแก้ (ถ้าไม่มีให้บอกว่าไม่มี)"},
  {"id": "fix", "depends_on": ["review"], "difficulty": 2, "cwd": "/workspace/proj", "expect": "regex:OK",
   "prompt": "อ่านข้อตรวจใน {{file:review}} แก้โค้ดใน /workspace/proj ตามนั้น แล้วรัน python3 -m unittest test_calc ตอบบรรทัดสุดท้ายของผลเทสต์"}
 ]}
```

ฟิลด์ของ node (ที่ไม่ระบุใช้ค่าเริ่มต้น หรือใส่ร่วมกันใน `"defaults": {...}`):

| ฟิลด์ | ความหมาย |
|---|---|
| `id` | ชื่องาน (A-Z a-z 0-9 _ . -) · ผลที่ `out/<id>.md` |
| `prompt` | โจทย์ · `{{id}}` = ค่าสั้นของงานก่อน · `{{file:id}}` = path ไฟล์ผล (ข้อมูลยาวต้องใช้แบบนี้) · `{{run_dir}}` |
| `account` | `yolo2` (เจาะจง ไม่ย้ายอัตโนมัติ) · `yolo`/`cyolo` (ฝั่ง) · `any` (ค่าเริ่มต้น: router เลือก) |
| `difficulty` | 1 haiku/low · 2 sonnet/medium (ค่าเริ่มต้น) · 3 opus/high · 4 opus/xhigh · 5–6 opus/max (Codex: effort ชื่อเดียวกัน, 6=ultra) · override: `model` `effort` |
| `depends_on` | id ที่ต้องเสร็จก่อน (งานที่พร้อมรันพร้อมกัน) |
| `expect` | `number` `int` `json` `regex:<pat>` `contains:<text>` → สั่งรูปแบบและตรวจก่อนส่งต่อ |
| `kind` | `image` → cyolo เท่านั้น · `review`/`code` → Codex ก่อน · `doc`/`long` → Claude ก่อน |
| `type` | `task` (ค่าเริ่มต้น) · `image` (+`path` .png) · `review` · `debate` · `best_of` (ดูด้านล่าง) |
| `cwd` | โฟลเดอร์ทำงาน (absolute) · `approve: true` = รอคนอนุมัติ · `timeout` วินาที · `board: false` = ไม่ใช้กระดาน |

รูปแบบพิเศษ (node เดียว ใส่ `prompt` เสมอ):
- review loop: `{"type":"review","worker":"yolo1","reviewer":"cyolo1","max_rounds":3,"criteria":"..."}` วนจนผู้ตรวจตอบ `APPROVED`
- debate: `{"type":"debate","accounts":["yolo","cyolo"],"judge":"yolo2"}` ผู้ตัดสินสรุปคำตอบ + เหตุผล (`{{id}}` = คำตอบ)
- best-of-N: `{"type":"best_of","accounts":["yolo1","yolo2","cyolo1"],"judge":"any","criteria":"..."}`
- ภาพ: `{"type":"image","path":"/workspace/out/a.png"}` (ตรวจ PNG ให้)

board: ทุก agent ได้ path ของ `board.md` ให้อ่านก่อนเริ่ม บรรทัด `BOARD: ...` ในคำตอบถูกต่อท้ายลงกระดาน (ชื่อ+เวลา) ให้งานหลังใช้

อัตโนมัติ: ตรวจความพร้อมด้วยการเรียกจริง (cache 10 นาที) · ส่งงานไปบัญชีที่โควตาเหลือมาก · โควตา ≥80% หรือเกินงบ → หยุดรับงานใหม่ งานในคิวย้าย · ล้มเพราะโควตา/ล็อกอิน → ย้ายบัญชี · งานที่ขึ้นกับงานที่ล้มถูกบล็อก ไม่ retry · ตัวเลือก `--per-account 3` `--max-total 8` `--threshold 80` `--worker-token-budget N|yolo1=N` `--recheck`

## หัวหน้าทีม + สลับหัวหน้า (lead)

```
python3 $T lead --goal "แบ่งงานให้ลูกทีม ... แล้วรวมเป็นไฟล์เดียวที่ {run_dir}/final/result.md"
python3 $T lead --demo                       # สาธิตครบ: หัวหน้าล้ม(เชิงรับ) + เกินงบ(เชิงรุก) + ย้ายงานลูกทีม
python3 $T lead --demo --goal "เป้าหมายของคุณ ... รวมเป็นไฟล์ {run_dir}/final/result.md"
```

`lead` รัน foreground พิมพ์ความคืบหน้าทีละบรรทัด หัวหน้า (sonnet/medium) ทำงานเป็นรอบ อ่าน `handoff.md` สั่งงานลูกทีม (process แยก ผลไม่หาย) และเขียน checkpoint · ผู้ควบคุมเป็นสคริปต์ (ไม่ใช้โทเค็น) สลับหัวหน้าเมื่อเกินงบ/โควตา (เชิงรุก) หรือล้ม/timeout (เชิงรับ) · จบด้วยตาราง ประวัติสลับหัวหน้า · ย้ายงานลูกทีม · ผลแต่ละงาน · สถิติแยกบัญชี
ตัวเลือก: `--leader` `--succession yolo1,yolo2,cyolo1` `--workers` `--lead-token-budget N` `--worker-token-budget N` `--simulate-crash yolo1` `--simulate-limit cyolo2` `--resume <run_id>` · `{run_dir}` ใน goal = path จริง

รายละเอียดเพิ่ม (ไฟล์ใน run, state.json, ledger, คำสั่งของหัวหน้า): `references/details.md`

## เรียกจาก host

ใช้ได้ทั้ง PowerShell และ Git Bash ไม่ต้องแก้ (`//root/...` กัน Git Bash แปลง path) · อ่านสกิลก่อนเริ่ม:

```
docker exec multi-account cat //root/ai-accounts/.Claude/shared/skills/agent-team/SKILL.md
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py check
cat graph.json | docker exec -i multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py run -
cat graph.json | docker exec -i multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py run - --workers yolo1,yolo2,cyolo1 --json
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py lead --demo
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py status
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/agent-team/scripts/team.py stats
```

เขียน `graph.json` บน host ด้วยเครื่องมือ Write แล้ว pipe เข้า `run -` (ห้าม heredoc: ตัวตรวจสิทธิ์ของ Claude Code app บล็อก) · PowerShell 5.1 เปลี่ยนภาษาไทยใน pipe เป็น `?` → ใช้ PowerShell 7 หรือ `\uXXXX` ใน JSON
