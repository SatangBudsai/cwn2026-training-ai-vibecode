# LAB 3 รอบใหม่ 2026-11-06 (คลัง 12 plugin · 28 skill) · คำตอบเต็มของ Claude ทั้ง 3 ขั้น

รันพรอมต์ในกล่อง ④ ⑤ ⑥ ทุกตัวอักษรด้วย `claude -p` ที่ `novatech/` ของสำเนาแยก

## ขั้น ① บอกที่อยู่คลัง · 67 วินาที

**ใส่ให้ครบ 28 โต๊ะจากทั้งหมด 28 โต๊ะ** ไม่มีโต๊ะไหนถูกข้าม และรายชื่อตรงกับ `seed/people.json` ทุกคน

- **สิ่งที่ใส่:** แต่ละโต๊ะมี `.claude/settings.json` ที่เหมือนแม่แบบทุกไบต์ จึงรู้จักคลัง `novatech-skills` และเปิด `core@novatech-skills` ไว้ ก่อนหน้านี้ไม่มีโต๊ะไหนมีไฟล์นี้ จึงไม่มีค่าเดิมถูกเขียนทับ
- **skill ส่วนตัว:** ยังอยู่ครบ 24 skill ส่วนอีก 4 โต๊ะ (`dev-new`, `hr-namtan`, `plat-ken`, `sales-mook`) ไม่มี skill ส่วนตัวมาตั้งแต่แรก
- **ไฟล์อื่น:** เทียบ checksum ก่อนและหลังแล้ว ทั้ง 460 ไฟล์ไม่เปลี่ยน และ repo `org-skills` ก็ไม่มีอะไรเปลี่ยน
- **ที่ยังไม่ได้ทดสอบ:** ผมตรวจแค่ว่าไฟล์ถูกต้อง, คลังตอบกลับ (HTTP 200) และมี plugin `core` อยู่จริง แต่ยังไม่ได้เปิด Claude Code ที่โต๊ะไหนเพื่อดูว่า plugin โหลดจริง ตอนเปิดโต๊ะครั้งแรกอาจมีถามให้ trust โฟลเดอร์หรือยืนยันการติดตั้งก่อน

**เรื่องที่ควรตัดสินใจ:** `plat-may` มี skill ส่วนตัวชื่อ `customer-data-policy` ซ้ำกับใน `core` ผมไม่ได้แตะตามที่สั่ง ตัวใน `core` เรียกด้วยชื่อ `core:customer-data-policy` จึงไม่ทับกัน แต่โต๊ะนี้จะมีนโยบายเดียวกันสองฉบับ ซึ่งอาจไม่ตรงกันในอนาคต ถ้าจะเหลือฉบับเดียว ควรให้ `plat-may` เป็นคนตัดสินใจเก็บหรือเลิกใช้ฉบับส่วนตัว

## ขั้น ② ทุกโต๊ะติดตั้งแพ็ก · 692 วินาที

ติดตั้งครบทั้ง 28 โต๊ะแล้ว (ข้าม `_template`) โดย 26 โต๊ะได้ `core` + plugin แผนก ส่วน `plat-ken` และ `plat-may` ได้แค่ `core` เพราะคลังไม่มี plugin `platform`

Plugin ของทุกโต๊ะเป็น scope project รุ่น 1.0.0 ผมเทียบทะเบียนกลาง, `settings.json` และการ์ดแผนกแล้วตรงกันทุกโต๊ะ ไม่มีรายการหายจากการรันพร้อมกัน

## ผลการติดตั้ง

ทุกโต๊ะเห็น **skill จาก core 4 ตัว** คือ `brand-guide`, `customer-data-policy`, `pricing-rules`, `skill-finder` ในตารางจึงแสดงเฉพาะ skill ของแผนกที่เพิ่มมา

