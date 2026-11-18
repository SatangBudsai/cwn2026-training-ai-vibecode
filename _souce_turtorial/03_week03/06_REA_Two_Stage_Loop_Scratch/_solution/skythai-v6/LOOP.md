# LOOP — SkyThai Zero (v6)

## Loop 1 (ขั้นที่ 1 · loop โครงสร้าง · สร้างจากพิมพ์เขียว)

### BLUEPRINT ย่อ (เต็มที่ `BLUEPRINT.md`)
- docker compose: `db` postgres:16 + `app` Next.js 16 (พอร์ต 5095) · ตอนเริ่ม `scripts/seed.mjs` โหลด `data/*.json` (สร้างจาก `spec/data` ด้วย `scripts/prepare-data.mjs` ไม่แต่งค่า) ลงตาราง `flights` (300) / `initial_order` (21) / `insights` / `booking_options`
- API: `/api/flights` (กรอง+เรียงด้วย SQL) · `/api/facets` · `/api/insights` · `/api/booking` · `/api/places`
- หน้าผลค้นหาเรียงตาม original.yml: banner → search (h1 การค้นหาเที่ยวบิน · ประเภทตั๋ว · ผู้โดยสาร · ชั้น · ต้นทาง/สลับ/ปลายทาง · ขาไป · h2 ตัวกรอง · ตัวกรองทั้งหมด + ชิป 8) → main (h2 ผลการค้นหา · มีผลลัพธ์ N รายการ · tablist ดีที่สุด/ถูกที่สุด · tabpanel: h3 เที่ยวบินยอดนิยม + หมายเหตุราคา + ตัวเรียง + 3 แถว → h3 ข้อมูลเชิงลึกด้านราคา → region ติดตามราคา (2 switch · ตารางวันที่ · กราฟราคา) → h3 เที่ยวบินอื่นๆ + ดูเที่ยวบินเพิ่มเติม) → contentinfo
- ชื่อ ARIA ของแถว (link/สรุป/CO2e/รายละเอียด) สร้างจากช่องข้อมูลใน `src/lib/format.ts` · ตรวจเทียบ screenText ใน spec ได้ตรง 300/300 ทั้ง 4 ชนิดก่อนวัด
- หน้าแรก (ฟอร์ม · ไป-กลับเป็นค่าเริ่มต้น · ป๊อปอัปผู้โดยสารตามกฎ C1–C6 · กล่องต้นทาง/ปลายทาง · ปฏิทิน 2 เดือน) → ผลค้นหา → แถวขยาย (ขา/จุดแวะ/เลือกเที่ยวบิน) → หน้าตัวเลือกการจอง (สรุปแผน · เที่ยวบินที่เลือก · ตัวเลือกการจอง · ย้อนกลับ = เปิด /search ใหม่)

### ผลวัด (`/workspace/arena6/out/s1-loop1/report.json` · วัดเต็มครั้งเดียว · measure exit 1)
| ไม้บรรทัด | ผล |
|---|---|
| 1. โครงสร้าง | **structurePct 92.28** (Jaccard 0.8455 · key 38/38) |
| 2. ภาพ | visualDiffPct 5.2395 (64,415 px · แถบแย่สุด 525–599 = 7.78%) |
| 3. differential | 5/8 (valid **5/7**) |
| 4. เที่ยวบิน | **21 → 300** ✅ |
| 5. acceptance | valid **20/22** (90.91%) · รวม invalid 32/37 |

- **Score** = 92.28 − 5.2395 = **87.04**
- **gate: ไม่ผ่าน** · itemsPassed/itemsTotal = **27/31** · acceptance ผ่าน (20 ≥ 20) · flights ผ่าน · **differential ไม่ผ่าน (5/7)**
- `rulersUnchanged.same` = true

