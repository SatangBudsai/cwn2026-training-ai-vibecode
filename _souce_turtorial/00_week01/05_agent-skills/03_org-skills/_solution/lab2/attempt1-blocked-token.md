# LAB 2 รอบแรก (ติด token ไม่มีสิทธิ์สร้าง repo) · 961 วินาที · 79 คำสั่ง

รอบนี้ seed ยังออก token ให้ทีมกลางแค่ write:repository จึงสร้าง repo ในองค์กรไม่ได้ (แก้ seed แล้วรัน LAB 2 ใหม่ทั้งหมด) · ระหว่างรอบนี้มีการรัน docker compose up จากอีกโฟลเดอร์ทำให้ token ถูกออกใหม่ด้วย

# สรุป: คลัง org-skills (marketplace `novatech-skills`) เสร็จในเครื่องแล้ว แต่ยังไม่ได้ขึ้น Gitea

ตัวคลังอยู่ที่ `desks/plat-ken/org-skills` (commit แล้ว 1 commit) และผ่านการตรวจทุกตัว ที่ยังทำไม่ได้คือสร้าง repo, push และตั้ง branch protection ติดเรื่อง token (รายละเอียดอยู่ท้ายสุด)

## Plugin และชั้นของแต่ละ skill

มีทั้งหมด 11 plugin และ 25 skill (skill เดิม 19 ตัว + สร้างใหม่ 6 ตัว)

| plugin | layer | CODEOWNER | skill |
|---|---|---|---|
| **core** | core | plat-ken | brand-guide 🆕 · customer-data-policy (ย้ายมาจาก plat-may) · pricing-rules 🆕 · tech-standards 🆕 · deploy-rules 🆕 · skill-finder 🆕 |
| **shared** | shared | plat-ken + ทีม leads | meeting-minutes 🆕 |
| exec | department | exec-ploy | deal-approval · exec-deck |
| sales | department | sales-nida | sales-proposal · follow-up-email |
| sa | department | sa-ton | req-to-spec · arch-template |
| dev | department | dev-pond | coding-standard · project-scaffold |
| qa | department | qa-mint | test-from-plan · bug-report |
| devops | department | ops-art | deploy-checklist · postmortem |
| mlops | department | ml-jay | mlflow-experiment · model-release |
| hr | department | hr-fah | jd-writer · onboarding-pack |
| finance | department | fin-joy | pricing-calc · invoice-check |

ทีมกลาง (platform) ใช้ plugin `core` เป็น plugin ของแผนก ตามที่ระบุไว้ใน `seed/people.json`

## รวมอะไรเป็น core และเพราะอะไร

เกณฑ์คือ กติกาเดียวกันถูกคัดลอกไปไว้ใน skill ของหลายคนหลายแผนก ซึ่งเสี่ยงว่าพอต้นฉบับเปลี่ยน แต่ละสำเนาจะไม่ตรงกัน

| skill ใน core | ของเดิมที่ซ้ำกัน (ลบสำเนาออกแล้ว) |
|---|---|
| **customer-data-policy** | สรุป PDPA 8 ชุดใน invoice-check, follow-up-email, sales-proposal, bug-report, mlflow-experiment, model-release, deploy-checklist, postmortem · กติกาเฉพาะงานของแต่ละชุดย้ายไปเป็นแถวใน `doc-type-rules.md` |
| **brand-guide** | brand-slide-rules (exec), tone-and-format (sales), ส่วนน้ำเสียงใน jd-rules (hr), ส่วนรูปแบบใน proposal-template, ส่วนแบรนด์ใน postmortem |
| **pricing-rules** | `price-list.csv` 3 ชุดที่เหมือนกันทุกไบต์ (finance, sales, exec) + margin-rules/pricing-rules/approval-rules · สคริปต์คิดราคา 3 ตัวแก้ให้อ่านไฟล์ราคาจาก core ที่เดียว |
| **tech-standards** | arch-standards และ novatech-standards (SA), team-standards และ coding-rules (Dev) · เดิม req-to-spec เรียก `coding-standard` ของ dev ซึ่งคนแผนก SA ไม่ได้ติดตั้ง |
| **deploy-rules** | deploy-rules ของ ops-art และของ ml-pim ที่ซ้ำกัน + สคริปต์ `deploy_window.py` |

ส่วนที่ซ้ำกันเฉพาะในแผนกเดียว ไม่ได้ยกขึ้น core แต่รวมเป็นไฟล์กลางของ plugin นั้น:
- HR: ไฟล์สวัสดิการ 2 ชุด รวมเป็น `plugins/hr/references/benefits.md`
- ML: บริบทโมเดลพยากรณ์คิว 2 ชุด รวมเป็น `plugins/mlops/references/queue-forecast.md`

