---
name: project-scaffold
description: ขึ้นโปรเจกต์ใหม่ระบบสมาชิก + ชำระเงิน (Next.js 15 + TypeScript + Prisma) ให้รันได้และ test ผ่านตั้งแต่วันแรก — มีโมดูล auth, member, payment, notification, audit ตามโครงมาตรฐานของทีม และใส่ fix บั๊ก token หมดอายุกลางการจ่ายเงิน (ShopDee 2025) กับ webhook idempotency (BaanRai 2026) ไว้แล้ว ใช้เมื่อผู้ใช้พิมพ์ "ขึ้นโปรเจกต์ใหม่ให้หน่อย", "สร้างโครงระบบสมาชิกกับชำระเงิน" หรือ "เริ่มโปรเจกต์ตาม spec" ไม่ใช้กับงานแก้ฟีเจอร์ในโปรเจกต์ที่มีอยู่แล้ว
metadata:
  owner: dev-mew
  layer: personal
  version: 1.0.0
  uses: [req-to-spec]
  next: [test-from-plan]
  follows: [coding-standard]
---

# project-scaffold — ขึ้นโปรเจกต์สมาชิก + ชำระเงิน

ทำเรื่องเดียว: สร้างโครงโปรเจกต์ใหม่ที่ **รันได้ + test ผ่าน + ผ่าน coding rules 10 ข้อ** ยังไม่ทำฟีเจอร์เฉพาะลูกค้า

ความรู้ที่ต้องใช้อยู่ใน `references/` ครบแล้ว อ่านจากที่นี่ ไม่ต้องหา company-kit:

| ไฟล์ | ใช้ตอนไหน |
|---|---|
| `references/scaffold-spec.md` | stack, โมดูล, โครงโฟลเดอร์, env vars, ตาราง DB, endpoint |
| `references/token-expiry-fix.md` | ทำโมดูล auth + หน้า callback การจ่ายเงิน (ห้ามข้าม) |
| `references/webhook-idempotency.md` | ทำ webhook ของ ThaiPay GW + สถานะ order |
| `references/coding-rules.md` | สรุปกติกา 10 ข้อของทีม Dev ใช้ตรวจก่อนส่ง |
| `references/checklist.md` | เช็กก่อนส่งโครงให้ทีม + คำสั่งตรวจ |

## Input

- ชื่อโปรเจกต์ (kebab-case) และโฟลเดอร์ปลายทาง — ถ้าผู้ใช้ไม่บอก ถามก่อน 1 ครั้ง
- spec ของลูกค้า (ถ้ามี เช่นผลจาก `req-to-spec`) — ใช้ปรับชื่อ order/ราคา/ระดับสมาชิก แต่ **ไม่ตัดโมดูลมาตรฐาน**

## ขั้นตอน

1. **เช็กเครื่อง**: `node -v` ต้อง ≥ 22 · ถ้าไม่มี PostgreSQL/Redis ก็ไม่เป็นไร โครงใช้ repository แบบ in-memory ให้รันได้ก่อน
2. **สร้างโครง** ตาม `references/scaffold-spec.md` ทุกไฟล์ (package.json, tsconfig strict, vitest config, prisma schema + migration แรก, `.env.example`, `.gitignore`)
3. **เขียนโมดูล** ทีละตัว: `audit` → `notification` → `auth` → `member` → `payment` แต่ละโมดูลมี `index.ts service.ts repository.ts schema.ts errors.ts __tests__/`
   - repository เป็น interface + ตัว in-memory; service รับ dependency ผ่าน factory (`createXService({ repo, clock, ... })`) เพื่อให้ test ได้โดยไม่มี DB
   - auth ทำตาม `token-expiry-fix.md` ครบ 4 ข้อ · payment ทำตาม `webhook-idempotency.md`
4. **route handlers** ใน `src/app/api/` เรียกโมดูลผ่าน `index.ts` เท่านั้น ตอบ `{ data }` / `{ error: { code, message } }` · มี `/api/healthz`, `/api/readyz`
5. **test**: unit test ของทุก `service.ts` (coverage ≥ 80%) + regression test ของบั๊ก token (access 5 วินาที → จ่ายเงิน → ได้ "ชำระเงินสำเร็จ")
6. **ตรวจ** ตาม `references/checklist.md` — ต้องผ่านจริงทุกคำสั่ง ห้ามรายงานว่าผ่านถ้ายังไม่ได้รัน
7. **รายงาน**: ไฟล์ที่ได้, ผล test/coverage/build, คะแนน coding-rules x/10, และสิ่งที่ยังไม่ได้ทำ (เช่น Prisma repository จริง, Playwright E2E)

## กับดักที่เจอมาแล้ว

- `tests/setup-env.ts` ห้ามเขียน `process.env.NODE_ENV = "test"` ตรง ๆ — พอ `next build` สร้าง `next-env.d.ts` แล้ว `NODE_ENV` จะเป็น readonly → build พัง ใช้ `Object.assign(process.env, {...})` แทน (typecheck ก่อน build จะไม่เห็นบั๊กนี้ ต้องรัน `next build` ด้วยเสมอ)
- `.env` ห้ามทิ้งไว้ในโปรเจกต์ตอนส่ง (copy จาก `.env.example` เพื่อรันทดสอบแล้วลบ)
- เงินเก็บเป็นสตางค์ (integer) ห้ามใช้ทศนิยม
- ใช้ Zod 4: `z.uuid()`, `z.email()` (ไม่ใช่ `z.string().uuid()` แบบเก่า)
