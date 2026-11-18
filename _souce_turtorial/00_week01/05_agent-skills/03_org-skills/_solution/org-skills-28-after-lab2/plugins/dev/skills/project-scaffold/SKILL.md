---
name: project-scaffold
description: |
  ขึ้นโปรเจกต์ใหม่แบบระบบสมาชิก + ชำระเงินของโนวาเทค (Next.js 15 + TypeScript + PostgreSQL/Prisma + BullMQ) พร้อม 5 โมดูลมาตรฐาน
  auth / member / payment / notification / audit ที่แก้บั๊ก token หมดอายุกลางจ่ายเงินและ webhook ซ้ำไว้แล้ว ผ่าน coding-rules 10 ข้อ
  ใช้เมื่อผู้ใช้พูดว่า "ขึ้นโปรเจกต์ใหม่ให้หน่อย", "สร้างโครงระบบสมาชิกกับชำระเงิน", "เริ่มโปรเจกต์ตาม spec" หรือ /project-scaffold
  ไม่ใช่สำหรับรีวิวโค้ด (ใช้ coding-standard) หรือวาด architecture ละเอียด (ใช้ arch-template)
metadata:
  owner: dev-mew
  layer: department
  version: 1.0.0
  uses: []
  next: [coding-standard, test-from-plan, deploy-checklist]
  follows: [coding-standard, customer-data-policy]
---

# ขึ้นโปรเจกต์สมาชิก + ชำระเงิน (project-scaffold)

ได้โปรเจกต์ที่รันได้ทันที: 5 โมดูล, Prisma schema + migration แรก, unit test ทุก service, E2E login + checkout,
`/healthz` `/readyz`, `.env.example`, `docs/architecture.md` — แล้วตรวจตาม checklist ก่อนส่งทีม

`SKILL_DIR` = โฟลเดอร์ของ skill นี้ · ความรู้ที่ต้องใช้อยู่ใน `references/` ครบ ไม่ต้องเปิด company-kit

| ไฟล์ | อ่านเมื่อ |
|---|---|
| `references/scaffold-rules.md` | **ทุกครั้ง** — โมดูลมาตรฐาน, บั๊ก token (ShopDee 2025), webhook idempotency (BaanRai 2026), checklist ส่งทีม |
| `references/team-standards.md` | ต้องแก้/เพิ่มโค้ดนอก template — สรุป coding-rules 10 ข้อ + arch-standards ที่เกี่ยว |
| `references/decisions.md` | เจอทางแยกที่ template ไม่ได้ตอบ (OTP, grace window, หลายแท็บ, ราคา) |

## ขั้นตอน

### 1 · อ่าน spec → `scaffold.json`
หา spec จากที่ผู้ใช้ให้ (ไฟล์/ข้อความ/โน้ตใน `notes/`) แล้วเขียน `scaffold.json` ไว้ข้างโปรเจกต์ (เช่น `work/scaffold.json`) — คอมเมนต์ข้างล่างไว้อธิบาย ไฟล์จริงเป็น JSON ล้วน:
```json
{
  "name": "kebab-case ไม่เกิน 3 คำ",           // ใช้เป็นชื่อ repo และ DB nvt_<name ไม่มีขีด>_<env>
  "title": "ชื่อระบบที่แสดงบนเว็บ",
  "client": "ชื่อลูกค้า (องค์กร)",
  "consentVersion": "YYYY-MM-v1",              // เวอร์ชันข้อความยินยอม PDPA
  "packages": [{ "id": "kebab", "description": "...", "amountSatang": 150000 }],  // ราคาเป็นสตางค์ (จำนวนเต็ม)
  "todos": ["สิ่งที่ spec ขอแต่ template ยังไม่มี"]
}
```
- **ห้ามเดา** ชื่อลูกค้า/ราคา: ถ้า spec ไม่มี ให้ถามผู้ใช้ 1 ครั้ง ถ้าผู้ใช้ให้ทำต่อเลย ใส่ค่าสมมติแล้วจดลง `todos` ว่า "ยืนยันกับลูกค้า"
- ข้อมูลส่วนบุคคลใน spec (เบอร์มือถือ เลขบัตร) ห้ามคัดลอกลง scaffold.json / README

### 2 · สร้างโครง
```bash
node $SKILL_DIR/scripts/scaffold.mjs --config work/scaffold.json --out work/<name>
```
ไม่เขียนทับโฟลเดอร์ที่มีไฟล์ (ต้อง `--force` — แทนที่เฉพาะไฟล์จาก template ไม่แตะ `node_modules/` `.env` `prisma/migrations/`)

### 3 · ตรวจ static (ต้องผ่านทุกข้อ)
```bash
node $SKILL_DIR/scripts/check.mjs work/<name>
```
ไม่ผ่าน → แก้ที่ `$SKILL_DIR/templates/` ถ้าเป็นปัญหาของ template (แล้วสร้างใหม่ด้วย `--force`) หรือแก้ในโปรเจกต์ถ้าเป็นของโปรเจกต์นี้

### 4 · ติดตั้ง + test จริง
```bash
cd work/<name> && cp .env.example .env && npm install     # allowScripts ใน package.json อนุญาตแค่ prisma + esbuild
npx tsc --noEmit && npx vitest run --coverage              # service.ts ต้อง ≥ 80% บรรทัด
```
มี Docker → ขึ้น DB/Redis ชั่วคราวแล้วรัน migration + E2E (ใช้พอร์ตไม่ชนกับของที่รันอยู่ ดู `docker ps` ก่อน):
```bash
docker run -d --rm --name <name>-e2e-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=nvt_<db>_dev -p 127.0.0.1:55432:5432 postgres:16-alpine
docker run -d --rm --name <name>-e2e-redis -p 127.0.0.1:56379:6379 redis:7-alpine
# แก้ DATABASE_URL / REDIS_URL ใน .env ให้ตรงพอร์ต แล้ว
npx prisma migrate dev --name init
npx playwright test          # เปิด next dev เองที่ E2E_PORT (ค่าเริ่มต้น 3100) พร้อม ACCESS_TOKEN_TTL_SEC=5
npx next build
```
- E2E `checkout.spec.ts` คือหัวใจ: access หมดระหว่างอยู่หน้า gateway → ต้องเห็น "ชำระเงินสำเร็จ" และไม่เด้งไป login
- E2E ล้ม **ห้ามแก้ test ให้ผ่าน** ดู `test-results/*/error-context.md` + `audit.audit_logs` (`auth.refresh_reused` > 0 = token ถูกใช้ซ้ำ = client มีปัญหา)
- ไม่มี Docker → บอกผู้ใช้ตรง ๆ ว่ายังไม่ได้รัน migration/E2E
- จบแล้ว `docker stop` container ที่สร้างเอง

### 5 · สรุปส่งทีม
เขียน `SCAFFOLD-REPORT.md` ข้างโปรเจกต์: ผล check.mjs, ผล test (จำนวน/coverage/E2E/build), อะไรที่สมมติเอง, TODO จาก spec,
แล้วแนะนำขั้นถัดไป: `coding-standard` (รีวิว 10 ข้อ) → `test-from-plan` → `deploy-checklist`

## ห้าม
- ถอดของที่กันบั๊กเดิม: access 15 นาที, refresh หมุน + reuse detection, refresh ก่อนไป gateway, callback อ่านจาก `order_id`, `payment_events` unique, HMAC, สถานะทางเดียว
- รับราคาจาก client (checkout รับแค่ `packageId`)
- ใส่ความลับจริงลง `.env.example` หรือ commit `.env`
