
💬 วางใน **Claude Code app บนเครื่องตัวเอง** (Docker Desktop ต้อง Engine running) → กดส่ง → อนุญาตคำสั่ง `docker` เมื่อถูกถาม

````markdown
# รัน container ชื่อ `multi-account` จาก image `multi-account:1.0`

## 1. เตรียม image และ container

ถ้ายังไม่มี image `multi-account:1.0` ให้ดึงจาก Docker Hub แล้วตั้งชื่อใหม่

```bash
docker pull tuchsanai/multi-account:1
docker tag  tuchsanai/multi-account:1 multi-account:1.0
```

ถ้ามี container ชื่อ `multi-account` อยู่แล้ว ให้ลบออก (ห้ามลบ volume `ai-accounts`)

```bash
docker rm -f multi-account
```

## 2. สร้าง container

`PORT` เริ่มที่ `8886` ถ้าชนใช้เลขว่างถัดไป

```bash
docker run -dit \
  --name multi-account \
  --privileged \
  --platform linux/amd64 \
  -p <PORT>:8888 \
  -v ai-accounts:/root/ai-accounts \
  multi-account:1.0 \
  bash -c 'F=/etc/jupyter/jupyter_server_config.py; grep -q delete_to_trash $F || printf "c.FileContentsManager.delete_to_trash = False\nc.FileContentsManager.always_delete_dir = True\n" >> $F; exec /usr/local/bin/start.sh'
```

จับเวลาตั้งแต่ `docker run` จน `http://localhost:<PORT>/lab` ตอบ `200`

## 3. ตรวจผ่าน `docker exec` แล้วสรุปเป็นตาราง

ก่อนเริ่ม ดูว่าใน container มีสกิลที่ช่วยงานนี้ได้หรือไม่ ถ้ามีให้อ่านและใช้

- Claude: `/root/ai-accounts/.Claude/shared/skills`
- Codex: `/root/ai-accounts/.Codex/shared/skills`

รายการที่ต้องตรวจ

- `yolo1..5 --version` และ `cyolo1..5 --version`
- `cyolo1 mcp list` ต้องเห็น `playwright`
- สถานะล็อกอินทุกบัญชี (ห้ามล็อกอินแทนผม ห้ามแก้ไฟล์ใด ๆ)
  - Claude: `yolo1` ถึง `yolo5` ใช้คำสั่ง `yoloN auth status` แล้วดูเฉพาะค่า `loggedIn`
  - Codex: `cyolo1` ถึง `cyolo5` ใช้คำสั่ง `cyoloN login status`
- ตารางสรุป: image มาจากไหน (build เอง / pull) · URL ของ JupyterLab · เวลาที่ใช้
  และตาราง บัญชี | เวอร์ชัน | ล็อกอินแล้ว/ยัง ห้ามแสดงอีเมล ชื่อองค์กร หรือ token
- ถ้ามีบัญชีที่ยังไม่ล็อกอิน ให้บอกวิธีล็อกอินใน JupyterLab Terminal
  (พิมพ์ `yoloN` แล้วเลือก Claude account with subscription / พิมพ์ `cyoloN login --device-auth`)
- ถ้าไม่มีบัญชี Claude หรือ Codex ที่ล็อกอินเลย ให้หยุดและบอกวิธีล็อกอินใน JupyterLab Terminal ห้ามล็อกอินแทนผม
````
