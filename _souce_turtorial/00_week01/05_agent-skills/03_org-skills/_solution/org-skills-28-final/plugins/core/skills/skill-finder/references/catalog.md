# catalog: คลัง skill novatech-skills

> สร้างจากหัวไฟล์ SKILL.md ด้วย `scripts/build-catalog.py` ห้ามแก้ไฟล์นี้เอง

มี 12 plugin · 28 skill

## plugin และผู้ดูแล

| plugin | ผู้ดูแล (CODEOWNER) | จำนวน skill | ขอบเขต |
|---|---|---:|---|
| `core` | `@plat-ken` | 4 | ของที่ทุกคนต้องใช้: นโยบายข้อมูลลูกค้า แบรนด์ กติการาคา และการหา skill ในคลัง |
| `shared` | `@plat-ken` | 1 | งานข้ามแผนกที่ไม่มีแผนกไหนเป็นเจ้าของ เช่น บันทึกประชุม |
| `exec` | `@exec-ploy` | 5 | แผนก MD / ผู้บริหาร: อนุมัติดีล สไลด์ผู้บริหาร และรีวิวของผู้บริหารสาย |
| `sales` | `@sales-nida` | 2 | แผนก Sales: proposal และอีเมลติดตามลูกค้า |
| `sa` | `@sa-ton` | 2 | แผนก Presales / SA: แตก TOR เป็น spec และวาด architecture |
| `product` | `@pm-beam` | 2 | แผนก Product: เขียน PRD และแผนเลิกให้บริการ |
| `dev` | `@dev-pond` | 2 | แผนก Dev: รีวิวโค้ดตามมาตรฐานทีม และขึ้นโปรเจกต์ใหม่ |
| `qa` | `@qa-mint` | 2 | แผนก QA: ทดสอบเว็บตามแผน และเขียนรายงานบั๊ก |
| `devops` | `@ops-art` | 2 | แผนก DevOps: checklist ขึ้นระบบจริง และ postmortem |
| `mlops` | `@ml-jay` | 2 | แผนก ML / MLOps: บันทึกการทดลอง และปล่อยโมเดล |
| `hr` | `@hr-fah` | 2 | แผนก HR: ประกาศรับสมัคร และชุดต้อนรับพนักงานใหม่ |
| `finance` | `@fin-joy` | 2 | แผนกบัญชี / ธุรการ: คิดราคาโปรเจกต์ และตรวจใบแจ้งหนี้ |

## skill ทั้งหมด

### core

#### `brand-guide`
- เรียกใช้เป็น: `core:brand-guide` · ชั้น: core · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `plat-may` · ผู้ดูแล plugin: `@plat-ken`
- ทำอะไร: คู่มือแบรนด์โนวาเทค v3.2 สี ฟอนต์ น้ำเสียง โครงสไลด์ โครงเอกสาร และการใช้โลโก้ เป็นต้นฉบับเดียวให้ skill อื่นอ้าง ใช้เมื่อผู้ใช้ถาม "สีแบรนด์คืออะไร", "ใช้ฟอนต์อะไร", "เขียนน้ำเสียงแบบบริษัท", "ทำสไลด์ตามแบรนด์บริษัท" หรือเมื่อ skill อื่นอ้างถึง core:brand-guide
- uses: — · next: — · follows: —

#### `customer-data-policy`
- เรียกใช้เป็น: `core:customer-data-policy` · ชั้น: core · เวอร์ชัน: 0.2.0
- เจ้าของ skill: `plat-may` · ผู้ดูแล plugin: `@plat-ken`
- ทำอะไร: ตรวจเอกสารว่าใส่ข้อมูลลูกค้าได้ไหมตามนโยบายข้อมูลลูกค้า (PDPA) ของโนวาเทค v1.4 — หาเลขบัตรประชาชน เบอร์มือถือ เลขบัญชี/บัตร ชื่อลูกค้าปลายทาง แล้วตัดสินทีละจุด ห้าม/mask/ได้ พร้อมข้อความแทนที่และฉบับแก้ ใช้เมื่อผู้ใช้พิมพ์ "เอกสารนี้ใส่ข้อมูลลูกค้าได้ไหม", "เช็ก PDPA ให้หน่อย", "ข้อมูลนี้ส่งลูกค้าได้ไหม", "ช่วย mask ข้อมูล" หรือส่ง proposal/ใบแจ้งหนี้/อีเมล/สไลด์/รายงานบั๊ก/log มาให้ตรวจก่อนส่ง
- uses: — · next: `invoice-check` `follow-up-email` `sales-proposal` · follows: —

