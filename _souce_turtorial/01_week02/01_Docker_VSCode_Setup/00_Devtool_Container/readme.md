# DevTools Base Learning Container

Ubuntu 24.04 สำหรับ DevTools labs — มี **Docker-in-Docker**, **Python 3**, **Node.js 22**, **JupyterLab** และ **SSH** พร้อมใช้
build image เองจาก `Dockerfile` ในโฟลเดอร์นี้ แล้วรัน container ได้ในไม่กี่คำสั่ง

| หมวด | รายละเอียด |
|------|------------|
| **Base** | Ubuntu 24.04, timezone `Asia/Bangkok`, locale UTF-8 |
| **Docker-in-Docker** | docker-ce, containerd, buildx & compose plugins |
| **Python / Node.js** | python3, pip, venv — Node.js 22 LTS + npm/npx |
| **Git** | เวอร์ชันล่าสุดจาก `ppa:git-core/ppa` (รองรับ `git worktree` ครบทุกคำสั่ง) |
| **JupyterLab 4** | jupytext, jupyterlab-git, jupyterlab-lsp, code-formatter (black/isort), execute-time, resource-usage, ipywidgets, bash_kernel |
| **Tooling** | curl, wget, vim, nano, less, net-tools, ping, dnsutils |
| **Ports** | `22` SSH, `8888` JupyterLab |
| **SSH login** | user `root` / password `passwd` หรือ key `Devtool_SSH/devtoolSSH` |
| **Workdir** | `/workspace` |

> ⚠️ รหัสผ่าน `passwd` และ key ในโฟลเดอร์ `Devtool_SSH/` เป็นค่าเดียวกันทุกเครื่อง — ใช้เพื่อการเรียน/ทดลองบนเครื่องตัวเองเท่านั้น ไม่ควรเปิดพอร์ตออก internet

## โครงสร้างโฟลเดอร์

```text
00_Devtool_Container/
├── Dockerfile               ← สูตร build image
├── start.sh                 ← entrypoint: sshd + dockerd + jupyter lab
├── jupyter_overrides.json   ← ค่า default ของ JupyterLab UI (hidden files, copy/paste ใน terminal)
├── docker-compose.yml       ← ทางเลือก: build + run ด้วยคำสั่งเดียว (ขั้นที่ 6)
├── .dockerignore            ← ไม่ส่ง Devtool_SSH/, workspace/, readme ฯลฯ เข้า image
└── Devtool_SSH/             ← map เป็น volume → /etc/devtools/ssh
    ├── devtoolSSH           ← private key (ใช้กับ ssh -i)
    └── devtoolSSH.pub       ← public key (start.sh ใส่ใน authorized_keys ให้อัตโนมัติ)
```

> key ใน `Devtool_SSH/` **ไม่ได้ถูก build เข้า image** (ถูกกันไว้ใน `.dockerignore`) — ต้อง map โฟลเดอร์เข้า container ตอน run (ขั้นที่ 2)

---

# ขั้นที่ 1 — Build image

เปิด terminal ในโฟลเดอร์นี้ (ที่มี `Dockerfile`) แล้วรัน:

```bash
docker build -t devtools:2569_1 .
```

| ส่วน | ความหมาย |
|------|----------|
| `-t devtools:2569_1` | ตั้งชื่อ image เป็น `devtools` tag `2569_1` |
| `.` | build context = โฟลเดอร์ปัจจุบัน (ใช้ `Dockerfile`, `start.sh`, `jupyter_overrides.json`) |

ครั้งแรกใช้เวลาหลายนาที (ดาวน์โหลด Ubuntu, Docker, Node.js, JupyterLab) ครั้งถัดไปจะใช้ cache เร็วขึ้นมาก

ตรวจว่ามี image แล้ว:

```bash
docker images devtools
# REPOSITORY   TAG      IMAGE ID       CREATED          SIZE
# devtools     2569_1   xxxxxxxxxxxx   10 seconds ago   ...
```

---

# ขั้นที่ 2 — Run container

รันในโฟลเดอร์นี้ (ที่มี `Devtool_SSH/`) — คำสั่งบรรทัดเดียว copy-paste ได้ทั้ง PowerShell และ Linux/macOS

```bash
docker run -dit --name devtools --hostname devtools --privileged -p 2222:22 -p 8888:8888 -v "${PWD}/Devtool_SSH:/etc/devtools/ssh" devtools:2569_1
```

| Flag | ความหมาย |
|------|----------|
| `-dit` | รันแบบ background พร้อม tty |
| `--name devtools` | ตั้งชื่อ container |
| `--hostname devtools` | ตั้งชื่อเครื่องใน container (prompt เป็น `root@devtools:~#` แทนเลข container ID) |
| `--privileged` | จำเป็นสำหรับ Docker-in-Docker ให้ `dockerd` ข้างในทำงานได้ |
| `-p 2222:22` | map SSH ออกมาที่ host พอร์ต `2222` |
| `-p 8888:8888` | map JupyterLab ออกมาที่ host พอร์ต `8888` |
| `-v "${PWD}/Devtool_SSH:/etc/devtools/ssh"` | map โฟลเดอร์ key เข้า container เพื่อเปิด SSH ด้วย key (ไม่ใส่ก็ได้ ถ้าจะใช้แค่ password) |
| `devtools:2569_1` | image ที่ build ในขั้นที่ 1 |

