---
name: test-from-plan
description: |
  ทดสอบเว็บแบบ black-box ตามแผนใน TEST-PLAN.md (อ่าน URL, test cases, เกณฑ์จากแผนเอง) ด้วย Playwright headless และ agent ขนาน
  ได้ test ครบทุกข้อใน e2e/, GIF หลักฐานทุกข้อ, index.html, TEST-REPORT.md และคำตัดสินว่าปล่อยได้ไหม
  ใช้เมื่อผู้ใช้พูดว่า "ทดสอบเว็บตามแผน", "รัน test ตาม TEST-PLAN", "ทำรายงานผลทดสอบ" หรือ /test-from-plan
owner: qa-mint
layer: personal
version: 1.0.0
uses: []
next: [bug-report, deploy-checklist]
follows: [customer-data-policy]
---

# ทดสอบเว็บตามแผน (test-from-plan)

ทำเหมือน tester จริง: เห็นแค่ **แผน** กับ **หน้าเว็บที่รันอยู่** ไม่เห็นโค้ด
ผลสุดท้าย: `e2e/` (test ทุกข้อ) + `e2e/test-report/` (GIF, index.html, TEST-REPORT.md) + คำตัดสินว่าปล่อยได้ไหม

`SKILL_DIR` = โฟลเดอร์ของ skill นี้ (`.claude/skills/test-from-plan`) · สคริปต์ทุกตัว **รันโดย cwd = `e2e/`** เช่น `cd e2e && node ../.claude/skills/test-from-plan/scripts/parse-plan.mjs`

## 🔒 กติกา black-box (ใช้ทั้งกับตัวเองและ **ต้องส่งให้ agent ทุกตัว**)

1. **ห้ามเปิด/อ่าน/list/grep โฟลเดอร์โค้ดเว็บ** (โฟลเดอร์ที่มี Dockerfile/docker-compose.yml ของเว็บ เช่น `petshop/`) และโฟลเดอร์เฉลย (`_solution`, `solution`, `answers`) — ในโฟลเดอร์เว็บสั่งได้แค่ `docker compose ...` ห้าม `ls` ห้าม `cat` (รอบแรกเผลอ `ls petshop` ไป 1 ครั้ง อย่าทำซ้ำ)
2. **ในแผนอ่านได้เฉพาะหัวข้อที่ไม่ใช่เฉลย** ห้ามอ่านหัวข้อชื่อ "เฉลย / สำหรับผู้สอน / BUG_MODE / solution / answer" — ห้ามใช้ Read ทั้งไฟล์และห้าม `cat` แผน ให้รัน `parse-plan.mjs` ก่อน มันบอกว่าหัวข้อไหนอ่านได้ แล้วอ่านด้วย Read แบบ `offset/limit` ให้จบก่อนหัวข้อต้องห้าม (หาบรรทัดด้วย `grep -n "^## " TEST-PLAN.md` ซึ่งเห็นแค่ชื่อหัวข้อ)
3. **ห้ามแก้โค้ดเว็บ** ข้อมูลมาจากแผน (หัวข้อ test cases + ข้อมูลทดสอบ) และหน้าเว็บ/HTTP ที่มองเห็นจากภายนอกเท่านั้น
4. **test ล้ม → ห้ามแก้ test ให้ผ่านเฉย ๆ** ดูหลักฐานก่อน แล้วแยก "เว็บผิด" (ห้ามแก้ จดเป็นบั๊ก) กับ "test ผิด" (แก้ test แล้วรันใหม่)
4.1 **แผนกำกวม → ห้ามเลือกแบบที่ทำให้ test ผ่านแล้วเงียบ** ใช้ความหมายตรงตัวอักษรที่สุดของแผน (ไม่ใช่แบบที่ผ่าน) แล้วจดทุกจุดลง `test-report/interpretations.json` พร้อมผลของการตีความอีกแบบที่ **ลองกับเว็บจริงแล้ว** ไม่ใช่เดา → `build-report.mjs` คัดเองว่าข้อไหนต้องถาม: **ถามเฉพาะข้อที่คำตอบพลิกคำตัดสินได้ หรือเปลี่ยนผลข้อ P1 (ระดับที่ต้องผ่านทั้งหมด)** ข้ออื่นใช้แบบตรงตัวอักษรที่สุด แล้วจดในตาราง "ภาคผนวก: จุดกำกวมที่ตีความเอง" ท้ายรายงาน ไม่ต้องถาม (ดูขั้น 6, decisions ข้อ 18.1)
5. ผลการทดลองอยู่ใน `e2e/` และ **ไม่ขึ้น git** (`.gitignore` ของ e2e กัน `test-report/ test-results/ scratch/ node_modules/`) · ไม่ commit เว้นแต่ผู้ใช้สั่ง
6. ห้ามโหลดเบราว์เซอร์ใหม่ ใช้ Chromium ที่มีใน `ms-playwright` อยู่แล้ว · ไม่ใช้ Chrome ของผู้ใช้ (Playwright MCP) ใช้ headless ทั้งหมด