#### `pricing-rules`
- เรียกใช้เป็น: `core:pricing-rules` · ชั้น: core · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `fin-joy` · ผู้ดูแล plugin: `@plat-ken`
- ทำอะไร: กติกากลางเรื่องราคาของโนวาเทค ตารางราคาขายและต้นทุน สูตร margin เกณฑ์ผู้อนุมัติ สิทธิ์ให้ส่วนลด buffer งาน fixed-price และการแสดง VAT เป็นต้นฉบับเดียวให้ skill อื่นอ้าง ใช้เมื่อต้องรู้ "ราคาต่อ man-day เท่าไหร่", "margin เท่านี้ใครอนุมัติ", "ลดได้กี่เปอร์เซ็นต์", "ต้องบวก buffer ไหม" หรือเมื่อ skill อื่นอ้างถึง core:pricing-rules
- uses: — · next: — · follows: —

#### `skill-finder`
- เรียกใช้เป็น: `core:skill-finder` · ชั้น: core · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `plat-ken` · ผู้ดูแล plugin: `@plat-ken`
- ทำอะไร: ตอบว่าคลัง novatech-skills มี skill อะไร แผนกไหนดูแล ควรใช้ตัวไหนกับงานนี้ และแก้ skill ตัวไหนแล้วกระทบใคร โดยอ่านจาก catalog ที่สร้างจากหัวไฟล์ของทุก skill ใช้เมื่อผู้ใช้พิมพ์ "มี skill สำหรับเรื่องนี้ไหม", "แผนกอื่นทำเรื่องนี้ยังไง", "skill นี้ใครดูแล", "ถ้าแก้ skill นี้กระทบใคร" หรือ /skill-finder
- uses: — · next: — · follows: —

### shared

#### `meeting-minutes`
- เรียกใช้เป็น: `shared:meeting-minutes` · ชั้น: shared · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `plat-ken` · ผู้ดูแล plugin: `@plat-ken`
- ทำอะไร: เรียบเรียงโน้ตหรือบทสนทนาจากการประชุมเป็นบันทึกประชุมที่ทุกแผนกใช้ต่อได้ บอกผู้เข้าประชุม สิ่งที่คุยกัน และงานติดตามพร้อมผู้รับผิดชอบและวันกำหนด ใช้เมื่อผู้ใช้พิมพ์ "สรุปการประชุมนี้", "ทำบันทึกประชุมให้หน่อย", "จด action item จากโน้ตนี้" หรือ /meeting-minutes
- uses: — · next: `follow-up-email` · follows: `customer-data-policy` `brand-guide`

### exec

#### `cost-headcount-review`
- เรียกใช้เป็น: `exec:cost-headcount-review` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `cfo-ying` · ผู้ดูแล plugin: `@exec-ploy`
- ทำอะไร: สรุปรายได้ กำไรขั้นต้น ต้นทุน และกำลังคนรายเดือนของโนวาเทคให้ MD พร้อมคำแนะนำว่าควรรับคนเพิ่มไหมและเดือนหน้าเงินพอไหม ได้รายงานภายใน 1 ไฟล์: สรุป 30 วินาที, ตารางเทียบเดือนก่อน/เป้า, สาเหตุ margin, ต้นทุนต่อตำแหน่ง, ผลต่อเงินสด, ข้อมูลที่ต้องขอ, เรื่องที่ MD ต้องตัดสิน ใช้เมื่อผู้ใช้พูดว่า "เดือนนี้กำไรเท่าไหร่", "ควรรับคนเพิ่มไหม", "สรุปต้นทุนคนให้ MD", "สรุปตัวเลขต้นเดือน" หรือ /cost-headcount-review
- uses: — · next: `exec-deck` `deal-approval` `jd-writer` · follows: `pricing-rules`

#### `deal-approval`
- เรียกใช้เป็น: `exec:deal-approval` · ชั้น: department · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `md-somchai` · ผู้ดูแล plugin: `@exec-ploy`
- ทำอะไร: พิจารณาสรุปดีลแบบ MD โนวาเทค แล้วออกผลอนุมัติ / อนุมัติแบบมีเงื่อนไข / ตีกลับ ลง approval.md — ตรวจกำไร (margin หลังส่วนลด + buffer 10%), แผนงาน, เงื่อนไขชำระเงิน, ความเสี่ยงสัญญา, ภาคผนวก PDPA ลูกค้าธนาคาร, ทีมว่าง, ข้อมูลลูกค้าในเอกสาร ใช้เมื่อผู้ใช้ถาม "ดีลนี้อนุมัติได้ไหม", "สรุปความเสี่ยงของดีลนี้ให้หน่อย", "กำไรพอไหม ควรรับงานนี้หรือเปล่า" หรือส่งไฟล์สรุปดีล (DS-xxxx) มาให้พิจารณา
- uses: — · next: `sales-proposal` `jd-writer` `invoice-check` · follows: `customer-data-policy` `pricing-rules`