### token (role|ชื่อ) ที่ขาด/เกิน 10 อันดับแรก
- ขาด (missingItems): `navigation|` · `img|` · `text|#` · `text|ตัวกรองทั้งหมด` · `text|จัดเรียงตามเที่ยวบินยอดนิยม` · `button|ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม` · `text|ตารางวันที่` · `text|กราฟราคา` · `text|ภาษา·ไทย` · `text|สถานที่ตั้ง·ไทย` (ที่เหลือ: `paragraph|` · text สกุลเงิน · link ดูข้อมูลเพิ่มเติมเกี่ยวกับสกุลเงิน · text ดูข้อมูลเพิ่มเติม · text ใช้ลูกศรซ้ายหรือขวา…)
- เกิน (extra · มีแค่ 4): `alert|` (ตัวประกาศเส้นทางของ Next.js) · `link|SkyThai` · `paragraph|สกุลเงินที่แสดงอาจแตกต่าง…` (ต้นฉบับเป็น paragraph ที่มี text+link) · `paragraph|SkyThai Zero (v#) · …`

### test ที่ไม่ผ่าน จัดกลุ่มตามสาเหตุ
1. **ลำดับ 3 แถว "ดีที่สุด" หลังกรอง ไม่ตรงการเลือกของต้นฉบับ** (กติกาของแอป: ยอดนิยมที่ผ่านตัวกรอง แล้วคะแนน ราคา+ระยะเวลา+จำนวนแวะ) — diff `nonstop` (ได้ 9,842 แทน 11,660) · `thai-only` (ได้ 14:25 แทน 23:45) · จำนวนแถวถูกทั้งคู่ (18/18, 5/5) → valid 2 ข้อ = เหตุที่ gate ไม่ผ่าน
2. **บั๊กตัวกรองเวลา**: `depart-23-24` (invalid) แอปได้ 0 แถว (คาด 33–35) — ต้องตรวจการเลื่อน slider "เวลาออกเดินทางที่เร็วที่สุด" ทีละขั้น + debounce
3. **acceptance หมดเวลารอ locator (4.5 วินาที)**: B45 (ตัวกรองสนามบินสำหรับต่อเครื่อง) · B47 (ตัวกรองทั้งหมด) · B40 (invalid · ตัวกรองสายการบิน) — กล่องหรือชื่อองค์ประกอบในกล่องยังไม่ตรงที่ข้อสอบรอ
4. **invalid ที่ไม่นับ**: B27 (strictly equal) · C25 (ห้าใบแรก [7635,9062,11580,9335,9842] ตามเฉลยสด ≠ fixture เดิม — ตรงกับเหตุผล invalid)

### scope-check
`loop/scope-check.sh stage1 pixel-freeze` → **ผ่าน** (ไฟล์ที่เปลี่ยน 41 · ไม่แตะ tokens.css · ไม่มี px/สีตรง ๆ) · รอบแรกเจอ `calc(... - 2px)` 1 จุด แก้เป็น `- 1px - 1px` ก่อนวัด

### การตัดสินเก็บ/ทิ้ง (CONTRACT)
scope-check ผ่าน · measure ไม่ใช่ exit 2 · gate ยังไม่ผ่าน แต่เป็นตัวแรกที่เก็บ (itemsPassed 27 > ไม่มีค่าก่อนหน้า) → **เก็บ** · tag `s1-loop1`

เวลาที่ใช้: ~19 นาที

## Loop 2 (ขั้นที่ 1 · loop สุดท้าย · structure compiler + ล็อกโครงสร้าง)

