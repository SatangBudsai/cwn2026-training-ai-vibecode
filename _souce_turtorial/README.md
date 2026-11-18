# Teaching CWN 2026

<h2 align="center">📱 สแกนเพื่อเข้าหน้าวิชานี้</h2>

<p align="center">
  <a href="https://github.com/Tuchsanai/Teaching_CWN2026">
    <img src="00_resource/repo_qr.png" alt="QR code ไปยัง repo Teaching_CWN2026" width="360">
  </a>
</p>

<p align="center">
  <b><a href="https://github.com/Tuchsanai/Teaching_CWN2026">github.com/Tuchsanai/Teaching_CWN2026</a></b>
</p>

---

## เปิด container `multi-account-devtool`

💬 วางพรอมต์นี้ใน **Claude Code ใน VS Code บนเครื่องตัวเอง** (Docker Desktop ต้อง Engine running) → กดส่ง → อนุญาตคำสั่ง `docker` เมื่อถูกถาม

```text

เตรียม container `multi-account-devtool`:

1. ถ้ามี container `multi-account-devtool` อยู่แล้ว ให้ลบด้วย `docker rm -f multi-account-devtool`
   (ห้ามลบ volume `ai-accounts` เพราะเก็บการล็อกอินของทุกบัญชีไว้)

2. ตรวจ port <SSH_PORT>=2223 และ <JUPYTER_PORT>=8886 ถ้าชน ให้ใช้ port ว่างถัดไป

3. หาไฟล์ env ในโฟลเดอร์ปัจจุบัน: ใช้ `.env` ก่อน ถ้าไม่มีใช้ `.env_example` (หรือ `.env.example`)
   แล้วเติม `--env-file <path เต็ม>` ในข้อ 4 (ห้ามแสดงค่าในไฟล์ แสดงได้เฉพาะชื่อตัวแปร)
   - ถ้าใช้ไฟล์ example ให้เตือนว่า "⚠️ ไม่พบ .env — ใช้ <ชื่อไฟล์> แทน ค่าอาจเป็นค่าตัวอย่าง
     กรุณา copy เป็น .env แล้วใส่ค่าจริง" พร้อมบอกชื่อตัวแปรที่ค่าว่างหรือดูเป็นค่าตัวอย่าง
   - ถ้าไม่พบทั้งสองไฟล์ ให้ตัด `--env-file` ออกแล้วรันต่อ และเตือนว่า
     "⚠️ ไม่พบ .env หรือ .env_example — container จะไม่มี environment variable กรุณาสร้าง .env แล้วรันใหม่"

4. หาโฟลเดอร์ key SSH `Devtool_SSH/` (key สำเร็จรูปของ lab) ในโฟลเดอร์ปัจจุบันเท่านั้น
   (ไม่ต้องค้นในโฟลเดอร์ย่อย) และต้องมีครบทั้ง 2 ไฟล์
     Devtool_SSH/
     ├── devtoolSSH       ← private key (ใช้กับ ssh -i)
     └── devtoolSSH.pub   ← public key (container ใส่ใน authorized_keys ให้อัตโนมัติตอน start)
   - ถ้าเจอ ให้แทน <SSH_KEY_DIR> ในข้อ 5 และ 7 ด้วย path เต็มของโฟลเดอร์นั้น
     (ห้ามแสดงเนื้อหา private key)
   - ถ้าไม่เจอ (หรือไฟล์ไม่ครบ) = ไม่ใช้ key ให้ตัดบรรทัด `-v ...:/etc/devtools/ssh:ro` ออกแล้วรันต่อ และเตือนว่า
     "⚠️ ไม่พบโฟลเดอร์ Devtool_SSH — SSH ใช้ได้เฉพาะ password (passwd) ยังใช้ key ไม่ได้"

5. รัน:

docker run -dit --name multi-account-devtool --hostname multi-account-devtool --privileged \
  -p <SSH_PORT>:22 -p <JUPYTER_PORT>:8888 \
  --env-file <ENV_FILE> \
  -v "<SSH_KEY_DIR>:/etc/devtools/ssh:ro" \
  -v ai-accounts:/root/ai-accounts \
  tuchsanai/multi-account-devtool:2569_1

6. รอจน `docker logs multi-account-devtool` มีบรรทัดที่มีข้อความ `jupyter lab :8888`

7. ถ้า mount `Devtool_SSH` ในข้อ 4 ให้ตรวจ key (ข้ามได้ถ้าไม่เจอโฟลเดอร์):
   - `docker logs multi-account-devtool` ต้องมีบรรทัด `SSH key login enabled`
   - ทดสอบ login ด้วย key จริง (ไม่ใช้ password):

ssh -i "<SSH_KEY_DIR>/devtoolSSH" -p <SSH_PORT> -o BatchMode=yes \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@localhost "echo SSH_KEY_OK"

     (บน Windows PowerShell ใช้ `UserKnownHostsFile=NUL`)
   - ถ้าได้ `SSH_KEY_OK` = ใช้ key ได้ ถ้าไม่ได้ ให้เตือนว่า
     "⚠️ SSH ด้วย key ไม่สำเร็จ — ใช้ password (passwd) ไปก่อน" พร้อมสาเหตุสั้น ๆ
     ถ้าสาเหตุคือ permission ของไฟล์ private key กว้างเกินไป (UNPROTECTED PRIVATE KEY FILE)
     ให้บอกคำสั่งแก้ให้ฉัน (Windows: `icacls`, macOS/Linux: `chmod 600`) โดยไม่ต้องรันเอง

8. ตรวจ skill `vastai` `yolo` `cyolo` (สำคัญ ห้ามข้าม):

docker exec multi-account-devtool bash -lc \
'B=$HOME/ai-accounts; for t in .Claude .Codex; do for s in vastai yolo cyolo; do [ -d $B/$t/shared/skills/$s ] && echo "$t/$s OK" || echo "$t/$s MISSING"; done; done'

   ถ้ามี MISSING แม้แต่ตัวเดียว ให้แจ้งเตือนฉันเป็นภาษาไทยอย่างชัดเจนว่า
   "⚠️ ยังไม่ได้ติดตั้ง skill — กรุณาติดตั้ง skill ต่อไปนี้ก่อนใช้งาน: <รายชื่อที่ขาด>"
   ห้ามแสดงรหัสหรือเนื้อหาใน SKILL.md
   และห้ามติดตั้ง skill เอง ให้แจ้งเตือนอย่างเดียว

9. ไม่ต้องติดตั้ง Claude Code / Codex เพิ่ม (มีใน image แล้ว) ห้ามล็อกอินแทนฉัน
   สรุปผลเป็นภาษาไทย โดยเรียงดังนี้:
   - ถ้ามีคำเตือน (ใช้ไฟล์ example / ไม่พบไฟล์ env / ไม่พบ Devtool_SSH / SSH key ไม่สำเร็จ / skill ขาด)
     ให้แสดงคำเตือนไว้บนสุดของสรุป ก่อนข้อมูลอื่น
   - port ที่ใช้ (SSH / Jupyter)
   - URL ของ JupyterLab
   - สถานะ SSH key (ใช้ได้ / ไม่พบ Devtool_SSH / ไม่สำเร็จ) พร้อมคำสั่ง
     `ssh -i "<SSH_KEY_DIR>/devtoolSSH" -p <SSH_PORT> root@localhost`
   - สถานะไฟล์ env (ใช้ .env / ใช้ .env_example แทน / ไม่พบ) พร้อมรายชื่อตัวแปรที่โหลด (เฉพาะชื่อ)
   - ผลตรวจ skill (มีครบ / ขาดอะไร)

```

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
|---|---|---|
| `<SSH_PORT>` | `2223` | `ssh -i Devtool_SSH/devtoolSSH root@localhost -p <SSH_PORT>` (key) หรือ `ssh root@localhost -p <SSH_PORT>` (password `passwd`) |
| `<SSH_KEY_DIR>` | `./Devtool_SSH` | โฟลเดอร์ key สำเร็จรูปของ lab → mount เป็น `/etc/devtools/ssh` (อ่านอย่างเดียว) ให้ container ใส่ public key ใน `authorized_keys` |
| `<JUPYTER_PORT>` | `8886` | http://localhost:<JUPYTER_PORT>/lab (ไม่มีรหัสผ่าน) |