## ขั้นตอน (บันทึกเวลาเริ่ม `date +%T` ไว้ตั้งแต่ต้น เพื่อสรุปเวลาตอนจบ)

### 1 · อ่านแผน → plan.json
```bash
mkdir -p e2e && cd e2e && node $SKILL_DIR/scripts/parse-plan.mjs --plan ../TEST-PLAN.md
```
ได้ URL, health/reset endpoint, test cases ทุกข้อ (รหัส โมดูล ระดับ ผลที่คาดหวัง), โมดูล → ไฟล์ spec, เกณฑ์ผ่าน และรายชื่อหัวข้อที่ข้าม
- ถ้าไม่พบ URL / ตาราง test → ถามผู้ใช้ อย่าเดา
- อ่านหัวข้อ "ข้อมูลทดสอบ" (บัญชี คูปอง ฯลฯ) ด้วย Read แบบมี offset/limit — agent ต้องใช้
- **คำตอบเดิมของเจ้าของแผน:** `node $SKILL_DIR/scripts/plan-answers.mjs` — หาไฟล์ใน `references/plan-answers/` ที่ scope ตรงกับแผนนี้ (ชื่อแผน + baseURL + จำนวน test) และใช้แต่ละคำตอบเฉพาะเมื่อถ้อยคำในแผน (`planText`) ยังอยู่ในแถวของ test นั้น
  - ตรง → ใช้คำตอบนั้นเป็นการตีความที่ตัดสินแล้ว: ใส่ใน brief ของ agent เป็น "ANSWERED — ห้ามถามซ้ำ" และ comment ใน test เป็น `// ANSWERED ...`
  - ไม่ตรง/หมดอายุ/ไม่มีไฟล์ → ทำตามปกติ (ตีความเข้ม + ลองอีกแบบ + ถามผู้ใช้) **ห้ามยืมคำตอบของแผนเว็บอื่นมาใช้** แม้ถ้อยคำจะคล้ายกัน

### 2 · เปิดเว็บ + entry criteria
- หาไฟล์ compose โดยดูแค่ path: `find .. -maxdepth 2 -name "docker-compose.y*ml" -not -path "*/e2e/*"` (ห้ามเปิดไฟล์)
- `cd <โฟลเดอร์เว็บ> && docker compose up -d --build` → รอจน `docker inspect -f '{{.State.Health.Status}}' <container>` = `healthy` (poll ทุก 2 วินาที สูงสุด ~60 วินาที) → `curl <baseURL><healthPath>` ต้องตอบตามแผน
- ถ้าแผน/ผู้ใช้พูดถึงโหมดพิเศษ (เช่น `BUG_MODE`) ตรวจด้วย `docker compose config | grep -i <ชื่อตัวแปร>` แล้วบันทึกลงรายงาน (`--env`)
- ถ้าเว็บไม่ได้รันด้วย Docker และ URL ตอบอยู่แล้ว ข้ามขั้นนี้ได้ · Docker ไม่ทำงาน → บอกผู้ใช้ให้เปิด Docker Desktop
- ดูหน้าแรกแบบ headless: `node $SKILL_DIR/scripts/explore.mjs "" --testids` (ดูอย่างเดียว ไม่กรอกฟอร์ม)

### 3 · ห้องทดลอง e2e
```bash
node $SKILL_DIR/scripts/scaffold-e2e.mjs      # package.json, playwright.config.ts, global-setup.ts, tests/fixtures.ts, .gitignore, npm i (+ --agent-monitor ถ้าผู้ใช้ขอดูจอ agent)
node $SKILL_DIR/scripts/check-browser.mjs     # exit 1 = Chromium รุ่นที่ต้องการไม่มี / ไม่มี ffmpeg → หยุดถามผู้ใช้ ห้ามโหลดเอง
```

