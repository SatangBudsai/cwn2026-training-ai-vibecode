# Setup Report: multi-account:1.0

Image ที่ทดสอบ: `sha256:d7052b3169da…` ขนาด 4.47GB, build แบบ `--no-cache` ใช้เวลา 302 วินาที

| เครื่องมือ | เวอร์ชันที่ pin | ตำแหน่งคำสั่ง |
|---|---|---|
| Claude Code | 2.1.319 | `/usr/local/bin/claude` (ลิงก์ไป `/root/.local/share/claude/versions/2.1.319`) |
| Codex CLI | 0.167.0 | `/usr/bin/codex` |
| Playwright MCP | 0.0.84 (Playwright 1.65.0-alpha-2026-10-30) | `/usr/bin/playwright-mcp` |
| Chromium | build 1252 จาก playwright ในแพ็กเกจ MCP | `/ms-playwright` |
| ฟอนต์ไทย | `fonts-thai-tlwg` | ระบบ |

## Config root และ credential

`BASE_PATH="$HOME/ai-accounts"` แก้ที่ `multi-account/common.sh` ที่เดียว แล้ว build ใหม่

| คำสั่ง | ตัวแปรที่ตั้ง | Config root | ตำแหน่ง credential |
|---|---|---|---|
| `yolo1..5` | `CLAUDE_CONFIG_DIR`, `IS_SANDBOX=1` (เมื่อเป็น root) | `~/ai-accounts/.Claude/yoloN` | `.credentials.json` ในโฟลเดอร์บัญชี **ตามเอกสารของ Claude Code ยังไม่ได้ยืนยันเพราะต้องล็อกอินจริง** ส่วน `.claude.json` เห็นในโฟลเดอร์บัญชีจริง |
| `cyolo1..5` | `CODEX_HOME` | `~/ai-accounts/.Codex/cyoloN` | `auth.json` ในโฟลเดอร์บัญชี **ยืนยันแล้วด้วยคีย์ปลอม**: `cyolo1` มีไฟล์ ส่วน `cyolo2` ยังขึ้น `Not logged in` และไม่มี `/root/.codex` |

โฟลเดอร์และไฟล์ที่ installer สร้างใหม่อ่านได้เฉพาะเจ้าของ (`umask 077`) และ `shared/` ไม่มี credential

## Skill และ MCP เชื่อมกับ shared อย่างไร

| เรื่อง | Claude (`yoloN`) | Codex (`cyoloN`) |
|---|---|---|
| อ่าน skill จาก | `$CLAUDE_CONFIG_DIR/skills` | `$CODEX_HOME/skills` (Codex เขียน `skills/.system` เองในโฟลเดอร์นี้) |
| เชื่อม skill กับ shared | symlink ทีละ skill ไป `../../shared/skills/<ชื่อ>` | วิธีเดียวกัน ไม่ symlink ทั้งโฟลเดอร์ |
| อ่าน MCP จาก | `--mcp-config=<BASE>/.Claude/shared/mcp/mcp.json` ทุกครั้งที่เปิด | wrapper แปลง `.Codex/shared/mcp/mcp.json` เป็น `-c mcp_servers.<ชื่อ>={...}` ทุกครั้งที่เปิด |
| วิธีตรวจ MCP | `/mcp` ในโปรแกรม เพราะ `yolo1 mcp list` ไม่แสดง MCP นี้ | `cyoloN mcp list` |

wrapper ลิงก์ skill ใหม่และเอาลิงก์ที่ค้างออกทุกครั้งที่เปิด จึงแก้ใน `shared` ครั้งเดียวโดยไม่ต้องรัน installer ซ้ำ

- skill ส่วนตัวของบัญชีที่ชื่อซ้ำกับ shared จะไม่ถูกทับ และบัญชีนั้นจะใช้ของตัวเอง
- ค่าสุ่มของ `shared-check` สร้างตอนติดตั้งครั้งแรกใน volume แยกกันต่อ CLI และมีเฉพาะในเนื้อ `SKILL.md`

## installer และการ start

`start.sh` รัน `multi-account-install` ก่อน dockerd และ JupyterLab ทุกครั้งที่ container start บันทึกที่ `/var/log/multi-account-install.log`

- สร้างเฉพาะสิ่งที่ยังไม่มี และไม่พิมพ์ค่าสุ่มหรือ secret
- ถ้า installer ล้มเหลว JupyterLab ยังเปิดต่อ เพื่อให้เข้าไปแก้และรันซ้ำเองได้

## ผลตรวจ "ข้อเท็จจริงจากการทดลอง" กับเวอร์ชันจริง

