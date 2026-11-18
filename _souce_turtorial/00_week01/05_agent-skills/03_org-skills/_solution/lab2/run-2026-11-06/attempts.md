# LAB 2 · ทำไมพรอมต์ถึงมี 2 บรรทัดเพิ่ม (รอบบริษัท 28 คน · 2026-11-06)

รันจริง 3 รอบ ในบริษัทใหม่ทุกรอบ พรอมต์ต่างกันแค่ 2 บรรทัด

| รอบ | พรอมต์ | เวลา · ค่าใช้จ่าย | ได้ | ปัญหา |
|---|---|---|---|---|
| 1 | ถ้อยคำเดิม | 16 นาที 16 วินาที · $6.17 | 12 plugin · 28 skill | Claude เติมกฎภาคผนวก PDPA ลง `sales-proposal` เอง ทำให้ LAB 4 ไม่มีเหตุให้ MD ตีกลับ และ LAB 5 ไม่มีอะไรให้แก้ |
| 2 | เพิ่ม "รวมเฉพาะของที่ซ้ำ · ห้ามเติมกฎใหม่ · เจอช่องโหว่ให้บอกในสรุป" | 13 นาที 44 วินาที · $5.03 | 12 plugin · 27 skill | กฎอยู่ที่เดิมแล้ว แต่ไม่ได้สร้าง `skill-finder` ที่ LAB 7 ใช้ (พรอมต์ไม่เคยสั่ง รอบก่อน ๆ Claude ทำเอง) |
| 3 ✅ | เพิ่ม "สร้าง skill-finder ใน core" | 13 นาที 15 วินาที · $4.73 | 12 plugin · 28 skill | ไม่มี · เป็นผลที่ใช้ใน README |

บทเรียน: Claude ที่เห็นช่องโหว่มักอยากแก้ให้เลย ถ้าไม่บอกขอบเขต ทีมกลางจะเปลี่ยนกฎของแผนกอื่นโดยไม่มีใครรีวิว

## คำตอบเต็มของรอบ 1

คลัง `novatech/org-skills` ขึ้น Gitea แล้วที่ http://localhost:3300/novatech/org-skills มี 12 plugin และ 28 skill ส่วน `main` ห้าม push ตรงแล้ว โต๊ะคนอื่นไม่ถูกแก้ (ตรวจ hash ก่อนและหลังตรงกัน)

**ก่อนใช้จริงต้องตัดสินใจเรื่องนี้:** repo เป็นสาธารณะตามที่สั่ง ใครเข้าถึง Gitea นี้ก็อ่านได้โดยไม่ต้อง login รวมถึงต้นทุน `cost_thb`, เกณฑ์ margin และเกณฑ์อนุมัติดีลของ MD ตอนนี้ Gitea ยังอยู่แค่ในเครื่อง แต่ถ้าเปิดออกนอกเครื่องควรเปลี่ยนเป็น private การย้ายราคาเข้า core ยังทำให้ทุกแผนกได้ต้นทุนไปด้วย ถ้าไม่ต้องการ ให้แยก `cost_thb` ออกไปเก็บเฉพาะฝ่ายที่ใช้

## Plugin และชั้นของ skill

| plugin | `layer` | CODEOWNER | skill |
|---|---|---|---|
| `core` | core | `plat-ken` + `plat-may`, `fin-joy` เฉพาะนโยบายของตน | customer-data-policy, brand-guide, pricing-rules, skill-finder |
| `shared` | shared | `plat-ken` | meeting-minutes |
| `exec` | department | `exec-ploy` | deal-approval, exec-deck, pipeline-review, tech-risk-review, cost-headcount-review |
| `sales` | department | `sales-nida` | sales-proposal, follow-up-email |
| `sa` | department | `sa-ton` | req-to-spec, arch-template |
| `product` | department | `pm-beam` | prd-writer, product-sunset |
| `dev` | department | `dev-pond` | coding-standard, project-scaffold |
| `qa` | department | `qa-mint` | test-from-plan, bug-report |
| `devops` | department | `ops-art` | deploy-checklist, postmortem |
| `mlops` | department | `ml-jay` | mlflow-experiment, model-release |
| `hr` | department | `hr-fah` | jd-writer, onboarding-pack |
| `finance` | department | `fin-joy` | pricing-calc, invoice-check |

แผนกทีมกลางไม่มี plugin แยก เพราะ `seed/people.json` กำหนดให้ platform ใช้ `core`

## รวมอะไรเป็น core และเพราะอะไร

| skill ใน core | รวมจาก | เหตุผล |
|---|---|---|
| `customer-data-policy` | สำเนากติกา PDPA 17 จุด | ทุกแผนกแตะข้อมูลลูกค้า ถ้านโยบายเปลี่ยน สำเนาจะเพี้ยนและเสี่ยงข้อมูลรั่ว กติกาเฉพาะงานย้ายไปเป็นแถวใน `doc-type-rules.md` |
| `brand-guide` | กติกาแบรนด์ 9 จุด | เอกสารออกนอกบริษัททุกชิ้นต้องเป็นแบบเดียวกัน |
| `pricing-rules` | price-list 3 สำเนา + กฎกำไรและตารางราคา 8 จุด | ตัวเลขเงินต้องมีแหล่งเดียว |
| `skill-finder` | ไม่มีต้นฉบับ (เขียนใหม่) | เอกสาร onboarding ระบุว่า core ต้องมีตัวหา skill |

