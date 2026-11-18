# มาตรฐานทีมที่ใช้กับโครงนี้ (สรุป)

> จาก `company-kit/coding-rules.md` v2026.2 (ผู้ดูแล: ปอนด์ `dev-pond`) และ `company-kit/arch-standards.md` v4 (`sa-ton`, `sa-ice`)
> ฉบับเต็มเป็นของเจ้าของไฟล์ — ถ้าขัดกัน ให้ยึดฉบับเต็ม แล้วแจ้งมิวให้อัปเดตไฟล์นี้

## Coding rules 10 ข้อ (ข้อละ 1 คะแนน · ต่ำกว่า 8 ไม่ merge)

Stack: TypeScript, Node.js 22, Next.js 15 (App Router), PostgreSQL 16, Prisma

| # | กติกา | ในโครงนี้ |
|---|---|---|
| 1 | โค้ดธุรกิจใน `src/modules/<m>/` (index, service, repository, schema, errors, `__tests__/`) · ข้ามโมดูลผ่าน `index.ts` เท่านั้น | check.mjs ตรวจ import |
| 2 | ไฟล์ kebab-case · ตัวแปร camelCase · type PascalCase · ค่าคงที่ UPPER_SNAKE · ตาราง/คอลัมน์ snake_case พหูพจน์ · ฟังก์ชันขึ้นต้นด้วยกริยา | `@@map`/`@map` ใน Prisma |
| 3 | `strict: true` · ห้าม `any` (ใช้ `unknown` แล้ว narrow) · ข้อมูลภายนอก (body, API นอก, env) ตรวจด้วย Zod | |
| 4 | error เป็น class extend `AppError` (`code`, `httpStatus`, `message`) · ห้าม `throw new Error` ลอย ๆ · ห้าม catch เงียบ · ส่งผู้ใช้แค่ code + ข้อความแปลแล้ว | |
| 5 | ความลับอ่านจาก env ผ่าน `src/config/env.ts` · `.env` ใน `.gitignore` · มี `.env.example` ครบ · คอมเมนต์ใน .env บรรทัดแยก | |
| 6 | unit test `service.ts` (Vitest) ≥ 80% บรรทัด · flow login/จ่ายเงิน/จอง มี E2E (Playwright) | threshold ใน vitest.config |
| 7 | เปลี่ยน schema ด้วย `prisma migrate dev` + commit migrations · ห้ามแก้ DB มือ/แก้ migration ที่ merge แล้ว · ลบ/เปลี่ยนชื่อคอลัมน์ = expand → contract 2 รอบ | |
| 8 | log JSON ผ่าน pino `src/lib/logger.ts` · ห้าม `console.log` · ทุกบรรทัดมี level, time, module, requestId, msg · redact รหัสผ่าน/token/เลขบัตร/เบอร์เต็ม | |
| 9 | access 15 นาที · refresh หมุนทุกครั้ง · cookie `httpOnly; Secure; SameSite=Lax` · เก็บ hash ใน DB · reuse = revoke ตระกูล · client refresh ก่อนหมด 60 วิ และก่อนไปหน้าชำระเงิน | |
| 10 | ตอบ `{ data }` / `{ error: { code, message } }` · Zod ทุก input · ตรวจ role ก่อนเรียก service · webhook ตรวจลายเซ็น + idempotent | `route()` + `requireUser()` |

## Architecture standards ที่เกี่ยว

- **Modular monolith 1 ตัว** (Next.js + TS) · ฐานข้อมูลเดียว แต่ละโมดูลมี schema ของตัวเอง (`auth.*`, `payment.*`) · ห้ามเรียกตารางโมดูลอื่นตรง ๆ
- แยก service เฉพาะเมื่อ: runtime ต่าง (เช่น Python ML) / โหลดต่าง > 10 เท่า / รอบปล่อยหรือทีมต่าง / ต้องแยกเครือข่าย (mTLS) — เขียน ADR ใน `docs/adr/NNNN-<title>.md`
- **คิว:** BullMQ บน Redis · ทุก job idempotent · retry exponential สูงสุด 5 ครั้ง · ล้มครบ → dead-letter + แจ้งเตือน
- **ข้อมูล:** PostgreSQL หลัก · Redis cache ต้องมี TTL ทุก key · ข้อมูลอ่อนไหว (เลขบัตร เบอร์) เข้ารหัสคอลัมน์หรือเก็บ hash · ลูกค้าธนาคาร deploy region ไทยเท่านั้น
- **Observability:** metric request rate, error rate, p95, queue depth, DB connections · OpenTelemetry · alert: error > 2% 5 นาที, p95 > 2 วิ, คิวค้าง > 1,000, **TLS cert หมดภายใน 21 วัน** · `/healthz` (process) + `/readyz` (DB + Redis + คิว)
- **แผนภาพ:** C4 ระดับ 1–2 ด้วย Mermaid ใน `docs/architecture.md` · สี: ระบบเรา Nova Navy `#0B2545`, ภายนอก Line Gray `#CBD2D9`, คิว/DB Nova Teal `#13A89E` · ทุกเส้นเขียน protocol + sync/async · trust boundary กรอบประ
- **ตั้งชื่อ:** repo `<project>-<part>` kebab · โมดูลคำนามเอกพจน์ · DB `nvt_<project>_<env>` · คิว/event `<domain>.<event>` อดีตกาล · env `dev` `uat` `prod` เท่านั้น

## PDPA
ตาม `customer-data-policy` (core) — เฉพาะ scaffold: README/ข้อมูลทดสอบ/seed ห้ามมีข้อมูลจริง ใช้อีเมล `@example.com` และชื่อสมมติ
