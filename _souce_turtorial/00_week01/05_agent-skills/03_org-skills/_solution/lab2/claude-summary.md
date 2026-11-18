# LAB 2 · คำตอบของ Claude (plat-ken) · 775 วินาที · 57 คำสั่ง

ผมสร้างคลัง `novatech/org-skills` (marketplace ชื่อ `novatech-skills`) เสร็จแล้ว เป็น repo สาธารณะบน Gitea ที่ http://localhost:3300/novatech/org-skills และ push ขึ้นแล้ว `claude plugin validate` ผ่านทั้ง marketplace และ plugin ทั้ง 11 ตัว ผมลอง push ตรงเข้า `main` แล้ว Gitea ปฏิเสธว่า "Not allowed to push to protected branch main" ส่วน commit ทดสอบนั้นลบทิ้งในเครื่องแล้ว

## มี plugin อะไรบ้าง และ skill แต่ละตัวอยู่ชั้นไหน

ชั้นใหม่มี 3 ชั้น ทุก skill ใช้ค่า `layer` ตามชั้นนี้แทน `personal` แบบเดิม:

| plugin | layer | CODEOWNER | skill |
|---|---|---|---|
| `core` | core | plat-ken | customer-data-policy, brand-guide, pricing-rules, skill-finder |
| `shared` | shared | plat-ken | meeting-minutes |
| `exec` | department | exec-ploy | deal-approval, exec-deck |
| `sales` | department | sales-nida | sales-proposal, follow-up-email |
| `sa` | department | sa-ton | req-to-spec, arch-template |
| `dev` | department | dev-pond | coding-standard, project-scaffold |
| `qa` | department | qa-mint | test-from-plan, bug-report |
| `devops` | department | ops-art | deploy-checklist, postmortem |
| `mlops` | department | ml-jay | mlflow-experiment, model-release |
| `hr` | department | hr-fah | jd-writer, onboarding-pack |
| `finance` | department | fin-joy | pricing-calc, invoice-check |

รวม 23 skill: 18 ตัวย้ายมาจากโต๊ะของแต่ละคน และ 5 ตัวเขียนใหม่ (brand-guide, pricing-rules, skill-finder, meeting-minutes และการปรับ customer-data-policy) ส่วน dev-new ไม่มี skill มาก่อน CODEOWNER ของ core คือ plat-ken แต่ใน core ยังเพิ่มเจ้าของกติกาเป็นผู้รีวิวด้วย คือ plat-may สำหรับ PDPA กับแบรนด์ และ fin-joy สำหรับราคา

## รวมอะไรเป็น core เพราะอะไร

| skill ใน core | เดิมถูกคัดลอกไว้ที่ไหน | เหตุผล |
|---|---|---|
| `customer-data-policy` (ของ plat-may) | สรุป PDPA ซ้ำ 8 ที่: invoice-check, bug-report, follow-up-email, sales-proposal, mlflow-experiment, model-release, postmortem, deal-approval | ทุกคนที่แตะข้อมูลลูกค้าต้องทำตาม และแต่ละสำเนาย่อไม่เหมือนกัน กติกาเฉพาะงานที่มีอยู่แค่ในบางสำเนา (เช่น ห้ามใส่ชื่อลูกค้ารายอื่นในฉบับลูกค้าของ postmortem, ห้ามส่งข้อมูลดิบของลูกค้า A ให้ลูกค้า B) ย้ายมาเป็นแถวใน `doc-type-rules.md` ไม่มีข้อไหนหาย |
| `brand-guide` (ใหม่ เจ้าของ plat-may) | กติกาแบรนด์ซ้ำ 7 ที่: exec-deck, jd-writer, follow-up-email, sales-proposal, onboarding-pack, postmortem, arch-template | ทุกเอกสารที่ส่งออกนอกบริษัทต้องใช้ ตอนนี้ใช้คู่มือ v3.2 ฉบับเต็มกับ logo.svg ชุดเดียว |
| `pricing-rules` (ใหม่ เจ้าของ fin-joy) | price-list.csv 3 สำเนาที่เหมือนกันทุกไบต์ และกฎ margin 3 ชุด ใน sales, finance, exec | ใช้ร่วมกัน 3 แผนก ถ้าราคาเปลี่ยนแล้วแก้ไม่ครบทุกสำเนา ตัวเลขจะไม่ตรงกัน สคริปต์คิดราคาทั้ง 3 ตัวแก้ให้อ่าน price-list จาก core แล้ว ผมรันทดสอบแล้วได้ตัวเลขตรงกับตัวอย่างในกฎ (755,000 / 477,000 / 36.8%) |
| `skill-finder` (ใหม่ เจ้าของ plat-ken) | ไม่เคยมี แต่ onboarding กำหนดให้ core มี "หา skill" | ตอบได้ว่ามี skill เรื่องนี้ไหม และถ้าแก้ skill นี้กระทบใคร โดยอ่านแค็ตตาล็อกที่สร้างจากหัวไฟล์อัตโนมัติ |

