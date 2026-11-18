# Checklist

ผลทดสอบกับ image สุดท้าย `sha256:d7052b3169da…` บน Docker 29.9.2 (Windows, linux/amd64) ด้วย container `mma-test-9c2e`, `mma-test-9c2f` และ volume `mma-test-vol-9c2e` ซึ่งลบแล้วทั้งหมด

**mock API:** โปรแกรมเล็ก ๆ ใน container ที่บันทึก request ของ CLI แล้วปฏิเสธ ใช้คีย์ปลอม ไม่ติดต่อบริการจริงและไม่ใช่การล็อกอิน

## การทดสอบที่สั่ง

| รายการ | หลักฐาน | ผล | เหตุผล |
|---|---|---|---|
| `yolo1..5 --version` | `2.1.319 (Claude Code)` ครบ 5 | PASS | |
| `cyolo1..5 --version` | `codex-cli 0.167.0` ครบ 5 | PASS | |
| config root คนละโฟลเดอร์ | `find` เห็น `.Claude/yolo1..5`, `.Codex/cyolo1..5` และ stub CLI พิมพ์ path ไม่ซ้ำกัน 10 ค่า | PASS | |
| `shared-check` ชี้ไฟล์เดียวกัน | `readlink -f` ทุก `yoloN` → `.Claude/shared/skills/shared-check/SKILL.md`, ทุก `cyoloN` → `.Codex/shared/skills/shared-check/SKILL.md` | PASS | |
| `cyolo1 mcp list` เห็น playwright | `playwright  playwright-mcp … enabled` และทำซ้ำได้ครบ `cyolo1..5` | PASS | |
| Playwright MCP ผ่าน stdio เปิด example.com + screenshot | `Page Title: Example Domain`, PNG 82,867 ไบต์ ลายเซ็น PNG ถูกต้อง (เปิดดูภาพจาก build ก่อนหน้าซึ่งขนาดไฟล์เท่ากัน) | PASS | spawn จาก `mcp.json` จริงด้วย env ขั้นต่ำ |
| installer รอบ 2 ไม่ทับของเดิม | วาง credential ปลอม, แก้ `config.toml`, ใส่ skill ส่วนตัว แล้วรันซ้ำ: `สร้างใหม่ 0` และ snapshot เหมือนเดิม 162 บรรทัด | PASS | |
| ลบ container แล้วสร้างใหม่ ของใน volume ยังอยู่ | snapshot ของไฟล์, symlink, โฟลเดอร์ และสิทธิ์ 47,848 บรรทัด ต่างกัน 0 บรรทัด | PASS | |
| installer รันทุกครั้งที่ start | log เพิ่มหลัง `docker restart` และใน container ใหม่ ทั้งคู่ `สร้างใหม่ 0` | PASS | |
| JupyterLab `/lab` | HTTP 200 ทั้งตอนเริ่ม, หลัง restart และใน container ใหม่ | PASS | |

## สเปกส่วนที่เหลือ