### วินิจฉัยจาก `out/s1-loop1/report.json`
- gate ไม่ผ่านเพราะ **differential 5/7**: `nonstop` · `thai-only` — 3 แถว "ดีที่สุด" หลังกรองเลือกผิด (นับแถวถูก) · รูปแบบในเหตุผล: ต้นฉบับเลือกเที่ยวบินข้ามคืน (ถึงเช้าวันถัดไป) ก่อนเที่ยวกลางวันที่ราคา/ระยะเวลาใกล้กัน
- acceptance 20/22 (ผ่านแบบเฉียด): B45 · B47 หมดเวลารอ locator → ชื่อในกล่องไม่ตรง EXPLORATION.md (switch "สนามบินทั้งหมดสำหรับต่อเครื่อง" · slider ขั้นต่ำ/สูงสุด · "ไทเป (TPE) เท่านั้น" · หมวด/radio "ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง")
- token ขาด 15 / เกิน 4 (ดู Loop 1)

### ตารางทุกกลุ่ม (วัดกลุ่มละ 1 ครั้ง · `out/s1-loop2-<กลุ่ม>/report.json` · `rulersUnchanged.same` = true ทุกครั้ง)
| กลุ่ม | เปลี่ยนอะไร | acceptance | differential | เที่ยวบิน | โครงสร้าง% | visual diff% | Score | เก็บ/ย้อนกลับ |
|---|---|---|---|---|---|---|---|---|
| (Loop 1) | — | 20/22 | 5/7 | 21 → 300 | 92.28 | 5.2395 | 87.04 | ฐาน (27/31) |
| a · ให้ gate ผ่าน | ดีที่สุดหลังกรอง = ยอดนิยม → ข้ามคืน → ราคา · B45: slider "ระยะเวลาแวะพักขั้นต่ำ/สูงสุด" (กรองจริงด้วย `layoverMin`) + switch "สนามบินทั้งหมดสำหรับต่อเครื่อง" + ปุ่ม "<เมือง> (<รหัส>) เท่านั้น" · B47: หมวด + radio แสดง/ซ่อนตั๋วแยก (ซ่อน = ตัดใบที่ต้องเปลี่ยนสนามบินเอง `airportChange` 25 ใบ) · slider เวลาไม่ให้ไขว้กัน (เร็วสุด ≤ 23 · ช้าสุด ≥ 1) | **22/22** | 6/7 (nonstop · thai-only ผ่าน · **price-max-10000 พังใหม่**) | ✅ | 92.28 | 5.2395 | 87.04 | **เก็บ** (gate ไม่ผ่าน แต่ itemsPassed 27→30 · โครงสร้างไม่ลด) |
| b · ชื่อให้ตรงต้นฉบับ | `button` "ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม" ครอบ `link` ชื่อเดียวกัน · ย่อหน้าสกุลเงิน = text + link "ดูข้อมูลเพิ่มเติมเกี่ยวกับสกุลเงิน" (ไปหน้า `/help/currency` ของแอป) · **+ แก้ต่อจากกลุ่ม a** (ข้อ gate มาก่อน): คะแนนดีที่สุด = ราคา + 25×นาที + 2000×แวะ − 5000 ถ้าข้ามคืน (ยอดนิยมก่อนเสมอ) — แทนกฎ "ข้ามคืนก่อนเสมอ" ที่ดึงใบแวะ 16 ชม. ขึ้นมาใน price-max-10000 | **22/22** | **7/7** | ✅ | **94.67** | 5.2395 | **89.43** | **เก็บ** · **gate ผ่าน 31/31** (measure exit 0) |
| c · เพิ่มที่ขาด/ลบที่เกิน | ไอคอน svg เป็น `img` (ไม่ซ่อน) · `navigation` สำรวจ/เที่ยวบิน ใน banner · ไอคอนปุ่มภาษา/สถานที่ตั้ง · ลบย่อหน้าเครดิต "SkyThai Zero (v6) · …" | 22/22 | 7/7 | ✅ | 94.36 | 5.2618 | 89.10 | **ย้อนกลับ** (`git revert` · gate ผ่านอยู่แล้วแต่ structurePct 94.36 < 94.67) |

