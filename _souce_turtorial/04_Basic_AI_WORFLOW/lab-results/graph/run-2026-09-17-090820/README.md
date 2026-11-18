# Graph Lab — ผลรันใหม่ครบสามโจทย์

อ่านแต่ละโฟลเดอร์: prompt-used.md คือ Prompt เต็มที่ใช้, nodes/ คือผลแยก Node, events.jsonl และ trace.md คือร่องรอย, execution-table.md คือตารางสรุป, verification.json คือผลสุดท้าย และ response.md คือคำตอบสรุป

วิธีรัน: Codex ในบทสนทนาเดียวจำลองบทบาทและสร้างไฟล์ตามลำดับ Dependency บน Remote ไม่ใช่หลายโมเดลที่แยกบริบทหรือทำงานขนาน จึงยังไม่พิสูจน์การแยกบริบท N2–N4 โค้ดต้นทางและข้อมูลของรอบนี้อยู่ใน source/ เพื่อการตรวจสอบ ไม่ได้นำผลงาน Loop เดิมมาเปลี่ยนชื่อเป็น Graph

## ตรวจซ้ำ
จากโฟลเดอร์รอบนี้:
- `/opt/venv/bin/python 1_meeting_room/nodes/N4-test.py` ทดสอบเว็บด้วยการคลิกจริง
- `/opt/venv/bin/python verify-docs.py` ตรวจเอกสารและ Mockup ฉบับปัจจุบันของเบิกค่าใช้จ่ายกับคลินิก
- `/opt/venv/bin/python render-docs.py` สร้าง HTML อ่านเอกสารพร้อมภาพแผนภาพ

เครื่องมือใช้ Chromium และ Mermaid ที่ติดตั้งอยู่แล้วตาม path ในสคริปต์ ไม่มีการติดตั้งหรือเชื่อมธุรกรรมจริง การตรวจซ้ำจะเขียนทับ JSON/ภาพที่เกี่ยวข้อง จึงควรคัดลอกชุดผลก่อนตรวจหากต้องการรักษาหลักฐานเดิม

คลินิกเก็บ output-phase1.md, mockup-phase1.html และ verification-phase1.json ก่อน Change Request พร้อมผลเฟสสองแยกกัน
ระบบเบิกค่าใช้จ่ายเก็บ verification-parser-attempt1.json: ครั้งแรกตัวตรวจอ่าน cardinality ผิดว่าเป็นหัว Entity แก้ regex แล้วตรวจใหม่ ไม่ได้แก้ผลงานให้หลบเกณฑ์

dependency-audit.json ตรวจลำดับ Dependency และ hash ไฟล์ Node เท่านั้น ไม่ใช่หลักฐานว่ารันขนานหรือบริบทเป็นอิสระ การตัดสินความหมายโดย Codex อยู่ใน nodes/N5-review.md และของคลินิกเพิ่ม N5-v2-review.md
