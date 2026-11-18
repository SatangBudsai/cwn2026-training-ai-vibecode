---
name: cyolo
description: เรียก Codex CLI บัญชี cyolo1…cyoloN แบบไม่โต้ตอบ เลือกรุ่นและ effort จาก models_cache.json สร้างภาพ (PNG) ตรวจล็อกอิน โควตา (rate_limits) และสถิติโทเค็นต่อครั้ง ใช้เมื่อผู้ใช้พูดว่า "ให้ cyolo ตรวจ", "เรียก cyolo1", "สร้างภาพ", "Codex บัญชีไหนพร้อม", "โควตา Codex" · Use to run Codex accounts (cyoloN) non-interactively, generate images, check login, quota and per-call token stats.
---

# cyolo — Codex CLI ทุกบัญชี (cyolo1…cyoloN)

`C=/root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py` (สำเนาเดียวกันอยู่ที่ `.Claude/shared/skills/cyolo`)

| ต้องการ | คำสั่ง |
|---|---|
| เรียกงานเดียว (บัญชีที่โควตาเหลือมากสุด) | `python3 $C run "โจทย์" -d 2` |
| บัญชีเจาะจง / effort เอง | `python3 $C run "โจทย์" -a cyolo1 -e high` |
| เลือกรุ่น | `python3 $C run "โจทย์" -m <slug>` (ดู slug จาก `models`) |
| ให้ Codex ตรวจโค้ดในโฟลเดอร์ | `python3 $C run "ตรวจโค้ดใน /abs/path ..." --cwd /abs/path -d 3` |
| สร้างภาพ PNG | `python3 $C image "วงกลมสีแดงบนพื้นขาว" --out /workspace/img/red.png` |
| แนบภาพให้ดู | `python3 $C run "อธิบายภาพ" --image /abs/a.png` |
| ผลเป็น JSON | เติม `--json` |
| ตรวจความพร้อม (login status + เรียกจริง) | `python3 $C check` |
| โควตา (+ เวลาของข้อมูล) | `python3 $C quota` · `--refresh` = เรียกสั้น ๆ แบบไม่ ephemeral ก่อนเพื่ออัปเดต |
| รุ่นและ effort ที่รองรับ | `python3 $C models` |
| สถิติ | `python3 $C stats` · `--account cyolo1` |
| งานหลายบัญชี | ใช้สกิล `agent-team` |

## ความยาก → effort (`-d`) · รุ่นค่าเริ่มต้น = รุ่นแรก (priority ต่ำสุด, visibility `list`) ใน `models_cache.json`

| d | งาน | effort |
|---|---|---|
| 1 | ดึงข้อมูล จัดรูปแบบ ตรวจความพร้อม · สร้างภาพ | low |
| 2 | สรุป ถาม-ตอบ แก้โค้ดจุดเดียว (ค่าเริ่มต้น) | medium |
| 3 | แก้หลายไฟล์ debug วิเคราะห์ | high |
| 4 | reasoning ซับซ้อน | xhigh |
| 5 | ต้องถูกแน่นอน | max |
| 6 | งานใหญ่ที่แตกงานย่อยเอง | ultra (ถ้ารุ่นไม่รองรับ ลดเป็นระดับสูงสุดที่รองรับ และพิมพ์ว่าลดจากอะไร) |

## กฎสำคัญ (สคริปต์จัดการให้แล้ว)

- รูปแบบ: `cyoloN exec --skip-git-repo-check --ephemeral -m <model> -c model_reasoning_effort=<level> --json -o <ไฟล์คำตอบ> "<prompt>" < /dev/null`
- คำตอบอยู่ในไฟล์ `-o` · stdout เป็น JSONL: `turn.completed.usage` = tokens · `turn.failed.error.message` = ล้ม
- **exit 0 ไม่ได้แปลว่าสำเร็จ**: บัญชีที่ไม่ได้ล็อกอินตอบ 401 แล้ว retry หลายรอบแต่ exit 0
- สถานะล็อกอินอ่านจากข้อความ `cyoloN login status` (`Logged in using ChatGPT` / `Not logged in`) ไม่ใช่ exit code
- `--ephemeral` เร็วกว่า แต่ไม่เขียน `sessions/` โควตาจึงมาจาก rollout ล่าสุดที่ไม่ ephemeral → รายงานเวลาของข้อมูลเสมอ
- สร้างภาพทำได้ฝั่ง Codex เท่านั้น ใช้ effort `low` แล้วตรวจ PNG signature (สคริปต์ตรวจให้)
- ห้ามอ่าน/ส่งต่อ `auth.json` · ห้ามล็อกอินแทนผู้ใช้

รายละเอียด JSONL, โควตา, models_cache: `references/details.md`

## เรียกจาก host

ใช้ได้ทั้ง PowerShell และ Git Bash โดยไม่ต้องแก้:

```
docker exec multi-account cat //root/ai-accounts/.Codex/shared/skills/cyolo/SKILL.md
docker exec multi-account python3 //root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py check
docker exec multi-account python3 //root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py run "ตอบ OK" -a cyolo1 -d 1
docker exec multi-account python3 //root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py image "วงกลมสีแดง" --out //workspace/img/red.png
docker exec multi-account python3 //root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py quota
docker exec multi-account python3 //root/ai-accounts/.Codex/shared/skills/cyolo/scripts/cyolo.py models
```
