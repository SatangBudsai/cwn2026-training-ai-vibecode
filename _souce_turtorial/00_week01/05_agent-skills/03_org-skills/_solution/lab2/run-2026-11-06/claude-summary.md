# LAB 2 · คำตอบเต็มของ Claude (รอบบริษัท 28 คน · 2026-11-06)

โต๊ะ `plat-ken` · 13 นาที 15 วินาที · 34 คำสั่ง · $4.73 · พรอมต์: [`prompt.txt`](prompt.txt) · คลังที่ได้: [`org-skills-28-after-lab2`](../../org-skills-28-after-lab2/)

---

คลัง `novatech/org-skills` ขึ้น Gitea แล้วที่ http://localhost:3300/novatech/org-skills มี 12 plugin รวม 28 skill และ `main` ถูกล็อกแล้ว ที่ควรรีบดูคือ repo สาธารณะนี้มีต้นทุนและ margin อยู่ด้วย และ proposal ธนาคารเสี่ยงโดนตีกลับเพราะกฎใหม่ของ MD

## Plugin และชั้นของ skill

| plugin | CODEOWNER | layer | skill |
|---|---|---|---|
| `core` | `plat-ken` | core | `customer-data-policy`, `brand-guide`, `pricing-rules`, `skill-finder` |
| `shared` | `plat-ken` | shared | `meeting-minutes` |
| `exec` | `exec-ploy` | department | `deal-approval`, `exec-deck`, `pipeline-review`, `tech-risk-review`, `cost-headcount-review` |
| `sales` | `sales-nida` | department | `sales-proposal`, `follow-up-email` |
| `sa` | `sa-ton` | department | `req-to-spec`, `arch-template` |
| `product` | `pm-beam` | department | `prd-writer`, `product-sunset` |
| `dev` | `dev-pond` | department | `coding-standard`, `project-scaffold` |
| `qa` | `qa-mint` | department | `test-from-plan`, `bug-report` |
| `devops` | `ops-art` | department | `deploy-checklist`, `postmortem` |
| `mlops` | `ml-jay` | department | `mlflow-experiment`, `model-release` |
| `hr` | `hr-fah` | department | `jd-writer`, `onboarding-pack` |
| `finance` | `fin-joy` | department | `pricing-calc`, `invoice-check` |

## รวมอะไรเป็น core เพราะอะไร

| skill ใน core | เดิมซ้ำอยู่ใน | เหตุผล |
|---|---|---|
| `customer-data-policy` | 17 skill | ห้ามเบอร์มือถือ/เลขบัตร และตาราง mask ถูกคัดลอกไปเกือบทุกแผนก ถ้านโยบายเปลี่ยนต้องไล่แก้ทุกที่ |
| `brand-guide` | 8 skill | สี ฟอนต์ น้ำเสียง และชื่อบริษัท เป็นกติกาเดียวกันของเอกสารที่ส่งออก |
| `pricing-rules` | 8 skill | `price-list.csv` มี 3 สำเนา และสูตร margin เกณฑ์อนุมัติ สิทธิ์ส่วนลดถูกเขียนซ้ำ |
| `skill-finder` | ของใหม่ | ตอบจาก `catalog.md` ที่ `scripts/build-catalog.py` สร้างจากหัวไฟล์ทุก skill |

กฎเฉพาะงานยังอยู่ที่เดิม เช่น ลบข้อมูลใน 30 วันตอนเลิกให้บริการ หรือภาคผนวก PDPA ใน `deal-approval`

## ผลการตรวจ
- **Validate:** `claude plugin validate` ผ่านทั้ง marketplace และ `--strict` ครบ 12 plugin ผมไม่นับคำเตือน LICENSE/ไอคอน เพราะเป็นเกณฑ์ของ plugin directory สาธารณะ
- **สคริปต์ราคา:** ทั้ง 3 ตัวให้ผลตรงกับต้นฉบับทุกไบต์ ทั้งตอนรันในคลังและหลังติดตั้งจริง
- **ติดตั้งจริง:** ลงจาก Gitea ได้ครบทุก plugin และลง `sales` แล้ว `core` ตามมาเอง
- **Branch protection:** push ตรงถูกปฏิเสธ ส่วน merge ที่ไม่มี approve ถูกกั้นแม้ใช้ force merge แบบ admin
- **CODEOWNERS:** PR ทดสอบขอรีวิว `sales-nida` และ `fin-joy` ถูกต้อง
- **โต๊ะคนอื่น:** hash ตรงครบ 208 ไฟล์ ไม่ถูกแก้

