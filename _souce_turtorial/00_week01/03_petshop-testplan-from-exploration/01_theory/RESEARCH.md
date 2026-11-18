# 📚 งานค้นคว้าประกอบบท: Playwright + AI agent สำรวจเว็บ → แผนทดสอบ → ทดสอบจริง

งานค้นคว้าจากเอกสาร (desk research) ทำเมื่อ 3 พ.ย. 2569 ใช้เป็นหลักฐานรองรับหน้า [ทฤษฎี](README.md) ในโฟลเดอร์เดียวกัน

> **วิธีอ่าน:** ตัวเลขในวงเล็บ เช่น [[9]](https://playwright.dev/docs/getting-started-cli) คือแหล่งอ้างอิง กดแล้วไปที่ต้นฉบับได้เลย ส่วนรายการเต็มอยู่ที่ [หัวข้อ 10](#10-แหล่งอ้างอิง)
> ป้าย **[ยังไม่ยืนยัน]** แปลว่าหาแหล่งต้นทางยืนยันไม่ได้ ป้าย **[แหล่งรอง]** แปลว่ามีแค่บล็อกหรือแคตตาล็อกเป็นแหล่งข้อมูล
> เวอร์ชันที่เช็กวันนั้น: `@playwright/mcp` **0.0.84**, `@playwright/cli` **0.1.23** ทั้งคู่ใช้ `playwright` **1.65.0-alpha-2026-10-30** [[1]](https://registry.npmjs.org/@playwright/mcp/latest) [[2]](https://registry.npmjs.org/@playwright/cli/latest)

---

## 1. สรุป 10 ข้อที่ใช้ออกแบบบทนี้

| # | ข้อสรุป | แหล่ง |
|---|---|---|
| 1 | **อย่าให้ subagent (agent ลูกที่ agent หลักสั่งงาน) หลายตัวที่ทำงานพร้อมกันใช้ Playwright MCP ตัวเดียวกัน** ถ้าอ้าง server ด้วยชื่อ จะใช้การเชื่อมต่อของตัวหลัก จึงได้ browser เดียวและแท็บชุดเดียวกัน แม้เขียน config แบบ inline ที่เหมือนกันทุกตัวอักษร ก็ถูกรวมเป็น process เดียว ทางแก้คือให้ explorer แต่ละตัวมี browser ของตัวเอง | [[19]](https://code.claude.com/docs/en/sub-agents) [[20]](https://github.com/anthropics/claude-code/issues/84638) [[4]](https://github.com/microsoft/playwright-mcp/issues/893) |
| 2 | **`playwright-cli` มีจริงและเป็นของทางการ** ติดตั้งด้วย npm เปิด browser หลายตัวพร้อมกันด้วย `-s=ชื่อ` อัดหลักฐานด้วย `video-start`/`video-stop` ตั้งแต่ Playwright 1.62 มีมาในตัวเป็น `npx playwright cli` | [[9]](https://playwright.dev/docs/getting-started-cli) [[10]](https://playwright.dev/docs/release-notes) |
| 3 | **ระวังคำอ้าง "CLI ใช้ token น้อยกว่า 4 เท่า"** ตัวเลขนั้นมาจาก MCP รุ่นเก่า การวัดซ้ำเดือน ก.ค. 2026 พบว่าแทบไม่ต่างกันแล้ว จึงควรเลือกตามสภาพแวดล้อม ไม่ใช่ตาม token | [[16]](https://dev.to/aswani25/playwright-cli-vs-playwright-mcp-which-should-you-use-with-claude-code-1olh) |
| 4 | **Playwright Test Agents (1.56+) มีสายพานสำเร็จรูป:** planner → `specs/*.md` → generator → `tests/*.spec.ts` → healer คำสั่ง `init-agents` จะ **เขียนทับ `.mcp.json`** ต้องสำรองไฟล์ก่อน | [[11]](https://playwright.dev/docs/test-agents) [[12]](https://stevekinney.com/courses/self-testing-ai-agents/playwright-test-agents) |
| 5 | **จัดการสำรวจด้วย SBTM:** agent ละ 1 charter (ภารกิจของรอบสำรวจ) มีเวลาจำกัด มีใบบันทึก session และสรุปผลแบบ PROOF | [[23]](https://en.wikipedia.org/wiki/Session-based_testing) |
| 6 | **แบ่งงาน agent ตามส่วนของระบบและความเสี่ยง ไม่ใช่สุ่มแบ่ง** ใช้ SFDIPOT บอกว่าต้องครอบคลุมอะไร ใช้ HICCUPPS(F) เป็น oracle ใช้ tour ของ Whittaker เป็นแนวของ charter และใช้ โอกาส × ผลกระทบ จัดลำดับ P1/P2/P3 | [[29]](https://developsense.com/?p=1773) [[31]](https://developsense.com/blog/2012/07/few-hiccupps) |
| 7 | **ใช้ช่องของ test case ตาม ISO/IEC/IEEE 29119-3:** ID, วัตถุประสงค์, priority, traceability, เงื่อนไขก่อนทดสอบ, input, ผลที่คาดหวัง, ผลจริง แล้วเพิ่มช่อง technique, oracle, tag เอง | [[44]](https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf) §7.3.5 |
| 8 | **เว็บจริงต้องใช้ oracle แบบ invariant และ metamorphic ไม่ใช่ค่าตายตัว** เช่น ใส่ตัวกรองแล้วผลต้องเป็นสับเซต เรียงราคาแล้วต้องไม่ลดลง ราคาต้องเป็นบวกและเป็นสกุลเงินที่ถูก | [[47]](https://en.wikipedia.org/wiki/Metamorphic_testing) |
| 9 | **Google Flights เสี่ยงถ้าทดสอบอัตโนมัติ** robots.txt มี `Disallow: /travel/flights/search` และ ToS ห้ามเข้าถึงแบบอัตโนมัติที่ขัดคำสั่งสำหรับเครื่อง และห้ามหลบระบบป้องกัน จึงต้องรันน้อยที่สุด ให้คนแก้ CAPTCHA หรือใช้เว็บของเราเอง | [[49]](https://www.google.com/robots.txt) [[50]](https://policies.google.com/terms) |
| 10 | **สายพานหลักฐาน:** ตั้ง `video: 'on'` พร้อม `show.actions` และ `show.test` ใช้ `test.step` ใช้ `locator.highlight({style})` หรือ `page.screencast.showOverlay()` ก่อนทุก assert แปลง webm เป็น GIF ด้วย ffmpeg แล้วคิด % ผ่านต่อหัวข้อจาก JSON reporter | [[55]](https://playwright.dev/docs/videos) [[57]](https://playwright.dev/docs/api/class-screencast) |

---

## 2. เครื่องมือ Playwright สำหรับ AI: MCP vs playwright-cli vs Playwright Test Agents vs Playwright Test

**คำศัพท์ก่อนเริ่ม:** snapshot (ภาพโครงสร้างหน้าเว็บแบบข้อความ ได้จาก accessibility tree) แต่ละปุ่มหรือช่องในนั้นมี ref เช่น `e15` ให้ AI อ้างถึงเพื่อคลิกหรือพิมพ์ได้ โดยไม่ต้องใช้โมเดลดูภาพ [[3]](https://github.com/microsoft/playwright-mcp)

| เครื่องมือ | เหมาะกับ | จุดเด่น | ข้อควรระวัง |
|---|---|---|---|
| **Playwright MCP** (`@playwright/mcp`) | AI ที่ต้องคิดต่อเนื่องหลายรอบและเก็บสถานะไว้ [[9]](https://playwright.dev/docs/getting-started-cli) | ใช้ snapshot แทนภาพ, มี `browser_find` ที่ถูกกว่า snapshot เต็ม, มี flag `--isolated`, `--headless`, `--user-data-dir`, `--caps` ฯลฯ, อัดวิดีโอผ่าน tool `browser_start_video` [[3]](https://github.com/microsoft/playwright-mcp) | ค่าเริ่มต้นเป็น profile แบบถาวร ซึ่งเปิดได้ทีละ browser เดียว ถ้ามีหลาย client ต้องใช้ `--isolated` หรือแยก `--user-data-dir` [[3]](https://github.com/microsoft/playwright-mcp) |
| **playwright-cli** (`@playwright/cli`) | ให้ agent สั่งงานผ่าน shell และเปิดหลาย browser พร้อมกัน | เอกสารบอกว่าประหยัด token กว่าเพราะไม่มี schema ใหญ่ (แต่ไม่ให้ตัวเลข) [[9]](https://playwright.dev/docs/getting-started-cli), มี session แยกชื่อด้วย `-s=` | ต้องใช้ Node 20+ [[8]](https://github.com/microsoft/playwright-cli); **[แหล่งรอง]** มีการวัดว่าช้ากว่า MCP ในเวลาจริง (ประมาณ 180–350 วิ เทียบ 80–150 วิ) [[17]](https://outpost.ranger.net/post/the-hidden-cost-of-fewer-tokens/) |
| **Playwright Test Agents** (1.56+) | สร้างแผนและเทสต์อัตโนมัติจากแอป | ได้ agent สามตัว planner/generator/healer เขียนไฟล์ลง `.claude/agents/` [[11]](https://playwright.dev/docs/test-agents) | **เขียนทับ `.mcp.json` เดิม** [[12]](https://stevekinney.com/courses/self-testing-ai-agents/playwright-test-agents) และอาจสร้าง `specs/README.md` กับ seed test ด้วย **[แหล่งรอง]** [[13]](https://azukiazusa.dev/en/blog/playwright-agents); ต้องรัน `init-agents` ใหม่ทุกครั้งที่อัปเกรด Playwright [[11]](https://playwright.dev/docs/test-agents); healer อาจ skip เทสต์ถ้าคิดว่าฟีเจอร์พังจริง |
| **Playwright Test** (`@playwright/test`) | รันเทสต์ซ้ำได้แน่นอน เป็นด่านยืนยันสุดท้าย | มี video/trace/screenshot, tag, retries, JSON reporter [[56]](https://playwright.dev/docs/test-use-options) [[60]](https://playwright.dev/docs/test-reporters) | `locator.highlight()` เอกสารบอกว่าไว้ debug ไม่ควร commit จึงใช้เฉพาะ "โหมดเก็บหลักฐาน" [[63]](https://playwright.dev/docs/api/class-locator) |

ติดตั้ง Playwright MCP ใน Claude Code: `claude mcp add playwright npx @playwright/mcp@latest` [[3]](https://github.com/microsoft/playwright-mcp)

**เรื่อง token (ตัดสินใจอย่างไร):**
- **[แหล่งรอง]** การวัดช่วงแรกได้ MCP ประมาณ 114k token เทียบ CLI ประมาณ 27k [[14]](https://testdino.com/blog/playwright-cli-guide) [[15]](https://bug0.com/blog/playwright-cli-vs-playwright-mcp-ai-browser-testing-2026)
- **[แหล่งรอง]** การวัดซ้ำ 24 ก.ค. 2026 (MCP 0.0.78 vs CLI 0.1.17) ได้ประมาณ 3.6k ตัวอักษรเท่ากันสำหรับงาน 7 ขั้น [[16]](https://dev.to/aswani25/playwright-cli-vs-playwright-mcp-which-should-you-use-with-claude-code-1olh)
- สรุป: เลือกตามว่างานต้องการ browser แยกกันหรือไม่ ไม่ใช่ตาม token

### คำสั่ง playwright-cli ที่ใช้ในบทนี้

ที่มา: [[9]](https://playwright.dev/docs/getting-started-cli) [[8]](https://github.com/microsoft/playwright-cli)

```bash
# ติดตั้ง
npm install -g @playwright/cli@latest
playwright-cli --help
playwright-cli install --skills        # ติดตั้ง skill ระดับโปรเจกต์ (Claude Code ฯลฯ อ่านได้)
playwright-cli install --skills -g     # ติดตั้งระดับเครื่อง: ~/.claude/skills
# แบบติดตั้งในโปรเจกต์:
npm install -D @playwright/cli@latest && npx playwright cli --help

# session แยกชื่อ = browser แยกกันจริง
playwright-cli -s=search open https://example.com
playwright-cli -s=filters open https://example.com
playwright-cli -s=search snapshot
playwright-cli -s=filters click e21
playwright-cli list                    # ดู session ทั้งหมด
playwright-cli -s=search close
playwright-cli close-all               # ปิดทุกตัว (kill-all = บังคับปิด)

# หลักฐาน
playwright-cli screenshot [ref] [--filename=f] [--hires]
playwright-cli video-start [filename]
playwright-cli video-chapter "<title>"
playwright-cli video-stop --filename=f
playwright-cli tracing-start           # ต้องเปิด browser ก่อน
playwright-cli tracing-stop
```

- `open` เป็น headless (ไม่เห็นหน้าต่าง) โดยค่าเริ่มต้น เพิ่ม `--headed` ถ้าอยากเห็น [[9]](https://playwright.dev/docs/getting-started-cli)
- session แบบ headless ปิดเองเมื่อว่าง 1 ชั่วโมง (`--idle-timeout=<ms>`, ใส่ `0` เพื่อปิดฟีเจอร์นี้) ส่วน headed ไม่ปิดเอง [[9]](https://playwright.dev/docs/getting-started-cli)
- ผูก agent ทั้งตัวไว้กับ session เดียวได้ด้วย `PLAYWRIGHT_CLI_SESSION=todo-app claude .` [[9]](https://playwright.dev/docs/getting-started-cli)

### ทำไม subagent ที่ทำงานพร้อมกันห้ามใช้ Playwright MCP ตัวเดียวกัน

เหตุผลสั้น ๆ: **ใช้ MCP ตัวเดียว = ใช้ browser เดียว = แย่งแท็บกัน** ผลที่ได้จะปนกันจนเชื่อไม่ได้

| หลักฐาน | เกิดอะไรขึ้น |
|---|---|
| Playwright MCP issue #893 (14 ส.ค. 2025) [[4]](https://github.com/microsoft/playwright-mcp/issues/893) | agent ของ Claude Code หลายตัวใช้แท็บเดียวกันและรบกวนกัน ผู้ใช้แก้โดยตั้ง server หลายตัว แต่ละตัวมี `--isolated` และ `--user-data-dir` ของตัวเอง |
| Playwright MCP issue #1631 (26 พ.ค. 2026) [[5]](https://github.com/microsoft/playwright-mcp/issues/1631) | client ที่ใช้ HTTP server ตัวเดียวกันได้ DOM ของกันและกันใน `browser_snapshot` ผู้ดูแลบอกให้ใช้ `--isolated` หรือ `--shared-browser-context` |
| Playwright PR #40709 (merge 7 พ.ค. 2026) [[6]](https://github.com/microsoft/playwright/pull/40709) | แก้ race ใน `--isolated` ที่ทำให้มี browser กำพร้าเปิดค้าง |
| Playwright PR #39703 (ปิดไม่ merge 17 มี.ค. 2026) [[7]](https://github.com/microsoft/playwright/pull/39703) | เคยเสนอพารามิเตอร์ `tabId` แยกแท็บต่อ agent แต่ถูกปิด ผู้ดูแลแนะนำให้ใช้สอง browser (สอง CLI session) แทน |
| Claude Code issue #84638 (6 ส.ค. 2026) [[20]](https://github.com/anthropics/claude-code/issues/84638) | subagent ที่ config `mcpServers` แบบ inline เหมือนกันทุกไบต์ ถูกรวมเป็น process เดียว `--isolated` ก็ช่วยไม่ได้ ทางเลี่ยงคือใช้ชื่อ server ไม่ซ้ำ และใส่ argument ต่างกันต่อ agent issue ถูกปิดแบบ "not planned" เมื่อ 5 ต.ค. 2026 ยังไม่มีการแก้ทางการ |

**ข้อสรุปของบท:** ให้ explorer แต่ละตัวใช้ `playwright-cli -s=<ชื่อ agent>` ของตัวเอง

---

## 3. Subagent ของ Claude Code

| คำถาม | คำตอบ | แหล่ง |
|---|---|---|
| **กำหนดยังไง** | เขียนไฟล์ Markdown ไว้ที่ `.claude/agents/` (โปรเจกต์) หรือ `~/.claude/agents/` (ผู้ใช้) ช่องบังคับใน frontmatter คือ `name` และ `description` ช่องเสริมเช่น `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `background`, `effort`, `isolation: worktree` | [[19]](https://code.claude.com/docs/en/sub-agents) |
| **ทำงานพร้อมกันได้กี่ตัว** | ค่าเริ่มต้น 20 ตัวต่อ session (เกินจะขึ้น `Concurrent subagent limit reached`) ปรับได้ด้วย `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` ซ้อนกันได้ลึก 3 ชั้น (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`) | [[19]](https://code.claude.com/docs/en/sub-agents) |
| **แชร์ MCP กันไหม** | ใช่ ถ้าไม่จำกัด subagent จะได้ MCP tool ของตัวหลักทั้งหมด ถ้า `mcpServers` เป็นชื่อ (string) จะใช้การเชื่อมต่อเดียวกับตัวหลัก ถ้าเป็น inline จะเชื่อมต่อใหม่ตอน subagent เริ่ม และตัดเมื่อจบ | [[19]](https://code.claude.com/docs/en/sub-agents) |
| **คุยกันเองได้ไหม** | ไม่ได้ ต้องใช้ agent teams ถ้าต้องการให้คุยกัน แต่ละตัวมี context ของตัวเองและส่งกลับแค่บทสรุป | [[21]](https://www.claude.com/blog/subagents-in-claude-code) |

ตัวอย่าง inline server จากเอกสาร [[19]](https://code.claude.com/docs/en/sub-agents):

```yaml
---
name: browser-tester
description: Tests features in a real browser using Playwright
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
---
```

ถ้าใช้แบบนี้หลายตัว ต้องทำให้ config ต่างกัน เช่น `args: ["-y","@playwright/mcp@latest","--isolated","--user-data-dir=C:/t/pw-a1"]` ไม่เช่นนั้นจะถูกรวมเป็นตัวเดียว [[20]](https://github.com/anthropics/claude-code/issues/84638)

**Best practice สำหรับ explorer หลายตัว** (สังเคราะห์จากแหล่งข้างบน):
1. แต่ละตัวใช้ session `playwright-cli -s=<agent-id>` ของตัวเอง (ง่ายที่สุด และผู้ดูแล Playwright แนะนำเอง [[7]](https://github.com/microsoft/playwright/pull/39703)) หรือ inline MCP ที่ต่างกันพร้อม `--isolated`
2. แต่ละตัวเขียนไฟล์ของตัวเองเท่านั้น เช่น `findings/<area>.md` และ `evidence/<area>/` เพราะบล็อกทางการเตือนว่าอย่าให้ subagent แก้ไฟล์เดียวกัน [[21]](https://www.claude.com/blog/subagents-in-claude-code)
3. ตัวหลักรวมไฟล์ทั้งหมดในขั้น debrief (ประชุมสรุปหลังสำรวจ)
4. ถ้าเป้าหมายเป็นเว็บจริงของคนอื่น ให้รันพร้อมกันแค่ไม่กี่ตัว
5. **[แหล่งรอง]** มีคู่มือบุคคลที่สามแบบ 4 agent: explorer → writer → implementer → executor ส่งต่องานผ่าน `handoff.json` [[22]](https://testomat.io/blog/multi-agent-ai-testing-with-claude-code-and-playwright/)

---

## 4. วิธีสำรวจแบบมืออาชีพ

### 4.1 SBTM (Session-Based Test Management)

คิดค้นโดย Jonathan และ James Bach ที่ HP ราวปี 2000 [[23]](https://en.wikipedia.org/wiki/Session-based_testing) [[24]](https://www.satisfice.com/download/session-based-test-management)

| ส่วน | ความหมาย |
|---|---|
| **charter** | ภารกิจของรอบสำรวจ บอกว่ารอบนี้จะสำรวจอะไร |
| **session** | ช่วงเวลาทำงานต่อเนื่องไม่ถูกขัด ควรยาว 1–2 ชั่วโมง |
| **session sheet** (ใบบันทึก) | charter, ส่วนที่สำรวจ, บันทึก, bug, issue (ข้อสงสัย/อุปสรรค), ไฟล์ข้อมูล, เวลาที่ทำตาม charter เทียบกับเวลาที่ไปเจอเรื่องอื่น, สัดส่วนเวลา Test/Bug/Setup, เวลาเริ่มและระยะเวลา |
| **debrief แบบ PROOF** | **P**ast (ทำอะไรไป), **R**esults (เจออะไร), **O**bstacles (ติดอะไร), **O**utlook (ต่อไปควรทำอะไร), **F**eelings (รู้สึกอย่างไร) |

ใบบันทึกเขียนเป็นรูปแบบคงที่ จึงแปลงเป็นตัวเลขได้ เช่น ความครอบคลุมต่อส่วน [[23]](https://en.wikipedia.org/wiki/Session-based_testing)

**วิธีแบ่งและรวมงานในบทนี้:** agent ละ 1 charter ต่อ 1 ส่วนของระบบ → แต่ละตัวเขียน session sheet → ตัวหลักทำ debrief PROOF และตัด bug ซ้ำ → charter ใหม่มาจากช่อง "Outlook" และ "Issues" [[23]](https://en.wikipedia.org/wiki/Session-based_testing)

**[แหล่งรอง] ตัวอย่างจากงานจริง:** ชุด `explore-qa` ของ Alexander Opalic (19 เม.ย. 2026) ใช้ `playwright-cli` ขับ Claude Code, Codex และ Copilot ใช้ charter ละไฟล์ (เป้าหมาย, เวลาราว 5 นาที, ความเสี่ยง 3–4 ข้อ) รายงานแบบ SBTM และ PROOF บทเรียนของเขา: charter ควรมีแค่ 3–4 ความเสี่ยง, ถ่ายภาพเฉพาะตอนเจอปัญหา, ปล่อยให้ agent ออกนอกเส้นทางได้บ้าง และต้องเผื่อ false positive (Codex รายงาน bug ตะกร้าที่ agent อื่นพิสูจน์ว่าไม่จริง) [[18]](https://alexop.dev/posts/exploratory-qa-ai-agents-site-agnostic-harness/)

### 4.2 Charter template

จากหนังสือ *Explore It!* ของ Elisabeth Hendrickson (2013) [[25]](https://www.oreilly.com/library/view/explore-it/9781941222584/f_0019.html):

> **สำรวจ** \<เป้าหมาย\> **ด้วย** \<ทรัพยากร\> **เพื่อหา** \<ข้อมูล\>
> (ต้นฉบับ: "Explore \<target\> with \<resources\> to discover \<information\>")

ตัวอย่าง: สำรวจ *หน้าตะกร้าสินค้า* ด้วย *คูปองหลายแบบและจำนวนสินค้าที่ขอบเขต* เพื่อหา *ยอดรวมที่คำนวณผิด*

ถ้อยคำเป๊ะยืนยันได้จากบทสรุปรองเท่านั้น **[แหล่งรอง]** [[26]](https://www.goodreads.com/book/show/15980494-explore-it)

### 4.3 Tour ของ Whittaker

จากหนังสือ *Exploratory Software Testing* (2009) มองแอปเป็นเมืองที่มีหลายย่าน แต่ละ tour คือวิธีเที่ยวย่านนั้น [[27]](https://www.techtarget.com/searchsoftwarequality/tip/Six-tours-for-exploratory-testing-the-business-district-of-your-application) [[28]](https://www.pearson.com/store/isbn-redirect/9780321636416?pgm=true)

| ย่าน | tour ที่ยืนยันได้ |
|---|---|
| ย่านธุรกิจ (business district) | Guidebook, Money, Landmark |
| ย่านประวัติศาสตร์และย่านอื่น | Bad-Neighborhood, Back Alley, All-Nighter |

รายการเต็ม (เช่น FedEx, Supermodel, Couch Potato) **[ยังไม่ยืนยัน]**

### 4.4 SFDIPOT: ต้องครอบคลุมอะไรบ้าง

- James Bach ตั้ง SFDPO ("San Francisco DePOt"): **S**tructure, **F**unction, **D**ata, **P**latform, **O**perations
- Michael Bolton เพิ่ม **T**ime และต่อมาเพิ่ม **I**nterfaces กลายเป็น **SFDIPOT** [[29]](https://developsense.com/?p=1773)
- Heuristic Test Strategy Model v6.3 (2 ธ.ค. 2024) มีปัจจัยเหล่านี้พร้อมเกณฑ์คุณภาพ [[30]](https://www.satisfice.com/download/heuristic-test-strategy-model)

### 4.5 FEW HICCUPPS: oracle (ตัวตัดสินว่าผลถูกหรือผิด)

ของ Michael Bolton [[31]](https://developsense.com/blog/2012/07/few-hiccupps) [[32]](https://developsense.com/resource/Oracles.pdf)

| ตัวอักษร | ชื่อ | ถามตัวเองว่า |
|---|---|---|
| F | Familiar problems | เป็นปัญหาแบบที่เคยเห็นไหม |
| E | Explainability | อธิบายพฤติกรรมนี้ได้ไหม |
| W | World | ตรงกับความจริงในโลกไหม |
| H | History | ตรงกับเวอร์ชันก่อนไหม |
| I | Image | สมกับภาพลักษณ์ขององค์กรไหม |
| C | Comparable products | ตรงกับผลิตภัณฑ์คล้ายกันไหม |
| C | Claims | ตรงกับที่เอกสารหรือโฆษณาบอกไหม |
| U | User desires | ตรงกับที่ผู้ใช้ต้องการไหม |
| P | Product | สอดคล้องกันเองภายในระบบไหม |
| P | Purpose | ตรงกับจุดประสงค์ของระบบไหม |
| S | Statutes / Standards | ตรงกับกฎหมายหรือมาตรฐานไหม |

### 4.6 ความเสี่ยง = โอกาส × ผลกระทบ → P1/P2/P3

- ISTQB นิยามระดับความเสี่ยงจากผลกระทบ (impact) และโอกาสเกิด (likelihood) คิดได้ทั้งแบบตัวเลข (โอกาส × ผลกระทบ) และแบบตาราง risk matrix [[33]](https://softwaretestpilot.com/istqb/glossary/risk-level) [[34]](https://open-exam-prep.com/study-guides/istqb-foundation/managing-test-activities/risk-based-testing)
- จับช่วงคะแนนเป็น P1/P2/P3 เพื่อตัดสินว่าต้องทดสอบหนักแค่ไหน P1 รันก่อนและละเอียดที่สุด
- ถ้อยคำเป๊ะในอภิธานศัพท์ ISTQB **[ยังไม่ยืนยัน]** ควรเช็กที่ [[35]](https://glossary.istqb.org)

---

## 5. งานวิจัยล่าสุด 2025–2026

| ชื่อ | ทำอะไร | ผลที่เจอ | บทเรียนสำหรับเรา |
|---|---|---|---|
| **GUITester** (arXiv 2601.04500, ม.ค. 2026) [[36]](https://arxiv.org/abs/2601.04500) | หลาย agent แยก "เดินสำรวจ" ออกจาก "ตรวจสอบ" ฝั่งตรวจสอบมีขั้นไตร่ตรองที่ตัดสินว่าเป็น "bug จริง หรือ agent ทำพลาดเอง" | ชุดทดสอบ GUITestBench 143 งาน 26 bug ได้ F1 48.9% (Pass@3) เทียบ baseline 33.35% agent ทั่วไปมักคิดว่า bug คือความผิดของตัวเอง | แยกหน้าที่สำรวจกับตัดสินออกจากกัน |
| **WebTestPilot** (arXiv 2602.11724, ก.พ. 2026) [[37]](https://arxiv.org/abs/2602.11724) | แปลง spec ภาษาคนเป็นขั้นตอน พร้อมเงื่อนไขก่อนและหลังของแต่ละขั้น ใช้เป็น oracle ข้ามขั้น | ทำงานสำเร็จ 99% ความแม่นยำและ recall ในการหา bug 96% ดีกว่า baseline ที่ดีที่สุด +70 จุด (precision) และ +27 จุด (recall) | เขียนผลที่คาดหวังเป็นเงื่อนไขที่ตรวจได้ทุกขั้น |
| **WebTestBench** (arXiv 2603.25226, มี.ค. 2026) [[38]](https://arxiv.org/abs/2603.25226) | แบ่งงานทดสอบเว็บเป็น สร้าง checklist + หา bug | agent LLM ทดสอบไม่ครบ หา bug ได้น้อย และไม่เสถียรในงานยาว | อย่าเชื่อว่า AI ครอบคลุมครบ ต้องมี checklist ที่คนตรวจ |
| **CAT / CATTest** (arXiv 2609.00081, ส.ค. 2026) [[39]](https://arxiv.org/abs/2609.00081) | agent เขียนโค้ด Playwright เพื่อสำรวจ | ชุดทดสอบ 102 เว็บแอปที่ AI สร้างพร้อม bug ที่ระบุไว้ VLM หลัก ๆ ทำได้ "แย่" | AI ยังหา bug ได้ไม่ดี คนต้องตรวจซ้ำ |
| **MAdroid** (arXiv 2506.17539, ICSE 2026) [[40]](https://arxiv.org/abs/2506.17539) | agent สามบทบาท Coordinator, Operator, Observer ทดสอบฟีเจอร์ที่มีผู้ใช้หลายคน | ทำงานสำเร็จ 82.9% จาก 41 งาน เจอ 11 bug ในการทดสอบ regression | แบ่งบทบาทชัดเจนช่วยได้ |
| **ResTest** (arXiv 2506.00520, 2025) [[41]](https://arxiv.org/abs/2506.00520) | เมื่อการสำรวจแบบเดิมไม่เจออะไรใหม่ LLM อ่านรายงาน coverage และกราฟสถานะ เพื่อเดาฟีเจอร์ที่ยังไม่ถูกทดสอบ แล้วให้ agent ไปทดสอบ | coverage ของโค้ดเพิ่มเฉลี่ย 17.5–24.4% | ใช้ช่อง "Outlook" หาจุดที่ยังไม่ได้สำรวจ |

**ข้อสรุปรวม:** แยกขั้น "สำรวจ" ออกจาก "ตรวจ/ตัดสิน" ทุก bug ที่อ้างต้องมีหลักฐาน และต้องยืนยันซ้ำด้วย agent ตัวที่สอง หรือด้วยเทสต์ Playwright ที่รันซ้ำได้ [[36]](https://arxiv.org/abs/2601.04500) [[18]](https://alexop.dev/posts/exploratory-qa-ai-agents-site-agnostic-harness/)

---

## 6. มาตรฐานแผนทดสอบ ISO/IEC/IEEE 29119-3

- 29119-3 คือส่วน "เอกสารการทดสอบ" ฉบับแรก 1 ก.ย. 2013 ฉบับปัจจุบันปี 2021 พัฒนาต่อจาก IEEE 829, IEEE 1008 และ BS 7925 [[42]](https://en.wikipedia.org/wiki/ISO/IEC_29119) [[43]](https://standards.iteh.ai/catalog/standards/iso/b4f42a41-dd8f-446c-9674-238ba5dc90f1/iso-iec-ieee-29119-3-2021)
- ข้อมูลด้านล่างอ่านจากฉบับ 2013 [[44]](https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf) เพราะชื่อช่องในฉบับ 2021 ต้องเสียเงินซื้อ **[ยังไม่ยืนยัน]**

### 6.1 ช่องของ Test Plan (§6.2)

| หมวด | มีอะไรบ้าง |
|---|---|
| ข้อมูลเอกสาร | ID, ผู้ออก, ผู้อนุมัติ, ประวัติการแก้ไข |
| บทนำ | ขอบเขต, เอกสารอ้างอิง, อภิธานศัพท์ |
| บริบท | โปรเจกต์, สิ่งที่ทดสอบ, ขอบเขตการทดสอบ, สมมติฐานและข้อจำกัด, ผู้เกี่ยวข้อง |
| การสื่อสาร | ช่องทางสื่อสารเรื่องการทดสอบ |
| ทะเบียนความเสี่ยง | ความเสี่ยงของผลิตภัณฑ์และของโปรเจกต์ |
| กลยุทธ์ | กระบวนการย่อย, สิ่งที่ส่งมอบ, เทคนิคออกแบบเทสต์, เกณฑ์จบ, ตัวชี้วัด, ความต้องการข้อมูลและสภาพแวดล้อม, การทดสอบซ้ำ/regression, เกณฑ์หยุดและเริ่มต่อ |
| อื่น ๆ | กิจกรรมและการประมาณเวลา, บุคลากร, ตารางเวลา |

### 6.2 ช่องของ Test Case (§7.3)

| ช่อง | ความหมาย |
|---|---|
| Unique identifier | รหัสไม่ซ้ำ ไม่เปลี่ยน ใช้โยงความสัมพันธ์ |
| Objective | วัตถุประสงค์ มักใช้เป็นชื่อเทสต์ |
| Priority | ลำดับความสำคัญ สูงกว่ารันก่อน |
| Traceability | โยงไปยัง coverage item หรือ requirement |
| Preconditions | สภาพแวดล้อมและข้อมูลที่ต้องพร้อมก่อน |
| Inputs | ขั้นตอนเป็นข้อ ๆ พร้อมข้อมูลและจังหวะเวลา |
| Expected results | ค่าที่คาดหวังพร้อมค่าคลาดเคลื่อนที่ยอมรับ รวมพฤติกรรม เช่น เวลาตอบสนอง |
| Actual results | ผลจริงและผลการทดสอบ |

Test coverage item (สิ่งที่ต้องครอบคลุม) ได้จากการใช้เทคนิคออกแบบเทสต์ เช่น equivalence partitioning [[44]](https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf)

### 6.3 ช่องที่บทนี้แนะนำ

ช่องของ ISO ข้างบน + ช่องที่ใช้ในทางปฏิบัติ [[44]](https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf):

ID · Title/Objective · Feature/Area tag · Priority (P1–P3 จากความเสี่ยง) · Requirement/Charter trace · Technique (EP, BVA, state, metamorphic…) · Preconditions · Test data · Steps · Expected result · Oracle source (ตัวอักษร HICCUPPS หรือ invariant) · Automation tag (`@p1 @f-search`) · Evidence (path ของ GIF) · Status

แผนของ Playwright Test Agents มีหัวข้อ Application Overview, Test Scenarios, Steps และ Expected Results อยู่แล้ว [[11]](https://playwright.dev/docs/test-agents) บทนี้จึงเพิ่ม ID, priority, tag, technique, oracle และ traceability เข้าไป

### 6.4 Traceability matrix

ตารางที่แถวคือ requirement หรือสิ่งที่เจอจาก charter คอลัมน์คือรหัส test case ใช้ดูว่าทุกความต้องการมีเทสต์ครอบคลุม มาตรฐาน §7.3.5.5 อนุญาตให้ใช้ "Test Traceability Matrix" ไว้ชัดเจน [[44]](https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf)

| Requirement / Finding | TC-SRCH-01 | TC-CART-05 | TC-COUP-01 |
|---|---|---|---|
| R1 ค้นหาสินค้า | ✔ | | |
| R2 ยอดรวมตะกร้า | | ✔ | ✔ |

(ตารางนี้เป็นแค่ตัวอย่างรูปแบบ)

---

## 7. ทดสอบเว็บจริงของคนอื่น (Google Flights)

### 7.1 ปัญหา oracle และ metamorphic relation

เว็บจริงข้อมูลเปลี่ยนตลอด เราจึงไม่รู้ "คำตอบที่ถูก" ล่วงหน้า (เรียกว่า oracle problem) ทางออกคือ **metamorphic relation** (ความสัมพันธ์ที่ต้องจริงระหว่างการรันหลายครั้ง) เสนอโดย T.Y. Chen ปี 1998 และมีบทสำรวจโดย Segura และคณะปี 2016 [[47]](https://en.wikipedia.org/wiki/Metamorphic_testing) และ **invariant** (กฎที่ต้องจริงเสมอ ไม่ว่าข้อมูลจะเป็นอะไร)

| ประเภท | ตัวอย่าง | แหล่ง |
|---|---|---|
| MR เว็บจองที่พัก | ใส่ตัวกรองราคาหรือดาว → ผลต้องเป็นสับเซตของผลเดิม | [[47]](https://en.wikipedia.org/wiki/Metamorphic_testing) |
| MR การค้นหา | จำนวนผลของ q ≥ จำนวนผลของ q + คำค้นเพิ่ม **[แหล่งรอง]** | [[48]](https://eprints.whiterose.ac.uk/110335/1/segura16-tse.pdf) |
| invariant ของบท* | เรียงตามราคา → ราคาไม่ลดลง | อนุมานจากรูปแบบ MR ข้างบน |
| invariant ของบท* | ติ๊ก "Nonstop only" → ทุกการ์ดมี 0 stop และจำนวนผลไม่เพิ่ม | 〃 |
| invariant ของบท* | สลับต้นทาง-ปลายทาง → สนามบินที่แสดงสลับตาม | 〃 |
| invariant ของบท* | วันกลับต้องไม่ก่อนวันไป | 〃 |
| invariant ของบท* | ราคา > 0 และเป็นสกุลเงินที่เลือก | 〃 |
| invariant ของบท* | URL และสถานะยังเหมือนเดิมหลัง reload | 〃 |

\* ผู้ค้นคว้าคิดขึ้นเองโดยอิงรูปแบบ MR ใน [[47]](https://en.wikipedia.org/wiki/Metamorphic_testing) [[48]](https://eprints.whiterose.ac.uk/110335/1/segura16-tse.pdf)

### 7.2 robots.txt และเงื่อนไขการใช้งาน (ToS)

พูดตรง ๆ: **การรันเทสต์อัตโนมัติกับหน้าผลค้นหาของ Google Flights ขัดกับ ToS ของ Google**

- robots.txt ของ Google (`User-agent: *`) มี `Disallow: /travel/flights/search`, `Disallow: /travel/flights/s/` และ `Disallow: /travel/flights/booking` ส่วน `/travel/flights` เฉย ๆ ไม่ได้ห้าม (เช็ก 3 พ.ย. 2569) [[49]](https://www.google.com/robots.txt)
- ToS ของ Google (มีผล 30 ก.ค. 2026 ฉบับประเทศไทย) ห้ามใช้วิธีอัตโนมัติเข้าถึงเนื้อหาในแบบที่ขัดกับคำสั่งสำหรับเครื่อง เช่น robots.txt และห้ามหลบระบบหรือมาตรการป้องกันของ Google [[50]](https://policies.google.com/terms)
- ข้อเสนอจากงานค้นคว้า: รันให้น้อยมากด้วยจังหวะแบบคน ทำเป็นตัวอย่างเพื่อการเรียน หรือใช้เว็บที่เราควบคุมเองหรือเว็บสำหรับฝึก และให้ผู้สอนเป็นคนตัดสิน

### 7.3 CAPTCHA = หยุดให้คนแก้

- Google แสดงหน้า "unusual traffic" พร้อม reCAPTCHA เมื่อเห็นการค้นหาอัตโนมัติจากเครือข่าย เครือข่ายมหาวิทยาลัยที่ใช้ร่วมกันหรือ VPN ก็ทำให้เกิดได้ [[51]](https://support.google.com/websearch/answer/86640)
- กติกาของบท: **agent หยุดทันที → คนแก้ CAPTCHA เอง หรือจบ session** ห้ามมีอะไรพยายามหลบ เพราะ ToS ห้ามหลบมาตรการป้องกัน [[50]](https://policies.google.com/terms)

### 7.4 รับมือเทสต์ที่ flaky (ผลไม่แน่นอน บางทีผ่านบางทีตก)

| วิธี | แหล่ง |
|---|---|
| หลักของ Playwright: "ทดสอบเฉพาะสิ่งที่เราควบคุม" ถ้าพึ่งระบบภายนอก ให้ mock ด้วย Network API | [[52]](https://playwright.dev/docs/best-practices) |
| ใช้ web-first assertion และ locator ตาม role ที่ทนต่อการเปลี่ยน | [[52]](https://playwright.dev/docs/best-practices) |
| ตั้ง `retries` เทสต์ที่ผ่านในรอบหลังจะถูกรายงานว่า "flaky" | [[53]](https://playwright.dev/docs/test-retries) |
| ใช้ `expect.poll` / `toPass` กับหน้าที่ค่อย ๆ โหลด และ `expect.soft` เพื่อเก็บ invariant ที่ตกหลายข้อในเทสต์เดียว | [[54]](https://playwright.dev/docs/test-assertions) |
| (ข้อเสนอของผู้ค้นคว้า) ตรึง locale, สกุลเงิน, timezone ด้วย `use: { locale, timezoneId }` ใช้วันที่แบบนับจากวันนี้ไปข้างหน้า ตั้ง `workers` ต่ำ และเตรียมตัวจัดการแบนเนอร์ขอความยินยอม | — |

> ⚠️ **การตัดสินใจของรายวิชา**
> บทนี้รัน Google Flights **แบบเบาที่สุดเท่านั้น**: สำรวจครั้งเดียว, เปิด browser แบบไม่ระบุตัวตน (โปรไฟล์ใหม่ในหน่วยความจำ) พร้อมกันไม่เกิน 5 ตัว, ใช้จังหวะแบบคน, รันชุดเทสต์ครั้งเดียว และ **ไม่ล็อกอิน**
> ถ้านักศึกษาจะทำนอกห้องเรียน ต้องอ่าน ToS ของเว็บนั้นเองก่อน และขออนุญาตเจ้าของเว็บ [[49]](https://www.google.com/robots.txt) [[50]](https://policies.google.com/terms)

---

## 8. หลักฐาน GIF และ % ต่อหัวข้อ

### 8.1 ตั้งค่าวิดีโอ

- โหมด `video` และ `trace`: off, on, retain-on-failure, on-first-retry และโหมดอื่น เช่น retain-on-first-failure ส่วน `screenshot`: off, on, only-on-failure [[56]](https://playwright.dev/docs/test-use-options) [[55]](https://playwright.dev/docs/videos)
- ใส่คำอธิบายในวิดีโอได้ [[55]](https://playwright.dev/docs/videos):

```ts
video: { mode: 'on', size: { width, height },
  show: { actions: { duration, position, fontSize },
          test: { level: 'step', position } } }
```

- วิดีโอเป็นไฟล์ webm ใน `test-results/` ขนาดเริ่มต้นคือ viewport ย่อให้พอดี 800×800 [[55]](https://playwright.dev/docs/videos) เวอร์ชัน 1.64 เพิ่ม `fps`, `style` (แทน `fontSize`) และการเข้ารหัส VP9 [[10]](https://playwright.dev/docs/release-notes)
- `test.step(title, body)` คืนค่าที่ callback ส่งกลับ เมื่อตั้ง `show.test.level: 'step'` ชื่อ step จะขึ้นในวิดีโอ [[58]](https://playwright.dev/docs/api/class-test) [[55]](https://playwright.dev/docs/videos)

### 8.2 ไฮไลต์จุดที่ assert

- `locator.highlight()` (ตั้งแต่ 1.20) ไฮไลต์ element บนจอ v1.60 เพิ่มตัวเลือก `style` และ `page.hideHighlight()` เอกสารบอกว่าไว้ debug ไม่ควร commit จึงเปิดใช้เฉพาะโหมดเก็บหลักฐาน [[63]](https://playwright.dev/docs/api/class-locator) [[10]](https://playwright.dev/docs/release-notes)
- `page.screencast` (1.59+) ใส่ข้อความทับวิดีโอได้ [[57]](https://playwright.dev/docs/api/class-screencast):
  - `page.screencast.showOverlay('<div …>TC-03 ✓ sorted</div>', {duration: 3000})`
  - `showChapter('TC-03 Sort by price', {description})`
  - `showActions({style:{highlight:'outline:3px solid red'}})`

### 8.3 แปลง webm → GIF ด้วย ffmpeg

```bash
# แบบรอบเดียว: palettegen สร้างชุดสี แล้ว paletteuse ใช้ชุดสีนั้น (สีสวยกว่าแปลงตรง ๆ)
ffmpeg -i in.webm -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 out.gif

# ทางเลือกคุณภาพสูงกว่า: gifski
ffmpeg -i video.webm -f yuv4mpegpipe - | gifski -o anim.gif -
```

- คำสั่งรอบเดียว [[64]](https://skills.sh/athola/claude-night-market/gif-generation) [[65]](https://hn.jakechampion.name/reader/https://mattj.io/posts/2021-02-27-create-animated-gif-and-webp-from-videos-using-ffmpeg/); แบบสองรอบเขียน `palette.png` ก่อน และ `paletteuse` มีตัวเลือก dither เช่น `bayer`, `floyd_steinberg` [[66]](https://www.ahosting.net/faq/ffmpeg-hosting/how-to-create-animated-gifs-with-ffmpeg.html)
- gifski ปรับได้ด้วย `--width`, `--quality`, `--lossy-quality` [[67]](https://github.com/ImageOptim/gifski) [[68]](https://docs.rs/crate/gifski/latest)
- หาวิดีโอของแต่ละเทสต์: ใน JSON report ช่อง `results[].attachments` มี `{name:'video', path}` [[62]](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright/types/testReporter.d.ts)
- ไม่พบเครื่องมือเฉพาะสำหรับ "วิดีโอ Playwright → GIF มีคำอธิบาย" จากแหล่งต้นทาง **[ยังไม่ยืนยัน]** แต่ overlay ในตัว + ffmpeg ก็พอแล้ว

### 8.4 tag → % ผ่านต่อหัวข้อ

- ใส่ tag: `test('…', { tag: ['@p1','@search'] }, …)` หรือใส่ `@คำ` ในชื่อเทสต์ กรองด้วย `--grep @p1`, `--grep-invert` หรือ `"(?=.*@p1)(?=.*@search)"` [[59]](https://playwright.dev/docs/test-annotations)
- ตั้ง reporter: `reporter: [['html'], ['json', { outputFile: 'results.json' }]]` หรือใช้ `PLAYWRIGHT_JSON_OUTPUT_FILE` [[60]](https://playwright.dev/docs/test-reporters)
- โครง JSON: `suites[].specs[]` มี `tags` และ `ok`; `specs[].tests[]` มี `status` (expected, unexpected, flaky, skipped) และ `results[].attachments`; ด้านบนสุดมี `stats` [[62]](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright/types/testReporter.d.ts)
- reporter เขียนเองได้ผ่าน `onTestEnd(test, result)` มี `TestCase.tags` (v1.42) และ `outcome()` [[60]](https://playwright.dev/docs/test-reporters) [[61]](https://playwright.dev/docs/api/class-testcase)
- **วิธีคิด % ต่อหัวข้อ** (ผู้ค้นคว้าคิดเอง): ไล่ `suites` แบบ recursive → แต่ละ spec ดู tag ที่ขึ้นต้นด้วย `@f-` → นับเทสต์ที่ `status` เป็น `expected` (หรือนับ `flaky` ด้วยถ้าถือว่าผ่าน) หารด้วยเทสต์ทั้งหมดที่ไม่ใช่ `skipped`

```
% ผ่านของ @f-search = (จำนวน expected) / (จำนวนทั้งหมด − skipped) × 100
```

---

## 9. สิ่งที่ยังยืนยันไม่ได้

1. `@playwright/mcp` รุ่นปัจจุบันยังรับ flag `--save-video`/`--save-trace` อยู่ไหม README ไม่มี มีแค่ tool อัดวิดีโอและ trace [[3]](https://github.com/microsoft/playwright-mcp)
2. เนื้อหาเป๊ะของ `.mcp.json` ที่ `init-agents --loop=claude` เขียน และการขึ้นบรรทัดเป๊ะของ Markdown แผนทดสอบ [[11]](https://playwright.dev/docs/test-agents)
3. ชื่อช่องในมาตรฐาน 29119-3 ฉบับ **2021** (ต้องซื้อ จึงใช้ฉบับ 2013 มีแคตตาล็อกรองระบุ identifier, objective, preconditions, inputs, steps, expected results, postconditions, environment, traceability **[แหล่งรอง]** [[45]](https://tessl.io/registry/testland/test-case-anatomy-reference)), จำนวนหัวข้อเป๊ะของ IEEE 829 [[46]](https://www.agileconnection.com/sites/default/files/article/file/2013/Software%20Test%20Case%20Specification%20Template.pdf) และถ้อยคำเป๊ะในอภิธานศัพท์ ISTQB
4. รายชื่อ tour ของ Whittaker ครบทุกตัว
5. บทความทางการของ Anthropic ที่พูดเรื่อง subagent ทำงานพร้อมกันเพื่อสำรวจเว็บโดยตรง
6. ถ้อยคำเป๊ะของ charter template จากตัวหนังสือของ Hendrickson

---

## 10. แหล่งอ้างอิง

**ก. เครื่องมือ Playwright**
1. https://registry.npmjs.org/@playwright/mcp/latest
2. https://registry.npmjs.org/@playwright/cli/latest
3. https://github.com/microsoft/playwright-mcp
4. https://github.com/microsoft/playwright-mcp/issues/893
5. https://github.com/microsoft/playwright-mcp/issues/1631
6. https://github.com/microsoft/playwright/pull/40709
7. https://github.com/microsoft/playwright/pull/39703
8. https://github.com/microsoft/playwright-cli
9. https://playwright.dev/docs/getting-started-cli
10. https://playwright.dev/docs/release-notes
11. https://playwright.dev/docs/test-agents
12. https://stevekinney.com/courses/self-testing-ai-agents/playwright-test-agents
13. https://azukiazusa.dev/en/blog/playwright-agents
14. https://testdino.com/blog/playwright-cli-guide
15. https://bug0.com/blog/playwright-cli-vs-playwright-mcp-ai-browser-testing-2026
16. https://dev.to/aswani25/playwright-cli-vs-playwright-mcp-which-should-you-use-with-claude-code-1olh
17. https://outpost.ranger.net/post/the-hidden-cost-of-fewer-tokens/
18. https://alexop.dev/posts/exploratory-qa-ai-agents-site-agnostic-harness/

**ข. Subagent ของ Claude Code**
19. https://code.claude.com/docs/en/sub-agents
20. https://github.com/anthropics/claude-code/issues/84638
21. https://www.claude.com/blog/subagents-in-claude-code
22. https://testomat.io/blog/multi-agent-ai-testing-with-claude-code-and-playwright/

**ค. วิธีสำรวจ**
23. https://en.wikipedia.org/wiki/Session-based_testing
24. https://www.satisfice.com/download/session-based-test-management
25. https://www.oreilly.com/library/view/explore-it/9781941222584/f_0019.html
26. https://www.goodreads.com/book/show/15980494-explore-it
27. https://www.techtarget.com/searchsoftwarequality/tip/Six-tours-for-exploratory-testing-the-business-district-of-your-application
28. https://www.pearson.com/store/isbn-redirect/9780321636416?pgm=true
29. https://developsense.com/?p=1773
30. https://www.satisfice.com/download/heuristic-test-strategy-model
31. https://developsense.com/blog/2012/07/few-hiccupps
32. https://developsense.com/resource/Oracles.pdf
33. https://softwaretestpilot.com/istqb/glossary/risk-level
34. https://open-exam-prep.com/study-guides/istqb-foundation/managing-test-activities/risk-based-testing
35. https://glossary.istqb.org

**ง. งานวิจัย**
36. https://arxiv.org/abs/2601.04500 (GUITester)
37. https://arxiv.org/abs/2602.11724 (WebTestPilot)
38. https://arxiv.org/abs/2603.25226 (WebTestBench)
39. https://arxiv.org/abs/2609.00081 (CAT / CATTest)
40. https://arxiv.org/abs/2506.17539 (MAdroid)
41. https://arxiv.org/abs/2506.00520 (ResTest)

**จ. มาตรฐานเอกสารทดสอบ**
42. https://en.wikipedia.org/wiki/ISO/IEC_29119
43. https://standards.iteh.ai/catalog/standards/iso/b4f42a41-dd8f-446c-9674-238ba5dc90f1/iso-iec-ieee-29119-3-2021
44. https://wildart.github.io/MISG5020/standards/ISO-IEC-IEEE-29119-3.pdf
45. https://tessl.io/registry/testland/test-case-anatomy-reference
46. https://www.agileconnection.com/sites/default/files/article/file/2013/Software%20Test%20Case%20Specification%20Template.pdf

**ฉ. ทดสอบเว็บจริงของคนอื่น**
47. https://en.wikipedia.org/wiki/Metamorphic_testing
48. https://eprints.whiterose.ac.uk/110335/1/segura16-tse.pdf
49. https://www.google.com/robots.txt
50. https://policies.google.com/terms
51. https://support.google.com/websearch/answer/86640
52. https://playwright.dev/docs/best-practices
53. https://playwright.dev/docs/test-retries
54. https://playwright.dev/docs/test-assertions

**ช. หลักฐานและรายงาน**
55. https://playwright.dev/docs/videos
56. https://playwright.dev/docs/test-use-options
57. https://playwright.dev/docs/api/class-screencast
58. https://playwright.dev/docs/api/class-test
59. https://playwright.dev/docs/test-annotations
60. https://playwright.dev/docs/test-reporters
61. https://playwright.dev/docs/api/class-testcase
62. https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright/types/testReporter.d.ts
63. https://playwright.dev/docs/api/class-locator
64. https://skills.sh/athola/claude-night-market/gif-generation
65. https://hn.jakechampion.name/reader/https://mattj.io/posts/2021-02-27-create-animated-gif-and-webp-from-videos-using-ffmpeg/
66. https://www.ahosting.net/faq/ffmpeg-hosting/how-to-create-animated-gifs-with-ffmpeg.html
67. https://github.com/ImageOptim/gifski
68. https://docs.rs/crate/gifski/latest