ข้อ c: ของที่ขาดหายเกือบหมด (เหลือ 1) แต่ไอคอนทำให้ชิปตัวกรอง/combobox/ปุ่มดูเที่ยวบินเพิ่มเติมมีลูก `text|…` เพิ่ม 11 รายการที่ต้นฉบับไม่มี (ต้นฉบับใส่ img เฉพาะบางปุ่ม) + `text|SkyThai` → Jaccard ลด · ต้องใส่ไอคอนแบบเลือกปุ่ม แต่ห้ามวัดซ้ำ/ห้ามเริ่ม loop 3 จึงหยุดที่ b

### ตัวที่ล็อก = commit กลุ่ม b (ย้อน c แล้ว · tag `s1-loop2` + `structure-lock`)
- gate **ผ่าน**: acceptance 22/22 (100%) · differential 7/7 valid · เที่ยวบิน 21 → 300 · itemsPassed/itemsTotal = **31/31**
- structurePct **94.67** · visualDiffPct 5.2395 · Score **89.43** · report ของตัวที่ล็อกคัดไว้ที่ `out/structure-lock.json` (CONTRACT เขียน `runs/` แต่ชุดนี้ใช้ `out/` ตามคำสั่งวัด)

### สิ่งที่ยังไม่ผ่าน และทำไม
- **โครงสร้าง ≠ 100%** — ขาด: `navigation|` · `img|` · `text|#` · `text|ตัวกรองทั้งหมด` · `text|จัดเรียงตามเที่ยวบินยอดนิยม` · `text|ตารางวันที่` · `text|กราฟราคา` · `text|ภาษา·ไทย` · `text|สถานที่ตั้ง·ไทย` (ทั้งหมดมาจากไอคอนที่ aria-hidden · ทางแก้ลองแล้วในกลุ่ม c แต่ได้ส่วนเกินมากกว่า) · `text|ใช้ลูกศรซ้ายหรือขวาเพื่อสลับคำแนะนำสถานที่ใกล้เคียง` (คำแนะนำสำหรับโปรแกรมอ่านหน้าจอของต้นฉบับ — ไม่เพิ่ม เพราะจะเป็นข้อความที่มีไว้ให้เครื่องอ่านเท่านั้น) · เกิน: `alert|` (ตัวประกาศเส้นทางของ Next.js เอาออกไม่ได้โดยไม่ปิดการนำทางของเฟรมเวิร์ก) · `link|SkyThai` (ต้นฉบับเป็นลิงก์ "Google" — ไม่ใช้ชื่อแบรนด์ของ Google) · `paragraph|SkyThai Zero (v#) …` (เครดิตของแอป)
- **differential `depart-23-24` (invalid · ไม่นับ)**: แอปได้ 35 ใบ เฉลย 33 — ข้อมูลของแอปมีเที่ยวออก 23:00–23:59 จริง 35 ใบ ไม่แต่งข้อมูลให้ตรง (Loop 1 ได้ 0 ใบ · slider ไม่ไขว้แล้วกรองได้)
- **acceptance invalid (ไม่นับ)**: B27 · B40 (กลุ่มพันธมิตรสายการบินไม่มีในข้อมูล) · C25 (เฉลยสดเปลี่ยน)

### ล็อกโครงสร้าง (`/workspace/arena6/loop/`)
- `aria-lock.mjs <BASE_URL> [--write]` — เปิดหน้าผลค้นหาด้วย `open` + `standardRoute` ของ `rulers/lib.mjs` แบบเดียวกับ `kit/capture.mjs` (1366×900 · scroll บนสุด · fonts.ready + 1 วิ) → `ariaSnapshot()` ของ body + SHA-256 · ไม่ใส่ `--write` = เทียบ lock (exit 1 ถ้าไม่ตรง · พิมพ์บรรทัดแรกที่ต่าง) · ตัดข้อความใน `- alert` ก่อน hash เพราะตัวประกาศของ Next.js ใส่ชื่อหน้าไม่คงที่ (เทียบซ้ำ 3 ครั้ง ตรงทุกครั้ง)
- `structure.lock` — **sha256 `381e1e239c4fd0bb0351b63ed61c5906dd07b00207cb5819429dd4e201294cd1`** + snapshot
- `size-baseline.json` — กว้าง×สูงของ 298 element ที่มีข้อความหรือกดได้
- `visual-baseline.json` — แถวเที่ยวบินแรก (x 175 · y 623 · 1016×92) · สีตัวแปรข้อความ · ค่าในช่องกรอก · หมายเหตุ: tokens.css ไม่มี `--c-text*` จึงเก็บ `--color-text*` (3 ตัวที่มีจริง)

