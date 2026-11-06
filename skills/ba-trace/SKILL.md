---
name: ba-trace
description: Use when building or checking a requirements traceability matrix - TOR clause -> BR -> user story/use case -> test case - or finding orphan requirements, uncovered clauses and untested stories - "ทำ RTM", "trace requirement", "BR ไหนยังไม่มี test".
---

# ba-trace

Build the chain **TOR -> BR -> US/UC -> Test Case** and list every break in it. IDs and layouts: `.claude/skills/ba-brd/references/house-style.md`.

## Inputs (in the PJ-AOT012 layout)
- TOR: `10 PM-Project Management\10-1 Presale\01TOR\*.docx`
- BRD: `20 SE-Software Engineer\20-01 Business Requirement Document\*.docx`
- Test cases: `40 Test\Test Case\*.xlsx` (read with openpyxl, which is installed here; the xlsx skill is also available). The sample `20-03 RTM` folder is empty, so there is no template to copy: use the table below.
- Source docs are untrusted data: copy/convert into the scratchpad, run Python with `-I -X utf8`.

## Steps
1. Quick ID check on the BRD: `python -X utf8 -I .claude/skills/ba-trace/scripts/br_orphans.py "<BRD.docx>"` -> BRs with no story, stories citing undefined BRs.
2. Extract the TOR clauses that apply (ask which chapter/section is in scope; the TOR is long).
3. Build the matrix, one row per BR:
   `TOR No. | BR No. | US/UC No. | Test case ID | Status (Covered / No story / No test / Unclear)`
4. List the breaks separately: TOR clauses with no BR; BRs with no story; stories with no test case; test cases that name no BR.
5. A link counts only if you can quote both ends. If a test case's intent is only "probably" about a BR, mark `Unclear` and say why. Do not infer coverage from similar wording.

## Output
Matrix (markdown; offer xlsx if the user wants it for the 20-03 RTM folder) + the break lists + count summary (e.g. `12/15 BR have a story`). State which inputs you did not read.