skill ในแผนกที่เคยคัดลอกกติกาไว้ ตอนนี้อ้าง core ผ่าน `follows` แทน และลบไฟล์สำเนาทิ้งไป 12 ไฟล์

## หัวไฟล์แบบเดียวกันทั้งคลัง

ทุก skill มีหัวไฟล์เรียงแบบนี้: `owner, plugin, layer, version, uses, next, follows`
- `uses` คือ skill ที่เรียกใช้
- `next` คืองานถัดไป
- `follows` คือนโยบายที่ต้องทำตาม และชี้ได้เฉพาะ skill ใน core

`python scripts/build.py --check` ตรวจกติกาหัวไฟล์ให้ และไม่ยอมให้มีไฟล์สำเนากติกากลางอยู่นอก core สคริปต์นี้สร้าง `marketplace.json`, `plugin.json`, `.gitea/CODEOWNERS` และแค็ตตาล็อกของ skill-finder ให้ด้วย ห้ามแก้ไฟล์เหล่านี้มือ

## สิ่งที่ควรรู้

- **ควรให้เจ้าของรีวิว skill ที่ผมเขียนใหม่:** brand-guide กับการปรับ customer-data-policy (plat-may), pricing-rules (fin-joy), skill-finder กับ meeting-minutes (คุณเอง)
- **pricing-rules อยู่ใน core:** ผมทำตามกติกาของคุณว่ากติกาที่หลายคนเขียนซ้ำให้รวมใน core แต่ onboarding-notes บอกว่า core มีแค่แบรนด์, PDPA กับหา skill ถ้าไม่อยากให้ HR หรือ Dev ต้องติดตั้งไปด้วย ย้ายไป `shared` ได้ โดยแก้ `scripts/plugins.json` บรรทัดเดียวแล้วรัน build ใหม่
- **ยังไม่ได้รวม:** ของที่ซ้ำกันภายในแผนกเดียวกันหรือข้ามแค่ 2 แผนก เช่น สวัสดิการใน HR, บริบทโมเดลพยากรณ์คิวใน ML, deploy-rules ของ model-release ยังไม่ได้แตะ
- **ยังไม่ได้ทดสอบจริง:** ยังไม่ได้เปิด PR จริงเพื่อดูว่า Gitea ขอรีวิวจาก CODEOWNER ถูกคน ผมตั้ง "approve อย่างน้อย 1 คน" ไว้ แต่ยังไม่ได้บังคับว่าคนที่ approve ต้องเป็น CODEOWNER
- **คำเตือนจาก validator:** ไม่มีไฟล์ LICENSE และไอคอน ซึ่งจำเป็นเฉพาะตอนส่งเข้าแค็ตตาล็อก plugin สาธารณะ ไม่ทำให้ validate ไม่ผ่าน
- **โฟลเดอร์ `desks/*/.claude/skills/` ของทุกคนยังอยู่เหมือนเดิม** ผมไม่ได้ลบหรือแก้

ไฟล์ทั้งหมดอยู่ในเครื่องที่ `C:\t\org05\novatech\desks\plat-ken\org-skills` คนอื่นติดตั้งได้ด้วย `/plugin marketplace add http://localhost:3300/novatech/org-skills.git` แล้วต่อด้วย `/plugin install core@novatech-skills` และ plugin ของแผนกตัวเอง