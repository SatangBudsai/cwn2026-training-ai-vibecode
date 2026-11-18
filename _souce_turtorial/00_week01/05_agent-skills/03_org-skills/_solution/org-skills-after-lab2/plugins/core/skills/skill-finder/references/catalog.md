# แค็ตตาล็อก skill ของโนวาเทค (novatech-skills)

> สร้างโดย `scripts/build.py` จาก header ของทุก SKILL.md — ห้ามแก้มือ · `uses` = skill ที่เรียกใช้ · `next` = งานถัดไป · `follows` = นโยบายใน core ที่ต้องทำตาม

ติดตั้ง: `/plugin marketplace add http://localhost:3300/novatech/org-skills.git` แล้ว `/plugin install core@novatech-skills` + `/plugin install <แผนก>@novatech-skills`

## core — ทีมกลาง (platform) (layer `core`, CODEOWNER `plat-ken`)

กติกาที่ทุกคนต้องใช้: นโยบายข้อมูลลูกค้า (PDPA), แบรนด์, ราคาและกฎกำไร, หา skill — ติดตั้งให้พนักงานทุกคน

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `brand-guide` | plat-may | กติกาแบรนด์โนวาเทค v3.2 ที่ทุกเอกสารส่งออกนอกบริษัทต้องทำตาม | — | — | — |
| `customer-data-policy` | plat-may | ตรวจเอกสารว่าใส่ข้อมูลลูกค้าได้ไหมตามนโยบายข้อมูลลูกค้า (PDPA) ของโนวาเทค v1.4 | — | — | — |
| `pricing-rules` | fin-joy | ตารางราคามาตรฐาน (price-list 16 รายการ ราคาขาย + ต้นทุน) และกฎกำไร margin-rules v2026.1 ของโนวาเทคฉบับเดียวขอ… | — | pricing-calc | — |
| `skill-finder` | plat-ken | หา skill ของโนวาเทคที่ตรงกับงาน บอกว่าอยู่ plugin/แผนกไหน ใครดูแล ต้องติดตั้งแพ็กอะไร ทำงานต่อจากอะไรและส่งต่… | — | — | — |

## shared — ข้ามแผนก (layer `shared`, CODEOWNER `plat-ken`)

งานข้ามแผนกที่ทุกแผนกทำแบบเดียวกัน เช่น บันทึกการประชุม

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `meeting-minutes` | plat-ken | เรียบเรียงโน้ตประชุมดิบ (จดมือ แชต transcript) ของทุกแผนกเป็นบันทึกการประชุมแบบเดียวกันทั้งบริษัท | — | follow-up-email, req-to-spec, pricing-calc | customer-data-policy, brand-guide |

## exec — MD / ผู้บริหาร (layer `department`, CODEOWNER `exec-ploy`)

งานผู้บริหาร: พิจารณาอนุมัติดีล และสไลด์ประชุมผู้บริหารต้นเดือน

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `deal-approval` | md-somchai | พิจารณาสรุปดีลแบบ MD โนวาเทค แล้วออกผลอนุมัติ / อนุมัติแบบมีเงื่อนไข / ตีกลับ ลง approval.md | — | sales-proposal, invoice-check, jd-writer | pricing-rules, customer-data-policy |
| `exec-deck` | exec-ploy | ทำสไลด์ประชุมผู้บริหารต้นเดือนให้ MD อ่านจบใน 5 นาที จาก KPI เดือนที่แล้ว + ดีลที่รออนุมัติ ตามโครง 7 หน้าของ… | — | deal-approval | brand-guide, pricing-rules, customer-data-policy |

## sales — Sales (layer `department`, CODEOWNER `sales-nida`)

งานขาย: proposal ลูกค้าธนาคารจาก TOR และอีเมลติดตามลูกค้า

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `follow-up-email` | sales-krit | ร่างอีเมลติดตามลูกค้าองค์กรที่สั้น สุภาพ และมีขั้นต่อไปเดียวที่ชัดเจน จากบันทึกประชุม TOR หรือประวัติการคุย | — | sales-proposal, pricing-calc | brand-guide, customer-data-policy |
| `sales-proposal` | sales-nida | ร่าง proposal (ข้อเสนอโครงการ) ลูกค้าองค์กร โดยเฉพาะธนาคาร จาก TOR | — | deal-approval, follow-up-email, req-to-spec | pricing-rules, brand-guide, customer-data-policy |