### scope-check
`loop/scope-check.sh stage1 pixel-freeze` → ผ่านทุกกลุ่ม (ไม่แตะ tokens.css · ไม่มี px/สีตรง ๆ)

## ขั้นที่ 2 (loop พิกเซล · แก้เฉพาะค่าใน `src/styles/tokens.css`)

สภาพแวดล้อม: คัด `app/` (รวม git) → `app-s2/` · branch `stage2` จาก tag `structure-lock` (b439f69) · รันด้วย docker compose project `skythai-s2` + override พอร์ต `loop/pixel/compose.s2.yml` → **http://localhost:5096** (แอปขั้นที่ 1 ที่ 5095 ยังเปิดอยู่)

### ยืนยันก่อนเริ่ม
- `kit/measure.sh http://localhost:5096 out/s2-start` → exit 0 · gate 31/31 · structurePct **94.67** · visualDiffPct 5.2395 · Score 89.43 = ตรงกับ `out/structure-lock.json` ทุกค่า
- `loop/aria-lock.mjs http://localhost:5096` → ตรง · sha256 `381e1e23…294cd1`
- ตัววัดเร็ว (`loop/pixel/lib.mjs`) ค่าตอนเริ่ม = **64415 พิกเซล** = `out/s2-start/visual/result.json` (64415) ตรงทุกพิกเซล
- แอปตอนเริ่มผ่านตัวกันทุกข้อ → **ไม่มีรอบ P0**

### เครื่องมือ (`/workspace/arena6/loop/pixel/`)
- `lib.mjs` — ตัววัดเร็ว (เปิดหน้าครั้งเดียวด้วย `rulers/lib.mjs` open+standardRoute · 1366×900 · fonts.ready + 1 วิ · แทน token ด้วย `documentElement.style.setProperty` → screenshot → pixelmatch 0.1 / includeAA false กับ `reference.png`) · ตัวกัน 3 กลุ่ม (structure / legibility / exploit) · แบ่ง diff แดงเป็นแถบ 75 px + กลุ่มพิกเซลติดกัน (กริด 6 px + union-find) → `elementsFromPoint` → กฎ CSS ที่ match → `var()` ที่ใช้ (ไล่ var ซ้อนใน :root)
- `check.mjs` — ค่าตอนเริ่ม/ชุดค่าใด ๆ: พิกเซล · ตัวกันทุกข้อ · บริเวณแดงเรียงตามพิกเซล
- `search.mjs` — coordinate descent (x ± step · ไม่ดีขึ้นทั้งสองทาง → step/2 · สี = ขยับ lightness ใน HSL · ค่าไม่ต่อเนื่อง = ลองทุกตัวเลือก) · ทุกชุดที่ทำให้ diff ลดต้องผ่านตัวกันทุกข้อก่อนเก็บ ไม่ผ่านทิ้งทันที
- `spec-p1*.json` / `spec-p2.json` (ตัวแปรที่ค้น) · `p1.json` `p1b.json` `p2.json` (ผล + สถิติ + ตัวอย่างที่ถูกทิ้ง)