ตรวจว่า container ทำงานแล้ว และเปิด SSH key แล้ว:

```bash
docker ps --filter name=devtools
# CONTAINER ID   IMAGE             STATUS         PORTS
# xxxxxxxxxxxx   devtools:2569_1   Up 5 seconds   0.0.0.0:2222->22/tcp, 0.0.0.0:8888->8888/tcp

docker logs devtools | grep "SSH key"
# [start.sh] SSH key login enabled: /etc/devtools/ssh/devtoolSSH.pub
```

> ถ้าพอร์ต `2222` หรือ `8888` ถูกใช้อยู่แล้ว ให้เปลี่ยนเลขฝั่งซ้าย เช่น `-p 2223:22` แล้วใช้พอร์ตนั้นในคำสั่ง `ssh` แทน

---

# ขั้นที่ 3 — SSH ด้วย password

```bash
ssh root@localhost -p 2222
# password: passwd
```

ครั้งแรกที่เชื่อมต่อ ssh จะถามยืนยัน host key ให้พิมพ์ `yes` แล้วใส่รหัสผ่าน `passwd`:

```text
$ ssh root@localhost -p 2222
The authenticity of host '[localhost]:2222 ([127.0.0.1]:2222)' can't be established.
ED25519 key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
root@localhost's password:
root@devtools:~# whoami
root
root@devtools:~# docker run --rm hello-world     # ทดสอบ Docker-in-Docker
```

### รันคำสั่งเดียวแล้วออก / copy ไฟล์เข้า-ออก container

ทุกคำสั่งจะถามรหัสผ่าน `passwd` เหมือนกัน

```bash
ssh -p 2222 root@localhost "hostname && docker --version"
scp -P 2222 ./hello.txt root@localhost:/workspace/
scp -P 2222 root@localhost:/workspace/hello.txt ./
```

| คำสั่ง | ทำอะไร |
|--------|--------|
| `ssh -p 2222 root@localhost "hostname && docker --version"` | เชื่อมต่อเข้า container แล้ว **รันคำสั่งในเครื่องหมาย `"..."` ครั้งเดียวแล้วออกทันที** (ไม่เปิด shell ค้างไว้) — `hostname` แสดงชื่อเครื่อง (`devtools`), `&&` = รันคำสั่งถัดไปเมื่อคำสั่งแรกสำเร็จ, `docker --version` แสดงเวอร์ชัน Docker ใน container ผลลัพธ์แสดงบนเครื่องเรา |
| `scp -P 2222 ./hello.txt root@localhost:/workspace/` | **copy ไฟล์จากเครื่องเรา → container**: ต้นทาง `./hello.txt` (ไฟล์ในโฟลเดอร์ปัจจุบันบนเครื่องเรา) ปลายทาง `root@localhost:/workspace/` (โฟลเดอร์ `/workspace` ใน container) |
| `scp -P 2222 root@localhost:/workspace/hello.txt ./` | **copy ไฟล์จาก container → เครื่องเรา**: สลับต้นทาง/ปลายทาง — ดึง `/workspace/hello.txt` ใน container มาไว้ที่โฟลเดอร์ปัจจุบัน (`./`) |

ส่วนประกอบของคำสั่ง:

| ส่วน | ความหมาย |
|------|----------|
| `root@localhost` | login เป็น user `root` ที่เครื่อง `localhost` (พอร์ต 2222 ถูก map ไปที่ SSH ของ container) |
| `-p 2222` / `-P 2222` | ระบุพอร์ต — `ssh` ใช้ `-p` (ตัวเล็ก) แต่ `scp` ใช้ `-P` (ตัวใหญ่) |
| `scp <ต้นทาง> <ปลายทาง>` | ฝั่งที่มี `user@host:` นำหน้า = ไฟล์ใน container, ฝั่งที่ไม่มี = ไฟล์บนเครื่องเรา |

---

# ขั้นที่ 4 — SSH ด้วย key (`devtoolSSH`)

ต้องรัน container พร้อม `-v "${PWD}/Devtool_SSH:/etc/devtools/ssh"` (ขั้นที่ 2) — `start.sh` จะนำ `devtoolSSH.pub` ไปใส่ใน `/root/.ssh/authorized_keys` ให้เองทุกครั้งที่ container start

Linux/macOS ต้องตั้ง permission ของ private key ก่อน (ครั้งเดียว — git ไม่เก็บ permission ไว้ ssh จะไม่ยอมใช้ key ที่คนอื่นอ่านได้):

```bash
chmod 600 Devtool_SSH/devtoolSSH
```

