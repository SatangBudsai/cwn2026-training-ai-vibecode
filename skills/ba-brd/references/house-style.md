# House style for BA documents (derived from PJ-AOT012 ABC samples)

Source samples (read-only, outside this repo):
`C:\src\Work\Automatic Channel\PJ-AOT012_Automated Border Control ...\20 SE-Software Engineer\`
- `20-01 Business Requirement Document\Requirement_ABC II_...V.2.1.docx` -> **Shape A** (newer, Mar 2026)
- `20-01 Business Requirement Document\ABC_P2_BRD ...V1.0.docx` -> **Shape B** (2025, rule/config-heavy)
- `20-00 Dev-Coding Standard\GL-DEV-007_Analysis and design.docx` -> org standard for SRS / FS / SDS
- `20-02 SRS`, `20-03 RTM`, `20-04 FS` folders are **empty** in the sample: no filled example exists. Follow GL-DEV-007 only.

Do not trust filenames: `ABC_P2_BRD ...ลูกเรือ...V1.0.docx` is named for crew inspection but its content is the incoming-passenger / e-Visa scope. Read the document's own title block.

Language: Thai body text, English for technical terms and IDs. Keep the document's own wording for system names.

## IDs (never invent a scheme; reuse these)
| Item | Format | Notes |
|---|---|---|
| TOR clause | `TOR No.` = clause number (e.g. `4.2.5`) or `เพิ่มเติมจาก TOR` | Shape A uses the latter for 13 of 15 BRs: weak trace, flag it |
| Business requirement | `BR-01`, `BR-02` ... | Priority = MoSCoW (`Must Have` ...) |
| User story | `US-01` ... | Each lists the `BR No.` it satisfies |
| Use case (BRD, Shape B) | `6.2.2.1`; extension `Extension 6.2.2.1 a:` | Number = section number |
| Use case (SRS, GL-DEV-007) | `UC-xxx-001` (`xxx` = sub-system abbreviation) | Importance High/Medium/Low |

## Shape A: "Requirement" style (default for new features)
Header: ชื่อเอกสาร / Version / Last Updated; ผู้จัดทำ / ผู้สอบทาน / ผู้อนุมัติ; Document Detail (รหัสเอกสาร, เวอร์ชั่น, ชื่อเอกสาร, วันที่มีผลบังคับใช้); Revision History (Version | Date | Changes Description | Modified By | Reviewed By).
1. ที่มาและเหตุผล (Background & Objective)
   - Project Objectives
   - Business Problem / Opportunity table: `ลำดับ | ปัญหาที่พบ (Pain Points) | แนวทางการแก้ไข (Business Opportunity) | ประเภท` (System / Process / Accuracy / Compliance)
   - Business Goals: Outcome Target / Process Target / Technical Target
2. ขอบเขตงาน: In-Scope grouped as Process / Functional / Data & Integration / Test & Delivery / Reporting & Audit / Non-Functional; Out-of-Scope; closing note that out-of-scope changes go through Change Request + Steering Committee.
3. Stakeholders: `ลำดับ | Stakeholder | บทบาท (Role) | ความรับผิดชอบ`
4. Business Impact Analysis: 4.1 As-Is, 4.2 ปัญหาหลัก, 4.3 To-Be, 4.4 Gap Analysis `ลำดับ | ประเด็น (Gap) | แนวทางแก้ไข | ผลกระทบ`
5. Business Requirements
   - 5.1 High-level table: `TOR No. | BR No. | รายละเอียด | Priority`
   - 5.2 User Journey: actors table `ลำดับ | บทบาท (Actor) | รายละเอียด`, then one 2-column table per story with rows:
     `US No. | US Name | TOR No. | BR No. | กระบวน (Main Business Flow) | ผู้ใช้งานที่เกี่ยวข้อง | เงื่อนไขก่อนเริ่ม (Pre-Conditions) | เงื่อนไขหลังเริ่ม (Post-Conditions) | Business Rules ที่เกี่ยวข้อง`
6. KPI / Success Criteria: `ลำดับ | เกณฑ์ | ค่าปัจจุบัน (Baseline) | เป้าหมาย (Target) | ระยะเวลาการวัดผล`

## Shape B: "BRD" style (rule / configuration heavy changes)
Header table: Project Name / Project ID / Priority / Customer; Prepared By / Reviewed By (Name | Role | Signature | Date); Revision History; summary table of Main Success Scenarios and Use Cases.
1. ที่มา  2. เป้าหมายของ Scope  3. เงื่อนไขการใช้ระบบ (+ current flow)  4. เงื่อนไขการตรวจสอบ: rule tables where tunable values are written `X` and configured in Centralized Management, with "log every config change"  5. Main Success Scenario: current vs new flow as `ลำดับที่ | รายละเอียดการทำงานและตรวจสอบเงื่อนไข | ผลการตัดสินใจ`, plus wireframe links (Figma)  6. Use Cases: one table per case (`ขั้นตอนการทำงานของระบบ`) with `Extension <n> a/b/c:` rows  7. Behaviour when each external system is offline  8. ข้อจำกัดของระบบ (with worked examples)  9. ข้อมูลประกอบ.

## SRS (GL-DEV-007), when asked for one
Introduction (Purpose, Scope, Assumptions, Interfaces with Other Systems, Definitions/Acronyms table, References table) -> Business Requirements Summary -> Software Requirements: Use Case Model, then per use case: Use Case ID, Name, Importance Level, Purpose, Actor, Pre-Condition, Post-Condition, Constraint, Basic Flow of Events, Extension -> Appendix A System Architecture -> Appendix B Screen & Report Design.
FS (same guideline) adds per function: Purpose (UC ID, actors, pre/post), Tables & Fields, Screen, Report, Function Flow, Error Handling.

## Domain conventions seen in the ABC documents
- Every failed check ends the same way: show "กรุณาใช้ช่องตรวจหนังสือเดินทางปกติ" and send the passenger to the manual counter. A flow with no failure path is incomplete.
- External systems: ABC (AOT/CWN), BIO (สตม./MSC), PIBICS (สตม./โสมาภา), APPS (AOT/โสมาภา), TDAC (named in the sample, not defined there: ask). Each needs an offline row (BIO, PIBICS, APPS are covered in Shape B section 7).
- Two doors: Gate 1 (entry) and Gate 2 (exit). Lane types: Normal Lane, Special Assistance Lane.
- Tunable thresholds live in Centralized Management, not in code, and changes are logged.