### ตารางทุกรอบ (`out/s2-<รอบ>/report.json` · `rulersUnchanged.same` = true ทุกครั้ง · scope-check stage2 ผ่านทุก commit)
| รอบ | เปลี่ยนอะไร | ลองกี่ชุด | ตัวกันทิ้ง (structure / legibility / exploit) | gate | โครงสร้าง% | visual diff% | Score | เก็บ/ย้อนกลับ |
|---|---|---|---|---|---|---|---|---|
| ตอนล็อก (s2-start) | — | — | — | 31/31 | 94.67 | 5.2395 | 89.43 | ฐาน |
| P0 | ไม่ต้องทำ (ตอนเริ่มผ่านตัวกันทุกข้อ) | — | — | — | — | — | — | — |
| **P1** · ตัวแปรรวม | `--font-family` Garuda→Loma · `--font-size-xs/md/lg/xl` 12/17/17/17 · `--font-weight-medium` 400 · `--space-3/6/8` 11/27/48 · `--color-primary` #1a6ddf (2 pass: 134 + 111 ชุด) | 245 | 7 (0 / 7 / 0) | 31/31 ✅ | 94.67 | **5.0726** | **89.60** | **เก็บ** · tag `p1` |
| **P2** · ตัวแปรรายส่วน (เรียงตามบริเวณแดงหลัง P1: ผลค้นหา 13564 → ฟอร์ม 8137 → ตัวกรอง 5587 → หัวเว็บ → หมายเหตุ/ตัวเรียง) | แถว: `--row-padding-x` 38 · `--col-logo/times/co2-width` 65/235/168 · `--row-time-size` 13 · `--row-sub-size` 12 · `--list-heading-margin` · ฟอร์ม: `--form-field-border` 1px solid divider · `--form-shadow` เงาบาง · `--form-field-padding-x` 23 · `--chips-margin-top` 21 · `--header-padding-x` 21 · `--list-note-size` / `--sort-font-size` 12 | 247 | 0 (0 / 0 / 0) | 31/31 ✅ | 94.67 | **4.7749** | **89.90** | **เก็บ** · tag `p2` |

รวม: ลอง 492 ชุด · ตัวกันทิ้ง 7 ชุด (structure 0 · legibility 7 · exploit 0) · ค่าที่ตัวกันทิ้งทั้งหมดถูกจับด้วยกฎ "element ≥ 75% ของ size-baseline" · ชุดที่ diff ไม่ลดไม่ต้องตรวจตัวกัน (ไม่ถูกเก็บอยู่แล้ว)

### ค่าที่ตัวกันทิ้ง (5 ตัวอย่าง)
| ชุดค่า | diff ลดลงแต่ทิ้งเพราะ |
|---|---|
| `--font-family: "Liberation Sans", "Loma"` | legibility: `span "เริ่มต้น ฿7,635"` สูง 16 px < 75% ของ 23 px (ฟอนต์ละตินเตี้ยลง ข้อความเล็กลงเกินไป) |
| `--font-family: "FreeSans", "Loma"` | legibility: `span "เริ่มต้น ฿7,635"` 87×14 < 75% ของ 94×23 |
| `--font-family: "Sawasdee", "Loma"` | legibility: ปุ่ม CO2e สูง 40 < 75% ของ 60 px และลิงก์ SkyThai กว้าง 86 < 75% ของ 119 px |
| `--space-6: 24px → 20px` (และ 27 → 19) | legibility: ปุ่ม "ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ…" สูง 40 < 75% ของ 60 px (คอลัมน์แคบลงจน ≈ ย่อหน้าเหลือ 2 บรรทัด) |
| `--font-size-xl: 16px → 14px` | legibility: ลิงก์ "SkyThai" 83×24 < 75% ของ 119×24 (ย่อโลโก้ให้เล็กลงเพื่อลด diff) |

