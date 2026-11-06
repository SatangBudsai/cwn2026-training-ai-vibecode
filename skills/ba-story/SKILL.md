---
name: ba-story
description: Use when turning business requirements into user stories with acceptance criteria, or checking existing stories - "เขียน user story", "acceptance criteria", "แตก requirement เป็น story", "INVEST". Outputs the house US table plus Given/When/Then.
---

# ba-story

Turn requirements (BR-xx, TOR clauses, MOM) into user stories. House US table layout is in `.claude/skills/ba-brd/references/house-style.md` (Shape A, section 5.2).

## Steps
1. List the actors first (people **and** systems: passenger, officer, ABC, BIO, PIBICS ...). A story with no named actor is not written yet.
2. One story = one actor goal that can be accepted on its own. Split by actor, by outcome, and by failure path. Failure paths are their own stories (e.g. "PIBICS offline", "write to BIO fails"), not footnotes.
3. For each story fill the house table: `US No. | US Name | TOR No. | BR No. | Main Business Flow | User Related | Pre-Conditions | Post-Conditions | Business Rules`.
4. Add acceptance criteria as `Given / When / Then`, at least: one happy path, one per Business Rule, one per failure path. Use concrete values from the source (e.g. "Response Time <= 30 s"), never "fast".
5. INVEST check, reported as a short table per story (Independent, Negotiable, Valuable, Estimable, Small, Testable). Mark a failing letter with the fix, not just a tick.
6. Traceability: every story cites >= 1 BR; every BR in scope appears in >= 1 story. Report any BR with no story.

## Guardrails
- **Pre-Conditions are states that hold before the flow; Post-Conditions are states after it succeeds.** Do not write an outcome or a failure result as a precondition, and do not let a post-condition contradict the main flow (see the US-06 example in `ba-review`).
- No invented numbers, screens, messages or rules. Unknown -> `[ต้องยืนยัน: ...]` and ask.
- Label every line `[SRC: file §]` or `[PROPOSED]`.

## Output
Stories in house-table form + a GWT list, then: uncovered BRs, open questions. Language follows the source document.