| user | แผนก | plugin ที่ติดตั้งจริง | skill ที่เห็น (นอกจาก core) |
|---|---|---|---|
| `md-somchai` | MD / ผู้บริหาร | core, exec | `cost-headcount-review`, `deal-approval`, `exec-deck`, `pipeline-review`, `tech-risk-review` |
| `exec-ploy` | MD / ผู้บริหาร | core, exec | เหมือน `md-somchai` |
| `cco-wit` | MD / ผู้บริหาร | core, exec | เหมือน `md-somchai` |
| `cto-nat` | MD / ผู้บริหาร | core, exec | เหมือน `md-somchai` |
| `cfo-ying` | MD / ผู้บริหาร | core, exec | เหมือน `md-somchai` |
| `sales-nida` | Sales | core, sales | `follow-up-email`, `sales-proposal` |
| `sales-krit` | Sales | core, sales | `follow-up-email`, `sales-proposal` |
| `sales-mook` | Sales | core, sales | `follow-up-email`, `sales-proposal` |
| `sa-ton` | Presales / SA | core, sa | `arch-template`, `req-to-spec` |
| `sa-ice` | Presales / SA | core, sa | `arch-template`, `req-to-spec` |
| `pm-beam` | Product | core, product | `prd-writer`, `product-sunset` |
| `pm-gift` | Product | core, product | `prd-writer`, `product-sunset` |
| `dev-pond` | Dev | core, dev | `coding-standard`, `project-scaffold` |
| `dev-mew` | Dev | core, dev | `coding-standard`, `project-scaffold` |
| `dev-new` | Dev | core, dev | `coding-standard`, `project-scaffold` |
| `qa-mint` | QA | core, qa | `bug-report`, `test-from-plan` |
| `qa-bank` | QA | core, qa | `bug-report`, `test-from-plan` |
| `ops-art` | DevOps | core, devops | `deploy-checklist`, `postmortem` |
| `ops-fon` | DevOps | core, devops | `deploy-checklist`, `postmortem` |
| `ml-jay` | ML / MLOps | core, mlops | `mlflow-experiment`, `model-release` |
| `ml-pim` | ML / MLOps | core, mlops | `mlflow-experiment`, `model-release` |
| `hr-fah` | HR | core, hr | `jd-writer`, `onboarding-pack` |
| `hr-oat` | HR | core, hr | `jd-writer`, `onboarding-pack` |
| `hr-namtan` | HR | core, hr | `jd-writer`, `onboarding-pack` |
| `fin-joy` | บัญชี / ธุรการ | core, finance | `invoice-check`, `pricing-calc` |
| `fin-nok` | บัญชี / ธุรการ | core, finance | `invoice-check`, `pricing-calc` |
| `plat-ken` | ทีมกลาง (platform) | core เท่านั้น | ไม่มี |
| `plat-may` | ทีมกลาง (platform) | core เท่านั้น | ไม่มี |

## สิ่งที่ควรรู้
- **ทีมกลางไม่มี plugin แผนก:** `claude plugin install platform@novatech-skills --scope project` ขึ้น `Plugin "platform" not found in marketplace "novatech-skills"` agent ไม่ได้ติดตั้งแผนกอื่นแทน
- **Skill ซ้ำชื่อ 24 โต๊ะ:** skill ส่วนตัวใน `.claude/skills/` มีชื่อตรงกับของบริษัท และเนื้อหาไม่ตรงกันทุกคู่ การเรียกชื่อสั้นอาจได้ฉบับส่วนตัว จึงควรเรียกชื่อเต็ม เช่น `exec:deal-approval` ผมไม่ได้แก้หรือลบฉบับใด
- **นโยบายที่ควรดูก่อน:** `plat-may` มี `customer-data-policy` ฉบับส่วนตัวที่ต่างจากใน `core`
- **การยืนยันว่า skill ใช้ได้:** รายการในตารางส่วนใหญ่มาจาก `claude plugin details` มีเพียง `cfo-ying`, `cto-nat`, `dev-mew` ที่ลองเปิด session ใหม่แล้วเห็น skill โหลดจริง และยังไม่มีโต๊ะไหนลองเรียกใช้ skill ส่วนแชตที่เปิดค้างไว้ก่อนติดตั้งต้องเปิดใหม่

## จุดที่ agent ออกนอกข้อกำหนด
ไม่มีไฟล์ในโปรเจกต์นอก `desks/` เปลี่ยน และ `_template` ไม่ถูกแตะ ในโต๊ะมีแค่ `settings.json` ที่เปลี่ยน โดยคำสั่ง install เป็นคนเขียน แต่มี agent ทำเกินข้อกำหนดดังนี้:

| โต๊ะ | สิ่งที่ทำ | ผล / สถานะ |
|---|---|---|
| `cco-wit` | รัน `claude plugin marketplace add ... --scope project` | เขียน `~/.claude/plugins/known_marketplaces.json` และสร้างสำเนาคลังใน `marketplaces/` ซึ่งยังอยู่ |
| `cfo-ying`, `cto-nat`, `dev-mew` | เปิด `claude -p` เพื่อตรวจ skill | ตอนนี้มีโฟลเดอร์ session ของ 3 โต๊ะนี้ใน `~/.claude/projects/` ซึ่งยังไม่ได้ลบ และผมไม่ได้ตรวจว่าเกิดจากรอบนี้ทั้งหมดหรือไม่ |
| `exec-ploy` | ใช้ `.gitea-token` ของโต๊ะเรียก Gitea API แบบอ่านอย่างเดียว และอ่าน `settings.json` ของ 3 โต๊ะอื่น | ไม่มีการแก้ไฟล์ |
| `hr-fah` | สร้าง `list.json` ไว้ใน scratchpad ของผม และรายงานว่าลบแล้ว | ไฟล์ยังอยู่ตอนตรวจ ผมลบให้แล้ว |
| `md-somchai` | สร้าง `pl.json` ใน `%TEMP%` | agent รายงานว่าลบแล้ว |