| ข้อเท็จจริงในสเปก | ผลตรวจ |
|---|---|
| root ต้องตั้ง `IS_SANDBOX=1` | จริง ถ้าไม่ตั้งจะขึ้น `cannot be used with root/sudo privileges` |
| `CODEX_HOME` ต้อง `mkdir -p` ก่อน | จริง ถ้าไม่มีจะขึ้น `failed to resolve CODEX_HOME` |
| Claude อ่าน skill จาก `$CLAUDE_CONFIG_DIR/skills` | จริง และ symlink ราย skill ใช้ได้ (request ที่ส่งถึง mock มี `shared-check`) |
| `--mcp-config=<ไฟล์>` ต้องมี `=` | ใช้แบบมี `=` แล้ว prompt ที่ตามมาส่งถึง mock ครบ `--help` แสดง `<configs...>` รับหลายค่า ไม่ได้ทดสอบแบบไม่มี `=` |
| `claude mcp list` ไม่แสดง MCP นี้ | จริง ขึ้น `No MCP servers configured` แต่ request มี tool `mcp__playwright__*` 25 ตัว |
| ห้าม symlink `.claude.json` | ทำตาม ไม่ได้ทดลองผลของการ symlink |
| Codex อ่าน skill จาก `$CODEX_HOME/skills` และเขียน `.system` | จริง `.system` อยู่ในโฟลเดอร์บัญชีและไม่หลุดไป `shared` |
| ห้ามใช้ `~/.agents/skills` | ทำตาม ไม่ได้ใช้ |
| Codex ส่ง MCP ด้วย `-c` และ `mcp list` ใช้ได้ | จริง Codex 0.167.0 โหลด tool แบบ deferred (`mcp__playwright`) ส่วน `app-server` รายงาน 25 tools |
| `--browser chromium` ฯลฯ | ใช้ได้จริง แม้ `--help` จะระบุค่าเป็น `chrome, firefox, webkit, msedge` และไม่มี `chromium` |
| `--output-dir` นอกโฟลเดอร์งาน | ใช้กับชื่อไฟล์อัตโนมัติเท่านั้น **ถ้าระบุ `filename` เอง ไฟล์จะลงโฟลเดอร์งาน** |
| ติดตั้ง Chromium ด้วย playwright ในแพ็กเกจ MCP | ทำตาม และ browser เปิดได้ |
| `codex login --device-auth` | มี flag นี้ใน `--help` ยังไม่ได้ล็อกอินจริง |
| `login status` ไม่ยืนยัน token | จริง ขึ้น `Authentication is checked when you send a request.` |

เพิ่มเติมจากสเปก:

- ชื่อ MCP ที่มีจุดใช้กับ `-c` ของ Codex ไม่ได้ และเคยทำให้ `cyoloN` เปิดไม่ได้ทั้งคำสั่ง wrapper จึงข้ามชื่อนั้นและแจ้งเตือนแทน
- Codex ส่ง env ให้ MCP เฉพาะที่กำหนดไว้ จึงใส่ `PLAYWRIGHT_BROWSERS_PATH` ไว้ใน `mcp.json`

## ข้อจำกัด

**นี่ไม่ใช่ OS isolation** การแยกบัญชีทำด้วย `CLAUDE_CONFIG_DIR` / `CODEX_HOME` เท่านั้น สิ่งที่ยังใช้ร่วมกัน:

- ผู้ใช้ Linux คนเดียวกัน (root): บัญชีหนึ่งหรือ agent ที่รันใน `--dangerously-*` อ่าน credential ของบัญชีอื่นได้
- `$HOME`, `/workspace`, `/tmp` และ Docker-in-Docker เดียวกัน
- project config ในโฟลเดอร์งาน เช่น `.claude/`, `.mcp.json`, `CLAUDE.md`, `.codex/`, `AGENTS.md`
- Environment ของ container: ถ้าส่ง `ANTHROPIC_API_KEY` หรือ `OPENAI_API_KEY` เข้ามา ทุกบัญชีจะเห็นค่าเดียวกัน
- `/tmp/playwright-mcp-output`: ทุกบัญชีเห็นไฟล์กัน และ screenshot ชื่ออัตโนมัติที่บันทึกในมิลลิวินาทีเดียวกันได้ชื่อซ้ำจนทับกันได้ (เกิดจริงตอนทดสอบพร้อมกันรอบแรก) ถ้าต้องกันไว้ให้ระบุ `filename` เอง

ข้อควรระวังอื่น:

- **JupyterLab ไม่มีรหัสผ่านเป็นค่าเริ่มต้น** และ Terminal ในนั้นเข้าถึง credential ทุกบัญชีได้ จึงควรผูก port กับ `127.0.0.1` หรือตั้ง `JUPYTER_PASSWORD`
- `start.sh` จากต้นฉบับพิมพ์ค่า `JUPYTER_PASSWORD` ลง `docker logs` ถ้าตั้งไว้ ยังไม่ได้แก้เพราะอยู่นอกงานนี้
- ปิด auto-update ของ Claude Code ไว้ด้วย `DISABLE_AUTOUPDATER=1` เพื่อคงเวอร์ชันที่ pin อัปเดตโดยแก้ `ARG` แล้ว build ใหม่
- `--mcp-config` ไม่รวม `strict`: MCP ที่บัญชีหรือโปรเจกต์ตั้งไว้เองยังโหลดร่วมด้วย
- ยังไม่ได้ทดสอบกับ volume `ai-accounts` ที่มีอยู่ เพราะห้ามแตะ ถ้า mount volume นั้นเข้า image นี้ installer จะเพิ่มส่วนที่ขาดโดยไม่ทับของเดิม แต่ควรสำรองก่อน