### 4 · ลอง 1 โมดูลเองก่อน (แบบให้ agent ดู)
เลือกโมดูลที่สำคัญ (P1 เยอะ เช่น ตะกร้า/เงิน) สำรวจด้วย `explore.mjs` หรือสคริปต์ headless ใน `e2e/scratch/` แล้วเขียน `tests/<slug>.spec.ts` ตามรูปแบบ:
```ts
import { test, expect, money } from './fixtures';
test.describe('<โมดูล>', () => {
  test('<ID> <สิ่งที่ทดสอบ> <ผลที่คาดหวัง>', { tag: '@P1' }, async ({ page }) => { /* ทำ → ดู → ต้องได้ค่าตามแผน */ });
});
```
รัน `npx playwright test tests/<slug>.spec.ts` → `node $SKILL_DIR/scripts/make-gifs.mjs --only <ids>` → เปิดเฟรมสุดท้ายของ GIF 1 ไฟล์ดูด้วยตา (`ffmpeg -sseof -0.3 -i x.gif -frames:v 1 scratch/last.png` แล้ว Read) ว่าเห็นหลักฐานจริง
ไฟล์นี้คือ "แบบ" ให้ agent ทุกตัว

### 5 · ครบทุกข้อด้วย agent ขนาน (สูงสุด 8 ตัวพร้อมกัน ตัวละ 1 โมดูล)
1. ส่ง agent โมดูลที่เหลือ **8 ตัวแรกใน message เดียว** (Agent tool, `run_in_background: true`, `general-purpose`) ใช้ brief จาก [references/agent-brief.md](references/agent-brief.md) — เติมตาราง test ของโมดูล, ข้อมูลทดสอบ, ไฟล์/โฟลเดอร์ของตัวเอง, ข้อห้ามแชร์ข้อมูล (ดูข้อ 7 ใน decisions)
2. ตัวไหนเสร็จ → ส่งตัวใหม่รับโมดูลที่เหลือทันที จนครบ
3. เมื่อ agent ตอบกลับ: เช็กว่ายืนยันกติกาแล้ว และ `grep -rlE "<โฟลเดอร์เว็บ>|_solution|<ชื่อหัวข้อเฉลย>" tests scratch` ต้องว่าง ถ้า agent ละเมิดกติกา → ลบงานของตัวนั้น ส่งตัวใหม่ทำใหม่ · รวบรวม "การตีความ" ที่ agent รายงานลง `interpretations.json`
4. ตรวจว่าทุก ID ในแผนมี test: `grep -ho "TC-[A-Z]*-[0-9]*" tests/*.spec.ts | sort -u | wc -l` เทียบจำนวนใน plan.json

**จอดู agent (ค่าเริ่มต้น: ข้าม)** — เป็นของสอนใน LAB 5 ทำเฉพาะเมื่อผู้ใช้ขอ เช่น "ขอดูจอ agent", "พิสูจน์ว่าทำพร้อมกันกี่ตัว" ถ้าขอ:
- ก่อนส่ง agent: `node $SKILL_DIR/scripts/scaffold-e2e.mjs --agent-monitor` (สร้าง agent-log.sh) · `rm -f test-report/agents.log test-report/agents.done` แล้วรันเบื้องหลัง `node $SKILL_DIR/scripts/agents-dashboard.mjs` และ `node $SKILL_DIR/scripts/watch-agents.mjs` (ถ่ายจอ agents.html headless ทุก 5 วินาที)
- ใส่ส่วน "FIRST and LAST command" ใน brief (ส่วนเลือกได้ใน agent-brief.md)
- ครบแล้ว `touch test-report/agents.done` → `node $SKILL_DIR/scripts/agents-dashboard.mjs --once` รายงาน "พร้อมกันสูงสุด / ใช้ทั้งหมด" **ตามที่ log วัดได้จริง** (รอบแรกได้ 6 ไม่ถึง 8)

### 6 · รันรวม + แยกเว็บผิด/test ผิด
```bash
npx playwright test                     # reset ข้อมูลครั้งเดียวใน global-setup, 8 workers
cp test-report/results.json test-report/results-round1.json
```
ข้อที่ล้ม: Read ภาพ `test-results/**/test-failed-1.png` + error **ก่อนตัดสิน**
- **test ผิด** (selector/เวลา/เข้าใจผิด) → แก้ test → รันใหม่ทั้งชุด
- **เว็บผิด** → ห้ามแก้ หาหลักฐานยืนยัน เช่น test ข้ออื่นใช้ selector เดียวกันแล้วเจอ (รอบแรก: TC-AUTH-03 ยืนยัน selector ของ TC-AUTH-02) → เขียน `test-report/bugs.json`:
```json
[{ "bug": "BUG-001", "test": "TC-AUTH-02", "severity": "🟡 P2 ปานกลาง (ลูกค้ายังซื้อได้)",
   "symptom": "ส่งฟอร์มเปล่า ช่องยืนยันรหัสผ่านไม่ขึ้น error", "expected": "error ทุกช่อง", "actual": "...",
   "why": "TC-AUTH-03 ใช้ selector เดียวกันแล้วเจอ ภาพตอนล้มไม่มี error จริง", "repro": ["เปิด /register", "กดสมัครโดยไม่กรอก"],
   "evidence": "ภาพตอนล้มใน test-results/" }]
```
ความรุนแรง = ระดับของ test ตามแผน · ถ้าไม่มีบั๊กให้เขียน `[]`
ตารางสรุป: `ลำดับ | รหัส | รอบแรก | รอบหลังแก้`

