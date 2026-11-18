# งาน: เครื่องวัด "หา skill เจอไหม" สำหรับ LAB 7 (บท 05 ส่วน 03)

บริบท: บริษัทจำลองโนวาเทคมีคลัง skill ที่ Gitea http://localhost:3300/novatech/org-skills (repo สาธารณะ อ่านได้โดยไม่ต้องล็อกอิน)
มี plugin 11 ตัว (core, shared, exec, sales, sa, dev, qa, devops, mlops, hr, finance) แต่ละ skill อยู่ที่ plugins/<plugin>/skills/<skill>/SKILL.md มีหัวไฟล์ YAML (name, description, metadata: owner, layer, version, uses, next, follows)
ข้อมูลพนักงานอยู่ที่ C:/t/org05/novatech/seed/people.json แต่ละคนมี "skill" (ชื่อ skill ที่ถูกต้อง) และ "phrases" (คำที่คนนั้นชอบพิมพ์สั่ง AI)

ทำในโฟลเดอร์ C:/t/org05/lab7/ เท่านั้น:
1. `git clone http://localhost:3300/novatech/org-skills.git repo` (ถ้ามีแล้วให้ `git -C repo pull`)
2. เขียน `build-cards.mjs` (Node 22 ไม่ใช้ npm package): อ่านทุก SKILL.md → `cards-header.json` (name, plugin, description, metadata) และ `cards-full.json` (เหมือนกัน + `summary` = สรุปแบบดึงจากเนื้อหา: หัวข้อ ## ทั้งหมด + ประโยคแรกของแต่ละหัวข้อ ไม่เกิน 600 ตัวอักษร ไม่ใช้ AI)
3. เขียน `queries.json`: จาก people.json เอาทุกคนที่มี skill และ skill นั้นมีอยู่จริงในคลัง ใช้ phrases ทุกข้อเป็นคำค้น → [{q, expect: "<plugin>:<skill>", who}] (คำค้นมาจากพนักงาน ไม่ใช่คนเขียน skill)
4. เขียน `search.mjs`: ค้นแบบ BM25 บนตัวอักษรไทยด้วย character trigram (ภาษาไทยไม่มีเว้นวรรค) + คำภาษาอังกฤษแยกด้วยช่องว่าง/ขีด ฟังก์ชัน `search(cards, q, k)` คืน top-k พร้อมคะแนน ใช้เป็น CLI ได้: `node search.mjs <cards.json> "<คำค้น>"`
5. เขียน `eval.mjs`: วัด hit@1 และ hit@5 ของ A = cards-header.json, B = cards-full.json และ C = B + เติม skill ที่ต้องใช้คู่กันจากเส้น uses/follows (รายงานว่าหาคู่ครบกี่คู่) → `eval-result.json` + ตาราง markdown `eval-result.md` (รายข้อ: คำค้น, ผู้พิมพ์, ที่ถูก, A อันดับที่, B อันดับที่)
6. เขียน `graph.mjs`: อ่าน cards-header.json สร้าง `graph.json` (nodes = skill + owner, edges = uses/next/follows/owned_by) และฟังก์ชันตอบ "ถ้าแก้ skill X กระทบใคร" (ใครมี follows/uses ชี้มาที่ X ทั้งทางตรงและทางอ้อม) CLI: `node graph.mjs impact customer-data-policy`
7. รันทุกอย่างจริง แล้วเขียน `REPORT.md` สั้น ๆ: จำนวน skill, จำนวนคำค้น, ผล A/B/C, ตัวอย่างคำค้นที่หาไม่เจอพร้อมเหตุผล, ผล impact ของ customer-data-policy

กติกา: ห้ามรันคำสั่ง git ที่เปลี่ยน repo ใน C:/Users/oishi/Documents/GitHub (ห้าม add/commit/push/stash/checkout) ห้าม push อะไรขึ้น Gitea ห้ามแก้ไฟล์นอก C:/t/org05/lab7/ ห้ามใช้ Chrome ของผู้ใช้
ตอบกลับสุดท้ายเป็นสรุปไม่เกิน 200 คำ: ไฟล์ที่ได้ และตัวเลข A/B/C
