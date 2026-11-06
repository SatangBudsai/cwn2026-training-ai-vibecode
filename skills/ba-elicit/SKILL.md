---
name: ba-elicit
description: Use when turning meeting minutes (MOM), transcripts, emails or a TOR into candidate requirements, open questions and assumptions - "สรุป MOM เป็น requirement", "ประชุมเมื่อกี้ได้อะไรบ้าง", "เตรียมคำถามสำหรับ workshop".
---

# ba-elicit

Extract requirements from raw conversation without promoting anything to a confirmed requirement.

## Steps
1. Read the whole input. Identify speakers/stakeholders and their roles (Business Owner, user, system owner, SI ...).
2. Produce four lists, each row quoting the source (`[SRC: file, line/time, speaker]`):
   - **Candidate requirements**: `# | statement | stakeholder | type (functional / rule / NFR / constraint) | status: Stated`
   - **Decisions made** (who decided, when)
   - **Conflicts**: two sources disagree (e.g. different thresholds, owners, dates). Show both quotes. Never pick a winner.
   - **Open questions**, grouped by who can answer, each with why it blocks work.
3. **Assumptions** you would otherwise have to make: list them as questions, not as facts.
4. Rewrite vague wording into testable form only as a `[PROPOSED]` rewrite next to the original quote ("fast" -> a measurable target the stakeholder must confirm).
5. Status values: `Stated` -> `Confirmed` (stakeholder signed off) -> `Baselined`. This skill only ever produces `Stated`.

## Guardrails
- Absence of a topic in the notes is not agreement. Say "not discussed", not "no objection".
- Do not merge two stakeholders' wishes into one requirement; keep them separate until confirmed.
- Hand confirmed items to `ba-brd` / `ba-story`.

## Output
The four lists + assumption-questions, Thai with English terms. If the user wants to send the question list out, format it as a short numbered message per stakeholder.
