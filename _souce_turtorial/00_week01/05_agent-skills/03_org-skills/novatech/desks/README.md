# 💻 โต๊ะทำงาน (local)

1 โฟลเดอร์ = เครื่องของพนักงาน 1 คน · เปิด Claude Code ที่โต๊ะไหน = ทำงานในนามคนนั้น

## ทำไมบน GitHub เห็นแค่ `_template/`

โต๊ะของพนักงาน **ไม่ได้เก็บใน git** แต่ถูกสร้างใหม่ทุกครั้งที่รัน `docker compose up` (LAB 0) โดย container `seed`

| ตอนไหน | ในโฟลเดอร์นี้มีอะไร |
|---|---|
| เพิ่ง clone repo | `README.md` + `_template/` (แม่แบบ settings ที่ใช้ใน LAB 3) |
| หลัง `docker compose up` | + **28 โฟลเดอร์** ชื่อตาม user เช่น `sales-nida/`, `md-somchai/` ทุกโต๊ะมี `.gitea-token` (token ทดสอบของ Gitea ในเครื่อง) · โต๊ะ `md-somchai/` มี `notes/deal-rules.md` (โน้ตลับของ MD คัดลอกจาก [`../seed/notes/`](../seed/notes/)) |
| หลัง LAB 1 | แต่ละโต๊ะมี `work/` (ผลงานจริง) และ `.claude/skills/` (skill ส่วนตัว) |
| หลัง LAB 3 | แต่ละโต๊ะมี `.claude/settings.json` (plugin ที่ติดตั้ง) |

ทำไมไม่เก็บใน git: token ของแต่ละคนออกใหม่ทุกครั้งที่ seed รัน และผลงานในโต๊ะคือสิ่งที่ผู้เรียนสร้างเองในแล็บ (ผลรันจริงของผู้สอนอยู่ใน [`../../_solution/`](../../_solution/))

> ของจริง skill ส่วนตัวของแต่ละคนอยู่ที่ `~/.claude/skills/` แต่ในแล็บพนักงาน 28 คนอยู่ในเครื่องเดียว จึงใช้ `desks/<user>/.claude/skills/` แทน
