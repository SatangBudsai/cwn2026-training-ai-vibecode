# Brief สำหรับ agent 1 ตัว (1 โมดูล)

คัดลอกข้อความในกรอบ แล้วแทน `{...}` ทุกจุด agent ไม่รู้อะไรเลยนอกจากใน brief นี้ **ห้ามตัดส่วน HARD RULES ออก**
(รอบบทเรียน: agent ที่ได้คำสั่งโดยไม่มีกติกาแอบเปิดโค้ดเว็บทันที)

- `{AID}` = A01, A02, … เรียงตามลำดับที่ส่ง
- `{SLUG}` / `{SPEC}` = จาก `plan.json` → `modules[].slug/spec`
- `{ROWS}` = แถวของโมดูลนี้จาก plan.json (`# | ID | สิ่งที่ทดสอบ | ระดับ | ผลที่คาดหวัง`)
- `{TESTDATA}` = เนื้อหาหัวข้อ "ข้อมูลทดสอบ" ของแผน (คัดมาเอง)
- `{HINTS}` = สิ่งที่รู้แล้วจากหน้าเว็บ (data-testid ที่ใช้บ่อย, ที่เก็บตะกร้า, endpoint ที่เห็นจาก API สาธารณะ) + ข้อห้ามแชร์ข้อมูลกับโมดูลอื่น (เช่น "ห้ามซื้อสินค้า X, Y เพราะ test อื่นตรวจสต็อก") + ข้อเตือนเฉพาะโมดูล (ดู decisions.md: API, มือถือ, สมัครสมาชิก)
- `{STRICT}` = การตีความที่ต้องเข้มตามแผน เช่น "error ทุกช่อง = ทุกช่องมี error ของตัวเอง", "ทำจากแซลมอนทั้งหมด = ตรวจทุกรายการ ไม่ใช่แค่จำนวน"
- `{ANSWERED}` = คำตอบเดิมของเจ้าของแผนที่ `plan-answers.mjs` บอกว่าใช้กับ**แผนนี้**ได้ (เฉพาะ test ของโมดูลนี้) เขียนเป็น `ANSWERED by plan owner — use as-is, do not re-ask: <test>: <answer>` · ไม่มี → ลบทั้งบรรทัด · **ห้ามใส่คำตอบจากแผนเว็บอื่น**
- `{LOG_BLOCK}` = **ค่าเริ่มต้น: ลบทิ้งทั้งบรรทัด** ใส่เฉพาะเมื่อผู้ใช้ขอดูจอ agent (ดู SKILL.md ขั้น 5) โดยใช้ข้อความนี้:
  ```text
  ## FIRST and LAST command (mandatory, proves concurrency)
  - Very first action: `bash {E2E_ABS}/agent-log.sh START {AID} {MODULE}`
  - Very last action before your final reply: `bash {E2E_ABS}/agent-log.sh END {AID} {MODULE}`
  ```

```text
You are agent **{AID}**, module **{MODULE}**. You write Playwright tests (black-box, like a real tester) for the website at {BASE_URL}. Several agents work in parallel, each on one module.

{LOG_BLOCK}

## HARD RULES (breaking any = your work gets deleted)
- NEVER open, list, read, or grep anything under `{WEB_SRC_ABS}` (web source code) or any `_solution` / solution / answers folder.
- In `{PLAN_ABS}` you may read ONLY lines 1–{LAST_ALLOWED_LINE} (allowed sections). NEVER read the section "{FORBIDDEN_SECTION}" (line {FORBIDDEN_LINE} onward). Use the Read tool with offset/limit, never cat the whole file.
- Do not modify the web, do not run docker. Information comes only from the plan's allowed sections and the live website (pages + HTTP as seen from outside — discover endpoints from network traffic or probing, never from source).
- Only create/edit YOUR files: `e2e/{SPEC}` and anything under `e2e/scratch/{AID}/`. Do NOT edit playwright.config.ts, global-setup.ts, tests/fixtures.ts, or other agents' spec files. Do not call the reset endpoint (other agents' tests run concurrently).
- Do not install browsers or packages (Playwright + Chromium are already installed in e2e/node_modules). Do not use any MCP/Chrome browser — headless only.

## Your test cases (from the plan)
{ROWS}

## Test data (from the plan)
{TESTDATA}

## Project setup (already exists in {E2E_ABS})
- Read `e2e/{MODEL_SPEC}` (model written first, passing) and `e2e/tests/fixtures.ts`: import `test, expect, money, showApiEvidence, type Page` from './fixtures'. An auto fixture holds the final screen so each video ≥ 6.5 s — keep using it. Config: slowMo 350 ms, video on, baseURL set, 8 workers.
{HINTS}
- Explore the live site with your own headless scripts in `e2e/scratch/{AID}/` (`import { chromium } from '@playwright/test'`, `page.locator('body').ariaSnapshot()`, list `[data-testid]`). Run from the e2e dir: `cd {E2E_ABS} && node scratch/{AID}/x.mjs`. Git Bash mangles args starting with "/" — avoid them. Prefer the Write tool over heredocs for scripts.

## Writing tests
- One test per plan row. Title starts with the ID: `test('{ID} <what> <expected>', { tag: '@P1' }, async ({ page }) => {...})`, grouped in `test.describe('{MODULE}', ...)`.
- Assert exactly what the plan's expected result says (numbers/text). {STRICT}
- **Ambiguous wording** (an expected result that can be read more than one way, e.g. does "cat food" include cat treats? how fast is "immediately"?): NEVER silently pick the reading that makes the test pass. Use the most literal reading of the plan, put a comment `// INTERPRETATION: ...` above the assertion, and ACTUALLY TRY the other reading against the live site (a scratch script or a temporary assertion — then remove it) so you can say whether the result would change. Report every such point.
{ANSWERED}
- Points listed as ANSWERED above are already decided by the plan owner: implement exactly that reading, comment `// ANSWERED: ...`, do not report them as open questions. If the observations need re-checking, say what you saw this run.
- Tests must be independent (no serial ordering), robust under parallel runs (unique emails/data, don't depend on absolute stock other than the plan's fixed items), relative URLs. Scroll the asserted element into view at the end so the GIF shows the evidence.
- Run ONLY your file, without resetting data and with your own output dir:
  `cd {E2E_ABS} && SKIP_RESET=1 npx playwright test {SPEC} --reporter=list --output=scratch/{AID}/test-results`
- If a test fails: look at the evidence first (error, screenshot/video in scratch/{AID}/test-results; extract frames with ffmpeg and view them). Decide **"test ผิด"** (wrong selector/timing/misunderstanding → fix the test) vs **"เว็บผิด"** (site doesn't meet the plan → keep asserting the plan's expectation, do NOT weaken it, record the bug with evidence). Re-run to confirm.

## Final reply (short)
Table: ID | ผลที่คาดหวัง | ผลจริงบนเว็บ | ผ่าน/ล้ม | (ถ้าล้ม) เว็บผิด/test ผิด + evidence.
Table of interpretations (write "none" only if there truly was no ambiguous wording): ID | wording in plan | reading chosen + result | other reading + result you observed (passed/failed/unknown + evidence) | question to ask the user.
Plus: number of test-bug fixes, and an explicit confirmation that you did not access the web source, solution folders, or the forbidden plan section.
```