ไฟล์ข้าม plugin อ้างด้วย `../` ไม่ได้ ผมจึงแก้ `price.py`, `deal_check.py` และ `price_calc.py` ให้หา price-list จาก core เอง

## สิ่งที่ผมตัดสินใจเอง โปรดตรวจ
- **เขียนร่างใหม่ 2 ตัว:** `skill-finder` และ `meeting-minutes` ไม่มีในโต๊ะใครเลย เจ้าของควรตรวจก่อนใช้
- **ความหมาย `follows` เปลี่ยน:** ของเดิมส่วนใหญ่คือ "งานก่อนหน้า" ผมย้ายไปไว้ใน `next` ของงานนั้น เพื่อให้ `follows` เหลือแค่นโยบาย 3 ตัว
- **`uses` ข้ามแผนกถูกเอาออก:** แต่ละคนติดแค่ core + แผนกตัวเอง จึงเรียก skill แผนกอื่นไม่ได้ การส่งงานข้ามแผนกใช้ `next` แทน
- **เพิ่มกติกาให้ Sales (ควรให้ `sales-nida` ยืนยัน):** ภาคผนวก PDPA ธนาคารเคยอยู่แค่ใน skill ของ MD ทำให้ `sales-proposal` ไม่รู้ว่าต้องมี จนอาจถูกตีกลับ ตอนนี้เพิ่มลง checklist และแม่แบบแล้ว รวมถึงเกณฑ์ดีลที่ต้องส่ง MD
- **ปิดชื่อในตัวอย่าง:** ชื่อลูกค้าปลายทางในตัวอย่าง `report-format.md` ถูกปิดแล้ว

## ปัญหาที่ยังเหลือ
- **ฐานคิด % ส่วนลดไม่ตรงกัน:** `price_calc.py` คิดจากยอดที่ลดได้ แต่ `price.py` คิดจากราคาเต็ม จึงอาจได้ผู้อนุมัติคนละขั้น ผมเขียนใน core ว่าให้ยึดตัวที่เข้มกว่า และ `fin-joy` ควรเลือกสูตรเดียว
- **CODEOWNER ยังไม่ใช่ด่านบังคับ:** ระบบขอรีวิวจากเขาอัตโนมัติ แต่ approve จากคนอื่นที่มีสิทธิ์เขียนก็นับเป็น 1 คน ถ้าต้องการเข้มกว่านี้ จำกัดผู้ approve เป็นทีม `leads` ได้
- **กติกาที่ยังซ้ำอยู่:** กติกา deploy (`deploy-checklist`, `model-release`, `tech-risk-review`), มาตรฐานสถาปัตยกรรมกับโค้ด และสวัสดิการ HR ไม่เข้า core เพราะไม่ใช่ของที่ทุกคนใช้
- **Path ยาวบน Windows:** clone ล้มเหลวเมื่อโฟลเดอร์ตั้งค่าอยู่ลึกมาก ส่วน path ทั่วไปผ่าน ถ้าเจอให้ตั้ง `git config --global core.longpaths true`

## ผลการตรวจ
| รายการ | ผล |
|---|---|
| `claude plugin validate --strict` ทั้ง marketplace และทุก plugin | ผ่าน |
| `scripts/check_skills.py` ตรวจหัวไฟล์และการอ้างอิงข้าม skill | ผ่าน 28 skill |
| ติดตั้งจาก Gitea จริง (`sales`, `dev`, `finance`, `shared`) | ผ่าน และ `core` ติดตามมาเอง |
| Claude โหลด `pricing-rules` และเห็น `sales-proposal` | ผ่าน |
| สคริปต์ราคา 3 ตัว | ตัวเลขถูก และหา price-list เจอ |
| push ตรงเข้า `main` | ถูกปฏิเสธ |
| merge โดยไม่มี approve | ถูกปฏิเสธ (HTTP 405) |
| PR แก้ `plugins/sales` | ขอรีวิวจาก `sales-nida` อัตโนมัติ |
| สแกน PII ทั้งคลัง | เหลือแค่ตัวอย่างในตาราง mask, บัญชีบริษัท และคำที่สแกนจับผิด |

- **ยังไม่ได้รันจริง:** สคริปต์อื่นตรวจแค่ syntax และยังไม่ได้ลองใช้ skill ทั้งงาน
- **ร่องรอยจากการทดสอบ:** PR #1 เป็น PR ทดสอบที่ปิดแล้วและลบ branch แล้ว แต่ยังเห็นในประวัติ
- **ถ้าจะแก้คลังต่อ:** ต้องเปิด PR และให้คนอื่น approve เพราะ `plat-ken` approve PR ของตัวเองไม่ได้

คลังในเครื่องอยู่ที่ `desks/plat-ken/org-skills/` ส่วนวิธีติดตั้งและกติกาแก้คลังอยู่ใน `README.md`