#### `exec-deck`
- เรียกใช้เป็น: `exec:exec-deck` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `exec-ploy` · ผู้ดูแล plugin: `@exec-ploy`
- ทำอะไร: ทำสไลด์ประชุมผู้บริหารต้นเดือนให้ MD อ่านจบใน 5 นาที จาก KPI เดือนที่แล้ว + ดีลที่รออนุมัติ ตามโครง 7 หน้าของแบรนด์โนวาเทค ได้ไฟล์ HTML 16:9 และ PDF ใช้เมื่อพูดว่า "ทำสไลด์ประชุมผู้บริหารเดือนนี้", "สรุป KPI เดือนที่แล้วเป็นสไลด์", "เตรียม deck ให้ MD"
- uses: — · next: `deal-approval` · follows: `customer-data-policy` `brand-guide` `pricing-rules`

#### `pipeline-review`
- เรียกใช้เป็น: `exec:pipeline-review` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `cco-wit` · ผู้ดูแล plugin: `@exec-ploy`
- ทำอะไร: ทบทวน pipeline การขายและ roadmap ผลิตภัณฑ์ของสายธุรกิจ (Sales · SA · Product) ทุกวันจันทร์ในหน้าเดียว บอกว่าดีลไหนควรเร่ง ประคอง ตีกลับ หรือปล่อย, ดีลไหนเสี่ยงหลุด, และทีมขายกับทีม product ต้องคุยเรื่องอะไร พร้อมปฏิทินเส้นตาย 2 สัปดาห์ ใช้เมื่อผู้ใช้พูดว่า "สรุป pipeline สัปดาห์นี้", "ดีลไหนเสี่ยงหลุด", "ทีมขายกับทีม product ต้องคุยเรื่องอะไร" หรือ /pipeline-review
- uses: — · next: `deal-approval` `tech-risk-review` `exec-deck` · follows: `customer-data-policy` `pricing-rules`

#### `tech-risk-review`
- เรียกใช้เป็น: `exec:tech-risk-review` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `cto-nat` · ผู้ดูแล plugin: `@exec-ploy`
- ทำอะไร: ทบทวนความเสี่ยงทางเทคนิคของงานที่จะรับใหม่ (TOR / ดีล) หรืองานที่จะขึ้นระบบ (release) แล้วให้คำตัดสิน GO / GO with conditions / NO-GO พร้อมระดับความเสี่ยงรายด้าน หลักฐานจากเหตุการณ์ที่เคยพัง และเงื่อนไขที่มีเจ้าของรับผิดชอบ ใช้เมื่อผู้ใช้ถามว่า "งานนี้เสี่ยงทางเทคนิคตรงไหน", "ปล่อยขึ้นระบบได้ไหม", "ทีมรับงานนี้ไหวไหม" หรือสั่ง /tech-risk-review
- uses: — · next: `deal-approval` `deploy-checklist` · follows: `customer-data-policy` `pricing-rules`

### sales

#### `follow-up-email`
- เรียกใช้เป็น: `sales:follow-up-email` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `sales-krit` · ผู้ดูแล plugin: `@sales-nida`
- ทำอะไร: ร่างอีเมลติดตามลูกค้าองค์กรที่สั้น สุภาพ และมีขั้นต่อไปเดียวที่ชัดเจน จากบันทึกประชุม TOR หรือประวัติการคุย ใช้เมื่อผู้ใช้พูดว่า "เขียนอีเมลตามลูกค้าหลังประชุม", "ลูกค้าเงียบไป 2 อาทิตย์ ช่วยตามหน่อย", "ร่างเมลสรุปนัดหมายถัดไป" หรือขอให้ตามงาน/ตามคำตอบจากลูกค้า ไม่ใช้สำหรับเขียน proposal หรือคิดราคา
- uses: — · next: `sales-proposal` `pricing-calc` `pipeline-review` · follows: `customer-data-policy` `brand-guide`

