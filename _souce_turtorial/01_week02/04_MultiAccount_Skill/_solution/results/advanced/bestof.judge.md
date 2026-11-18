- คำตอบ A (บัญชี yolo1): /workspace/.agent-team/adv-p123/out/bestof.A.md
- คำตอบ B (บัญชี yolo2): /workspace/.agent-team/adv-p123/out/bestof.B.md
- คำตอบ C (บัญชี cyolo1): /workspace/.agent-team/adv-p123/out/bestof.C.md

คะแนน: {"A": 8, "B": 7, "C": 9}
เลือก: C
เหตุผล: ทั้งสามผ่านค่าจริง LINE, แอป, อีเมล และกรณีสะกดต่างกัน/Unicode ที่ทดสอบ 15/15 ใช้เฉพาะ standard library และรองรับ None แต่ C อ่านง่ายและจับคู่ชื่ออย่างชัดเจน จึงคืน None สำหรับค่าที่ไม่รู้จักได้แม่นยำกว่า A และ B ซึ่งใช้ prefix/substring จนตีความ apple และ appointment เป็น app และ B ยังตีความ offline/airline เป็น line ข้อจำกัดของ C คือไม่ลบอักขระควบคุมบางชนิด เช่น NUL ที่แทรกกลางชื่อ