# CONTRACT — สัญญาของ loop 2 ขั้น

เครื่องมือกลาง (ห้ามแก้ระหว่าง loop): `rulers/` (ไม้บรรทัด · ใช้อย่างเดียว) · `kit/measure.sh` (ชุดวัด) · `loop/scope-check.sh` (ขอบเขต) · `spec/`
คำสั่งวัด: `kit/measure.sh <BASE_URL> runs/<ขั้น>-<รอบ>` → `report.json` · exit 0 = gate ผ่าน · 1 = ไม่ผ่าน · 2 = วัดไม่ได้

| ขั้น | สถานะเริ่ม | แก้อะไรได้ | วัดอะไร | เก็บเมื่อไร | หยุดเมื่อไร | งบ |
|---|---|---|---|---|---|---|
| **1 · loop โครงสร้าง** | tag `pixel-freeze` (app/ มีแค่ `src/styles/tokens.css`) | ทุกอย่างใน `app/` **ยกเว้น** `src/styles/tokens.css` · ใน `.css/.tsx/.ts` ห้ามมีเลข px หรือสี (#hex rgb() hsl()) ตรง ๆ ต้องใช้ `var(--…)` หรือ `calc()` ของตัวแปร (ยกเว้น 0 และ 1px) · ตรวจด้วย `loop/scope-check.sh stage1 pixel-freeze` | `report.json`: **gate** (acceptance ≥ 90% ของข้อ valid · differential ตรงทุกข้อ valid · flights 21 → 300) → `gate.itemsPassed/itemsTotal` · **structurePct** · ใช้ `issues` เลือกงานรอบถัดไป | scope-check ผ่าน **และ** measure ไม่ใช่ exit 2 **และ** อย่างใดอย่างหนึ่ง: (ก) gate ผ่าน (ถ้าตัวที่เก็บไว้ก่อนหน้าก็ผ่าน gate แล้ว ต้องได้ structurePct ≥ เดิม) · (ข) gate ยังไม่ผ่าน แต่ `itemsPassed` มากขึ้นและ structurePct ไม่ลด · ไม่เข้าเงื่อนไข → `git reset --hard` กลับ commit ที่เก็บล่าสุด | ครบงบ หรือ gate ผ่านและ structurePct = 100 → tag **`structure-lock`** ที่ commit ที่เก็บล่าสุด + เก็บ `report.json` ของตัวนั้นเป็น `runs/structure-lock.json` | **≤ 2 loop** (1 loop = แก้ → scope-check → measure → ตัดสินเก็บ/ทิ้ง) |
| **2 · loop พิกเซล** | tag `structure-lock` · ค่าอ้างอิง = `runs/structure-lock.json` (gate ตอนล็อก) | **ค่า**ใน `src/styles/tokens.css` เท่านั้น · ห้ามเพิ่ม/ลบชื่อตัวแปร · ตรวจด้วย `loop/scope-check.sh stage2 structure-lock` | `report.json`: **visualDiffPct** (ต่ำ = ดี) · ใช้ `issues.visual.worstBands` + `visual/diff.png` เลือกตัวแปร · gate ตรวจเทียบตอนล็อก | scope-check ผ่าน **และ** visualDiffPct ต่ำกว่าตัวที่เก็บล่าสุด **และ** gate ไม่ต่ำกว่าตอนล็อก (`itemsPassed` ≥ ตอนล็อก และทุกส่วนของ gate ที่ผ่านตอนล็อกยังผ่าน) · ไม่เข้าเงื่อนไข → reset กลับ | ครบงบ หรือ visualDiffPct = 0 → tag `pixel-lock` ที่ commit ที่เก็บล่าสุด | **≤ 2 รอบ** |

## กติกาเพิ่ม
- **ขั้นที่ 1 ครบงบแล้ว gate ยังไม่ผ่าน:** ล็อก `structure-lock` ที่ตัวที่เก็บล่าสุดแล้วไปขั้นที่ 2 ได้ โดยรายงานตามจริง (gate ส่วนไหนไม่ผ่าน · `itemsPassed/itemsTotal` · test/สถานการณ์ที่ไม่ผ่านจาก `issues`) · ขั้นที่ 2 ใช้ค่าตอนล็อกนั้นเป็นเส้นห้ามต่ำกว่า
- **วัดไม่ได้ (exit 2)** ไม่นับเป็นการเก็บ · ถ้าเกิดจากแอปไม่ขึ้น ถือว่ารอบนั้นทิ้ง (นับงบ) · ถ้าเกิดจากเครื่องมือ ให้แก้สภาพแวดล้อมแล้ววัดซ้ำ (ไม่นับงบ)
- ทุกรอบเก็บ `runs/<ขั้น>-<รอบ>/report.json` ไว้ทั้งที่เก็บและที่ทิ้ง · `report.json → rulersUnchanged.same` ต้องเป็น `true`
- Score = structurePct − visualDiffPct (ใช้รายงาน ไม่ใช้ตัดสินเก็บ/ทิ้ง)
- ข้อ invalid ของ acceptance และ differential รันและรายงานใน `report.json` แต่ไม่นับใน gate และไม่ใช้ตัดสินเก็บ/ทิ้ง