### diff ของ tokens.css (`git diff structure-lock p2`)
```diff
@@ -7,16 +7,16 @@
  */
 :root {
   /* ---------- ฟอนต์ ---------- */
-  --font-family: "Waree", "Loma", "Garuda", sans-serif;
+  --font-family: "Garuda", "Loma", sans-serif;
   --font-family-numeric: "Waree", "Loma", sans-serif;
-  --font-size-xs: 14px;
+  --font-size-xs: 12px;
   --font-size-sm: 14px;
-  --font-size-md: 16px;
-  --font-size-lg: 18px;
-  --font-size-xl: 22px;
+  --font-size-md: 17px;
+  --font-size-lg: 17px;
+  --font-size-xl: 17px;
   --font-size-2xl: 28px;
   --font-weight-regular: 400;
-  --font-weight-medium: 500;
+  --font-weight-medium: 400;
   --font-weight-bold: 700;
   --line-height-tight: 20px;
   --line-height-normal: 24px;
@@ -26,11 +26,11 @@
   /* ---------- สเกลระยะห่าง ---------- */
   --space-1: 4px;
   --space-2: 8px;
-  --space-3: 12px;
+  --space-3: 11px;
   --space-4: 16px;
   --space-5: 20px;
-  --space-6: 24px;
-  --space-8: 32px;
+  --space-6: 27px;
+  --space-8: 48px;
   --space-10: 40px;
   --space-12: 48px;
 
@@ -51,7 +51,7 @@
   --color-border: #dadce0;
   --color-border-strong: #80868b;
   --color-divider: #e8eaed;
-  --color-primary: #1967d2;         /* บนพื้นขาว 5.37:1 · บน --color-bg-selected 4.68:1 */
+  --color-primary: #1a6ddf;         /* บนพื้นขาว 5.37:1 · บน --color-bg-selected 4.68:1 */
   --color-primary-hover: #185abc;
   --color-price-good: #137333;      /* บนพื้นขาว 5.95:1 */
   --color-warning: #b06000;         /* บนพื้นขาว 4.65:1 */
@@ -68,7 +68,7 @@
   --header-height: 64px;
   --header-bg: var(--color-bg);
   --header-border: var(--color-border);
-  --header-padding-x: var(--space-4);
+  --header-padding-x: 21px;
   --header-logo-height: 24px;
   --header-nav-gap: var(--space-2);
   --header-nav-font-size: var(--font-size-sm);
@@ -79,7 +79,7 @@
   --form-margin-top: var(--space-6);
   --form-bg: var(--color-bg);
   --form-radius: var(--radius-md);
-  --form-shadow: var(--shadow-raised);
+  --form-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
   --form-padding: var(--space-2) var(--space-4) var(--space-12);
   --form-options-height: 40px;
   --form-options-gap: var(--space-1);
@@ -87,9 +87,9 @@
   --form-field-height: 56px;
   --form-field-gap: var(--space-2);
   --form-field-radius: var(--radius-sm);
-  --form-field-border: var(--color-border-strong);
+  --form-field-border: 1px solid var(--color-divider);
   --form-field-font-size: var(--font-size-md);
-  --form-field-padding-x: var(--space-4);
+  --form-field-padding-x: 23px;
   --form-swap-size: 32px;
   --form-search-height: 40px;
   --form-search-padding-x: var(--space-6);
@@ -99,7 +99,7 @@
   --form-search-offset: -20px;
 
   /* ---------- ชิปตัวกรอง ---------- */
-  --chips-margin-top: var(--space-6);
+  --chips-margin-top: 21px;
   --chips-gap: var(--space-2);
   --chip-height: 32px;
   --chip-padding-x: var(--space-3);
@@ -135,39 +135,39 @@
   --tab-indicator-height: 3px;
   --tab-indicator-radius: 3px 3px 0 0;
   --tab-price-size: var(--font-size-sm);
-  --sort-font-size: var(--font-size-sm);
+  --sort-font-size: 12px;
   --sort-gap: var(--space-1);
 
   /* ---------- หัวข้อรายการ ---------- */
   --list-heading-size: var(--font-size-lg);
   --list-heading-weight: var(--font-weight-medium);
-  --list-heading-margin: var(--space-6) 0 var(--space-1);
-  --list-note-size: var(--font-size-sm);
+  --list-heading-margin: var(--space-2) 0 0;
+  --list-note-size: 12px;
   --list-note-color: var(--color-text-secondary);
 
   /* ---------- แถวเที่ยวบิน ---------- */
   --list-radius: var(--radius-md);
   --list-border: var(--color-border);
   --row-min-height: 92px;
-  --row-padding-x: var(--space-6);
+  --row-padding-x: 38px;
   --row-padding-y: var(--space-4);
   --row-gap: var(--space-4);
   --row-divider: var(--color-divider);
   --row-hover-shadow: var(--shadow-raised);
   --row-logo-size: 35px;
-  --row-time-size: var(--font-size-md);
+  --row-time-size: 13px;
   --row-time-weight: var(--font-weight-medium);
-  --row-sub-size: var(--font-size-sm);
+  --row-sub-size: 12px;
   --row-sub-color: var(--color-text-secondary);
   --row-expand-size: 40px;
   --row-expanded-bg: var(--color-bg);
 
   /* ---------- คอลัมน์ในแถว ---------- */
-  --col-logo-width: 56px;
-  --col-times-width: 248px;
+  --col-logo-width: 65px;
+  --col-times-width: 235px;
   --col-duration-width: 160px;
   --col-stops-width: 140px;
-  --col-co2-width: 160px;
+  --col-co2-width: 168px;
   --col-price-width: 128px;
 
   /* ---------- ราคา ---------- */
```