#### `sales-proposal`
- เรียกใช้เป็น: `sales:sales-proposal` · ชั้น: department · เวอร์ชัน: 1.1.0
- เจ้าของ skill: `sales-nida` · ผู้ดูแล plugin: `@sales-nida`
- ทำอะไร: ร่าง proposal (ข้อเสนอโครงการ) ลูกค้าองค์กร โดยเฉพาะธนาคาร จาก TOR — โครง 9 หัวข้อแบบที่ชนะมาแล้ว เน้นความปลอดภัยและ SLA ใส่ภาคผนวก PDPA ทุกครั้งเมื่อลูกค้าเป็นธนาคารหรือสถาบันการเงิน คิดราคาจาก price-list พร้อมเช็ก margin/ส่วนลด/งบ และตัดข้อมูลส่วนบุคคลออก ใช้เมื่อผู้ใช้พิมพ์ "ทำ proposal ให้ลูกค้าธนาคาร", "ร่างข้อเสนอโครงการตาม TOR", "ทำโปรให้ลูกค้าหน่อย" หรือขอข้อเสนอ/ใบเสนอโครงการให้ลูกค้า
- uses: `pricing-calc` · next: `deal-approval` `follow-up-email` `req-to-spec` · follows: `customer-data-policy` `brand-guide` `pricing-rules`

### sa

#### `arch-template`
- เรียกใช้เป็น: `sa:arch-template` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `sa-ice` · ผู้ดูแล plugin: `@sa-ton`
- ทำอะไร: วาด architecture ระบบใหม่ตามมาตรฐานโนวาเทค (arch-standards v4) จาก TOR / spec — เลือกแบบแผน monolith / service แยก / คิวงานด้วยเกณฑ์บริษัท แล้วเติมแม่แบบที่ใช้ซ้ำ 80% ให้ได้ docs/architecture.md: C4 ระดับ 1–2 (+3 ถ้าซับซ้อน) เป็น Mermaid สีบริษัท, ตาราง container, คิว/event, ข้อมูล-ความปลอดภัย, observability, รายการ ADR และคำถามที่ต้องยืนยัน ใช้เมื่อผู้ใช้พูดว่า "วาด architecture ระบบนี้", "ออกแบบโครงระบบให้หน่อย", "ระบบจองคิวควรแบ่ง service ยังไง", "แบ่ง service ยังไงดี" หรือ /arch-template ไม่ใช่สำหรับแตก TOR เป็น spec (นั่นคือ req-to-spec) และไม่ใช่การขึ้นโค้ดโปรเจกต์ (นั่นคือ project-scaffold)
- uses: — · next: `project-scaffold` `pricing-calc` `sales-proposal` · follows: `customer-data-policy` `brand-guide`

#### `req-to-spec`
- เรียกใช้เป็น: `sa:req-to-spec` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `sa-ton` · ผู้ดูแล plugin: `@sa-ton`
- ทำอะไร: แปลง TOR / proposal ลูกค้าเป็น SPEC.md (requirement มีรหัส ไม่ตกหล่น + คำถามที่ลูกค้ามักลืมเขียน) และ TEST-PLAN.md ที่ส่งต่อ QA ได้ทันที ตามมาตรฐานสถาปัตยกรรมและนโยบายข้อมูลลูกค้าของโนวาเทค ใช้เมื่อผู้ใช้พูดว่า "ทำ spec จาก TOR นี้", "แตก requirement เป็นหัวข้อให้หน่อย", "เขียน spec พร้อมแผนทดสอบ" หรือ /req-to-spec
- uses: — · next: `arch-template` `test-from-plan` `pricing-calc` `sales-proposal` `tech-risk-review` `project-scaffold` `mlflow-experiment` · follows: `customer-data-policy` `coding-standard`

### product

#### `prd-writer`
- เรียกใช้เป็น: `product:prd-writer` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `pm-beam` · ผู้ดูแล plugin: `@pm-beam`
- ทำอะไร: เขียน PRD ฟีเจอร์ใหม่ของ NovaQueue v2 จากเสียงลูกค้าและตัวเลขการใช้งาน ให้ Dev/SA และ QA ใช้ต่อได้ทันที (ปัญหา+หลักฐาน, ตัวชี้วัด, ขอบเขต, user story + acceptance criteria, ผลกระทบต่อ v1) และจัดลำดับว่าฟีเจอร์ไหนควรทำก่อน ใช้เมื่อผู้ใช้พูดว่า "เขียน PRD ฟีเจอร์นี้ให้หน่อย", "สรุป feedback ลูกค้าเป็น requirement", "ฟีเจอร์ไหนควรทำก่อน" หรือ /prd-writer
- uses: — · next: `req-to-spec` `test-from-plan` `pipeline-review` `product-sunset` · follows: `customer-data-policy` `pricing-rules`