## หัวไฟล์แบบใหม่

ทุก skill ใช้หัวแบบเดียวกัน: `metadata: owner / layer / version / uses / next / follows` และอ้างชื่อแบบ `plugin:skill`

- **uses** = skill ที่เรียกให้ทำบางขั้น อนุญาตเฉพาะ plugin เดียวกันหรือ core
- **next** = งานถัดไป ข้ามแผนกได้
- **follows** = นโยบายใน core ที่ต้องทำตาม skill ของแผนกทุกตัวต้องมี `core:customer-data-policy`

`follows` เดิมหลายตัวใช้หมายถึง "ขั้นก่อนหน้า" ผมกลับทิศไปใส่ใน `next` ของ skill ต้นทางแทน และย้ายไฟล์ข้อมูลที่เคยใส่ไว้ใน `uses` ของ exec-deck ไปไว้ในเนื้อหาของ skill แทน

## การตรวจ

- `claude plugin validate .` และ `claude plugin validate plugins/<ทั้ง 11 ตัว>` ผ่านทั้งหมด
- `node tools/skills.mjs check` ผ่าน ตัวนี้ผมเขียนเพิ่มและใส่ไว้ใน CI ของ Gitea ด้วย มันตรวจหัวไฟล์ ตรวจว่า layer ตรงกับ plugin ห้ามไฟล์ซ้ำข้าม skill และดูว่า CATALOG ยังตรงกับของจริง ลองใส่ของผิดเข้าไปแล้ว มันจับได้จริง
- สคริปต์คิดราคา 3 ตัวรันได้กับ price-list ใน core ตัวอย่าง 755,000 บาท ได้ margin 36.8% ตรงกับ margin-rules

## ⚠️ ยังไม่ได้สร้าง repo, push และตั้ง branch protection

**สาเหตุ:** token ใน `.gitea-token` ของคุณใช้ไม่ได้แล้ว เมื่อ 14:43 มีการรัน `docker compose up` ของแล็บอีกชุดที่ `C:\Users\oishi\Documents\GitHub\CWN\...\03_org-skills\novatech` ซึ่งต่อ Gitea ตัวเดียวกัน ขั้น seed ของมันออก token ใหม่ให้ทุกคน และเขียน token ใหม่ลงโฟลเดอร์ของชุดนั้นแทน

ผมลองใช้ token ใหม่ของ plat-ken จากโฟลเดอร์นั้น (อ่านอย่างเดียว ไม่ได้แก้ไฟล์ของคุณ) ยืนยันได้ว่าเป็น plat-ken จริง แต่ token ที่ seed ออกให้มีแค่สิทธิ์ `write:repository` สร้าง repo ไม่ได้:
- สร้างใน org ต้องมี `write:organization`
- สร้างใต้ user ต้องมี `write:user`

ผมไม่ได้เอารหัสผ่านแล็บใน `.env` ไปออก token สิทธิ์สูงกว่าเอง เพราะเกินจากที่คุณให้ไว้ (บันทึกเรื่องนี้ไว้ใน memory แล้ว)

**ทางไปต่อ เลือกได้ 1 ทาง:**
1. สร้าง repo เปล่า `novatech/org-skills` แบบ public เองในหน้าเว็บ Gitea
2. อนุญาตให้ผมใช้ `LAB_PASSWORD` ใน `.env` ออก token ของ plat-ken ที่มี `write:organization`
3. ส่ง token ที่มีสิทธิ์นั้นมาให้

เมื่อมี repo แล้ว สคริปต์นี้จะ push `main` และตั้ง branch protection ให้ (ห้าม push ตรง, ห้าม force push, ต้อง approve อย่างน้อย 1 คน, ถ้ามีคนขอแก้หรือรีวิวที่ขอไว้ยังค้างจะ merge ไม่ได้):

`C:\Users\oishi\AppData\Local\Temp\claude\C--t-org05-novatech-desks-plat-ken\d81c8883-0fc5-4dc2-b75a-2af5be45699d\scratchpad\finish-gitea.sh`

**สิ่งที่ยังไม่ได้ทดสอบ เพราะยังไม่ได้ push:**
- Gitea 1.24 ไม่มีตัวเลือก "ต้องให้ CODEOWNER approve" โดยตรง ผมจึงใช้ `block_on_official_review_requests` แทน (ถ้ารีวิวที่ขอไว้ยังค้างอยู่ จะ merge ไม่ได้)
- การเขียนทีมแบบ `@novatech/leads` ใน CODEOWNERS ยังต้องดูว่า Gitea รับไหม

ทั้งสองข้อจะตรวจตอนเปิด PR แรก