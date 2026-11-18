# spec/data — ข้อมูลเที่ยวบินที่แอปใช้

คำค้นทุกไฟล์: กรุงเทพมหานคร → โตเกียว · เที่ยวเดียว · อา. 15 พ.ย. 2026 · ผู้ใหญ่ 1 · ชั้นประหยัด · th-TH / THB
เวลาในวงเล็บเป็นเวลาไทย (+07) · `observedAt` ในไฟล์เป็น UTC

## ไฟล์เที่ยวบิน (เปลี่ยนเมื่อ 2026-11-01 ตามข้อตัดสินของผู้ดูแลบท)

| ไฟล์ | คืออะไร | เก็บเมื่อ | ที่มา |
|---|---|---|---|
| `flights-all.json` | **ชุดหลักของแอป** · 300 ใบ (700 ขา) หลังกด "ดูเที่ยวบินเพิ่มเติม" เรียงตามลำดับบนจอ: 3 ใบยอดนิยม (`popular: true`) แล้วไล่ราคา · บินตรง/แวะ 1/2/3 = 18/207/32/43 | 2026-11-01 18:34:48 (`observedAt` 11:34:48Z) | RPC `GetShoppingResults` ของรอบเก็บเฉลย → `rulers/diff/live/rpc-1829-034.txt` |
| `flights-initial.json` | รายการเริ่มต้น 21 ใบ (ก่อนกดดูเพิ่ม) เรียงตามลำดับบนจอ: 3 ยอดนิยม + 18 ใบ (บินตรง 18 · แวะ 1 ครั้ง 3) · schema เดียวกับ `flights-all.json` | 2026-11-01 18:32:00 (11:32:00Z) | response แรกของการค้นหาในรอบเดียวกัน → `rulers/diff/live/rpc-1829-030.txt` |
| `flights-all-1707.json` | **ชุดเดิม เก็บไว้เป็นหลักฐานเท่านั้น ห้ามให้แอปใช้** · 300 ใบ (695 ขา) · บินตรง/แวะ 1/2/3 = 18/209/33/40 · เดิมชื่อ `flights-all.json` | 2026-11-01 17:07:49 (10:07:49.250Z) | HAR entry #58 ของส่วนสำรวจ d (`explore/d-network/extract.mjs`) |

สร้างสองไฟล์แรกด้วย `node rulers/diff/build-spec-data.mjs` (ออฟไลน์ อ่านจาก `rulers/diff/live/` ไม่ต่อ Google)

### ทำไมเปลี่ยน
เฉลยของไม้บรรทัด differential (`rulers/diff/expected.json`) อ่านจากจอ Google สด 18:29–18:57 แต่ชุดเดิมเก็บตอน 17:07 ราคาเปลี่ยนไปแล้ว → จอสดตรงกับชุดเดิมแค่ 278/300 แถว (ตาม itinerary: ราคาเปลี่ยน 14 ใบ · ใบที่หายไปแทนด้วยใบใหม่ 8 ใบ) เช่น บินตรง 23:55 ฿12,660→฿11,660 · JAL 22:05 ฿25,060→฿24,990 และ 21 แถวแรกบนจอไม่ใช่ `flights[0..20]` (ตรงแค่ 6/21) แอปที่ทำถูกทุกอย่างจึงไม่ตรงเฉลยได้ ผู้ดูแลบทตัดสินให้ข้อมูลแอปเป็นชุดเดียวกับเฉลย:
- `flights-all.json` ใหม่ เทียบจอสดสถานการณ์ `more` = **300/300 ลำดับเหมือนกันทุกแถว** (ราคา · สายการบิน · เวลาออก · แวะพัก)
- `flights-initial.json` เทียบสถานการณ์ `initial` = **21/21**
- ตรวจซ้ำได้ด้วย `node rulers/diff/selftest.mjs`

### ช่องข้อมูล
ใช้แผนที่ช่องเดียวกับ `explore/d-network/extract.mjs` ทุกช่อง จึงมีช่องครบเท่าชุดเดิม: `legs[]` (สนามบินรหัส+ชื่อ · เวลา · เลขเที่ยวบิน · `aircraft` · `durationMinutes` · `co2eGramsRaw` · `raw` ซึ่งมีที่วางขา เช่น "74 ซม.") · `layovers[]` (ชื่อสนามบิน/เมือง · `airportChange`) · `co2e` (kg · comparisonPercent · typicalKg) · `specialLabels` (screenText · airportChange · overnightArrival · unmappedRawFlags) · `raw` — ช่อง `co2e.*`, `specialLabels.*`, `legs[].aircraft`, `legs[].co2eGramsRaw` ไม่มีค่า null เลยทั้ง 321 ใบ (ชุดเดิมก็ไม่มี) → **ไม่มีช่องที่ถอดไม่ได้**
ต่างจากชุดเดิม 3 จุด:
- `sourceHarEntry` = `null` (ไม่ได้มาจาก HAR) และเพิ่ม `sourceFile` (ทั้งระดับไฟล์และระดับใบ) ชี้ไฟล์ RPC ต้นทาง
- `observedAt` = เวลาที่ได้รับ response (ชุดเดิมใช้เวลาเริ่ม request ใน HAR)
- `specialLabels.screenText` มาจาก ariaSnapshot ของจอรอบเดียวกัน (`rulers/diff/evidence/more.yml`, `initial.yml`) แทน `explore/d-network/snapshots/03-more.yml` · สคริปต์ตรวจว่าราคาและเวลาออกใน screenText ตรงกับใบนั้นทุกใบ

## ไฟล์อื่น (ยังเป็นรอบ 17:07–17:08 ของส่วนสำรวจ d · ไม่ได้เปลี่ยน)
`filters.json` (ช่วงราคา/สายการบิน/สนามบินต่อเครื่องของ response 17:07:49) · `validation.json` (ราคาห้าใบแรก [7635, 9062, 11580, 9335, 9335] และจำนวนของชุดเดิม) · `booking-options.json`, `rpc-113.json` (หน้าตัวเลือกการจอง 17:08:19) · `rpc-58.json` (payload ดิบของชุดเดิม) · `rpc-index.json` · `journey-log.json` · `*-cards.json` (การ์ดจาก snapshot ของส่วน d; ส่วนใหญ่ว่าง)
ข้อควรระวัง: ไฟล์เหล่านี้ยังอ้างชุด 17:07 · การอ้าง `data/flights-all.json` ใน `spec/EXPLORATION.md` (เช่น id 90/158/167, E1, E5, E7, F-2) หมายถึงชุดเดิม ซึ่งตอนนี้คือ `flights-all-1707.json`