#### `product-sunset`
- เรียกใช้เป็น: `product:product-sunset` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `pm-gift` · ผู้ดูแล plugin: `@pm-beam`
- ทำอะไร: ทำแผนเลิกให้บริการ (sunset / EOL) เวอร์ชันหรือฟีเจอร์เก่าของผลิตภัณฑ์โนวาเทค ให้ไม่ผิดสัญญา MA ของลูกค้าและลบข้อมูลถูกตาม PDPA ได้แผนภายในพร้อมตารางตรวจกับนโยบาย ไทม์ไลน์ เรื่องที่ต้องให้ MD ตัดสิน และร่างประกาศถึงลูกค้า ใช้เมื่อผู้ใช้พูดว่า "ทำแผนปิดบริการเวอร์ชันเก่า", "ลูกค้ายังใช้ v1 อยู่กี่ราย", "ร่างประกาศเลิกให้บริการ", "ปิด/เลิก/EOL ฟีเจอร์นี้" หรือ /product-sunset
- uses: — · next: `deal-approval` `deploy-checklist` · follows: `customer-data-policy` `brand-guide`

### dev

#### `coding-standard`
- เรียกใช้เป็น: `dev:coding-standard` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `dev-pond` · ผู้ดูแล plugin: `@dev-pond`
- ทำอะไร: รีวิวโค้ดตามมาตรฐานทีม Dev โนวาเทค (coding-rules 10 ข้อ ให้คะแนน 0–10, ต่ำกว่า 8 ห้าม merge) และเขียน/แก้โค้ดให้ตรงสไตล์ทีม (TypeScript, Next.js 15, Prisma) — ใช้เมื่อผู้ใช้พิมพ์ "รีวิวโค้ดนี้ตามมาตรฐานทีม", "โค้ดนี้ผิดมาตรฐานตรงไหน", "เขียนให้ตรงสไตล์ทีม" หรือส่ง PR/diff/ไฟล์มาให้ตรวจก่อน merge
- uses: — · next: `test-from-plan` · follows: `customer-data-policy`

#### `project-scaffold`
- เรียกใช้เป็น: `dev:project-scaffold` · ชั้น: department · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `dev-mew` · ผู้ดูแล plugin: `@dev-pond`
- ทำอะไร: ขึ้นโปรเจกต์ใหม่แบบระบบสมาชิก + ชำระเงินของโนวาเทค (Next.js 15 + TypeScript + PostgreSQL/Prisma + BullMQ) พร้อม 5 โมดูลมาตรฐาน auth / member / payment / notification / audit ที่แก้บั๊ก token หมดอายุกลางจ่ายเงินและ webhook ซ้ำไว้แล้ว ผ่าน coding-rules 10 ข้อ ใช้เมื่อผู้ใช้พูดว่า "ขึ้นโปรเจกต์ใหม่ให้หน่อย", "สร้างโครงระบบสมาชิกกับชำระเงิน", "เริ่มโปรเจกต์ตาม spec" หรือ /project-scaffold ไม่ใช่สำหรับรีวิวโค้ด (ใช้ coding-standard) หรือวาด architecture ละเอียด (ใช้ arch-template)
- uses: — · next: `coding-standard` `test-from-plan` `deploy-checklist` · follows: `coding-standard` `customer-data-policy`

### qa

#### `bug-report`
- เรียกใช้เป็น: `qa:bug-report` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `qa-bank` · ผู้ดูแล plugin: `@qa-mint`
- ทำอะไร: เขียนรายงานบั๊กจาก test ที่ล้ม (log Playwright/CI, trace, server log, โน้ตทดสอบมือ) ให้ Dev ทำซ้ำได้ทุกครั้งโดยไม่ต้องถาม QA ได้ไฟล์ markdown ตามแม่แบบทีม QA: ชื่อบอกอาการ+เงื่อนไข, Severity/Priority, ขั้นตอนทำซ้ำพร้อมค่าจริง, ผลที่คาด, ผลจริง, ความถี่, หลักฐาน, ข้อสังเกต, ผลกระทบ ใช้เมื่อผู้ใช้พูดว่า "เขียนรายงานบั๊กนี้ให้หน่อย", "สรุปบั๊กให้ dev แก้ได้", "แจ้งบั๊กพร้อมขั้นตอนทำซ้ำ" หรือ /bug-report
- uses: — · next: `coding-standard` `deploy-checklist` · follows: `customer-data-policy`

#### `test-from-plan`
- เรียกใช้เป็น: `qa:test-from-plan` · ชั้น: department · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `qa-mint` · ผู้ดูแล plugin: `@qa-mint`
- ทำอะไร: ทดสอบเว็บแบบ black-box ตามแผนใน TEST-PLAN.md (อ่าน URL, test cases, เกณฑ์จากแผนเอง) ด้วย Playwright headless และ agent ขนาน ได้ test ครบทุกข้อใน e2e/, GIF หลักฐานทุกข้อ, index.html, TEST-REPORT.md และคำตัดสินว่าปล่อยได้ไหม ใช้เมื่อผู้ใช้พูดว่า "ทดสอบเว็บตามแผน", "รัน test ตาม TEST-PLAN", "ทำรายงานผลทดสอบ" หรือ /test-from-plan
- uses: — · next: `bug-report` `deploy-checklist` `tech-risk-review` · follows: `customer-data-policy`

