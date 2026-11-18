# Execution Trace — Graph

วิธีรัน: Codex ในบทสนทนาเดียวจำลองบทบาทตามลำดับ Node และสร้างไฟล์แยก ใช้ dependency gate ก่อนบันทึกผล ไม่ได้แยกบริบทหรือรันขนานจริง จึงยังไม่พิสูจน์ความเป็นอิสระของ N2–N4 เก็บผลทดสอบเครื่องมือใหม่ทั้งหมด

## N1 — DONE

Dependency: ไม่มี

ผลลัพธ์: nodes/N1-requirements.md, nodes/N1-contract.json, nodes/N1-sources.json

สมมติฐาน/ข้อจำกัด: ขั้นตอนบัญชีตรวจเอกสารก่อนหัวหน้าเป็นข้อเสนอ ต้องยืนยัน; ชื่อ Entity/Attribute และสถานะเป็นแบบจำลองเสนอ ไม่ใช่ข้อมูลสัมภาษณ์โดยตรง

## N1b — DONE

Dependency: N1

ผลลัพธ์: nodes/N1b-open-issues.md

สมมติฐาน/ข้อจำกัด: ยังไม่เลือกวงเงินส่งต่อและไม่กำหนดวงเงินที่พัก

## N2 — DONE

Dependency: N1

ผลลัพธ์: nodes/N2-models.md

สมมติฐาน/ข้อจำกัด: แบบจำลองและขั้นตอนต้องให้ผู้ใช้ยืนยัน

## N3 — DONE

Dependency: N1

ผลลัพธ์: nodes/N3-erd.md

## N4 — DONE

Dependency: N1

ผลลัพธ์: nodes/N4-mockup.html, nodes/N4-screen-map.md

## N5 — กำลังตรวจ

รับ N2/N3/N4 และ N1b หลัง DONE ครบ รวมข้อกำหนด แผนภาพ ตารางและ Mockup โดยคงเกณฑ์วงเงินทั้งสองฝั่ง รอ render และตรวจความสอดคล้องจริงก่อนตัดสิน DONE

### ตรวจแก้เครื่องมือตรวจก่อนสรุป N5

ผลตรวจแรกอ่าน Employee ไม่พบ แม้ Entity มีอยู่จริงใน ERD สาเหตุคือ regex จับเครื่องหมาย cardinality ในความสัมพันธ์แทนหัว Entity แก้ตัวตรวจให้จับหัวบรรทัดและตรวจใหม่ โดยไม่แก้ผลงานเพื่อหลบเกณฑ์ เก็บ verification-parser-attempt1.json เป็นหลักฐานของข้อจำกัดตัวตรวจ

## N5 — DONE

Dependency: N2, N3, N4, N1b

ผลลัพธ์: nodes/N5-review.md

สมมติฐาน/ข้อจำกัด: การตรวจความหมายโดย Codex ในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ

# ผล N5 — ระบบเบิกค่าใช้จ่าย
C1 PASS: ข้อกำหนด Actors, FR, BR, NFR, Use Case, ERD, Sequence, State, Traceability, Open Issues และ Mockup สามส่วนครบ
C2 PASS: อ่านเทียบสัมภาษณ์ทั้งสิบหน่วยความหมายใน Matrix ครบ ไม่ตกหล่นบรรทัดที่มีสองกติกา; S03/S04 เก็บข้อขัดแย้ง 5,000/10,000 ทั้งสองประโยค; ตัวเลขนโยบาย 30 และ 25 ตรงต้นทาง; ไม่มีตัวเลขวงเงินที่พัก
C3 PASS: อ่านเทียบ Sequence และ State กับ N1 contract และ ERD: Claim.category/amount/customer_name/customer_company/status/current_owner, Receipt.image_ref/receipt_date/review_status, Approval.approver_role/decision, Payment.scheduled_date มีครบ; ทุกสถานะมีผู้รับผิดชอบ; render Mermaid สี่บล็อกจริง
Mockup submit/tracking/review ใช้สถานะและผู้รับผิดชอบตาม contract มี Pain Point mapping ป้ายจำลอง และนโยบายรอยืนยัน เปิดจริงทั้ง 1440 และ 390
N1b DONE ก่อนรวม เก็บข้อขัดแย้งโดยไม่เลือกข้าง NFR-ACCESS/NFR-AUDIT เป็นข้อเสนอรอยืนยัน ไม่ได้อ้างจากสัมภาษณ์โดยตรง
ข้อจำกัด: หลายบทบาทในบทสนทนาเดียว ไม่ใช่ผู้ตรวจอิสระ ตัวตรวจโครงสร้างตรวจได้บางส่วน ต้องอ่านความหมายประกอบ ปุ่มไม่ทำธุรกรรมจริง

หยุดเฟสแรกเมื่อ N5 DONE พร้อม C1–C3 PASS


## ตารางสรุป

| Node | Dependency | สถานะ | ผลลัพธ์ |
| --- | --- | --- | --- |
| N1 | — | DONE | nodes/N1-requirements.md, nodes/N1-contract.json, nodes/N1-sources.json |
| N1b | N1 | DONE | nodes/N1b-open-issues.md |
| N2 | N1 | DONE | nodes/N2-models.md |
| N3 | N1 | DONE | nodes/N3-erd.md |
| N4 | N1 | DONE | nodes/N4-mockup.html, nodes/N4-screen-map.md |
| N5 | N2, N3, N4, N1b | DONE | nodes/N5-review.md |
