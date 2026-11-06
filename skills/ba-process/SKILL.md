---
name: ba-process
description: Use when documenting or comparing a business process - As-Is / To-Be flows, decision tables, gap analysis, flow diagrams - "วาด flow", "As-Is To-Be", "gap analysis", "ขั้นตอนการทำงานของระบบ".
---

# ba-process

Model a process in the house format and find the gaps. Layouts: `.claude/skills/ba-brd/references/house-style.md` (Shape B section 5, Shape A section 4).

## Steps
1. Get the actors and swimlanes (passenger, officer, ABC gate, BIO, PIBICS, APPS ...) and the trigger and end states.
2. **As-Is** as a numbered table in house form: `ลำดับที่ | รายละเอียดการทำงานและตรวจสอบเงื่อนไข | ผลการตัดสินใจ`. Each decision row states **both** outcomes (pass / fail).
3. **Diagram** as Mermaid `flowchart TD` with swimlane `subgraph`s. Render check: keep node text short, quote labels containing brackets or Thai punctuation.
4. **Completeness checks** (do not deliver the process until each holds, or is listed as an open question):
   - every decision has a failure path and the failure path has a destination (e.g. manual counter + message text)
   - every external system call has a timeout / offline row
   - every loop has an exit; every end state is named
   - every configurable value is marked as configurable and says where it is configured
5. **To-Be** in the same layout; mark each step `unchanged` / `changed` / `new` against As-Is.
6. **Gap analysis** (house 4.4): `ลำดับ | ประเด็น (Gap) | แนวทางแก้ไข | ผลกระทบ`. A gap with no impacted system/team named is unfinished.

## Guardrails
- Describe what the source says happens, not what would be sensible. Missing step -> `[ต้องยืนยัน]`.
- Do not mix As-Is and To-Be rows in one table.
- Tag lines `[SRC: file §]` / `[PROPOSED]`.

## Output
Tables + Mermaid block + gap table + list of unanswered questions.