**สิ่งที่ผมปรับจากที่คุณสั่ง:**
- **ข้อความงาน:** ประโยคงานส่งตรงทุกตัวอักษร แต่ไม่ได้ใส่เครื่องหมายคำพูดครอบ และมีบรรทัดระบุตัวตนกับโฟลเดอร์ทำงานนำหน้า พร้อมข้อกำหนดของคุณต่อท้าย
- **ข้อห้ามที่เพิ่มเอง:** รอบ 1 ให้รายงาน error ตามจริงและห้ามแก้ทะเบียนด้วยมือ จากรอบ 2 ห้าม `marketplace add/update/remove` และ `claude -p` จากรอบ 3 ห้ามใช้ token และอ่านโต๊ะอื่น จากรอบ 5 ห้ามสร้างไฟล์ชั่วคราวนอกโต๊ะ และเฉพาะ `plat-ken`, `plat-may` ห้ามติดตั้ง plugin แผนกอื่นแทน
- **โฟลเดอร์ทำงาน:** Agent tool ตั้งโฟลเดอร์เริ่มต้นไม่ได้ agent จึง `cd` เข้าโต๊ะเอง และไม่ได้เป็นแชตใหม่ที่เปิดในโต๊ะจริง

## สิ่งที่ต้องตัดสินใจ
1. ทีมกลางควรมี plugin ของตัวเองไหม ถ้าควรมี ต้องเพิ่มเข้าคลังผ่าน PR ก่อนแล้วค่อยติดตั้งให้ 2 โต๊ะนี้ แต่ถ้า `core` เพียงพอแล้วก็จบตามนี้
2. ต้องการให้ผมลบโฟลเดอร์ session ของ `cfo-ying`, `cto-nat`, `dev-mew` ไหม ถ้าลบต้องตรวจก่อนว่าเกิดจากรอบนี้จริง

## ขั้น ③ ตรวจของจริง · 349 วินาที

ตรวจครบทั้ง 28 โต๊ะแล้ว ไม่มีโต๊ะไหนขาด plugin จึงไม่ได้ติดตั้งเพิ่ม ส่วน skill ส่วนตัวย้ายไป `skills-archived` ครบ 24 ตัว ไม่มีตัวไหนถูกลบ และไม่เหลือสองฉบับแล้ว

## โต๊ะไหนเคยขาด plugin

ตอนตรวจ ทุกโต๊ะมี plugin ครบอยู่แล้ว โดยทะเบียน `installed_plugins.json` บันทึกการติดตั้งไว้เมื่อ 2026-11-05 ราว 21:23–21:26 UTC

| แผนก | โต๊ะ | plugin ที่ต้องมี | เคยขาด | ติดตั้งเพิ่ม |
|---|---|---|---|---|
| ผู้บริหาร | `md-somchai`, `exec-ploy`, `cco-wit`, `cto-nat`, `cfo-ying` | `core`, `exec` | ไม่มี | ไม่มี |
| Sales | `sales-nida`, `sales-krit`, `sales-mook` | `core`, `sales` | ไม่มี | ไม่มี |
| SA | `sa-ton`, `sa-ice` | `core`, `sa` | ไม่มี | ไม่มี |
| Product | `pm-beam`, `pm-gift` | `core`, `product` | ไม่มี | ไม่มี |
| Dev | `dev-pond`, `dev-mew`, `dev-new` | `core`, `dev` | ไม่มี | ไม่มี |
| QA | `qa-mint`, `qa-bank` | `core`, `qa` | ไม่มี | ไม่มี |
| DevOps | `ops-art`, `ops-fon` | `core`, `devops` | ไม่มี | ไม่มี |
| ML | `ml-jay`, `ml-pim` | `core`, `mlops` | ไม่มี | ไม่มี |
| HR | `hr-fah`, `hr-oat`, `hr-namtan` | `core`, `hr` | ไม่มี | ไม่มี |
| บัญชี | `fin-joy`, `fin-nok` | `core`, `finance` | ไม่มี | ไม่มี |
| ทีมกลาง | `plat-ken`, `plat-may` | `core` เท่านั้น (ตาม `seed/people.json`) | ไม่มี | ไม่มี |

