# เครื่องมือตรวจรอบใหม่

verify.py เป็นสคริปต์ Python Playwright ที่ใช้ทดสอบหน้าเว็บและ render Mermaid โดยใช้เครื่องมือที่มีบน Remote

รันด้วย `/opt/venv/bin/python verify.py` จากโฟลเดอร์นี้ ต้องมี Chromium และ Mermaid ตามตำแหน่งในสคริปต์ ไม่ติดตั้งเพิ่มอัตโนมัติ การรันซ้ำจะเขียน verification.json และภาพใหม่ในรอบที่ระบุใน runs.json

การตรวจความหมายของเอกสารอยู่ใน trace.md ของแต่ละโจทย์ ไม่ได้อ้างว่าทุกข้อเป็น automated test
