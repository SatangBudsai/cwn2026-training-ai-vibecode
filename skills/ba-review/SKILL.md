---
name: ba-review
description: Use when reviewing a BRD, SRS, user stories or requirement list for ambiguity, contradictions, missing failure paths, untestable wording and broken traceability - "รีวิว BRD", "เช็ค requirement", "เอกสารนี้ขัดกันไหม", "ผ่านไหม".
---

# ba-review

Read-only review. Never edit the document; report findings. Structure reference: `.claude/skills/ba-brd/references/house-style.md`. For ID cross-checks run `ba-trace`'s script (`.claude/skills/ba-trace/scripts/br_orphans.py <file.docx>`).

## Checklist (check each, cite `file §/line` for every finding)
1. **Same fact, same value everywhere.** Compare goals vs KPIs vs BRs vs scope for any number, name, date, threshold. Differences are findings.
2. **IDs:** numbering gaps/duplicates, BR defined but referenced by no story, story citing an undefined BR, `TOR No.` left as "เพิ่มเติมจาก TOR" (list the count).
3. **Testable wording:** no "fast / user-friendly / appropriate / etc." without a number or an enumerated list.
4. **Failure paths:** every check has a fail outcome with a destination; every external system has an offline/timeout behaviour.
5. **Story internal consistency:** Pre-Conditions are pre-states; Post-Conditions agree with the Main Flow and Business Rules; no outcome copy-pasted from a sibling story.
6. **Scope:** each in-scope item maps to a BR; each out-of-scope item is not silently required elsewhere.
7. **Document control:** version in header vs filename vs revision table; preparer != reviewer; placeholders (`[...]`) still present; revision history duplicated in two tables.
8. **Terms:** system names/acronyms used but not defined.

## Report format
Table: `# | severity | where | finding | evidence (quote) | suggested fix`. Severity: **High** = would build/test the wrong thing; **Med** = ambiguity two readers resolve differently; **Low** = hygiene. Then a one-line verdict. Mark anything you could not verify as `not checked`, never as "OK".

## Worked example (real, from `Requirement_ABC II_...V.2.1.docx`; verified by reading the text)
| # | sev | finding | evidence |
|---|---|---|---|
| 1 | High | Same metric, two targets: goal says average gate time <= 40 s, KPI #1 says <= 30 s | Business Goals "ไม่เกิน 40 วินาที" vs KPI "≤ 30 วินาที" |
| 2 | High | BR-13, BR-14, BR-15 (real-time sync, audit trail, interface log) are referenced by none of US-01..US-06 | US "BR No." rows list only BR-01..BR-12 |
| 3 | Med | US-06 contradicts itself: flow says the passenger is allowed through the gate, post-conditions say sent to manual and Biometric not recorded; "Pre-Conditions" holds outcomes ("มี Pending Record") | US-06 table |
| 4 | Low | Pain-point numbering skips 3 (1, 2, 4, 5) | Business Problem table |
| 5 | Low | Header "Version 1.0" while filename says V.2.1; preparer and reviewer are the same person; document code is an unfilled placeholder | header + Document Detail |
| 6 | Med | 13 of 15 BRs cite "เพิ่มเติมจาก TOR" instead of a clause number, so TOR coverage cannot be traced | High-level table |