### ผลตรวจตัวกันทุกข้อของแอปสุดท้าย (p2 · build จริงบน 5096 · `loop/pixel/check.mjs`)
| ตัวกัน | ผล |
|---|---|
| a. ล็อกโครงสร้าง (`aria-lock.mjs`) | ✅ ตรง sha256 `381e1e239c4fd0bb0351b63ed61c5906dd07b00207cb5819429dd4e201294cd1` |
| b. ตัวอักษร ≥ 12 px | ✅ (ตรวจ 217 ข้อความ รวม ::before/::after · เล็กสุด 12 px) |
| b. contrast ≥ 4.5:1 (รวม ::before/::after) | ✅ 0 รายการต่ำกว่า |
| b. opacity ข้อความ = 1 | ✅ |
| b. element ≥ 75% ของ size-baseline (298 ตัว) | ✅ ไม่มีตัวเล็กกว่า · ไม่มีตัวหาย |
| b. ไม่ตัดบรรทัดกลางคำ (Intl.Segmenter 'th') | ✅ |
| c. แถวแรกในจอแรก / ห่าง baseline ≤ 150 px | ✅ x 178 · y 602 · ขอบล่าง 694 (ห่าง baseline 623 ≈ 21 px) |
| c. `--color-text*` saturation ≤ 20% · ข้อความหลัก ≥ 7:1 | ✅ #202124 / #5f6368 / #fff (ไม่ได้แก้) · `--color-text` 16.1:1 |
| c. ช่องกรอก scrollWidth ≤ clientWidth (5 ช่อง) | ✅ |
| kit/measure.sh | ✅ exit 0 · gate 31/31 · structurePct 94.67 · visualDiffPct 4.7749 · Score 89.90 |

หมายเหตุ: ฟอนต์ที่ใช้ = Garuda/Loma จาก fonts-thai-tlwg (GPL-2+ with font exception) ที่มีในเครื่อง · ไม่คัดลอกฟอนต์/แบรนด์ของ Google · ไม่ฝังภาพต้นฉบับ · สี `--color-primary` และเงาฟอร์มเป็นค่าจาก coordinate descent ไม่ใช่สีแบรนด์ที่คัดมา
งบ: 2/2 รอบ (P1 · P2) — ยังไม่ tag `pixel-lock` เพราะสั่งให้ tag p1/p2 · ตัวที่เก็บล่าสุด = `p2`