login ด้วย key — ไม่ถามรหัสผ่าน:

```bash
ssh -i Devtool_SSH/devtoolSSH root@localhost -p 2222
```

```text
$ ssh -i Devtool_SSH/devtoolSSH root@localhost -p 2222
root@devtools:~# whoami
root
```

### รันคำสั่งเดียวแล้วออก / copy ไฟล์ด้วย key

เหมือนขั้นที่ 3 ทุกอย่าง แค่เพิ่ม `-i Devtool_SSH/devtoolSSH` — จึง **ไม่ถามรหัสผ่าน**

```bash
ssh -i Devtool_SSH/devtoolSSH -p 2222 root@localhost "hostname && docker --version"
scp -i Devtool_SSH/devtoolSSH -P 2222 ./hello.txt root@localhost:/workspace/
```

| คำสั่ง | ทำอะไร |
|--------|--------|
| `ssh -i Devtool_SSH/devtoolSSH -p 2222 root@localhost "hostname && docker --version"` | login ด้วย private key แล้วรัน `hostname` และ `docker --version` ใน container ครั้งเดียวแล้วออก |
| `scp -i Devtool_SSH/devtoolSSH -P 2222 ./hello.txt root@localhost:/workspace/` | copy `hello.txt` จากเครื่องเรา → `/workspace/` ใน container โดยใช้ key (ดึงกลับก็สลับต้นทาง/ปลายทางเหมือนขั้นที่ 3) |

| ส่วน | ความหมาย |
|------|----------|
| `-i Devtool_SSH/devtoolSSH` | **i**dentity file — ระบุ private key ที่ใช้ยืนยันตัวตนแทนรหัสผ่าน (ใช้ `-i` ตัวเล็กทั้ง `ssh` และ `scp`) |
| `-p 2222` / `-P 2222` | พอร์ต — `ssh` ตัวเล็ก, `scp` ตัวใหญ่ (เหมือนขั้นที่ 3) |

> * key คู่นี้ **แจกให้ทุกคนใช้ร่วมกัน** สำหรับ lab เท่านั้น — ห้ามนำไปใช้กับเครื่องจริง
> * อยากได้ key ใหม่: ลบไฟล์ทั้งสองใน `Devtool_SSH/` แล้ว `docker restart devtools` → container สร้างคู่ใหม่ให้ในโฟลเดอร์เดิม
> * login ด้วย password (`passwd`) ยังใช้ได้ควบคู่กันเสมอ

---

# ขั้นที่ 5 — JupyterLab

เปิดเบราว์เซอร์ที่ <http://localhost:8888> — เข้าได้เลยไม่ต้องใส่รหัสผ่าน งานของ lab อยู่ที่ `/workspace`

* file browser แสดง hidden file/folder (เช่น `.git`, `.env`)
* terminal ใน JupyterLab: `Ctrl+V` / `Ctrl+Shift+V` = paste, `Ctrl+Shift+C` = copy, คลิกขวามีเมนู Copy/Paste
* มี kernel **Python 3** และ **Bash** ให้เลือกตอนสร้าง notebook

ถ้าต้องการตั้งรหัสผ่าน JupyterLab ให้เพิ่ม `-e JUPYTER_PASSWORD=xxx` ในคำสั่ง `docker run` (ขั้นที่ 2)

---

# ขั้นที่ 6 (ทางเลือก) — ใช้ docker compose แทน

`docker-compose.yml` ในโฟลเดอร์นี้รวมขั้นที่ 1–2 ไว้ในคำสั่งเดียว (ใช้ชื่อ container `devtools` เหมือนกัน — ลบ container เดิมก่อนด้วย `docker rm -f devtools`)

```bash
docker compose up -d --build   # build จาก Dockerfile แล้วรัน
docker compose down            # หยุดและลบ container
```

ต่างจาก `docker run` ในขั้นที่ 2 ตรงที่:

* map `./workspace` บน host → `/workspace` ใน container (งานไม่หายเมื่อลบ container)
* เก็บข้อมูล Docker-in-Docker ใน named volume `devtools-dind`
* `restart: unless-stopped` — container เริ่มเองเมื่อเปิด Docker ใหม่
* เปลี่ยนพอร์ต/รหัสผ่านได้ผ่าน environment หรือไฟล์ `.env` ข้าง ๆ: `SSH_PORT=2222`, `JUPYTER_PORT=8888`, `JUPYTER_PASSWORD=`

---

# คำสั่งที่ใช้บ่อย

```bash
docker logs devtools                 # ดู log ตอน start (sshd / dockerd / jupyter)
docker exec -it devtools bash        # เข้า shell โดยไม่ผ่าน SSH
docker stop devtools                 # หยุด container
docker start devtools                # เริ่มใหม่
docker rm -f devtools                # ลบ container
docker build -t devtools:2569_1 .    # build ใหม่หลังแก้ Dockerfile / start.sh (แล้ว rm -f + run ใหม่)
```