## กฎที่แผนกควรรู้แต่ยังไม่รู้ (ผมไม่ได้เติมให้ รอหัวหน้าแผนกตัดสินผ่าน PR)
ผมเช็กด้วยการอ่าน SKILL ทุกตัวและค้นคำสำคัญ จึงอาจยังมีจุดอื่นที่ไม่เจอ
1. **ภาคผนวก PDPA ลูกค้าธนาคาร (`sales-nida`):** มีเฉพาะใน `deal-approval` ส่วน `sales-proposal` ไม่รู้เลย แม่แบบ 9 หัวข้อก็ไม่มี และ proposal ธนาคารที่ไม่มีภาคผนวกนี้ MD จะตีกลับทันที
2. **ดีลธนาคารทุกมูลค่าต้องผ่าน MD (`sales-nida`, `exec-ploy`):** รวมถึงดีลตั้งแต่ 1 ล้านบาท และดีลที่มีค่าปรับนอกแบบ ส่วน `sales-proposal` และ `pipeline-review` ดูแค่ margin กับส่วนลด
3. **ภาคผนวกเดียวกันใน `pipeline-review` (`exec-ploy`):** ไม่ได้ตรวจเรื่องนี้ จึงอาจเร่งดีลที่จะโดนตีกลับ

## สิ่งที่ผมตัดสินใจเองหรือทำเกินคำสั่ง
- **`meeting-minutes` เขียนใหม่:** ไม่มีใครมี skill นี้ ผมจึงเขียนฉบับสั้นโดยไม่เพิ่มกฎใหม่ และใส่คุณเป็นเจ้าของ
- **ความหมายหัวไฟล์:** `follows` เดิมหมายถึงงานก่อนหน้า จึงย้ายไปเป็น `next` ของงานนั้น ส่วน `uses: customer-data-policy` ย้ายเป็น `follows` ตอนนี้จึงมีแค่ `sales-proposal` ที่มี `uses`
- **ตั้งค่าเพิ่ม:**
  - plugin อื่นทุกตัวขึ้นกับ `core`
  - `fin-joy` เป็น CODEOWNER ร่วมของ `pricing-rules`
  - เปิด `block_admin_merge_override` และ `block_on_rejected_reviews`
- **ร่องรอยจากการทดสอบ:** PR #1 ที่ปิดแล้วยังค้างในประวัติ และ `sales-nida` กับ `fin-joy` น่าจะได้แจ้งเตือนขอรีวิว ถ้าเจอให้ข้ามได้
- **ของเดิมบนโต๊ะ:** skill ส่วนตัวยังอยู่ครบ เจ้าของควรลบเองหลังติดตั้ง plugin เพื่อไม่ให้มีกฎสองชุด
- **ข้อจำกัดบน Windows:** ถ้าโฟลเดอร์ config ของ Claude Code อยู่ลึกมาก การ clone จะล้มเพราะ path ยาวเกิน ผมเจอตอนทดสอบในโฟลเดอร์ลึก แต่ path สั้นผ่านปกติ

## คำถามถึงคุณ
1. **จะให้ repo เป็นสาธารณะต่อไหม?** ตอนนี้เปิดตามที่สั่ง ใครก็อ่านได้โดยไม่ต้อง login ทั้งต้นทุน เกณฑ์ margin กติกาอนุมัติของ MD และเลขบัญชีบริษัท ในแล็บที่อยู่บน localhost และข้อมูลสมมติถือว่ารับได้ แต่ถ้าเป็นของจริงผมแนะนำให้เป็น private และให้โต๊ะดึงด้วย token
2. **จะจำกัดคนที่ approve ได้ไหม?** ตอนนี้ทุกทีมมีสิทธิ์เขียน และ CODEOWNERS แค่ขอรีวิว แผนกอื่นจึง approve แทนเจ้าของได้ ผมแนะนำให้จำกัดไว้ที่ทีม `leads` แต่ยังไม่ได้ตั้งเพราะเข้มกว่าที่สั่ง
3. **จะรวมกฎที่ซ้ำแต่ไม่ได้ใช้ทุกคนไหม?** ผมยังไม่รวม เพราะไม่เข้าเกณฑ์ "ทุกคนต้องใช้" และแนะนำให้หัวหน้าแผนกเจ้าของกฎตัดสิน:
   - **กติกา deploy:** อยู่ใน `deploy-checklist`, `model-release`, `tech-risk-review`
   - **มาตรฐานโค้ดและสถาปัตยกรรม:** อยู่ใน `coding-standard`, `project-scaffold`, `req-to-spec`, `arch-template`, `tech-risk-review` และบางส่วนใน `prd-writer`
   - **สวัสดิการ:** อยู่ใน `jd-writer`, `onboarding-pack`