**จุดที่แผนกำกวม → `test-report/interpretations.json` (ต้องมีทุกรอบ ถ้าไม่มีจริงให้เขียน `[]`)**
ไล่ทุกข้อที่ผลที่คาดหวังอ่านได้มากกว่า 1 แบบ (จาก agent + ของตัวเอง เช่น "อาหารแมว" รวมขนมไหม, "ทันที" กี่วินาที, "error ทุกช่อง") แล้ว **ลองแบบอื่นกับเว็บจริง** (สคริปต์ใน scratch หรือดูจากหน้าเว็บ) ก่อนเขียน `altResult`:
```json
[{ "test": "TC-REC-01", "wording": "อาหารแมวไม่มีไก่",
   "chosen": "อาหารแมว = สินค้าแมวทุกชิ้น รวมขนม (ตามเมนู \"อาหารแมว\" ของเว็บ)", "chosenResult": "passed",
   "alternative": "อาหารแมว = อาหารหลัก (เม็ด/เปียก) เท่านั้น", "altResult": "failed",
   "altEvidence": "ผลลัพธ์มี ขนมแมวเลีย แซลมอน (ประเภทขนม)",
   "question": "\"อาหารแมว\" ในแผนรวมขนมแมวด้วยไหม" }]
```
`altResult` = `passed` / `failed` / `unknown` (ใช้ `unknown` เมื่อลองไม่ได้จริง และบอกเหตุผลใน `altEvidence`)

**มีคำตอบเดิม (ขั้น 1)** → `node $SKILL_DIR/scripts/plan-answers.mjs --write` หลังเขียน interpretations.json: เติมฟิลด์ `answer` ให้ข้อที่ตอบแล้ว (รายงานย้ายไปตาราง "คำตอบจากเจ้าของแผน" และไม่นับเป็นความเสี่ยงต่อคำตัดสิน) และสร้างร่าง `test-report/observations.json` จากคำตอบแบบ "ข้อสังเกตนอกแผน" — **ต้องตรวจกับเว็บรอบนี้จริง** (สคริปต์ใน scratch) แล้วแทน `TODO` ด้วยผลที่เห็น ถ้าเว็บแก้แล้วให้เขียนว่าไม่พบอีก ห้ามคัดผลรอบก่อนมาใส่

**เจ้าของแผนเพิ่งตอบคำถาม** → แก้ test ตามคำตอบ (comment `// ANSWERED (เจ้าของแผน <เว็บ> <วันที่>): ...`) → รันรวมใหม่ (results-round1.json เก็บไว้เทียบ) → เพิ่มคำตอบลง `references/plan-answers/<เว็บ>.json` (ไฟล์ละ 1 แผน · `scope` ระบุชื่อแผน/baseURL/จำนวน test · ทุกคำตอบมี `planText` ที่คัดจากแถวของ test ตรงตัว · `kind` = `interpretation` หรือ `observation` + `check` วิธีตรวจซ้ำ) แล้วรัน `plan-answers.mjs --write`
- คำตอบแบบ "ไม่อยู่ในแผน ไม่ต้องเพิ่ม test ให้จดเป็นข้อสังเกต" → `observations.json` (`id, test, flag, title, detail, evidence`) ไม่นับในผลและคำตัดสิน แต่ขึ้นในรายงานหัวข้อ 5 · เรื่องที่เจ้าของแผนบอกว่าเกี่ยวกับเงินให้ใส่ `flag: "💰 น่าสงสัยเรื่องเงิน"`
- คำตอบที่ทำให้ test ที่เคยล้มกลับมาผ่าน → ลบข้อนั้นออกจาก bugs.json · คำตอบที่ยืนยันว่าเว็บผิด → เพิ่ม "เจ้าของแผนยืนยัน (<วันที่>)" ใน `why`