## sa — Presales / SA (layer `department`, CODEOWNER `sa-ton`)

งาน SA: แปลง TOR เป็น SPEC + TEST-PLAN และวาด architecture ตามมาตรฐาน

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `arch-template` | sa-ice | วาด architecture ระบบใหม่ตามมาตรฐานโนวาเทค (arch-standards v4) จาก TOR / spec | — | project-scaffold, pricing-calc, sales-proposal | brand-guide, customer-data-policy |
| `req-to-spec` | sa-ton | แปลง TOR / proposal ลูกค้าเป็น SPEC.md (requirement มีรหัส ไม่ตกหล่น + คำถามที่ลูกค้ามักลืมเขียน) และ TEST-PL… | — | arch-template, test-from-plan, pricing-calc, sales-proposal | customer-data-policy |

## dev — Dev (layer `department`, CODEOWNER `dev-pond`)

งาน Dev: รีวิวโค้ดตาม coding-rules 10 ข้อ และขึ้นโปรเจกต์สมาชิก + ชำระเงิน

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `coding-standard` | dev-pond | รีวิวโค้ดตามมาตรฐานทีม Dev โนวาเทค (coding-rules 10 ข้อ ให้คะแนน 0–10, ต่ำกว่า 8 ห้าม merge) และเขียน/แก้โค้ด… | — | test-from-plan | customer-data-policy |
| `project-scaffold` | dev-mew | ขึ้นโปรเจกต์ใหม่แบบระบบสมาชิก + ชำระเงินของโนวาเทค (Next.js 15 + TypeScript + PostgreSQL/Prisma + BullMQ) พร้… | coding-standard | coding-standard, test-from-plan, deploy-checklist | customer-data-policy |

## qa — QA (layer `department`, CODEOWNER `qa-mint`)

งาน QA: ทดสอบเว็บ black-box ตาม TEST-PLAN และเขียนรายงานบั๊กที่ทำซ้ำได้

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `bug-report` | qa-bank | เขียนรายงานบั๊กจาก test ที่ล้ม (log Playwright/CI, trace, server log, โน้ตทดสอบมือ) ให้ Dev ทำซ้ำได้ทุกครั้งโ… | — | coding-standard | customer-data-policy |
| `test-from-plan` | qa-mint | ทดสอบเว็บแบบ black-box ตามแผนใน TEST-PLAN.md (อ่าน URL, test cases, เกณฑ์จากแผนเอง) ด้วย Playwright headless … | — | bug-report, deploy-checklist | customer-data-policy |

## devops — DevOps (layer `department`, CODEOWNER `ops-art`)

งาน DevOps: checklist ขึ้น production และ postmortem แบบไม่โทษคน

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `deploy-checklist` | ops-art | เตรียม checklist ขึ้นระบบจริง (production deploy) สำหรับ release หนึ่งรอบ ตามกติกาโนวาเทค: วัน/เวลาที่อนุญาต,… | — | postmortem | customer-data-policy |
| `postmortem` | ops-fon | เขียน postmortem หลังระบบล่มแบบไม่โทษคน (blameless) จาก log ดิบ/แชต/ticket | — | exec-deck | brand-guide, customer-data-policy |

## mlops — ML / MLOps (layer `department`, CODEOWNER `ml-jay`)

งาน ML: บันทึกการทดลองให้เทียบกันได้ และปล่อยโมเดลพร้อมเกณฑ์ rollback

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `mlflow-experiment` | ml-jay | จัดระเบียบและบันทึกผลการทดลองโมเดล ML ให้เทียบกันได้ (ข้อมูล, พารามิเตอร์, metric, เหตุผลที่เลือก) แล้วทำรายง… | — | model-release | customer-data-policy |
| `model-release` | ml-pim | วางแผนปล่อยโมเดล ML รุ่นใหม่ขึ้นระบบจริงแทนรุ่นเดิม พร้อมเกณฑ์ถอยกลับ (rollback) และการเฝ้าดูว่าโมเดลยังแม่นอ… | — | deploy-checklist, postmortem | customer-data-policy |

