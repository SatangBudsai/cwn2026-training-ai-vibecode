# ผล T5 — ระบบเบิกค่าใช้จ่าย
C1 PASS: ข้อกำหนด Actors, FR, BR, NFR, Use Case, ERD, Sequence, State, Traceability, Open Issues และ Mockup สามส่วนครบ
C2 PASS: อ่านเทียบสัมภาษณ์ทั้งสิบหน่วยความหมายใน Matrix ครบ ไม่ตกหล่นบรรทัดที่มีสองกติกา; S03/S04 เก็บข้อขัดแย้ง 5,000/10,000 ทั้งสองประโยค; ตัวเลขนโยบาย 30 และ 25 ตรงต้นทาง; ไม่มีตัวเลขวงเงินที่พัก
C3 PASS: อ่านเทียบ Sequence และ State กับ T1 contract และ ERD: Claim.category/amount/customer_name/customer_company/status/current_owner, Receipt.image_ref/receipt_date/review_status, Approval.approver_role/decision, Payment.scheduled_date มีครบ; ทุกสถานะมีผู้รับผิดชอบ; render Mermaid สี่บล็อกจริง
Mockup submit/tracking/review ใช้สถานะและผู้รับผิดชอบตาม contract มี Pain Point mapping ป้ายจำลอง และนโยบายรอยืนยัน เปิดจริงทั้ง 1440 และ 390
T1b DONE ก่อนรวม เก็บข้อขัดแย้งโดยไม่เลือกข้าง NFR-ACCESS/NFR-AUDIT เป็นข้อเสนอรอยืนยัน ไม่ได้อ้างจากสัมภาษณ์โดยตรง
ข้อจำกัด: หลายบทบาทในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ ตัวตรวจโครงสร้างตรวจได้บางส่วน ต้องอ่านความหมายประกอบ ปุ่มไม่ทำธุรกรรมจริง
