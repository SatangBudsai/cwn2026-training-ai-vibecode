# ผลทดลองคลินิกพร้อม Web UI Mockup

ใช้เอกสารเฟสแรกของรอบเดิมเป็นฐานที่ตรวจใหม่ เพิ่ม Mockup ใหม่และทำ Change Request ต่อหลังเฟสแรก ไม่ใช่การสร้างเอกสารทั้งหมดใหม่จากศูนย์ ไม่ใช้ผล PASS เดิมแทนผลตรวจใหม่

- output-phase1.md / mockup-phase1.html: baseline ก่อน Change Request
- output.md / mockup.html: ผลสุดท้ายรวมความยินยอมและ LINE OA
- prompt-used.md / input-used.md / prompt-phase2.md: ขอบเขตที่ใช้รอบนี้
- trace.md: บันทึก Generator/Critic และการตรวจความหมายในบทสนทนาเดียว
- verification-phase1.json / verification-phase2.json: ผลเครื่องมือตรวจของแต่ละเฟส
- verification.json: สรุปผลสุดท้ายรวมการตรวจความหมาย

รันซ้ำบน Remote ด้วย `/opt/venv/bin/python verify.py phase1` หรือ `phase2` จากโฟลเดอร์นี้ ใช้ Chromium และ Mermaid ที่ติดตั้งแล้วตาม path ในสคริปต์ ไม่มีการติดตั้งหรือเชื่อมบริการจริง การรันซ้ำเขียนทับผลตรวจและภาพของเฟสที่เลือก

ขอบเขตการทดสอบ: render Mermaid, เปิด Mockup, ตรวจ DOM และภาพทั้งจอคอมพิวเตอร์และมือถือ ไม่ทดสอบธุรกรรมหรือ LINE API และไม่รับรองความครบตามกฎหมาย