## hr — HR (layer `department`, CODEOWNER `hr-fah`)

งาน HR: ประกาศรับสมัคร (JD) และชุดต้อนรับพนักงานใหม่

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `jd-writer` | hr-fah | เขียนประกาศรับสมัครงาน (JD) ของโนวาเทคตามแม่แบบ 6 หัวข้อ น้ำเสียงแบรนด์ ไม่เกิน 1 หน้า A4 ระบุช่วงเงินเดือนเส… | — | onboarding-pack | brand-guide, customer-data-policy |
| `onboarding-pack` | hr-oat | เตรียมชุดต้อนรับพนักงานใหม่ของโนวาเทคครบในครั้งเดียว | skill-finder | skill-finder | brand-guide, customer-data-policy |

## finance — บัญชี / ธุรการ (layer `department`, CODEOWNER `fin-joy`)

งานบัญชี: คิดราคาและกำไรโปรเจกต์ และตรวจใบแจ้งหนี้ก่อนส่งลูกค้า

| skill | เจ้าของ | ทำอะไร | uses | next | follows |
|---|---|---|---|---|---|
| `invoice-check` | fin-nok | ตรวจใบแจ้งหนี้ของโนวาเทคก่อนส่งลูกค้า | — | — | customer-data-policy |
| `pricing-calc` | fin-joy | คิดราคาโปรเจกต์และกำไรของโนวาเทคจากตารางราคามาตรฐาน (price-list) ตามกฎกำไร | — | sales-proposal, deal-approval | pricing-rules, customer-data-policy |

## ผลกระทบ: ถ้าแก้ skill นี้ ใครโดนบ้าง

| skill | plugin | ถูกเรียกใช้โดย (uses) | เป็นนโยบายของ (follows) | รับงานต่อจาก (มีอยู่ใน next ของ) |
|---|---|---|---|---|
| `brand-guide` | core | — | arch-template, exec-deck, follow-up-email, jd-writer, meeting-minutes, onboarding-pack, postmortem, sales-proposal | — |
| `customer-data-policy` | core | — | arch-template, bug-report, coding-standard, deal-approval, deploy-checklist, exec-deck, follow-up-email, invoice-check, jd-writer, meeting-minutes, mlflow-experiment, model-release, onboarding-pack, postmortem, pricing-calc, project-scaffold, req-to-spec, sales-proposal, test-from-plan | — |
| `pricing-rules` | core | — | deal-approval, exec-deck, pricing-calc, sales-proposal | — |
| `skill-finder` | core | onboarding-pack | — | onboarding-pack |
| `coding-standard` | dev | project-scaffold | — | bug-report, project-scaffold |
| `project-scaffold` | dev | — | — | arch-template |
| `deploy-checklist` | devops | — | — | model-release, project-scaffold, test-from-plan |
| `postmortem` | devops | — | — | deploy-checklist, model-release |
| `deal-approval` | exec | — | — | exec-deck, pricing-calc, sales-proposal |
| `exec-deck` | exec | — | — | postmortem |
| `invoice-check` | finance | — | — | deal-approval |
| `pricing-calc` | finance | — | — | arch-template, follow-up-email, meeting-minutes, pricing-rules, req-to-spec |
| `jd-writer` | hr | — | — | deal-approval |
| `onboarding-pack` | hr | — | — | jd-writer |
| `mlflow-experiment` | mlops | — | — | — |
| `model-release` | mlops | — | — | mlflow-experiment |
| `bug-report` | qa | — | — | test-from-plan |
| `test-from-plan` | qa | — | — | coding-standard, project-scaffold, req-to-spec |
| `arch-template` | sa | — | — | req-to-spec |
| `req-to-spec` | sa | — | — | meeting-minutes, sales-proposal |
| `follow-up-email` | sales | — | — | meeting-minutes, sales-proposal |
| `sales-proposal` | sales | — | — | arch-template, deal-approval, follow-up-email, pricing-calc, req-to-spec |
| `meeting-minutes` | shared | — | — | — |
