# SCAFFOLD-REPORT — sukjai-spa (โปรเจกต์สมาชิก + ชำระเงิน รอบที่ 5 ของปี)

> ขึ้นโครงด้วย skill `project-scaffold` v1.0.0 · 2026-11-03 · input: `work/scaffold.json` · ผลงาน: `work/sukjai-spa/`

## ⚠️ สิ่งที่สมมติเอง (ยังไม่มี spec จริงในโต๊ะ — ไม่มีโฟลเดอร์ `notes/`)

- ลูกค้า "สุขใจสปาแอนด์เวลเนส (12 สาขา)" และชื่อระบบ `sukjai-spa` / "SukJai Spa Member"
- แพ็กเกจ 3 รายการ: สมาชิกรายปี 1,500 ฿ · คอร์สนวดไทย 10 ครั้ง 3,900 ฿ · มัดจำจองคิว 300 ฿
- เวอร์ชันข้อความยินยอม `2026-11-v1`
→ ได้ spec จริงแล้ว แก้ `work/scaffold.json` แล้วรัน `scaffold.mjs --force` ใหม่ได้เลย (ไม่แตะ node_modules / .env / migrations)

## ผลตรวจ

| ตรวจ | ผล |
|---|---|
| `check.mjs` (checklist ส่งทีม + coding-rules ที่ตรวจ static ได้) | ✅ 28/28 |
| `tsc --noEmit` (strict) | ✅ ไม่มี error |
| Vitest unit (5 โมดูล) | ✅ 24/24 · `service.ts` ครอบคลุม 94.7–100% บรรทัด (เกณฑ์ 80%) |
| `prisma migrate dev --name init` (PostgreSQL 16 ใน Docker) | ✅ `prisma/migrations/20261103072403_init/` |
| Playwright E2E (access token 5 วินาที) | ✅ 4/4 — login, รหัสผิด, **token หมดระหว่างอยู่ gateway → "ชำระเงินสำเร็จ" + ไม่เด้ง login**, webhook ลายเซ็นผิด 401 |
| webhook ส่งซ้ำ 3 ครั้ง | ✅ ทุก order ที่จ่ายแล้วมี `payment_events` 1 แถว |
| `auth.refresh_reused` ระหว่างรอบ E2E สุดท้าย | ✅ 0 |
| `next build` (production) | ✅ |
| `/healthz` · `/readyz` | ✅ 200 · Redis ล่ม → `/readyz` 503 ภายใน 2 วินาที |

## บั๊กที่ E2E จับได้ระหว่างทำ (แก้ใน template แล้ว)

1. **client refresh วนไม่หยุดเมื่อ TTL สั้น + refresh ถูกตัดตอน redirect ไป gateway → reuse detection → โดน logout** (บั๊กเดียวกับ ShopDee กลับมาในรูปใหม่ — รอบแรก DB มี refresh 134 ครั้ง, reuse 2 ครั้ง) → ระยะล่วงหน้า = `min(60 วิ, ครึ่งอายุ token)` และหยุด timer ก่อน redirect
2. Next 15 route handler ต้องมี `params` ใน argument ที่สอง (build ล้ม) → แก้ type ใน `src/lib/http.ts`
3. `/readyz` ค้างเมื่อ Redis ล่ม (ioredis retry ไม่สิ้นสุด) → ใส่ timeout 2 วินาที
4. พอร์ต 3000 ในเครื่องมีเว็บ `petshop` เปิดอยู่ → E2E ใช้พอร์ต 3100 และไม่ reuse server
5. ตัวสร้าง `--force` เคยแทน placeholder เข้าไปถึง node_modules → แก้ให้แตะเฉพาะไฟล์จาก template

## TODO ตาม spec (อยู่ใน `work/sukjai-spa/README.md` ด้วย)

- login ด้วย OTP มือถือ + reset password — รอ spec ผู้ให้บริการ SMS
- เรียก refund API ของ ThaiPay GW ใน `payment.refund()`
- เพิ่มแต้ม/เปิดสิทธิ์แพ็กเกจใน worker `payment.paid` (idempotent ด้วย eventId)
- ผูก provider อีเมล/SMS/LINE จริงใน notification worker
- ยืนยันแพ็กเกจ/ราคากับลูกค้า

## ขั้นถัดไป

`coding-standard` (dev-pond รีวิว 10 ข้อ) → `test-from-plan` (qa-mint) → `deploy-checklist` (ops-art)