### devops

#### `deploy-checklist`
- เรียกใช้เป็น: `devops:deploy-checklist` · ชั้น: department · เวอร์ชัน: 1.0.0
- เจ้าของ skill: `ops-art` · ผู้ดูแล plugin: `@ops-art`
- ทำอะไร: เตรียม checklist ขึ้นระบบจริง (production deploy) สำหรับ release หนึ่งรอบ ตามกติกาโนวาเทค: วัน/เวลาที่อนุญาต, แจ้งลูกค้าล่วงหน้า, backup, migration dry-run, feature flag, smoke test, แผน rollback และ on-call ผลลัพธ์: ไฟล์ checklist ที่บอกคำตัดสิน GO/NO-GO พร้อม blocker และร่างประกาศแจ้งลูกค้า ใช้เมื่อผู้ใช้พูดว่า "เตรียม checklist ขึ้นระบบ", "จะ deploy คืนนี้ ต้องเช็กอะไรบ้าง", "แผน rollback ถ้าพัง", "ขึ้น production", "go-live", "ปล่อย release" หรือสั่ง /deploy-checklist
- uses: — · next: `postmortem` · follows: `customer-data-policy`

#### `postmortem`
- เรียกใช้เป็น: `devops:postmortem` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `ops-fon` · ผู้ดูแล plugin: `@ops-art`
- ทำอะไร: เขียน postmortem หลังระบบล่มแบบไม่โทษคน (blameless) จาก log ดิบ/แชต/ticket — เรียงไทม์ไลน์ วัดผลกระทบ หาต้นเหตุจริงด้วย "ทำไม" ทีละชั้น และสรุปสิ่งที่ต้องแก้พร้อมเจ้าของและกำหนด ได้ 2 ไฟล์: postmortem ฉบับภายใน + รายงานสรุปถึงลูกค้า (ปิดบังข้อมูลตาม PDPA) ใช้เมื่อผู้ใช้พูดว่า "สรุปเหตุระบบล่มเมื่อคืน", "เขียน postmortem ให้หน่อย", "หาต้นเหตุ incident นี้", "สรุป incident", "RCA" หรือ /postmortem
- uses: — · next: `exec-deck` · follows: `customer-data-policy` `brand-guide`

### mlops

#### `mlflow-experiment`
- เรียกใช้เป็น: `mlops:mlflow-experiment` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `ml-jay` · ผู้ดูแล plugin: `@ml-jay`
- ทำอะไร: จัดระเบียบและบันทึกผลการทดลองโมเดล ML ให้เทียบกันได้ (ข้อมูล, พารามิเตอร์, metric, เหตุผลที่เลือก) แล้วทำรายงานรายสัปดาห์ + แผนรอบถัดไป ใช้เมื่อผู้ใช้พิมพ์ "บันทึกผลการทดลองรอบนี้", "เทียบโมเดลทั้งสามรอบ", "วางแผนทดลองโมเดลพยากรณ์", ขอสรุป experiment-results.csv หรือเตรียมลง MLflow (ไม่ใช่การปล่อยโมเดลขึ้นจริง ซึ่งเป็นงานของ model-release)
- uses: — · next: `model-release` · follows: `customer-data-policy`

#### `model-release`
- เรียกใช้เป็น: `mlops:model-release` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `ml-pim` · ผู้ดูแล plugin: `@ml-jay`
- ทำอะไร: วางแผนปล่อยโมเดล ML รุ่นใหม่ขึ้นระบบจริงแทนรุ่นเดิม พร้อมเกณฑ์ถอยกลับ (rollback) และการเฝ้าดูว่าโมเดลยังแม่นอยู่ไหม — ตรวจด่านก่อนปล่อย 10 ด่าน (เทียบแฟร์บน data version เดียวกัน, ทำซ้ำได้, กลุ่มย่อย/ทิศทาง error, fallback, shadow, PDPA, กติกา deploy) แล้วได้ release plan 1 ไฟล์ + สคริปต์ตรวจเกณฑ์ rollback รายสัปดาห์ ใช้เมื่อผู้ใช้พิมพ์ "ปล่อยโมเดลรุ่นใหม่", "เตรียม release โมเดลพยากรณ์คิว", "เกณฑ์ rollback โมเดล", "โมเดลยังแม่นอยู่ไหม / ควรถอยไหม" หรือ /model-release ไม่ใช่สำหรับออกแบบ/บันทึกการทดลอง (นั่นคือ mlflow-experiment) และไม่ใช่ checklist คืน deploy ของ DevOps (นั่นคือ deploy-checklist)
- uses: — · next: `deploy-checklist` `postmortem` `tech-risk-review` · follows: `customer-data-policy`

