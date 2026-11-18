# สรุปผล Graph

| Node | Dependency | สถานะ | ผลลัพธ์ |
| --- | --- | --- | --- |
| N1 | — | DONE | nodes/N1-contract.md |
| N2 | N1 | DONE | nodes/N2.js |
| N3 | N1 | DONE | nodes/N3.html |
| N4 | N1 | DONE | nodes/N4-test.py |
| N5 | N2, N3, N4 | DONE | nodes/N5-review.md |

# ผล N5 — เว็บจองห้อง
C1 PASS: เปิดห้อง ดูเวลาว่าง สร้างนัด ยกเลิก และเห็นสถานะครบ
C2 PASS: รัน nodes/N4-test.py จริง พร้อมตรวจเวลาซ้อน ช่วงเวลาผิด และคืนเวลาว่างหลังยกเลิก ไม่มี console/page error
C3 PASS: ห้อง/ฟอร์มจอง/สถานะอยู่บนหน้าแรก ดูเวลาว่างและยกเลิกรายการตัวอย่างหนึ่งคลิก หลักฐานและนิยามการนับอยู่ใน verification.json
สมมติฐาน: ข้อมูลห้องและนัดเริ่มต้นเป็นตัวอย่าง ข้อมูลอยู่ในหน่วยความจำ ไม่ใช่ระบบจองจริง

หลักฐาน: verification.json, trace.md และ events.jsonl
