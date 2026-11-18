# SkyThai Plus (v2)

เว็บจองตั๋วเครื่องบินกรุงเทพ → ญี่ปุ่น (ข้อมูลจำลองจาก `data/flights-full.json`, เก็บ ณ 31 ต.ค. 2026)

```bash
docker compose up -d --build     # http://localhost:5082
curl localhost:5082/api/health   # {"ok":true}
```

- Next.js 16 (App Router, TypeScript) + PostgreSQL 16
- ตารางและข้อมูลถูกสร้างอัตโนมัติตอนแอปเริ่ม (`src/instrumentation.ts` → `src/lib/seed.ts`, schema ใน `src/lib/schema.ts`)
- API: `GET /api/health`, `GET /api/flights?from=BKK-CITY&to=JP&date=YYYY-MM-DD`, `POST /api/bookings`
- ข้อมูลจำลองมีเฉพาะวันเดินทาง 15 พ.ย. 2026 — วันอื่นจะแสดงเที่ยวบินชุดเดียวกันโดยเลื่อนวันที่ และมีป้ายบอกทุกหน้า
- ภาพ `public/logo.png`, `public/hero-japan.png` สร้างด้วย cyolo1 (image generation); `icon.png`, `hero-japan.jpg` ย่อจากภาพต้นฉบับ