### 7 · หลักฐาน GIF + index
```bash
node $SKILL_DIR/scripts/make-gifs.mjs     # exit 2 = มีไฟล์ < 5 วินาที → เพิ่ม waitForTimeout/ค้างผลในข้อนั้น รันข้อนั้นใหม่ แล้วทำ GIF ใหม่ (ห้ามยืดวิดีโอด้วย ffmpeg)
node $SKILL_DIR/scripts/build-index.mjs   # test-report/index.html
```
เปิดเฟรมสุดท้าย 2–3 ไฟล์ (ข้อที่ล้ม, E2E ซื้อจนจบ, API) ดูด้วยตา

### 8 · รายงาน + ตัดสิน
```bash
node $SKILL_DIR/scripts/build-report.mjs --env "<เช่น container X healthy, BUG_MODE=0>"
```
ใช้ผลรันล่าสุดเท่านั้น ห้ามรันใหม่หรือแก้ test ระหว่างทำรายงาน · ถ้าสคริปต์เตือนว่ามีข้อที่ล้มแต่ไม่อยู่ใน bugs.json หรือไม่มี interpretations.json → ทำให้ครบก่อน
รายงาน 7 ส่วน: ข้อมูลรอบทดสอบ · สรุปผล (แยก P) · ผลตามโมดูล · ผลรายข้อ + ลิงก์ GIF · ข้อบกพร่อง · **ข้อที่ต้องถามผู้ใช้** (เฉพาะข้อที่พลิกคำตัดสินได้หรือเปลี่ยนผล P1) · การตัดสินเทียบเกณฑ์ทีละข้อ → "ปล่อยได้"/"ยังไม่ปล่อย" + "เด็ดขาด"/"ยังไม่เด็ดขาด" + เหตุผล + ส่วนเผื่อ · ภาคผนวกจุดกำกวมที่ตีความเอง
- **"เด็ดขาด" สคริปต์คิดเอง ห้ามแก้มือ:** ลองกรณีที่เอื้อให้พลิกที่สุด (ตอนนี้ไม่ปล่อย → ทุกข้อที่อีกแบบผ่านได้หรือยังไม่รู้ ถือว่าผ่าน · ตอนนี้ปล่อยได้ → ทุกข้อที่อีกแบบล้มได้หรือยังไม่รู้ ถือว่าล้ม) ถ้ายังได้คำตัดสินเดิม = เด็ดขาด และบอกว่าข้อไหนล้มโดยไม่มีการตีความใดช่วย · ข้อ `unknown` ที่ไม่ใช่ P1 และไม่ทำให้พลิก ไม่ทำให้ "ยังไม่เด็ดขาด" อีกต่อไป · ถ้าผลยังดูผิด ให้แก้สคริปต์ ไม่ใช่แก้ TEST-REPORT.md

### 9 · สรุปให้ผู้ใช้ (ภาษาไทย)
- ผลรันแต่ละช่วง (เปิดเว็บ · ลองโมดูลแรก · agent ใช้กี่ตัว · รันรวม ผ่าน/ล้ม/เวลา · GIF ยาวกี่วินาที · คำตัดสิน)
- ข้อที่ล้ม + เว็บผิด/test ผิด + เหตุผล · ตาราง รอบแรก/รอบหลังแก้
- **ข้อที่ต้องถามผู้ใช้** เฉพาะที่สคริปต์คัดมา (บรรทัด "ข้อที่ต้องถามผู้ใช้: N ข้อ") แต่ละข้อ: คำถาม · ตีความแบบไหน · อีกแบบผลเป็นอย่างไร · ทำไมต้องถาม — ห้ามซ่อนไว้แค่ในรายงาน · ข้อที่ตีความเองบอกแค่จำนวน + ชี้ไปภาคผนวก ไม่ต้องไล่ทีละข้อ · ถ้าใช้คำตอบเดิมจาก `plan-answers/` ให้บอกว่าใช้กี่ข้อ จากไฟล์ไหน และข้อไหนหมดอายุ
- เวลาที่ใช้ทั้งหมดและแต่ละช่วง
- จุดที่ต้องตัดสินใจเองรอบนี้ (ดู decisions) และ **การละเมิดกติกาใด ๆ ที่เกิดขึ้น บอกตรง ๆ**
- path เต็มของ TEST-REPORT.md, index.html (และ agents.html ถ้าผู้ใช้ขอดูจอ agent)

## จุดตัดสินใจและกับดักที่เจอแล้ว
อ่าน [references/decisions.md](references/decisions.md) ก่อนเริ่ม — รวมทุกเรื่องที่บทเรียนไม่ได้บอกแต่ต้องตัดสินใจ (reset ชนกัน, outputDir ชนกัน, สต็อกชน, GIF ยาวพอ, API evidence, มือถือ, Git Bash แปลง path ฯลฯ)
