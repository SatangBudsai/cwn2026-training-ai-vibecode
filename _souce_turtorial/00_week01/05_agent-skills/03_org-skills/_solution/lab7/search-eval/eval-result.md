# ผลวัด "หา skill เจอไหม"

60 คำค้น · 23 skill · BM25 (Thai char-trigram + English words)

| ชุด | hit@1 | hit@5 |
|---|---|---|
| A | 59/60 (98.3%) | 59/60 (98.3%) |
| B | 58/60 (96.7%) | 60/60 (100%) |
| C | 58/60 (96.7%) | 60/60 (100%) |

- A = cards-header.json (name + description) · B = cards-full.json (+ summary) · C = B top-k + skill ที่ต้องใช้คู่กัน (uses/follows ทางตรง+อ้อม)
- คู่ที่ต้องใช้ร่วมกัน (skill ที่ถูก → uses/follows ของมัน): 93 คู่ · อยู่ใน B top-5 24 คู่ · อยู่ใน C 93 คู่ · คำค้นที่ได้ skill + คู่ครบ 54/54

## รายข้อ

| # | คำค้น | ผู้พิมพ์ | ที่ถูก | A อันดับที่ | B อันดับที่ | C@5 | B อันดับ 1 |
|---|---|---|---|---|---|---|---|
| 1 | ดีลนี้อนุมัติได้ไหม | md-somchai | exec:deal-approval | **1** | **1** | ✓ | exec:deal-approval |
| 2 | สรุปความเสี่ยงของดีลนี้ให้หน่อย | md-somchai | exec:deal-approval | **1** | **1** | ✓ | exec:deal-approval |
| 3 | กำไรพอไหม ควรรับงานนี้หรือเปล่า | md-somchai | exec:deal-approval | **1** | **1** | ✓ | exec:deal-approval |
| 4 | ทำสไลด์ประชุมผู้บริหารเดือนนี้ | exec-ploy | exec:exec-deck | **1** | **1** | ✓ | exec:exec-deck |
| 5 | สรุป KPI เดือนที่แล้วเป็นสไลด์ | exec-ploy | exec:exec-deck | **1** | **1** | ✓ | exec:exec-deck |
| 6 | เตรียม deck ให้ MD | exec-ploy | exec:exec-deck | **1** | **1** | ✓ | exec:exec-deck |
| 7 | ทำ proposal ให้ลูกค้าธนาคาร | sales-nida | sales:sales-proposal | **1** | **1** | ✓ | sales:sales-proposal |
| 8 | ร่างข้อเสนอโครงการตาม TOR | sales-nida | sales:sales-proposal | **1** | **1** | ✓ | sales:sales-proposal |
| 9 | ทำโปรให้ลูกค้าหน่อย | sales-nida | sales:sales-proposal | **1** | **1** | ✓ | sales:sales-proposal |
| 10 | เขียนอีเมลตามลูกค้าหลังประชุม | sales-krit | sales:follow-up-email | **1** | **1** | ✓ | sales:follow-up-email |
| 11 | ลูกค้าเงียบไป 2 อาทิตย์ ช่วยตามหน่อย | sales-krit | sales:follow-up-email | **1** | **1** | ✓ | sales:follow-up-email |
| 12 | ร่างเมลสรุปนัดหมายถัดไป | sales-krit | sales:follow-up-email | **1** | **1** | ✓ | sales:follow-up-email |
| 13 | ทำ spec จาก TOR นี้ | sa-ton | sa:req-to-spec | **1** | **1** | ✓ | sa:req-to-spec |
| 14 | แตก requirement เป็นหัวข้อให้หน่อย | sa-ton | sa:req-to-spec | **1** | **1** | ✓ | sa:req-to-spec |
| 15 | เขียน spec พร้อมแผนทดสอบ | sa-ton | sa:req-to-spec | **1** | **1** | ✓ | sa:req-to-spec |
| 16 | วาด architecture ระบบนี้ | sa-ice | sa:arch-template | **1** | **1** | ✓ | sa:arch-template |
| 17 | ออกแบบโครงระบบให้หน่อย | sa-ice | sa:arch-template | **1** | **1** | ✓ | sa:arch-template |
| 18 | ระบบจองคิวควรแบ่ง service ยังไง | sa-ice | sa:arch-template | **1** | **1** | ✓ | sa:arch-template |
| 19 | รีวิวโค้ดนี้ตามมาตรฐานทีม | dev-pond | dev:coding-standard | **1** | **1** | ✓ | dev:coding-standard |
| 20 | โค้ดนี้ผิดมาตรฐานตรงไหน | dev-pond | dev:coding-standard | **1** | **1** | ✓ | dev:coding-standard |
| 21 | เขียนให้ตรงสไตล์ทีม | dev-pond | dev:coding-standard | **1** | **1** | ✓ | dev:coding-standard |
| 22 | ขึ้นโปรเจกต์ใหม่ให้หน่อย | dev-mew | dev:project-scaffold | **1** | **1** | ✓ | dev:project-scaffold |
| 23 | สร้างโครงระบบสมาชิกกับชำระเงิน | dev-mew | dev:project-scaffold | **1** | **1** | ✓ | dev:project-scaffold |
| 24 | เริ่มโปรเจกต์ตาม spec | dev-mew | dev:project-scaffold | **1** | **1** | ✓ | dev:project-scaffold |
| 25 | ทดสอบเว็บตามแผน | qa-mint | qa:test-from-plan | **1** | **1** | ✓ | qa:test-from-plan |
| 26 | ดูแผนทดสอบแล้วบอกว่าพร้อมรันไหม | qa-mint | qa:test-from-plan | **1** | **3** | ✓ | sa:req-to-spec |
| 27 | รัน test ตาม TEST-PLAN | qa-mint | qa:test-from-plan | **1** | **1** | ✓ | qa:test-from-plan |
| 28 | เขียนรายงานบั๊กนี้ให้หน่อย | qa-bank | qa:bug-report | **1** | **1** | ✓ | qa:bug-report |
| 29 | สรุปบั๊กให้ dev แก้ได้ | qa-bank | qa:bug-report | **1** | **1** | ✓ | qa:bug-report |
| 30 | แจ้งบั๊กพร้อมขั้นตอนทำซ้ำ | qa-bank | qa:bug-report | **1** | **1** | ✓ | qa:bug-report |
| 31 | เตรียม checklist ขึ้นระบบ | ops-art | devops:deploy-checklist | **1** | **1** | ✓ | devops:deploy-checklist |
| 32 | จะ deploy คืนนี้ ต้องเช็กอะไรบ้าง | ops-art | devops:deploy-checklist | **1** | **1** | ✓ | devops:deploy-checklist |
| 33 | แผน rollback ถ้าพัง | ops-art | devops:deploy-checklist | **1** | **1** | ✓ | devops:deploy-checklist |
| 34 | สรุปเหตุระบบล่มเมื่อคืน | ops-fon | devops:postmortem | **1** | **1** | ✓ | devops:postmortem |
| 35 | เขียน postmortem ให้หน่อย | ops-fon | devops:postmortem | **1** | **1** | ✓ | devops:postmortem |
| 36 | หาต้นเหตุ incident นี้ | ops-fon | devops:postmortem | **1** | **1** | ✓ | devops:postmortem |
| 37 | วางแผนทดลองโมเดลพยากรณ์ | ml-jay | mlops:mlflow-experiment | **1** | **1** | ✓ | mlops:mlflow-experiment |
| 38 | บันทึกผลการทดลองรอบนี้ | ml-jay | mlops:mlflow-experiment | **1** | **1** | ✓ | mlops:mlflow-experiment |
| 39 | เทียบโมเดลทั้งสามรอบ | ml-jay | mlops:mlflow-experiment | **1** | **1** | ✓ | mlops:mlflow-experiment |
| 40 | ปล่อยโมเดลรุ่นใหม่ | ml-pim | mlops:model-release | **1** | **1** | ✓ | mlops:model-release |
| 41 | เตรียม release โมเดลพยากรณ์คิว | ml-pim | mlops:model-release | **1** | **1** | ✓ | mlops:model-release |
| 42 | เกณฑ์ rollback โมเดล | ml-pim | mlops:model-release | **1** | **1** | ✓ | mlops:model-release |
| 43 | ทำประกาศรับสมัคร dev | hr-fah | hr:jd-writer | **1** | **1** | ✓ | hr:jd-writer |
| 44 | เขียน JD ตำแหน่งนี้ให้หน่อย | hr-fah | hr:jd-writer | **1** | **1** | ✓ | hr:jd-writer |
| 45 | โปรเจกต์ใหม่ต้องรับคนเพิ่ม | hr-fah | hr:jd-writer | **1** | **1** | ✓ | hr:jd-writer |
| 46 | เตรียมของต้อนรับพนักงานใหม่ | hr-oat | hr:onboarding-pack | **1** | **1** | ✓ | hr:onboarding-pack |
| 47 | คนใหม่ฝ่าย dev เข้าวันจันทร์ | hr-oat | hr:onboarding-pack | **1** | **1** | ✓ | hr:onboarding-pack |
| 48 | onboarding checklist | hr-oat | hr:onboarding-pack | **1** | **1** | ✓ | hr:onboarding-pack |
| 49 | คิดราคาโปรเจกต์นี้ | fin-joy | finance:pricing-calc | **1** | **1** | ✓ | finance:pricing-calc |
| 50 | ดีลนี้กำไรเท่าไหร่ | fin-joy | finance:pricing-calc | **1** | **1** | ✓ | finance:pricing-calc |
| 51 | ทำใบเสนอราคา | fin-joy | finance:pricing-calc | **1** | **1** | ✓ | finance:pricing-calc |
| 52 | ออกใบแจ้งหนี้งวดแรก | fin-nok | finance:invoice-check | **1** | **1** | ✓ | finance:invoice-check |
| 53 | ตรวจใบแจ้งหนี้นี้ให้หน่อย | fin-nok | finance:invoice-check | **1** | **1** | ✓ | finance:invoice-check |
| 54 | ยอดในใบแจ้งหนี้ถูกไหม | fin-nok | finance:invoice-check | **1** | **1** | ✓ | finance:invoice-check |
| 55 | มี skill สำหรับเรื่องนี้ไหม | plat-ken | core:skill-finder | **1** | **1** | ✓ | core:skill-finder |
| 56 | แผนกอื่นทำเรื่องนี้ยังไง | plat-ken | core:skill-finder | **1** | **1** | ✓ | core:skill-finder |
| 57 | ถ้าแก้ skill นี้กระทบใคร | plat-ken | core:skill-finder | **1** | **1** | ✓ | core:skill-finder |
| 58 | เอกสารนี้ใส่ข้อมูลลูกค้าได้ไหม | plat-may | core:customer-data-policy | **1** | **1** | ✓ | core:customer-data-policy |
| 59 | ทำสไลด์ตามแบรนด์บริษัท | plat-may | core:customer-data-policy | 6 | **4** | ✓ | core:brand-guide |
| 60 | เช็ก PDPA ให้หน่อย | plat-may | core:customer-data-policy | **1** | **1** | ✓ | core:customer-data-policy |

อันดับ **ตัวหนา** = อยู่ใน top-5 · – = ไม่มีคะแนนเลย
