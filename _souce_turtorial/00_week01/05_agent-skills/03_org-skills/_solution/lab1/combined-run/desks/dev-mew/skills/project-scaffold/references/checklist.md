# เช็กก่อนส่งโครงให้ทีม

รันในโฟลเดอร์โปรเจกต์ ต้องผ่านจริงทุกข้อ (ข้อไหนทำไม่ได้ ให้รายงานว่าทำไม่ได้พร้อมเหตุผล)

| # | ตรวจ | คำสั่ง / วิธี |
|---|---|---|
| 1 | ติดตั้งได้ | `npm install` |
| 2 | type ผ่าน | `npm run typecheck` |
| 3 | unit + regression test ผ่าน, coverage service ≥ 80% | `npm run test:coverage` |
| 4 | prisma schema ถูก | `DATABASE_URL=postgresql://u:p@localhost:5432/x npx prisma validate` |
| 5 | migration แรกผ่าน (ต้องมี PostgreSQL 16) | `npx prisma migrate dev` — ไม่มี DB ให้ระบุว่ายังไม่ได้รัน |
| 6 | build ผ่าน (จับบั๊กที่ typecheck ไม่เห็น เช่น NODE_ENV readonly) | `cp .env.example .env && npx next build` |
| 7 | `/api/healthz`, `/api/readyz` ตอบ 200 | `npx next start -p 3123` แล้ว curl |
| 8 | smoke flow | register → login (ได้ cookie) → refresh → ใช้ cookie เก่าซ้ำต้องได้ `AUTH_REFRESH_REUSED` → สร้าง order → webhook (เซ็น HMAC) ได้ `paid` → ส่งซ้ำได้ `duplicate: true` → ลายเซ็นผิดได้ 401 → `GET /api/payment/result/<id>` ไม่มี session ได้ "ชำระเงินสำเร็จ" |
| 9 | `.env.example` ครบ 7 ตัวบังคับ และไม่มี `.env` ค้าง | `rm .env` หลังทดสอบ |
| 10 | E2E checkout (Playwright) ผ่าน | ต้องมี DB + browser — ถ้ายังไม่ได้ทำ ให้บอกชัด |
| 11 | coding-rules ครบ 10 ข้อ | ตาม `coding-rules.md` รายงานเป็นคะแนน x/10 |
| 12 | ปิด server ที่เปิดทดสอบ | |