## skill ส่วนตัวที่ย้าย

ย้ายจาก `desks/<คน>/.claude/skills/` ไปที่ `desks/<คน>/.claude/skills-archived/`

| โต๊ะ | skill ที่ย้าย | ฉบับที่ใช้ต่อ |
|---|---|---|
| `md-somchai` | `deal-approval` | `exec:deal-approval` |
| `exec-ploy` | `exec-deck` | `exec:exec-deck` |
| `cco-wit` | `pipeline-review` | `exec:pipeline-review` |
| `cto-nat` | `tech-risk-review` | `exec:tech-risk-review` |
| `cfo-ying` | `cost-headcount-review` | `exec:cost-headcount-review` |
| `sales-nida` | `sales-proposal` | `sales:sales-proposal` |
| `sales-krit` | `follow-up-email` | `sales:follow-up-email` |
| `sa-ton` | `req-to-spec` | `sa:req-to-spec` |
| `sa-ice` | `arch-template` | `sa:arch-template` |
| `pm-beam` | `prd-writer` | `product:prd-writer` |
| `pm-gift` | `product-sunset` | `product:product-sunset` |
| `dev-pond` | `coding-standard` | `dev:coding-standard` |
| `dev-mew` | `project-scaffold` | `dev:project-scaffold` |
| `qa-mint` | `test-from-plan` | `qa:test-from-plan` |
| `qa-bank` | `bug-report` | `qa:bug-report` |
| `ops-art` | `deploy-checklist` | `devops:deploy-checklist` |
| `ops-fon` | `postmortem` | `devops:postmortem` |
| `ml-jay` | `mlflow-experiment` | `mlops:mlflow-experiment` |
| `ml-pim` | `model-release` | `mlops:model-release` |
| `hr-fah` | `jd-writer` | `hr:jd-writer` |
| `hr-oat` | `onboarding-pack` | `hr:onboarding-pack` |
| `fin-joy` | `pricing-calc` | `finance:pricing-calc` |
| `fin-nok` | `invoice-check` | `finance:invoice-check` |
| `plat-may` | `customer-data-policy` | `core:customer-data-policy` |

อีก 4 โต๊ะไม่มี skill ส่วนตัวให้ย้าย คือ `sales-mook`, `dev-new`, `hr-namtan` และ `plat-ken`

## สิ่งที่ตรวจแล้ว

- **Plugin โหลดได้จริง:** เปิด session จริงที่ทุกโต๊ะทั้งก่อนและหลังย้าย ทั้ง 28 โต๊ะโหลด plugin ที่ต้องมีครบ และไม่มี plugin error
- **ไม่เหลือสองฉบับ:** ทั้ง 24 skill เรียกได้ในชื่อ `plugin:skill` ไม่เหลือชื่อเปล่าซ้ำ และ session ไม่โหลดจาก `skills-archived`
- **ไฟล์ครบ:** hash ของทุกไฟล์ตรงกันก่อนและหลังย้าย โฟลเดอร์ `.claude/skills/` ที่ว่างแล้วยังเก็บไว้ ไม่ได้ลบ
- **สคริปต์ราคาฉบับกลางใช้ได้:** `pricing-calc`, `deal-approval` และ `sales-proposal` ไม่มี price list ของตัวเองแล้ว แต่ยังหาจาก `core` เจอ และคำนวณดีลทดสอบได้ถูกต้อง (ราคา 755,000, margin 36.8%)

## ข้อควรรู้

- **ฉบับเก็บถาวรไม่เหมือนฉบับกลาง:** ทั้ง 24 ตัวมีเนื้อหาต่างกัน ส่วนใหญ่เพราะกติกาที่เคยคัดลอกกันถูกรวมไปไว้ที่ `core` ผมอ่านบรรทัดที่หายไป (ตัดที่ 170 ตัวอักษรต่อบรรทัด) ไม่เจอความรู้ที่หายไปเลย แต่เป็นการอ่านตรวจ ไม่ได้เทียบทุกข้อกติกาแบบละเอียด ถ้าเจ้าของ skill อยากยืนยันก็เทียบกับ `skills-archived` ได้
- **ติดตั้งซ้ำแล้วแก้ไม่ได้ทั้งหมดถ้าเกิดปัญหาใน README:** `desks/README.md` ยังบอกว่าหลัง LAB 1 แต่ละโต๊ะมี `.claude/skills/` และยังไม่พูดถึง `skills-archived` ผมไม่ได้แก้เพราะอยู่นอกงานนี้
- **ค่าใช้จ่าย:** การเปิด session ตรวจเรียก Haiku รวมประมาณ 84 ครั้ง (3 รอบ รอบละ 28 โต๊ะ)