### hr

#### `jd-writer`
- เรียกใช้เป็น: `hr:jd-writer` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `hr-fah` · ผู้ดูแล plugin: `@hr-fah`
- ทำอะไร: เขียนประกาศรับสมัครงาน (JD) ของโนวาเทคตามแม่แบบ 6 หัวข้อ น้ำเสียงแบรนด์ ไม่เกิน 1 หน้า A4 ระบุช่วงเงินเดือนเสมอ ใส่สวัสดิการจริงของบริษัท แล้วตรวจคำต้องห้ามและการเลือกปฏิบัติก่อนส่ง — ใช้เมื่อผู้ใช้พิมพ์ "ทำประกาศรับสมัคร dev", "เขียน JD ตำแหน่งนี้ให้หน่อย", "โปรเจกต์ใหม่ต้องรับคนเพิ่ม" หรือส่งคำขออัตรากำลัง / รหัสตำแหน่ง NVT-JOB-xxxx มาให้
- uses: — · next: `onboarding-pack` · follows: `customer-data-policy` `brand-guide`

#### `onboarding-pack`
- เรียกใช้เป็น: `hr:onboarding-pack` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `hr-oat` · ผู้ดูแล plugin: `@hr-fah`
- ทำอะไร: เตรียมชุดต้อนรับพนักงานใหม่ของโนวาเทคครบในครั้งเดียว — ไทม์ไลน์ D−5 ถึง D119 เป็นวันที่จริง, คำขอพร้อมส่งถึงทีมกลาง/ธุรการ/หัวหน้าแผนก, ตารางวันแรก, งานสัปดาห์แรกตามแผนก, เช็กลิสต์ D−1 และจดหมายต้อนรับ ใช้เมื่อพิมพ์ "เตรียมของต้อนรับพนักงานใหม่", "คนใหม่ฝ่าย dev เข้าวันจันทร์" (หรือแผนกอื่น/วันอื่น), "onboarding checklist", "ชุดต้อนรับ", "มีคนใหม่เข้า"
- uses: — · next: `skill-finder` · follows: `customer-data-policy` `brand-guide`

### finance

#### `invoice-check`
- เรียกใช้เป็น: `finance:invoice-check` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `fin-nok` · ผู้ดูแล plugin: `@fin-joy`
- ทำอะไร: ตรวจใบแจ้งหนี้ของโนวาเทคก่อนส่งลูกค้า — ยอดตรง (ยอดงวด/VAT 7%/รวมทั้งสิ้น/จำนวนเงินตัวอักษร) งวดตรงสัญญา เลขที่และวันครบกำหนดถูก และไม่มีข้อมูลลูกค้าที่ห้ามเปิดเผย (เบอร์มือถือ ชื่อลูกค้าปลายทาง เลขบัตร รายละเอียดเคส) แล้วออกผลตรวจ + ฉบับแก้ ใช้เมื่อพิมพ์ "ตรวจใบแจ้งหนี้นี้ให้หน่อย", "ยอดในใบแจ้งหนี้ถูกไหม", "ออกใบแจ้งหนี้งวดแรก" (หรืองวดที่ 2/3, ใบ MA) หรือ /invoice-check — ไม่ใช่การคิดราคา/ใบเสนอราคา (นั่นคือ pricing-calc)
- uses: — · next: `cost-headcount-review` · follows: `customer-data-policy`

#### `pricing-calc`
- เรียกใช้เป็น: `finance:pricing-calc` · ชั้น: department · เวอร์ชัน: 0.1.0
- เจ้าของ skill: `fin-joy` · ผู้ดูแล plugin: `@fin-joy`
- ทำอะไร: คิดราคาโปรเจกต์และกำไรของโนวาเทคจากตารางราคามาตรฐาน (price-list) ตามกฎกำไร — บวก buffer 10% งาน fixed-price, margin หลังส่วนลด, เกณฑ์ 25%/15%, สิทธิ์ให้ส่วนลด, ห้ามลด MA/hosting, VAT 7% — ได้ใบคิดราคาภายใน (มีต้นทุน/margin/ผู้อนุมัติ) + ร่างตารางราคาสำหรับใบเสนอราคา (ไม่มีต้นทุน) ใช้เมื่อผู้ใช้พิมพ์ "คิดราคาโปรเจกต์นี้", "ดีลนี้กำไรเท่าไหร่", "ทำใบเสนอราคา", ขอราคาแบบช่วง/ราคาเข้างบ หรือส่ง TOR/SPEC/รายการ man-day มาให้คิดราคา
- uses: — · next: `sales-proposal` `deal-approval` `pipeline-review` `cost-headcount-review` · follows: `customer-data-policy` `pricing-rules`

