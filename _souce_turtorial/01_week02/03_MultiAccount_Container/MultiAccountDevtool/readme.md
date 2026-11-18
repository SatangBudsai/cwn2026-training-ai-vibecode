# DevTools Base Container (จุดเริ่มต้นของการสร้าง image ระบบหลายบัญชี)

`Dockerfile` ของ `devtools` ซึ่งเป็นชั้นพื้นฐานของ image `multi-account:1.0` สั่งงานผ่าน **Claude Code app** (`docker exec`) และใช้ **JupyterLab** ในเบราว์เซอร์

ในขั้นที่ 1 ของบท [การสร้าง Docker image สำหรับระบบหลายบัญชีจาก Dockerfile](../README.md) Claude จะคัดลอกโฟลเดอร์นี้เป็น `MultiAccountDevtool/` แล้วเพิ่มระบบหลายบัญชีและ Playwright MCP ลงไป **ห้ามแก้โฟลเดอร์นี้โดยตรง**

| หมวด | รายละเอียด |
|------|------------|
| **Base** | Ubuntu 24.04, timezone `Asia/Bangkok`, locale UTF-8 |
| **Docker-in-Docker** | docker-ce, containerd, buildx & compose plugins (ต้องรันแบบ `--privileged`) |
| **Python / Node.js** | python3, pip, venv — Node.js 22 LTS + npm/npx |
| **Git** | เวอร์ชันล่าสุดจาก `ppa:git-core/ppa` |
| **JupyterLab 4** | jupytext, jupyterlab-git, jupyterlab-lsp, code-formatter, execute-time, resource-usage, ipywidgets, bash_kernel |
| **Port** | `8888` JupyterLab (ไม่มีรหัสผ่าน) |
| **Workdir** | `/workspace` |

```text
00_Devtool_Container/
├── Dockerfile               ← สูตร build image
├── start.sh                 ← entrypoint: dockerd + jupyter lab
├── jupyter_overrides.json   ← ค่า default ของ JupyterLab UI (hidden files, copy/paste ใน terminal)
├── docker-compose.yml       ← ทางเลือก: build + run ด้วยคำสั่งเดียว
└── .dockerignore
```

## ลองใช้แยกต่างหาก (ไม่จำเป็นสำหรับบทเรียนนี้)

```bash
docker build -t devtools-base:local .
docker run -dit --name devtools-base --privileged -p 8888:8888 devtools-base:local
docker exec -it devtools-base bash     # เข้า shell ใน container
docker rm -f devtools-base             # ลบเมื่อเลิกใช้
```

เปิด <http://localhost:8888/lab> ได้เลยโดยไม่ต้องใส่รหัสผ่าน ถ้าต้องการรหัสผ่านให้เพิ่ม `-e JUPYTER_PASSWORD=xxx` ในคำสั่ง `docker run`
