# multi-account:1.0

Image สำหรับใช้ Claude Code และ Codex CLI หลายบัญชีใน container เดียว ต่อยอดจาก `00_Devtool_Container` (ไม่มี SSH)

| หมวด | รายละเอียด |
|------|------------|
| **AI CLI (pin)** | Claude Code 2.1.319, Codex CLI 0.167.0, Playwright MCP 0.0.84 แก้เวอร์ชันได้ที่ `ARG` ใน `Dockerfile` |
| **เบราว์เซอร์** | Chromium จาก playwright ในแพ็กเกจ `@playwright/mcp` + ฟอนต์ไทย `fonts-thai-tlwg` |
| **คำสั่ง** | `yolo1..5`, `cyolo1..5`, `multi-account-install` ใน `/usr/local/bin` |
| **บัญชี** | `/root/ai-accounts` เป็น volume ไม่มีข้อมูลล็อกอินใน image |
| **ของเดิม** | Ubuntu 24.04, Docker-in-Docker (ต้อง `--privileged`), Python, Node.js 22, Git, JupyterLab 4 |

```text
MultiAccountDevtool/
├── Dockerfile
├── start.sh                 ← entrypoint: installer + dockerd + jupyter lab
├── jupyter_overrides.json
├── docker-compose.yml
├── multi-account/
│   ├── common.sh            ← BASE_PATH (แก้ที่นี่ที่เดียว) + การลิงก์ skill
│   ├── account-wrapper      ← yolo1..5 / cyolo1..5 เป็น symlink มาที่ไฟล์นี้
│   ├── multi-account-install
│   └── mcp-to-codex.py      ← แปลง mcp.json เป็นค่า -c ของ Codex
├── setup-report.md          ← โครงสร้าง, การเชื่อม shared, ข้อจำกัด
├── login-guide.md           ← ล็อกอินทีละบัญชี
└── checklist.md             ← ผลทดสอบ
```

## เริ่มใช้

```bash
docker build -t multi-account:1.0 ./MultiAccountDevtool

docker run -d --name multi-account --privileged \
  -p 127.0.0.1:8888:8888 \
  -v multi-account-accounts:/root/ai-accounts \
  multi-account:1.0

docker exec -it multi-account yolo1
```

- JupyterLab: <http://localhost:8888/lab> ไม่มีรหัสผ่าน จึงผูก port กับ `127.0.0.1` ถ้าเปิดให้เครื่องอื่นเข้าให้เพิ่ม `-e JUPYTER_PASSWORD=...`
- ต้องใส่ `-v ...:/root/ai-accounts` เสมอ ไม่งั้น Docker สร้าง anonymous volume และหาบัญชีเดิมไม่เจอใน container ใหม่
- ขั้นถัดไปดู [login-guide.md](login-guide.md)