## เข้าใช้งาน container ที่ `<WORKDIR>`

💬 วางพรอมต์นี้ใน **Claude Code** หลังเปิด container แล้ว → Claude จะเลือกวิธีเข้าที่ใช้ได้ (SSH ก่อน ถ้าไม่ได้ใช้ `docker exec`) และรันทุกคำสั่งใน container

```text

ตัวแปร: <WORKDIR>=/workspace

เป้าหมาย: เข้าไปทำงานใน container `multi-account-devtool` ที่โฟลเดอร์ <WORKDIR>

ขั้นที่ 1 — เช็กว่า container รันอยู่
  ใช้ `docker ps` ถ้าไม่เจอ ให้เตือน "⚠️ container ยังไม่รัน — เตรียม container ก่อน" แล้วหยุด
  (ห้ามสร้างหรือลบ container เอง)

ขั้นที่ 2 — เตรียมค่า
  <SSH_PORT> = ผลของ `docker port multi-account-devtool 22` (ปกติคือ 2223)
  <KEY>      = path เต็มของ `Devtool_SSH/devtoolSSH` ในโฟลเดอร์ปัจจุบัน (ห้ามแสดงเนื้อหา key)

ขั้นที่ 3 — ลองเข้า container (ต้องได้ผลลัพธ์เป็น <WORKDIR>)
  วิธี A: SSH ด้วย key  (ลองวิธีนี้ก่อน)
    ssh -i "<KEY>" -p <SSH_PORT> -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o LogLevel=ERROR root@localhost "mkdir -p <WORKDIR> && cd <WORKDIR> && pwd"
  วิธี B: docker exec  (ใช้เมื่อวิธี A ไม่ได้)
    docker exec multi-account-devtool bash -lc "mkdir -p <WORKDIR> && cd <WORKDIR> && pwd"

  - ถ้าวิธี A ไม่ได้ ให้บอกสาเหตุสั้น ๆ แล้วใช้วิธี B
  - ถ้าสาเหตุคือ UNPROTECTED PRIVATE KEY FILE ให้บอกคำสั่งแก้ (Windows: icacls / Mac-Linux: chmod 600) แต่ไม่ต้องรันเอง
  - ถ้าไม่ได้ทั้ง 2 วิธี ให้เตือนแล้วหยุด
  - ห้ามพิมพ์ password แทนฉัน

ขั้นที่ 4 — ทำงานทุกอย่างใน container
  นับจากนี้ ทุกคำสั่งที่ฉันสั่ง (ติดตั้ง / รันโค้ด / git / สร้างหรือแก้ไฟล์) ต้องรันใน container ที่ <WORKDIR> เท่านั้น ห้ามรันบนเครื่องตัวเอง
  วิธี A: ssh -i "<KEY>" -p <SSH_PORT> -o BatchMode=yes -o LogLevel=ERROR root@localhost "cd <WORKDIR> && <คำสั่ง>"
  วิธี B: docker exec -w <WORKDIR> multi-account-devtool bash -lc '<คำสั่ง>'
  - สร้างหรือแก้ไฟล์ใน container ด้วย heredoc หรือ `docker cp`
  - ถ้าวิธีที่ใช้อยู่เกิดล้มเหลวกลางทาง ให้สลับไปใช้อีกวิธี

ขั้นที่ 5 — สรุปผลเป็นภาษาไทย
  - คำเตือน (ถ้ามี) ไว้บนสุด
  - วิธีที่ใช้ (A หรือ B) และ <WORKDIR>
  - คำสั่งสำหรับให้ฉันเข้า shell เอง:
      วิธี A: ssh -t -i "<KEY>" -p <SSH_PORT> root@localhost "cd <WORKDIR> && exec bash -l"
      วิธี B: docker exec -it -w <WORKDIR> multi-account-devtool bash -l

```

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
|---|---|---|
| `<WORKDIR>` | `/workspace` | โฟลเดอร์ทำงานใน container (สร้างให้อัตโนมัติถ้ายังไม่มี) |
| `<SSH_PORT>` | `2223` | อ่านจาก `docker port multi-account-devtool 22` |
| `<KEY>` | `./Devtool_SSH/devtoolSSH` | private key สำหรับวิธี A |

> 💡 ใน Git Bash ให้ใส่ `MSYS_NO_PATHCONV=1` หน้า `docker exec -w ...` ไม่งั้นจะ error `Cwd must be an absolute path` (PowerShell ไม่มีปัญหานี้)
