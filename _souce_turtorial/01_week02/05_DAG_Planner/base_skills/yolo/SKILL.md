---
name: yolo
description: เรียก Claude Code บัญชี yolo1…yoloN แบบไม่โต้ตอบให้ถูกวิธี เลือกรุ่น/effort ตามความยาก ตรวจล็อกอินด้วยการเรียกจริง ดูโควตา (/usage) และสถิติโทเค็นต่อครั้ง ใช้เมื่อผู้ใช้พูดว่า "เรียก yolo2", "ให้ yolo1 ทำ", "บัญชี Claude ไหนพร้อม", "โควตา yolo", "สถิติโทเค็นแต่ละบัญชี" · Use to call Claude Code accounts (yoloN) non-interactively, pick model/effort, check real login state, read quota and per-call token stats.
---

# yolo — Claude Code ทุกบัญชี (yolo1…yoloN)

`Y=/root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py` (สำเนาเดียวกันอยู่ที่ `.Codex/shared/skills/yolo`)

| ต้องการ | คำสั่ง |
|---|---|
| เรียกงานเดียว (เลือกบัญชีที่โควตาเหลือมากสุด) | `python3 $Y run "โจทย์" -d 2` |
| เรียกบัญชีเจาะจง | `python3 $Y run "โจทย์" -a yolo2 -d 3` |
| กำหนดรุ่น/effort เอง | `python3 $Y run "โจทย์" -a yolo1 -m haiku -e low` |
| ผลแบบมีโครงสร้าง | `python3 $Y run "โจทย์" --schema '{"type":"object",...}' --json` → `structured_output` |
| ผลเป็น JSON ให้โปรแกรมอ่าน | เติม `--json` |
| prompt ยาว / มีอักขระพิเศษ | `python3 $Y run - -a yolo1 < prompt.txt` |
| ตรวจความพร้อมทุกบัญชี (เรียกจริง) | `python3 $Y check` |
| โควตา | `python3 $Y quota` |
| สถิติจาก ledger | `python3 $Y stats` · `--account yolo2` · `--run <run_id>` |
| รุ่น/effort/ตารางความยาก | `python3 $Y models` |
| งานหลายบัญชี / ส่งต่องาน | ใช้สกิล `agent-team` |

ทุกครั้งที่เรียกผ่าน `run`/`check` จะเพิ่ม 1 แถวใน `/workspace/.agent-team/ledger.jsonl` (ไม่เก็บข้อความ prompt) และพิมพ์ตาราง บัญชี | รุ่น/effort | เวลา | tokens | cost ไปที่ stderr

## ความยาก → รุ่นและ effort (`-d`)

| d | งาน | Claude |
|---|---|---|
| 1 | ดึงข้อมูล จัดรูปแบบ ตรวจความพร้อม | haiku / low |
| 2 | สรุป ถาม-ตอบ แก้โค้ดจุดเดียว (ค่าเริ่มต้น) | sonnet / medium |
| 3 | แก้หลายไฟล์ debug วิเคราะห์ | opus / high |
| 4 | reasoning ซับซ้อน อัลกอริทึม | opus / xhigh |
| 5–6 | ต้องถูกแน่นอน / งานใหญ่ | opus / max |

รุ่น: `opus` `sonnet` `haiku` `fable` · effort: `low` `medium` `high` `xhigh` `max`

## กฎสำคัญ (สคริปต์จัดการให้แล้ว ถ้าเรียก `yoloN` เองต้องทำตาม)

- รูปแบบ: `yoloN -p "<prompt>" --model <alias> --effort <level> --output-format json --no-session-persistence --strict-mcp-config < /dev/null`
- ต้องมี `-p` และปิด stdin เสมอ · prompt ต้องอยู่ก่อน flag ที่รับหลายค่า (`--allowedTools`, `--add-dir`, `--mcp-config`)
- **exit 0 ไม่ได้แปลว่าสำเร็จ** ดู `is_error` และ `result`
- `auth status` บอก loggedIn แต่เรียกจริงอาจล้ม (OAuth หมดอายุ) → `check` เรียกจริงด้วย haiku/low แล้วแยก พร้อม / ล็อกอินแล้วแต่หมดอายุ / ไม่ได้ล็อกอิน / โควตาหมด
- บัญชีเดียวรันพร้อมกันได้หลายตัวเมื่อใส่ `--no-session-persistence` (โควตาใช้ร่วมกันทั้งบัญชี)
- `total_cost_usd` = ราคาตามรายการ ไม่ใช่ยอดจ่ายจริง
- โควตา: `yoloN -p "/usage"` (ไม่เรียกโมเดล) ให้ `Current session` / `Current week`; บัญชีที่ไม่มี session เปิดอยู่จะไม่มีบรรทัด session → รายงานว่าไม่มีข้อมูล ห้ามเดา
- ห้ามอ่าน/ส่งต่อ `.credentials.json`, `.claude.json` ห้ามแสดงอีเมลหรือ orgId · ห้ามล็อกอินแทนผู้ใช้

รายละเอียดฟิลด์ JSON, ledger และข้อผิดพลาดที่พบบ่อย: `references/details.md`

## เรียกจาก host

ใช้ได้ทั้ง PowerShell และ Git Bash โดยไม่ต้องแก้ (`//root/...` กัน Git Bash แปลง path):

```
docker exec multi-account cat //root/ai-accounts/.Claude/shared/skills/yolo/SKILL.md
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py check
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py run "ตอบ OK" -a yolo1 -d 1
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py quota
docker exec multi-account python3 //root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py stats
cat prompt.txt | docker exec -i multi-account python3 //root/ai-accounts/.Claude/shared/skills/yolo/scripts/yolo.py run - -a yolo2
```
