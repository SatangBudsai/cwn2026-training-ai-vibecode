# 🧾 Build Prompt — ใบสั่งงานสร้างเว็บ ข้าวไหนดี

ใบสั่งงานนี้ใช้ **เปิดหน้าต่าง Claude Code ใหม่** (ขั้นที่ 6) ให้สร้างเว็บจากเอกสาร 01–04 โดยไม่ต้องมีบทสนทนาเดิม
คัดลอกทั้งกล่องด้านล่างไปวางได้เลย

> ทำไมต้องเปิดหน้าต่างใหม่: ผู้สร้างเว็บควรรู้เฉพาะสิ่งที่เขียนไว้ในเอกสาร ถ้ามีอะไรที่ต้อง "รู้เอง" แปลว่าเอกสารยังขาด ให้กลับไปแก้เอกสาร ไม่ใช่บอกปากเปล่า

---

````markdown
# งาน: สร้างเว็บ "ข้าวไหนดี" — สุ่มร้านข้าวกลางวันรอบออฟฟิศ

## อ่านก่อนเริ่ม (ตามลำดับ)
1. `01_USER-STORIES.md`  — 23 story คือสิ่งที่ผู้ใช้ต้องทำได้
2. `02_REQUIREMENTS.md`  — FR / BR / NFR ตัวเลขใน BR ต้องตรง **เป๊ะ**
3. `03_DESIGN.md` และ `03_design/*.mmd` — สถาปัตยกรรม ERD sequence และรายการ API
4. `04_TEST-DATA.md` — ผลที่ถูกต้องของแต่ละสถานการณ์ และ `04_test-data/recompute-odds.ts`
5. `AGENTS.md` — Next.js เวอร์ชันนี้ต่างจากที่คุณรู้ อ่านคู่มือใน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด

ถ้าเอกสารขัดกันหรือไม่ครบ **หยุดถาม** อย่าเดา

## Stack (ห้ามเปลี่ยน)
- Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4
- หลังบ้านเป็น Route Handlers ใน `src/app/api/**`
- เก็บข้อมูลเป็นไฟล์ JSON ใน `data/` **ไม่ใช้ database** (NFR-07) เขียนแบบ atomic ทีละครั้ง
- Realtime ด้วย Server-Sent Events `GET /api/events` (ไม่ใช้ WebSocket ไม่ polling)
- แผนที่ MapLibre GL + CARTO dark tiles · ไอคอน lucide-react
- ทดสอบ: Vitest (unit) + Playwright (e2e)
- ใช้บริการฟรีที่ไม่ต้องมี API key เท่านั้น (NFR-13)

## โครงสร้าง
```
data/                      ← "db/": restaurants.json · categories.json · ratings.json · state.json
scripts/fetch-osm.ts       ← ดึงร้านจาก OSM ในรัศมี 1 กม. + ระยะเดินจาก OSRM (FR-22)
src/lib/odds.ts            ← สูตรโอกาสทั้งหมด pure function ใช้ทั้ง client และ server
src/lib/store.ts           ← อ่าน/เขียนไฟล์ + EventEmitter สำหรับ SSE
src/lib/geo.ts             ← OFFICE, haversine, parseLatLon, ลิงก์ Google Maps
src/app/**                 ← "web/": หน้าเว็บ 5 หน้า + API ตามตารางใน 03_DESIGN.md §6
e2e/                       ← Playwright: data/ แช่แข็ง, fixtures, tests, report
```

## ลำดับการทำ (ทำทีละขั้น ตรวจก่อนไปต่อ)
1. **สูตร** `src/lib/odds.ts` + `odds.test.ts`
   ทุก BR-01 ถึง BR-14 ต้องมี unit test · รัน `npx tsx 04_test-data/recompute-odds.ts` ต้องผ่าน 21/21 และสุ่ม 500 ครั้งไม่ตรง 0
2. **ข้อมูล** `store.ts` + `scripts/fetch-osm.ts` → ได้ `data/restaurants.json` ~237 ร้าน
3. **API** ทุก endpoint ใน 03_DESIGN.md §6 ตรวจ input ตาม BR-15 ถึง BR-23 และตอบ status ตามตาราง
4. **หน้าแรก** โอกาสของแต่ละร้าน โหวต ตัวกรอง สุ่มร้าน การ์ดผล (US-01 ถึง US-08)
5. **ห้อง + realtime** (US-09 ถึง US-14) ทุกการเปลี่ยนแปลงต้องถึงอีกจอภายใน 3 วินาที
6. **แก้ / เพิ่มร้าน / ประเภทอาหาร / ประวัติ / แผนที่** (US-15 ถึง US-19, US-22)
7. **มือถือ + การเข้าถึง** (US-20, NFR-10, NFR-11)
8. **โหมดทดสอบ** `LUNCH_TEST=1` + `LUNCH_DATA_DIR` + `POST /api/test/reset` (US-21)

## กติกาการเขียนโค้ด
- ข้อความบนจอเป็นภาษาไทยทั้งหมด ตรงตามที่เขียนใน story (เทสต์จะหาข้อความเหล่านั้น)
- ใส่ `data-testid` ให้ส่วนที่เทสต์ต้องอ่าน อย่างน้อย: `pool-count`, `odds-row` (+ `data-number`), `odds-p`
- client ห้ามคิดสูตรเอง ต้อง import จาก `odds.ts` (NFR-05) · การสุ่มทำที่ server เท่านั้น (NFR-04)
- ห้าม `dangerouslySetInnerHTML` กับข้อความที่ผู้ใช้พิมพ์ (NFR-09)
- ทุก API ตรวจชนิดข้อมูลก่อนใช้ ค่าผิดตอบ 400 พร้อม `{ error }` ที่อ่านรู้เรื่อง
- ปิดแอนิเมชันเมื่อผู้ใช้ตั้ง `prefers-reduced-motion`

## ส่งงานเมื่อ
- [ ] `npm run typecheck` · `npm run lint` · `npm test` ผ่านทั้งหมด
- [ ] `npx tsx 04_test-data/recompute-odds.ts` ผ่าน
- [ ] เปิด `npm run dev` แล้วทำตาม Given/When/Then ของ story ทุกข้อด้วยมือได้
- [ ] README บอกวิธีรัน สูตรน้ำหนัก ไฟล์ข้อมูล และข้อจำกัด (ใช้กับ Vercel ไม่ได้)
- [ ] สรุปสิ่งที่ทำไม่ได้หรือต่างจากเอกสาร พร้อมเหตุผล
````

---

## หมายเหตุสำหรับผู้สั่งงาน

| เรื่อง | คำแนะนำ |
|---|---|
| ขนาดงาน | ใหญ่ (ใช้เวลาจริงราว 2 ชม. 30 นาที) ให้สั่งทีละขั้นตาม "ลำดับการทำ" และตรวจผลก่อนไปขั้นถัดไป |
| ตรวจสูตรก่อนทำหน้าเว็บ | ขั้นที่ 1 สำคัญที่สุด ถ้า `recompute-odds.ts` ไม่ผ่าน ห้ามไปต่อ |
| สิ่งที่มักพลาด | เวลา "กินแล้ว" ที่อยู่ในอนาคต (BUG-01) · cache ของ Next.js ทำให้กระดานไม่อัปเดต (BUG-02) · ไปแต่งตัวหมุด MapLibre จนตำแหน่งเพี้ยน (BUG-04) ใส่คำเตือนนี้ในใบสั่งงานรอบหน้าได้ |
| ผลของรอบนี้ | ดู `06_BUILD.md` |
