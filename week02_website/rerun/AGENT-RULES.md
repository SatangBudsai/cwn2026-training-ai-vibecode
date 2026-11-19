# กติกากลางของเอเจนต์ (รันแผน blocks.json จริง · multi-account จำลองด้วยเอเจนต์แยกบนบัญชีเดียว)

- โจทย์อยู่ที่ `D:\ME\cwn2026-training-ai-vibecode\week2_student\` (README, USER-STORIES, REQUIREMENTS, CONTRACT, TEST-DATA, TEST-PLAN, BUGS, DECISIONS, brief/BRIEF.md) ห้ามแก้ไฟล์ในนั้น
- งานสร้างใหม่อยู่ที่ `D:\ME\cwn2026-training-ai-vibecode\week02_website\rerun\app\` เท่านั้น
- **ห้ามอ่านหรือคัดลอกโค้ดจาก** `week02_website\app\` และ `week02_website\e2e\` (เป็นงานรอบก่อน ต้องสร้างใหม่จากโจทย์ล้วน ๆ)
- Node 24, **ไม่มี dependency ภายนอก** (ไม่มี npm install) ใช้ `node:http`, `node:sqlite`, `node:crypto`; เว็บเป็น HTML + CSS + JS ธรรมดา
- แต่ละบล็อกเขียนเฉพาะไฟล์ของตน (ดู `INTERFACES.md` ที่ B01 สร้าง) ห้ามแก้ไฟล์ของบล็อกอื่น ถ้าต้องการให้บอกในรายงานท้ายงาน
- ทำให้ครบทุก FR/BR/DECISIONS ที่เกี่ยวกับบล็อกตน ห้ามเดากฎตัวเลข ให้อ่าน REQUIREMENTS / DECISIONS / TEST-DATA
- จับเวลาจริง: ตอนเริ่มบล็อกและตอนจบบล็อก รัน `node -e "console.log(Date.now())"` แล้วเขียนไฟล์ `rerun\timing\<รหัสบล็อก>.json` เป็น `{"block":"B01","startMs":...,"endMs":...}` (ทำทีละบล็อก ถ้าได้หลายบล็อก)
- ห้ามรัน docker ห้ามแก้ไฟล์ตั้งค่าระบบ ห้ามล็อกอินแทนผู้ใช้ ห้ามใช้ Bash tool (ค้าง) ให้ใช้ PowerShell
- ทดสอบเองได้โดยเปิดเซิร์ฟเวอร์พอร์ตของตัวเอง (ระบุในพรอมต์) ด้วย `TEST_MODE=1` แล้วยิง API ด้วย `Invoke-RestMethod`/node สั้น ๆ แล้วปิดเซิร์ฟเวอร์ที่เปิดเองทุกครั้ง
- รายงานท้ายงาน ภาษาไทยสั้น ๆ: ไฟล์ที่เขียน · สิ่งที่ทำแล้ว · สิ่งที่ยังไม่ทำ/สมมติ · คำถามถึง TA
