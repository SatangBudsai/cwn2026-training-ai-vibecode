# SkyThai Pro (v3)

เว็บจองตั๋วเครื่องบินกรุงเทพ → ญี่ปุ่น ข้อมูลจำลองจาก `data/flights-all.json` ซึ่งเป็นเที่ยวบิน 300 ใบที่ถอดจากเครือข่ายเมื่อ 1 พ.ย. 2026 เวลา 00:03 น. (EXPLORATION ส่วน F) ราคาเป็นราคา ณ วันที่เก็บ ไม่ใช่ราคาปัจจุบัน

```bash
docker compose up -d --build     # http://localhost:5083 (compose project: skythai-pro)
curl localhost:5083/api/health   # {"ok":true}
```

- Next.js 16 (App Router, TypeScript) + PostgreSQL 16 ต่อยอดจาก SkyThai Plus (v2)
- ตารางและข้อมูลสร้างอัตโนมัติตอนแอปเริ่ม (`src/instrumentation.ts` → `src/lib/seed.ts`, schema อยู่ใน `src/lib/schema.ts`) ไฟล์ `data/flights-full.json` ของ v2 ใช้เฉพาะชุดประวัติราคาและลิงก์สัมภาระ/ความช่วยเหลือ
- ตารางใหม่ใน v3: `search_steps` (คำขอแต่ละครั้ง: ผลแรก/ดูเพิ่มเติม/บินตรง พร้อมช่วงราคาปกติและราคาอ้างอิง), `flight_appearances` (เที่ยวบินอยู่ในคำขอไหน กลุ่มและอันดับอะไร), `snapshot_airlines`, `booking_options`, `booking_insights`
- API: `GET /api/health`, `GET /api/flights?from=BKK-CITY&to=TYO&date=YYYY-MM-DD`, `POST /api/bookings` (รับ `seller` เพิ่มได้)
- ข้อมูลจำลองมีเฉพาะวันเดินทาง 15 พ.ย. 2026 ถ้าค้นวันอื่นจะแสดงเที่ยวบินชุดเดียวกันโดยเลื่อนวันที่ และทุกหน้ามีป้ายบอก
- ปุ่ม "ดำเนินการต่อ" ของผู้ขายพาไปกรอกข้อมูลจองจำลองในเว็บนี้ ไม่ส่งต่อไปผู้ขายจริงและไม่มีการชำระเงิน
- ภาพ `public/logo.png` และ `public/hero-japan.png` สร้างด้วย cyolo1 (image generation) ส่วน `icon.png` และ `hero-japan.jpg` ย่อจากภาพต้นฉบับ ไม่มีโลโก้หรือแบรนด์ของ Google
- ผลวนแก้กับ acceptance test อยู่ใน [LOOP.md](LOOP.md) และหลักฐานอยู่ใน `loop/r1`, `loop/r2`
