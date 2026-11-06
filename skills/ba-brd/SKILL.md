---
name: ba-brd
description: Use when drafting or restructuring a Business Requirement Document (BRD), or an SRS per GL-DEV-007, from grouped requirements, meeting notes or a TOR - "เขียน BRD", "ร่าง requirement", "ทำ SRS". Produces the house format used in the PJ-AOT012 ABC project.
---

# ba-brd

Draft a BRD (or SRS) in the house format. Read `.claude/skills/ba-brd/references/house-style.md` first; it holds the two BRD shapes, ID schemes and the SRS layout.

## Steps
1. **Pick the shape.** Ask once if unclear: Shape A (feature/process, default) or Shape B (rule/config heavy), or SRS. Do not mix.
2. **Inventory the inputs** (TOR, MOM, previous BRD version, wireframes). Read them; note file + section for each fact.
3. **Draft section by section** following the shape. Every requirement line carries a source tag:
   - `[SRC: <file> §<n>]` - taken from an input
   - `[PROPOSED]` - your inference; the reviewer must confirm or delete it
4. **Do not fill gaps by guessing.** Where an input is silent (owner, threshold, KPI baseline, TOR clause), write `[ต้องยืนยัน: <question>]` and list every such item at the end under "คำถามที่ค้างอยู่".
5. **Link as you go:** each BR gets a TOR No. (or an explicit `เพิ่มเติมจาก TOR`), each story lists its BR Nos., every BR is referenced by at least one story. Hand off to `ba-story` for stories and `ba-review` for a final check.
6. **Document control:** fill header/revision rows only with known facts. Never invent names, dates, document codes or approvers; leave `[ต้องยืนยัน]`. Preparer and reviewer should be different people: flag it if they are not.

## Output
A `.md` draft (convertible to docx later) in the user's chosen path, Thai text with English terms, plus the open-questions list in the reply. Do not claim the draft is approved or complete while any `[ต้องยืนยัน]` remains.