## แก้ตัวไหนกระทบใคร

ผลกระทบตรง = skill ที่ `uses` หรือ `follows` ตัวนี้ ต้องตรวจซ้ำเมื่อแก้ · รับงานต่อจาก = skill ที่ `next` ชี้มาตัวนี้ ต้องตรวจเมื่อเปลี่ยน input ที่รับ · แผนกที่ต้องแจ้ง = ผู้ดูแล plugin ของ skill ที่กระทบตรง

| skill | ผลกระทบตรง | จำนวน | แผนกที่ต้องแจ้ง | รับงานต่อจาก |
|---|---|---:|---|---|
| `arch-template` | — | 0 | — | `req-to-spec` |
| `brand-guide` | `arch-template` `exec-deck` `follow-up-email` `jd-writer` `meeting-minutes` `onboarding-pack` `postmortem` `product-sunset` `sales-proposal` | 9 | `@exec-ploy` `@hr-fah` `@ops-art` `@plat-ken` `@pm-beam` `@sa-ton` `@sales-nida` | — |
| `bug-report` | — | 0 | — | `test-from-plan` |
| `coding-standard` | `project-scaffold` `req-to-spec` | 2 | `@dev-pond` `@sa-ton` | `bug-report` `project-scaffold` |
| `cost-headcount-review` | — | 0 | — | `invoice-check` `pricing-calc` |
| `customer-data-policy` | `arch-template` `bug-report` `coding-standard` `deal-approval` `deploy-checklist` `exec-deck` `follow-up-email` `invoice-check` `jd-writer` `meeting-minutes` `mlflow-experiment` `model-release` `onboarding-pack` `pipeline-review` `postmortem` `prd-writer` `pricing-calc` `product-sunset` `project-scaffold` `req-to-spec` `sales-proposal` `tech-risk-review` `test-from-plan` | 23 | `@dev-pond` `@exec-ploy` `@fin-joy` `@hr-fah` `@ml-jay` `@ops-art` `@plat-ken` `@pm-beam` `@qa-mint` `@sa-ton` `@sales-nida` | — |
| `deal-approval` | — | 0 | — | `cost-headcount-review` `exec-deck` `pipeline-review` `pricing-calc` `product-sunset` `sales-proposal` `tech-risk-review` |
| `deploy-checklist` | — | 0 | — | `bug-report` `model-release` `product-sunset` `project-scaffold` `tech-risk-review` `test-from-plan` |
| `exec-deck` | — | 0 | — | `cost-headcount-review` `pipeline-review` `postmortem` |
| `follow-up-email` | — | 0 | — | `customer-data-policy` `meeting-minutes` `sales-proposal` |
| `invoice-check` | — | 0 | — | `customer-data-policy` `deal-approval` |
| `jd-writer` | — | 0 | — | `cost-headcount-review` `deal-approval` |
| `meeting-minutes` | — | 0 | — | — |
| `mlflow-experiment` | — | 0 | — | `req-to-spec` |
| `model-release` | — | 0 | — | `mlflow-experiment` |
| `onboarding-pack` | — | 0 | — | `jd-writer` |
| `pipeline-review` | — | 0 | — | `follow-up-email` `prd-writer` `pricing-calc` |
| `postmortem` | — | 0 | — | `deploy-checklist` `model-release` |
| `prd-writer` | — | 0 | — | — |
| `pricing-calc` | `sales-proposal` | 1 | `@sales-nida` | `arch-template` `follow-up-email` `req-to-spec` |
| `pricing-rules` | `cost-headcount-review` `deal-approval` `exec-deck` `pipeline-review` `prd-writer` `pricing-calc` `sales-proposal` `tech-risk-review` | 8 | `@exec-ploy` `@fin-joy` `@pm-beam` `@sales-nida` | — |
| `product-sunset` | — | 0 | — | `prd-writer` |
| `project-scaffold` | — | 0 | — | `arch-template` `req-to-spec` |
| `req-to-spec` | — | 0 | — | `prd-writer` `sales-proposal` |
| `sales-proposal` | — | 0 | — | `arch-template` `customer-data-policy` `deal-approval` `follow-up-email` `pricing-calc` `req-to-spec` |
| `skill-finder` | — | 0 | — | `onboarding-pack` |
| `tech-risk-review` | — | 0 | — | `model-release` `pipeline-review` `req-to-spec` `test-from-plan` |
| `test-from-plan` | — | 0 | — | `coding-standard` `prd-writer` `project-scaffold` `req-to-spec` |
