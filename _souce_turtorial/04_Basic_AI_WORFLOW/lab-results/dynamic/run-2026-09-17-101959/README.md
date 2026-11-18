# Dynamic Workflow — ผลรอบสาธิต

ใช้ Prompt จากหัวข้อ 3.3 และ Dynamic Template 3.2 จำลอง Planner/Executor/Evaluator ในบทสนทนาเดียว ไม่ได้เรียกโมเดลแยกบทบาท โค้ดสร้างผลงานและตัวตรวจดัดแปลงจากชุด Graph รอบก่อน จึงเป็นการสาธิตแบบรู้ตัวอย่างคำตอบแล้ว ไม่ใช่การทดลองอิสระสำหรับเปรียบเทียบประสิทธิภาพเวิร์กโฟลว์

โค้ดใน source/ สร้างไฟล์และบันทึกการตัดสินที่ออกแบบไว้ในรอบนี้ เงื่อนไข Re-plan ของระบบเบิกค่าใช้จ่ายเป็นกรณีสาธิตที่กำหนดไว้จากข้อขัดแย้งในโจทย์ ไม่ใช่การค้นพบโดยโมเดลอิสระระหว่างรัน แต่การตรวจ Dependency, สถานะ, hash, Playwright และการ render Mermaid รันจริงใหม่ทั้งหมด ไม่คัดลอกภาพหรือ PASS เก่ามาเป็นหลักฐาน

## อ่านหลักฐาน

แต่ละโจทย์มี prompt-used.md/input-used.md, plans/plan-v1-initial.*, snapshot หลังแต่ละงาน, plan-current.md/json, events.jsonl, execution-table.md, trace.md, ผลงาน, verification.json และภาพใหม่

- จองห้อง: Plan v1 จบโดยไม่ต้อง Re-plan
- เบิกค่าใช้จ่าย: Plan v2 เพิ่ม T1b เก็บข้อขัดแย้งวงเงิน และเพิ่ม Dependency ให้ T5
- คลินิก: เฟสแรก Plan v1; หลัง Change Request เป็น v2 เพิ่มงานที่ได้รับผลกระทบ ใช้ T2 As-Is เดิมโดยไม่รันซ้ำ พร้อม output-phase1.md และ mockup-phase1.html สำหรับเทียบ

ผล semantic review เป็นการตรวจในบทสนทนาเดียวและอ่านผลงานที่ใช้โค้ดตัวอย่างเป็นฐาน ไม่ใช่คะแนนของผู้ประเมินอิสระ ภาพ Mockup เบิกเงินและคลินิกไม่ทำธุรกรรมจริง

## รันตรวจซ้ำบน Remote

ต้องมี Python/Playwright, Chromium และ Mermaid ตามตำแหน่งที่สคริปต์ระบุ

```sh
/opt/venv/bin/python 1_meeting_room/tasks/T4-test.py
/opt/venv/bin/python source/verify-docs.py
/opt/venv/bin/python source/render-docs.py
```

คำสั่งตรวจซ้ำจะเขียนผลตรวจ/ภาพในชุดนี้ใหม่ ควรคัดลอกชุดผลทดลองก่อนหากต้องการเก็บ baseline เดิม สคริปต์สร้างผลงานใน source/ ต้องมีแผนและสถานะเริ่มต้นก่อนทำงาน; ไม่ควรรันซ้ำทับสถานะ DONE

ดู [ข้อมูลวิธีรัน](run-info.json) และ [ผลตรวจลำดับงาน/สถานะ/hash](dependency-audit.json)
