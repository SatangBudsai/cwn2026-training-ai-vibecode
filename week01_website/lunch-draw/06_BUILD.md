# 🔨 Build — ผลการสร้างเว็บ (ขั้นที่ 6)

ขั้นนี้คือการเปิดหน้าต่าง Claude Code ใหม่ แล้วสั่งงานด้วย `05_BUILD-PROMPT.md` ผลลัพธ์คือโค้ดในโปรเจกต์นี้

> **db/ และ web/ อยู่ที่ไหน** ในรายการขั้นตอนเรียกว่า `db/` กับ `web/` แต่ในโปรเจกต์ Next.js นี้ใช้ชื่อตามมาตรฐานของ Next.js จึงไม่ได้ย้ายไฟล์ (ย้ายแล้วจะ build ไม่ได้)
>
> | ในรายการขั้นตอน | ในโปรเจกต์นี้ |
> |---|---|
> | `db/` | `data/` (ไฟล์ JSON) + `src/lib/store.ts` |
> | `web/` | `src/app/` (หน้าเว็บ + API) + `src/components/` + `src/lib/` |

---

## 1. ประวัติการสร้าง (จาก git)

| เวลา | commit | ได้อะไร |
|---|---|---|
| 2026-11-06 11:43 | `768e80c` | รอบแรก: สูตรโอกาส โหวตแนว สุ่มร้าน ห้อง ข้อมูลร้านจาก OSM |
| 13:02 | `f5644c0` | ช่วงราคา ชื่อเล่นร้าน ปิดร้าน เปลี่ยนมาเก็บเป็นไฟล์ realtime ด้วย SSE ชุด e2e แรก |
| 13:04 | `1821aba` | โลโก้ และไฟล์รายงาน |
| 14:10 | `d5f89f7` | โหวตร้าน คะแนนแมว แผนที่ เพิ่มร้านเอง จัดการประเภทอาหาร GIF ของ e2e |

commit แรกถึง commit สุดท้ายห่างกัน 2 ชม. 27 นาที ใกล้กับเวลาที่ประมาณไว้สำหรับขั้นนี้ (2 ชม. 26 นาที)

## 2. สิ่งที่ได้

| ส่วน | ไฟล์หลัก | Story |
|---|---|---|
| สูตรโอกาส | `src/lib/odds.ts` (+ `odds.test.ts`) | US-01 ถึง US-08 |
| เก็บข้อมูล + realtime | `src/lib/store.ts`, `src/app/api/events/route.ts` | US-11 ถึง US-13 |
| API 13 ไฟล์ route | `src/app/api/**/route.ts` | ทุก story |
| หน้าแรก / ห้อง | `src/components/lunch-app.tsx`, `odds-board.tsx`, `odds-map.tsx`, `category-votes.tsx`, `price-filter.tsx`, `vote-control.tsx`, `rating.tsx` | US-01 ถึง US-13, US-22 |
| แก้ข้อมูล | `add-restaurant-form.tsx`, `location-picker.tsx`, `category-manager.tsx` | US-15 ถึง US-18 |
| ประวัติ | `src/app/history/page.tsx` | US-19 |
| ข้อมูลร้าน | `data/restaurants.json` (237 ร้าน), `scripts/fetch-osm.ts` | FR-22 |
| e2e | `e2e/tests/*.spec.ts` (12 ไฟล์, 79 test case) | ทุก story |

ขนาดโค้ด: ราว 4,200 บรรทัด TypeScript ใน `src/`

## 3. ตรวจตามเงื่อนไข "ส่งงานเมื่อ" ใน 05_BUILD-PROMPT

ตรวจเมื่อ 2026-11-06 14:31

| เงื่อนไข | ผล |
|---|---|
| `npm run typecheck` | ✅ ผ่าน ไม่มี error |
| `npm run lint` | ✅ ผ่าน ไม่มี warning |
| `npm test` (Vitest) | ✅ 24 / 24 ผ่าน (2 ไฟล์: `odds.test.ts`, `geo.test.ts`) |
| `npx tsx 04_test-data/recompute-odds.ts` | ✅ 21 / 21 สถานการณ์ + สุ่ม 500 แบบ ตรงกันทั้งหมด |
| ทำตาม story ด้วยมือ | ➡️ ทำในขั้นสำรวจ `07`–`09` |
| README | ✅ มีวิธีรัน สูตร ไฟล์ข้อมูล ข้อจำกัด Vercel · ⚠️ สูตรขาดตัวคูณคะแนนแมว (Q1) |

## 4. สิ่งที่ต่างจากเอกสาร

| เรื่อง | เอกสาร | ที่สร้างจริง | สถานะ |
|---|---|---|---|
| สูตรใน README | — | ไม่มีตัวคูณคะแนนแมว แต่โค้ดมี | เอกสารต้องแก้ (Q1) |
| `db/` `web/` | ชื่อโฟลเดอร์ในรายการขั้นตอน | `data/` และ `src/` | ตั้งใจ (ตามมาตรฐาน Next.js) |
| ร้านที่ไม่มีระยะเดิน | BR-09 | โค้ดรองรับ แต่ข้อมูลทดสอบไม่มีร้านแบบนี้ | ทดสอบด้วย unit test เท่านั้น |

## 5. วิธีรัน

```bash
npm install
npm run dev            # http://localhost:3000 ใช้ data/ จริง
npm test               # unit test สูตร
npm run e2e:all        # e2e ทั้งหมด + GIF + Excel (ใช้พอร์ต 3200 และ e2e/.data)
```