| รายการ | หลักฐาน | ผล | เหตุผล |
|---|---|---|---|
| คำสั่งพิมพ์ได้ใน JupyterLab Terminal | เปิด Terminal จริงผ่าน API + websocket: `which` เจอ `/usr/local/bin/...` และ `--version` ถูกต้อง | PASS | |
| คำสั่งพิมพ์ได้ใน `docker exec` | ใช้รันการทดสอบทั้งหมด | PASS | |
| ไม่มีข้อมูลล็อกอินใน image | `/root/ai-accounts` ว่าง, ไม่พบ `auth.json`, `.credentials.json`, `.claude.json`, SSH key, `.netrc`; ไม่มี env ชื่อคล้าย secret; ไม่พบค่าสุ่มและคำคล้าย secret ใน `docker history` | PASS | |
| `/root/ai-accounts` เป็น volume | `Config.Volumes` มี `/root/ai-accounts` | PASS | |
| ไม่มี SSH, คง DinD และ JupyterLab | ไม่มี `sshd`, EXPOSE แค่ 8888, `docker run --rm alpine` ข้างในขึ้น `dind-ok` | PASS | |
| pin เวอร์ชัน + Chromium | เวอร์ชันตรง 3 ตัว; Chromium build 1252 | PASS | |
| ฟอนต์ไทย | `fc-match :lang=th` = Loma, เปิดภาพ screenshot แล้วสระและวรรณยุกต์ถูกต้อง | PASS | |
| wrapper ส่งต่อ `"$@"` ครบ | stub CLI รับอาร์กิวเมนต์ `a  b`, `c"d` และค่าว่างครบ | PASS | |
| ไม่เปลี่ยน `$HOME` | stub CLI พิมพ์ `HOME=/root` ทุกบัญชี | PASS | |
| แจ้งชัดเมื่อไม่มีโฟลเดอร์บัญชี | ข้อความภาษาไทยพร้อม path, rc=3 ทั้งสอง CLI | PASS | |
| ไม่พิมพ์ secret | ค่าสุ่มอยู่เฉพาะใน `SKILL.md` ของตัวเอง ไม่อยู่ใน log, `docker logs` และ request | PASS | |
| แก้ `shared` แล้วเห็นโดยไม่รัน installer | เพิ่ม/ลบ skill แล้วลิงก์ตามเมื่อเปิดครั้งถัดไป; แก้ `mcp.json` แล้ว `cyolo3 mcp list` เห็นทันที | PASS | |
| Claude เห็น skill + MCP จริง | mock API: request มี `shared-check`, `mcp__playwright__*` 25 ตัว และ prompt ครบ | PASS | ใช้คีย์ปลอม ไม่ได้ล็อกอิน |
| Codex เห็น skill + MCP จริง | mock API: มี `shared-check` และ namespace `mcp__playwright`; `app-server` ผ่าน `cyolo1`, `cyolo5` รายงาน 25 tools | PASS | ไม่ได้ล็อกอิน |
| flag ของ Codex มีผลจริง | `exec` แสดง `approval: never`, `sandbox: danger-full-access` | PASS | |
| Codex credential แยกต่อ `CODEX_HOME` | คีย์ปลอม: `auth.json` เกิดใน `cyolo1` เท่านั้น, สิทธิ์ 600; `cyolo2` ขึ้น `Not logged in`; ไม่มี `/root/.codex` | PASS | ลบคีย์ปลอมแล้ว |
| เปิดพร้อมกันได้ | เปิด `cyolo1`, `cyolo2`, `yolo1`, `yolo2` พร้อมกันใน pty แต่ละ process มี config root ของตัวเอง; MCP 2 ตัวทำงานพร้อมกันได้ | PASS | ทดสอบก่อนล็อกอิน |
| `.bashrc` และ Git ไม่ถูกแก้ | `.bashrc`, `.profile` ยังเป็นวันที่ของ base image และไม่มีคำว่า claude/local/bin; ไม่มี `~/.gitconfig` | PASS | |
| Git ปกติ | `git 2.56.0`, `init` + `commit` ผ่าน | PASS | |
| ห้ามแตะของเดิม | container/volume ก่อนและหลังเหมือนกัน, `devtools` ยัง Up, image เดิมมี ID เดิม, ไม่ได้ใช้ `prune`, ไม่ได้ mount `ai-accounts` | PASS | เพิ่มเฉพาะ `multi-account:1.0` และ build cache |
| `--strict-config` กับ `config.toml` ที่สร้าง | `cyolo4 --strict-config exec` รันผ่าน; ส่วน `mcp list` ขึ้น `not supported for codex mcp` | PASS | เป็นข้อจำกัดของ Codex ไม่ใช่ image |

## ต้องล็อกอิน

| รายการ | หลักฐาน | ผล | เหตุผล |
|---|---|---|---|
| ล็อกอิน `yolo1..5` | ไม่มี ขึ้น `Not logged in · Please run /login` | SKIP | ต้องล็อกอิน |
| ล็อกอิน `cyolo1..5` + `codex exec` จริง | ไม่มี | SKIP | ต้องล็อกอิน |
| ตำแหน่ง `.credentials.json` ของ Claude | ไม่มี | SKIP | ไฟล์เกิดหลังล็อกอิน |
| โมเดลตอบ `SHARED_SKILL_OK-<tool>-<ค่าสุ่ม>` | ไม่มี ยืนยันได้แค่ว่า CLI ค้นพบ skill | SKIP | ต้องล็อกอิน |
| `/mcp` ใน `yoloN` เห็น playwright | ไม่มี ยืนยันผ่าน mock API แทน | SKIP | ต้องล็อกอินจึงเข้าหน้าโปรแกรมได้ |
| AI สั่ง Playwright จริงผ่าน CLI | ไม่มี ทดสอบ MCP โดยตรงผ่าน stdio แทน | SKIP | ต้องล็อกอิน |

ไม่มีรายการ FAIL ใน image สุดท้าย ปัญหาที่พบระหว่างทางและแก้แล้ว: ชื่อ MCP ที่มีจุดทำให้ `cyoloN` เปิดไม่ได้ (ดู `setup-report.md`)
