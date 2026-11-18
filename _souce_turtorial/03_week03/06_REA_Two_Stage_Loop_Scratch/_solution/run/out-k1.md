Waiting on the stub run (flights ruler is in progress; it uses Playwright's 30 s default timeouts against an empty page).

Still waiting on the flights ruler. The monitor is armed and I'll be notified when the next ruler finishes.

Flights finished in 135 s (exit 1, which is expected for a stub page). Acceptance is running now.

Acceptance finished in 169 s. The diff ruler is running.

The monitor is re-armed and waiting for the diff ruler and the final exit code.

The diff ruler is on its last scenario, at roughly 72 s per scenario. I'll be notified when it finishes.

ทุกอย่างพร้อมแล้ว ตรวจแล้วผ่านครบ: 5095 ได้ exit 2 · original.yml เทียบตัวเอง 100% · reference.png เทียบตัวเอง 0% · tag pixel-freeze อยู่ที่ `3c520dc` · scope-check จับได้ทั้งกรณีผ่านและไม่ผ่าน ไม่ได้แก้ไฟล์ใน `rulers/` และไม่ได้ต่อ Google

| สิ่งที่เตรียม | อยู่ที่ไหน | ตรวจแล้วได้อะไร |
|---|---|---|
| ชุดวัดกลาง | `kit/measure.sh` · `kit/capture.mjs` (เก็บภาพ app.png + โครงสร้าง app.yml ด้วยวิธีเดียวกับที่เก็บเฉลย) · `kit/report.mjs` | เรียกไม้บรรทัดตามลำดับ visual → structure → flights → accept → diff แล้วเขียน `report.json` มี scores, Score, gate, issues, timings · gate: acceptance ≥ 20/22 ข้อ valid · differential ตรงครบ 7 สถานการณ์ valid · flights 21 → 300 · ข้อ invalid ยังรัน (acceptance 25 ข้อ · depart-23-24) แต่ไม่นับใน gate |
| (ก) พอร์ตที่ยังไม่มีแอป | `kit/measure.sh http://localhost:5095/ …` | **exit 2** ใน 60 ms · report.json ระบุ `"เปิด BASE_URL ไม่ได้"` · ถ้าใส่ URL ที่เป็น google ก็ได้ exit 2 เหมือนกัน |
| (ข) ไม้บรรทัดเทียบตัวเอง | `kit/selftest.sh` | โครงสร้าง original.yml เทียบตัวเอง = **100%** (Jaccard 1 · ชิ้นสำคัญ 38/38 · 28 ms) · visual reference.png เทียบตัวเอง = **0%** (0 px · 73 ms) |
| รันครบทั้งเส้น กับหน้าเปล่า (stub ที่พอร์ต 5096) | `/tmp/m5096/report.json` | **exit 1** · gate 0/31 · issues มีครบ: test ที่ไม่ผ่านพร้อมเหตุผล · 8 สถานการณ์ differential · ชิ้นสำคัญที่ขาด 38 ชิ้น · ภาพ diff สีแดง แถบที่แย่สุด 0–74 px = 6.31% · โฟลเดอร์ rulers/ มี checksum ก่อนและหลังวัดตรงกัน |
| เวลาที่ใช้แต่ละไม้บรรทัด (วัดกับหน้าเปล่า) | `timings.tsv` และใน report.json | เก็บภาพหน้าแอป 63.9 s · visual 0.1 s · structure 0.02 s · flights 135.4 s · accept 169.1 s · diff 1081.3 s · **รวม 1450 s (~24 นาที)** · ส่วนใหญ่เป็นการรอ timeout เพราะหน้าเปล่าไม่มีฟอร์ม กับแอปจริงน่าจะเร็วกว่านี้ |
| เรื่องไฟล์ last-run.json | ในตัว `measure.sh` | `diff/run.mjs` เขียน `last-run.json` ทับไว้ข้างตัวเองใน rulers/ เลยให้รันจากสำเนาชั่วคราวในโฟลเดอร์ผลแทน แล้วคัดผลออกมา ไฟล์ใน `rulers/` จึงไม่ถูกแก้ |
| แช่แข็งพิกเซล | `app/` (git) · `app/src/styles/tokens.css` · ตัวตรวจ `kit/check-tokens.mjs` | ตัวแปร **174 ตัว** · ตัวอักษรเล็กสุด 14px (มีตัวแปรขนาดตัวอักษร 24 ตัว) · คู่สีข้อความ/พื้น 17 คู่ทั้งหมด ≥ 4.5:1 (ต่ำสุด 4.65) · ตั้งค่าแบบตาบอด ไม่ได้เปิดดูภาพ · commit `3c520dc` + tag **pixel-freeze** |
| ตรวจขอบเขตการแก้ | `loop/scope-check.sh` | ทดสอบใน branch ชั่วคราว `tmp-scope` แล้วลบทิ้ง:<br>① stage1 ใช้ var()/calc() ของตัวแปร, `1px solid`, `outline:0`, `href="#main"` → **ผ่าน**<br>② stage1 แตะ tokens.css + 15px + #1a73e8 + `calc(…+4px)` + rgba() + hsl() + '12px' → **ไม่ผ่าน 6 ข้อ**<br>③ stage2 แก้แค่ค่า → **ผ่าน**<br>④ stage2 เพิ่ม 2 ตัวแปร + ลบ 1 ตัว + แตะไฟล์อื่น → **ไม่ผ่าน 4 ข้อ**<br>⑤ พิมพ์ stage ผิด หรือหา commit ฐานไม่เจอ → exit 2<br>ใช้ `APP_DIR=…` กำหนด repo ได้ (ทดสอบแล้ว) |
| สัญญาของ loop | `loop/CONTRACT.md` | ตาราง 2 ขั้นครบ 7 คอลัมน์ · ขั้น 1: ≤ 2 loop จบด้วย tag structure-lock · ขั้น 2: ≤ 2 รอบ gate ห้ามต่ำกว่าตอนล็อก · มีกติกาว่าถ้าขั้น 1 ครบงบแต่ gate ยังไม่ผ่าน ให้ล็อกแล้วไปขั้น 2 ได้โดยรายงานตามจริง · รอบที่วัดได้ exit 2 ไม่นับเป็นการเก็บ |

ฟอนต์: Waree (สัญญาอนุญาตแบบ Bitstream Vera) สำรองด้วย Loma และ Garuda (GPL-2+ with font exception) จากชุด fonts-thai-tlwg ที่มีในเครื่อง

## `app/src/styles/tokens.css`

```css
/* tokens.css — แช่แข็งพิกเซล (tag pixel-freeze)
 * ทุกค่าที่คุมหน้าตาอยู่ที่นี่ · ไฟล์ .css/.tsx/.ts อื่นต้องอ้าง var(--…) หรือ calc() ของตัวแปร (ยกเว้น 0 และ 1px)
 * ขั้นที่ 1 (loop โครงสร้าง) ห้ามแตะไฟล์นี้ · ขั้นที่ 2 (loop พิกเซล) แก้ได้เฉพาะค่า ห้ามเพิ่ม/ลบชื่อตัวแปร
 * ตั้งค่าแบบตาบอด: ไม่ได้เปิดดู rulers/visual/reference.png หรือ spec/shots
 * ฟอนต์: Waree (Bitstream Vera license) → Loma (GPL-2+ with font exception) → Garuda (GPL-2+ with font exception) จาก fonts-thai-tlwg
 * ตัวอักษรทุกขนาด ≥ 14px · คู่สีข้อความ/พื้นทุกคู่ contrast ≥ 4.5:1
 */
:root {
  /* ---------- ฟอนต์ ---------- */
  --font-family: "Waree", "Loma", "Garuda", sans-serif;
  --font-family-numeric: "Waree", "Loma", sans-serif;
  --font-size-xs: 14px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 22px;
  --font-size-2xl: 28px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --line-height-tight: 20px;
  --line-height-normal: 24px;
  --line-height-loose: 28px;
  --line-height-title: 36px;

  /* ---------- สเกลระยะห่าง ---------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ---------- มุมโค้ง ---------- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* ---------- สี ---------- */
  --color-text: #202124;            /* บนพื้นขาว 16.1:1 */
  --color-text-secondary: #5f6368;  /* บนพื้นขาว 6.05:1 */
  --color-text-on-primary: #ffffff; /* บน --color-primary 5.37:1 */
  --color-bg: #ffffff;
  --color-bg-subtle: #f1f3f4;
  --color-bg-selected: #e8f0fe;
  --color-border: #dadce0;
  --color-border-strong: #80868b;
  --color-divider: #e8eaed;
  --color-primary: #1967d2;         /* บนพื้นขาว 5.37:1 · บน --color-bg-selected 4.68:1 */
  --color-primary-hover: #185abc;
  --color-price-good: #137333;      /* บนพื้นขาว 5.95:1 */
  --color-warning: #b06000;         /* บนพื้นขาว 4.65:1 */
  --color-focus-ring: #1967d2;
  --shadow-raised: 0 1px 3px rgba(60, 64, 67, 0.3), 0 4px 8px rgba(60, 64, 67, 0.15);
  --shadow-menu: 0 2px 6px rgba(60, 64, 67, 0.3), 0 8px 16px rgba(60, 64, 67, 0.15);

  /* ---------- หน้า ---------- */
  --page-max-width: 1064px;
  --page-gutter: var(--space-6);
  --page-bg: var(--color-bg);

  /* ---------- หัวเว็บ ---------- */
  --header-height: 64px;
  --header-bg: var(--color-bg);
  --header-border: var(--color-border);
  --header-padding-x: var(--space-4);
  --header-logo-height: 24px;
  --header-nav-gap: var(--space-2);
  --header-nav-font-size: var(--font-size-sm);
  --header-nav-height: 40px;
  --header-nav-radius: var(--radius-pill);

  /* ---------- ฟอร์มค้นหา ---------- */
  --form-margin-top: var(--space-6);
  --form-bg: var(--color-bg);
  --form-radius: var(--radius-md);
  --form-shadow: var(--shadow-raised);
  --form-padding: var(--space-2) var(--space-4) var(--space-12);
  --form-options-height: 40px;
  --form-options-gap: var(--space-1);
  --form-select-font-size: var(--font-size-sm);
  --form-field-height: 56px;
  --form-field-gap: var(--space-2);
  --form-field-radius: var(--radius-sm);
  --form-field-border: var(--color-border-strong);
  --form-field-font-size: var(--font-size-md);
  --form-field-padding-x: var(--space-4);
  --form-swap-size: 32px;
  --form-search-height: 40px;
  --form-search-padding-x: var(--space-6);
  --form-search-radius: var(--radius-pill);
  --form-search-bg: var(--color-primary);
  --form-search-color: var(--color-text-on-primary);
  --form-search-offset: -20px;

  /* ---------- ชิปตัวกรอง ---------- */
  --chips-margin-top: var(--space-6);
  --chips-gap: var(--space-2);
  --chip-height: 32px;
  --chip-padding-x: var(--space-3);
  --chip-radius: var(--radius-md);
  --chip-border: var(--color-border-strong);
  --chip-font-size: var(--font-size-sm);
  --chip-font-weight: var(--font-weight-medium);
  --chip-color: var(--color-text-secondary);
  --chip-selected-bg: var(--color-bg-selected);
  --chip-selected-color: var(--color-primary);
  --chip-selected-border: var(--color-bg-selected);
  --chip-icon-size: 18px;

  /* ---------- กล่องตัวกรอง (popover / dialog) ---------- */
  --popover-width: 360px;
  --popover-padding: var(--space-4);
  --popover-radius: var(--radius-md);
  --popover-shadow: var(--shadow-menu);
  --popover-title-size: var(--font-size-md);
  --slider-track-height: 4px;
  --slider-thumb-size: 20px;
  --slider-track-color: var(--color-border);
  --slider-fill-color: var(--color-primary);

  /* ---------- แท็บ + ตัวเรียง ---------- */
  --tabs-margin-top: var(--space-4);
  --tabs-height: 64px;
  --tab-padding-x: var(--space-6);
  --tab-font-size: var(--font-size-md);
  --tab-font-weight: var(--font-weight-medium);
  --tab-color: var(--color-text-secondary);
  --tab-active-color: var(--color-primary);
  --tab-indicator-height: 3px;
  --tab-indicator-radius: 3px 3px 0 0;
  --tab-price-size: var(--font-size-sm);
  --sort-font-size: var(--font-size-sm);
  --sort-gap: var(--space-1);

  /* ---------- หัวข้อรายการ ---------- */
  --list-heading-size: var(--font-size-lg);
  --list-heading-weight: var(--font-weight-medium);
  --list-heading-margin: var(--space-6) 0 var(--space-1);
  --list-note-size: var(--font-size-sm);
  --list-note-color: var(--color-text-secondary);

  /* ---------- แถวเที่ยวบิน ---------- */
  --list-radius: var(--radius-md);
  --list-border: var(--color-border);
  --row-min-height: 92px;
  --row-padding-x: var(--space-6);
  --row-padding-y: var(--space-4);
  --row-gap: var(--space-4);
  --row-divider: var(--color-divider);
  --row-hover-shadow: var(--shadow-raised);
  --row-logo-size: 35px;
  --row-time-size: var(--font-size-md);
  --row-time-weight: var(--font-weight-medium);
  --row-sub-size: var(--font-size-sm);
  --row-sub-color: var(--color-text-secondary);
  --row-expand-size: 40px;
  --row-expanded-bg: var(--color-bg);

  /* ---------- คอลัมน์ในแถว ---------- */
  --col-logo-width: 56px;
  --col-times-width: 248px;
  --col-duration-width: 160px;
  --col-stops-width: 140px;
  --col-co2-width: 160px;
  --col-price-width: 128px;

  /* ---------- ราคา ---------- */
  --price-size: var(--font-size-md);
  --price-weight: var(--font-weight-medium);
  --price-color: var(--color-text);
  --price-good-color: var(--color-price-good);
  --price-note-size: var(--font-size-sm);
  --price-note-color: var(--color-text-secondary);

  /* ---------- รายละเอียดเที่ยวบิน ---------- */
  --details-padding: var(--space-4) var(--space-6);
  --details-leg-gap: var(--space-3);
  --details-dot-size: 12px;
  --details-line-color: var(--color-border);
  --details-layover-bg: var(--color-bg);
  --details-layover-border: var(--color-divider);
  --details-text-size: var(--font-size-sm);
  --details-select-height: 36px;
  --details-select-radius: var(--radius-pill);

  /* ---------- ข้อมูลเชิงลึกด้านราคา / ติดตามราคา ---------- */
  --insights-margin-top: var(--space-4);
  --insights-padding: var(--space-4) var(--space-6);
  --insights-radius: var(--radius-md);
  --insights-border: var(--color-border);
  --insights-title-size: var(--font-size-md);
  --track-toggle-width: 36px;
  --track-toggle-height: 20px;
  --tool-button-height: 36px;
  --tool-button-radius: var(--radius-pill);
  --tool-button-border: var(--color-border);
  --tool-button-color: var(--color-primary);

  /* ---------- ดูเที่ยวบินเพิ่มเติม ---------- */
  --more-height: 56px;
  --more-color: var(--color-primary);
  --more-font-size: var(--font-size-sm);
  --more-font-weight: var(--font-weight-medium);

  /* ---------- ท้ายหน้า ---------- */
  --footer-margin-top: var(--space-12);
  --footer-padding: var(--space-6) var(--page-gutter);
  --footer-border: var(--color-border);
  --footer-font-size: var(--font-size-sm);
  --footer-color: var(--color-text-secondary);

  /* ---------- โฟกัส ---------- */
  --focus-ring: 0 0 0 2px var(--color-focus-ring);
}
```

ข้อควรรู้ก่อนเริ่ม loop:
- **ลำดับการตัดสินใน CONTRACT ที่ผมตีความเอง:** ขั้น 1 ถ้าตัวที่เก็บไว้ผ่าน gate แล้ว ตัวใหม่ต้องผ่าน gate และโครงสร้าง% ไม่ลดจึงจะเก็บ · ขั้น 2 คำว่า "gate ไม่ต่ำกว่าตอนล็อก" ผมนิยามว่า จำนวนข้อที่ผ่าน (`itemsPassed`) ต้องไม่น้อยกว่าตอนล็อก และส่วนของ gate ที่ผ่านตอนล็อกต้องยังผ่าน
- **กรณีที่นับเป็น exit 1 ไม่ใช่ 2:** ถ้าเปิด BASE_URL ได้แต่ไม้บรรทัดล้มเพราะแอปพัง ผมนับเป็น "วัดได้แต่ไม่ผ่าน" (exit 1) และบันทึกไว้ที่ `issues.rulerErrors` · exit 2 ใช้เฉพาะตอนเปิด URL ไม่ได้, URL เป็น Google หรือเก็บภาพหน้าแอปไม่ได้
- **scope-check อาจเตือนเกินจริง:** มันตรวจเฉพาะบรรทัดที่เพิ่มใน diff ดังนั้น px ที่อยู่ในคอมเมนต์ หรือ `#abc` ที่เป็น id/anchor ซึ่งบังเอิญเป็นเลขฐานสิบหก ก็จะถูกนับว่าละเมิด
