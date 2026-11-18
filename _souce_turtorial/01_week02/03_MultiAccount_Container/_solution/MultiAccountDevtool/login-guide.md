# Login Guide

ล็อกอินทีละบัญชี บัญชีละครั้ง credential จะอยู่ใน volume และคงอยู่แม้ลบ container

ตัวอย่างใช้ container ชื่อ `multi-account` ถ้าอยู่ใน JupyterLab Terminal อยู่แล้วให้ตัด `docker exec -it multi-account` ออก

## เปิด container

```bash
docker run -d --name multi-account --privileged \
  -p 127.0.0.1:8888:8888 \
  -v multi-account-accounts:/root/ai-accounts \
  multi-account:1.0
```

## Claude Code: yolo1..yolo5

```bash
docker exec -it multi-account yolo1
```

1. ทำตามหน้าจอเริ่มต้น แล้วพิมพ์ `/login` ถ้าระบบยังไม่พาเข้าหน้าล็อกอิน
2. เปิด URL ที่แสดงในเบราว์เซอร์ และเลือกบัญชี Anthropic ที่ต้องการให้ `yolo1`
3. ออกจากโปรแกรมด้วย `/exit` แล้วทำซ้ำกับ `yolo2` ถึง `yolo5`

ถ้าเบราว์เซอร์จำบัญชีเดิมไว้ ให้ออกจากระบบหรือใช้หน้าต่าง private ก่อนล็อกอินบัญชีถัดไป

## Codex CLI: cyolo1..cyolo5

```bash
docker exec -it multi-account cyolo1 login --device-auth
```

1. เปิด URL และใส่รหัสที่แสดง โดยใช้บัญชี OpenAI ที่ต้องการให้ `cyolo1`
2. ทำซ้ำกับ `cyolo2` ถึง `cyolo5`

`cyoloN login status` ไม่ได้ยืนยันว่า token ใช้งานได้ ให้ทดสอบจริงด้วย:

```bash
docker exec -it multi-account cyolo1 exec --skip-git-repo-check "ตอบว่า OK"
```

## ตรวจ skill หลังล็อกอิน

ดูค่าที่ถูกต้องก่อน (ค่านี้เป็นรหัสตรวจสอบของเครื่องคุณ ไม่ใช่ credential แต่ไม่จำเป็นต้องเผยแพร่):

```bash
docker exec multi-account grep '^SHARED_SKILL_OK' /root/ai-accounts/.Claude/shared/skills/shared-check/SKILL.md
docker exec multi-account grep '^SHARED_SKILL_OK' /root/ai-accounts/.Codex/shared/skills/shared-check/SKILL.md
```

แล้วให้แต่ละบัญชีตอบ:

```bash
docker exec -it multi-account yolo1 -p "run the shared-check skill"
docker exec -it multi-account cyolo1 exec --skip-git-repo-check "run the shared-check skill"
```

ผ่านเมื่อคำตอบตรงกับค่าที่ grep ได้ คือ `SHARED_SKILL_OK-claude-…` หรือ `SHARED_SKILL_OK-codex-…`

## ตรวจ MCP หลังล็อกอิน

**Claude:** ต้องตรวจในโปรแกรม เพราะ `yolo1 mcp list` ไม่แสดง MCP จาก `--mcp-config`

```bash
docker exec -it multi-account yolo1
# ในโปรแกรมพิมพ์ /mcp แล้วต้องเห็น playwright สถานะ connected
```

**Codex:**

```bash
docker exec multi-account cyolo1 mcp list
```

**ทดสอบใช้งานจริงทั้งสองฝั่ง:**

```bash
docker exec -it multi-account yolo1 -p "ใช้ playwright เปิด https://example.com แล้ว screenshot และบอก path ของไฟล์"
docker exec -it multi-account cyolo1 exec --skip-git-repo-check "ใช้ playwright เปิด https://example.com แล้ว screenshot และบอก path ของไฟล์"
```

ถ้าไม่ระบุชื่อไฟล์ ภาพจะอยู่ใน `/tmp/playwright-mcp-output` ซึ่งจะหายเมื่อลบ container

## ตรวจว่า credential แยกกันจริง

ดูเฉพาะว่ามีไฟล์ไหม ไม่เปิดเนื้อหา:

```bash
docker exec multi-account sh -c 'ls -la /root/ai-accounts/.Claude/yolo*/.credentials.json /root/ai-accounts/.Codex/cyolo*/auth.json'
```

## แก้ปัญหา

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| `ไม่พบโฟลเดอร์บัญชี` | รัน `multi-account-install` ซึ่งไม่ทับของเดิม หรือตรวจว่า mount volume แล้ว |
| บัญชีหายหลังสร้าง container ใหม่ | ลืม `-v ...:/root/ai-accounts` ทำให้ได้ anonymous volume ใหม่ |
| `cyoloN` ขึ้น `อ่าน ... mcp.json ไม่ได้` | แก้ `.Codex/shared/mcp/mcp.json` ให้เป็น JSON ที่ถูกต้อง |
| บัญชีใช้คีย์เดียวกันหมด | มี `ANTHROPIC_API_KEY` หรือ `OPENAI_API_KEY` ใน environment ของ container ให้เอาออก |
