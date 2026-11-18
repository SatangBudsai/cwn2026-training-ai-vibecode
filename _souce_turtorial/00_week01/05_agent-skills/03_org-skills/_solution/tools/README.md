# เครื่องมือที่ผู้สอนใช้รันส่วน 03 จริง

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `run-desk.sh <lab> <user> <prompt.txt>` | เปิด Claude Code แบบ headless ที่โต๊ะ `desks/<user>` แล้วเก็บ log แบบ stream-json (ใช้พิสูจน์ว่าหยิบ skill ไหน) |
| `summarize.py <log.jsonl>` | สรุป log: skill ที่หยิบ, จำนวนคำสั่ง, เวลา, คำตอบสุดท้าย |
| `ci-status.sh <PR...>` | ดูสถานะ CI ของ PR ใน Gitea |
| `cap.mjs <scenes.json>` + `capture-scenes/` | ล็อกอิน Gitea แบบ headless แล้วถ่ายภาพ/วิดีโอ (แปลงเป็น GIF ด้วย ffmpeg) — "playlist" ของทุก LAB |
| `joblogs2.mjs` | ดึง log ของ job CI จากหน้าเว็บ Gitea |
| `chart-lab3.py`, `chart-newhire.py`, `chart-search.py`, `chart-graph.py` | วาดกราฟจากข้อมูลจริงของ LAB 3 และ LAB 7 |
| `copy-lab1-desks.mjs` | สำหรับผู้เรียนที่ไม่ทำ LAB 1 ครบ 19 โต๊ะ: คัดลอก skill + work จาก `desks-after-lab1/` ไปโต๊ะที่ยังไม่มี skill (รันที่ `novatech/`: `node ../_solution/tools/copy-lab1-desks.mjs`) |
| `handoff-gifs.mjs <spec.json> <out-dir> <chromium.exe>` | GIF "ส่งต่องานทีละโต๊ะ" ของ LAB 4 และ LAB 5: input → skill ที่หยิบ → output → ผล (ข้อความจาก log จริง ภาพประกอบตัดจากภาพ image gen) |
| `story-gif.mjs <spec.json> <out.gif> <chromium.exe>` | GIF เล่าเรื่องจากภาพหน้าจอจริงพร้อมคำบรรยายไทย กรอบไฮไลต์ และซูม (LAB 0: VS Code + terminal + Gitea จริง) |

ผลจริงในส่วน 03 รันในสำเนาแยก `C:/t/org05/novatech` ด้วย `claude -p ... --strict-mcp-config --model opus` (ไม่เชื่อม Chrome) และ `--resume <session>` เมื่อเป็น "แชตเดิม"

LAB 4 และ 5 รอบ 2026-11-05 รันพรอมต์ "วางครั้งเดียว" ด้วย `claude -p` ที่ `novatech/` ของสำเนาแยก `C:/t/org05p/novatech` · GIF ของ LAB 0 ถ่ายจาก VS Code จริง (โปรไฟล์แยก เปิดโฟลเดอร์สำเนา novatech) ด้วยการจับภาพหน้าจอทุก 0.4 วินาทีระหว่าง Compose Up และภาพ Gitea ถ่ายแบบ headless หลังเปิดบริษัทใหม่
